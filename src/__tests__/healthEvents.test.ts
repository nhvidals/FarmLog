import request from "supertest";
import { Types } from "mongoose";
import { app } from "../app";
import { FarmModel } from "../models/Farm";
import { HealthEventModel } from "../models/HealthEvent";
import { connect, disconnect, clearDatabase } from "./setup";
import { signToken } from "../utils/token";
import { UserModel } from "../models/User";
import { TEST_OWNER_ID } from "./testAuth";

const VET_ID = "64b0000000000000000000d1";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

async function createFarm(name = "Test Farm") {
  const farm = await FarmModel.create({ name, ownerId: TEST_OWNER_ID });
  return farm._id.toString();
}

async function createAnimal(farmId: string) {
  const res = await request(app)
    .post("/animals")
    .set("x-farm-id", farmId)
    .send({
      name: "Clucky",
      designation: "Laying hen",
      birthDate: "2025-01-01",
      sex: "female",
      ringNumber: `R-${Date.now()}-${Math.random()}`,
    });
  return res.body._id as string;
}

function addEvent(farmId: string, animalId: string, body: object) {
  return request(app).post(`/animals/${animalId}/events`).set("x-farm-id", farmId).send(body);
}

describe("Health events", () => {
  it("creates and lists events newest first", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);

    await addEvent(farmId, animalId, { type: "weight", date: "2026-01-01", value: 2.1 });
    await addEvent(farmId, animalId, { type: "note", date: "2026-03-01", note: "Looks healthy" });

    const res = await request(app).get(`/animals/${animalId}/events`).set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].type).toBe("note"); // 2026-03-01 sorts before 2026-01-01
    expect(res.body[1].value).toBe(2.1);
  });

  it("rejects an unknown event type", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    const res = await addEvent(farmId, animalId, { type: "surgery", date: "2026-01-01" });
    expect(res.status).toBe(400);
  });

  it("rejects a weight event without a positive value", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    expect((await addEvent(farmId, animalId, { type: "weight", date: "2026-01-01" })).status).toBe(400);
    expect((await addEvent(farmId, animalId, { type: "weight", date: "2026-01-01", value: 0 })).status).toBe(400);
    expect((await addEvent(farmId, animalId, { type: "weight", date: "2026-01-01", value: -5 })).status).toBe(400);
  });

  it("returns 404 for an animal not in the farm", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .get(`/animals/${new Types.ObjectId()}/events`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("deletes an event", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    const created = await addEvent(farmId, animalId, { type: "note", date: "2026-01-01", note: "x" });
    const del = await request(app)
      .delete(`/animals/${animalId}/events/${created.body._id}`)
      .set("x-farm-id", farmId);
    expect(del.status).toBe(204);
    const list = await request(app).get(`/animals/${animalId}/events`).set("x-farm-id", farmId);
    expect(list.body).toHaveLength(0);
  });

  it("cascades: deleting the animal removes its events", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    await addEvent(farmId, animalId, { type: "weight", date: "2026-01-01", value: 2 });

    await request(app).delete(`/animals/${animalId}`).set("x-farm-id", farmId);
    const remaining = await HealthEventModel.countDocuments({ animalId });
    expect(remaining).toBe(0);
  });

  it("cascades: deleting the farm removes its events", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    await addEvent(farmId, animalId, { type: "note", date: "2026-01-01", note: "x" });

    await request(app).delete(`/farms/${farmId}`);
    const remaining = await HealthEventModel.countDocuments({ farmId });
    expect(remaining).toBe(0);
  });

  it("forbids a read-only (vet) member from adding events", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    await UserModel.create({ _id: VET_ID, email: "vet@example.com", passwordHash: "x" });
    await request(app).post(`/farms/${farmId}/members`).send({ email: "vet@example.com", role: "vet" });

    const res = await request(app)
      .post(`/animals/${animalId}/events`)
      .set("Authorization", `Bearer ${signToken(VET_ID)}`)
      .set("x-farm-id", farmId)
      .send({ type: "note", date: "2026-01-01", note: "x" });
    expect(res.status).toBe(403);
  });
});
