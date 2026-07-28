import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma Configuration (Prisma 7+
 */
export default defineConfig({
  datasource: {
    // Use the direct connection for Prisma CLI commands. The pooled URL remains
    // reserved for the serverless runtime in src/lib/db.ts.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
