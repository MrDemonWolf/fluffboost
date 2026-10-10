import { describe, it, expect } from "bun:test";
import sinon from "sinon";
import {
  IDLE_IN_TRANSACTION_TIMEOUT_MS,
  STATEMENT_TIMEOUT_MS,
  buildClientOptions,
  buildQueryLogger,
} from "../../src/database/clientOptions.js";

describe("buildClientOptions", () => {
  it("uses the configured pool size and connection timeouts", () => {
    const options = buildClientOptions(7);
    expect(options).toMatchObject({ max: 7, idle_timeout: 30, connect_timeout: 10 });
  });

  it("sets server-side statement and idle-in-transaction timeouts", () => {
    const options = buildClientOptions(10);
    expect(options.connection).toMatchObject({
      application_name: "fluffboost-discord",
      statement_timeout: STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
    });
  });
});

describe("buildQueryLogger", () => {
  it("disables query logging unless opted in", () => {
    expect(buildQueryLogger(false, sinon.stub())).toBe(false);
  });

  it("routes query text to the debug logger without parameters", () => {
    const debug = sinon.stub();
    const queryLogger = buildQueryLogger(true, debug);
    if (!queryLogger) {
      throw new Error("expected a logger");
    }
    queryLogger.logQuery('insert into "SuggestionQuote" ("quote") values ($1)', ["private quote text"]);
    expect(debug.calledOnceWithExactly("Database", 'insert into "SuggestionQuote" ("quote") values ($1)')).toBe(true);
    expect(JSON.stringify(debug.args)).not.toContain("private quote text");
  });
});
