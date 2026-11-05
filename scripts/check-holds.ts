import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { localAdminEnabled } from "../src/lib/auth/local-admin";
import type { SeatMap } from "../src/lib/booking/shared";
const url = new URL(process.env.DATABASE_URL ?? "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/cinereserve"
)
  throw new Error("Project local test database only.");
const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }),
  base = "http://localhost:3001",
  prefix = `qa-hold-${randomBytes(6).toString("hex")}`,
  password = randomBytes(20).toString("base64url");
const users: string[] = [],
  shows: string[] = [];
let cinemaId: string | undefined,
  movieId: string | undefined,
  checks = 0;
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
  return fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
  });
}
async function expect(response: Response, status: number, label: string) {
  const data = await response.json();
  check(
    response.status === status,
    `${label}: expected ${status}, got ${response.status} ${JSON.stringify(data)}`,
  );
  return data;
}
const endpoint = (id: string) => `/api/showtimes/${id}/seats`;
const update = (
  id: string,
  cookie: string,
  seatIds: string[],
  hold: SeatMap["hold"] = null,
) =>
  req(
    endpoint(id),
    "PUT",
    {
      seatIds,
      holdId: hold?.id ?? null,
      version: hold?.version ?? null,
      basePrice: 1,
      total: 1,
    },
    cookie,
  );
const release = (id: string, cookie: string, hold: SeatMap["hold"]) =>
  req(
    endpoint(id),
    "DELETE",
    { holdId: hold?.id, version: hold?.version },
    cookie,
  );
async function main() {
  const cinema = await db.cinema.create({
    data: {
      code: prefix,
      name: "QA Holds Cinema",
      addressVi: "QA",
      addressEn: "QA",
      areaVi: "QA",
      areaEn: "QA",
    },
  });
  cinemaId = cinema.id;
  const room = await db.auditorium.create({
    data: {
      cinemaId: cinema.id,
      code: "QA",
      name: "QA Holds Room",
      seats: {
        create: Array.from({ length: 10 }, (_, i) => ({
          rowLabel: "A",
          seatNumber: i + 1,
          type: i === 1 ? "VIP" : "STANDARD",
          isSellable: i !== 9,
        })),
      },
    },
  });
  const movie = await db.movie.create({
    data: {
      slug: prefix,
      originalTitle: "QA Hold Movie",
      durationMinutes: 60,
      ageRatingCode: "P",
      year: 2026,
      director: "QA",
      posterUrl: "/brand/cinereserve-mark.svg",
      backdropUrl: "/brand/cinereserve-mark.svg",
      accent: "#edc076",
      status: "NOW_SHOWING",
      translations: {
        create: [
          {
            locale: "vi",
            title: "Phim thử giữ ghế",
            synopsis: "Nội dung kiểm thử độc lập.",
          },
          {
            locale: "en",
            title: "Seat hold QA movie",
            synopsis: "Independent integration fixture.",
          },
        ],
      },
      genres: { create: { genre: { connect: { code: "drama" } } } },
    },
  });
  movieId = movie.id;
  const physical = await db.seat.findMany({
    where: { auditoriumId: room.id },
    orderBy: { seatNumber: "asc" },
  });
  const day = new Date(Date.now() + 86400000 + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  for (const start of [
    new Date(`${day}T10:00:00+07:00`),
    new Date(`${day}T14:00:00+07:00`),
    new Date(Date.now() + 12 * 60000),
  ]) {
    const show = await db.showtime.create({
      data: {
        movieId: movie.id,
        auditoriumId: room.id,
        startsAt: start,
        endsAt: new Date(start.getTime() + 3600000),
        cleanupEndsAt: new Date(start.getTime() + 4800000),
        salesCutoffAt: new Date(start.getTime() - 600000),
        basePrice: 90000,
        vipSurcharge: 20000,
        durationSnapshot: 60,
        ageRatingSnapshot: "P",
        status: "ON_SALE",
        seats: {
          create: physical.map((s) => ({
            seatId: s.id,
            rowLabel: s.rowLabel,
            seatNumber: s.seatNumber,
            type: s.type,
            isSellable: s.isSellable,
          })),
        },
      },
    });
    shows.push(show.id);
  }
  const hash = await hashPassword(password),
    cookies: string[] = [];
  for (const role of ["CUSTOMER", "CUSTOMER", "ADMIN", "CUSTOMER"] as const) {
    const email = `${prefix}-${users.length}@example.test`;
    const user = await db.user.create({
      data: {
        name: "QA Hold Test",
        emailNormalized: email,
        passwordHash: hash,
        role,
      },
    });
    users.push(user.id);
    const response = await req("/api/auth/login", "POST", { email, password });
    await expect(response, 200, "Login QA");
    cookies.push((response.headers.get("set-cookie") ?? "").split(";")[0]);
  }
  const [a, b, admin, maintenance] = cookies,
    [show, other, near] = shows;
  await expect(await req(endpoint(show)), 401, "Anonymous seat map denied");
  await expect(await update(show, "", []), 401, "Anonymous hold denied");
  check(
    [307, 303].includes((await req(`/vi/showtimes/${show}/seats`)).status),
    "Seat page requires login",
  );
  const first: SeatMap = await expect(
    await req(endpoint(show), "GET", undefined, a),
    200,
    "Seat map",
  );
  check(
    first.seats.length === 10 && first.seats[9].status === "BLOCKED",
    "Snapshot includes blocked seat",
  );
  const ids = first.seats.map((s) => s.id);
  await expect(
    await req(
      endpoint(show),
      "PUT",
      { seatIds: [ids[0]] },
      a,
      "https://other.example",
    ),
    403,
    "Cross origin denied",
  );
  for (const list of [
    [],
    [ids[0], ids[0]],
    ids.slice(0, 9),
    [ids[9]],
    [physical[0].id],
  ])
    await expect(await update(show, a, list), 400, "Invalid selection denied");
  const race = await Promise.all([
    update(show, a, [ids[0], ids[1]]),
    update(show, b, [ids[0], ids[1]]),
  ]);
  check(
    race
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "Concurrent same seats: one winner",
  );
  const winner = race[0].status === 200 ? a : b,
    loser = winner === a ? b : a;
  let state: SeatMap = await (
    race[0].status === 200 ? race[0] : race[1]
  ).json();
  const deadline = state.hold!.expiresAt;
  check(
    state.hold!.total === 200000,
    "Server ignores forged prices; VIP surcharge correct",
  );
  check(
    Date.parse(deadline) - Date.parse(state.serverNow) <= 300000 &&
      Date.parse(deadline) - Date.parse(state.serverNow) > 290000,
    "Five minute server deadline",
  );
  let loserState: SeatMap = await expect(
    await req(endpoint(show), "GET", undefined, loser),
    200,
    "Other customer's view",
  );
  check(
    loserState.hold === null && loserState.seats[0].status === "HELD",
    "Other customer sees held status without owner",
  );
  check(
    !JSON.stringify(loserState).includes(users[0]) &&
      !JSON.stringify(loserState).includes(state.hold!.id),
    "No other owner's identifiers leaked",
  );
  const reloaded: SeatMap = await expect(
    await req(endpoint(show), "GET", undefined, winner),
    200,
    "Reload existing hold",
  );
  check(
    reloaded.hold!.id === state.hold!.id &&
      reloaded.hold!.expiresAt === deadline,
    "Reload does not renew",
  );
  const otherMap: SeatMap = await expect(
    await req(endpoint(other), "GET", undefined, winner),
    200,
    "Open other session",
  );
  await expect(
    await update(other, winner, [otherMap.seats[0].id]),
    409,
    "One active hold per user across sessions",
  );
  const old = state.hold;
  state = await expect(
    await update(show, winner, [ids[0], ids[2]], state.hold),
    200,
    "Change selected seats atomically",
  );
  check(
    state.hold!.expiresAt === deadline &&
      state.hold!.version === old!.version + 1,
    "Change does not renew and advances version",
  );
  await expect(
    await update(show, winner, [ids[3]], old),
    409,
    "Stale tab cannot overwrite",
  );
  loserState = await expect(
    await update(show, loser, [ids[1]]),
    200,
    "Released VIP seat acquired by other user",
  );
  await expect(
    await update(show, winner, [ids[0], ids[1]], state.hold),
    409,
    "Failed swap rejected",
  );
  const unchanged: SeatMap = await expect(
    await req(endpoint(show), "GET", undefined, winner),
    200,
    "Read after failed swap",
  );
  check(
    unchanged.hold!.version === state.hold!.version &&
      unchanged.hold!.seatIds.includes(ids[2]),
    "Failed swap preserves previous seats/version",
  );
  const blockEdit = await expect(
    await req(
      `/api/admin/showtimes/${show}`,
      "PATCH",
      {
        version: 0,
        movieId: movie.id,
        auditoriumId: room.id,
        startsAtLocal: `${day}T10:00`,
        basePrice: 95000,
        vipSurcharge: 20000,
      },
      admin,
    ),
    409,
    "Admin edit blocked by active holds",
  );
  check(blockEdit.error === "SHOWTIME_HAS_HOLDS", "Specific admin guard");
  state = await expect(
    await update(show, winner, [], state.hold),
    200,
    "Remove all selected seats",
  );
  check(
    state.hold!.seatIds.length === 0 && state.hold!.expiresAt === deadline,
    "Empty hold keeps original timer",
  );
  state = await expect(
    await update(show, winner, [ids[3]], state.hold),
    200,
    "Choose seats again within same hold",
  );
  const expiredId = state.hold!.id;
  await db.holdSession.update({
    where: { id: expiredId },
    data: {
      startedAt: new Date(Date.now() - 301000),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const afterExpiry: SeatMap = await expect(
    await req(endpoint(show), "GET", undefined, loser),
    200,
    "Expiry on next read",
  );
  check(
    afterExpiry.seats[3].status === "AVAILABLE" &&
      (await db.holdSession.findUniqueOrThrow({ where: { id: expiredId } }))
        .status === "EXPIRED",
    "Expired seat released without cron",
  );
  await expect(
    await update(show, winner, [ids[4]], state.hold),
    409,
    "Expired hold cannot be extended",
  );
  state = await expect(
    await update(show, winner, [ids[3]]),
    200,
    "Explicit new hold after expiry",
  );
  await expect(
    await release(show, winner, { ...state.hold!, id: expiredId }),
    409,
    "Old request cannot release new hold",
  );
  check(
    (await req(`/vi/showtimes/${show}/seats`, "GET", undefined, winner))
      .status === 200 &&
      (await req(`/en/showtimes/${show}/seats`, "GET", undefined, winner))
        .status === 200,
    "VI/EN pages render",
  );
  await expect(
    await req("/api/auth/logout", "POST", {}, winner),
    200,
    "Logout",
  );
  check(
    (await db.showtimeSeat.findUniqueOrThrow({ where: { id: ids[3] } }))
      .holdSessionId === null,
    "Logout releases holds",
  );
  await expect(
    await req(endpoint(show), "GET", undefined, winner),
    401,
    "Logged out session invalid",
  );
  loserState = await expect(
    await req(endpoint(show), "GET", undefined, loser),
    200,
    "Loser refresh",
  );
  await expect(
    await release(show, loser, loserState.hold),
    200,
    "Explicit release",
  );
  let nearState: SeatMap = await expect(
    await req(endpoint(near), "GET", undefined, loser),
    200,
    "Near cutoff map",
  );
  check(
    nearState.showtime.open,
    `Near cutoff must be open: ${nearState.serverNow} cutoff=${nearState.showtime.cutoffAt}`,
  );
  nearState = await expect(
    await update(near, loser, [nearState.seats[0].id]),
    200,
    "Hold near cutoff",
  );
  check(
    nearState.hold!.expiresAt === nearState.showtime.cutoffAt,
    "Deadline shortened to sales cutoff",
  );
  const nearUser = await db.authSession.findFirstOrThrow({
    where: { userId: { in: users }, tokenHash: { not: "" } },
    include: { user: true },
  });
  void nearUser;
  const owner = await db.holdSession.findUniqueOrThrow({
    where: { id: nearState.hold!.id },
  });
  await db.user.update({
    where: { id: owner.userId },
    data: { status: "LOCKED" },
  });
  await expect(
    await req(endpoint(near), "GET", undefined, loser),
    401,
    "Locked user cannot use hold API",
  );
  await expect(
    await req(endpoint(show), "GET", undefined, maintenance),
    200,
    "Maintenance by another customer",
  );
  check(
    (
      await db.showtimeSeat.findUniqueOrThrow({
        where: { id: nearState.seats[0].id },
      })
    ).holdSessionId === null,
    "Locked user's hold released",
  );
  await db.user.update({
    where: { id: owner.userId },
    data: { status: "ACTIVE" },
  });
  let cancelState: SeatMap = await expect(
    await update(show, loser, [ids[4]]),
    200,
    "Hold before admin cancellation",
  );
  await expect(
    await req(
      `/api/admin/showtimes/${show}`,
      "PATCH",
      {
        action: "cancel",
        version: 0,
        reason: "QA cancellation with active holds",
      },
      admin,
    ),
    200,
    "Admin cancellation releases holds atomically",
  );
  check(
    (
      await db.holdSession.findUniqueOrThrow({
        where: { id: cancelState.hold!.id },
      })
    ).status === "CANCELLED",
    "Hold cancelled with session",
  );
  await expect(
    await update(show, loser, [ids[5]]),
    409,
    "Cancelled session rejects holds",
  );
  cancelState = await expect(
    await req(endpoint(show), "GET", undefined, loser),
    200,
    "Cancelled session map",
  );
  check(
    !cancelState.showtime.open && cancelState.hold === null,
    "Cancelled state reaches UI",
  );
  // Per-user creation limit: real rows from this test, no wall-clock waiting required.
  for (let i = 0; i < 3; i++)
    await db.holdSession.create({
      data: {
        userId: owner.userId,
        showtimeId: other,
        status: "CANCELLED",
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        quotedBasePrice: 90000,
        quotedVipSurcharge: 20000,
      },
    });
  const rateMap: SeatMap = await expect(
    await req(endpoint(other), "GET", undefined, loser),
    200,
    "Rate test map",
  );
  await expect(
    await update(other, loser, [rateMap.seats[0].id]),
    429,
    "Limit repeated new hold creation",
  );
  if (localAdminEnabled()) {
    const response = await req("/api/auth/login", "POST", {
      email: "admin",
      password: "admin",
    });
    const data = await expect(response, 200, "Requested local admin login");
    check(data.user.role === "ADMIN", "Local admin role");
    await req(
      "/api/auth/logout",
      "POST",
      {},
      (response.headers.get("set-cookie") ?? "").split(";")[0],
    );
  }
  console.log(
    `Seat hold integration passed: ${checks} checks. Isolated QA data is cleaned up.`,
  );
}
main().finally(async () => {
  await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
  await db.showtimeSeat.deleteMany({ where: { showtimeId: { in: shows } } });
  await db.holdSession.deleteMany({ where: { showtimeId: { in: shows } } });
  await db.showtime.deleteMany({ where: { id: { in: shows } } });
  if (cinemaId) {
    const rooms = await db.auditorium.findMany({
      where: { cinemaId },
      select: { id: true },
    });
    await db.seat.deleteMany({
      where: { auditoriumId: { in: rooms.map((r) => r.id) } },
    });
    await db.auditorium.deleteMany({ where: { cinemaId } });
    await db.cinema.delete({ where: { id: cinemaId } });
  }
  if (movieId) {
    await db.movieGenre.deleteMany({ where: { movieId } });
    await db.movieTranslation.deleteMany({ where: { movieId } });
    await db.movie.delete({ where: { id: movieId } });
  }
  await db.authSession.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
