import request from "supertest";
import { Types } from "mongoose";
import { app } from "../app";
import { FarmModel } from "../models/Farm";
import { AnimalModel } from "../models/Animal";
import { connect, disconnect, clearDatabase } from "./setup";
import { TEST_OWNER_ID } from "./testAuth";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

async function createFarm(name = "Test Farm") {
  const farm = await FarmModel.create({ name, ownerId: TEST_OWNER_ID });
  return farm._id.toString();
}

async function createType(farmId: string, name = "Galinha poedeira", category = "oviparous") {
  return request(app).post("/animal-types").set("x-farm-id", farmId).send({ name, category });
}

// ── GET /animal-types ─────────────────────────────────────────────────────────

describe("GET /animal-types", () => {
  it("returns 400 without farmId", async () => {
    const res = await request(app).get("/animal-types");
    expect(res.status).toBe(400);
  });

  it("returns empty array for a farm with no types", async () => {
    const farmId = await createFarm();
    const res = await request(app).get("/animal-types").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns only types belonging to the farm, sorted by name", async () => {
    const farmId = await createFarm();
    const otherFarmId = await createFarm("Other Farm");
    await createType(farmId, "Pato");
    await createType(farmId, "Cabra");
    await createType(otherFarmId, "Coelho");

    const res = await request(app).get("/animal-types").set("x-farm-id", farmId);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((t: { name: string }) => t.name)).toEqual(["Cabra", "Pato"]);
  });
});

// ── POST /animal-types ────────────────────────────────────────────────────────

describe("POST /animal-types", () => {
  it("creates a type and returns 201", async () => {
    const farmId = await createFarm();
    const res = await createType(farmId);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Galinha poedeira");
    expect(res.body.category).toBe("oviparous");
    expect(res.body.farmId).toBe(farmId);
  });

  it("returns 400 when category is missing", async () => {
    const farmId = await createFarm();
    const res = await request(app).post("/animal-types").set("x-farm-id", farmId).send({ name: "Cabra" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid category enum", async () => {
    const farmId = await createFarm();
    const res = await createType(farmId, "Cabra", "invalid");
    expect(res.status).toBe(400);
  });

  it("trims whitespace from the name", async () => {
    const farmId = await createFarm();
    const res = await createType(farmId, "  Cabra leiteira  ");
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Cabra leiteira");
  });

  it("returns 400 without farmId", async () => {
    const res = await request(app).post("/animal-types").send({ name: "X" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const farmId = await createFarm();
    const res = await request(app).post("/animal-types").set("x-farm-id", farmId).send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when the farm does not exist", async () => {
    const res = await request(app)
      .post("/animal-types")
      .set("x-farm-id", new Types.ObjectId().toString())
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for a duplicate name within the same farm", async () => {
    const farmId = await createFarm();
    await createType(farmId, "Galinha");
    const res = await createType(farmId, "Galinha");
    expect(res.status).toBe(400);
  });

  it("allows the same name across different farms", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    await createType(farmId1, "Galinha");
    const res = await createType(farmId2, "Galinha");
    expect(res.status).toBe(201);
  });
});

// ── DELETE /animal-types/:id ──────────────────────────────────────────────────

describe("DELETE /animal-types/:id", () => {
  it("deletes a type and returns 204", async () => {
    const farmId = await createFarm();
    const created = await createType(farmId);
    const res = await request(app)
      .delete(`/animal-types/${created.body._id}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(204);
  });

  it("returns 404 for a non-existent type", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .delete(`/animal-types/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("cannot delete a type belonging to another farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const created = await createType(farmId1);
    const res = await request(app)
      .delete(`/animal-types/${created.body._id}`)
      .set("x-farm-id", farmId2);
    expect(res.status).toBe(404);
  });
});

// ── Farm deletion cascade ─────────────────────────────────────────────────────

describe("Farm deletion removes its animal types", () => {
  it("deletes types when the farm is deleted", async () => {
    const farmId = await createFarm();
    await createType(farmId, "Galinha");
    await AnimalModel.create({
      farmId,
      name: "Clucky",
      designation: "Galinha",
      birthDate: new Date("2025-01-01"),
      sex: "female",
      ringNumber: "R001",
    });

    await request(app).delete(`/farms/${farmId}`);

    const res = await request(app).get("/animal-types").set("x-farm-id", farmId);
    expect(res.body).toEqual([]);
  });
});
