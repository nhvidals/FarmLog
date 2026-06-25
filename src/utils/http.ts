import { Response } from "express";

/** Fields a client must never set directly — server-managed ids and timestamps. */
const IMMUTABLE_FIELDS = ["_id", "farmId", "createdAt", "updatedAt"] as const;

/**
 * Returns a shallow copy of a request body without the server-managed fields,
 * ready to be used as an update payload.
 */
export function stripImmutableFields(body: unknown): Record<string, any> {
  const result: Record<string, any> = { ...((body as Record<string, any>) ?? {}) };
  for (const field of IMMUTABLE_FIELDS) delete result[field];
  return result;
}

/** Standard 500 response for unexpected errors. */
export function serverError(res: Response) {
  return res.status(500).json({ message: "Internal server error" });
}
