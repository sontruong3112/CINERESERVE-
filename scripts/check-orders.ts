import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Order } from "../src/lib/booking/orders-shared";
import type { SeatMap } from "../src/lib/booking/shared";
import { CHECKOUT_CONFIRMATION_VERSION } from "../src/lib/booking/checkout-policy";
const url = new URL(process.env.DATABASE_URL ?? "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/cinereserve"
)
  throw new Error("Project local QA database only.");
const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }),
  base = "http://localhost:3001",
  prefix = `qa-order-${randomBytes(6).toString("hex")}`;
const users: string[] = [],
  shows: string[] = [];
let cinemaId: string | undefined,
  movieId: string | undefined,
  checks = 0,
  forcedConstraint: string | undefined;
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
    `${label}: expected ${status}, got ${response.status} ${JSON.stringify(result)}`,
  );
  return result.order ?? result;
}
async function hold(
  show: string,
  cookie: string,
  seatIds: string[],
  previous: SeatMap["hold"] = null,
): Promise<SeatMap> {
  return expect(
    await req(
      `/api/showtimes/${show}/seats`,
      "PUT",
      {
        seatIds,
        holdId: previous?.id ?? null,
        version: previous?.version ?? null,
      },
      cookie,
    ),
    200,
    "Hold selection",
  );
}
async function checkout(
  cookie: string,
  h: NonNullable<SeatMap["hold"]>,
): Promise<Order> {
  return expect(
    await req(
      "/api/orders",
      "POST",
      { holdId: h.id, version: h.version, total: 1, userId: users[1] },
      cookie,
    ),
    200,
    "Create/reuse order",
  );
}
const payment = (
  cookie: string,
  order: Order,
  key = randomUUID(),
  outcome = "SUCCESS",
) =>
  req(
    `/api/orders/${order.id}/payments`,
    "POST",
    {
      idempotencyKey: key,
      outcome,
      version: order.version,
      total: 1,
      ageConfirmed: true,
      policyConfirmed: true,
      confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
    },
    cookie,
  );
async function main() {
  const cinema = await db.cinema.create({
    data: {
      code: prefix,
      name: "QA Orders Cinema",
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
      name: "QA Orders Room",
      seats: {
        create: Array.from({ length: 10 }, (_, i) => ({
          rowLabel: "A",
          seatNumber: i + 1,
          type: i === 1 ? "VIP" : "STANDARD",
        })),
      },
    },
  });
  const movie = await db.movie.create({
    data: {
      slug: prefix,
      originalTitle: "QA Orders Movie",
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
            title: "Phim thử thanh toán",
            synopsis: "Nội dung kiểm thử riêng.",
          },
          {
            locale: "en",
            title: "Payment QA Movie",
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
    }),
    day = new Date(Date.now() + 86400000 + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
  for (const hour of [10, 14]) {
    const starts = new Date(`${day}T${hour}:00:00+07:00`);
    const show = await db.showtime.create({
      data: {
        movieId: movie.id,
        auditoriumId: room.id,
        startsAt: starts,
        endsAt: new Date(starts.getTime() + 3600000),
        cleanupEndsAt: new Date(starts.getTime() + 4800000),
        salesCutoffAt: new Date(starts.getTime() - 600000),
        durationSnapshot: 60,
        ageRatingSnapshot: "P",
        basePrice: 90000,
        vipSurcharge: 20000,
        status: "ON_SALE",
        seats: {
          create: physical.map((s) => ({
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
  // Signed-in QA sessions use normal opaque tokens, with only hashes stored in DB.
  const cookies: string[] = [];
  for (const role of ["CUSTOMER", "CUSTOMER", "CUSTOMER", "ADMIN"] as const) {
    const user = await db.user.create({
      data: {
        name: "QA Order Test",
        emailNormalized: `${prefix}-${users.length}@example.test`,
        passwordHash: "unused-qa-login",
        role,
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
  const [a, b, c, admin] = cookies,
    [show, other] = shows;
  const map: SeatMap = await expect(
    await req(`/api/showtimes/${show}/seats`, "GET", undefined, a),
    200,
    "Read inventory",
  );
  const ids = map.seats.map((s) => s.id);
  await expect(await req("/api/orders"), 401, "Anonymous list denied");
  await expect(
    await req("/api/orders", "POST", {}),
    401,
    "Anonymous create denied",
  );
  let state = await hold(show, a, [ids[0], ids[1]]);
  let order = await checkout(a, state.hold!);
  const deadline = order.expiresAt;
  check(
    order.total === "200000" &&
      order.currency === "VND" &&
      order.items.length === 2,
    "Server total ignores forged amounts/user",
  );
  check(
    order.expiresAt === state.hold!.expiresAt && order.status === "PENDING",
    "Checkout preserves original hold deadline",
  );
  const repeated = await Promise.all([
    checkout(a, state.hold!),
    checkout(a, state.hold!),
  ]);
  check(
    repeated.every((o) => o.id === order.id) &&
      (await db.booking.count({ where: { holdId: state.hold!.id } })) === 1,
    "Repeated checkout creates one order",
  );
  for (const [path, method, body] of [
    [`/api/orders/${order.id}`, "GET", undefined],
    [`/api/orders/${order.id}`, "DELETE", { version: order.version }],
    [
      `/api/orders/${order.id}/payments`,
      "POST",
      {
        version: order.version,
        idempotencyKey: randomUUID(),
        outcome: "SUCCESS",
      },
    ],
  ] as const)
    await expect(
      await req(path, method, body, b),
      404,
      "Another customer cannot read/mutate order",
    );
  await expect(
    await req(
      `/api/orders/${order.id}/payments`,
      "POST",
      { idempotencyKey: randomUUID(), outcome: "SUCCESS", version: 0 },
      a,
      "https://other.example",
    ),
    403,
    "Cross-origin payment denied",
  );
  await expect(
    await req(
      `/api/orders/${order.id}/payments`,
      "POST",
      { idempotencyKey: "bad", outcome: "SUCCESS", version: 0 },
      a,
    ),
    400,
    "Invalid request key",
  );
  await expect(
    await payment(a, order, randomUUID(), "REAL_BANK"),
    400,
    "Only simulated outcomes allowed",
  );
  const failKey = randomUUID(),
    oldVersion = order.version;
  order = await expect(
    await payment(a, order, failKey, "FAILED"),
    200,
    "Simulate failed payment",
  );
  check(
    order.status === "PENDING" &&
      order.expiresAt === deadline &&
      order.attempts.length === 1 &&
      order.items.every((i) => !i.ticket),
    "Failure keeps hold/order and issues no tickets",
  );
  const replay = await expect(
    await req(
      `/api/orders/${order.id}/payments`,
      "POST",
      {
        idempotencyKey: failKey.toUpperCase(),
        outcome: "FAILED",
        version: oldVersion,
      },
      a,
    ),
    200,
    "Replay failure",
  );
  check(
    replay.version === order.version && replay.attempts.length === 1,
    "Replay failure does not add attempts or version",
  );
  await expect(
    await req(
      `/api/orders/${order.id}/payments`,
      "POST",
      { idempotencyKey: failKey, outcome: "SUCCESS", version: oldVersion },
      a,
    ),
    409,
    "Key cannot be reused with different outcome",
  );
  const stale = order;
  state = await hold(show, a, [ids[0], ids[2]], state.hold);
  order = await expect(
    await req(`/api/orders/${order.id}`, "GET", undefined, a),
    200,
    "Order after selection change",
  );
  check(
    order.total === "180000" &&
      order.items.some((i) => i.label === "A3") &&
      order.version > stale.version &&
      order.expiresAt === deadline,
    "Pending order synchronizes seats/prices/version without renewal",
  );
  await expect(await payment(a, stale), 409, "Stale order version cannot pay");
  // Force ticket insertion to fail for one QA item and prove the entire settlement rolls back.
  forcedConstraint = `qa_${randomBytes(6).toString("hex")}`;
  await db.$executeRawUnsafe(
    `ALTER TABLE "Ticket" ADD CONSTRAINT "${forcedConstraint}" CHECK ("bookingItemId" <> '${order.items[0].id}'::uuid)`,
  );
  const retryKey = randomUUID();
  await expect(
    await payment(a, order, retryKey),
    500,
    "Injected ticket failure rolls back payment",
  );
  const afterFailure = await db.booking.findUniqueOrThrow({
    where: { id: order.id },
    include: { attempts: true, items: { include: { ticket: true } } },
  });
  check(
    afterFailure.status === "PENDING" &&
      afterFailure.attempts.length === 1 &&
      afterFailure.items.every((i) => !i.ticket),
    "No paid order or partial tickets after DB failure",
  );
  check(
    (await db.showtimeSeat.count({
      where: { holdSessionId: state.hold!.id, soldBookingItemId: null },
    })) === 2,
    "Seats remain held after rollback",
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "Ticket" DROP CONSTRAINT "${forcedConstraint}"`,
  );
  forcedConstraint = undefined;
  const paidOriginalVersion = order.version;
  const parallel = await Promise.all([
    payment(a, order, retryKey),
    payment(a, order, retryKey),
  ]);
  order = await expect(parallel[0], 200, "Successful settlement");
  await expect(parallel[1], 200, "Concurrent identical settlement replay");
  check(
    order.status === "PAID" &&
      order.total === "180000" &&
      order.items.every((i) => i.ticket?.status === "VALID"),
    "Payment sells seats and issues one code per item",
  );
  check(
    order.attempts.filter((a) => a.outcome === "SUCCESS").length === 1 &&
      (await db.ticket.count({ where: { item: { bookingId: order.id } } })) ===
        2,
    "Only one successful attempt and no duplicate tickets",
  );
  const sold = await db.showtimeSeat.findMany({
    where: { id: { in: [ids[0], ids[2]] } },
  });
  check(
    sold.every((s) => s.soldBookingItemId && s.holdSessionId === null),
    "Sold seats are no longer held",
  );
  check(
    (await db.holdSession.findUniqueOrThrow({ where: { id: state.hold!.id } }))
      .status === "CONVERTED",
    "Hold converted on success",
  );
  await expect(
    await payment(a, order),
    409,
    "New payment request after paid denied",
  );
  const replayPaid = await expect(
    await req(
      `/api/orders/${order.id}/payments`,
      "POST",
      {
        idempotencyKey: retryKey,
        outcome: "SUCCESS",
        version: paidOriginalVersion,
      },
      a,
    ),
    200,
    "Lost successful response can be recovered",
  );
  check(
    replayPaid.items[0].ticket!.code === order.items[0].ticket!.code,
    "Replay returns original ticket codes",
  );
  await expect(
    await req(
      `/api/orders/${order.id}`,
      "DELETE",
      { version: order.version },
      a,
    ),
    409,
    "Customer cannot cancel paid order",
  );
  await db.holdSession.update({
    where: { id: state.hold!.id },
    data: {
      startedAt: new Date(Date.now() - 301000),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  check(
    (
      await expect(
        await req(`/api/orders/${order.id}`, "GET", undefined, a),
        200,
        "Read paid after old hold deadline",
      )
    ).status === "PAID",
    "Paid order does not expire",
  );
  const publicMap: SeatMap = await expect(
    await req(`/api/showtimes/${show}/seats`, "GET", undefined, b),
    200,
    "Inventory after sale",
  );
  check(
    publicMap.seats.find((s) => s.id === ids[0])!.status === "SOLD" &&
      !JSON.stringify(publicMap).includes(order.id),
    "Sold status without buyer/order identifiers",
  );
  await expect(
    await req(
      `/api/showtimes/${show}/seats`,
      "PUT",
      { seatIds: [ids[0]], holdId: null, version: null },
      b,
    ),
    409,
    "Other user cannot hold sold seat",
  );
  await expect(
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
    "Admin cannot edit paid session",
  );
  // Another order: empty-selection sync, explicit cancel, then expiry.
  let bstate = await hold(show, b, [ids[3]]),
    border = await checkout(b, bstate.hold!);
  bstate = await hold(show, b, [], bstate.hold);
  border = await expect(
    await req(`/api/orders/${border.id}`, "GET", undefined, b),
    200,
    "Empty pending order",
  );
  check(
    border.items.length === 0 && border.total === "0",
    "Empty hold clears pending items",
  );
  await expect(await payment(b, border), 409, "Cannot pay an empty order");
  bstate = await hold(show, b, [ids[4]], bstate.hold);
  border = await expect(
    await req(`/api/orders/${border.id}`, "GET", undefined, b),
    200,
    "Reselect seats in existing order",
  );
  border = await expect(
    await req(
      `/api/orders/${border.id}`,
      "DELETE",
      { version: border.version },
      b,
    ),
    200,
    "Cancel pending order",
  );
  check(
    border.status === "CANCELLED" &&
      (await db.showtimeSeat.findUniqueOrThrow({ where: { id: ids[4] } }))
        .holdSessionId === null,
    "Pending cancellation releases seats",
  );
  await expect(await payment(b, border), 409, "Cannot pay cancelled order");
  bstate = await hold(show, b, [ids[5]]);
  border = await checkout(b, bstate.hold!);
  await db.holdSession.update({
    where: { id: bstate.hold!.id },
    data: {
      startedAt: new Date(Date.now() - 301000),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  await expect(
    await payment(b, border),
    409,
    "Expiry before settlement rejects payment",
  );
  border = await expect(
    await req(`/api/orders/${border.id}`, "GET", undefined, b),
    200,
    "Read expired order",
  );
  check(
    border.status === "EXPIRED" && border.attempts.length === 0,
    "Expiry commits without recording a payment",
  );
  // Two distinct success requests racing: one wins; no second charge/ticket.
  let cstate = await hold(show, c, [ids[6]]),
    corder = await checkout(c, cstate.hold!);
  const race = await Promise.all([payment(c, corder), payment(c, corder)]);
  check(
    race
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "Concurrent different keys cannot settle twice",
  );
  corder = await expect(
    await req(`/api/orders/${corder.id}`, "GET", undefined, c),
    200,
    "Read race result",
  );
  check(
    corder.attempts.length === 1 && corder.items[0].ticket !== null,
    "Race produces one attempt and one ticket",
  );
  // Admin cancellation atomically refunds all paid orders and cancels pending ones.
  bstate = await hold(show, b, [ids[7]]);
  const pendingOrder = await checkout(b, bstate.hold!);
  await expect(
    await req(
      `/api/admin/showtimes/${show}`,
      "PATCH",
      { version: 0, action: "cancel", reason: "QA simulated full refund" },
      admin,
    ),
    200,
    "Admin cancels session with paid/pending orders",
  );
  const refunded: Order = await expect(
    await req(`/api/orders/${order.id}`, "GET", undefined, a),
    200,
    "Read refunded order",
  );
  check(
    refunded.status === "CANCELLED" &&
      refunded.refund?.amount === refunded.total &&
      refunded.paidAt !== null &&
      refunded.items.every((i) => i.ticket?.status === "CANCELLED"),
    "Full simulated refund preserves payment history and voids tickets",
  );
  const pendingCancelled: Order = await expect(
    await req(`/api/orders/${pendingOrder.id}`, "GET", undefined, b),
    200,
    "Pending order after cinema cancellation",
  );
  check(
    pendingCancelled.status === "CANCELLED" && pendingCancelled.refund === null,
    "Unpaid order cancelled without refund",
  );
  await expect(
    await req(
      `/api/orders/${refunded.id}/payments`,
      "POST",
      {
        idempotencyKey: retryKey,
        outcome: "SUCCESS",
        version: paidOriginalVersion,
      },
      a,
    ),
    200,
    "Replay after refund returns current cancelled order without settling again",
  );
  check(
    (await db.refund.count({ where: { bookingId: order.id } })) === 1,
    "Refund recorded only once",
  );
  // Failures may retry but are bounded, and logout cancels an unpaid order.
  const otherMap: SeatMap = await expect(
    await req(`/api/showtimes/${other}/seats`, "GET", undefined, c),
    200,
    "Second session inventory",
  );
  cstate = await hold(other, c, [otherMap.seats[0].id]);
  corder = await checkout(c, cstate.hold!);
  for (let i = 0; i < 10; i++)
    corder = await expect(
      await payment(c, corder, randomUUID(), "FAILED"),
      200,
      "Bounded failed attempt",
    );
  await expect(await payment(c, corder), 429, "Limit payment attempts");
  check(
    corder.expiresAt === cstate.hold!.expiresAt,
    "Retries never extend deadline",
  );
  await expect(
    await req("/api/auth/logout", "POST", {}, c),
    200,
    "Logout pending order",
  );
  check(
    (await db.booking.findUniqueOrThrow({ where: { id: corder.id } }))
      .status === "CANCELLED",
    "Logout cancels unpaid order",
  );
  const list = await expect(
    await req("/api/orders?page=1.5", "GET", undefined, a),
    200,
    "Own order list",
  );
  check(
    list.items.every((o: Order) => o.id === order.id) &&
      list.total === 1 &&
      list.page === 1,
    "Order history filtered to owner and paginated",
  );
  for (const lang of ["vi", "en"])
    for (const path of [
      `/${lang}/account/orders`,
      `/${lang}/account/orders/${order.id}`,
    ])
      check(
        (await req(path, "GET", undefined, a)).status === 200,
        "Order pages render in both languages",
      );
  check(
    (await req(`/vi/account/orders/${order.id}`, "GET", undefined, b))
      .status === 404,
    "Another customer's page returns not found",
  );
  console.log(
    `Orders integration passed: ${checks} checks. All isolated QA data is cleaned up.`,
  );
}
main().finally(async () => {
  if (forcedConstraint)
    await db.$executeRawUnsafe(
      `ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "${forcedConstraint}"`,
    );
  await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
  const where = { showtimeId: { in: shows } };
  await db.showtimeSeat.updateMany({
    where,
    data: { soldBookingItemId: null, holdSessionId: null },
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
  if (movieId) {
    await db.movieGenre.deleteMany({ where: { movieId } });
    await db.movieTranslation.deleteMany({ where: { movieId } });
    await db.movie.delete({ where: { id: movieId } });
  }
  await db.authSession.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
