import request from "supertest";
import { app } from "../app";
import { connect, disconnect, clearDatabase } from "./setup";
import { UserModel } from "../models/User";
import { signToken } from "../utils/token";
import { TEST_OWNER_ID } from "./testAuth";

const OWNER_ID = TEST_OWNER_ID;
const WORKER_ID = "64b0000000000000000000b1";
const VET_ID = "64b0000000000000000000b2";
const STRANGER_ID = "64b0000000000000000000c1";

const bearer = (userId: string) => `Bearer ${signToken(userId)}`;

const animalPayload = {
  name: "Bella",
  designation: "Laying hen",
  birthDate: "2026-01-01",
  sex: "female",
  ringNumber: "R-001",
};

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clearDatabase();
  // Seed the users referenced across membership tests.
  await UserModel.create([
    { _id: OWNER_ID, email: "owner@example.com", passwordHash: "x" },
    { _id: WORKER_ID, email: "worker@example.com", passwordHash: "x" },
    { _id: VET_ID, email: "vet@example.com", passwordHash: "x" },
    { _id: STRANGER_ID, email: "stranger@example.com", passwordHash: "x" },
  ]);
});

/** Creates a farm owned by the default test owner and returns its id. */
async function createFarm(): Promise<string> {
  const res = await request(app).post("/farms").send({ name: "Owner Farm" });
  return res.body._id;
}

describe("Farm membership listing", () => {
  it("adds an owner role to farms the caller owns", async () => {
    await createFarm();
    const res = await request(app).get("/farms");
    expect(res.status).toBe(200);
    expect(res.body[0].role).toBe("owner");
  });

  it("lists farms the caller is a member of, with their role", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "worker@example.com", role: "worker" });

    const res = await request(app).get("/farms").set("Authorization", bearer(WORKER_ID));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._id).toBe(farmId);
    expect(res.body[0].role).toBe("worker");
  });

  it("does not list farms the caller has no access to", async () => {
    await createFarm();
    const res = await request(app).get("/farms").set("Authorization", bearer(STRANGER_ID));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("Member management (owner only)", () => {
  it("returns the roster including the owner", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "vet@example.com", role: "vet" });

    const res = await request(app).get(`/farms/${farmId}/members`);
    expect(res.status).toBe(200);
    const roles = res.body.map((m: { email: string; role: string }) => `${m.email}:${m.role}`);
    expect(roles).toContain("owner@example.com:owner");
    expect(roles).toContain("vet@example.com:vet");
  });

  it("rejects an unknown email with 404", async () => {
    const farmId = await createFarm();
    const res = await request(app).post(`/farms/${farmId}/members`).send({ email: "nobody@example.com", role: "worker" });
    expect(res.status).toBe(404);
  });

  it("rejects an invalid role with 400", async () => {
    const farmId = await createFarm();
    const res = await request(app).post(`/farms/${farmId}/members`).send({ email: "worker@example.com", role: "owner" });
    expect(res.status).toBe(400);
  });

  it("changes a member's role", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "worker@example.com", role: "worker" });
    const res = await request(app).put(`/farms/${farmId}/members/${WORKER_ID}`).send({ role: "vet" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("vet");
  });

  it("removes a member", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "worker@example.com", role: "worker" });
    const del = await request(app).delete(`/farms/${farmId}/members/${WORKER_ID}`);
    expect(del.status).toBe(204);
    const roster = await request(app).get(`/farms/${farmId}/members`);
    expect(roster.body.map((m: { userId: string }) => m.userId)).not.toContain(WORKER_ID);
  });

  it("forbids a non-owner from adding members (404)", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "worker@example.com", role: "worker" });
    const res = await request(app)
      .post(`/farms/${farmId}/members`)
      .set("Authorization", bearer(WORKER_ID))
      .send({ email: "vet@example.com", role: "vet" });
    expect(res.status).toBe(404);
  });
});

describe("Role-based data access", () => {
  it("lets a worker read and write farm data", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "worker@example.com", role: "worker" });

    const created = await request(app)
      .post("/animals")
      .set("Authorization", bearer(WORKER_ID))
      .set("x-farm-id", farmId)
      .send(animalPayload);
    expect(created.status).toBe(201);

    const list = await request(app)
      .get("/animals")
      .set("Authorization", bearer(WORKER_ID))
      .set("x-farm-id", farmId);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it("lets a vet read but not write (403 on write)", async () => {
    const farmId = await createFarm();
    await request(app).post(`/farms/${farmId}/members`).send({ email: "vet@example.com", role: "vet" });

    const list = await request(app)
      .get("/animals")
      .set("Authorization", bearer(VET_ID))
      .set("x-farm-id", farmId);
    expect(list.status).toBe(200);

    const created = await request(app)
      .post("/animals")
      .set("Authorization", bearer(VET_ID))
      .set("x-farm-id", farmId)
      .send(animalPayload);
    expect(created.status).toBe(403);
  });

  it("returns 404 for a non-member accessing farm data", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .get("/animals")
      .set("Authorization", bearer(STRANGER_ID))
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });
});
