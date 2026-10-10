import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockClient, mockEnv, mockLogger } from "../helpers.js";

describe("mainChannel", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load() {
    const env = mockEnv();
    const logger = mockLogger();
    // mainChannel reads env/logger at call time; keep them mocked so the real
    // env validation never runs under test.
    mock.module("../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const mod = await import("../../src/utils/mainChannel.js");
    return { ...mod, env, logger };
  }

  const textChannel = () => ({ isTextBased: () => true, isDMBased: () => false, send: sinon.stub().resolves() });

  it("fetches the main channel with allowUnknownGuild so non-owning shards can announce", async () => {
    const { sendToMainChannel, env } = await load();
    const channel = textChannel();
    // This shard's guild cache lacks MAIN_GUILD_ID (it lives on another shard).
    const client = mockClient({ guilds: { cache: new Map() } });
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendToMainChannel(client as never, "hello");

    expect((client.channels.fetch as sinon.SinonStub).firstCall.args).toEqual([
      env.MAIN_CHANNEL_ID, { allowUnknownGuild: true },
    ]);
    expect(channel.send.calledOnceWithExactly("hello")).toBe(true);
  });

  it("warns instead of sending when the channel is missing or not text-based", async () => {
    const { sendToMainChannel, logger } = await load();
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(null);

    await sendToMainChannel(client as never, "hello");

    expect(logger.warn.calledOnce).toBe(true);
  });

  it("does not send to DM channels", async () => {
    const { sendToMainChannel, logger } = await load();
    const dm = { isTextBased: () => true, isDMBased: () => true, send: sinon.stub() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(dm);

    await sendToMainChannel(client as never, "hello");

    expect(dm.send.called).toBe(false);
    expect(logger.warn.calledOnce).toBe(true);
  });

  it("announceToMainChannel swallows send failures into a warning", async () => {
    const { announceToMainChannel, logger } = await load();
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).rejects(new Error("Missing Access"));

    await announceToMainChannel(client as never, "hello", "Announcement failed", { suggestionId: "s1" });

    expect(logger.warn.calledOnce).toBe(true);
    expect(logger.warn.firstCall.args[1]).toBe("Announcement failed");
    expect(logger.warn.firstCall.args[2]).toMatchObject({ suggestionId: "s1" });
  });
});
