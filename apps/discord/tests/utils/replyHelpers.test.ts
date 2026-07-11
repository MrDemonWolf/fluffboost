import { describe, it, expect, afterEach } from "bun:test";
import sinon from "sinon";
import { mockInteraction } from "../helpers.js";
import { replyWithTextFile } from "../../src/utils/replyHelpers.js";

describe("replyHelpers", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("replies with empty message when rows is empty", async () => {
    const interaction = mockInteraction();
    await replyWithTextFile({
      interaction: interaction as never,
      rows: [],
      header: "H",
      formatRow: () => "",
      filename: "out.txt",
      emptyMessage: "Nothing here",
    });

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toBe("Nothing here");
    expect(replyArgs.files).toBeUndefined();
  });

  it("attaches a file when rows has content", async () => {
    const interaction = mockInteraction();
    await replyWithTextFile({
      interaction: interaction as never,
      rows: [{ id: "1" }, { id: "2" }],
      header: "ID",
      formatRow: (r: { id: string }) => r.id,
      filename: "ids.txt",
      emptyMessage: "none",
    });

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.files)).toBe(true);
    expect(replyArgs.files[0].name).toBe("ids.txt");
    const body = (replyArgs.files[0].attachment as Buffer).toString("utf8");
    expect(body).toContain("ID");
    expect(body).toContain("1");
    expect(body).toContain("2");
  });
});
