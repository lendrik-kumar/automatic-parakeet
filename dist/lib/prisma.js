import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
}
// Create a Node-Postgres pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
// Create Prisma adapter
const adapter = new PrismaPg(pool);
// Instantiate PrismaClient with adapter
const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
});
export default prisma;
// Clean shutdown
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});
