import "server-only";
import { cache } from "react";
import { getDb } from "./db";
import {
  movies as demoMovies,
  cinemas as demoCinemas,
  type Movie,
  type Genre,
} from "./catalogue";
import { validDay, type ScheduleOption } from "./schedule";

export const getCatalogue = cache(async () => {
  if (process.env.CATALOGUE_SOURCE !== "database")
    return {
      movies: demoMovies,
      cinemas: demoCinemas,
      source: "demo" as const,
    };
  const [records, branches] = await Promise.all([
    getDb().movie.findMany({
      where: { status: { in: ["NOW_SHOWING", "COMING_SOON"] } },
      include: { translations: true, genres: { include: { genre: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getDb().cinema.findMany({
      where: { active: true },
      include: { _count: { select: { auditoriums: true } } },
      orderBy: { code: "desc" },
    }),
  ]);
  const movies: Movie[] = records.map((record) => {
    const vi = record.translations.find(
      (translation) => translation.locale === "vi",
    );
    const en =
      record.translations.find((translation) => translation.locale === "en") ??
      vi;
    return {
      slug: record.slug,
      title: {
        vi: vi?.title ?? record.originalTitle,
        en: en?.title ?? record.originalTitle,
      },
      originalTitle: record.originalTitle,
      duration: record.durationMinutes,
      age: record.ageRatingCode,
      status: record.status === "NOW_SHOWING" ? "now" : "soon",
      year: record.year,
      director: record.director,
      synopsis: { vi: vi?.synopsis ?? "", en: en?.synopsis ?? "" },
      genre: record.genres.map((entry) => entry.genre.code as Genre),
      poster: record.posterUrl,
      backdrop: record.backdropUrl,
      accent: record.accent,
    };
  });
  return {
    movies,
    cinemas: branches.map((branch) => ({
      code: branch.code,
      name: branch.name,
      area: { vi: branch.areaVi, en: branch.areaEn },
      address: { vi: branch.addressVi, en: branch.addressEn },
      rooms: branch._count.auditoriums,
    })),
    source: "database" as const,
  };
});

export async function getShowtimes(slug: string, day: string, cinema?: string) {
  if (process.env.CATALOGUE_SOURCE !== "database" || !validDay(day)) return [];
  const startsAt = new Date(`${day}T00:00:00+07:00`);
  return getDb().showtime.findMany({
    where: {
      movie: { slug, status: { in: ["NOW_SHOWING", "COMING_SOON"] } },
      status: "ON_SALE",
      startsAt: { gte: startsAt, lt: new Date(startsAt.getTime() + 86400000) },
      salesCutoffAt: { gt: new Date() },
      auditorium: {
        active: true,
        cinema: { active: true, ...(cinema ? { code: cinema } : {}) },
      },
    },
    include: { auditorium: { include: { cinema: true } } },
    orderBy: { startsAt: "asc" },
  });
}

// Aggregate public combinations in PostgreSQL; never send seat/customer records to the client.
export const getScheduleOptions = cache(
  async (slug?: string): Promise<ScheduleOption[]> => {
    if (process.env.CATALOGUE_SOURCE !== "database") return [];
    return getDb().$queryRaw<ScheduleOption[]>`
    SELECT DISTINCT m.slug AS movie, c.code AS cinema,
      to_char(s."startsAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day
    FROM "Showtime" s JOIN "Movie" m ON m.id = s."movieId"
    JOIN "Auditorium" a ON a.id = s."auditoriumId"
    JOIN "Cinema" c ON c.id = a."cinemaId"
    WHERE s.status = 'ON_SALE' AND s."salesCutoffAt" > CURRENT_TIMESTAMP
      AND s."startsAt" > CURRENT_TIMESTAMP AND a.active = true AND c.active = true
      AND m.status IN ('NOW_SHOWING', 'COMING_SOON')
      AND (${slug ?? null}::text IS NULL OR m.slug = ${slug ?? null})
    ORDER BY day, cinema, movie
  `;
  },
);
