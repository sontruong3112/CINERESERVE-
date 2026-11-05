import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
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
  throw new Error("Only the project's local development database is allowed.");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const base = "http://localhost:3001",
  prefix = `qa-admin-${randomBytes(6).toString("hex")}`,
  password = randomBytes(20).toString("base64url");
const users: string[] = [],
  movies: string[] = [];
let cinemaId: string | undefined,
  checks = 0;
function check(value: unknown, message: string) {
  assert.ok(value, message);
  checks++;
}
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin = base,
) {
  return fetch(`${base}${path}`, {
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
async function expect(response: Response, status: number, label: string) {
  const result = await response.json();
  check(
    response.status === status,
    `${label}: expected ${status}, received ${response.status} ${JSON.stringify(result)}`,
  );
  return result.movie ?? result.showtime ?? result;
}
async function main() {
  const cinema = await db.cinema.create({
    data: {
      code: prefix,
      name: "QA Cinema",
      addressVi: "QA",
      addressEn: "QA",
      areaVi: "QA",
      areaEn: "QA",
    },
  });
  cinemaId = cinema.id;
  const rooms = await Promise.all(
    ["A", "B", "EMPTY"].map((code) =>
      db.auditorium.create({
        data: {
          cinemaId: cinema.id,
          code,
          name: `QA Room ${code}`,
          ...(code !== "EMPTY"
            ? { seats: { create: { rowLabel: "A", seatNumber: 1 } } }
            : {}),
        },
      }),
    ),
  );
  const hash = await hashPassword(password),
    cookies: string[] = [];
  for (const role of ["ADMIN", "CUSTOMER", "STAFF"] as const) {
    const email = `${prefix}-${role.toLowerCase()}@example.test`;
    const user = await db.user.create({
      data: {
        name: "QA Admin Test",
        emailNormalized: email,
        passwordHash: hash,
        role,
        ...(role === "STAFF"
          ? { staffAssignment: { create: { cinemaId: cinema.id } } }
          : {}),
      },
    });
    users.push(user.id);
    const response = await request("/api/auth/login", "POST", {
      email,
      password,
    });
    await expect(response, 200, `${role} login`);
    cookies.push((response.headers.get("set-cookie") ?? "").split(";")[0]);
  }
  const admin = cookies[0];
  for (const endpoint of ["/api/admin/movies", "/api/admin/showtimes"]) {
    await expect(await request(endpoint), 401, "Anonymous denied");
    for (const cookie of cookies.slice(1)) {
      await expect(
        await request(endpoint, "GET", undefined, cookie),
        403,
        "Non-admin read denied",
      );
      await expect(
        await request(endpoint, "POST", {}, cookie),
        403,
        "Non-admin write denied",
      );
    }
  }
  await expect(
    await request(
      "/api/admin/movies",
      "POST",
      {},
      admin,
      "https://other.example",
    ),
    403,
    "Cross-origin write denied",
  );
  const input = {
    slug: prefix,
    originalTitle: "QA Film",
    titleVi: "Phim kiểm thử quản trị",
    titleEn: "Admin QA Film",
    synopsisVi: "Nội dung kiểm thử riêng, không thay đổi phim có sẵn.",
    synopsisEn: "Isolated integration test movie content.",
    durationMinutes: 120,
    ageRatingCode: "P",
    year: 2026,
    director: "QA Director",
    posterUrl: "/brand/cinereserve-mark.svg",
    backdropUrl: "/brand/cinereserve-mark.svg",
    accent: "#edc076",
    status: "DRAFT",
    genres: ["drama"],
    releaseDate: "2026-11-02",
  };
  let movie = await expect(
    await request("/api/admin/movies", "POST", input, admin),
    201,
    "Create draft movie",
  );
  movies.push(movie.id);
  check(
    movie.status === "DRAFT" && movie.version === 0,
    "Draft defaults and version",
  );
  check(
    (await request(`/vi/movies/${prefix}`)).status === 404,
    "Draft hidden publicly",
  );
  await expect(
    await request("/api/admin/movies", "POST", input, admin),
    409,
    "Duplicate slug",
  );
  for (const invalid of [
    { durationMinutes: 0 },
    { genres: [] },
    { releaseDate: "2026-02-31" },
    { posterUrl: "javascript:alert(1)" },
    { titleEn: "", synopsisEn: "partial" },
  ])
    await expect(
      await request(
        `/api/admin/movies/${movie.id}`,
        "PATCH",
        { ...input, version: movie.version, ...invalid },
        admin,
      ),
      400,
      "Invalid movie rejected",
    );
  movie = await expect(
    await request(
      `/api/admin/movies/${movie.id}`,
      "PATCH",
      { ...movie, status: "COMING_SOON" },
      admin,
    ),
    200,
    "Publish movie",
  );
  await expect(
    await request(
      `/api/admin/movies/${movie.id}`,
      "PATCH",
      { ...movie, version: 0 },
      admin,
    ),
    409,
    "Stale movie rejected",
  );
  const vi = await (await request(`/vi/movies/${prefix}`)).text(),
    en = await (await request(`/en/movies/${prefix}`)).text();
  check(
    vi.includes(input.titleVi) && en.includes(input.titleEn),
    "Published movie has both translations",
  );
  const day = new Date(Date.now() + 86400000 + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  const slot = {
    movieId: movie.id,
    auditoriumId: rooms[0].id,
    startsAtLocal: `${day}T10:00`,
    basePrice: 90000,
    vipSurcharge: 20000,
  };
  let show = await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, status: "ON_SALE" },
      admin,
    ),
    201,
    "Create draft showtime",
  );
  check(show.status === "DRAFT", "Client cannot bypass draft step");
  check(
    (await db.showtime.findUniqueOrThrow({ where: { id: show.id } }))
      .durationSnapshot === 120,
    "Duration snapshot saved",
  );
  const detailPath = `/vi/movies/${prefix}?date=${day}&cinema=${cinema.code}`;
  check(
    !(await (await request(detailPath)).text()).includes("QA Room A"),
    "Draft session hidden publicly",
  );
  for (const changes of [
    { durationMinutes: 121 },
    { ageRatingCode: "T18" },
    { status: "ARCHIVED" },
    { status: "DRAFT" },
  ])
    await expect(
      await request(
        `/api/admin/movies/${movie.id}`,
        "PATCH",
        { ...movie, ...changes },
        admin,
      ),
      409,
      "Scheduled movie protected",
    );
  await expect(
    await request("/api/admin/showtimes", "POST", slot, admin),
    409,
    "Exact overlap rejected",
  );
  await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, startsAtLocal: `${day}T12:10` },
      admin,
    ),
    409,
    "Cleaning overlap rejected",
  );
  await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, startsAtLocal: `${day}T12:20` },
      admin,
    ),
    201,
    "Exact cleaning boundary permitted",
  );
  await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, auditoriumId: rooms[1].id },
      admin,
    ),
    201,
    "Parallel other room permitted",
  );
  for (const changes of [
    { startsAtLocal: `${day}T08:59` },
    { startsAtLocal: `${day}T22:00` },
    { startsAtLocal: "2020-01-01T10:00" },
    { startsAtLocal: "2027-02-31T10:00" },
    { basePrice: -1 },
  ])
    await expect(
      await request(
        "/api/admin/showtimes",
        "POST",
        { ...slot, ...changes },
        admin,
      ),
      400,
      "Invalid schedule rejected",
    );
  await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, auditoriumId: rooms[2].id },
      admin,
    ),
    409,
    "Room without seats denied",
  );
  await db.auditorium.update({
    where: { id: rooms[2].id },
    data: { active: false },
  });
  await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, auditoriumId: rooms[2].id },
      admin,
    ),
    409,
    "Inactive room denied",
  );
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      request(
        "/api/admin/showtimes",
        "POST",
        { ...slot, startsAtLocal: `${day}T16:00` },
        admin,
      ),
    ),
  );
  check(
    concurrent
      .map((r) => r.status)
      .sort()
      .join(",") === "201,409",
    "Concurrent requests cannot double-book room",
  );
  show = await expect(
    await request(
      `/api/admin/showtimes/${show.id}`,
      "PATCH",
      { action: "publish", version: show.version },
      admin,
    ),
    200,
    "Publish session",
  );
  check(
    show.status === "ON_SALE" && show.version === 1,
    "Publish advances version",
  );
  check(
    (await (await request(detailPath)).text()).includes("QA Room A"),
    "Published coming-soon session visible publicly",
  );
  await expect(
    await request(
      `/api/admin/showtimes/${show.id}`,
      "PATCH",
      { action: "publish", version: 0 },
      admin,
    ),
    409,
    "Stale schedule rejected",
  );
  show = await expect(
    await request(
      `/api/admin/showtimes/${show.id}`,
      "PATCH",
      { ...slot, startsAtLocal: `${day}T09:30`, version: show.version },
      admin,
    ),
    200,
    "Edit session",
  );
  const beforeAudit = await db.auditLog.count({
    where: { actorUserId: users[0] },
  });
  await expect(
    await request(
      `/api/admin/showtimes/${show.id}`,
      "PATCH",
      { action: "cancel", version: show.version, reason: "" },
      admin,
    ),
    400,
    "Cancellation reason required",
  );
  check(
    (await db.auditLog.count({ where: { actorUserId: users[0] } })) ===
      beforeAudit,
    "Failed write produces no audit row",
  );
  show = await expect(
    await request(
      `/api/admin/showtimes/${show.id}`,
      "PATCH",
      { action: "cancel", version: show.version, reason: "Kiểm thử hủy suất" },
      admin,
    ),
    200,
    "Cancel session",
  );
  check(
    !(await (await request(detailPath)).text()).includes("QA Room A"),
    "Cancelled session hidden publicly",
  );
  await expect(
    await request(
      `/api/admin/showtimes/${show.id}`,
      "PATCH",
      { action: "publish", version: show.version },
      admin,
    ),
    409,
    "Cannot reopen cancelled session",
  );
  await expect(
    await request("/api/admin/showtimes", "POST", slot, admin),
    201,
    "Cancelled slot becomes available",
  );
  const audit = await db.auditLog.findFirstOrThrow({
    where: { entityId: show.id, action: "SHOWTIME_CANCELLED" },
  });
  check(
    audit.reason === "Kiểm thử hủy suất" &&
      audit.beforeData !== null &&
      audit.afterData !== null,
    "Audit contains before/after and reason",
  );
  const listed = await expect(
    await request(
      `/api/admin/showtimes?date=${day}&cinema=${cinema.code}&page=1.5`,
      "GET",
      undefined,
      admin,
    ),
    200,
    "Filter schedule",
  );
  check(
    listed.total === 5 && listed.page === 1,
    "Schedule filter and pagination",
  );
  await expect(
    await request(
      "/api/admin/showtimes?date=2026-02-31",
      "GET",
      undefined,
      admin,
    ),
    200,
    "Malformed date query safely falls back",
  );
  const archiveInput = {
    ...input,
    slug: `${prefix}-archive`,
    status: "NOW_SHOWING",
  };
  let archiveMovie = await expect(
    await request("/api/admin/movies", "POST", archiveInput, admin),
    201,
    "Create unscheduled movie",
  );
  movies.push(archiveMovie.id);
  archiveMovie = await expect(
    await request(
      `/api/admin/movies/${archiveMovie.id}`,
      "PATCH",
      { ...archiveMovie, status: "ARCHIVED" },
      admin,
    ),
    200,
    "Archive unscheduled movie",
  );
  check(
    (await db.movie.count({ where: { id: archiveMovie.id } })) === 1 &&
      (await request(`/vi/movies/${archiveInput.slug}`)).status === 404,
    "Archive preserves row and hides movie",
  );
  await expect(
    await request(
      "/api/admin/showtimes",
      "POST",
      { ...slot, movieId: archiveMovie.id },
      admin,
    ),
    409,
    "Archived movie cannot be scheduled",
  );
  const filtered = await expect(
    await request(
      `/api/admin/movies?q=${prefix}&status=ARCHIVED`,
      "GET",
      undefined,
      admin,
    ),
    200,
    "Search archived movie",
  );
  check(
    filtered.total === 1 && filtered.items[0].id === archiveMovie.id,
    "Movie search/status filter",
  );
  for (const path of ["movies", "showtimes", "audit"]) {
    check(
      (await request(`/vi/admin/${path}`, "GET", undefined, admin)).status ===
        200,
      `Admin ${path} page renders`,
    );
    check(
      (await request(`/en/admin/${path}`, "GET", undefined, admin)).status ===
        200,
      `English ${path} page renders`,
    );
  }
  console.log(
    `Admin integration passed: ${checks} checks. All isolated QA records are cleaned up.`,
  );
}
main().finally(async () => {
  await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
  if (cinemaId) {
    const rooms = await db.auditorium.findMany({
      where: { cinemaId },
      select: { id: true },
    });
    const ids = rooms.map((r) => r.id);
    await db.showtimeSeat.deleteMany({where:{showtime:{auditoriumId:{in:ids}}}});
    await db.showtime.deleteMany({ where: { auditoriumId: { in: ids } } });
    await db.seat.deleteMany({ where: { auditoriumId: { in: ids } } });
    await db.auditorium.deleteMany({ where: { cinemaId } });
  }
  await db.movieGenre.deleteMany({ where: { movieId: { in: movies } } });
  await db.movieTranslation.deleteMany({ where: { movieId: { in: movies } } });
  await db.movie.deleteMany({ where: { id: { in: movies } } });
  await db.authSession.deleteMany({ where: { userId: { in: users } } });
  await db.staffAssignment.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  if (cinemaId) await db.cinema.delete({ where: { id: cinemaId } });
  await db.$disconnect();
});
