import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Instantiate PrismaClient without adapter for now (to avoid type conflicts)
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
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