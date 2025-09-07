import request from "supertest";
import { app } from "./app.js";

describe("API basic", () => {
  it("serves openapi.yaml", async () => {
    const res = await request(app).get("/openapi.yaml");
    expect(res.status).toBe(200);
    expect(res.text).toContain("openapi: 3.0.3");
  });

  it("exposes metrics", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("http_requests_total");
  });
});
