import request from "supertest";
import { Types } from "mongoose";
import { app } from "../app";
import { FarmModel } from "../models/Farm";
import { connect, disconnect, clearDatabase } from "./setup";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

const baseBatch = () => ({
  species: "galinha",
  eggCount: 12,
  incubatorName: "Incubadora A",
  startDate: "2026-01-01",
  expectedHatchDate: "2026-01-22",
});

async function createFarm() {
  const farm = await FarmModel.create({ name: "Test Farm" });
  return farm._id.toString();
}

async function createBatch(farmId: string, overrides: object = {}) {
  return request(app)
    .post("/incubation")
    .set("x-farm-id", farmId)
    .send({ ...baseBatch(), ...overrides });
}

// ── GET /incubation ───────────────────────────────────────────────────────────

describe("GET /incubation", () => {
  it("returns 400 without farmId", async () => {
    const res = await request(app).get("/incubation");
    expect(res.status).toBe(400);
  });

  it("returns empty array for farm with no batches", async () => {
    const farmId = await createFarm();
    const res = await request(app).get("/incubation").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns only batches belonging to the specified farm", async () => {
    const farmId1 = await createFarm();
    const farmId2 = await createFarm();
    await createBatch(farmId1);
    await createBatch(farmId2);

    const res = await request(app).get("/incubation").set("x-farm-id", farmId1);
    expect(res.body).toHaveLength(1);
  });
});

// ── POST /incubation ──────────────────────────────────────────────────────────

describe("POST /incubation", () => {
  it("creates a batch and returns 201", async () => {
    const farmId = await createFarm();
    const res = await createBatch(farmId);
    expect(res.status).toBe(201);
    expect(res.body.species).toBe("galinha");
    expect(res.body.eggCount).toBe(12);
    expect(res.body.farmId).toBe(farmId);
  });

  it("returns 400 without farmId", async () => {
    const res = await request(app).post("/incubation").send(baseBatch());
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .post("/incubation")
      .set("x-farm-id", farmId)
      .send({ species: "galinha" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when eggCount is below minimum (1)", async () => {
    const farmId = await createFarm();
    const res = await createBatch(farmId, { eggCount: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the farm does not exist", async () => {
    const res = await request(app)
      .post("/incubation")
      .set("x-farm-id", new Types.ObjectId().toString())
      .send(baseBatch());
    expect(res.status).toBe(404);
  });

  it("returns 400 when expectedHatchDate is before startDate", async () => {
    const farmId = await createFarm();
    const res = await createBatch(farmId, {
      startDate: "2026-02-01",
      expectedHatchDate: "2026-01-01",
    });
    expect(res.status).toBe(400);
  });

  it("accepts a batch where hatch date equals start date", async () => {
    const farmId = await createFarm();
    const res = await createBatch(farmId, {
      startDate: "2026-01-01",
      expectedHatchDate: "2026-01-01",
    });
    expect(res.status).toBe(201);
  });

  it("returns 400 for malformed farmId", async () => {
    const res = await request(app)
      .post("/incubation")
      .set("x-farm-id", "bad-id")
      .send(baseBatch());
    expect(res.status).toBe(400);
  });
});

// ── PUT /incubation/:id ───────────────────────────────────────────────────────

describe("PUT /incubation/:id", () => {
  it("updates a batch and returns the updated document", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId);
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ eggCount: 24 });
    expect(res.status).toBe(200);
    expect(res.body.eggCount).toBe(24);
  });

  it("returns 404 for non-existent batch", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .put(`/incubation/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId)
      .send({ eggCount: 5 });
    expect(res.status).toBe(404);
  });

  it("stores the incubation outcome (hatchedOk / hatchedNok)", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId);
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ hatchedOk: 9, hatchedNok: 3 });
    expect(res.status).toBe(200);
    expect(res.body.hatchedOk).toBe(9);
    expect(res.body.hatchedNok).toBe(3);
  });

  it("returns 400 for a negative outcome value", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId);
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ hatchedOk: -1 });
    expect(res.status).toBe(400);
  });

  it("returns 404 for batch belonging to another farm", async () => {
    const farmId1 = await createFarm();
    const farmId2 = await createFarm();
    const created = await createBatch(farmId1);
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId2)
      .send({ eggCount: 5 });
    expect(res.status).toBe(404);
  });

  it("returns 400 for validation errors", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId);
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ eggCount: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when updating hatch date to before the stored start date", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId); // start 2026-01-01
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ expectedHatchDate: "2025-01-01" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when updating start date to after the stored hatch date", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId); // hatch 2026-01-22
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ startDate: "2026-06-01" });
    expect(res.status).toBe(400);
  });

  it("allows updating both dates together to a valid range", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId);
    const res = await request(app)
      .put(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ startDate: "2026-03-01", expectedHatchDate: "2026-03-21" });
    expect(res.status).toBe(200);
  });
});

// ── DELETE /incubation/:id ────────────────────────────────────────────────────

describe("DELETE /incubation/:id", () => {
  it("deletes a batch and returns 204", async () => {
    const farmId = await createFarm();
    const created = await createBatch(farmId);
    const res = await request(app)
      .delete(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(204);
  });

  it("returns 404 for non-existent batch", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .delete(`/incubation/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("cannot delete batch belonging to another farm", async () => {
    const farmId1 = await createFarm();
    const farmId2 = await createFarm();
    const created = await createBatch(farmId1);
    const res = await request(app)
      .delete(`/incubation/${created.body._id}`)
      .set("x-farm-id", farmId2);
    expect(res.status).toBe(404);
  });
});
