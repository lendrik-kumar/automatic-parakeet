// ── Token lifetime constants (exported for reuse across services) ─────────────
export const ACCESS_TOKEN_EXPIRY = "15m";
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const JWT_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  process.env.JWT_SECRET ||
  "change-this-secret-in-production";
