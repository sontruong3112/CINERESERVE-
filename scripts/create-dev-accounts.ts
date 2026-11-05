import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, access, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const url = new URL(process.env.DATABASE_URL ?? "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/cinereserve"
)
  throw new Error(
    "Development accounts are restricted to this project's local database.",
  );
const path = ".local/dev-accounts.md";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function create() {
  try {
    await access(path);
    console.log(
      "Development credentials already exist in .local/dev-accounts.md. No passwords were changed.",
    );
    return;
  } catch {}
  const branches = await db.cinema.findMany({
    where: { code: { in: ["ha-noi", "bac-ninh"] } },
  });
  if (branches.length !== 2) throw new Error("Run the catalogue seed first.");
  const specs = [
    {
      name: "CineReserve Admin",
      email: "admin@cinereserve.local",
      role: "ADMIN" as const,
      cinema: null,
    },
    {
      name: "Nhân viên Hà Nội",
      email: "staff.hanoi@cinereserve.local",
      role: "STAFF" as const,
      cinema: "ha-noi",
    },
    {
      name: "Nhân viên Bắc Ninh",
      email: "staff.bacninh@cinereserve.local",
      role: "STAFF" as const,
      cinema: "bac-ninh",
    },
  ];
  if (
    await db.user.count({
      where: { emailNormalized: { in: specs.map((s) => s.email) } },
    })
  )
    throw new Error(
      "An account with a reserved development email already exists. No accounts were promoted or reset.",
    );
  const rows = await Promise.all(
    specs.map(async (spec) => {
      const password = randomBytes(18).toString("base64url");
      return { ...spec, password, passwordHash: await hashPassword(password) };
    }),
  );
  await mkdir(".local", { recursive: true });
  await db.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.user.create({
        data: {
          name: row.name,
          emailNormalized: row.email,
          passwordHash: row.passwordHash,
          role: row.role,
          mustChangePassword: true,
          ...(row.cinema
            ? {
                staffAssignment: {
                  create: {
                    cinemaId: branches.find((b) => b.code === row.cinema)!.id,
                  },
                },
              }
            : {}),
        },
      });
    }
  });
  await writeFile(
    path,
    `# Local development accounts\n\nOnly for D:/DA. Change temporary passwords on first sign-in. Never share or commit this file.\n\n| Role | Email | Temporary password |\n| --- | --- | --- |\n${rows.map((row) => `| ${row.role} ${row.cinema ?? ""} | ${row.email} | ${row.password} |`).join("\n")}\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Created three local development accounts. Read .local/dev-accounts.md; passwords are not printed here.",
  );
}
create().finally(() => db.$disconnect());
