import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockEnv, mockLogger, mockInteraction } from "../helpers.js";

describe("permissions", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should return true when user is in ALLOWED_USERS", async () => {
    const logger = mockLogger();
    const { isUserPermitted } = await esmock("../../src/utils/permissions.js", {
      "../../src/utils/env.js": { default: mockEnv({ ALLOWED_USERS: "user-123, user-456" }) },
      "../../src/utils/logger.js": { default: logger },
    });

    const interaction = mockInteraction({ user: { id: "user-123", username: "allowed" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).to.be.true;
  });

  it("should return false and reply when user is not in ALLOWED_USERS", async () => {
    const logger = mockLogger();
    const { isUserPermitted } = await esmock("../../src/utils/permissions.js", {
      "../../src/utils/env.js": { default: mockEnv({ ALLOWED_USERS: "user-123, user-456" }) },
      "../../src/utils/logger.js": { default: logger },
    });

    const interaction = mockInteraction({ user: { id: "user-999", username: "denied" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).to.be.false;
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
  });

  it("should handle whitespace in the comma-separated ALLOWED_USERS list", async () => {
    const logger = mockLogger();
    const { isUserPermitted } = await esmock("../../src/utils/permissions.js", {
      "../../src/utils/env.js": { default: mockEnv({ ALLOWED_USERS: "  user-abc  ,  user-def  " }) },
      "../../src/utils/logger.js": { default: logger },
    });

    const interaction = mockInteraction({ user: { id: "user-abc", username: "spaced" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).to.be.true;
  });

  it("should log unauthorized access attempts", async () => {
    const logger = mockLogger();
    const { isUserPermitted } = await esmock("../../src/utils/permissions.js", {
      "../../src/utils/env.js": { default: mockEnv({ ALLOWED_USERS: "user-123" }) },
      "../../src/utils/logger.js": { default: logger },
    });

    const interaction = mockInteraction({ user: { id: "user-bad", username: "hacker" } });
    await isUserPermitted(interaction as never);
    expect(logger.unauthorized.calledOnce).to.be.true;
  });
});
