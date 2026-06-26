/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFiles: ["<rootDir>/src/__tests__/jestSetup.ts"],
  testTimeout: 30000,
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
  },
};
