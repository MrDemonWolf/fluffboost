import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog } from "../helpers.js";

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
      const prisma = mockPrisma();
      const logger = mockLogger();
      prisma.guild.findMany.resolves([]);

      const { pruneGuilds } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(logger.info.called).to.be.true;
      expect(prisma.guild.delete.called).to.be.false;
    });

    it("should return early when guild cache is empty", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      prisma.guild.findMany.resolves([{ guildId: "g1" }]);

      const { pruneGuilds } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const cache = createCollectionCache();
      const client = { guilds: { cache } };
      await pruneGuilds(client as never);
      expect(logger.info.called).to.be.true;
      expect(prisma.guild.delete.called).to.be.false;
    });

    it("should delete guilds that are not in cache", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      const posthog = mockPosthog();
      prisma.guild.findMany.resolves([{ guildId: "g1" }, { guildId: "g2" }]);

      const { pruneGuilds } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: posthog },
      });

      // Only g2 is in cache; g1 should be pruned
      const cache = createCollectionCache([["g2", { id: "g2" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(prisma.guild.delete.calledOnce).to.be.true;
      expect(prisma.guild.delete.firstCall.args[0]).to.deep.equal({ where: { guildId: "g1" } });
    });

    it("should not delete any guilds when all are in cache", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      prisma.guild.findMany.resolves([{ guildId: "g1" }]);

      const { pruneGuilds } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const cache = createCollectionCache([["g1", { id: "g1" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(prisma.guild.delete.called).to.be.false;
    });

    it("should handle per-guild delete errors gracefully", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      prisma.guild.findMany.resolves([{ guildId: "g1" }]);
      prisma.guild.delete.rejects(new Error("DB error"));

      const { pruneGuilds } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      // Cache has "other" but not "g1", so g1 should be pruned
      const cache = createCollectionCache([["other", { id: "other" }]]);
      const client = { guilds: { cache } };

      await pruneGuilds(client as never);
      expect(logger.error.called).to.be.true;
    });
  });

  describe("ensureGuildExists", () => {
    it("should return early when all guilds already exist", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      prisma.guild.findMany.resolves([{ guildId: "g1" }]);

      const { ensureGuildExists } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(prisma.guild.create.called).to.be.false;
    });

    it("should create guilds that are in cache but not in database", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      const posthog = mockPosthog();
      prisma.guild.findMany.resolves([]);

      const { ensureGuildExists } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: posthog },
      });

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(prisma.guild.create.calledOnce).to.be.true;
      expect(posthog.capture.calledOnce).to.be.true;
    });

    it("should handle per-guild create errors gracefully", async () => {
      const prisma = mockPrisma();
      const logger = mockLogger();
      prisma.guild.findMany.resolves([]);
      prisma.guild.create.rejects(new Error("DB error"));

      const { ensureGuildExists } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: logger },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const cache = createCollectionCache([["g1", { id: "g1", name: "G1" }]]);
      const client = { guilds: { cache } };

      await ensureGuildExists(client as never);
      expect(logger.error.called).to.be.true;
    });
  });

  describe("guildExists", () => {
    it("should return true when guild is found", async () => {
      const prisma = mockPrisma();
      prisma.guild.findUnique.resolves({ guildId: "g1" });

      const { guildExists } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: mockLogger() },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const result = await guildExists("g1");
      expect(result).to.be.true;
      expect(prisma.guild.create.called).to.be.false;
    });

    it("should create guild and return false when not found", async () => {
      const prisma = mockPrisma();
      prisma.guild.findUnique.resolves(null);

      const { guildExists } = await esmock("../../src/utils/guildDatabase.js", {
        "../../src/database/index.js": { prisma },
        "../../src/utils/logger.js": { default: mockLogger() },
        "../../src/utils/posthog.js": { default: mockPosthog() },
      });

      const result = await guildExists("g-new");
      expect(result).to.be.false;
      expect(prisma.guild.create.calledOnce).to.be.true;
    });
  });
});
