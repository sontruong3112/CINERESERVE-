import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { movies, cinemas, genreNames, getDemoDays } from "../src/lib/catalogue";

if (process.env.ALLOW_DEMO_SEED !== "true")
  throw new Error(
    "Set ALLOW_DEMO_SEED=true only for a disposable development database.",
  );
if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seed() {
  // Only insert known fixture keys. Re-running does not overwrite edited data.
  for (const [code, labels] of Object.entries(genreNames)) {
    await db.genre.upsert({
      where: { code },
      update: {},
      create: { code, nameVi: labels.vi, nameEn: labels.en },
    });
  }
  for (const movie of movies) {
    await db.movie.upsert({
      where: { slug: movie.slug },
      update: {},
      create: {
        slug: movie.slug,
        originalTitle: movie.originalTitle,
        durationMinutes: movie.duration,
        ageRatingCode: movie.age,
        year: movie.year,
        director: movie.director,
        posterUrl: movie.poster,
        backdropUrl: movie.backdrop,
        accent: movie.accent,
        status: movie.status === "now" ? "NOW_SHOWING" : "COMING_SOON",
        translations: {
          create: (["vi", "en"] as const).map((locale) => ({
            locale,
            title: movie.title[locale],
            synopsis: movie.synopsis[locale],
          })),
        },
        genres: {
          create: movie.genre.map((code) => ({ genre: { connect: { code } } })),
        },
      },
    });
  }
  const stored = await db.movie.findMany({
    where: { status: "NOW_SHOWING" },
    orderBy: { slug: "asc" },
  });
  for (const cinema of cinemas) {
    const branch = await db.cinema.upsert({
      where: { code: cinema.code },
      update: {},
      create: {
        code: cinema.code,
        name: cinema.name,
        addressVi: cinema.address.vi,
        addressEn: cinema.address.en,
        areaVi: cinema.area.vi,
        areaEn: cinema.area.en,
      },
    });
    for (let room = 1; room <= cinema.rooms; room++) {
      const auditorium = await db.auditorium.upsert({
        where: { cinemaId_code: { cinemaId: branch.id, code: `P${room}` } },
        update: {},
        create: { cinemaId: branch.id, code: `P${room}`, name: `P${room}` },
      });
      await db.seat.createMany({
        skipDuplicates: true,
        data: ["A", "B", "C", "D"].flatMap((rowLabel) =>
          Array.from({ length: 8 }, (_, i) => ({
            auditoriumId: auditorium.id,
            rowLabel,
            seatNumber: i + 1,
            type:
              rowLabel === "C" || rowLabel === "D"
                ? ("VIP" as const)
                : ("STANDARD" as const),
          })),
        ),
      });
      const movie = stored[(room - 1) % stored.length];
      if (!movie) continue;
      for (const day of getDemoDays()) {
        for (const time of ["10:00", "14:00", "18:00"]) {
          const startsAt = new Date(`${day}T${time}:00+07:00`);
          const endsAt = new Date(
            startsAt.getTime() + movie.durationMinutes * 60000,
          );
          const seedKey = `${cinema.code}-${room}-${day}-${time}`;
          const showtime = await db.showtime.upsert({
            where: { seedKey },
            update: {},
            create: {
              seedKey,
              movieId: movie.id,
              auditoriumId: auditorium.id,
              startsAt,
              endsAt,
              cleanupEndsAt: new Date(endsAt.getTime() + 20 * 60000),
              salesCutoffAt: new Date(startsAt.getTime() - 10 * 60000),
              basePrice: cinema.code === "ha-noi" ? 90000 : 80000,
              vipSurcharge: 20000,
              durationSnapshot: movie.durationMinutes,
              ageRatingSnapshot: movie.ageRatingCode,
              status: "ON_SALE",
            },
          });
          // Snapshot once; reruns do not change existing auditorium layouts.
          if (
            (await db.showtimeSeat.count({
              where: { showtimeId: showtime.id },
            })) === 0
          ) {
            const seats = await db.seat.findMany({
              where: { auditoriumId: showtime.auditoriumId },
            });
            await db.showtimeSeat.createMany({
              data: seats.map((s) => ({
                showtimeId: showtime.id,
                seatId: s.id,
                rowLabel: s.rowLabel,
                seatNumber: s.seatNumber,
                type: s.type,
                isSellable: s.isSellable,
              })),
              skipDuplicates: true,
            });
          }
        }
      }
    }
  }
  console.log(
    "Seed complete: sample catalogue and scheduled sessions inserted without deleting existing data.",
  );
}
seed().finally(() => db.$disconnect());
