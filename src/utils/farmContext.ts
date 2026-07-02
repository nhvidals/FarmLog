import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { resolveFarmRole, roleCanWrite } from "./farmAccess";

// Methods that only read data — everything else is treated as a write.
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Resolves the target farm id from the request and verifies the authenticated
 * user may access it with the appropriate role. Returns the farmId on success
 * (and sets `req.farmRole`), or null after sending the appropriate error:
 *   - 401 unauthenticated
 *   - 400 missing/malformed farmId
 *   - 404 when the farm doesn't exist OR the caller isn't a member (we don't
 *     disclose the difference)
 *   - 403 when the caller's role is read-only (vet) and the request writes
 */
export async function getFarmIdFromRequest(req: Request, res: Response): Promise<string | null> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }

  const farmId = req.header("x-farm-id") ??
    (typeof req.query.farmId === "string" ? req.query.farmId : undefined);

  if (!farmId) {
    res.status(400).json({ message: "farmId is required (x-farm-id header or farmId query param)" });
    return null;
  }

  if (!isValidObjectId(farmId)) {
    res.status(400).json({ message: "farmId is not a valid id" });
    return null;
  }

  const role = await resolveFarmRole(userId, farmId);
  if (!role) {
    res.status(404).json({ message: "Farm not found" });
    return null;
  }

  if (!READ_METHODS.has(req.method) && !roleCanWrite(role)) {
    res.status(403).json({ message: "Your role is read-only for this farm" });
    return null;
  }

  req.farmRole = role;
  return farmId;
}
