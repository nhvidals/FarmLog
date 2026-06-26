// Augments Express' Request with fields populated by our auth middleware.
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user id, set by `authRequired`. */
      userId?: string;
    }
  }
}

export {};
