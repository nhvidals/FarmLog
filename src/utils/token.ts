import jwt from "jsonwebtoken";

/**
 * Reads the JWT secret lazily so tests/processes can set it before first use.
 * Throws if unset — we never want to sign or verify with a missing/empty secret.
 */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

const TOKEN_TTL = process.env.JWT_TTL ?? "30d";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: TOKEN_TTL } as jwt.SignOptions);
}

/** Returns the user id (sub) from a valid token, or null if invalid/expired. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "object" && payload.sub) {
      return String(payload.sub);
    }
    return null;
  } catch {
    return null;
  }
}
