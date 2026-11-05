import "server-only";
import { cancelShowtimeBookings } from "@/lib/booking/order-maintenance";
import { getDb } from "@/lib/db";
import { AuthError } from "@/lib/auth/session";
import { authFailure, authJson } from "@/lib/auth/http";
import type { Prisma } from "@/generated/prisma/client";
import { movieStatuses, type AdminMovie, type AdminShowtime } from "./shared";
import {
  createInventory,
  expireHolds,
  databaseNow,
} from "@/lib/booking/maintenance";

export class AdminError extends Error {
  constructor(
    public code: string,
    public status = 400,
    public detail?: string,
  ) {
    super(code);
  }
}
export function adminFailure(error: unknown) {
  if (error instanceof AdminError)
    return authJson({ error: error.code, detail: error.detail }, error.status);
  if (error instanceof AuthError) return authFailure(error);
  if ((error as { code?: string }).code === "P2002")
    return authJson({ error: "DUPLICATE_SLUG" }, 409);
  if (String(error).includes("Showtime_no_room_overlap"))
    return authJson({ error: "SCHEDULE_CONFLICT" }, 409);
  return authJson({ error: "SERVER_ERROR" }, 500);
}
const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function recordId(value: unknown): string {
  if (typeof value !== "string" || !idPattern.test(value))
    throw new AdminError("INVALID_INPUT");
  return value;
}
function text(value: unknown, min: number, max: number) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new AdminError("INVALID_INPUT");
  return value.trim();
}
function integer(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new AdminError("INVALID_INPUT");
  return value;
}
function imageUrl(value: unknown) {
  const input = text(value, 1, 1500);
  if (/^\/(?!\/)/.test(input) && !/[\\\x00-\x20]/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {}
  throw new AdminError("INVALID_INPUT");
}
const movieInclude = {
  translations: true,
  genres: { include: { genre: true } },
} as const;
type MovieRow = Prisma.MovieGetPayload<{ include: typeof movieInclude }>;
export function movieDto(row: MovieRow): AdminMovie {
  const vi = row.translations.find((t) => t.locale === "vi");
  const en = row.translations.find((t) => t.locale === "en");
  return {
    id: row.id,
    slug: row.slug,
    originalTitle: row.originalTitle,
    titleVi: vi?.title ?? "",
    titleEn: en?.title ?? "",
    synopsisVi: vi?.synopsis ?? "",
    synopsisEn: en?.synopsis ?? "",
    durationMinutes: row.durationMinutes,
    ageRatingCode: row.ageRatingCode,
    year: row.year,
    director: row.director,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    accent: row.accent,
    status: row.status,
    genres: row.genres.map((g) => g.genre.code),
    releaseDate: row.releaseDate?.toISOString().slice(0, 10) ?? "",
    version: row.version,
  };
}
const showtimeInclude = {
  movie: { include: { translations: true } },
  auditorium: { include: { cinema: true } },
} as const;
type ShowtimeRow = Prisma.ShowtimeGetPayload<{
  include: typeof showtimeInclude;
}>;
export function showtimeDto(row: ShowtimeRow): AdminShowtime {
  return {
    id: row.id,
    movieId: row.movieId,
    auditoriumId: row.auditoriumId,
    movieTitle:
      row.movie.translations.find((t) => t.locale === "vi")?.title ??
      row.movie.originalTitle,
    cinemaName: row.auditorium.cinema.name,
    roomName: row.auditorium.name,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    cleanupEndsAt: row.cleanupEndsAt.toISOString(),
    basePrice: row.basePrice,
    vipSurcharge: row.vipSurcharge,
    status: row.status,
    version: row.version,
    cancellationReason: row.cancellationReason,
  };
}

// Low-volume administrator writes are serialized so movie edits and schedule creation cannot race.
async function mutate<T>(
  actorId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return getDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(20261102)`;
      const actor = await tx.user.findUnique({ where: { id: actorId } });
      if (
        !actor ||
        actor.role !== "ADMIN" ||
        actor.status !== "ACTIVE" ||
        actor.mustChangePassword
      )
        throw new AdminError("FORBIDDEN", 403);
      return operation(tx);
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function audit(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  await tx.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      ...(before ? { beforeData: json(before) } : {}),
      afterData: json(after),
      reason,
    },
  });
}

function parseMovie(body: Record<string, unknown>) {
  const slug = text(body.slug, 1, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new AdminError("INVALID_INPUT");
  const status = body.status;
  if (!movieStatuses.includes(status as never))
    throw new AdminError("INVALID_INPUT");
  const genres = body.genres;
  if (
    !Array.isArray(genres) ||
    genres.length < 1 ||
    genres.length > 4 ||
    new Set(genres).size !== genres.length ||
    genres.some(
      (g) => !["adventure", "animation", "drama", "scifi"].includes(g),
    )
  )
    throw new AdminError("INVALID_INPUT");
  const ageRatingCode = text(body.ageRatingCode, 1, 4);
  if (!["P", "K", "T13", "T16", "T18"].includes(ageRatingCode))
    throw new AdminError("INVALID_INPUT");
  const release = text(body.releaseDate ?? "", 0, 10);
  let releaseDate: Date | null = null;
  if (release) {
    releaseDate = new Date(`${release}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(release) ||
      Number.isNaN(releaseDate.getTime()) ||
      releaseDate.toISOString().slice(0, 10) !== release
    )
      throw new AdminError("INVALID_INPUT");
  }
  const titleEn = text(body.titleEn ?? "", 0, 180),
    synopsisEn = text(body.synopsisEn ?? "", 0, 5000);
  if (Boolean(titleEn) !== Boolean(synopsisEn))
    throw new AdminError("INVALID_INPUT");
  const accent = text(body.accent ?? "#edc076", 7, 7);
  if (!/^#[a-f0-9]{6}$/i.test(accent)) throw new AdminError("INVALID_INPUT");
  return {
    slug,
    status: status as AdminMovie["status"],
    originalTitle: text(body.originalTitle, 1, 180),
    durationMinutes: integer(body.durationMinutes, 1, 360),
    ageRatingCode,
    year: integer(body.year, 1888, 2100),
    director: text(body.director, 1, 180),
    posterUrl: imageUrl(body.posterUrl),
    backdropUrl: imageUrl(body.backdropUrl),
    accent,
    releaseDate,
    titleVi: text(body.titleVi, 1, 180),
    synopsisVi: text(body.synopsisVi, 10, 5000),
    titleEn,
    synopsisEn,
    genres: genres as string[],
  };
}
export async function saveMovie(
  actorId: string,
  body: Record<string, unknown>,
  id?: string,
) {
  const parsed = parseMovie(body);
  const version = id ? integer(body.version, 0, 2147483647) : 0;
  return mutate(actorId, async (tx) => {
    const before = id
      ? await tx.movie.findUnique({
          where: { id: recordId(id) },
          include: movieInclude,
        })
      : null;
    if (id && !before) throw new AdminError("NOT_FOUND", 404);
    if (before && before.version !== version)
      throw new AdminError("STALE_VERSION", 409);
    if (before) {
      const future = await tx.showtime.count({
        where: {
          movieId: id,
          startsAt: { gt: new Date() },
          status: { not: "CANCELLED" },
        },
      });
      if (
        future &&
        (before.durationMinutes !== parsed.durationMinutes ||
          before.ageRatingCode !== parsed.ageRatingCode ||
          parsed.status === "DRAFT" ||
          parsed.status === "ARCHIVED")
      )
        throw new AdminError("MOVIE_HAS_SCHEDULE", 409);
    }
    const { titleVi, synopsisVi, titleEn, synopsisEn, genres, ...data } =
      parsed;
    const movie = id
      ? await tx.movie.update({
          where: { id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.movie.create({ data });
    await tx.movieTranslation.upsert({
      where: { movieId_locale: { movieId: movie.id, locale: "vi" } },
      create: {
        movieId: movie.id,
        locale: "vi",
        title: titleVi,
        synopsis: synopsisVi,
      },
      update: { title: titleVi, synopsis: synopsisVi },
    });
    if (titleEn) {
      await tx.movieTranslation.upsert({
        where: { movieId_locale: { movieId: movie.id, locale: "en" } },
        create: {
          movieId: movie.id,
          locale: "en",
          title: titleEn,
          synopsis: synopsisEn,
        },
        update: { title: titleEn, synopsis: synopsisEn },
      });
    } else
      await tx.movieTranslation.deleteMany({
        where: { movieId: movie.id, locale: "en" },
      });
    const genreRows = await tx.genre.findMany({
      where: { code: { in: genres } },
    });
    if (genreRows.length !== genres.length)
      throw new AdminError("INVALID_INPUT");
    await tx.movieGenre.deleteMany({ where: { movieId: movie.id } });
    await tx.movieGenre.createMany({
      data: genreRows.map((g) => ({ movieId: movie.id, genreId: g.id })),
    });
    const after = await tx.movie.findUniqueOrThrow({
      where: { id: movie.id },
      include: movieInclude,
    });
    await audit(
      tx,
      actorId,
      id ? "MOVIE_UPDATED" : "MOVIE_CREATED",
      "Movie",
      movie.id,
      before ? movieDto(before) : null,
      movieDto(after),
    );
    return movieDto(after);
  });
}

export async function movieList(
  query: { q?: string; status?: string; page?: string } = {},
) {
  const page = Math.max(
    1,
    Math.min(10000, Math.trunc(Number(query.page) || 1)),
  );
  const where: Prisma.MovieWhereInput = {
    ...(movieStatuses.includes(query.status as never)
      ? { status: query.status as AdminMovie["status"] }
      : {}),
    ...(query.q
      ? {
          OR: [
            { slug: { contains: query.q.slice(0, 100), mode: "insensitive" } },
            {
              originalTitle: {
                contains: query.q.slice(0, 100),
                mode: "insensitive",
              },
            },
            {
              translations: {
                some: {
                  title: {
                    contains: query.q.slice(0, 100),
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    getDb().movie.findMany({
      where,
      include: movieInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * 20,
      take: 20,
    }),
    getDb().movie.count({ where }),
  ]);
  return {
    items: rows.map(movieDto),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
  };
}

function parseLocalTime(input: unknown) {
  const local = text(input, 16, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new AdminError("INVALID_TIME");
  const date = new Date(`${local}:00+07:00`);
  if (
    Number.isNaN(date.getTime()) ||
    new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16) !== local
  )
    throw new AdminError("INVALID_TIME");
  return date;
}
async function scheduleValues(
  tx: Prisma.TransactionClient,
  body: Record<string, unknown>,
  excludeId?: string,
) {
  const movieId = recordId(body.movieId),
    auditoriumId = recordId(body.auditoriumId),
    startsAt = parseLocalTime(body.startsAtLocal);
  const movie = await tx.movie.findUnique({ where: { id: movieId } });
  if (!movie || !["NOW_SHOWING", "COMING_SOON"].includes(movie.status))
    throw new AdminError("MOVIE_UNAVAILABLE", 409);
  const room = await tx.auditorium.findUnique({
    where: { id: auditoriumId },
    include: {
      cinema: true,
      _count: { select: { seats: { where: { isSellable: true } } } },
    },
  });
  if (!room || !room.active || !room.cinema.active || !room._count.seats)
    throw new AdminError("ROOM_UNAVAILABLE", 409);
  const cutoff = new Date(startsAt.getTime() - 10 * 60000);
  if (cutoff <= new Date()) throw new AdminError("INVALID_TIME");
  const endsAt = new Date(startsAt.getTime() + movie.durationMinutes * 60000),
    cleanupEndsAt = new Date(endsAt.getTime() + 20 * 60000);
  const localStart = new Date(startsAt.getTime() + 7 * 3600000),
    localEnd = new Date(cleanupEndsAt.getTime() + 7 * 3600000);
  if (
    localStart.toISOString().slice(0, 10) !==
      localEnd.toISOString().slice(0, 10) ||
    localStart.getUTCHours() * 60 + localStart.getUTCMinutes() <
      room.cinema.opensAtMinute ||
    localEnd.getUTCHours() * 60 + localEnd.getUTCMinutes() >
      room.cinema.closesAtMinute
  )
    throw new AdminError("OUTSIDE_HOURS");
  const basePrice = integer(body.basePrice, 1000, 10000000);
  const vipSurcharge = integer(body.vipSurcharge, 0, 10000000);
  const overlap = await tx.showtime.findFirst({
    where: {
      auditoriumId,
      status: { not: "CANCELLED" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startsAt: { lt: cleanupEndsAt },
      cleanupEndsAt: { gt: startsAt },
    },
    include: { movie: true },
  });
  if (overlap)
    throw new AdminError(
      "SCHEDULE_CONFLICT",
      409,
      `${overlap.movie.originalTitle} · ${overlap.startsAt.toISOString()} — ${overlap.cleanupEndsAt.toISOString()}`,
    );
  return {
    movieId,
    auditoriumId,
    startsAt,
    endsAt,
    cleanupEndsAt,
    salesCutoffAt: cutoff,
    durationSnapshot: movie.durationMinutes,
    ageRatingSnapshot: movie.ageRatingCode,
    basePrice,
    vipSurcharge,
  };
}
export async function createShowtime(
  actorId: string,
  body: Record<string, unknown>,
) {
  return mutate(actorId, async (tx) => {
    const values = await scheduleValues(tx, body);
    const row = await tx.showtime.create({
      data: { ...values, status: "DRAFT" },
      include: showtimeInclude,
    });
    await createInventory(tx, row.id, row.auditoriumId);
    await audit(
      tx,
      actorId,
      "SHOWTIME_CREATED",
      "Showtime",
      row.id,
      null,
      showtimeDto(row),
    );
    return showtimeDto(row);
  });
}
export async function changeShowtime(
  actorId: string,
  id: string,
  body: Record<string, unknown>,
) {
  recordId(id);
  const version = integer(body.version, 0, 2147483647);
  return mutate(actorId, async (tx) => {
    const before = await tx.showtime.findUnique({
      where: { id },
      include: showtimeInclude,
    });
    if (!before) throw new AdminError("NOT_FOUND", 404);
    if (before.version !== version) throw new AdminError("STALE_VERSION", 409);
    if (before.status === "CANCELLED")
      throw new AdminError("STATE_CONFLICT", 409);
    const action = body.action ?? "update";
    await expireHolds(tx, await databaseNow(tx));
    const activeHolds = await tx.holdSession.count({
      where: { showtimeId: id, status: "ACTIVE" },
    });
    let data: Prisma.ShowtimeUncheckedUpdateInput;
    if (action === "cancel") {
      if (
        await tx.ticketRedemption.count({
          where: { ticket: { item: { booking: { showtimeId: id } } } },
        })
      )
        throw new AdminError("SHOWTIME_HAS_USED_TICKETS", 409);
      if (before.startsAt <= new Date()) throw new AdminError("INVALID_TIME");
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5 || reason.length > 500)
        throw new AdminError("REASON_REQUIRED");
      data = {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      };
      await cancelShowtimeBookings(tx, id, reason, await databaseNow(tx));
      await tx.showtimeSeat.updateMany({
        where: { showtimeId: id, holdSessionId: { not: null } },
        data: { holdSessionId: null },
      });
      await tx.holdSession.updateMany({
        where: { showtimeId: id, status: "ACTIVE" },
        data: { status: "CANCELLED", version: { increment: 1 } },
      });
    } else {
      if (before.salesCutoffAt <= new Date())
        throw new AdminError("INVALID_TIME");
      if (action === "publish") {
        if (before.status !== "DRAFT")
          throw new AdminError("STATE_CONFLICT", 409);
        await scheduleValues(
          tx,
          {
            movieId: before.movieId,
            auditoriumId: before.auditoriumId,
            startsAtLocal: new Date(before.startsAt.getTime() + 7 * 3600000)
              .toISOString()
              .slice(0, 16),
            basePrice: before.basePrice,
            vipSurcharge: before.vipSurcharge,
          },
          id,
        );
        data = { status: "ON_SALE" };
      } else if (action === "update") {
        if (
          activeHolds ||
          (await tx.booking.count({
            where: { showtimeId: id, status: "PAID" },
          }))
        )
          throw new AdminError("SHOWTIME_HAS_HOLDS", 409);
        data = await scheduleValues(tx, body, id);
        if (data.auditoriumId !== before.auditoriumId) {
          if (await tx.holdSession.count({ where: { showtimeId: id } }))
            throw new AdminError("SHOWTIME_HAS_HOLDS", 409);
          await tx.showtimeSeat.deleteMany({ where: { showtimeId: id } });
          await createInventory(tx, id, String(data.auditoriumId));
        }
      } else throw new AdminError("INVALID_INPUT");
    }
    const after = await tx.showtime.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
      include: showtimeInclude,
    });
    await audit(
      tx,
      actorId,
      `SHOWTIME_${action === "cancel" ? "CANCELLED" : action === "publish" ? "PUBLISHED" : "UPDATED"}`,
      "Showtime",
      id,
      showtimeDto(before),
      showtimeDto(after),
      action === "cancel" ? String(body.reason).trim() : undefined,
    );
    return showtimeDto(after);
  });
}

export async function showtimeList(
  query: { date?: string; cinema?: string; page?: string } = {},
) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  let date =
    query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : today;
  let start: Date;
  try {
    start = parseLocalTime(`${date}T00:00`);
  } catch {
    date = today;
    start = parseLocalTime(`${date}T00:00`);
  }
  const page = Math.max(
    1,
    Math.min(10000, Math.trunc(Number(query.page) || 1)),
  );
  const where: Prisma.ShowtimeWhereInput = {
    startsAt: { gte: start, lt: new Date(start.getTime() + 86400000) },
    ...(query.cinema ? { auditorium: { cinema: { code: query.cinema } } } : {}),
  };
  const [rows, total] = await Promise.all([
    getDb().showtime.findMany({
      where,
      include: showtimeInclude,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: 20,
      skip: (page - 1) * 20,
    }),
    getDb().showtime.count({ where }),
  ]);
  return {
    items: rows.map(showtimeDto),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
    date,
  };
}
export async function scheduleOptions() {
  const [movies, rooms] = await Promise.all([
    getDb().movie.findMany({
      where: { status: { in: ["NOW_SHOWING", "COMING_SOON"] } },
      include: { translations: true },
      orderBy: { originalTitle: "asc" },
    }),
    getDb().auditorium.findMany({
      where: { active: true, cinema: { active: true } },
      include: { cinema: true },
      orderBy: [{ cinemaId: "asc" }, { code: "asc" }],
    }),
  ]);
  return {
    movies: movies.map((m) => ({
      id: m.id,
      title:
        m.translations.find((t) => t.locale === "vi")?.title ?? m.originalTitle,
      duration: m.durationMinutes,
    })),
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      cinema: r.cinema.name,
      cinemaCode: r.cinema.code,
      opens: r.cinema.opensAtMinute,
      closes: r.cinema.closesAtMinute,
    })),
  };
}
