/**
 * Shared identity for the test suite. Farms created in tests are owned by this
 * id, and the bearer token injected into every supertest request (see
 * jestSetup.ts) is signed for the same id — so the default request is an
 * authenticated, authorized one.
 */
export const TEST_OWNER_ID = "64b0000000000000000000a1";
