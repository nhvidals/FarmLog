import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";
import { signToken } from "../utils/token";
import { serverError } from "../utils/http";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCredentials(body: unknown): { email: string; password: string } | null {
  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed) || password.length < 8) return null;
  return { email: trimmed, password };
}

authRouter.post("/register", async (req, res) => {
  const creds = parseCredentials(req.body);
  if (!creds) {
    return res.status(400).json({ message: "Valid email and password (min 8 chars) are required" });
  }

  try {
    const existing = await UserModel.exists({ email: creds.email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(creds.password, 10);
    const user = await UserModel.create({ email: creds.email, passwordHash });
    const token = signToken(String(user._id));
    return res.status(201).json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    return serverError(res);
  }
});

authRouter.post("/login", async (req, res) => {
  const creds = parseCredentials(req.body);
  if (!creds) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  try {
    const user = await UserModel.findOne({ email: creds.email });
    // Always run a hash comparison to avoid leaking whether the email exists.
    const ok = user
      ? await bcrypt.compare(creds.password, user.passwordHash)
      : await bcrypt.compare(creds.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(String(user._id));
    return res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    return serverError(res);
  }
});
