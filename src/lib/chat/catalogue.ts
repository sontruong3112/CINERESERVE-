import "server-only";
import { getDb } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import type { ChatMovie } from "./shared";

export async function chatDirectory(locale: Locale) {
  const db = getDb();
  const [movies, cinemas, genres] = await Promise.all([
    db.movie.findMany({
      where: { status: { in: ["NOW_SHOWING", "COMING_SOON"] } },
      select: {
        id: true,
        originalTitle: true,
        director: true,
        ageRatingCode: true,
        genres: { select: { genre: { select: { code: true } } } },
        translations: { select: { locale: true, title: true, synopsis: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.cinema.findMany({
      where: { active: true },
      select: { id: true, name: true, areaVi: true, areaEn: true },
      orderBy: { code: "asc" },
      take: 30,
    }),
    db.genre.findMany({
      select: { code: true, nameVi: true, nameEn: true },
      take: 40,
    }),
  ]);
  return {
    movies: movies.map((m) => ({
      id: m.id,
      title:
        m.translations.find((t) => t.locale === locale)?.title ||
        m.originalTitle,
      originalTitle: m.originalTitle,
      director: m.director,
      age: m.ageRatingCode,
      genres: m.genres.map((g) => g.genre.code),
      synopsis: (
        m.translations.find((t) => t.locale === locale)?.synopsis ||
        m.translations.find((t) => t.locale === "vi")?.synopsis ||
        ""
      ).slice(0, 400),
    })),
    cinemas,
    genres,
  };
}
export type Directory = Awaited<ReturnType<typeof chatDirectory>>;
export type SearchPlan = {
  intent: "recommend" | "schedule" | "policy" | "out_of_scope";
  movieIds: string[];
  cinemaId: string | null;
  date: string | null;
  genres: string[];
  age: number | null;
  unavailable: boolean;
};
export function ageAllowed(rating: string, age: number | null) {
  if (age === null) return true;
  if (rating === "P") return true;
  // K requires a guardian; without that information only recommend independently eligible titles.
  if (rating === "K") return age >= 13;
  const match = /^T(13|16|18)$/.exec(rating);
  return Boolean(match && age >= Number(match[1]));
}
export async function searchChatMovies(
  plan: SearchPlan,
  directory: Directory,
  locale: Locale,
  now: Date,
): Promise<ChatMovie[]> {
  const start = plan.date ? new Date(`${plan.date}T00:00:00+07:00`) : now;
  const end = new Date(start.getTime() + (plan.date ? 1 : 7) * 86400000);
  const sessionWhere = {
    status: "ON_SALE" as const,
    startsAt: { gte: start, lt: end },
    salesCutoffAt: { gt: now },
    auditorium: {
      active: true,
      cinema: { active: true, ...(plan.cinemaId ? { id: plan.cinemaId } : {}) },
    },
  };
  const records = await getDb().movie.findMany({
    where: {
      id: {
        in: plan.movieIds.length
          ? plan.movieIds
          : directory.movies.map((m) => m.id),
      },
      status: { in: ["NOW_SHOWING", "COMING_SOON"] },
      ...(plan.genres.length
        ? { genres: { some: { genre: { code: { in: plan.genres } } } } }
        : {}),
      ...(plan.intent === "schedule" || plan.date || plan.cinemaId
        ? { showtimes: { some: sessionWhere } }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      originalTitle: true,
      durationMinutes: true,
      ageRatingCode: true,
      translations: { select: { locale: true, title: true, synopsis: true } },
      genres: { select: { genre: { select: { nameVi: true, nameEn: true } } } },
      showtimes: {
        where: sessionWhere,
        orderBy: { startsAt: "asc" },
        take: 4,
        select: {
          id: true,
          startsAt: true,
          basePrice: true,
          vipSurcharge: true,
          auditorium: {
            select: { name: true, cinema: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return records
    .filter((m) => ageAllowed(m.ageRatingCode, plan.age))
    .slice(0, 12)
    .map((m) => {
      const t =
        m.translations.find((t) => t.locale === locale) ||
        m.translations.find((t) => t.locale === "vi");
      return {
        id: m.id,
        title: t?.title || m.originalTitle,
        href: `/${locale}/movies/${encodeURIComponent(m.slug)}#showtimes`,
        age: m.ageRatingCode,
        duration: m.durationMinutes,
        genres: m.genres.map((g) =>
          locale === "vi" ? g.genre.nameVi : g.genre.nameEn,
        ),
        synopsis: (t?.synopsis || "").slice(0, 700),
        sessions: m.showtimes.map((s) => ({
          id: s.id,
          href: `/${locale}/showtimes/${s.id}/seats`,
          startsAt: s.startsAt.toISOString(),
          cinema: s.auditorium.cinema.name,
          room: s.auditorium.name,
          basePrice: s.basePrice,
          vipSurcharge: s.vipSurcharge,
        })),
      };
    });
}
