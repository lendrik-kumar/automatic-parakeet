import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({
  url: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "DEVELOPMENT"
      ? ["query", "error", "warn"]
      : ["error"],
});

export default prisma;

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
