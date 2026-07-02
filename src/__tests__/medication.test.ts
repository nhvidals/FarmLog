import request from "supertest";
import { Types } from "mongoose";
import { app } from "../app";
import { FarmModel } from "../models/Farm";
import { connect, disconnect, clearDatabase } from "./setup";
import { TEST_OWNER_ID } from "./testAuth";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

async function createFarm(name = "Test Farm") {
  const farm = await FarmModel.create({ name, ownerId: TEST_OWNER_ID });
  return farm._id.toString();
}

async function createAnimal(farmId: string, overrides: object = {}) {
  const res = await request(app)
    .post("/animals")
    .set("x-farm-id", farmId)
    .send({
      name: "Clucky",
      designation: "Laying hen",
      category: "oviparous",
      birthDate: "2025-01-01",
      sex: "female",
      ringNumber: `R-${Date.now()}-${Math.random()}`,
      ...overrides,
    });
  return res.body;
}

async function createMedication(farmId: string, animalId: string, overrides: object = {}) {
  return request(app)
    .post("/medication")
    .set("x-farm-id", farmId)
    .send({
      animalId,
      medicineName: "Tetracycline",
      dose: "10mg",
      date: "2026-06-01",
      ...overrides,
    });
}

// ── GET /medication ───────────────────────────────────────────────────────────

describe("GET /medication", () => {
  it("returns 400 without farmId", async () => {
    const res = await request(app).get("/medication");
    expect(res.status).toBe(400);
  });

  it("returns empty array for farm with no entries", async () => {
    const farmId = await createFarm();
    const res = await request(app).get("/medication").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns medication entries with populated animal", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    await createMedication(farmId, animal._id);

    const res = await request(app).get("/medication").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].animalId.name).toBe("Clucky");
  });

  it("returns only entries belonging to the specified farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const animal1 = await createAnimal(farmId1);
    const animal2 = await createAnimal(farmId2);
    await createMedication(farmId1, animal1._id);
    await createMedication(farmId2, animal2._id);

    const res = await request(app).get("/medication").set("x-farm-id", farmId1);
    expect(res.body).toHaveLength(1);
  });
});

// ── POST /medication ──────────────────────────────────────────────────────────

describe("POST /medication", () => {
  it("creates a medication entry and returns 201", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const res = await createMedication(farmId, animal._id);
    expect(res.status).toBe(201);
    expect(res.body.medicineName).toBe("Tetracycline");
    expect(res.body.farmId).toBe(farmId);
  });

  it("returns 400 without farmId", async () => {
    const res = await request(app).post("/medication").send({ medicineName: "X" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const res = await request(app)
      .post("/medication")
      .set("x-farm-id", farmId)
      .send({ animalId: animal._id });
    expect(res.status).toBe(400);
  });

  it("returns 400 when animal does not belong to the farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const animal = await createAnimal(farmId1);
    const res = await createMedication(farmId2, animal._id);
    expect(res.status).toBe(400);
  });

  it("returns 400 when animalId does not exist", async () => {
    const farmId = await createFarm();
    const res = await createMedication(farmId, new Types.ObjectId().toString());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the farm does not exist", async () => {
    const res = await createMedication(
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString()
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for malformed farmId", async () => {
    const res = await request(app)
      .post("/medication")
      .set("x-farm-id", "bad-id")
      .send({ medicineName: "X", dose: "1mg", date: "2026-06-01", animalId: new Types.ObjectId().toString() });
    expect(res.status).toBe(400);
  });
});

// ── PUT /medication/:id ───────────────────────────────────────────────────────

describe("PUT /medication/:id", () => {
  it("updates a medication entry and returns the updated document", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const created = await createMedication(farmId, animal._id);
    const res = await request(app)
      .put(`/medication/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ dose: "20mg" });
    expect(res.status).toBe(200);
    expect(res.body.dose).toBe("20mg");
  });

  it("returns 404 for non-existent entry", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .put(`/medication/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId)
      .send({ dose: "5mg" });
    expect(res.status).toBe(404);
  });

  it("returns 400 when updating animalId to an animal in another farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const animal1 = await createAnimal(farmId1);
    const animal2 = await createAnimal(farmId2);
    const created = await createMedication(farmId1, animal1._id);
    const res = await request(app)
      .put(`/medication/${created.body._id}`)
      .set("x-farm-id", farmId1)
      .send({ animalId: animal2._id });
    expect(res.status).toBe(400);
  });
});

// ── Recurrence ─────────────────────────────────────────────────────────────────

describe("Medication recurrence", () => {
  it("defaults to a one-off (frequency 'once', interval 1)", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const res = await createMedication(farmId, animal._id);
    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe("once");
    expect(res.body.interval).toBe(1);
  });

  it("persists a recurring schedule (weekly, every 2, with an end date)", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const res = await createMedication(farmId, animal._id, {
      frequency: "weekly",
      interval: 2,
      endDate: "2026-09-01",
    });
    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe("weekly");
    expect(res.body.interval).toBe(2);
    expect(new Date(res.body.endDate).toISOString().slice(0, 10)).toBe("2026-09-01");
  });

  it("rejects an endDate before the start date", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const res = await createMedication(farmId, animal._id, {
      date: "2026-06-01",
      frequency: "monthly",
      endDate: "2026-05-01",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an interval below 1", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const res = await createMedication(farmId, animal._id, { frequency: "daily", interval: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects a PUT that moves endDate before the stored start date", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const created = await createMedication(farmId, animal._id, { date: "2026-06-01", frequency: "weekly" });
    const res = await request(app)
      .put(`/medication/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ endDate: "2026-05-01" });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /medication/:id ────────────────────────────────────────────────────

describe("DELETE /medication/:id", () => {
  it("deletes an entry and returns 204", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    const created = await createMedication(farmId, animal._id);
    const res = await request(app)
      .delete(`/medication/${created.body._id}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(204);
  });

  it("returns 404 for non-existent entry", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .delete(`/medication/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("cannot delete entry belonging to another farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const animal = await createAnimal(farmId1);
    const created = await createMedication(farmId1, animal._id);
    const res = await request(app)
      .delete(`/medication/${created.body._id}`)
      .set("x-farm-id", farmId2);
    expect(res.status).toBe(404);
  });
});
