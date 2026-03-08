import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";
import prismaClient from "./prisma.js";
// ─── Better Auth Instance (User Auth) ────────────────────────────────────────
// Used as the core authentication engine for:
//   • Credential validation (emailAndPassword plugin)
//   • Short-lived JWT access token generation (jwt plugin, 15-minute expiry)
//   • Cryptographic utilities (bcrypt password hashing via custom functions)
// Session storage is handled separately via our own UserSession Prisma model.
export const auth = betterAuth({
    database: prismaAdapter(prismaClient, {
        provider: "postgresql",
    }),
    secret: process.env.BETTER_AUTH_SECRET ||
        process.env.JWT_SECRET ||
        "change-this-secret-in-production",
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    // ── User model field mappings ──────────────────────────────────────────────
    // Map Better Auth's canonical field names to our schema's field names.
    user: {
        modelName: "User",
        fields: {
            // Better Auth stores 'name' → our schema uses 'firstName'
            name: "firstName",
        },
        additionalFields: {
            lastName: { type: "string", required: true },
            username: { type: "string", required: true },
            phoneNumber: { type: "string", required: false },
            phoneVerified: { type: "boolean", defaultValue: false },
            status: { type: "string", defaultValue: "ACTIVE" },
            lastLogin: { type: "date", required: false },
        },
    },
    // ── Session model field mappings ───────────────────────────────────────────
    // Better Auth's 'token' → UserSession.refreshToken
    // Better Auth's 'userAgent' → UserSession.device
    session: {
        modelName: "UserSession",
        fields: {
            token: "refreshToken",
            userAgent: "device",
        },
        expiresIn: 7 * 24 * 60 * 60, // 7 days (refresh token lifetime)
        updateAge: 24 * 60 * 60, // 1 day  (session update threshold)
    },
    // ── Credential (email + password) authentication ───────────────────────────
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        minPasswordLength: 8,
        maxPasswordLength: 100,
    },
    // ── Plugins ────────────────────────────────────────────────────────────────
    plugins: [
        jwt({
            jwt: {
                expirationTime: "15m", // Short-lived access tokens
            },
        }),
    ],
});
// ── Token lifetime constants (exported for reuse across services) ─────────────
export const ACCESS_TOKEN_EXPIRY = "15m";
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const JWT_SECRET = process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    "change-this-secret-in-production";
