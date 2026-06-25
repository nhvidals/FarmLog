import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";

export function getFarmIdFromRequest(req: Request, res: Response): string | null {
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

  return farmId;
}
