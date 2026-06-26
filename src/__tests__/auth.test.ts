import request from "supertest";
import { Types } from "mongoose";
import { app } from "../app";
import { connect, disconnect, clearDatabase } from "./setup";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

const creds = { email: "owner@example.com", password: "supersecret1" };

describe("POST /auth/register", () => {
  it("creates a user and returns a token", async () => {
    const res = await request(app).post("/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(creds.email);
  });

  it("rejects a short password", async () => {
    const res = await request(app).post("/auth/register").send({ email: creds.email, password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/auth/register").send(creds);
    const res = await request(app).post("/auth/register").send(creds);
    expect(res.status).toBe(409);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/register").send(creds);
  });

  it("returns a token for valid credentials", async () => {
    const res = await request(app).post("/auth/login").send(creds);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app).post("/auth/login").send({ ...creds, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for an unknown email", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nobody@example.com", password: "supersecret1" });
    expect(res.status).toBe(401);
  });
});

describe("auth guard on protected routes", () => {
  it("returns 401 without a token", async () => {
    // Disable the default token injection for this request only.
    const saved = process.env.TEST_AUTH;
    delete process.env.TEST_AUTH;
    try {
      const res = await request(app).get("/farms");
      expect(res.status).toBe(401);
    } finally {
      process.env.TEST_AUTH = saved;
    }
  });

  it("returns 401 with an invalid token", async () => {
    const res = await request(app).get("/farms").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("cross-owner isolation", () => {
  it("a user cannot access another user's farm data", async () => {
    // User A creates a farm.
    const a = await request(app).post("/auth/register").send({ email: "a@example.com", password: "passworda1" });
    const tokenA = a.body.token as string;
    const farm = await request(app)
      .post("/farms")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "A's Farm" });
    const farmId = farm.body._id as string;

    // User B tries to read A's farm animals.
    const b = await request(app).post("/auth/register").send({ email: "b@example.com", password: "passwordb1" });
    const tokenB = b.body.token as string;
    const res = await request(app)
      .get("/animals")
      .set("Authorization", `Bearer ${tokenB}`)
      .set("x-farm-id", farmId);

    expect(res.status).toBe(404);

    // B also can't see A's farm in their own list.
    const list = await request(app).get("/farms").set("Authorization", `Bearer ${tokenB}`);
    expect(list.body).toEqual([]);
  });

  it("rejects a syntactically valid but unknown farmId", async () => {
    const res = await request(app).get("/animals").set("x-farm-id", new Types.ObjectId().toString());
    expect(res.status).toBe(404);
  });
});
