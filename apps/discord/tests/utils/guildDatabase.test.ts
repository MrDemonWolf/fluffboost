import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import type { SinonStub } from "sinon";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { guilds } from "../../src/database/schema.js";
import { mockLogger, mockDb, mockDbChain } from "../helpers.js";

const dialect = new PgDialect();
/** Bound parameters of the SQL passed to a chain method, e.g. the guild IDs in a where(). */
function boundParams(stub: unknown, call = 0): unknown[] {
  return dialect.sqlToQuery((stub as SinonStub).getCall(call).args[0] as SQL).params;
}

/**
 * Create a Discord Collection-like Map with .map() and .filter() methods.
 */
function createCollectionCache<V>(entries: [string, V][] = []) {
  const map = new Map<string, V>(entries);

  (map as unknown as Record<string, unknown>)["map"] = function (
    fn: (value: V, key: string, collection: Map<string, V>) => unknown,
  ) {
    return [...map.values()].map((v, _i) => fn(v, "", map));
  };

  (map as unknown as Record<string, unknown>)["filter"] = function (
    fn: (value: V, key: string) => boolean,
  ) {
    const result = new Map<string, V>();
    for (const [key, value] of map) {
      if (fn(value, key)) {
        result.set(key, value);
      }
    }
    return result;
  };

  return map;
}

const db = mockDb();
const logger = mockLogger();

mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
mock.module("../../src/utils/logger.js", () => ({ default: logger }));

const { pruneGuilds, ensureGuildExists, guildExists } = await import("../../src/utils/guildDatabase.js");

function resetStubs() {
  sinon.restore();
  // Reset db
  for (const key of ["select", "insert", "update", "delete"] as const) {
    db[key].reset();
  }
  db.select.callsFake(() => mockDbChain([]));
  db.insert.callsFake(() => mockDbChain([]));
  db.update.callsFake(() => mockDbChain([]));
  db.delete.callsFake(() => mockDbChain());
  // Reset logger
  for (const value of Object.values(logger)) {
    if (typeof value === "function" && "reset" in value) {
      (value as sinon.SinonStub).reset();
    } else if (typeof value === "object" && value !== null) {
      for (const sub of Object.values(value)) {
        if (typeof sub === "function" && "reset" in sub) {
          (sub as sinon.SinonStub).reset();
        }
      }
    }
  }
}

describe("guildDatabase", () => {
  beforeEach(() => {
    resetStubs();
  });

  describe("pruneGuilds", () => {
    it("should return early when no guilds in database", async () => {
      db.select.returns(mockDbChain([]));

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(logger.info.called).toBe(true);
      expect(db.delete.called).toBe(false);
    });

    it("should prune stale rows even when the guild cache is empty", async () => {
      // A shard can legitimately sit in zero guilds (e.g. the bot was kicked
      // from all of them) — its stale rows must still be cleaned up.
      db.select.returns(mockDbChain([{ guildId: "g1" }]));
      const deleteChain = mockDbChain();
      db.delete.returns(deleteChain);

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(db.delete.calledOnce).toBe(true);
      expect(boundParams(deleteChain["where"])).toEqual(["g1"]);
    });

    it("should only prune rows routed to this shard when sharded", async () => {
      // Discord routes guildId >> 22 % shardCount. "1" >> 22 = 0 → shard 0;
      // "4194304" (2^22) >> 22 = 1 → shard 1. A shard-0 client with an empty
      // cache must delete only its own stale row.
      db.select.returns(mockDbChain([{ guildId: "1" }, { guildId: "4194304" }]));
      const deleteChain = mockDbChain();
      db.delete.returns(deleteChain);

      const cache = createCollectionCache();
      const client = { guilds: { cache }, shard: { ids: [0], count: 2 } };
      await pruneGuilds(client as never);

      expect(db.delete.calledOnce).toBe(true);
      expect(boundParams(deleteChain["where"])).toEqual(["1"]);
    });

    it("should prune only shard 1's rows from a shard-1 process", async () => {
      // "4194304" >> 22 = 1 → shard 1; "1" and "8388608" (>> 22 = 2) route to shard 0. Without the
      // shift, "1" % 2 = 1 would be deleted here instead.
      db.select.returns(mockDbChain([{ guildId: "1" }, { guildId: "4194304" }, { guildId: "8388608" }]));
      const deleteChain = mockDbChain();
      db.delete.returns(deleteChain);

      const client = { guilds: { cache: createCollectionCache() }, shard: { ids: [1], count: 2 } };
      await pruneGuilds(client as never);

      expect(boundParams(deleteChain["where"])).toEqual(["4194304"]);
    });

    it("should not prune this shard's guilds that are still cached", async () => {
      db.select.returns(mockDbChain([{ guildId: "1" }, { guildId: "4194304" }]));

      const cache = createCollectionCache([["1", { id: "1" }]]);
      const client = { guilds: { cache }, shard: { ids: [0], count: 2 } };
      await pruneGuilds(client as never);

      expect(db.delete.called).toBe(false);
    });

    it("should leave malformed guild IDs alone when sharded", async () => {
      db.select.returns(mockDbChain([{ guildId: "not-a-snowflake" }]));

      const client = { guilds: { cache: createCollectionCache() }, shard: { ids: [0], count: 2 } };
      await pruneGuilds(client as never);

      expect(db.delete.called).toBe(false);
      expect(logger.error.called).toBe(false);
    });

    it("should batch stale rows into chunked deletes", async () => {
      const rows = Array.from({ length: 1001 }, (_, i) => ({ guildId: String(i + 1) }));
      db.select.returns(mockDbChain(rows));
      const deleteChain = mockDbChain();
      db.delete.returns(deleteChain);

      await pruneGuilds({ guilds: { cache: createCollectionCache() } } as never);

      expect(db.delete.callCount).toBe(2);
      expect(boundParams(deleteChain["where"], 0)).toHaveLength(1000);
      expect(boundParams(deleteChain["where"], 1)).toEqual(["1001"]);
    });

    it("should log and not throw when reading guild rows fails", async () => {
      const selectChain = mockDbChain();
      selectChain.rejects(new Error("DB down"));
      db.select.returns(selectChain);

      await pruneGuilds({ guilds: { cache: createCollectionCache() } } as never);

      expect(logger.error.calledOnce).toBe(true);
      expect(db.delete.called).toBe(false);
    });

    it("should delete guilds that are not in cache", async () => {
      db.select.returns(mockDbChain([{ guildId: "g1" }, { guildId: "g2" }]));
      const deleteChain = mockDbChain();
      db.delete.returns(deleteChain);

      const cache = createCollectionCache([["g2", { id: "g2" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(db.delete.calledOnce).toBe(true);
      expect(boundParams(deleteChain["where"])).toEqual(["g1"]);
    });

    it("should not delete any guilds when all are in cache", async () => {
      db.select.returns(mockDbChain([{ guildId: "g1" }]));

      const cache = createCollectionCache([["g1", { id: "g1" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(db.delete.called).toBe(false);
    });

    it("should handle per-guild delete errors gracefully", async () => {
      db.select.returns(mockDbChain([{ guildId: "g1" }]));
      const deleteChain = mockDbChain();
      deleteChain.rejects(new Error("DB error"));
      db.delete.returns(deleteChain);

      const cache = createCollectionCache([["other", { id: "other" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(logger.error.called).toBe(true);
    });
  });

  describe("ensureGuildExists", () => {
    it("should skip the database when the shard has no guilds", async () => {
      await ensureGuildExists({ guilds: { cache: createCollectionCache() } } as never);
      expect(db.insert.called).toBe(false);
      expect(db.select.called).toBe(false);
    });

    it("should insert every cached guild in one idempotent statement without reading the table", async () => {
      const insertChain = mockDbChain();
      db.insert.returns(insertChain);

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }], ["g2", { id: "g2", name: "G2" }]]);
      await ensureGuildExists({ guilds: { cache } } as never);

      expect(db.select.called).toBe(false);
      expect(db.insert.calledOnce).toBe(true);
      expect((insertChain["values"] as SinonStub).firstCall.args[0]).toEqual([{ guildId: "g1" }, { guildId: "g2" }]);
      expect((insertChain["onConflictDoNothing"] as SinonStub).calledOnce).toBe(true);
      expect(logger.error.called).toBe(false);
    });

    it("should chunk large guild caches", async () => {
      const entries = Array.from({ length: 2001 }, (_, i): [string, { id: string }] => [`g${i}`, { id: `g${i}` }]);
      await ensureGuildExists({ guilds: { cache: createCollectionCache(entries) } } as never);
      expect(db.insert.callCount).toBe(3);
    });

    it("should log instead of throwing when the insert fails", async () => {
      const insertChain = mockDbChain();
      insertChain.rejects(new Error("DB error"));
      db.insert.returns(insertChain);

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      await ensureGuildExists({ guilds: { cache } } as never);
      expect(logger.error.calledOnce).toBe(true);
    });
  });

  describe("guildExists", () => {
    it("should insert idempotently with onConflictDoNothing on guildId and return true", async () => {
      const insertChain = mockDbChain();
      db.insert.returns(insertChain);
      const result = await guildExists("g1");
      expect(result).toBe(true);
      expect(db.insert.calledOnce).toBe(true);
      expect(db.insert.firstCall.args[0]).toBe(guilds);
      expect(insertChain.values.firstCall.args[0]).toEqual([{ guildId: "g1" }]);
      expect(insertChain.onConflictDoNothing.calledOnce).toBe(true);
      expect(insertChain.onConflictDoNothing.firstCall.args[0]).toEqual({ target: guilds.guildId });
    });
  });
});
