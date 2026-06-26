import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/token";

/**
 * Requires a valid `Authorization: Bearer <jwt>` header. On success sets
 * `req.userId`; otherwise responds 401 and stops the chain.
 */
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.userId = userId;
  next();
}
