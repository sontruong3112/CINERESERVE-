import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  CHECKOUT_CONFIRMATION_VERSION,
  ageExplanation,
} from "../src/lib/booking/checkout-policy";
import type { Order } from "../src/lib/booking/orders-shared";
import type { SeatMap } from "../src/lib/booking/shared";

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
  prefix = `qa-checkout-${randomBytes(5).toString("hex")}`,
  base = "http://localhost:3001";
const users: string[] = [],
  shows: string[] = [],
  movies: string[] = [],
  sessions: string[] = [],
  cookies: string[] = [];
let cinemaId: string | undefined,
  checks = 0,
  kept = false;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function req(path: string, method = "GET", body?: unknown, cookie = "") {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
  });
}
async function expect(
  response: Response,
  status: number,
  label: string,
  code?: string,
) {
  const body = await response.json();
  check(
    response.status === status,
    `${label}: ${response.status} ${JSON.stringify(body)}`,
  );
  if (code) check(body.error === code, `${label} code`);
  return body;
}
const confirmation = {
  ageConfirmed: true,
  policyConfirmed: true,
  confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
};
function pay(
  order: Order,
  cookie: string,
  extra: Record<string, unknown> = {},
  key = randomUUID(),
) {
  return req(
    `/api/orders/${order.id}/payments`,
    "POST",
    {
      idempotencyKey: key,
      outcome: "SUCCESS",
      version: order.version,
      ...extra,
    },
    cookie,
  );
}
async function newOrder(show: string, cookie: string, seatIndex = 0) {
  const map: SeatMap = await expect(
    await req(`/api/showtimes/${show}/seats`, "GET", undefined, cookie),
    200,
    "Customer map",
  );
  const held: SeatMap = await expect(
    await req(
      `/api/showtimes/${show}/seats`,
      "PUT",
      { seatIds: [map.seats[seatIndex].id], holdId: null, version: null },
      cookie,
    ),
    200,
    "Customer hold",
  );
  const { order } = await expect(
    await req(
      "/api/orders",
      "POST",
      {
        holdId: held.hold!.id,
        version: held.hold!.version,
        ageRatingCode: "P",
      },
      cookie,
    ),
    200,
    "Customer checkout",
  );
  return order as Order;
}
async function main() {
  if (process.argv.includes("--cleanup-ui")) {
    const fixture = JSON.parse(await readFile(".qa/checkout-ui.json", "utf8"));
    users.push(...fixture.users);
    shows.push(...fixture.shows);
    movies.push(...fixture.movies);
    cinemaId = fixture.cinemaId;
    return;
  }
  const branch = await db.cinema.create({
    data: {
      code: prefix,
      name: "QA · Rạp kiểm thử checkout",
      addressVi: "QA",
      addressEn: "QA",
      areaVi: "QA",
      areaEn: "QA",
      auditoriums: {
        create: {
          code: "QA",
          name: "QA Room",
          seats: {
            create: [1, 2, 3, 4].map((seatNumber) => ({
              rowLabel: "A",
              seatNumber,
            })),
          },
        },
      },
    },
    include: { auditoriums: { include: { seats: true } } },
  });
  cinemaId = branch.id;
  const room = branch.auditoriums[0],
    tomorrow = new Date(Date.now() + 86400000 + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
  for (const [index, rating] of ["T16", "K"].entries()) {
    const movie = await db.movie.create({
      data: {
        slug: `${prefix}-${rating.toLowerCase()}`,
        originalTitle: `QA ${rating}`,
        durationMinutes: 60,
        ageRatingCode: rating,
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
              title: `QA · Phim phân loại ${rating}`,
              synopsis: "Dữ liệu kiểm thử checkout, không phải phim thật.",
            },
            {
              locale: "en",
              title: `QA · ${rating} movie`,
              synopsis: "Isolated checkout fixture.",
            },
          ],
        },
      },
    });
    movies.push(movie.id);
    const startsAt = new Date(`${tomorrow}T${index ? "14" : "10"}:00:00+07:00`);
    const show = await db.showtime.create({
      data: {
        movieId: movie.id,
        auditoriumId: room.id,
        startsAt,
        endsAt: new Date(+startsAt + 3600000),
        cleanupEndsAt: new Date(+startsAt + 4800000),
        salesCutoffAt: new Date(+startsAt - 600000),
        basePrice: 90000,
        vipSurcharge: 20000,
        durationSnapshot: 60,
        ageRatingSnapshot: rating,
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
  const password = randomBytes(20).toString("base64url");
  for (const role of ["CUSTOMER", "CUSTOMER", "ADMIN", "STAFF"] as const) {
    const user = await db.user.create({
      data: {
        name: "QA Checkout",
        emailNormalized: `${prefix}-${users.length}@example.test`,
        passwordHash: await hashPassword(password),
        role,
        ...(role === "STAFF"
          ? { staffAssignment: { create: { cinemaId } } }
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
    cookies.push(`cr_session=${token}`);
  }
  const [a, b, admin, staff] = cookies;
  const order = await newOrder(shows[0], a);
  check(
    order.ageRatingCode === "T16",
    "Order age snapshot comes from show, not client",
  );
  for (const cookie of [admin, staff]) {
    await expect(
      await req(`/api/showtimes/${shows[0]}/seats`, "GET", undefined, cookie),
      403,
      "Internal seat map blocked",
      "FORBIDDEN",
    );
    await expect(
      await req(
        `/api/showtimes/${shows[0]}/seats`,
        "PUT",
        { seatIds: [], holdId: null, version: null },
        cookie,
      ),
      403,
      "Internal hold blocked",
      "FORBIDDEN",
    );
    await expect(
      await req(
        "/api/orders",
        "POST",
        { holdId: order.holdId, version: 0 },
        cookie,
      ),
      403,
      "Internal create blocked",
      "FORBIDDEN",
    );
    await expect(
      await pay(order, cookie, confirmation),
      403,
      "Internal payment blocked",
      "FORBIDDEN",
    );
  }
  const { getSeatMap, updateHold } = await import("../src/lib/booking/service");
  const { createOrder, payOrder } = await import("../src/lib/booking/orders");
  for (const session of sessions.slice(2))
    for (const action of [
      () => getSeatMap(session, shows[0]),
      () =>
        updateHold(session, shows[0], {
          seatIds: [],
          holdId: null,
          version: null,
        }),
      () => createOrder(session, { holdId: order.holdId, version: 0 }),
      () =>
        payOrder(session, order.id, {
          idempotencyKey: randomUUID(),
          outcome: "SUCCESS",
          version: 0,
          ...confirmation,
        }),
    ]) {
      await assert.rejects(
        action,
        (error: unknown) => (error as { code?: string }).code === "FORBIDDEN",
      );
      checks++;
    }
  for (const extra of [
    {},
    { ageConfirmed: true },
    { policyConfirmed: true },
    { ...confirmation, ageConfirmed: "true" },
    { ...confirmation, policyConfirmed: 1 },
    { ...confirmation, ageConfirmed: false },
    { ...confirmation, policyConfirmed: false },
  ])
    await expect(
      await pay(order, a, extra),
      400,
      "Explicit booleans required",
      "CONFIRMATION_REQUIRED",
    );
  for (const confirmationVersion of [undefined, "old-version"])
    await expect(
      await pay(order, a, {
        ageConfirmed: true,
        policyConfirmed: true,
        confirmationVersion,
      }),
      409,
      "Current policy version required",
      "CONFIRMATION_CHANGED",
    );
  check(
    (await db.paymentAttempt.count({ where: { bookingId: order.id } })) === 0,
    "Rejected confirmations create no payment attempt",
  );
  check(
    (await db.ticket.count({ where: { item: { bookingId: order.id } } })) === 0,
    "Rejected confirmations issue no tickets",
  );
  check(
    (
      await db.holdSession.findUniqueOrThrow({ where: { id: order.holdId } })
    ).expiresAt.toISOString() === order.expiresAt,
    "Rejected confirmation does not extend deadline",
  );
  for (const locale of ["vi", "en"]) {
    const html = await (
      await req(`/${locale}/account/orders/${order.id}`, "GET", undefined, a)
    ).text();
    check(
      html.includes(
        locale === "vi" ? "Điều kiện trước khi thanh toán" : "Before you pay",
      ) &&
        html.includes("T16") &&
        html.includes("checkbox"),
      `Checkout policy ${locale}`,
    );
    const notice = await (
      await req(
        `/${locale}/showtimes/${shows[0]}/seats`,
        "GET",
        undefined,
        admin,
      )
    ).text();
    check(
      notice.includes(
        locale === "vi"
          ? "Dùng tài khoản khách hàng"
          : "Use a customer account",
      ),
      `Internal notice ${locale}`,
    );
  }
  const key = randomUUID();
  const [first, second] = await Promise.all([
    pay(
      order,
      a,
      { ...confirmation, confirmedAt: "2000-01-01T00:00:00Z" },
      key,
    ),
    pay(order, a, confirmation, key),
  ]);
  const paid: Order = (await expect(first, 200, "Concurrent paid")).order;
  const replay: Order = (await expect(second, 200, "Concurrent replay")).order;
  check(
    paid.status === "PAID" &&
      paid.items[0].ticket?.code === replay.items[0].ticket?.code,
    "One sale with same tickets",
  );
  const attempt = await db.paymentAttempt.findFirstOrThrow({
    where: { bookingId: order.id },
  });
  check(
    attempt.confirmationVersion === CHECKOUT_CONFIRMATION_VERSION &&
      attempt.confirmedAt?.toISOString() === attempt.createdAt.toISOString() &&
      attempt.confirmedAt.getUTCFullYear() !== 2000,
    "Confirmation stamp uses server time",
  );
  check(
    (await db.paymentAttempt.count({ where: { bookingId: order.id } })) === 1,
    "One recorded confirmation/payment",
  );
  check(
    paid.attempts[0].confirmationVersion === CHECKOUT_CONFIRMATION_VERSION &&
      Boolean(paid.attempts[0].confirmedAt),
    "Confirmation returned in own history",
  );
  await expect(
    await pay(
      order,
      a,
      {
        ageConfirmed: false,
        policyConfirmed: false,
        confirmationVersion: "old",
      },
      key,
    ),
    200,
    "Replay does not ask for new confirmation",
  );
  await expect(
    await pay(paid, a, confirmation),
    409,
    "New settlement after paid blocked",
    "ORDER_CLOSED",
  );
  let legacy = await newOrder(shows[1], b);
  check(legacy.ageRatingCode === "K", "Guardian classification snapshot");
  const legacyKey = randomUUID();
  await db.paymentAttempt.create({
    data: {
      bookingId: legacy.id,
      idempotencyKey: legacyKey,
      outcome: "FAILED",
      amount: BigInt(legacy.total),
      bookingVersion: legacy.version,
    },
  });
  await db.booking.update({
    where: { id: legacy.id },
    data: { version: { increment: 1 } },
  });
  const legacyReplay: Order = (
    await expect(
      await pay(legacy, b, { outcome: "FAILED" }, legacyKey),
      200,
      "Legacy replay without confirmations",
    )
  ).order;
  check(
    legacyReplay.attempts[0].confirmationVersion === null &&
      legacyReplay.attempts[0].confirmedAt === null,
    "Do not invent historical confirmations",
  );
  legacy = legacyReplay;
  const failed: Order = (
    await expect(
      await pay(legacy, b, { ...confirmation, outcome: "FAILED" }),
      200,
      "New failed attempt records confirmation",
    )
  ).order;
  check(
    failed.status === "PENDING" &&
      failed.expiresAt === legacy.expiresAt &&
      failed.version > legacy.version,
    "Failed attempt does not extend hold",
  );
  check(
    failed.attempts.some(
      (attempt) =>
        attempt.confirmationVersion === CHECKOUT_CONFIRMATION_VERSION,
    ),
    "Failed attempt has confirmation",
  );
  await expect(
    await pay(legacy, b, confirmation),
    409,
    "Stale version cannot reuse old confirmation",
    "STALE_ORDER",
  );
  await expect(
    await pay(failed, b),
    400,
    "New attempt still needs confirmation",
    "CONFIRMATION_REQUIRED",
  );
  for (const [role, cookie, index] of [
    ["STAFF", a, 0],
    ["ADMIN", b, 1],
  ] as const) {
    await db.user.update({
      where: { id: users[index] },
      data: {
        role,
        ...(role === "STAFF"
          ? { staffAssignment: { create: { cinemaId } } }
          : {}),
      },
    });
    const own = await expect(
      await req(
        `/api/orders/${index ? legacy.id : paid.id}`,
        "GET",
        undefined,
        cookie,
      ),
      200,
      "Promoted user keeps own order history",
    );
    check(
      own.order.id === (index ? legacy.id : paid.id),
      "History remains owned",
    );
    await expect(
      await pay(index ? failed : paid, cookie, confirmation),
      403,
      "Role changed after checkout blocks payment",
      "FORBIDDEN",
    );
  }
  check(
    (
      await req(
        `/api/tickets/${paid.items[0].ticket!.id}/qr`,
        "GET",
        undefined,
        a,
      )
    ).status === 200,
    "Promoted customer can retrieve own existing ticket",
  );
  await expect(
    await req(
      `/api/orders/${failed.id}`,
      "DELETE",
      { version: failed.version },
      b,
    ),
    200,
    "Internal account can abandon its old pending order",
  );
  check(
    (await db.holdSession.findUniqueOrThrow({ where: { id: failed.holdId } }))
      .status === "CANCELLED",
    "Cleanup releases old hold",
  );
  for (const [rating, text] of [
    ["P", "mọi độ tuổi"],
    ["K", "người giám hộ"],
    ["T13", "13"],
    ["T16", "16"],
    ["T18", "18"],
  ] as const)
    check(
      ageExplanation(rating, "vi").includes(text) &&
        Boolean(ageExplanation(rating, "en")),
      `Classification explanation ${rating}`,
    );
  await db.user.update({
    where: { id: users[0] },
    data: { role: "CUSTOMER", staffAssignment: { delete: true } },
  });
  const ui = await newOrder(shows[0], a, 1);
  if (process.argv.includes("--ui")) {
    await writeFile(
      ".qa/checkout-ui.json",
      JSON.stringify({
        users,
        shows,
        movies,
        cinemaId,
        orderId: ui.id,
        email: `${prefix}-0@example.test`,
        password,
      }),
    );
    kept = true;
  }
  console.log(
    `Checkout permissions/confirmation passed: ${checks} checks. QA only; no real payments.`,
  );
}
main().finally(async () => {
  if (!kept) {
    await db.staffAssignment.deleteMany({ where: { userId: { in: users } } });
    const where = { showtimeId: { in: shows } };
    await db.showtimeSeat.updateMany({
      where,
      data: { soldBookingItemId: null, holdSessionId: null },
    });
    await db.ticketRedemption.deleteMany({
      where: { ticket: { item: { booking: where } } },
    });
    await db.ticket.deleteMany({ where: { item: { booking: where } } });
    await db.refund.deleteMany({ where: { booking: where } });
    await db.paymentAttempt.deleteMany({ where: { booking: where } });
    await db.bookingItem.deleteMany({ where: { booking: where } });
    await db.booking.deleteMany({ where });
    await db.showtimeSeat.deleteMany({ where });
    await db.holdSession.deleteMany({ where });
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
    await db.authSession.deleteMany({ where: { userId: { in: users } } });
    await db.staffAssignment.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.movieTranslation.deleteMany({
      where: { movieId: { in: movies } },
    });
    await db.movie.deleteMany({ where: { id: { in: movies } } });
    if (process.argv.includes("--cleanup-ui"))
      await unlink(".qa/checkout-ui.json");
  }
  await db.$disconnect();
  const { getDb } = await import("../src/lib/db");
  await getDb().$disconnect();
});
