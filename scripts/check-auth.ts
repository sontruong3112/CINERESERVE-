import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { safeNext } from "../src/lib/auth/shared";

const dbUrl = new URL(process.env.DATABASE_URL ?? "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  dbUrl.hostname !== "127.0.0.1" ||
  dbUrl.port !== "55432" ||
  dbUrl.pathname !== "/cinereserve"
)
  throw new Error(
    "Auth tests run only against this project's development database.",
  );
const base = "http://localhost:3001";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const prefix = `qa-${randomBytes(8).toString("hex")}`;
const password = randomBytes(20).toString("base64url");
const createdIds: string[] = [];
let checks = 0;
function check(value: unknown, message: string) {
  assert.ok(value, message);
  checks++;
}
async function post(action: string, data: unknown, cookie = "", origin = base) {
  return fetch(`${base}/api/auth/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(data),
    redirect: "manual",
  });
}
async function get(path: string, cookie = "") {
  return fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
}
function cookieFrom(response: Response) {
  const value = response.headers.get("set-cookie") ?? "";
  check(
    /HttpOnly/i.test(value) && /SameSite=lax/i.test(value),
    "Session cookie flags",
  );
  return value.split(";")[0];
}
async function login(email: string, pass = password) {
  const response = await post("login", { email, password: pass });
  check(response.status === 200, "Login succeeds");
  return cookieFrom(response);
}
async function main() {
  const branches = await db.cinema.findMany({
    where: { code: { in: ["ha-noi", "bac-ninh"] } },
  });
  assert.equal(branches.length, 2);
  const hash = await hashPassword(password);
  for (const [suffix, role, temporary, cinema] of [
    ["admin", "ADMIN", false, null],
    ["staff", "STAFF", false, "ha-noi"],
    ["temp", "STAFF", true, "bac-ninh"],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: `QA ${suffix}`,
        emailNormalized: `${prefix}-${suffix}@example.test`,
        passwordHash: hash,
        role,
        mustChangePassword: temporary,
        ...(cinema
          ? {
              staffAssignment: {
                create: {
                  cinemaId: branches.find((b) => b.code === cinema)!.id,
                },
              },
            }
          : {}),
      },
    });
    createdIds.push(user.id);
  }
  check(
    (await get("/api/admin/overview")).status === 401,
    "Anonymous admin API blocked",
  );
  check(
    (await post("register", {}, "", "https://other.example")).status === 403,
    "Cross-origin mutation blocked",
  );
  check(
    (
      await post("register", {
        name: "QA",
        email: `${prefix}-invalid@example.test`,
        password: "short",
        confirmPassword: "short",
      })
    ).status === 400,
    "Short passwords rejected",
  );
  const email = `${prefix}-customer@example.test`;
  const registration = await post("register", {
    name: "QA Customer",
    email: email.toUpperCase(),
    password,
    confirmPassword: password,
    role: "ADMIN",
    cinemaId: branches[0].id,
  });
  check(registration.status === 201, "Customer registration");
  const customerCookie = cookieFrom(registration);
  const registered = await registration.json();
  createdIds.push(registered.user.id);
  check(
    registered.user.role === "CUSTOMER",
    "Cannot self-promote through registration",
  );
  check(
    !JSON.stringify(registered).includes("passwordHash") &&
      !JSON.stringify(registered).includes("tokenHash"),
    "No credential hashes in DTO",
  );
  check(
    (
      await post("register", {
        name: "QA",
        email,
        password,
        confirmPassword: password,
      })
    ).status === 409,
    "Duplicate normalized email rejected",
  );
  check(
    (await post("login", { email, password: "wrong" })).status === 401,
    "Wrong password rejected",
  );
  check(
    (await get("/api/admin/overview", customerCookie)).status === 403,
    "Customer admin API blocked",
  );
  const page = await get("/vi/admin", customerCookie);
  const pageText = await page.text();
  check(
    (page.headers.get("location") ?? pageText).includes("forbidden"),
    "Customer admin page blocked",
  );
  const anonymousPage = await get("/vi/account/profile");
  const anonymousText = await anonymousPage.text();
  check(
    (anonymousPage.headers.get("location") ?? anonymousText).includes("login"),
    "Profile requires sign-in",
  );
  const adminCookie = await login(`${prefix}-admin@example.test`);
  check(
    (await get("/api/admin/overview", adminCookie)).status === 200,
    "Admin API allowed",
  );
  const staffCookie = await login(`${prefix}-staff@example.test`);
  check(
    (await get("/api/admin/overview", staffCookie)).status === 403,
    "Staff admin API blocked",
  );
  const staffResponse = await get("/api/staff/showtimes", staffCookie);
  check(staffResponse.status === 200, "Staff assigned data allowed");
  const staffData = await staffResponse.json();
  check(staffData.cinema.code === "ha-noi", "Staff scope from database");
  check(
    (await get("/api/staff/showtimes?cinema=bac-ninh", staffCookie)).status ===
      403,
    "Cannot override staff branch",
  );
  const allowedIds = new Set(
    (
      await db.showtime.findMany({
        where: { auditorium: { cinema: { code: "ha-noi" } } },
        select: { id: true },
      })
    ).map((s) => s.id),
  );
  check(
    staffData.sessions.every((s: { id: string }) => allowedIds.has(s.id)),
    "No foreign branch sessions",
  );
  const temporaryCookie = await login(`${prefix}-temp@example.test`);
  check(
    (await get("/api/staff/showtimes", temporaryCookie)).status === 428,
    "Temporary password enforced on API",
  );
  const newPassword = randomBytes(20).toString("base64url");
  const changed = await post(
    "password",
    {
      currentPassword: password,
      password: newPassword,
      confirmPassword: newPassword,
    },
    temporaryCookie,
  );
  check(changed.status === 200, "Password change");
  const changedCookie = cookieFrom(changed);
  check(
    (await get("/api/staff/showtimes", changedCookie)).status === 200,
    "Workspace after password change",
  );
  check(
    (await get("/api/staff/showtimes", temporaryCookie)).status === 401,
    "Previous session revoked",
  );
  check(
    (await post("login", { email: `${prefix}-temp@example.test`, password }))
      .status === 401,
    "Old password invalid",
  );
  check(
    (
      await post(
        "profile",
        { name: "QA Updated", phone: "0912345678", role: "ADMIN" },
        customerCookie,
      )
    ).status === 200,
    "Own profile can change",
  );
  check(
    (await get("/api/admin/overview", customerCookie)).status === 403,
    "Profile cannot self-promote",
  );
  await db.user.update({
    where: { id: createdIds[0] },
    data: { role: "CUSTOMER" },
  });
  check(
    (await get("/api/admin/overview", adminCookie)).status === 403,
    "Role changes effective immediately",
  );
  await db.user.update({
    where: { id: registered.user.id },
    data: { status: "LOCKED" },
  });
  check(
    (await get("/api/auth/me", customerCookie)).status === 200,
    "Me responds safely for locked session",
  );
  check(
    (await (await get("/api/auth/me", customerCookie)).json()).user === null,
    "Locked account cannot authenticate",
  );
  await db.user.update({
    where: { id: registered.user.id },
    data: { status: "ACTIVE" },
  });
  const customerSecond = await login(email);
  await db.authSession.updateMany({
    where: { userId: registered.user.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  check(
    (await (await get("/api/auth/me", customerSecond)).json()).user === null,
    "Expired session rejected",
  );
  const staffSecond = await login(`${prefix}-staff@example.test`);
  check(
    (await post("logout", {}, staffSecond)).status === 200,
    "Logout succeeds",
  );
  check(
    (await get("/api/staff/showtimes", staffSecond)).status === 401,
    "Logout revokes server session",
  );
  for (let i = 0; i < 10; i++)
    await post("login", {
      email: `${prefix}-throttle@example.test`,
      password: "wrong",
    });
  check(
    (
      await post("login", {
        email: `${prefix}-throttle@example.test`,
        password: "wrong",
      })
    ).status === 429,
    "Brute-force limit",
  );
  check(
    safeNext("//evil.example", "vi") === null &&
      safeNext("/vi/\\evil.example", "vi") === null &&
      safeNext("/vi/movies?genre=drama", "vi") === "/vi/movies?genre=drama",
    "Redirect destinations stay internal",
  );
  console.log(
    `Auth integration passed: ${checks} checks. Only isolated QA accounts used; temporary rows are cleaned up.`,
  );
}
main().finally(async () => {
  await db.authSession.deleteMany({ where: { userId: { in: createdIds } } });
  await db.staffAssignment.deleteMany({
    where: { userId: { in: createdIds } },
  });
  await db.user.deleteMany({ where: { id: { in: createdIds } } });
  await db.$disconnect();
});
