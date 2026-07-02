import request from "supertest";
import { app } from "../app";
import { FarmModel } from "../models/Farm";
import { LogEntryModel } from "../models/LogEntry";
import { connect, disconnect, clearDatabase } from "./setup";
import { signToken } from "../utils/token";
import { UserModel } from "../models/User";
import { TEST_OWNER_ID } from "./testAuth";

const VET_ID = "64b0000000000000000000e1";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

async function createFarm(name = "Test Farm") {
  const farm = await FarmModel.create({ name, ownerId: TEST_OWNER_ID });
  return farm._id.toString();
}

async function createAnimal(farmId: string) {
  const res = await request(app).post("/animals").set("x-farm-id", farmId).send({
    name: "Clucky", designation: "Laying hen", birthDate: "2025-01-01", sex: "female",
    ringNumber: `R-${Date.now()}-${Math.random()}`,
  });
  return res.body._id as string;
}

function logMedication(farmId: string, body: object) {
  return request(app).post("/log").set("x-farm-id", farmId).send({
    kind: "medication", date: "2026-06-01", status: "given", medicineName: "Vitamin", dose: "1 ml", ...body,
  });
}

describe("Administration log", () => {
  it("records a medication administration", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    const res = await logMedication(farmId, { animalId, animalName: "Clucky" });
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("medication");
    expect(res.body.status).toBe("given");
    expect(res.body.medicineName).toBe("Vitamin");
  });

  it("rejects an invalid kind and a medication entry without a valid status", async () => {
    const farmId = await createFarm();
    expect((await request(app).post("/log").set("x-farm-id", farmId).send({ kind: "x", date: "2026-06-01" })).status).toBe(400);
    expect((await request(app).post("/log").set("x-farm-id", farmId).send({ kind: "medication", date: "2026-06-01", status: "maybe" })).status).toBe(400);
  });

  it("lists entries and filters by kind", async () => {
    const farmId = await createFarm();
    await logMedication(farmId, {});
    await request(app).post("/log").set("x-farm-id", farmId).send({
      kind: "incubation", date: "2026-05-01", incubatorName: "A", species: "Chicken", eggCount: 12, hatchedOk: 10, hatchedNok: 2,
    });

    const all = await request(app).get("/log").set("x-farm-id", farmId);
    expect(all.body).toHaveLength(2);

    const meds = await request(app).get("/log?kind=medication").set("x-farm-id", farmId);
    expect(meds.body).toHaveLength(1);
    expect(meds.body[0].kind).toBe("medication");
  });

  it("deletes a log entry", async () => {
    const farmId = await createFarm();
    const created = await logMedication(farmId, {});
    const del = await request(app).delete(`/log/${created.body._id}`).set("x-farm-id", farmId);
    expect(del.status).toBe(204);
  });

  it("survives deletion of the source medication schedule", async () => {
    const farmId = await createFarm();
    const animalId = await createAnimal(farmId);
    const med = await request(app).post("/medication").set("x-farm-id", farmId)
      .send({ animalId, medicineName: "Vitamin", dose: "1 ml", date: "2026-06-01" });
    await logMedication(farmId, { animalId, sourceId: med.body._id });

    await request(app).delete(`/medication/${med.body._id}`).set("x-farm-id", farmId);

    const remaining = await request(app).get("/log").set("x-farm-id", farmId);
    expect(remaining.body).toHaveLength(1); // the administration log is kept
  });

  it("archives an incubation outcome when a completed batch is deleted", async () => {
    const farmId = await createFarm();
    const batch = await request(app).post("/incubation").set("x-farm-id", farmId)
      .send({ species: "Chicken", eggCount: 12, incubatorName: "A", startDate: "2026-06-01", expectedHatchDate: "2026-06-21" });
    await request(app).put(`/incubation/${batch.body._id}`).set("x-farm-id", farmId).send({ hatchedOk: 10, hatchedNok: 2 });

    await request(app).delete(`/incubation/${batch.body._id}`).set("x-farm-id", farmId);

    const log = await request(app).get("/log?kind=incubation").set("x-farm-id", farmId);
    expect(log.body).toHaveLength(1);
    expect(log.body[0].hatchedOk).toBe(10);
    expect(log.body[0].incubatorName).toBe("A");
  });

  it("does not archive an outcome for a batch with no recorded result", async () => {
    const farmId = await createFarm();
    const batch = await request(app).post("/incubation").set("x-farm-id", farmId)
      .send({ species: "Chicken", eggCount: 12, incubatorName: "A", startDate: "2026-06-01", expectedHatchDate: "2026-06-21" });

    await request(app).delete(`/incubation/${batch.body._id}`).set("x-farm-id", farmId);

    const log = await request(app).get("/log").set("x-farm-id", farmId);
    expect(log.body).toHaveLength(0);
  });

  it("cascades: deleting the farm removes its log entries", async () => {
    const farmId = await createFarm();
    await logMedication(farmId, {});
    await request(app).delete(`/farms/${farmId}`);
    expect(await LogEntryModel.countDocuments({ farmId })).toBe(0);
  });

  it("forbids a read-only (vet) member from logging", async () => {
    const farmId = await createFarm();
    await UserModel.create({ _id: VET_ID, email: "vet@example.com", passwordHash: "x" });
    await request(app).post(`/farms/${farmId}/members`).send({ email: "vet@example.com", role: "vet" });

    const res = await request(app).post("/log").set("Authorization", `Bearer ${signToken(VET_ID)}`)
      .set("x-farm-id", farmId).send({ kind: "medication", date: "2026-06-01", status: "given", medicineName: "V", dose: "1" });
    expect(res.status).toBe(403);
  });
});
