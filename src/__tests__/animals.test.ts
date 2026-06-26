import request from "supertest";
import { Types } from "mongoose";
import { app } from "../app";
import { FarmModel } from "../models/Farm";
import { connect, disconnect, clearDatabase } from "./setup";
import { TEST_OWNER_ID } from "./testAuth";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

const baseAnimal = () => ({
  name: "Clucky",
  designation: "Laying hen",
  birthDate: "2025-01-01",
  sex: "female",
  ringNumber: "R001",
});

async function createFarm(name = "Test Farm") {
  const farm = await FarmModel.create({ name, ownerId: TEST_OWNER_ID });
  return farm._id.toString();
}

async function createAnimal(farmId: string, overrides: object = {}) {
  return request(app)
    .post("/animals")
    .set("x-farm-id", farmId)
    .send({ ...baseAnimal(), ...overrides });
}

// ── GET /animals ──────────────────────────────────────────────────────────────

describe("GET /animals", () => {
  it("returns 400 without farmId", async () => {
    const res = await request(app).get("/animals");
    expect(res.status).toBe(400);
  });

  it("returns empty array for farm with no animals", async () => {
    const farmId = await createFarm();
    const res = await request(app).get("/animals").set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns only animals belonging to the specified farm", async () => {
    const farmId = await createFarm();
    const otherFarmId = await createFarm("Other Farm");
    await createAnimal(farmId);
    await createAnimal(otherFarmId, { ringNumber: "R999" });

    const res = await request(app).get("/animals").set("x-farm-id", farmId);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Clucky");
  });

  it("accepts farmId via query param", async () => {
    const farmId = await createFarm();
    const res = await request(app).get(`/animals?farmId=${farmId}`);
    expect(res.status).toBe(200);
  });
});

// ── POST /animals ─────────────────────────────────────────────────────────────

describe("POST /animals", () => {
  it("creates an animal and returns 201", async () => {
    const farmId = await createFarm();
    const res = await createAnimal(farmId);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Clucky");
    expect(res.body.farmId).toBe(farmId);
    expect(res.body._id).toBeDefined();
  });

  it("returns 400 without farmId header", async () => {
    const res = await request(app).post("/animals").send(baseAnimal());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the farm does not exist", async () => {
    const nonExistentFarmId = new Types.ObjectId().toString();
    const res = await request(app)
      .post("/animals")
      .set("x-farm-id", nonExistentFarmId)
      .send(baseAnimal());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Farm not found");
  });

  it("returns 400 when required fields are missing", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .post("/animals")
      .set("x-farm-id", farmId)
      .send({ name: "Clucky" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid sex enum", async () => {
    const farmId = await createFarm();
    const res = await createAnimal(farmId, { sex: "unknown" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid birthDate value", async () => {
    const farmId = await createFarm();
    const res = await createAnimal(farmId, { birthDate: "not-a-date" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for duplicate ringNumber within the same farm", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId);
    const res = await createAnimal(farmId);
    expect(res.status).toBe(400);
  });

  it("allows the same ringNumber across different farms", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    await createAnimal(farmId1);
    const res = await createAnimal(farmId2);
    expect(res.status).toBe(201);
  });

  it("stores parents referenced by ring number and resolves them to ids", async () => {
    const farmId = await createFarm();
    const father = await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Dad" });
    const mother = await createAnimal(farmId, { ringNumber: "R-MOM", name: "Mom" });
    const res = await createAnimal(farmId, {
      ringNumber: "R-KID",
      name: "Kid",
      fatherId: "R-DAD",
      motherId: "R-MOM",
    });
    expect(res.status).toBe(201);
    // The stored relationship resolves the ring number to the parent's id.
    expect(res.body.fatherId).toBe(father.body._id);
    expect(res.body.motherId).toBe(mother.body._id);
  });

  it("returns 400 for malformed farmId", async () => {
    const res = await request(app)
      .post("/animals")
      .set("x-farm-id", "not-an-object-id")
      .send(baseAnimal());
    expect(res.status).toBe(400);
  });
});

// ── POST /animals parent validation ──────────────────────────────────────────

describe("POST /animals parent validation", () => {
  it("ignores father ring number when it points to a female animal", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId, { ringNumber: "R-F", sex: "female", name: "Hen" });
    const res = await createAnimal(farmId, { ringNumber: "R-KID", fatherId: "R-F" });
    expect(res.status).toBe(201);
    expect(res.body.fatherId).toBeUndefined();
  });

  it("ignores mother ring number when it points to a male animal", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId, { ringNumber: "R-M", sex: "male", name: "Rooster" });
    const res = await createAnimal(farmId, { ringNumber: "R-KID", motherId: "R-M" });
    expect(res.status).toBe(201);
    expect(res.body.motherId).toBeUndefined();
  });

  it("ignores father ring number when it does not exist", async () => {
    const farmId = await createFarm();
    const res = await createAnimal(farmId, { ringNumber: "R-KID", fatherId: "DOES-NOT-EXIST" });
    expect(res.status).toBe(201);
    expect(res.body.fatherId).toBeUndefined();
  });

  it("ignores parent ring number when it belongs to another farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    await createAnimal(farmId2, { ringNumber: "R-DAD", sex: "male", name: "Dad" });
    const res = await createAnimal(farmId1, { ringNumber: "R-KID", fatherId: "R-DAD" });
    expect(res.status).toBe(201);
    expect(res.body.fatherId).toBeUndefined();
  });

  it("ignores empty-string parent references", async () => {
    const farmId = await createFarm();
    const res = await createAnimal(farmId, { ringNumber: "R-KID", fatherId: "", motherId: "" });
    expect(res.status).toBe(201);
  });

  it("ignores a parent of a different type (designation)", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Billy", designation: "Cabra" });
    const res = await createAnimal(farmId, { ringNumber: "R-KID", designation: "Galinha", fatherId: "R-DAD" });
    expect(res.status).toBe(201);
    expect(res.body.fatherId).toBeUndefined();
  });

  it("stores a parent of the same type", async () => {
    const farmId = await createFarm();
    const dad = await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Rooster", designation: "Galinha" });
    const res = await createAnimal(farmId, { ringNumber: "R-KID", designation: "Galinha", fatherId: "R-DAD" });
    expect(res.status).toBe(201);
    expect(res.body.fatherId).toBe(dad.body._id);
  });
});

// ── PUT /animals different-type parent ────────────────────────────────────────

describe("PUT /animals different-type parent", () => {
  it("ignores a different-type parent when only the parent changes", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Billy", designation: "Cabra" });
    const kid = await createAnimal(farmId, { ringNumber: "R-KID", designation: "Galinha" });

    const res = await request(app)
      .put(`/animals/${kid.body._id}`)
      .set("x-farm-id", farmId)
      .send({ fatherId: "R-DAD" });
    expect(res.status).toBe(200);
    expect(res.body.fatherId).toBeUndefined();
  });
});

// ── GET /animals/:id ──────────────────────────────────────────────────────────

describe("GET /animals/:id", () => {
  it("returns the animal by id", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    const res = await request(app).get(`/animals/${created.body._id}`).set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(created.body._id);
  });

  it("returns 404 for non-existent animal", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .get(`/animals/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("returns 404 for animal belonging to another farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const created = await createAnimal(farmId1);
    const res = await request(app).get(`/animals/${created.body._id}`).set("x-farm-id", farmId2);
    expect(res.status).toBe(404);
  });
});

// ── PUT /animals/:id ──────────────────────────────────────────────────────────

describe("PUT /animals/:id", () => {
  it("updates an animal and returns the updated document", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    const res = await request(app)
      .put(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  it("returns 404 when animal does not exist", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .put(`/animals/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for validation errors in the update", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    const res = await request(app)
      .put(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ sex: "invalid" });
    expect(res.status).toBe(400);
  });

  it("returns 400 without farmId", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    const res = await request(app)
      .put(`/animals/${created.body._id}`)
      .send({ name: "X" });
    expect(res.status).toBe(400);
  });

  it("ignores parent update when an animal is set as its own father", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId, { sex: "male", ringNumber: "R-SELF" });
    const res = await request(app)
      .put(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ fatherId: "R-SELF" });
    expect(res.status).toBe(200);
    expect(res.body.fatherId).toBeUndefined();
  });

  it("ignores mother update when ring number points to a male animal", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    await createAnimal(farmId, { ringNumber: "R-M", sex: "male", name: "Rooster" });
    const res = await request(app)
      .put(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ motherId: "R-M" });
    expect(res.status).toBe(200);
    expect(res.body.motherId).toBeUndefined();
  });

  it("updates a parent reference by ring number", async () => {
    const farmId = await createFarm();
    const father = await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Dad" });
    const created = await createAnimal(farmId, { ringNumber: "R-KID" });
    const res = await request(app)
      .put(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId)
      .send({ fatherId: "R-DAD" });
    expect(res.status).toBe(200);
    expect(res.body.fatherId).toBe(father.body._id);
  });
});

// ── DELETE /animals/:id ───────────────────────────────────────────────────────

describe("DELETE /animals/:id", () => {
  it("deletes an animal and returns 204", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    const res = await request(app)
      .delete(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(204);
  });

  it("confirms animal is gone after deletion", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    await request(app).delete(`/animals/${created.body._id}`).set("x-farm-id", farmId);
    const res = await request(app).get(`/animals/${created.body._id}`).set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent animal", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .delete(`/animals/${new Types.ObjectId()}`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("cannot delete animal belonging to another farm", async () => {
    const farmId1 = await createFarm("Farm 1");
    const farmId2 = await createFarm("Farm 2");
    const created = await createAnimal(farmId1);
    const res = await request(app)
      .delete(`/animals/${created.body._id}`)
      .set("x-farm-id", farmId2);
    expect(res.status).toBe(404);
  });
});

// ── GET /animals/:id/tree ─────────────────────────────────────────────────────

describe("GET /animals/:id/tree", () => {
  it("returns animal with null parents when none are set", async () => {
    const farmId = await createFarm();
    const created = await createAnimal(farmId);
    const res = await request(app)
      .get(`/animals/${created.body._id}/tree`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body.father).toBeNull();
    expect(res.body.mother).toBeNull();
  });

  it("returns nested ancestry tree with father and mother", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Dad" });
    await createAnimal(farmId, { ringNumber: "R-MOM", name: "Mom" });
    const child = await createAnimal(farmId, {
      ringNumber: "R-KID",
      name: "Kid",
      fatherId: "R-DAD",
      motherId: "R-MOM",
    });

    const res = await request(app)
      .get(`/animals/${child.body._id}/tree`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Kid");
    expect(res.body.father.name).toBe("Dad");
    expect(res.body.mother.name).toBe("Mom");
    expect(res.body.father.father).toBeNull();
  });

  it("resolves the tree root from a ring number (anilha)", async () => {
    const farmId = await createFarm();
    await createAnimal(farmId, { ringNumber: "R-DAD", sex: "male", name: "Dad" });
    await createAnimal(farmId, { ringNumber: "R-KID", name: "Kid", fatherId: "R-DAD" });

    const res = await request(app)
      .get(`/animals/R-KID/tree`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Kid");
    expect(res.body.father.name).toBe("Dad");
  });

  it("returns 404 for a non-existent ring number root", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .get(`/animals/NO-SUCH-RING/tree`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });

  it("stops at depth 4", async () => {
    const farmId = await createFarm();
    let parentRing: string | undefined;
    for (let i = 0; i < 6; i++) {
      await createAnimal(farmId, {
        ringNumber: `R-D${i}`,
        name: `Gen${i}`,
        sex: "male",
        ...(parentRing ? { fatherId: parentRing } : {}),
      });
      parentRing = `R-D${i}`;
    }

    const res = await request(app)
      .get(`/animals/${parentRing}/tree`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(200);

    let node = res.body;
    let depth = 0;
    while (node?.father) {
      node = node.father;
      depth++;
    }
    expect(depth).toBeLessThanOrEqual(4);
  });

  it("returns 404 for non-existent animal", async () => {
    const farmId = await createFarm();
    const res = await request(app)
      .get(`/animals/${new Types.ObjectId()}/tree`)
      .set("x-farm-id", farmId);
    expect(res.status).toBe(404);
  });
});
