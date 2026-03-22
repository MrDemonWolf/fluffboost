import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain } from "../helpers.js";

/**
 * Create a Discord Collection-like Map with .map() and .filter() methods.
 */
function createCollectionCache<V>(entries: [string, V][] = []) {
  const map = new Map<string, V>(entries);

  (map as unknown as Record<string, unknown>).map = function (
    fn: (value: V, key: string, collection: Map<string, V>) => unknown,
  ) {
    return [...map.values()].map((v, _i) => fn(v, "", map));
  };

  (map as unknown as Record<string, unknown>).filter = function (
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

mock.module("../../src/database/index.js", () => ({ db }));
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

    it("should return early when guild cache is empty", async () => {
      db.select.returns(mockDbChain([{ guildId: "g1" }]));

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(logger.info.called).toBe(true);
      expect(db.delete.called).toBe(false);
    });

    it("should delete guilds that are not in cache", async () => {
      db.select.returns(mockDbChain([{ guildId: "g1" }, { guildId: "g2" }]));

      const cache = createCollectionCache([["g2", { id: "g2" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(db.delete.calledOnce).toBe(true);
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
    it("should return early when all guilds already exist", async () => {
      db.select.returns(mockDbChain([{ guildId: "g1" }]));

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(db.insert.called).toBe(false);
    });

    it("should create guilds that are in cache but not in database", async () => {
      db.select.returns(mockDbChain([]));

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(db.insert.calledOnce).toBe(true);
    });

    it("should handle per-guild create errors gracefully", async () => {
      db.select.returns(mockDbChain([]));
      const insertChain = mockDbChain();
      insertChain.rejects(new Error("DB error"));
      db.insert.returns(insertChain);

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(logger.error.called).toBe(true);
    });
  });

  describe("guildExists", () => {
    it("should insert with onConflictDoNothing and return true", async () => {
      const result = await guildExists("g1");
      expect(result).toBe(true);
      expect(db.insert.calledOnce).toBe(true);
    });

    it("should insert with onConflictDoNothing and return true for new guild", async () => {
      const result = await guildExists("g-new");
      expect(result).toBe(true);
      expect(db.insert.calledOnce).toBe(true);
    });
  });
});
