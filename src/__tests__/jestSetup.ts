/**
 * Runs before each test file (jest `setupFiles`). It:
 *  1. Sets the env the API needs (test JWT secret, NODE_ENV=test).
 *  2. Monkeypatches supertest so every request carries a valid bearer token by
 *     default — keeping the existing suite (written before auth existed) green
 *     without touching ~100 call sites. Tests that set their own Authorization
 *     header (or clear process.env.TEST_AUTH) opt out of the default.
 */
import jwt from "jsonwebtoken";
import { TEST_OWNER_ID } from "./testAuth";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.TEST_AUTH = `Bearer ${jwt.sign({ sub: TEST_OWNER_ID }, process.env.JWT_SECRET)}`;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require("supertest");
const TestProto: any = supertest.Test.prototype;
const realSet = TestProto.set;
const realEnd = TestProto.end;

TestProto.set = function (this: any, ...args: any[]) {
  const field = args[0];
  if (typeof field === "string" && field.toLowerCase() === "authorization") {
    this._hasAuth = true;
  } else if (
    field &&
    typeof field === "object" &&
    Object.keys(field).some((k) => k.toLowerCase() === "authorization")
  ) {
    this._hasAuth = true;
  }
  return realSet.apply(this, args);
};

TestProto.end = function (this: any, ...args: any[]) {
  if (process.env.TEST_AUTH && !this._hasAuth) {
    this.set("Authorization", process.env.TEST_AUTH);
  }
  return realEnd.apply(this, args);
};
