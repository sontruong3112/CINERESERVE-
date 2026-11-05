import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import type { StaffDirectory, StaffRow } from "../src/lib/admin/staff-shared";

const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = {
  id: "server-only",
  filename: require.resolve("server-only"),
  loaded: true,
  exports: {},
} as NodeJS.Module;
const url = new URL(process.env.DATABASE_URL || "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/cinereserve"
)
  throw new Error("Project local QA only.");
const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }),
  base = "http://localhost:3001",
  prefix = `qa-staff-${randomBytes(6).toString("hex")}`;
const users: string[] = [],
  cinemas: string[] = [],
  sessions: string[] = [],
  cookies: string[] = [];
const password = randomBytes(20).toString("base64url");
let checks = 0;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function req(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin = base,
) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
  });
}
async function expected(
  response: Response,
  status: number,
  label: string,
  code?: string,
) {
  const body = await response.json();
  check(
    response.status === status,
    `${label}: expected ${status}, got ${response.status}, ${body.error || ""}`,
  );
  if (code) check(body.error === code, `${label} error code`);
  return body;
}
async function list(query: Record<string, string>, cookie: string) {
  const response = await req(
    "/api/admin/staff?" + new URLSearchParams(query),
    "GET",
    undefined,
    cookie,
  );
  check(
    response.headers.get("cache-control")?.includes("no-store"),
    "List not cached",
  );
  return (await expected(response, 200, "Staff list")) as StaffDirectory;
}
async function main() {
  for (const [index, active] of [true, false].entries()) {
    const c = await db.cinema.create({
      data: {
        code: `${prefix}-${index}`,
        name: `QA Staff ${index}`,
        addressVi: "QA",
        addressEn: "QA",
        areaVi: "QA",
        areaEn: "QA",
        active,
      },
    });
    cinemas.push(c.id);
  }
  const hash = await hashPassword(password);
  for (const role of ["ADMIN", "STAFF", "CUSTOMER"] as const) {
    const user = await db.user.create({
      data: {
        name: prefix,
        emailNormalized: `${prefix}-${users.length}@example.test`,
        passwordHash: hash,
        role,
        ...(role === "STAFF"
          ? { staffAssignment: { create: { cinemaId: cinemas[0] } } }
          : {}),
      },
    });
    users.push(user.id);
    const token = randomBytes(32).toString("hex");
    const session = await db.authSession.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        authVersion: 0,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    sessions.push(session.id);
    cookies.push("cr_session=" + token);
  }
  const [admin, staff, customer] = cookies;
  const payload = {
    name: "Nhân viên QA mới",
    email: `${prefix}-new@example.test`,
    cinemaId: cinemas[0],
    temporaryPassword: password,
  };
  await expected(await req("/api/admin/staff"), 401, "Guest list");
  await expected(
    await req("/api/admin/staff", "POST", payload),
    401,
    "Guest creation",
  );
  for (const cookie of [staff, customer]) {
    await expected(
      await req("/api/admin/staff", "GET", undefined, cookie),
      403,
      "Nonadmin list",
      "FORBIDDEN",
    );
    await expected(
      await req("/api/admin/staff", "POST", payload, cookie),
      403,
      "Nonadmin creation",
      "FORBIDDEN",
    );
  }
  const { createStaff, staffDirectory } =
    await import("../src/lib/admin/staff");
  for (const session of sessions.slice(1))
    for (const action of [
      () => createStaff(session, payload),
      () => staffDirectory(session),
    ]) {
      await assert.rejects(
        action,
        (error: unknown) => (error as { code?: string }).code === "FORBIDDEN",
      );
      checks++;
    }
  await expected(
    await req(
      "/api/admin/staff",
      "POST",
      payload,
      admin,
      "https://bad.example",
    ),
    403,
    "Cross-origin creation",
    "INVALID_ORIGIN",
  );
  await expected(
    await req(
      "/api/admin/staff",
      "POST",
      { ...payload, name: "x".repeat(9000) },
      admin,
    ),
    413,
    "Oversized body",
    "BODY_TOO_LARGE",
  );
  for (const change of [
    { name: "x" },
    { name: "x".repeat(81) },
    { email: "not-email" },
    { email: "a".repeat(255) + "@test.local" },
    { temporaryPassword: "short" },
    { temporaryPassword: "x".repeat(129) },
    { temporaryPassword: " ".repeat(10) },
    { cinemaId: "invalid" },
    { role: "ADMIN" },
    { status: "LOCKED" },
    { mustChangePassword: false },
    { id: randomUUID() },
  ])
    await expected(
      await req("/api/admin/staff", "POST", { ...payload, ...change }, admin),
      400,
      "Invalid staff input",
      "INVALID_INPUT",
    );
  await expected(
    await req(
      "/api/admin/staff",
      "POST",
      { ...payload, cinemaId: cinemas[1] },
      admin,
    ),
    409,
    "Inactive branch",
    "CINEMA_UNAVAILABLE",
  );
  await expected(
    await req(
      "/api/admin/staff",
      "POST",
      { ...payload, cinemaId: randomUUID() },
      admin,
    ),
    409,
    "Missing branch",
    "CINEMA_UNAVAILABLE",
  );
  check(
    (await db.user.count({ where: { emailNormalized: payload.email } })) === 0,
    "Invalid attempts create no staff",
  );
  const response = await req(
    "/api/admin/staff",
    "POST",
    {
      ...payload,
      name: "  Nhân viên QA mới  ",
      email: "  " + payload.email.toUpperCase() + "  ",
    },
    admin,
  );
  check(
    response.headers.get("cache-control")?.includes("no-store"),
    "Creation response not cached",
  );
  const created: StaffRow = (await expected(response, 201, "Create staff"))
    .staff;
  users.push(created.id);
  check(
    created.name === payload.name && created.email === payload.email,
    "Name/email normalized",
  );
  check(
    created.cinema?.id === cinemas[0] &&
      created.mustChangePassword &&
      created.status === "ACTIVE",
    "Assignment and required first password change",
  );
  check(
    !JSON.stringify(created).includes(password) &&
      !JSON.stringify(created).includes("passwordHash") &&
      !JSON.stringify(created).includes("authVersion"),
    "Response contains no password or auth internals",
  );
  const stored = await db.user.findUniqueOrThrow({
    where: { id: created.id },
    include: { staffAssignment: true },
  });
  check(
    stored.role === "STAFF" && stored.staffAssignment?.cinemaId === cinemas[0],
    "Server fixes role and branch",
  );
  check(
    stored.passwordHash !== password &&
      (await verifyPassword(password, stored.passwordHash)),
    "Temporary password hashed correctly",
  );
  const audit = await db.auditLog.findMany({ where: { entityId: created.id } });
  check(
    audit.length === 1 &&
      audit[0].action === "STAFF_CREATED" &&
      audit[0].actorUserId === users[0],
    "One actor audit recorded",
  );
  check(
    !JSON.stringify(audit).includes(password) &&
      !JSON.stringify(audit).includes(stored.passwordHash),
    "Audit has no password or hash",
  );
  await expected(
    await req("/api/admin/staff", "POST", payload, admin),
    409,
    "Duplicate email",
    "EMAIL_UNAVAILABLE",
  );
  check(
    (await db.auditLog.count({ where: { entityId: created.id } })) === 1,
    "Duplicate creates no second audit",
  );
  const customerBefore = await db.user.findUniqueOrThrow({
    where: { id: users[2] },
  });
  await expected(
    await req(
      "/api/admin/staff",
      "POST",
      { ...payload, email: customerBefore.emailNormalized },
      admin,
    ),
    409,
    "Cannot promote customer",
    "EMAIL_UNAVAILABLE",
  );
  const customerAfter = await db.user.findUniqueOrThrow({
    where: { id: users[2] },
  });
  check(
    customerAfter.role === "CUSTOMER" &&
      customerAfter.passwordHash === customerBefore.passwordHash &&
      customerAfter.authVersion === customerBefore.authVersion,
    "Existing customer untouched",
  );
  const concurrentEmail = `${prefix}-race@example.test`;
  const race = await Promise.all([
    req(
      "/api/admin/staff",
      "POST",
      { ...payload, email: concurrentEmail },
      admin,
    ),
    req(
      "/api/admin/staff",
      "POST",
      { ...payload, email: concurrentEmail },
      admin,
    ),
  ]);
  check(
    race
      .map((r) => r.status)
      .sort()
      .join(",") === "201,409",
    "Concurrent duplicate creates one staff",
  );
  const raced = await db.user.findUniqueOrThrow({
    where: { emailNormalized: concurrentEmail },
  });
  users.push(raced.id);
  check(
    (await db.staffAssignment.count({ where: { userId: raced.id } })) === 1 &&
      (await db.auditLog.count({ where: { entityId: raced.id } })) === 1,
    "Concurrent create has one assignment and audit",
  );
  for (let i = 0; i < 21; i++) {
    const u = await db.user.create({
      data: {
        name: `${prefix}-seed-${i}`,
        emailNormalized: `${prefix}-seed-${i}@example.test`,
        passwordHash: hash,
        role: "STAFF",
        mustChangePassword: i % 2 === 0,
        staffAssignment: { create: { cinemaId: cinemas[i % 2] } },
      },
    });
    users.push(u.id);
  }
  const page1 = await list({ q: prefix + "-seed" }, admin),
    page2 = await list({ q: prefix + "-seed", page: "2" }, admin);
  check(
    page1.total === 21 &&
      page1.items.length === 20 &&
      page1.pages === 2 &&
      page2.items.length === 1,
    "Staff pagination 20",
  );
  check(
    !page1.items.some((u) => users.slice(0, 3).includes(u.id)),
    "List only STAFF role",
  );
  const exact = await list({ q: payload.email.toUpperCase() }, admin);
  check(
    exact.total === 1 && exact.items[0].id === created.id,
    "Case insensitive email search",
  );
  check(
    (await list({ q: prefix + "-seed", cinema: cinemas[0] }, admin)).total ===
      11,
    "Cinema filter",
  );
  check(
    (await list({ q: prefix + "-seed", cinema: cinemas[1] }, admin)).total ===
      10,
    "Inactive cinema staff still visible",
  );
  check(
    !(await list({ q: prefix }, admin)).items.some(
      (u) => u.id === users[0] || u.id === users[2],
    ),
    "Admin/customer not exposed as staff",
  );
  for (const query of [
    "page=0",
    "page=bad",
    "q=" + "x".repeat(101),
    "cinema=bad",
    "cinema=" + randomUUID(),
  ])
    await expected(
      await req("/api/admin/staff?" + query, "GET", undefined, admin),
      400,
      "Invalid list filters",
      "INVALID_FILTER",
    );
  const login = await req("/api/auth/login", "POST", {
    email: payload.email,
    password,
  });
  const logged = await expected(login, 200, "Temporary staff login");
  check(
    logged.user.role === "STAFF" && logged.user.mustChangePassword,
    "Temporary login reports required change",
  );
  const temporaryCookie = login.headers.get("set-cookie")!.split(";")[0];
  await expected(
    await req("/api/staff/showtimes", "GET", undefined, temporaryCookie),
    428,
    "No staff operations before password change",
    "PASSWORD_CHANGE_REQUIRED",
  );
  const changed = await req(
    "/api/auth/password",
    "POST",
    {
      currentPassword: password,
      password: password + "-new",
      confirmPassword: password + "-new",
    },
    temporaryCookie,
  );
  const changeResult = await expected(changed, 200, "First password change");
  check(
    changeResult.user.mustChangePassword === false &&
      changeResult.user.role === "STAFF",
    "Password change retains staff role",
  );
  const readyCookie = changed.headers.get("set-cookie")!.split(";")[0];
  check(
    (await req("/api/staff/showtimes", "GET", undefined, readyCookie))
      .status === 200,
    "Staff operations available after change",
  );
  check(
    (await req("/api/staff/showtimes", "GET", undefined, temporaryCookie))
      .status === 401,
    "Old temporary session invalidated",
  );
  const authorized = await db.user.findUniqueOrThrow({
    where: { id: created.id },
  });
  check(
    !(await verifyPassword(password, authorized.passwordHash)) &&
      (await verifyPassword(password + "-new", authorized.passwordHash)),
    "Old temporary password no longer works",
  );
  for (const data of [
    { mustChangePassword: true },
    { mustChangePassword: false, status: "LOCKED" as const },
    { status: "ACTIVE" as const, authVersion: 1 },
  ]) {
    await db.user.update({ where: { id: users[0] }, data });
    const expectedStatus =
      "mustChangePassword" in data && data.mustChangePassword ? 428 : 401;
    await expected(
      await req(
        "/api/admin/staff",
        "POST",
        { ...payload, email: `${prefix}-blocked@example.test` },
        admin,
      ),
      expectedStatus,
      "Invalid admin session cannot create",
    );
  }
  check(
    (await db.user.count({
      where: { emailNormalized: `${prefix}-blocked@example.test` },
    })) === 0,
    "Blocked admin leaves no account",
  );
  await db.user.update({
    where: { id: users[0] },
    data: { authVersion: 0, status: "ACTIVE", mustChangePassword: false },
  });
  for (const method of ["PATCH", "DELETE"])
    check(
      (await req("/api/admin/staff", method, {}, admin)).status === 405,
      `No advanced ${method} endpoint`,
    );
  for (const locale of ["vi", "en"]) {
    const response = await req(
        `/${locale}/admin/staff?q=${prefix}`,
        "GET",
        undefined,
        admin,
      ),
      html = await response.text();
    check(
      response.ok &&
        html.includes(locale === "vi" ? "Tạo nhân viên" : "Add staff member"),
      `Staff screen ${locale}`,
    );
    check(
      !html.includes(password) && !html.includes(stored.passwordHash),
      `No credentials in server HTML ${locale}`,
    );
  }
  const guest = await req("/vi/admin/staff");
  check(
    guest.status === 307 && guest.headers.get("location")?.includes("/login"),
    "Page requires login",
  );
  const denied = await req("/vi/admin/staff", "GET", undefined, staff);
  check(
    denied.status === 307 &&
      denied.headers.get("location")?.includes("/forbidden"),
    "Page requires admin",
  );
  console.log(
    `Minimal staff management passed: ${checks} checks. Only isolated QA accounts used; credentials never printed.`,
  );
}
main().finally(async () => {
  // Clean only users carrying this random test prefix, including a just-created account if a check failed.
  const extra = await db.user.findMany({
      where: { emailNormalized: { startsWith: prefix + "-" } },
      select: { id: true },
    }),
    ids = [...new Set([...users, ...extra.map((u) => u.id)])];
  await db.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: ids } },
        { entityType: "User", entityId: { in: ids } },
      ],
    },
  });
  await db.authSession.deleteMany({ where: { userId: { in: ids } } });
  await db.staffAssignment.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.cinema.deleteMany({ where: { id: { in: cinemas } } });
  await db.authRateLimit.deleteMany({
    where: {
      key: {
        in: [
          createHash("sha256")
            .update("login:" + `${prefix}-new@example.test`)
            .digest("hex"),
        ],
      },
    },
  });
  await db.$disconnect();
  const { getDb } = await import("../src/lib/db");
  await getDb().$disconnect();
});
