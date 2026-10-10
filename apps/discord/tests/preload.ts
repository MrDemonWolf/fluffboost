import { mock } from "bun:test";
import { UNIT_ENV_FIXTURE, mockEnv } from "./helpers.js";

// Register before test imports; individual suites can override this fixture.
// Only unit-test scripts preload it so E2E uses the real environment loader.
// The scripts run with --isolate, so a suite's own mock.module() calls never
// reach another file.
mock.module("../src/utils/env.js", () => ({ default: mockEnv(UNIT_ENV_FIXTURE) }));
