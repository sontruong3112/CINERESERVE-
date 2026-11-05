import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OperationsOrders } from "../src/lib/operations/orders-shared";

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
  prefix = randomBytes(3).toString("hex").toUpperCase();
const users: string[] = [],
  cinemas: string[] = [],
  shows: string[] = [],
  holds: string[] = [],
  bookings: { id: string; code: string; branch: number; status: string }[] = [];
let movieId: string | undefined,
  checks = 0;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function request(query: Record<string, string>, cookie = "") {
  return fetch(base + "/api/operations/orders?" + new URLSearchParams(query), {
    headers: cookie ? { Cookie: cookie } : {},
  });
}
async function result(query: Record<string, string>, cookie: string) {
  const response = await request(query, cookie);
  check(
    response.status === 200,
    `Response 200 for ${JSON.stringify(query)}; got ${response.status}`,
  );
  check(
    response.headers.get("cache-control")?.includes("no-store"),
    "No shared caching",
  );
  return (await response.json()) as OperationsOrders;
}
async function status(
  query: Record<string, string>,
  cookie: string,
  expected: number,
) {
  const response = await request(query, cookie);
  check(
    response.status === expected,
    `Expected ${expected}, got ${response.status}`,
  );
  return response.json();
}
async function main() {
  const cookies: string[] = [];
  for (const name of ["A", "B"]) {
    const branch = await db.cinema.create({
      data: {
        code: `qa-ops-${prefix}-${name}`,
        name: `QA Ops ${name}`,
        addressVi: "QA",
        addressEn: "QA",
        areaVi: "QA",
        areaEn: "QA",
        auditoriums: {
          create: {
            code: "QA",
            name: "QA Room",
            seats: {
              create: Array.from({ length: 24 }, (_, i) => ({
                rowLabel: "A",
                seatNumber: i + 1,
              })),
            },
          },
        },
      },
    });
    cinemas.push(branch.id);
  }
  for (const [role, branch] of [
    ["ADMIN", null],
    ["STAFF", 0],
    ["STAFF", 1],
    ["CUSTOMER", null],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: "QA Ops Customer",
        emailNormalized: `qa-ops-${prefix.toLowerCase()}-${users.length}@example.test`,
        phone: "0912345678",
        passwordHash: "unused-qa-login",
        role,
        ...(branch !== null
          ? { staffAssignment: { create: { cinemaId: cinemas[branch] } } }
          : {}),
      },
    });
    users.push(user.id);
    const token = randomBytes(32).toString("hex");
    await db.authSession.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        authVersion: 0,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    cookies.push(`cr_session=${token}`);
  }
  const movie = await db.movie.create({
    data: {
      slug: `qa-ops-${prefix}`,
      originalTitle: "QA Operations",
      durationMinutes: 60,
      ageRatingCode: "P",
      year: 2026,
      director: "QA",
      posterUrl: "/brand/cinereserve-mark.svg",
      backdropUrl: "/brand/cinereserve-mark.svg",
      accent: "#edc076",
      status: "NOW_SHOWING",
    },
  });
  movieId = movie.id;
  for (const cinemaId of cinemas) {
    const room = await db.auditorium.findFirstOrThrow({
      where: { cinemaId },
      include: { seats: { orderBy: { seatNumber: "asc" } } },
    });
    const startsAt = new Date("2028-06-01T03:00:00Z");
    const show = await db.showtime.create({
      data: {
        movieId,
        auditoriumId: room.id,
        startsAt,
        endsAt: new Date(+startsAt + 3600000),
        cleanupEndsAt: new Date(+startsAt + 4800000),
        salesCutoffAt: new Date(+startsAt - 600000),
        basePrice: 90000,
        vipSurcharge: 20000,
        durationSnapshot: 60,
        ageRatingSnapshot: "P",
        status: "ON_SALE",
        seats: {
          create: room.seats.map((s) => ({
            seatId: s.id,
            rowLabel: s.rowLabel,
            seatNumber: s.seatNumber,
            type: s.type,
            isSellable: true,
          })),
        },
      },
    });
    shows.push(show.id);
  }
  for (let i = 0; i < 24; i++) {
    const branch = i === 1 ? 1 : 0;
    const seat = await db.showtimeSeat.findFirstOrThrow({
      where: { showtimeId: shows[branch], seatNumber: i + 1 },
    });
    const createdAt =
      i === 0
        ? new Date("2026-01-01T00:00:00+07:00")
        : i === 1
          ? new Date("2026-01-01T23:59:59.999+07:00")
          : i === 2
            ? new Date("2026-01-02T00:00:00+07:00")
            : new Date("2026-01-02T12:00:00+07:00");
    const state =
      i === 2 ? "CANCELLED" : i === 3 || i === 4 ? "PENDING" : "PAID";
    const startedAt = i === 4 ? new Date() : createdAt;
    const hold = await db.holdSession.create({
      data: {
        userId: users[3],
        showtimeId: shows[branch],
        status:
          i === 4 ? "ACTIVE" : state === "PENDING" ? "EXPIRED" : "CONVERTED",
        startedAt,
        expiresAt: new Date(+startedAt + 300000),
        quotedBasePrice: 90000,
        quotedVipSurcharge: 20000,
      },
    });
    holds.push(hold.id);
    const b = await db.booking.create({
      data: {
        code: `CR-${prefix}${i.toString(16).padStart(6, "0").toUpperCase()}`,
        userId: users[3],
        showtimeId: shows[branch],
        movieId,
        cinemaId: cinemas[branch],
        holdId: hold.id,
        holdVersion: 0,
        status: state,
        movieTitle: "Phim QA vận hành",
        movieTitleEn: "QA Operations Movie",
        ageRatingCode: 'P',
        cinemaName: `QA Ops ${branch ? "B" : "A"}`,
        roomName: "QA Room",
        startsAt: new Date("2028-06-01T03:00:00Z"),
        expiresAt: hold.expiresAt,
        total: BigInt(90000),
        createdAt,
        paidAt: state === "PAID" || state === "CANCELLED" ? createdAt : null,
        ...(state === "CANCELLED"
          ? { cancelledAt: createdAt, cancellationReason: "QA_CANCEL" }
          : {}),
        items: {
          create: {
            showtimeSeatId: seat.id,
            label: `A${i + 1}`,
            type: "STANDARD",
            price: 90000,
          },
        },
      },
      include: { items: true },
    });
    bookings.push({ id: b.id, code: b.code, branch, status: state });
    if (state !== "PENDING") {
      await db.paymentAttempt.create({
        data: {
          bookingId: b.id,
          idempotencyKey: randomUUID(),
          outcome: "SUCCESS",
          amount: BigInt(90000),
          bookingVersion: 0,
          createdAt,
        },
      });
      await db.showtimeSeat.update({
        where: { id: seat.id },
        data: { soldBookingItemId: b.items[0].id },
      });
      await db.ticket.create({
        data: {
          bookingItemId: b.items[0].id,
          code: "TK-" + randomBytes(12).toString("hex").toUpperCase(),
          status: state === "CANCELLED" ? "CANCELLED" : "VALID",
        },
      });
    }
    if (state === "CANCELLED")
      await db.refund.create({
        data: {
          bookingId: b.id,
          amount: BigInt(90000),
          reason: "QA_CANCEL",
          completedAt: createdAt,
        },
      });
  }
  const all = await result({ q: prefix }, cookies[0]);
  check(
    all.role === "ADMIN" &&
      all.total === 24 &&
      all.rows.length === 20 &&
      all.pages === 2,
    "Admin pagination across branches",
  );
  check(
    (await result({ q: prefix, page: "2" }, cookies[0])).rows.length === 4,
    "Second page",
  );
  check(
    (await result({ q: prefix, cinema: cinemas[1] }, cookies[0])).total === 1,
    "Admin branch filter",
  );
  const row = (await result({ q: bookings[0].code }, cookies[0])).rows[0];
  check(
    row.customer.email.includes("***") && row.customer.phone === "***5678",
    "Contact data masked",
  );
  const serialized = JSON.stringify(row);
  check(
    !serialized.includes("passwordHash") &&
      !serialized.includes("0912345678") &&
      !serialized.includes(`qa-ops-${prefix.toLowerCase()}-3@example.test`) &&
      !serialized.includes("TK-") &&
      !serialized.includes("idempotencyKey") &&
      !serialized.includes("cr_session"),
    "No credentials, full contacts, ticket codes or transaction keys",
  );
  check(
    row.total === "90000" &&
      row.items[0].price === 90000 &&
      row.items[0].ticketStatus === "VALID",
    "Money and ticket state",
  );
  check(
    row.attempts.length === 1 && row.attempts[0].outcome === "SUCCESS",
    "Payment history",
  );
  const refund = (await result({ q: bookings[2].code }, cookies[0])).rows[0];
  check(
    refund.status === "CANCELLED" &&
      refund.refund?.amount === "90000" &&
      refund.items[0].ticketStatus === "CANCELLED",
    "Cancellation/refund detail",
  );
  const expired = await result(
    { q: bookings[3].code, status: "EXPIRED" },
    cookies[0],
  );
  check(
    expired.total === 1 && expired.rows[0].status === "EXPIRED",
    "Display expired pending order",
  );
  check(
    (await db.booking.findUniqueOrThrow({ where: { id: bookings[3].id } }))
      .status === "PENDING",
    "Read-only lookup does not mutate booking",
  );
  check(
    (await result({ q: bookings[3].code, status: "PENDING" }, cookies[0]))
      .total === 0,
    "Expired excluded from Pending filter",
  );
  check(
    (await result({ q: bookings[4].code, status: "PENDING" }, cookies[0]))
      .total === 1,
    "Live Pending filter",
  );
  const range = await result(
    { q: prefix, from: "2026-01-01", to: "2026-01-01" },
    cookies[0],
  );
  check(
    range.total === 2 &&
      range.rows.some((r) => r.id === bookings[0].id) &&
      range.rows.some((r) => r.id === bookings[1].id),
    "Vietnam date inclusive endpoints",
  );
  check(
    (
      await result(
        { q: prefix, from: "2026-01-02", to: "2026-01-02" },
        cookies[0],
      )
    ).total === 22,
    "Next midnight belongs to next day",
  );
  const initial = await result({}, cookies[1]);
  check(
    initial.needsCode &&
      !initial.total &&
      !initial.rows.length &&
      initial.cinemas.length === 1,
    "Staff cannot browse customer list",
  );
  const own = await result({ q: bookings[0].code.toLowerCase() }, cookies[1]);
  check(
    own.rows.length === 1 &&
      own.rows[0].id === bookings[0].id &&
      own.scope === "QA Ops A",
    "Staff exact code case-insensitive normalization",
  );
  check(
    (await result({ q: bookings[1].code }, cookies[1])).total === 0,
    "Wrong branch indistinguishable from missing",
  );
  check(
    (await result({ q: "CR-" + "0".repeat(12) }, cookies[1])).total === 0,
    "Missing order empty",
  );
  await status({ q: prefix }, cookies[1], 400);
  await status({ q: bookings[0].code, cinema: cinemas[1] }, cookies[1], 403);
  await status({ q: bookings[0].code }, cookies[3], 403);
  await status({}, "", 401);
  const invalidQueries: Record<string, string>[] = [
    { q: "<script>" },
    { status: "BROKEN" },
    { cinema: "bad" },
    { from: "2026-01-01" },
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-02-01", to: "2026-01-01" },
    { from: "2025-01-01", to: "2026-01-02" },
    { page: "-1" },
    { page: "1.5" },
  ];
  for (const query of invalidQueries) await status(query, cookies[0], 400);
  await db.user.update({
    where: { id: users[1] },
    data: { mustChangePassword: true },
  });
  await status({ q: bookings[0].code }, cookies[1], 428);
  await db.user.update({
    where: { id: users[1] },
    data: { mustChangePassword: false, status: "LOCKED" },
  });
  await status({ q: bookings[0].code }, cookies[1], 401);
  await db.user.update({ where: { id: users[1] }, data: { status: "ACTIVE" } });
  await db.staffAssignment.update({
    where: { userId: users[1] },
    data: { cinemaId: cinemas[1] },
  });
  check(
    (await result({ q: bookings[0].code }, cookies[1])).total === 0,
    "Reassigned staff loses old branch",
  );
  check(
    (await result({ q: bookings[1].code }, cookies[1])).total === 1,
    "Reassigned staff gains current branch",
  );
  await db.cinema.update({
    where: { id: cinemas[1] },
    data: { active: false },
  });
  await status({ q: bookings[1].code }, cookies[1], 403);
  check(
    (await result({ q: bookings[1].code }, cookies[0])).total === 1,
    "Admin retains inactive branch history",
  );
  await db.cinema.update({ where: { id: cinemas[1] }, data: { active: true } });
  await db.authSession.updateMany({
    where: { userId: users[1] },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  await status({ q: bookings[1].code }, cookies[1], 401);
  for (const locale of ["vi", "en"]) {
    const response = await fetch(`${base}/${locale}/admin/orders?q=${prefix}`, {
      headers: { Cookie: cookies[0] },
    });
    const html = await response.text();
    check(
      response.ok &&
        html.includes(locale === "vi" ? "Tra cứu đơn hàng" : "Order lookup"),
      `Admin page ${locale}`,
    );
    check(
      !html.includes("TK-") && !html.includes("0912345678"),
      `No ticket code/phone in HTML ${locale}`,
    );
    const staffPage = await fetch(`${base}/${locale}/staff/orders`, {
      headers: { Cookie: cookies[2] },
    });
    check(
      staffPage.ok &&
        (await staffPage.text()).includes(
          locale === "vi"
            ? "Nhập đầy đủ mã đơn"
            : "Enter a complete order code",
        ),
      `Staff initial page ${locale}`,
    );
  }
  const guest = await fetch(base + "/vi/admin/orders", { redirect: "manual" });
  check(
    guest.status === 307 && guest.headers.get("location")?.includes("/login"),
    "Page guarded for guest",
  );
  const customer = await fetch(base + "/vi/staff/orders", {
    headers: { Cookie: cookies[3] },
    redirect: "manual",
  });
  check(
    customer.status === 307 &&
      customer.headers.get("location")?.includes("/forbidden"),
    "Page guarded for customer",
  );
  console.log(
    `Operations order lookup passed: ${checks} checks. Isolated QA records are cleaned up; no real orders changed.`,
  );
}
main().finally(async () => {
  const ids = bookings.map((b) => b.id);
  await db.showtimeSeat.updateMany({
    where: { showtimeId: { in: shows } },
    data: { soldBookingItemId: null, holdSessionId: null },
  });
  await db.ticket.deleteMany({ where: { item: { bookingId: { in: ids } } } });
  await db.refund.deleteMany({ where: { bookingId: { in: ids } } });
  await db.paymentAttempt.deleteMany({ where: { bookingId: { in: ids } } });
  await db.bookingItem.deleteMany({ where: { bookingId: { in: ids } } });
  await db.booking.deleteMany({ where: { id: { in: ids } } });
  await db.holdSession.deleteMany({ where: { id: { in: holds } } });
  await db.showtimeSeat.deleteMany({ where: { showtimeId: { in: shows } } });
  await db.showtime.deleteMany({ where: { id: { in: shows } } });
  const rooms = await db.auditorium.findMany({
    where: { cinemaId: { in: cinemas } },
    select: { id: true },
  });
  await db.seat.deleteMany({
    where: { auditoriumId: { in: rooms.map((r) => r.id) } },
  });
  await db.auditorium.deleteMany({ where: { cinemaId: { in: cinemas } } });
  await db.authSession.deleteMany({ where: { userId: { in: users } } });
  await db.staffAssignment.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.cinema.deleteMany({ where: { id: { in: cinemas } } });
  if (movieId) await db.movie.delete({ where: { id: movieId } });
  await db.$disconnect();
});
