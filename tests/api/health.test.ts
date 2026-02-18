import { expect } from "chai";
import esmock from "esmock";
import supertest from "supertest";
import { mockEnv } from "../helpers.js";

describe("Health API", () => {
  let request: supertest.Agent;

  before(async () => {
    // Load app with mocked env to avoid Zod validation of real env vars
    const app = await esmock("../../src/api/index.js", {
      "../../src/utils/env.js": { default: mockEnv() },
    });
    request = supertest(app.default);
  });

  it("should return 200 with status ok", async () => {
    const res = await request.get("/api/health");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: "ok" });
  });

  it("should return application/json content type", async () => {
    const res = await request.get("/api/health");
    expect(res.headers["content-type"]).to.include("application/json");
  });

  it("should return correct JSON body shape", async () => {
    const res = await request.get("/api/health");
    expect(res.body).to.have.property("status");
    expect(res.body.status).to.be.a("string");
  });
});
