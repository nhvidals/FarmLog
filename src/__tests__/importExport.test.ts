import request from "supertest";
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

async function createAnimal(farmId: string, ringNumber = "R001") {
  const res = await request(app)
    .post("/animals")
    .set("x-farm-id", farmId)
    .send({
      name: "Clucky",
      designation: "Laying hen",
      category: "oviparous",
      birthDate: "2025-01-01",
      sex: "female",
      ringNumber,
    });
  return res.body;
}

async function createBatch(farmId: string) {
  const res = await request(app)
    .post("/incubation")
    .set("x-farm-id", farmId)
    .send({
      species: "galinha",
      eggCount: 10,
      incubatorName: "Inc A",
      startDate: "2026-01-01",
      expectedHatchDate: "2026-01-22",
    });
  return res.body;
}

async function createMedication(farmId: string, animalId: string) {
  const res = await request(app)
    .post("/medication")
    .set("x-farm-id", farmId)
    .send({
      animalId,
      medicineName: "Tetracycline",
      dose: "10mg",
      date: "2026-06-01",
    });
  return res.body;
}

// ── GET /data/export ──────────────────────────────────────────────────────────

describe("GET /data/export", () => {
  it("returns 400 without farmId", async () => {
    const res = await request(app).get("/data/export");
    expect(res.status).toBe(400);
  });

  it("exports empty collections for a new farm", async () => {
    const farmId = await createFarm();
    const res = await request(app).get("/data/export").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body.animalTypes).toEqual([]);
    expect(res.body.animals).toEqual([]);
    expect(res.body.incubation).toEqual([]);
    expect(res.body.medication).toEqual([]);
    expect(res.body.farmId).toBe(farmId);
    expect(res.body.exportedAt).toBeDefined();
  });

  it("exports animal types belonging to the farm", async () => {
    const farmId = await createFarm();
    await request(app).post("/animal-types").set("x-farm-id", farmId).send({ name: "Galinha", category: "oviparous" });

    const res = await request(app).get("/data/export").set("x-farm-id", farmId);
    expect(res.body.animalTypes).toHaveLength(1);
    expect(res.body.animalTypes[0].name).toBe("Galinha");
  });

  it("exports all records for the farm", async () => {
    const farmId = await createFarm();
    const animal = await createAnimal(farmId);
    await createBatch(farmId);
    await createMedication(farmId, animal._id);

    const res = await request(app).get("/data/export").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body.animals).toHaveLength(1);
    expect(res.body.incubation).toHaveLength(1);
    expect(res.body.medication).toHaveLength(1);
  });

  it("exports only records belonging to the requested farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    await createAnimal(farmId1, "R001");
    await createAnimal(farmId2, "R001");

    const res = await request(app).get("/data/export").set("x-farm-id", farmId1);
    expect(res.body.animals).toHaveLength(1);
    expect(res.body.animals[0].farmId).toBe(farmId1);
  });
});

// ── POST /data/import ─────────────────────────────────────────────────────────

describe("POST /data/import", () => {
  it("returns 400 without farmId", async () => {
    const res = await request(app).post("/data/import").send({ animals: [] });
    expect(res.status).toBe(400);
  });

  it("imports animals, incubation, and medication", async () => {
    const sourceFarmId = await createFarm("Source Farm");
    const targetFarmId = await createFarm("Target Farm");

    const animal = await createAnimal(sourceFarmId, "R001");
    await createBatch(sourceFarmId);
    const med = await createMedication(sourceFarmId, animal._id);

    const exported = await request(app).get("/data/export").set("x-farm-id", sourceFarmId);

    const importRes = await request(app)
      .post("/data/import")
      .set("x-farm-id", targetFarmId)
      .send({
        animals: exported.body.animals.map(({ _id, ...a }: any) => ({ ...a, ringNumber: "R-NEW" })),
        incubation: exported.body.incubation.map(({ _id, ...b }: any) => b),
        medication: [{ medicineName: med.medicineName, dose: med.dose, date: med.date, animalId: animal._id }],
      });

    expect(importRes.status).toBe(201);
    expect(importRes.body.imported.animals).toBe(1);
    expect(importRes.body.imported.incubation).toBe(1);
    expect(importRes.body.imported.medication).toBe(1);
  });

  it("returns 201 with zero counts for empty payload", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .post("/data/import")
      .set("x-farm-id", farmId)
      .send({ animals: [], incubation: [], medication: [] });
    expect(res.status).toBe(201);
    expect(res.body.imported.animals).toBe(0);
    expect(res.body.imported.incubation).toBe(0);
    expect(res.body.imported.medication).toBe(0);
  });

  it("imports animal types into the target farm", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .post("/data/import")
      .set("x-farm-id", farmId)
      .send({ animalTypes: [{ name: "Galinha", category: "oviparous" }, { name: "Pato", category: "oviparous" }] });
    expect(res.status).toBe(201);
    expect(res.body.imported.animalTypes).toBe(2);

    const list = await request(app).get("/animal-types").set("x-farm-id", farmId);
    expect(list.body.map((t: { name: string }) => t.name)).toEqual(["Galinha", "Pato"]);
  });

  it("handles missing array keys gracefully (treats them as empty)", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .post("/data/import")
      .set("x-farm-id", farmId)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.imported.animals).toBe(0);
  });

  it("returns 400 when imported animal has invalid birthDate", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .post("/data/import")
      .set("x-farm-id", farmId)
      .send({
        animals: [{
          name: "Bad Date",
          designation: "Hen",
          category: "oviparous",
          birthDate: "not-a-date",
          sex: "female",
          ringNumber: "R-BAD"
        }]
      });

    expect(res.status).toBe(400);
  });

  it("overrides farmId on all imported records with the target farm", async () => {
    const sourceFarmId = await createFarm("Source");
    const targetFarmId = await createFarm("Target");

    const animal = await createAnimal(sourceFarmId, "R001");

    await request(app)
      .post("/data/import")
      .set("x-farm-id", targetFarmId)
      .send({ animals: [{ ...animal, _id: undefined, ringNumber: "R-IMPORT" }] });

    const res = await request(app).get("/animals").set("x-farm-id", targetFarmId);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].farmId).toBe(targetFarmId);
  });
});
