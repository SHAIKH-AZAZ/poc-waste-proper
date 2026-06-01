import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

// Force load .env to override any incorrect pre-existing variables
config({ override: true });

const connectionString = process.env.DATABASE_URL;

console.log("Prisma Init - Final DATABASE_URL:", connectionString);

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment!");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaPg accepts a pg.PoolConfig directly and manages the pool internally,
// so we avoid importing pg.Pool (which pulls a duplicate @types/pg version).
const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
