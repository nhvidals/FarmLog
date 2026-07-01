// Augments Express' Request with fields populated by our auth middleware.
import type { FarmRole } from "./domain";

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user id, set by `authRequired`. */
      userId?: string;
      /** Caller's role on the resolved farm, set by `getFarmIdFromRequest`. */
      farmRole?: FarmRole;
    }
  }
}

export {};
