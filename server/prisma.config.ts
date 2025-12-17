import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // ✅ REQUIRED for migrate dev/deploy in Prisma 7
  datasource: {
    url: env("DATABASE_URL"),
  },

  // optional but fine to keep explicit
  migrations: {
    path: "prisma/migrations",
  },

  // ✅ for PrismaClient direct DB connection (no Accelerate)
  client: {
    adapter: new PrismaMariaDb({
      url: env("DATABASE_URL"),
    }),
  },
});
