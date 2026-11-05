import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Only add fixtures to this project's local demo DB. Never move or reopen existing sessions.
const url = new URL(process.env.DATABASE_URL || "http://unconfigured");
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/cinereserve"
)
  throw new Error("Project local demo database only.");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=UTC",
  }),
});
const slugs = [
  "the-wild-robot",
  "dune-part-two",
  "interstellar",
  "spirited-away",
];
async function main() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const days = Array.from({ length: 6 }, (_, index) =>
    new Date(new Date(`${today}T12:00:00+07:00`).getTime() + index * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261102)`;
      const movies = await tx.movie.findMany({
        where: {
          slug: { in: slugs },
          status: { in: ["NOW_SHOWING", "COMING_SOON"] },
        },
      });
      assert.equal(
        movies.length,
        slugs.length,
        "Expected four public demo movies",
      );
      const branches = await tx.cinema.findMany({
        where: { code: { in: ["ha-noi", "bac-ninh"] }, active: true },
        include: {
          auditoriums: {
            where: { active: true },
            include: { seats: true },
            orderBy: { code: "asc" },
          },
        },
        orderBy: { code: "asc" },
      });
      assert.equal(branches.length, 2, "Expected both active demo branches");
      let created = 0,
        existing = 0,
        conflicts = 0,
        tooLate = 0;
      const samples: {
        id: string;
        slug: string;
        cinema: string;
        day: string;
        time: string;
        seats: number;
      }[] = [];
      for (const branch of branches) {
        const rooms = branch.auditoriums.filter((room) =>
          room.seats.some((seat) => seat.isSellable),
        );
        assert.ok(rooms.length, "Need a room with sellable seats");
        for (const day of days)
          for (const [index, slug] of slugs.entries()) {
            const time = ["10:00", "13:00", "17:00", "20:00"][index];
            const startsAt = new Date(`${day}T${time}:00+07:00`);
            if (+startsAt < Date.now() + 30 * 60000) {
              tooLate++;
              continue;
            }
            const seedKey = `demo-upcoming-v1:${branch.code}:${day}:${slug}`;
            if (
              await tx.showtime.findUnique({
                where: { seedKey },
                select: { id: true },
              })
            ) {
              existing++;
              continue;
            }
            const movie = movies.find((m) => m.slug === slug)!;
            const endsAt = new Date(+startsAt + movie.durationMinutes * 60000);
            const cleanupEndsAt = new Date(+endsAt + 20 * 60000);
            let room: (typeof rooms)[number] | undefined;
            for (let offset = 0; offset < rooms.length; offset++) {
              const candidate = rooms[(index + offset) % rooms.length];
              const overlaps = await tx.showtime.count({
                where: {
                  auditoriumId: candidate.id,
                  status: { not: "CANCELLED" },
                  startsAt: { lt: cleanupEndsAt },
                  cleanupEndsAt: { gt: startsAt },
                },
              });
              if (!overlaps) {
                room = candidate;
                break;
              }
            }
            if (!room) {
              conflicts++;
              continue;
            }
            const show = await tx.showtime.create({
              data: {
                seedKey,
                movieId: movie.id,
                auditoriumId: room.id,
                startsAt,
                endsAt,
                cleanupEndsAt,
                salesCutoffAt: new Date(+startsAt - 10 * 60000),
                basePrice: branch.code === "ha-noi" ? 90000 : 80000,
                vipSurcharge: 20000,
                durationSnapshot: movie.durationMinutes,
                ageRatingSnapshot: movie.ageRatingCode,
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
            created++;
            samples.push({
              id: show.id,
              slug,
              cinema: branch.code,
              day,
              time,
              seats: room.seats.filter((seat) => seat.isSellable).length,
            });
          }
      }
      return { created, existing, conflicts, tooLate, days, samples };
    },
    { maxWait: 10000, timeout: 30000 },
  );
  assert.ok(
    result.created + result.existing > 0,
    "No sample schedule available",
  );
  for (const sample of result.samples) {
    const show = await db.showtime.findUniqueOrThrow({
      where: { id: sample.id },
      include: { _count: { select: { seats: true } } },
    });
    assert.ok(
      show._count.seats >= sample.seats && sample.seats > 0,
      "Seat snapshot present",
    );
    assert.equal(
      show.salesCutoffAt.getTime(),
      show.startsAt.getTime() - 600000,
    );
  }
  console.log(
    JSON.stringify(
      {
        ...result,
        samples: result.samples.filter(
          (sample) => sample.slug === "the-wild-robot",
        ),
      },
      null,
      2,
    ),
  );
}
main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
