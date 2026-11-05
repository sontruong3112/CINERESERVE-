import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, unlink } from "node:fs/promises";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { parseTicketCode, type Inspection } from "../src/lib/tickets/shared";
import type { SeatMap } from "../src/lib/booking/shared";
import type { Order } from "../src/lib/booking/orders-shared";
import { CHECKOUT_CONFIRMATION_VERSION } from "../src/lib/booking/checkout-policy";
const url = new URL(process.env.DATABASE_URL ?? "http://unconfigured");
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
  prefix = `qa-qr-${randomBytes(6).toString("hex")}`;
const users: string[] = [],
  shows: string[] = [],
  cinemas: string[] = [];
let movieId: string | undefined,
  checks = 0,
  constraint: string | undefined,
  kept = false;
const password = randomBytes(20).toString("base64url");
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
  const body = await response.json();
  check(
    response.status === status,
    `${label}: expected ${status}, got ${response.status} ${JSON.stringify(body)}`,
  );
  return body;
}
const inspect = (cookie: string, code: string) =>
  req("/api/staff/tickets/inspect", "POST", { code }, cookie);
const redeem = (cookie: string, code: string, key: string = randomUUID()) =>
  req("/api/staff/tickets/redeem", "POST", { code, requestKey: key }, cookie);
function times(start: Date) {
  return {
    startsAt: start,
    endsAt: new Date(start.getTime() + 3600000),
    cleanupEndsAt: new Date(start.getTime() + 4800000),
    salesCutoffAt: new Date(start.getTime() - 600000),
  };
}
async function main() {
  if (process.argv.includes("--cleanup-ui")) {
    const data = JSON.parse(await readFile(".qa/tickets-ui.json", "utf8"));
    users.push(...data.users);
    shows.push(...data.shows);
    cinemas.push(...data.cinemas);
    movieId = data.movieId;
    await unlink(".qa/tickets-ui.json");
    return;
  }
  for (const suffix of ["A", "B"]) {
    const c = await db.cinema.create({
      data: {
        code: `${prefix}-${suffix}`,
        name: `Rạp kiểm thử QR ${suffix}`,
        addressVi: "QA",
        addressEn: "QA",
        areaVi: "QA",
        areaEn: "QA",
      },
    });
    cinemas.push(c.id);
  }
  const rooms = await Promise.all(
    ["MAIN", "RACE"].map((code) =>
      db.auditorium.create({
        data: {
          cinemaId: cinemas[0],
          code,
          name: `Phòng ${code}`,
          seats: {
            create: [1, 2, 3, 4].map((seatNumber) => ({
              rowLabel: "A",
              seatNumber,
            })),
          },
        },
      }),
    ),
  );
  const movie = await db.movie.create({
    data: {
      slug: prefix,
      originalTitle: "QR Test Movie",
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
            title: "Phim kiểm thử QR",
            synopsis: "Dữ liệu kiểm thử riêng.",
          },
          {
            locale: "en",
            title: "QR Test Movie",
            synopsis: "Isolated ticket validation test.",
          },
        ],
      },
      genres: { create: { genre: { connect: { code: "drama" } } } },
    },
  });
  movieId = movie.id;
  const day = new Date(Date.now() + 86400000 + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  for (const room of rooms) {
    const seats = await db.seat.findMany({
      where: { auditoriumId: room.id },
      orderBy: { seatNumber: "asc" },
    });
    const show = await db.showtime.create({
      data: {
        movieId: movie.id,
        auditoriumId: room.id,
        ...times(new Date(`${day}T10:00:00+07:00`)),
        durationSnapshot: 60,
        ageRatingSnapshot: "P",
        basePrice: 90000,
        vipSurcharge: 20000,
        status: "ON_SALE",
        seats: {
          create: seats.map((s) => ({
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
  const hash = await hashPassword(password),
    cookies: string[] = [],
    emails: string[] = [];
  for (const [role, branch] of [
    ["CUSTOMER", null],
    ["STAFF", cinemas[0]],
    ["STAFF", cinemas[0]],
    ["STAFF", cinemas[1]],
    ["ADMIN", null],
  ] as const) {
    const email = `${prefix}-${users.length}@example.test`;
    emails.push(email);
    const user = await db.user.create({
      data: {
        name: "QR QA User",
        emailNormalized: email,
        passwordHash: hash,
        role,
        ...(branch
          ? { staffAssignment: { create: { cinemaId: branch } } }
          : {}),
      },
    });
    users.push(user.id);
    const token = randomBytes(32).toString("hex");
    await db.authSession.create({
      data: {
        userId: user.id,
        authVersion: 0,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    cookies.push(`cr_session=${token}`);
  }
  const [owner, staff, staff2, wrong, admin] = cookies;
  const orders: Order[] = [];
  for (const show of shows) {
    const map: SeatMap = await (
      await req(`/api/showtimes/${show}/seats`, "GET", undefined, owner)
    ).json();
    const held: SeatMap = await (
      await req(
        `/api/showtimes/${show}/seats`,
        "PUT",
        {
          seatIds: map.seats.slice(0, 3).map((s) => s.id),
          holdId: null,
          version: null,
        },
        owner,
      )
    ).json();
    check(Boolean(held.hold), "QA hold");
    const checkout = await expect(
      await req(
        "/api/orders",
        "POST",
        { holdId: held.hold!.id, version: held.hold!.version },
        owner,
      ),
      200,
      "QA checkout",
    );
    const paid = await expect(
      await req(
        `/api/orders/${checkout.order.id}/payments`,
        "POST",
        {
          idempotencyKey: randomUUID(),
          outcome: "SUCCESS",
          version: checkout.order.version,
          ageConfirmed: true,
          policyConfirmed: true,
          confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
        },
        owner,
      ),
      200,
      "QA payment",
    );
    orders.push(paid.order);
  }
  const [order, raceOrder] = orders,
    tickets = order.items.map((i) => i.ticket!);
  const first = tickets[0],
    second = tickets[1],
    uiTicket = tickets[2];
  await expect(
    await inspect("", first.code),
    401,
    "Anonymous inspection denied",
  );
  for (const cookie of [owner, admin]) {
    await expect(
      await inspect(cookie, first.code),
      403,
      "Non-staff inspect denied",
    );
    await expect(
      await redeem(cookie, first.code),
      403,
      "Non-staff redeem denied",
    );
  }
  await expect(
    await inspect(wrong, first.code),
    403,
    "Wrong branch inspect denied",
  );
  await expect(
    await redeem(wrong, first.code),
    403,
    "Wrong branch redeem denied",
  );
  await expect(
    await req(
      "/api/staff/tickets/inspect",
      "POST",
      { code: first.code },
      staff,
      "https://other.example",
    ),
    403,
    "Cross-origin inspection denied",
  );
  await expect(
    await req(
      "/api/staff/tickets/redeem",
      "POST",
      { code: first.code, requestKey: randomUUID() },
      staff,
      "https://other.example",
    ),
    403,
    "Cross-origin confirmation denied",
  );
  for (const code of [
    "",
    "https://example.com",
    "TK-123",
    "<script>",
    "CR2:" + first.code,
  ])
    await expect(
      await inspect(staff, code),
      400,
      "Malformed/non-ticket QR rejected",
    );
  await expect(
    await inspect(staff, `TK-${"F".repeat(24)}`),
    404,
    "Unknown ticket denied",
  );
  await expect(
    await req(`/api/tickets/${first.id}/qr`),
    401,
    "Anonymous QR denied",
  );
  await expect(
    await req(`/api/tickets/${first.id}/qr`, "GET", undefined, staff),
    404,
    "Other user QR denied",
  );
  const qr = await req(`/api/tickets/${first.id}/qr`, "GET", undefined, owner),
    svg = await qr.text();
  check(
    qr.status === 200 &&
      qr.headers.get("content-type")?.includes("image/svg+xml") &&
      svg.includes("<svg"),
    "Owner receives generated SVG",
  );
  check(
    qr.headers.get("cache-control")?.includes("no-store") &&
      qr.headers.get("vary")?.includes("Cookie"),
    "QR is private and not cached",
  );
  const download = await req(
    `/api/tickets/${first.id}/qr?download=1`,
    "GET",
    undefined,
    owner,
  );
  check(
    download.headers.get("content-disposition")?.includes("attachment"),
    "Download response",
  );
  const { PNG } = createRequire(import.meta.url)("pngjs") as {
    PNG: {
      sync: {
        read: (buffer: Buffer) => {
          data: Uint8Array;
          width: number;
          height: number;
        };
      };
    };
  };
  const payload = `CR1:${first.code}`,
    pixels = PNG.sync.read(
      await QRCode.toBuffer(payload, { width: 300, margin: 4 }),
    ),
    decoded = jsQR(
      new Uint8ClampedArray(pixels.data),
      pixels.width,
      pixels.height,
    );
  check(
    decoded?.data === payload && parseTicketCode(decoded.data) === first.code,
    "QR generator/reader round-trip",
  );
  check(
    !payload.includes(emails[0]) && !payload.includes(order.id),
    "QR has only opaque ticket code",
  );
  let view: Inspection = (
    await expect(
      await inspect(staff, payload.toLowerCase()),
      200,
      "Prefixed/lowercase QR inspection",
    )
  ).ticket;
  check(
    !view.canRedeem && view.reason === "OUTSIDE_WINDOW",
    "Early entry rejected",
  );
  await expect(
    await redeem(staff, first.code),
    409,
    "Early confirmation rejected",
  );
  // Move only QA showtimes, never change the server clock or real catalogue.
  const now = new Date();
  await db.showtime.update({
    where: { id: shows[0] },
    data: times(new Date(now.getTime() + 20 * 60000)),
  });
  await db.booking.update({
    where: { id: order.id },
    data: { startsAt: new Date(now.getTime() + 20 * 60000) },
  });
  const previous = await db.showtime.create({
    data: {
      movieId: movie.id,
      auditoriumId: rooms[0].id,
      ...times(new Date(now.getTime() - 70 * 60000)),
      durationSnapshot: 60,
      ageRatingSnapshot: "P",
      basePrice: 90000,
      vipSurcharge: 0,
      status: "ON_SALE",
    },
  });
  shows.push(previous.id);
  view = (
    await expect(
      await inspect(staff, first.code),
      200,
      "Inspect while previous session cleaning",
    )
  ).ticket;
  check(
    !view.canRedeem &&
      Date.parse(view.entryOpensAt) > Date.parse(view.serverNow),
    "Cleaning delays admission beyond starts-minus-30",
  );
  await expect(
    await redeem(staff, first.code),
    409,
    "Cannot enter during cleaning",
  );
  await db.showtime.update({
    where: { id: previous.id },
    data: times(new Date(now.getTime() - 90 * 60000)),
  });
  view = (
    await expect(await inspect(staff, first.code), 200, "Inspect ready ticket")
  ).ticket;
  check(
    view.canRedeem && view.seat === "A1" && view.reason === "READY",
    "Valid inspection includes seat and window",
  );
  check(
    (await db.ticket.findUniqueOrThrow({ where: { id: first.id } })).status ===
      "VALID" &&
      (await db.ticketRedemption.count({ where: { ticketId: first.id } })) ===
        0,
    "Inspect is read-only",
  );
  check(
    !JSON.stringify(view).includes(emails[0]) &&
      !JSON.stringify(view).includes(users[0]),
    "Inspection excludes customer identity",
  );
  await db.staffAssignment.update({
    where: { userId: users[1] },
    data: { cinemaId: cinemas[1] },
  });
  await expect(
    await redeem(staff, first.code),
    403,
    "Assignment change rechecked at confirmation",
  );
  await db.staffAssignment.update({
    where: { userId: users[1] },
    data: { cinemaId: cinemas[0] },
  });
  await db.user.update({
    where: { id: users[1] },
    data: { mustChangePassword: true },
  });
  await expect(
    await inspect(staff, first.code),
    428,
    "Temporary password blocked",
  );
  await db.user.update({
    where: { id: users[1] },
    data: { mustChangePassword: false, status: "LOCKED" },
  });
  await expect(await inspect(staff, first.code), 401, "Locked staff blocked");
  await db.user.update({ where: { id: users[1] }, data: { status: "ACTIVE" } });
  await db.auditorium.update({
    where: { id: rooms[0].id },
    data: { active: false },
  });
  view = (
    await expect(
      await inspect(staff, first.code),
      200,
      "Inactive room inspection",
    )
  ).ticket;
  check(view.reason === "UNAVAILABLE", "Inactive room cannot admit");
  await expect(
    await redeem(staff, first.code),
    409,
    "Inactive room confirmation blocked",
  );
  await db.auditorium.update({
    where: { id: rooms[0].id },
    data: { active: true },
  });
  // A failure after changing status must roll the entire transaction back.
  constraint = `qa_${randomBytes(6).toString("hex")}`;
  await db.$executeRawUnsafe(
    `ALTER TABLE "TicketRedemption" ADD CONSTRAINT "${constraint}" CHECK ("ticketId" <> '${first.id}'::uuid)`,
  );
  await expect(
    await redeem(staff, first.code),
    500,
    "Injected redemption DB failure",
  );
  check(
    (await db.ticket.findUniqueOrThrow({ where: { id: first.id } })).status ===
      "VALID" &&
      (await db.ticketRedemption.count({ where: { ticketId: first.id } })) ===
        0,
    "Failure rolls back USED and redemption",
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "TicketRedemption" DROP CONSTRAINT "${constraint}"`,
  );
  constraint = undefined;
  const keys = [randomUUID(), randomUUID()],
    race = await Promise.all([
      redeem(staff, first.code, keys[0]),
      redeem(staff2, first.code, keys[1]),
    ]);
  check(
    race
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "Two staff can redeem a ticket only once",
  );
  const winner = race[0].status === 200 ? 0 : 1;
  await expect(race[winner], 200, "Winning confirmation");
  const winCookie = winner === 0 ? staff : staff2;
  const replay = await expect(
    await redeem(winCookie, first.code, keys[winner].toUpperCase()),
    200,
    "Replay same confirmation key",
  );
  check(
    replay.replayed === true &&
      (await db.ticketRedemption.count({ where: { ticketId: first.id } })) ===
        1,
    "Replay does not create a second use",
  );
  await expect(await redeem(staff, first.code), 409, "Used ticket rejected");
  await expect(
    await redeem(winCookie, second.code, keys[winner]),
    409,
    "Key reuse for different ticket rejected",
  );
  const audit = await db.auditLog.findFirstOrThrow({
    where: { entityId: first.id, action: "TICKET_REDEEMED" },
  });
  check(
    !JSON.stringify(audit.afterData).includes(first.code),
    "Audit stores use without QR bearer code",
  );
  await expect(
    await req(
      `/api/admin/showtimes/${shows[0]}`,
      "PATCH",
      { version: 0, action: "cancel", reason: "QA cancellation after entry" },
      admin,
    ),
    409,
    "Admin cannot cancel session with used ticket",
  );
  const customerOrder = await expect(
    await req(`/api/orders/${order.id}`, "GET", undefined, owner),
    200,
    "Owner sees used state",
  );
  check(
    customerOrder.order.items.find(
      (i: { ticket: { id: string } }) => i.ticket.id === first.id,
    ).ticket.status === "USED",
    "Order reflects used ticket",
  );
  await db.ticket.update({
    where: { id: second.id },
    data: { status: "CANCELLED" },
  });
  view = (
    await expect(
      await inspect(staff, second.code),
      200,
      "Cancelled ticket preview",
    )
  ).ticket;
  check(
    view.reason === "CANCELLED" && !view.canRedeem,
    "Cancelled code cannot admit",
  );
  await expect(
    await redeem(staff, second.code),
    409,
    "Cancelled confirmation blocked",
  );
  await expect(
    await req(`/api/tickets/${second.id}/qr`, "GET", undefined, owner),
    404,
    "Cancelled QR hidden",
  );
  await db.booking.update({
    where: { id: order.id },
    data: { status: "PENDING" },
  });
  view = (
    await expect(
      await inspect(staff, uiTicket.code),
      200,
      "Unpaid order preview",
    )
  ).ticket;
  check(view.reason === "NOT_PAID", "Unpaid order cannot admit");
  await db.booking.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });
  // End of session is exclusive.
  await db.showtime.update({
    where: { id: previous.id },
    data: { status: "CANCELLED" },
  });
  await db.showtime.update({
    where: { id: shows[0] },
    data: times(new Date(Date.now() - 61 * 60000)),
  });
  view = (
    await expect(
      await inspect(staff, uiTicket.code),
      200,
      "Ended session preview",
    )
  ).ticket;
  check(view.reason === "OUTSIDE_WINDOW", "Ended session cannot admit");
  await expect(
    await redeem(staff, uiTicket.code),
    409,
    "Ended session confirmation blocked",
  );
  await db.showtime.update({
    where: { id: shows[0] },
    data: times(new Date(Date.now() + 20 * 60000)),
  });
  // Cancellation and admission share the same lock: there can be no mixed result.
  await db.showtime.update({
    where: { id: shows[1] },
    data: times(new Date(Date.now() + 20 * 60000)),
  });
  const target = raceOrder.items[0].ticket!;
  const cancelRace = await Promise.all([
    redeem(staff, target.code),
    req(
      `/api/admin/showtimes/${shows[1]}`,
      "PATCH",
      {
        version: 0,
        action: "cancel",
        reason: "QA admission versus cancellation",
      },
      admin,
    ),
  ]);
  check(
    cancelRace
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "Cancel versus redeem is serialized",
  );
  const final = await db.booking.findUniqueOrThrow({
    where: { id: raceOrder.id },
    include: { refund: true, items: { include: { ticket: true } } },
  });
  check(
    final.status === "PAID"
      ? final.items.some((i) => i.ticket?.status === "USED") &&
          final.refund === null
      : final.status === "CANCELLED" &&
          final.refund !== null &&
          final.items.every((i) => i.ticket?.status === "CANCELLED"),
    "No refunded-and-admitted mixed state",
  );
  for (const locale of ["vi", "en"])
    check(
      (await req(`/${locale}/staff/tickets`, "GET", undefined, staff))
        .status === 200,
      "Staff scanner page renders",
    );
  if (process.argv.includes("--ui")) {
    await QRCode.toFile(".qa/ticket-scan.png", `CR1:${uiTicket.code}`, {
      width: 360,
      margin: 4,
    });
    await writeFile(
      ".qa/tickets-ui.json",
      JSON.stringify({
        users,
        shows,
        cinemas,
        movieId,
        password,
        ownerEmail: emails[0],
        staffEmail: emails[1],
        orderId: order.id,
        code: uiTicket.code,
      }),
    );
    kept = true;
  }
  console.log(
    `Ticket integration passed: ${checks} checks. ${kept ? "Isolated UI fixture retained for visual verification." : "All isolated QA data is cleaned up."}`,
  );
}
main().finally(async () => {
  if (constraint)
    await db.$executeRawUnsafe(
      `ALTER TABLE "TicketRedemption" DROP CONSTRAINT IF EXISTS "${constraint}"`,
    );
  if (!kept) {
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
    if (movieId) {
      await db.movieGenre.deleteMany({ where: { movieId } });
      await db.movieTranslation.deleteMany({ where: { movieId } });
      await db.movie.delete({ where: { id: movieId } });
    }
  }
  await db.$disconnect();
});
