import request from "supertest";
import { app } from "../app";
import { connect, disconnect, clearDatabase } from "./setup";

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearDatabase);

describe("GET /farms", () => {
  it("returns empty array when no farms exist", async () => {
    const res = await request(app).get("/farms");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all farms sorted newest first", async () => {
    await request(app).post("/farms").send({ name: "Farm A" });
    await request(app).post("/farms").send({ name: "Farm B" });
    const res = await request(app).get("/farms");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Farm B");
  });
});

describe("POST /farms", () => {
  it("creates a farm with name only", async () => {
    const res = await request(app).post("/farms").send({ name: "My Farm" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("My Farm");
    expect(res.body._id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it("creates a farm with name and location", async () => {
    const res = await request(app).post("/farms").send({ name: "My Farm", location: "Lisbon" });
    expect(res.status).toBe(201);
    expect(res.body.location).toBe("Lisbon");
  });

  it("trims whitespace from name", async () => {
    const res = await request(app).post("/farms").send({ name: "  My Farm  " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("My Farm");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/farms").send({ location: "Lisbon" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/farms").send({});
    expect(res.status).toBe(400);
  });
});
