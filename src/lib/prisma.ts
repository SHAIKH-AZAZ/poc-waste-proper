import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

// Force load .env to override any incorrect pre-existing variables
config({ override: true });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Created on first use, not at import: `next build` imports every route while
// collecting page data, and must not need a database to do so.
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in the environment!");
  }

  // PrismaPg accepts a pg.PoolConfig directly and manages the pool internally,
  // so we avoid importing pg.Pool (which pulls a duplicate @types/pg version).
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  // Cache in every env: prod reuses it per process, dev survives HMR reloads
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
