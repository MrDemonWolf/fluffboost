import { mock } from "bun:test";
import { mockEnv } from "./helpers.js";

// Register before test imports; individual suites can override this fixture.
// Only unit-test scripts preload it so E2E uses the real environment loader.
mock.module("../src/utils/env.js", () => ({
  default: mockEnv({
    DATABASE_URL: "postgres://unit:unit@127.0.0.1:1/fluffboost_unit",
    REDIS_URL: "redis://127.0.0.1:1",
    DISCORD_APPLICATION_PUBLIC_KEY: "unit-test-not-a-discord-public-key",
    DISCORD_APPLICATION_BOT_TOKEN: "unit-test-not-a-discord-token",
  }),
}));
