import { defineConfig } from "prisma/config";

export default defineConfig({
  // @ts-expect-error - Migrate property is present in Prisma 7 but types might be lagging
  migrate: {
    url: process.env.DATABASE_URL!,
  },
});
