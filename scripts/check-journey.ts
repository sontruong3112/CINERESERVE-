import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { CHECKOUT_CONFIRMATION_VERSION } from "../src/lib/booking/checkout-policy";
import type { SeatMap } from "../src/lib/booking/shared";
import type { Order } from "../src/lib/booking/orders-shared";
import type { RevenueReport } from "../src/lib/reports/shared";
import jsQR from "jsqr";

const url = new URL(process.env.DATABASE_URL || "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/cinereserve"
)
  throw new Error("Project local QA only");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=UTC",
  }),
});
const base = "http://localhost:3001",
  password = randomBytes(20).toString("base64url");
let prefix = `qa-journey-${randomBytes(6).toString("hex")}`,
  checks = 0,
  kept = false;
const users: string[] = [],
  cinemas: string[] = [],
  shows: string[] = [];
let movieId: string | undefined;
const milestones: {
  stage: string;
  gross: string;
  refunds: string;
  net: string;
  soldSeats: string;
  refundedSeats: string;
}[] = [];
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
function req(path: string, method = "GET", body?: unknown, cookie = "") {
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
async function json(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  status = 200,
) {
  const response = await req(path, method, body, cookie);
  const value = await response.json();
  check(
    response.status === status,
    `${method} ${path}: expected ${status}, got ${response.status}, ${JSON.stringify(value)}`,
  );
  return value;
}
async function cleanup() {
  if (!/^qa-journey-[a-f0-9]{12}$/.test(prefix))
    throw new Error("Invalid QA cleanup prefix");
  check(
    (await db.user.count({
      where: { id: { in: users }, emailNormalized: { startsWith: prefix } },
    })) === users.length,
    "Only own QA users are removed",
  );
  check(
    (await db.cinema.count({
      where: { id: { in: cinemas }, code: { startsWith: prefix } },
    })) === cinemas.length,
    "Only own QA branches are removed",
  );
  if (movieId)
    check(
      (
        await db.movie.findUnique({
          where: { id: movieId },
          select: { slug: true },
        })
      )?.slug === prefix,
      "Only own QA movie is removed",
    );
  const where = { showtimeId: { in: shows } };
  await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
  await db.ticketRedemption.deleteMany({
    where: { ticket: { item: { booking: where } } },
  });
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
  await db.seat.deleteMany({
    where: { auditorium: { cinemaId: { in: cinemas } } },
  });
  await db.auditorium.deleteMany({ where: { cinemaId: { in: cinemas } } });
  const emails = await db.user.findMany({
    where: { id: { in: users } },
    select: { emailNormalized: true },
  });
  await db.authSession.deleteMany({ where: { userId: { in: users } } });
  await db.staffAssignment.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.cinema.deleteMany({ where: { id: { in: cinemas } } });
  if (movieId) {
    await db.movieGenre.deleteMany({ where: { movieId } });
    await db.movieTranslation.deleteMany({ where: { movieId } });
    await db.movie.delete({ where: { id: movieId } });
  }
  await db.authRateLimit.deleteMany({
    where: {
      key: {
        in: emails.map((user) =>
          createHash("sha256")
            .update(`login:${user.emailNormalized}`)
            .digest("hex"),
        ),
      },
    },
  });
}
async function main() {
  await mkdir(".qa", { recursive: true });
  if (process.argv.includes("--cleanup-ui")) {
    const fixture = JSON.parse(await readFile(".qa/journey-ui.json", "utf8"));
    prefix = fixture.prefix;
    users.push(...fixture.users);
    cinemas.push(...fixture.cinemas);
    shows.push(...fixture.shows);
    movieId = fixture.movieId;
    await cleanup();
    await unlink(".qa/journey-ui.json");
    return;
  }
  const movie = await db.movie.create({
    data: {
      slug: prefix,
      originalTitle: "QA Journey Movie",
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
            title: "QA · Hành trình mua vé",
            synopsis:
              "Dữ liệu QA riêng cho luồng mua, QR, check-in và doanh thu.",
          },
          {
            locale: "en",
            title: "QA · Booking journey",
            synopsis: "Isolated full-journey QA.",
          },
        ],
      },
    },
  });
  movieId = movie.id;
  for (const suffix of ["A", "B"]) {
    const branch = await db.cinema.create({
      data: {
        code: `${prefix}-${suffix}`,
        name: `QA · Journey ${suffix}`,
        areaVi: "QA",
        areaEn: "QA",
        addressVi: "Dữ liệu QA",
        addressEn: "QA only",
        auditoriums: {
          create: [0, 1].map((index) => ({
            code: `P${index + 1}`,
            name: `P${index + 1}`,
            seats: {
              create: [1, 2, 3, 4].map((number) => ({
                rowLabel: "A",
                seatNumber: number,
                type: number === 2 ? ("VIP" as const) : ("STANDARD" as const),
              })),
            },
          })),
        },
      },
      include: {
        auditoriums: { include: { seats: true }, orderBy: { code: "asc" } },
      },
    });
    cinemas.push(branch.id);
    if (suffix === "A")
      for (const [index, room] of branch.auditoriums.entries()) {
        const startsAt = new Date(
            Date.now() + (index ? 2 * 86400000 : 20 * 60000),
          ),
          endsAt = new Date(+startsAt + 3600000);
        const show = await db.showtime.create({
          data: {
            movieId: movie.id,
            auditoriumId: room.id,
            startsAt,
            endsAt,
            cleanupEndsAt: new Date(+endsAt + 20 * 60000),
            salesCutoffAt: new Date(+startsAt - 10 * 60000),
            durationSnapshot: 60,
            ageRatingSnapshot: "P",
            basePrice: 90000,
            vipSurcharge: 20000,
            status: "ON_SALE",
            seats: {
              create: room.seats.map((seat) => ({
                seatId: seat.id,
                rowLabel: seat.rowLabel,
                seatNumber: seat.seatNumber,
                type: seat.type,
                isSellable: seat.isSellable,
              })),
            },
          },
        });
        shows.push(show.id);
      }
  }
  const hash = await hashPassword(password),
    accounts: { email: string; cookie: string }[] = [];
  for (const [role, branch] of [
    ["CUSTOMER", null],
    ["CUSTOMER", null],
    ["STAFF", cinemas[0]],
    ["STAFF", cinemas[1]],
    ["ADMIN", null],
  ] as const) {
    const email = `${prefix}-${users.length}@example.test`;
    const user = await db.user.create({
      data: {
        name: "QA Journey",
        emailNormalized: email,
        passwordHash: hash,
        role,
        ...(branch
          ? { staffAssignment: { create: { cinemaId: branch } } }
          : {}),
      },
    });
    users.push(user.id);
    const response = await req("/api/auth/login", "POST", { email, password });
    check(response.status === 200, "QA sign-in through real login API");
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    check(Boolean(cookie?.startsWith("cr_session=")), "Session cookie issued");
    accounts.push({ email, cookie: cookie! });
  }
  const [owner, other, staff, wrong, admin] = accounts;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const query = new URLSearchParams({
    from: today,
    to: today,
    movie: movie.id,
    cinema: cinemas[0],
  });
  const reportPath = "/api/reports/revenue?" + query;
  async function report(
    stage: string,
    gross: string,
    refunds: string,
    net: string,
    orders: string,
    sold: string,
    refunded = "0",
  ) {
    const value: RevenueReport = await json(
      reportPath,
      "GET",
      undefined,
      admin.cookie,
    );
    check(
      value.summary.gross === gross &&
        value.summary.refunds === refunds &&
        value.summary.net === net,
      `${stage}: cash reconciles`,
    );
    check(
      value.summary.paidOrders === orders &&
        value.summary.soldSeats === sold &&
        value.summary.refundedSeats === refunded,
      `${stage}: orders/seats reconcile`,
    );
    for (const rows of [value.time, value.movies, value.cinemas])
      for (const field of [
        "gross",
        "refunds",
        "net",
        "paidOrders",
        "refundedOrders",
        "soldSeats",
        "refundedSeats",
      ] as const)
        check(
          rows.reduce((sum, row) => sum + BigInt(row[field]), BigInt(0)).toString() ===
            value.summary[field],
          `${stage}: ${field} dimensional totals`,
        );
    milestones.push({
      stage,
      gross,
      refunds,
      net,
      soldSeats: sold,
      refundedSeats: refunded,
    });
    return value;
  }
  await report("before purchase", "0", "0", "0", "0", "0");
  await json(reportPath, "GET", undefined, owner.cookie, 403);
  await json(reportPath, "GET", undefined, wrong.cookie, 403);
  async function hold(show: string, indexes: number[], cookie = owner.cookie) {
    const map: SeatMap = await json(
      `/api/showtimes/${show}/seats`,
      "GET",
      undefined,
      cookie,
    );
    return json(
      `/api/showtimes/${show}/seats`,
      "PUT",
      {
        seatIds: indexes.map((index) => map.seats[index].id),
        holdId: null,
        version: null,
      },
      cookie,
    ) as Promise<SeatMap>;
  }
  const map: SeatMap = await json(
    `/api/showtimes/${shows[0]}/seats`,
    "GET",
    undefined,
    owner.cookie,
  );
  check(
    map.seats.length === 4 &&
      map.seats.filter((seat) => seat.type === "VIP").length === 1,
    "Saleable standard and VIP seat snapshot",
  );
  const held = await hold(shows[0], [0, 1]);
  check(
    held.hold?.total === 200000,
    "Server quotes 90000 standard plus 110000 VIP",
  );
  await json(
    `/api/showtimes/${shows[0]}/seats`,
    "PUT",
    { seatIds: held.hold!.seatIds, holdId: null, version: null },
    other.cookie,
    409,
  );
  const initial: Order = (
    await json(
      "/api/orders",
      "POST",
      { holdId: held.hold!.id, version: held.hold!.version },
      owner.cookie,
    )
  ).order;
  check(
    initial.total === "200000" &&
      initial.items.length === 2 &&
      initial.status === "PENDING",
    "Correct pending order from held seats",
  );
  check(
    initial.expiresAt === held.hold!.expiresAt,
    "Checkout does not extend hold",
  );
  await report("pending order", "0", "0", "0", "0", "0");
  const payBody = {
    idempotencyKey: randomUUID(),
    outcome: "SUCCESS",
    version: initial.version,
    ageConfirmed: true,
    policyConfirmed: true,
    confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
  };
  let paid: Order = (
    await json(
      `/api/orders/${initial.id}/payments`,
      "POST",
      payBody,
      owner.cookie,
    )
  ).order;
  check(
    paid.status === "PAID" &&
      paid.items.every((item) => item.ticket?.status === "VALID"),
    "Payment issues both tickets atomically",
  );
  const replay: Order = (
    await json(
      `/api/orders/${initial.id}/payments`,
      "POST",
      payBody,
      owner.cookie,
    )
  ).order;
  check(
    replay.items
      .map((item) => item.ticket!.id)
      .sort()
      .join() ===
      paid.items
        .map((item) => item.ticket!.id)
        .sort()
        .join(),
    "Payment replay returns the same tickets",
  );
  check(
    (await db.paymentAttempt.count({
      where: { bookingId: paid.id, outcome: "SUCCESS" },
    })) === 1,
    "One successful payment, no duplicate revenue",
  );
  const sold = await db.showtimeSeat.findMany({
    where: { showtimeId: shows[0], soldBookingItemId: { not: null } },
  });
  check(
    sold.length === 2 && sold.every((seat) => seat.holdSessionId === null),
    "Sold seats no longer held",
  );
  await report("paid and replayed", "200000", "0", "200000", "1", "2");
  const ticket = paid.items[0].ticket!,
    uiTicket = paid.items[1].ticket!;
  await json(
    `/api/tickets/${ticket.id}/qr`,
    "GET",
    undefined,
    other.cookie,
    404,
  );
  const qr = await req(
      `/api/tickets/${ticket.id}/qr`,
      "GET",
      undefined,
      owner.cookie,
    ),
    svg = await qr.text();
  check(
    qr.status === 200 &&
      qr.headers.get("content-type")?.includes("image/svg+xml"),
    "Actual QR endpoint returns SVG",
  );
  check(
    qr.headers.get("cache-control")?.includes("no-store"),
    "QR not publicly cached",
  );
  const require = createRequire(import.meta.url),
    sharp = require("sharp") as typeof import("sharp").default;
  const pixels = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = jsQR(
    new Uint8ClampedArray(pixels.data),
    pixels.info.width,
    pixels.info.height,
  );
  check(
    decoded?.data === `CR1:${ticket.code}`,
    "Decode the actual HTTP SVG, not a regenerated ticket QR",
  );
  await json(
    "/api/staff/tickets/inspect",
    "POST",
    { code: decoded!.data },
    owner.cookie,
    403,
  );
  await json(
    "/api/staff/tickets/inspect",
    "POST",
    { code: decoded!.data },
    wrong.cookie,
    403,
  );
  const inspected = (
    await json(
      "/api/staff/tickets/inspect",
      "POST",
      { code: decoded!.data },
      staff.cookie,
    )
  ).ticket;
  check(
    inspected.canRedeem && inspected.reason === "READY",
    "Fresh purchased QR is ready within the real entry window",
  );
  check(
    (await db.ticketRedemption.count({ where: { ticketId: ticket.id } })) === 0,
    "Inspection alone does not admit the customer",
  );
  const requestKey = randomUUID();
  const redeemed = await json(
    "/api/staff/tickets/redeem",
    "POST",
    { code: decoded!.data, requestKey },
    staff.cookie,
  );
  check(
    redeemed.ticket.status === "USED" && !redeemed.replayed,
    "Assigned staff admits the ticket once",
  );
  check(
    (
      await json(
        "/api/staff/tickets/redeem",
        "POST",
        { code: decoded!.data, requestKey },
        staff.cookie,
      )
    ).replayed,
    "Retry after response loss is idempotent",
  );
  const duplicate = await json(
    "/api/staff/tickets/redeem",
    "POST",
    { code: decoded!.data, requestKey: randomUUID() },
    staff.cookie,
    409,
  );
  check(
    duplicate.error === "ALREADY_USED",
    "New check-in attempt cannot admit the same ticket twice",
  );
  check(
    (await db.ticketRedemption.count({ where: { ticketId: ticket.id } })) === 1,
    "Exactly one admission record",
  );
  await report("after check-in", "200000", "0", "200000", "1", "2");
  await json(
    `/api/admin/showtimes/${shows[0]}`,
    "PATCH",
    {
      version: 0,
      action: "cancel",
      reason: "QA: must reject cancellation after admission",
    },
    admin.cookie,
    409,
  );
  const refundHold = await hold(shows[1], [0]);
  let refundOrder: Order = (
    await json(
      "/api/orders",
      "POST",
      { holdId: refundHold.hold!.id, version: refundHold.hold!.version },
      owner.cookie,
    )
  ).order;
  const confirm = {
    ageConfirmed: true,
    policyConfirmed: true,
    confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
  };
  refundOrder = (
    await json(
      `/api/orders/${refundOrder.id}/payments`,
      "POST",
      {
        ...confirm,
        idempotencyKey: randomUUID(),
        outcome: "FAILED",
        version: refundOrder.version,
      },
      owner.cookie,
    )
  ).order;
  check(
    refundOrder.status === "PENDING" &&
      !refundOrder.items.some((item) => item.ticket),
    "Failed payment issues no tickets",
  );
  await report("failed payment", "200000", "0", "200000", "1", "2");
  refundOrder = (
    await json(
      `/api/orders/${refundOrder.id}/payments`,
      "POST",
      {
        ...confirm,
        idempotencyKey: randomUUID(),
        outcome: "SUCCESS",
        version: refundOrder.version,
      },
      owner.cookie,
    )
  ).order;
  check(
    refundOrder.status === "PAID",
    "Failed payment can be retried before the original hold expires",
  );
  await report("second paid order", "290000", "0", "290000", "2", "3");
  await json(
    `/api/admin/showtimes/${shows[1]}`,
    "PATCH",
    { version: 0, action: "cancel", reason: "QA: refund future session" },
    admin.cookie,
  );
  const cancelled: Order = (
    await json(`/api/orders/${refundOrder.id}`, "GET", undefined, owner.cookie)
  ).order;
  check(
    cancelled.status === "CANCELLED" &&
      cancelled.refund?.amount === "90000" &&
      cancelled.items.every((item) => item.ticket?.status === "CANCELLED"),
    "Cancellation refunds paid amount and invalidates tickets",
  );
  await json(
    `/api/tickets/${cancelled.items[0].ticket!.id}/qr`,
    "GET",
    undefined,
    owner.cookie,
    404,
  );
  const cancelledInspection = (
    await json(
      "/api/staff/tickets/inspect",
      "POST",
      { code: cancelled.items[0].ticket!.code },
      staff.cookie,
    )
  ).ticket;
  check(
    cancelledInspection.reason === "CANCELLED" &&
      !cancelledInspection.canRedeem,
    "Refunded ticket cannot be admitted",
  );
  const finalReport = await report(
    "after refund",
    "290000",
    "90000",
    "200000",
    "2",
    "3",
    "1",
  );
  check(finalReport.summary.refundedOrders === "1", "One refunded order");
  const staffReport: RevenueReport = await json(
    reportPath,
    "GET",
    undefined,
    staff.cookie,
  );
  check(
    JSON.stringify(staffReport.summary) === JSON.stringify(finalReport.summary),
    "Admin and assigned staff reconcile the same branch",
  );
  const wrongReport: RevenueReport = await json(
    "/api/reports/revenue?" +
      new URLSearchParams({ from: today, to: today }),
    "GET",
    undefined,
    wrong.cookie,
  );
  check(
    wrongReport.summary.gross === "0",
    "Other branch sees no cash from this journey",
  );
  await json('/api/reports/revenue?'+new URLSearchParams({from:today,to:today,movie:movie.id}),'GET',undefined,wrong.cookie,400);
  const csv = await req(
      reportPath + "&format=csv",
      "GET",
      undefined,
      admin.cookie,
    ),
    csvText = await csv.text();
  check(
    csv.status === 200 &&
      csv.headers.get("content-type")?.includes("text/csv") &&
      csvText.includes("290000") &&
      csvText.includes("90000") &&
      csvText.includes("200000"),
    "CSV reconciles to report totals",
  );
  paid = (await json(`/api/orders/${paid.id}`, "GET", undefined, owner.cookie))
    .order;
  check(
    paid.items.filter((item) => item.ticket?.status === "USED").length === 1 &&
      paid.items.filter((item) => item.ticket?.status === "VALID").length === 1,
    "Personal order distinguishes used and unused tickets",
  );
  await writeFile(
    ".qa/journey-results.json",
    JSON.stringify(
      {
        checks,
        milestones,
        entry: { used: 1, unused: 1 },
        expectedFinal: { gross: 290000, refunds: 90000, net: 200000 },
        notes: "QA-only. Actual SVG decoded. Camera hardware not tested.",
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--keep-ui")) {
    const uiQr = await req(
      `/api/tickets/${uiTicket.id}/qr`,
      "GET",
      undefined,
      owner.cookie,
    );
    await sharp(Buffer.from(await uiQr.text()))
      .png()
      .toFile(".qa/journey-ticket.png");
    await writeFile(
      ".qa/journey-ui.json",
      JSON.stringify({
        prefix,
        users,
        cinemas,
        shows,
        movieId,
        password,
        ownerEmail: owner.email,
        staffEmail: staff.email,
        adminEmail: admin.email,
        orderId: paid.id,
        ticketCode: uiTicket.code,
        today,
      }),
    );
    kept = true;
  }
  console.log(
    `Full journey passed: ${checks} checks. Gross 290000, refunds 90000, net 200000. ${kept ? "Own UI fixture retained." : "QA cleanup follows."}`,
  );
}
main()
  .finally(async () => {
    try {
      if (!kept && !process.argv.includes("--cleanup-ui")) await cleanup();
    } finally {
      await db.$disconnect();
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
