import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AuthError } from "@/lib/auth/session";
import { authFailure, authJson } from "@/lib/auth/http";
import { databaseNow } from "@/lib/booking/maintenance";
import type {
  RevenueQuery,
  RevenueReport,
  RevenueRow,
  RevenueTotals,
} from "./shared";
export class ReportError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function reportFailure(error: unknown) {
  if (error instanceof ReportError)
    return authJson({ error: error.code }, error.status);
  return authFailure(error);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ReportError("INVALID_RANGE");
  const date = new Date(`${value}T00:00:00+07:00`);
  if (
    Number.isNaN(date.getTime()) ||
    new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== value
  )
    throw new ReportError("INVALID_RANGE");
  return date;
}
function parse(query: RevenueQuery, now: Date) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const from = query.from || `${today.slice(0, 7)}-01`,
    to = query.to || today,
    start = day(from),
    last = day(to);
  if (last < start || last.getTime() - start.getTime() > 365 * 86400000)
    throw new ReportError("INVALID_RANGE");
  if (query.bucket && !["day", "month"].includes(query.bucket))
    throw new ReportError("INVALID_FILTER");
  for (const id of [query.movie, query.cinema])
    if (id && !uuid.test(id)) throw new ReportError("INVALID_FILTER");
  return {
    from,
    to,
    start,
    end: new Date(last.getTime() + 86400000),
    bucket: (query.bucket || "day") as "day" | "month",
    movie: query.movie?.toLowerCase() || "",
    cinema: query.cinema?.toLowerCase() || "",
  };
}
const zero = (): RevenueTotals => ({
  gross: "0",
  refunds: "0",
  net: "0",
  paidOrders: "0",
  refundedOrders: "0",
  soldSeats: "0",
  refundedSeats: "0",
});
type Aggregate = RevenueTotals & {
  dimension: "total" | "time" | "movie" | "cinema";
  key: string;
};
export async function revenueReport(
  sessionId: string,
  query: RevenueQuery = {},
): Promise<RevenueReport> {
  return getDb().$transaction(
    async (tx) => {
      const now = await databaseNow(tx),
        session = await tx.authSession.findUnique({
          where: { id: sessionId },
          include: {
            user: {
              include: { staffAssignment: { include: { cinema: true } } },
            },
          },
        });
      if (
        !session ||
        session.expiresAt <= now ||
        session.user.status !== "ACTIVE" ||
        session.authVersion !== session.user.authVersion
      )
        throw new AuthError("UNAUTHENTICATED", 401);
      const user = session.user;
      if (user.mustChangePassword)
        throw new AuthError("PASSWORD_CHANGE_REQUIRED", 428);
      if (user.role !== "ADMIN" && user.role !== "STAFF")
        throw new ReportError("FORBIDDEN", 403);
      const filters = parse(query, now),
        assignment = user.staffAssignment;
      if (user.role === "STAFF") {
        if (!assignment?.cinema.active) throw new ReportError("FORBIDDEN", 403);
        if (filters.cinema && filters.cinema !== assignment.cinemaId)
          throw new ReportError("FORBIDDEN", 403);
        filters.cinema = assignment.cinemaId;
      }
      const cinemas = await tx.cinema.findMany({
        where: user.role === "STAFF" ? { id: assignment!.cinemaId } : {},
        orderBy: { name: "asc" },
        select: { id: true, name: true, active: true },
      });
      const movies = await tx.movie.findMany({
        where:
          user.role === "STAFF"
            ? {
                OR: [
                  {
                    showtimes: {
                      some: { auditorium: { cinemaId: assignment!.cinemaId } },
                    },
                  },
                  { bookings: { some: { cinemaId: assignment!.cinemaId } } },
                ],
              }
            : {},
        include: { translations: true },
        orderBy: { originalTitle: "asc" },
      });
      if (
        (filters.cinema && !cinemas.some((c) => c.id === filters.cinema)) ||
        (filters.movie && !movies.some((m) => m.id === filters.movie))
      )
        throw new ReportError("INVALID_FILTER");
      const scope = Prisma.sql`${filters.cinema ? Prisma.sql`AND b."cinemaId" = ${filters.cinema}::uuid` : Prisma.empty} ${filters.movie ? Prisma.sql`AND b."movieId" = ${filters.movie}::uuid` : Prisma.empty}`;
      // Aggregate cash events independently, then UNION ALL. Joining attempts/items/refunds directly would multiply amounts.
      const rows = await tx.$queryRaw<Aggregate[]>(Prisma.sql`
  WITH events AS (
   SELECT p."createdAt" AS at,b."movieId" AS movie,b."cinemaId" AS cinema,p.amount AS gross,0::bigint AS refunds,1 AS sales,0 AS returns,
    (SELECT count(*) FROM "BookingItem" i WHERE i."bookingId"=b.id) AS seats,0::bigint AS returned_seats
   FROM "PaymentAttempt" p JOIN "Booking" b ON b.id=p."bookingId"
   WHERE p.outcome='SUCCESS' AND p."createdAt">=${filters.start} AND p."createdAt"<${filters.end} ${scope}
   UNION ALL
   SELECT r."completedAt",b."movieId",b."cinemaId",0::bigint,r.amount,0,1,0::bigint,
    (SELECT count(*) FROM "BookingItem" i WHERE i."bookingId"=b.id)
   FROM "Refund" r JOIN "Booking" b ON b.id=r."bookingId"
   JOIN "PaymentAttempt" p ON p."bookingId"=b.id AND p.outcome='SUCCESS'
   WHERE r."completedAt">=${filters.start} AND r."completedAt"<${filters.end} ${scope}
  ), grouped AS (
   SELECT 'total' AS dimension,'' AS key,sum(gross) AS gross,sum(refunds) AS refunds,sum(sales) AS sales,sum(returns) AS returns,sum(seats) AS seats,sum(returned_seats) AS returned_seats FROM events
   UNION ALL SELECT 'time',to_char(at AT TIME ZONE 'Asia/Ho_Chi_Minh',${filters.bucket === "day" ? "YYYY-MM-DD" : "YYYY-MM"}),sum(gross),sum(refunds),sum(sales),sum(returns),sum(seats),sum(returned_seats) FROM events GROUP BY 2
   UNION ALL SELECT 'movie',movie::text,sum(gross),sum(refunds),sum(sales),sum(returns),sum(seats),sum(returned_seats) FROM events GROUP BY 2
   UNION ALL SELECT 'cinema',cinema::text,sum(gross),sum(refunds),sum(sales),sum(returns),sum(seats),sum(returned_seats) FROM events GROUP BY 2
  ) SELECT dimension,key,coalesce(gross,0)::text AS gross,coalesce(refunds,0)::text AS refunds,(coalesce(gross,0)-coalesce(refunds,0))::text AS net,
  coalesce(sales,0)::text AS "paidOrders",coalesce(returns,0)::text AS "refundedOrders",coalesce(seats,0)::text AS "soldSeats",coalesce(returned_seats,0)::text AS "refundedSeats" FROM grouped
 `);
      const movieOptions = movies.map((m) => ({
        id: m.id,
        label:
          m.translations.find((t) => t.locale === "vi")?.title ??
          m.originalTitle,
        labelEn:
          m.translations.find((t) => t.locale === "en")?.title ??
          m.translations.find((t) => t.locale === "vi")?.title ??
          m.originalTitle,
      }));
      const totals = (row: Aggregate | undefined): RevenueTotals =>
        row
          ? {
              gross: row.gross,
              refunds: row.refunds,
              net: row.net,
              paidOrders: row.paidOrders,
              refundedOrders: row.refundedOrders,
              soldSeats: row.soldSeats,
              refundedSeats: row.refundedSeats,
            }
          : zero();
      const timeMap = new Map(
        rows.filter((r) => r.dimension === "time").map((r) => [r.key, r]),
      );
      const keys = new Set<string>();
      for (
        let at = filters.start.getTime();
        at < filters.end.getTime();
        at += 86400000
      ) {
        const d = new Date(at + 7 * 3600000)
          .toISOString()
          .slice(0, filters.bucket === "day" ? 10 : 7);
        keys.add(d);
      }
      const time: RevenueRow[] = [...keys].map((key) => ({
        key,
        label: key,
        labelEn: key,
        ...totals(timeMap.get(key)),
      }));
      const moviesRows = rows
        .filter((r) => r.dimension === "movie")
        .map((r) => {
          const label = movieOptions.find((m) => m.id === r.key)!;
          return {
            key: r.key,
            label: label.label,
            labelEn: label.labelEn,
            ...totals(r),
          };
        })
        .sort((a, b) =>
          BigInt(a.net) === BigInt(b.net)
            ? a.key.localeCompare(b.key)
            : BigInt(a.net) > BigInt(b.net)
              ? -1
              : 1,
        );
      const cinemaRows = rows
        .filter((r) => r.dimension === "cinema")
        .map((r) => ({
          key: r.key,
          label: cinemas.find((c) => c.id === r.key)!.name,
          labelEn: cinemas.find((c) => c.id === r.key)!.name,
          ...totals(r),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return {
        from: filters.from,
        to: filters.to,
        bucket: filters.bucket,
        movie: filters.movie,
        cinema: filters.cinema,
        generatedAt: now.toISOString(),
        role: user.role,
        scopeName: user.role === "STAFF" ? assignment!.cinema.name : null,
        summary: totals(rows.find((r) => r.dimension === "total")),
        time,
        movies: moviesRows,
        cinemas: cinemaRows,
        options: {
          movies: movieOptions,
          cinemas: cinemas.map((c) => ({
            id: c.id,
            label: c.name,
            active: c.active,
          })),
        },
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 15000, maxWait: 10000 },
  );
}
