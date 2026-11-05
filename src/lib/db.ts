import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { cinemaDb?: PrismaClient };
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!globalDb.cinemaDb) {
    globalDb.cinemaDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
        options: "-c timezone=UTC",
      }),
    });
  }
  return globalDb.cinemaDb;
}
