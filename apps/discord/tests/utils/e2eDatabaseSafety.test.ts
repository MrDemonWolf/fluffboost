import { describe, it, expect } from "bun:test";

import { requireSafeE2EDatabaseUrl } from "../../e2e/databaseSafety.js";

describe("requireSafeE2EDatabaseUrl", () => {
  it("requires an explicit disposable-database assertion", () => {
    expect(() => requireSafeE2EDatabaseUrl(undefined, "true")).toThrow(
      /E2E_DATABASE_URL/,
    );
    expect(() =>
      requireSafeE2EDatabaseUrl(
        "postgres://ci@localhost/fluffboost_e2e",
        undefined,
      ),
    ).toThrow(/E2E_DATABASE_DISPOSABLE/);
  });

  it("rejects remote hosts, other database names, and non-PostgreSQL URLs", () => {
    expect(() =>
      requireSafeE2EDatabaseUrl(
        "postgres://ci@db.example/fluffboost_e2e",
        "true",
      ),
    ).toThrow();
    expect(() =>
      requireSafeE2EDatabaseUrl("postgres://ci@localhost/fluffboost", "true"),
    ).toThrow();
    expect(() =>
      requireSafeE2EDatabaseUrl("https://localhost/fluffboost_e2e", "true"),
    ).toThrow();
  });

  it("accepts the dedicated database on a loopback host", () => {
    expect(
      requireSafeE2EDatabaseUrl(
        "postgres://ci@localhost/fluffboost_e2e",
        "true",
      ),
    ).toBe("postgres://ci@localhost/fluffboost_e2e");
  });
});
