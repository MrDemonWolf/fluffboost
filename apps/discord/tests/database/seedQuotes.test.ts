import { describe, it, expect } from "bun:test";
import { fileURLToPath } from "node:url";

const APP_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Run the seed script with exactly `env` (no .env autoload), as a clean operator machine would. */
function runSeed(env: Record<string, string>) {
  const result = Bun.spawnSync(["bun", "--no-env-file", "scripts/seedQuotes.ts"], {
    cwd: APP_ROOT,
    env: { PATH: process.env["PATH"] ?? "", ...env },
  });
  return { exitCode: result.exitCode, output: `${result.stdout.toString()}${result.stderr.toString()}` };
}

describe("scripts/seedQuotes.ts", () => {
  it("needs only DATABASE_URL and OWNER_ID (no Discord or Redis config)", () => {
    // Port 1 refuses immediately: getting as far as the connection proves env validation passed.
    const { exitCode, output } = runSeed({
      DATABASE_URL: "postgres://seed:seed@127.0.0.1:1/fluffboost",
      OWNER_ID: "100000000000000999",
    });
    expect(output).not.toContain("invalid environment variables");
    expect(output).not.toContain("Invalid environment variables");
    expect(output).toContain("Quote seed failed");
    expect(exitCode).toBe(1);
  });

  it("fails fast when OWNER_ID is missing", () => {
    const { exitCode, output } = runSeed({ DATABASE_URL: "postgres://seed:seed@127.0.0.1:1/fluffboost" });
    expect(output).toContain("invalid environment variables");
    expect(output).toContain("OWNER_ID");
    expect(exitCode).toBe(1);
  });
});
