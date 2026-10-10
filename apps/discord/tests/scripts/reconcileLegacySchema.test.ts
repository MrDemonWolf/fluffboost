import { describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIGRATIONS_FOLDER } from "../../src/database/migrator.js";

const APP_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SQL = fs.readFileSync(path.join(APP_ROOT, "scripts", "reconcileLegacySchema.sql"), "utf8");
const MIGRATION_0000 = fs.readFileSync(path.join(MIGRATIONS_FOLDER, "0000_confused_eternity.sql"), "utf8");
const JOURNAL = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8")) as {
  entries: { tag: string; when: number }[];
};

describe("reconcileLegacySchema.sql", () => {
  it("embeds migration 0000 verbatim", () => {
    const embedded = /-- >>> BEGIN 0000_confused_eternity\.sql\n([\s\S]*?)\n-- <<< END 0000_confused_eternity\.sql/;
    const match = embedded.exec(SQL);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(MIGRATION_0000.replace(/\n$/, ""));
  });

  it("records the baseline row Drizzle's migrator computes for 0000", () => {
    const hash = crypto.createHash("sha256").update(MIGRATION_0000).digest("hex");
    const entry = JOURNAL.entries.find((e) => e.tag === "0000_confused_eternity");
    expect(SQL).toContain(`VALUES ('${hash}', ${entry!.when});`);
  });

  it("runs as one transaction and refuses a database with migration history", () => {
    expect(SQL.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(SQL.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(SQL).toContain("drizzle.__drizzle_migrations already has rows");
  });
});

describe("reconcileLegacySchema.ts", () => {
  it("refuses to run without --confirm", () => {
    const result = Bun.spawnSync(["bun", "--no-env-file", "scripts/reconcileLegacySchema.ts"], {
      cwd: APP_ROOT,
      env: { PATH: process.env["PATH"] ?? "", DATABASE_URL: "postgres://nobody@127.0.0.1:1/none" },
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("--confirm");
  });
});
