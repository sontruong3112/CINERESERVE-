import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { databaseNow } from "@/lib/booking/maintenance";
import { localAdminEnabled, LOCAL_ADMIN_EMAIL } from "@/lib/auth/local-admin";
import {
  OperationsError,
  type OperationsQuery,
  type OperationsOrders,
} from "./orders-shared";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function dateDay(value: string) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value))
    throw new OperationsError("INVALID_FILTER");
  const utc = new Date(value + "T00:00:00Z");
  if (Number.isNaN(+utc) || utc.toISOString().slice(0, 10) !== value)
    throw new OperationsError("INVALID_FILTER");
  return new Date(value + "T00:00:00+07:00");
}
export function parseOperationsQuery(query: OperationsQuery) {
  const q = (query.q || "").trim().toUpperCase(),
    status = query.status || "",
    cinema = query.cinema || "",
    from = query.from || "",
    to = query.to || "",
    pageValue = query.page || "1";
  if (
    !/^[A-Z0-9-]{0,32}$/.test(q) ||
    (status && !["PENDING", "PAID", "EXPIRED", "CANCELLED"].includes(status)) ||
    (cinema && !uuid.test(cinema)) ||
    !/^[1-9]\d{0,3}$/.test(pageValue)
  )
    throw new OperationsError("INVALID_FILTER");
  if (Boolean(from) !== Boolean(to))
    throw new OperationsError("INVALID_FILTER");
  const start = from ? dateDay(from) : null,
    last = to ? dateDay(to) : null;
  if (start && last && (+last < +start || +last - +start > 365 * 86400000))
    throw new OperationsError("INVALID_FILTER");
  return {
    query: {
      q,
      status,
      cinema: cinema.toLowerCase(),
      from,
      to,
      page: pageValue,
    },
    page: Number(pageValue),
    start,
    end: last ? new Date(+last + 86400000) : null,
  };
}
export function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  return `${name.slice(0, 1)}***@${domain || "***"}`;
}
export function maskPhone(value: string | null) {
  return value ? `***${value.replace(/\D/g, "").slice(-4)}` : null;
}
export async function operationsOrders(
  sessionId: string,
  input: OperationsQuery = {},
): Promise<OperationsOrders> {
  return getDb().$transaction(
    async (tx) => {
      const now = await databaseNow(tx);
      const session = await tx.authSession.findUnique({
        where: { id: sessionId },
        select: {
          expiresAt: true,
          authVersion: true,
          user: {
            select: {
              status: true,
              authVersion: true,
              role: true,
              mustChangePassword: true,
              emailNormalized: true,
              staffAssignment: {
                select: {
                  cinema: { select: { id: true, name: true, active: true } },
                },
              },
            },
          },
        },
      });
      if (
        !session ||
        session.expiresAt <= now ||
        session.user.status !== "ACTIVE" ||
        session.authVersion !== session.user.authVersion ||
        (session.user.emailNormalized === LOCAL_ADMIN_EMAIL &&
          !localAdminEnabled())
      )
        throw new OperationsError("UNAUTHENTICATED", 401);
      const user = session.user;
      if (user.mustChangePassword)
        throw new OperationsError("PASSWORD_CHANGE_REQUIRED", 428);
      if (user.role !== "ADMIN" && user.role !== "STAFF")
        throw new OperationsError("FORBIDDEN", 403);
      const branch = user.staffAssignment?.cinema;
      if (user.role === "STAFF" && !branch?.active)
        throw new OperationsError("FORBIDDEN", 403);
      const parsed = parseOperationsQuery(input),
        query = parsed.query;
      if (user.role === "STAFF" && query.cinema && query.cinema !== branch!.id)
        throw new OperationsError("FORBIDDEN", 403);
      if (
        user.role === "STAFF" &&
        query.q &&
        !/^CR-[A-F0-9]{12}$/.test(query.q)
      )
        throw new OperationsError("CODE_REQUIRED");
      const cinemas =
        user.role === "STAFF"
          ? [{ id: branch!.id, name: branch!.name }]
          : await tx.cinema.findMany({
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            });
      if (query.cinema && !cinemas.some((c) => c.id === query.cinema))
        throw new OperationsError("INVALID_FILTER");
      const needsCode = user.role === "STAFF" && !query.q;
      const result = {
        role: user.role,
        scope: user.role === "STAFF" ? branch!.name : null,
        needsCode,
        checkedAt: now.toISOString(),
        cinemas,
        query,
        page: parsed.page,
      };
      if (needsCode) return { ...result, rows: [], total: 0, pages: 1 };
      const status: Prisma.BookingWhereInput =
        query.status === "PENDING"
          ? { status: "PENDING", expiresAt: { gt: now } }
          : query.status === "EXPIRED"
            ? {
                OR: [
                  { status: "EXPIRED" },
                  { status: "PENDING", expiresAt: { lte: now } },
                ],
              }
            : query.status
              ? { status: query.status as "PAID" | "CANCELLED" }
              : {};
      const where: Prisma.BookingWhereInput = {
        ...status,
        ...(query.q
          ? {
              code:
                user.role === "STAFF"
                  ? query.q
                  : { contains: query.q, mode: "insensitive" },
            }
          : {}),
        ...(user.role === "STAFF" || query.cinema
          ? { cinemaId: user.role === "STAFF" ? branch!.id : query.cinema }
          : {}),
        ...(parsed.start && parsed.end
          ? { createdAt: { gte: parsed.start, lt: parsed.end } }
          : {}),
      };
      const total = await tx.booking.count({ where });
      const rows = await tx.booking.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (parsed.page - 1) * 20,
        take: 20,
        select: {
          id: true,
          code: true,
          status: true,
          movieTitle: true,
          movieTitleEn: true,
          cinemaName: true,
          roomName: true,
          startsAt: true,
          createdAt: true,
          paidAt: true,
          expiresAt: true,
          total: true,
          cancellationReason: true,
          user: { select: { name: true, emailNormalized: true, phone: true } },
          items: {
            orderBy: { label: "asc" },
            select: {
              label: true,
              type: true,
              price: true,
              ticket: {
                select: {
                  status: true,
                  redemption: { select: { redeemedAt: true } },
                },
              },
            },
          },
          attempts: {
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: 20,
            select: { outcome: true, amount: true, createdAt: true },
          },
          refund: { select: { amount: true, reason: true, completedAt: true } },
        },
      });
      return {
        ...result,
        total,
        pages: Math.max(1, Math.ceil(total / 20)),
        rows: rows.map((row) => ({
          id: row.id,
          code: row.code,
          status:
            row.status === "PENDING" && row.expiresAt <= now
              ? "EXPIRED"
              : row.status,
          title: row.movieTitle,
          titleEn: row.movieTitleEn,
          cinema: row.cinemaName,
          room: row.roomName,
          startsAt: row.startsAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
          paidAt: row.paidAt?.toISOString() || null,
          expiresAt: row.expiresAt.toISOString(),
          total: row.total.toString(),
          cancellationReason: row.cancellationReason,
          customer: {
            name: row.user.name,
            email: maskEmail(row.user.emailNormalized),
            phone: maskPhone(row.user.phone),
          },
          items: row.items.map((item) => ({
            label: item.label,
            type: item.type,
            price: item.price,
            ticketStatus: item.ticket?.status || null,
            usedAt: item.ticket?.redemption?.redeemedAt.toISOString() || null,
          })),
          attempts: row.attempts.map((a) => ({
            outcome: a.outcome,
            amount: a.amount.toString(),
            createdAt: a.createdAt.toISOString(),
          })),
          refund: row.refund
            ? {
                ...row.refund,
                amount: row.refund.amount.toString(),
                completedAt: row.refund.completedAt.toISOString(),
              }
            : null,
        })),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 15000,
      maxWait: 10000,
    },
  );
}
