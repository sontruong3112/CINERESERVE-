import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { RevenueReport, RevenueTotals } from "../src/lib/reports/shared";
import { money } from "../src/lib/reports/shared";
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
  prefix = `qa-revenue-${randomBytes(6).toString("hex")}`;
const users: string[] = [],
  movies: string[] = [],
  cinemas: string[] = [],
  shows: string[] = [];
let checks = 0,
  kept = false;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function req(path: string, cookie = "") {
  return fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
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
const day = (text: string) => new Date(`${text}+07:00`);
const endpoint = (params: Record<string, string>) =>
  `/api/reports/revenue?${new URLSearchParams(params)}`;
function totals(
  report: RevenueTotals,
  gross: string,
  refunds: string,
  net: string,
  label: string,
) {
  check(
    report.gross === gross && report.refunds === refunds && report.net === net,
    `${label}: ${JSON.stringify(report)}`,
  );
}
function reconcile(report: RevenueReport) {
  for (const rows of [report.time, report.movies, report.cinemas])
    for (const metric of [
      "gross",
      "refunds",
      "net",
      "paidOrders",
      "refundedOrders",
      "soldSeats",
      "refundedSeats",
    ] as const)
      check(
        rows
          .reduce((sum, row) => sum + BigInt(row[metric]), BigInt(0))
          .toString() === report.summary[metric],
        `Reconcile ${metric}: ${JSON.stringify(rows)} vs ${JSON.stringify(report.summary)}`,
      );
}
async function main() {
  if (process.argv.includes("--cleanup-ui")) {
    const data = JSON.parse(await readFile(".qa/revenue-ui.json", "utf8"));
    users.push(...data.users);
    movies.push(...data.movies);
    cinemas.push(...data.cinemas);
    shows.push(...data.shows);
    await unlink(".qa/revenue-ui.json");
    return;
  }
  for (const name of ["Rạp QA A", 'Rạp "QA", B']) {
    const c = await db.cinema.create({
      data: {
        code: `${prefix}-${cinemas.length}`,
        name,
        addressVi: "QA",
        addressEn: "QA",
        areaVi: "QA",
        areaEn: "QA",
      },
    });
    cinemas.push(c.id);
  }
  const rooms = await Promise.all(
    cinemas.map((cinemaId) =>
      db.auditorium.create({
        data: {
          cinemaId,
          code: "QA",
          name: "QA",
          seats: {
            create: [1, 2, 3].map((seatNumber) => ({
              rowLabel: "A",
              seatNumber,
            })),
          },
        },
      }),
    ),
  );
  for (const title of ["=SUM(1,2) Phim QA", "Phim QA thứ hai"]) {
    const movie = await db.movie.create({
      data: {
        slug: `${prefix}-${movies.length}`,
        originalTitle: title,
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
            { locale: "vi", title, synopsis: "Dữ liệu kiểm thử thống kê." },
            {
              locale: "en",
              title: `EN ${title}`,
              synopsis: "Isolated report fixture.",
            },
          ],
        },
        genres: { create: { genre: { connect: { code: "drama" } } } },
      },
    });
    movies.push(movie.id);
  }
  const cookies: string[] = [];
  for (const [role, cinemaId] of [
    ["ADMIN", null],
    ["STAFF", cinemas[0]],
    ["STAFF", cinemas[1]],
    ["CUSTOMER", null],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: "Revenue QA",
        emailNormalized: `${prefix}-${users.length}@example.test`,
        passwordHash: "unused-qa-login",
        role,
        ...(cinemaId ? { staffAssignment: { create: { cinemaId } } } : {}),
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
  const [admin, staffA, staffB, customer] = cookies;
  async function booking(
    movieIndex: number,
    branch: number,
    amount: bigint,
    eventAt: string | null,
    seatCount = 1,
    refundAt?: string,
  ) {
    const start = new Date(Date.now() + (shows.length + 10) * 86400000),
      end = new Date(start.getTime() + 3600000);
    const seatRows = await db.seat.findMany({
      where: { auditoriumId: rooms[branch].id },
      orderBy: { seatNumber: "asc" },
    });
    const show = await db.showtime.create({
      data: {
        movieId: movies[movieIndex],
        auditoriumId: rooms[branch].id,
        startsAt: start,
        endsAt: end,
        cleanupEndsAt: new Date(end.getTime() + 1200000),
        salesCutoffAt: new Date(start.getTime() - 600000),
        basePrice: 90000,
        vipSurcharge: 0,
        durationSnapshot: 60,
        ageRatingSnapshot: "P",
        status: refundAt ? "CANCELLED" : "ON_SALE",
        seats: {
          create: seatRows.map((s) => ({
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
    const when = eventAt ? day(eventAt) : day("2026-01-02T12:00:00"),
      hold = await db.holdSession.create({
        data: {
          userId: users[3],
          showtimeId: show.id,
          status: eventAt ? "CONVERTED" : "EXPIRED",
          startedAt: new Date(when.getTime() - 60000),
          expiresAt: new Date(when.getTime() + 240000),
          quotedBasePrice: 90000,
          quotedVipSurcharge: 0,
        },
      });
    const slots = await db.showtimeSeat.findMany({
        where: { showtimeId: show.id },
        orderBy: { seatNumber: "asc" },
      }),
      price =
        amount < BigInt(2000000000) ? Number(amount / BigInt(seatCount)) : 1;
    const b = await db.booking.create({
      data: {
        code: `QA-${randomBytes(8).toString("hex")}`,
        userId: users[3],
        showtimeId: show.id,
        movieId: movies[movieIndex],
        cinemaId: cinemas[branch],
        holdId: hold.id,
        holdVersion: 0,
        status: eventAt ? (refundAt ? "CANCELLED" : "PAID") : "PENDING",
        movieTitle: movieIndex === 0 ? "=SUM(1,2) Phim QA" : "Phim QA thứ hai",
        movieTitleEn: "QA report movie",
        ageRatingCode: 'P',
        cinemaName: branch === 0 ? "Rạp QA A" : 'Rạp "QA", B',
        roomName: "QA",
        startsAt: start,
        expiresAt: hold.expiresAt,
        total: amount,
        paidAt: eventAt ? when : null,
        ...(refundAt
          ? { cancelledAt: day(refundAt), cancellationReason: "QA refund" }
          : {}),
        items: {
          create: slots
            .slice(0, seatCount)
            .map((s) => ({
              showtimeSeatId: s.id,
              label: `${s.rowLabel}${s.seatNumber}`,
              type: s.type,
              price,
            })),
        },
      },
      include: { items: true },
    });
    if (eventAt) {
      await db.paymentAttempt.create({
        data: {
          bookingId: b.id,
          idempotencyKey: randomUUID(),
          outcome: "SUCCESS",
          amount,
          bookingVersion: 0,
          createdAt: when,
        },
      });
      for (const item of b.items)
        await db.showtimeSeat.update({
          where: { id: item.showtimeSeatId },
          data: { soldBookingItemId: item.id },
        });
    }
    if (refundAt)
      await db.refund.create({
        data: {
          bookingId: b.id,
          amount,
          reason: "QA refund",
          completedAt: day(refundAt),
        },
      });
    return b;
  }
  await booking(0, 0, BigInt(100000), "2026-01-01T00:00:00", 2);
  const shifted = await booking(
    0,
    0,
    BigInt(200000),
    "2026-01-01T23:59:59.999",
    2,
    "2026-01-02T00:00:00",
  );
  await booking(1, 0, BigInt(300000), "2026-01-02T12:00:00", 3);
  await booking(
    0,
    1,
    BigInt(400000),
    "2026-01-02T12:00:00",
    1,
    "2026-02-01T00:00:00",
  );
  const failed = await booking(1, 1, BigInt(500000), null);
  await db.paymentAttempt.create({
    data: {
      bookingId: failed.id,
      idempotencyKey: randomUUID(),
      outcome: "FAILED",
      amount: failed.total,
      bookingVersion: 0,
      createdAt: day("2026-01-02T12:00:00"),
    },
  });
  const retried = await booking(0, 0, BigInt(600000), "2026-01-03T00:00:00");
  await db.paymentAttempt.create({
    data: {
      bookingId: retried.id,
      idempotencyKey: randomUUID(),
      outcome: "FAILED",
      amount: retried.total,
      bookingVersion: 0,
      createdAt: day("2026-01-02T23:59:00"),
    },
  });
  await booking(1, 1, BigInt("9007199254740993"), "2027-07-01T12:00:00");
  await booking(1, 1, BigInt(20000), null);
  const range = { from: "2026-01-01", to: "2026-01-02" };
  await expect(await req(endpoint(range)), 401, "Anonymous reports denied");
  await expect(
    await req(endpoint({ ...range, format: "csv" })),
    401,
    "Anonymous export denied",
  );
  await expect(
    await req(endpoint(range), customer),
    403,
    "Customer reports denied",
  );
  await expect(
    await req(endpoint({ ...range, format: "csv" }), customer),
    403,
    "Customer export denied",
  );
  let report: RevenueReport = await expect(
    await req(endpoint(range), admin),
    200,
    "Admin revenue report",
  );
  totals(
    report.summary,
    "1000000",
    "200000",
    "800000",
    "Totals without failed attempts or double joins",
  );
  check(
    report.summary.paidOrders === "4" &&
      report.summary.refundedOrders === "1" &&
      report.summary.soldSeats === "8" &&
      report.summary.refundedSeats === "2",
    "Independent event/order/seat counts",
  );
  reconcile(report);
  check(
    report.time.length === 2 &&
      report.time[0].key === "2026-01-01" &&
      report.time[1].key === "2026-01-02",
    "Day buckets",
  );
  totals(
    report.time[0],
    "300000",
    "0",
    "300000",
    "Vietnam midnight and end-of-day",
  );
  totals(
    report.time[1],
    "700000",
    "200000",
    "500000",
    "Refund goes to its own day",
  );
  totals(
    report.movies.find((r) => r.key === movies[0])!,
    "700000",
    "200000",
    "500000",
    "Movie group",
  );
  totals(
    report.cinemas.find((r) => r.key === cinemas[0])!,
    "600000",
    "200000",
    "400000",
    "Cinema group",
  );
  check(
    !JSON.stringify(report).includes(users[3]) &&
      !JSON.stringify(report).includes(failed.code),
    "Report excludes customer IDs and order codes",
  );
  const onlyMovie: RevenueReport = await expect(
    await req(endpoint({ ...range, movie: movies[0] }), admin),
    200,
    "Filter movie",
  );
  totals(
    onlyMovie.summary,
    "700000",
    "200000",
    "500000",
    "Filtered movie totals",
  );
  const combined: RevenueReport = await expect(
    await req(
      endpoint({ ...range, movie: movies[0], cinema: cinemas[0] }),
      admin,
    ),
    200,
    "Combined filters",
  );
  totals(combined.summary, "300000", "200000", "100000", "Combined totals");
  const firstDay: RevenueReport = await expect(
    await req(endpoint({ from: "2026-01-01", to: "2026-01-01" }), admin),
    200,
    "Inclusive first day",
  );
  totals(firstDay.summary, "300000", "0", "300000", "Lower boundary inclusive");
  const nextDay: RevenueReport = await expect(
    await req(endpoint({ from: "2026-01-03", to: "2026-01-03" }), admin),
    200,
    "Next day boundary",
  );
  totals(
    nextDay.summary,
    "600000",
    "0",
    "600000",
    "Upper boundary excluded from previous report",
  );
  const refundDay: RevenueReport = await expect(
    await req(endpoint({ from: "2026-02-01", to: "2026-02-01" }), admin),
    200,
    "Refund-only period",
  );
  totals(
    refundDay.summary,
    "0",
    "400000",
    "-400000",
    "Refund from previous period gives negative net",
  );
  check(
    refundDay.summary.paidOrders === "0" &&
      refundDay.summary.refundedOrders === "1",
    "Refund counts do not imply same-period payment",
  );
  reconcile(refundDay);
  const month: RevenueReport = await expect(
    await req(endpoint({ ...range, bucket: "month" }), admin),
    200,
    "Monthly groups",
  );
  check(
    month.time.length === 1 && month.time[0].key === "2026-01",
    "Monthly bucket in Vietnam time",
  );
  totals(
    month.summary,
    "1000000",
    "200000",
    "800000",
    "Monthly totals equal daily",
  );
  const partial: RevenueReport = await expect(
    await req(
      endpoint({ from: "2026-01-31", to: "2026-02-02", bucket: "month" }),
      admin,
    ),
    200,
    "Partial months",
  );
  check(
    partial.time.length === 2 &&
      partial.time[0].gross === "0" &&
      partial.time[1].net === "-400000",
    "Zero-fill partial months",
  );
  const large: RevenueReport = await expect(
    await req(
      endpoint({ from: "2027-07-01", to: "2027-07-01", movie: movies[1] }),
      admin,
    ),
    200,
    "BigInt precision",
  );
  totals(
    large.summary,
    "9007199254740993",
    "0",
    "9007199254740993",
    "Amounts remain exact beyond JS safe integer",
  );
  check(
    money(large.summary.gross, "vi").replace(/\D/g, "") === "9007199254740993",
    "UI currency formatting preserves digits",
  );
  const empty: RevenueReport = await expect(
    await req(endpoint({ from: "2030-01-01", to: "2030-01-03" }), admin),
    200,
    "Empty range",
  );
  check(
    empty.summary.gross === "0" &&
      empty.movies.length === 0 &&
      empty.time.length === 3 &&
      empty.time.every((r) => r.net === "0"),
    "Empty state and zero-filled days",
  );
  const leap: RevenueReport = await expect(
    await req(endpoint({ from: "2024-01-01", to: "2024-12-31" }), admin),
    200,
    "366-day leap year",
  );
  check(leap.time.length === 366, "Maximum supported range");
  for (const invalid of [
    { from: "2026-02-31", to: "2026-03-01" },
    { from: "2026-02-02", to: "2026-02-01" },
    { from: "bad", to: "2026-01-02" },
    { from: "2026-01-01", to: "2027-01-02" },
    { ...range, bucket: "week" },
    { ...range, movie: "' OR 1=1" },
    { ...range, cinema: randomUUID() },
  ])
    await expect(
      await req(endpoint(invalid), admin),
      400,
      "Invalid filters rejected",
    );
  const defaults: RevenueReport = await expect(
    await req("/api/reports/revenue", admin),
    200,
    "Default range",
  );
  check(
    defaults.from.endsWith("-01") &&
      defaults.to ===
        new Date(Date.parse(defaults.generatedAt) + 7 * 3600000)
          .toISOString()
          .slice(0, 10),
    "Default current Vietnam month-to-date",
  );
  const a: RevenueReport = await expect(
    await req(endpoint(range), staffA),
    200,
    "Staff own cinema",
  );
  totals(a.summary, "600000", "200000", "400000", "Staff A scope");
  check(
    a.role === "STAFF" &&
      a.cinema === cinemas[0] &&
      a.options.cinemas.length === 1 &&
      a.cinemas.every((c) => c.key === cinemas[0]),
    "Staff DTO/options do not reveal other cinema",
  );
  const b: RevenueReport = await expect(
    await req(endpoint(range), staffB),
    200,
    "Staff B scope",
  );
  totals(b.summary, "400000", "0", "400000", "Staff B scope");
  await expect(
    await req(endpoint({ ...range, cinema: cinemas[1] }), staffA),
    403,
    "Staff cannot override branch",
  );
  await expect(
    await req(
      endpoint({ ...range, cinema: cinemas[1], format: "csv" }),
      staffA,
    ),
    403,
    "CSV enforces same branch scope",
  );
  const csvResponse = await req(
      endpoint({ ...range, format: "csv", locale: "vi" }),
      admin,
    ),
    csv = await csvResponse.text();
  check(
    csvResponse.status === 200 &&
      csvResponse.headers.get("content-type")?.includes("text/csv") &&
      csvResponse.headers.get("content-disposition")?.includes("attachment"),
    "CSV download headers",
  );
  check(
    csvResponse.headers.get("cache-control")?.includes("no-store") &&
      csvResponse.headers.get("vary")?.includes("Cookie"),
    "Financial report is private/no-store",
  );
  check(
    csv.includes('"\'=SUM(1,2) Phim QA"') && csv.includes('"Rạp ""QA"", B"'),
    "CSV guards formulas and escapes quotes/commas",
  );
  check(
    !csv.includes(failed.code) && !csv.includes(`${prefix}-3@example.test`),
    "CSV contains no customer/order details",
  );
  const negativeCsv = await (
    await req(
      endpoint({
        from: "2026-02-01",
        to: "2026-02-01",
        format: "csv",
        locale: "en",
      }),
      admin,
    )
  ).text();
  check(
    negativeCsv.includes('"-400000"') && negativeCsv.includes('"Group"'),
    "Negative numeric amounts remain numeric in English CSV",
  );
  // Attribution stays on the original order even if a refunded show is reclassified.
  await db.showtime.update({
    where: { id: shifted.showtimeId },
    data: { movieId: movies[1], auditoriumId: rooms[1].id },
  });
  report = await expect(
    await req(endpoint(range), admin),
    200,
    "Report after show edit",
  );
  totals(
    report.movies.find((r) => r.key === movies[0])!,
    "700000",
    "200000",
    "500000",
    "Movie attribution stays with original order",
  );
  totals(
    report.cinemas.find((r) => r.key === cinemas[0])!,
    "600000",
    "200000",
    "400000",
    "Cinema attribution stays with original order",
  );
  await db.movie.update({
    where: { id: movies[1] },
    data: { status: "ARCHIVED" },
  });
  await db.cinema.update({
    where: { id: cinemas[1] },
    data: { active: false },
  });
  const archived: RevenueReport = await expect(
    await req(endpoint({ ...range, movie: movies[1] }), admin),
    200,
    "Archived movie remains in reports",
  );
  totals(
    archived.summary,
    "300000",
    "0",
    "300000",
    "Archived movie history preserved",
  );
  await expect(
    await req(endpoint(range), staffB),
    403,
    "Inactive assigned cinema denied",
  );
  await db.cinema.update({ where: { id: cinemas[1] }, data: { active: true } });
  await db.staffAssignment.update({
    where: { userId: users[1] },
    data: { cinemaId: cinemas[1] },
  });
  const reassigned: RevenueReport = await expect(
    await req(endpoint(range), staffA),
    200,
    "Staff reassignment rechecked",
  );
  totals(reassigned.summary, "400000", "0", "400000", "New assignment scope");
  await expect(
    await req(endpoint({ ...range, cinema: cinemas[0] }), staffA),
    403,
    "Old branch access revoked",
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
    await req(endpoint(range), staffA),
    428,
    "Temporary password denied",
  );
  await db.user.update({
    where: { id: users[1] },
    data: { mustChangePassword: false, status: "LOCKED" },
  });
  await expect(await req(endpoint(range), staffA), 401, "Locked staff denied");
  await db.user.update({ where: { id: users[1] }, data: { status: "ACTIVE" } });
  for (const locale of ["vi", "en"]) {
    check(
      (
        await req(
          `/${locale}/admin/reports?${new URLSearchParams(range)}`,
          admin,
        )
      ).status === 200,
      "Admin report page renders",
    );
    check(
      (
        await req(
          `/${locale}/staff/reports?${new URLSearchParams(range)}`,
          staffA,
        )
      ).status === 200,
      "Staff report page renders",
    );
  }
  const badPage = await req("/vi/admin/reports?from=bad", admin);
  check(
    badPage.status === 200 &&
      (await badPage.text()).includes("Ngày chưa hợp lệ"),
    "Invalid page filter has recoverable error state",
  );
  if (process.argv.includes("--ui")) {
    await writeFile(
      ".qa/revenue-ui.json",
      JSON.stringify({ users, movies, cinemas, shows }),
    );
    kept = true;
  }
  console.log(
    `Revenue integration passed: ${checks} checks. ${kept ? "QA fixture retained for screenshots." : "All QA data is cleaned up."}`,
  );
}
main().finally(async () => {
  if (!kept) {
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
    await db.movieGenre.deleteMany({ where: { movieId: { in: movies } } });
    await db.movieTranslation.deleteMany({
      where: { movieId: { in: movies } },
    });
    await db.movie.deleteMany({ where: { id: { in: movies } } });
    await db.cinema.deleteMany({ where: { id: { in: cinemas } } });
  }
  await db.$disconnect();
});
