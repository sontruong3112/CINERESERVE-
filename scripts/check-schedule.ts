import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  validDay,
  searchText,
  scheduleDays,
  bookingQuery,
} from "../src/lib/schedule";

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
  throw new Error("Project local QA only");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=UTC",
  }),
});
let prefix = `qa-schedule-${randomBytes(5).toString("hex")}`,
  kept = false,
  checks = 0;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function html(path: string) {
  const response = await fetch(`http://localhost:3001${path}`);
  check(response.status === 200, `HTTP ${path}`);
  return (await response.text()).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
}
async function cleanup() {
  const movies = await db.movie.findMany({
    where: { slug: { startsWith: prefix } },
    select: { id: true },
  });
  await db.showtime.deleteMany({
    where: { movieId: { in: movies.map((m) => m.id) } },
  });
  await db.movieTranslation.deleteMany({
    where: { movieId: { in: movies.map((m) => m.id) } },
  });
  await db.movie.deleteMany({ where: { id: { in: movies.map((m) => m.id) } } });
  await db.auditorium.deleteMany({ where: { cinema: { code: prefix } } });
  await db.cinema.deleteMany({ where: { code: prefix } });
}
async function main() {
  if (process.argv.includes("--cleanup-ui")) {
    const saved = JSON.parse(await readFile(".qa/schedule-ui.json", "utf8"));
    if (!/^qa-schedule-[a-f0-9]{10}$/.test(saved.prefix))
      throw new Error("Invalid QA prefix");
    prefix = saved.prefix;
    await cleanup();
    await unlink(".qa/schedule-ui.json");
    return;
  }
  const { getScheduleOptions, getShowtimes } =
    await import("../src/lib/catalogue-repository");
  for (const day of [
    "2026-02-30",
    "2026-13-01",
    "2026-00-01",
    "2026-1-01",
    "invalid",
    "2026-01-01T00:00:00Z",
  ])
    check(!validDay(day), `Reject ${day}`);
  check(validDay("2028-02-29"), "Leap year");
  check(!validDay("2027-02-29"), "Reject non-leap year");
  check(
    searchText("  Đường Đến Bầu Trời  ") === "duong den bau troi",
    "Vietnamese search",
  );
  const branch = await db.cinema.create({
    data: {
      code: prefix,
      name: "QA · Rạp thử lịch chiếu",
      addressVi: "Dữ liệu kiểm thử",
      addressEn: "Test data",
      areaVi: "QA",
      areaEn: "QA",
      auditoriums: {
        create: [
          { code: "A", name: "QA Room A" },
          { code: "B", name: "QA Room B" },
          { code: "C", name: "QA Inactive", active: false },
        ],
      },
    },
    include: { auditoriums: { orderBy: { code: "asc" } } },
  });
  const movie = await db.movie.create({
    data: {
      slug: prefix,
      originalTitle: "QA Schedule",
      durationMinutes: 60,
      ageRatingCode: "P",
      year: 2026,
      director: "QA",
      posterUrl: "/brand/cinereserve-mark.svg",
      backdropUrl: "/brand/cinereserve-mark.svg",
      accent: "#edc076",
      status: "COMING_SOON",
      translations: {
        create: [
          {
            locale: "vi",
            title: "QA · Đường đến bầu trời",
            synopsis: "Dữ liệu kiểm thử lịch chiếu.",
          },
          {
            locale: "en",
            title: "QA · Road to the sky",
            synopsis: "Schedule test data.",
          },
        ],
      },
    },
  });
  // 00:30 in Vietnam, still the previous UTC date, and more than five days away.
  const day = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const startsAt = new Date(`${day}T00:30:00+07:00`);
  const show = await db.showtime.create({
    data: {
      movieId: movie.id,
      auditoriumId: branch.auditoriums[0].id,
      startsAt,
      endsAt: new Date(+startsAt + 3600000),
      cleanupEndsAt: new Date(+startsAt + 4800000),
      salesCutoffAt: new Date(+startsAt - 600000),
      basePrice: 90000,
      vipSurcharge: 20000,
      durationSnapshot: 60,
      ageRatingSnapshot: "P",
      status: "ON_SALE",
    },
  });
  await db.showtime.create({
    data: {
      movieId: movie.id,
      auditoriumId: branch.auditoriums[1].id,
      startsAt,
      endsAt: show.endsAt,
      cleanupEndsAt: show.cleanupEndsAt,
      salesCutoffAt: show.salesCutoffAt,
      basePrice: 80000,
      vipSurcharge: 20000,
      durationSnapshot: 60,
      ageRatingSnapshot: "P",
      status: "ON_SALE",
    },
  });
  let options = await getScheduleOptions(prefix);
  check(
    options.length === 1 && options[0].day === day,
    "Unique local dates across rooms; presale included",
  );
  check(
    scheduleDays(options, prefix, branch.code)[0] === day,
    "Actual date beyond five days",
  );
  check(
    (await getShowtimes(prefix, day, branch.code)).length === 2,
    "Actual sessions for local midnight",
  );
  check(
    (await getShowtimes(prefix, "2026-02-30")).length === 0,
    "Invalid date does not reach Prisma",
  );
  const query = bookingQuery(branch.code, day);
  const list = await html(
    `/vi/movies${query}&q=duong+den+bau+troi&status=soon`,
  );
  check(
    list.includes(`/${prefix}?cinema=${prefix}&amp;date=${day}`),
    "List card retains cinema and date; accent-free match",
  );
  const detail = await html(`/vi/movies/${prefix}${query}`);
  const defaultDetail = await html(`/vi/movies/${prefix}`);
  check(defaultDetail.includes(`/showtimes/${show.id}/seats`) && defaultDetail.includes('aria-current="date"'), "Opening a movie without query chooses its first real on-sale date");
  check(
    detail.includes(`/showtimes/${show.id}/seats`),
    "Presale session bookable beyond fixed five days",
  );
  check(
    detail.includes('aria-current="date"') && detail.includes(`date=${day}`),
    "Selected date retained",
  );
  const schedule = detail.slice(detail.indexOf('id="showtimes"'));
  check(
    !schedule.includes("<form") && !schedule.includes('type="date"'),
    "Direct schedule choices need no form or date input",
  );
  check(
    schedule.includes(`href="/vi/movies/${prefix}?date=${day}#showtimes"`),
    "All cinemas choice retains the selected day",
  );
  check(
    schedule.includes('aria-current="true"'),
    "Selected cinema has an accessible active state",
  );
  const allCinemas = await html(`/vi/movies/${prefix}?date=${day}`);
  check(
    allCinemas.includes("QA Room A") &&
      !allCinemas.includes("Không có suất còn mở bán trong ngày này."),
    "All cinemas groups matching sessions without empty cinema blocks",
  );
  check(
    detail.includes("QA Room A") && detail.includes("QA Room B"),
    "Room names shown",
  );
  const emptyDay = "2099-01-01";
  const empty = await html(`/vi/movies/${prefix}?date=${emptyDay}`);
  check(
    empty.includes(`date=${emptyDay}`) &&
      empty.includes('aria-current="date"') &&
      empty.includes("Chưa có suất mở bán phù hợp"),
    "Explicit empty date never resets silently",
  );
  for (const query of ["date=2026-02-30", "cinema=unknown"]) {
    const page = await html(`/vi/movies/${prefix}?${query}`);
    check(
      page.includes("Ngày hoặc rạp không hợp lệ"),
      "Invalid detail filters",
    );
    check(
      !page.includes(`/showtimes/${show.id}/seats`),
      "Invalid filters never expose different sessions",
    );
  }
  const invalidList = await html("/vi/movies?date=2026-02-30");
  check(
    invalidList.includes("Bộ lọc không hợp lệ"),
    "Invalid list filter explained",
  );
  check(
    !(await html(`/vi/movies?cinema=${prefix}&date=${emptyDay}`)).includes(
      `href="/vi/movies/${prefix}?`,
    ),
    "No false matches on empty day",
  );
  const en = await html(`/en/movies/${prefix}${query}`);
  check(
    en.includes("Choose a session") && en.includes("All cinemas"),
    "English calendar",
  );
  await db.movie.update({ where: { id: movie.id }, data: { status: "DRAFT" } });
  check(
    (await getScheduleOptions(prefix)).length === 0,
    "Draft movie excluded",
  );
  check(
    (await getShowtimes(prefix, day)).length === 0,
    "Draft movie cannot leak sessions",
  );
  await db.movie.update({
    where: { id: movie.id },
    data: { status: "COMING_SOON" },
  });
  await db.cinema.update({ where: { id: branch.id }, data: { active: false } });
  check(
    (await getScheduleOptions(prefix)).length === 0,
    "Inactive cinema excluded",
  );
  await db.cinema.update({ where: { id: branch.id }, data: { active: true } });
  await db.auditorium.updateMany({
    where: { cinemaId: branch.id },
    data: { active: false },
  });
  check(
    (await getScheduleOptions(prefix)).length === 0,
    "Inactive rooms excluded",
  );
  await db.auditorium.updateMany({
    where: { id: { in: branch.auditoriums.slice(0, 2).map((r) => r.id) } },
    data: { active: true },
  });
  await db.showtime.updateMany({
    where: { movieId: movie.id },
    data: { status: "CANCELLED" },
  });
  check(
    (await getScheduleOptions(prefix)).length === 0,
    "Cancelled sessions excluded",
  );
  const closingStart = new Date(Date.now() + 5 * 60000);
  await db.showtime.updateMany({
    where: { movieId: movie.id },
    data: {
      status: "ON_SALE",
      startsAt: closingStart,
      endsAt: new Date(+closingStart + 3600000),
      cleanupEndsAt: new Date(+closingStart + 4800000),
      salesCutoffAt: new Date(+closingStart - 600000),
    },
  });
  check(
    (await getScheduleOptions(prefix)).length === 0,
    "Cutoff excluded from quick booking",
  );
  check(
    (await getShowtimes(prefix, day)).length === 0,
    "Cutoff excluded from detail",
  );
  await db.showtime.updateMany({
    where: { movieId: movie.id },
    data: {
      startsAt: show.startsAt,
      endsAt: show.endsAt,
      cleanupEndsAt: show.cleanupEndsAt,
      salesCutoffAt: show.salesCutoffAt,
    },
  });
  options = await getScheduleOptions(prefix);
  check(options.length === 1, "On-sale restored");
  check(
    (await getScheduleOptions("' OR 1=1 --")).length === 0,
    "Parameterized movie filter",
  );
  if (process.argv.includes("--keep-ui")) {
    await writeFile(
      ".qa/schedule-ui.json",
      JSON.stringify({ prefix, day, showId: show.id }),
    );
    kept = true;
  }
  console.log(
    `Schedule checks passed: ${checks}. ${kept ? "Temporary UI fixture retained." : "QA data cleaned in finally."}`,
  );
}
main()
  .finally(async () => {
    try {
      if (!kept) await cleanup();
    } finally {
      await db.$disconnect();
      const { getDb } = await import("../src/lib/db");
      await getDb().$disconnect();
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
