import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma Configuration (Prisma 7+
 */
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
