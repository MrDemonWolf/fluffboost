import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger } from "../helpers.js";

describe("shardDisconnect event", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should log error and exit process", async () => {
    const logger = mockLogger();
    const exitStub = sinon.stub(process, "exit");

    const mod = await esmock("../../src/events/shardDisconnect.js", {
      "../../src/utils/logger.js": { default: logger },
    });

    mod.shardDisconnectEvent();

    expect(logger.error.calledOnce).to.be.true;
    expect(logger.error.firstCall.args[0]).to.include("Shard Disconnect");
    expect(exitStub.calledOnce).to.be.true;
    expect(exitStub.firstCall.args[0]).to.equal(1);
  });
});
