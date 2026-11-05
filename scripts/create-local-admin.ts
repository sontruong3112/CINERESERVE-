import "dotenv/config";
import { appendFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { LOCAL_ADMIN_EMAIL } from "../src/lib/auth/local-admin";
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "http://unconfigured");
  if (
    process.env.NODE_ENV === "production" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55432" ||
    url.pathname !== "/cinereserve"
  )
    throw new Error("Local project database only.");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const existing = await db.user.findUnique({
      where: { emailNormalized: LOCAL_ADMIN_EMAIL },
    });
    if (existing) {
      if (existing.role !== "ADMIN")
        throw new Error(
          "Existing account is not ADMIN; no permissions changed.",
        );
      console.log("Local admin already exists; password unchanged.");
    } else {
      await db.user.create({
        data: {
          emailNormalized: LOCAL_ADMIN_EMAIL,
          name: "Admin local",
          role: "ADMIN",
          passwordHash: await hashPassword("admin"),
        },
      });
      console.log("Created local admin account requested by project owner.");
    }
    if (process.env.ALLOW_LOCAL_ADMIN_LOGIN !== "true")
      await appendFile(".env", "\nALLOW_LOCAL_ADMIN_LOGIN=true\n");
  } finally {
    await db.$disconnect();
  }
}
void main();
