import { describe, it, expect, afterEach, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockPosthog } from "../helpers.js";

/**
 * Create a Discord Collection-like Map with .map() and .filter() methods.
 */
function createCollectionCache<V>(entries: [string, V][] = []) {
  const map = new Map<string, V>(entries);

  // Discord Collection.map returns an array of mapped values
  (map as unknown as Record<string, unknown>).map = function (
    fn: (value: V, key: string, collection: Map<string, V>) => unknown,
  ) {
    return [...map.values()].map((v, _i) => fn(v, "", map));
  };

  // Discord Collection.filter returns a new Collection (Map with .size)
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

describe("guildDatabase", () => {

  afterEach(() => {
    sinon.restore();
  });

  describe("pruneGuilds", () => {
    it("should return early when no guilds in database", async () => {
      const db = mockDb();
      const logger = mockLogger();
      db.select.returns(mockDbChain([]));

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { pruneGuilds } = await import("../../src/utils/guildDatabase.js");

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(logger.info.called).toBe(true);
      expect(db.delete.called).toBe(false);
    });

    it("should return early when guild cache is empty", async () => {
      const db = mockDb();
      const logger = mockLogger();
      db.select.returns(mockDbChain([{ guildId: "g1" }]));

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { pruneGuilds } = await import("../../src/utils/guildDatabase.js");

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(logger.info.called).toBe(true);
      expect(db.delete.called).toBe(false);
    });

    it("should delete guilds that are not in cache", async () => {
      const db = mockDb();
      const logger = mockLogger();
      const posthog = mockPosthog();
      db.select.returns(mockDbChain([{ guildId: "g1" }, { guildId: "g2" }]));

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
      const { pruneGuilds } = await import("../../src/utils/guildDatabase.js");

      // Only g2 is in cache; g1 should be pruned
      const cache = createCollectionCache([["g2", { id: "g2" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(db.delete.calledOnce).toBe(true);
    });

    it("should not delete any guilds when all are in cache", async () => {
      const db = mockDb();
      const logger = mockLogger();
      db.select.returns(mockDbChain([{ guildId: "g1" }]));

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { pruneGuilds } = await import("../../src/utils/guildDatabase.js");

      const cache = createCollectionCache([["g1", { id: "g1" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(db.delete.called).toBe(false);
    });

    it("should handle per-guild delete errors gracefully", async () => {
      const db = mockDb();
      const logger = mockLogger();
      db.select.returns(mockDbChain([{ guildId: "g1" }]));
      // Make delete throw
      const deleteChain = mockDbChain();
      deleteChain.rejects(new Error("DB error"));
      db.delete.returns(deleteChain);

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { pruneGuilds } = await import("../../src/utils/guildDatabase.js");

      // Cache has "other" but not "g1", so g1 should be pruned
      const cache = createCollectionCache([["other", { id: "other" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(logger.error.called).toBe(true);
    });
  });

  describe("ensureGuildExists", () => {
    it("should return early when all guilds already exist", async () => {
      const db = mockDb();
      const logger = mockLogger();
      db.select.returns(mockDbChain([{ guildId: "g1" }]));

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { ensureGuildExists } = await import("../../src/utils/guildDatabase.js");

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(db.insert.called).toBe(false);
    });

    it("should create guilds that are in cache but not in database", async () => {
      const db = mockDb();
      const logger = mockLogger();
      const posthog = mockPosthog();
      db.select.returns(mockDbChain([]));

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
      const { ensureGuildExists } = await import("../../src/utils/guildDatabase.js");

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(db.insert.calledOnce).toBe(true);
      expect(posthog.capture.calledOnce).toBe(true);
    });

    it("should handle per-guild create errors gracefully", async () => {
      const db = mockDb();
      const logger = mockLogger();
      db.select.returns(mockDbChain([]));
      // Make insert throw
      const insertChain = mockDbChain();
      insertChain.rejects(new Error("DB error"));
      db.insert.returns(insertChain);

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: logger }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { ensureGuildExists } = await import("../../src/utils/guildDatabase.js");

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(logger.error.called).toBe(true);
    });
  });

  describe("guildExists", () => {
    it("should insert with onConflictDoNothing and return true", async () => {
      const db = mockDb();

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { guildExists } = await import("../../src/utils/guildDatabase.js");

      const result = await guildExists("g1");
      expect(result).toBe(true);
      expect(db.insert.calledOnce).toBe(true);
    });

    it("should insert with onConflictDoNothing and return true for new guild", async () => {
      const db = mockDb();

      mock.module("../../src/database/index.js", () => ({ db }));
      mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
      mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
      const { guildExists } = await import("../../src/utils/guildDatabase.js");

      const result = await guildExists("g-new");
      expect(result).toBe(true);
      expect(db.insert.calledOnce).toBe(true);
    });
  });
});
