import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { transaction, validId, HoldError } from "./service";
import { databaseNow } from "./maintenance";
import { CHECKOUT_CONFIRMATION_VERSION } from "./checkout-policy";
import type { Order } from "./orders-shared";
const include = {
  items: {
    include: { ticket: { include: { redemption: true } } },
    orderBy: { label: "asc" as const },
  },
  attempts: {
    orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }],
  },
  refund: true,
} satisfies Prisma.BookingInclude;
type Row = Prisma.BookingGetPayload<{ include: typeof include }>;
function dto(row: Row, now: Date): Order {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    version: row.version,
    holdVersion: row.holdVersion,
    holdId: row.holdId,
    showtimeId: row.showtimeId,
    title: row.movieTitle,
    titleEn: row.movieTitleEn,
    ageRatingCode: row.ageRatingCode,
    cinema: row.cinemaName,
    room: row.roomName,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    total: row.total.toString(),
    currency: row.currency,
    serverNow: now.toISOString(),
    cancellationReason: row.cancellationReason,
    items: row.items.map((i) => ({
      id: i.id,
      seatId: i.showtimeSeatId,
      label: i.label,
      type: i.type,
      price: i.price,
      ticket: i.ticket
        ? {
            id: i.ticket.id,
            code: i.ticket.code,
            status: i.ticket.status,
            usedAt: i.ticket.redemption?.redeemedAt.toISOString() ?? null,
          }
        : null,
    })),
    attempts: row.attempts.map((a) => ({
      id: a.id,
      key: a.idempotencyKey,
      outcome: a.outcome,
      amount: a.amount.toString(),
      version: a.bookingVersion,
      createdAt: a.createdAt.toISOString(),
      confirmationVersion: a.confirmationVersion,
      confirmedAt: a.confirmedAt?.toISOString() ?? null,
    })),
    refund: row.refund
      ? {
          amount: row.refund.amount.toString(),
          reason: row.refund.reason,
          completedAt: row.refund.completedAt.toISOString(),
        }
      : null,
  };
}
async function owned(tx: Prisma.TransactionClient, id: string, userId: string) {
  const row = await tx.booking.findFirst({ where: { id, userId }, include });
  if (!row) throw new HoldError("NOT_FOUND", 404);
  return row;
}
const version = (value: unknown) => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 2147483647
  )
    throw new HoldError("INVALID_INPUT", 400);
  return value;
};
export async function createOrder(
  sessionId: string,
  body: Record<string, unknown>,
) {
  const holdId = validId(body.holdId),
    expected = version(body.version);
  return transaction(
    sessionId,
    async (tx, userId, now) => {
      const hold = await tx.holdSession.findFirst({
        where: { id: holdId, userId },
        include: {
          seats: true,
          showtime: {
            include: {
              movie: { include: { translations: true } },
              auditorium: { include: { cinema: true } },
            },
          },
          booking: { include },
        },
      });
      if (!hold) throw new HoldError("NOT_FOUND", 404);
      if (hold.booking) {
        if (hold.booking.status === "PENDING" && hold.version !== expected)
          throw new HoldError("STALE_HOLD");
        return dto(hold.booking, now);
      }
      if (
        hold.status !== "ACTIVE" ||
        hold.expiresAt <= now ||
        hold.version !== expected
      )
        throw new HoldError("STALE_HOLD");
      const s = hold.showtime;
      if (
        s.status !== "ON_SALE" ||
        s.salesCutoffAt <= now ||
        !s.auditorium.active ||
        !s.auditorium.cinema.active ||
        !["NOW_SHOWING", "COMING_SOON"].includes(s.movie.status)
      )
        throw new HoldError("CLOSED");
      if (!hold.seats.length || hold.seats.length > 8)
        throw new HoldError("EMPTY_HOLD");
      if (
        hold.seats.some(
          (seat) =>
            seat.showtimeId !== s.id ||
            !seat.isSellable ||
            seat.soldBookingItemId,
        )
      )
        throw new HoldError("SEAT_TAKEN");
      const items = hold.seats.map((seat) => ({
        showtimeSeatId: seat.id,
        label: `${seat.rowLabel}${seat.seatNumber}`,
        type: seat.type,
        price:
          hold.quotedBasePrice +
          (seat.type === "VIP" ? hold.quotedVipSurcharge : 0),
      }));
      const vi =
          s.movie.translations.find((t) => t.locale === "vi")?.title ??
          s.movie.originalTitle,
        en = s.movie.translations.find((t) => t.locale === "en")?.title ?? vi;
      const row = await tx.booking.create({
        data: {
          code: `CR-${randomBytes(6).toString("hex").toUpperCase()}`,
          userId,
          showtimeId: s.id,
          movieId: s.movieId,
          cinemaId: s.auditorium.cinemaId,
          holdId: hold.id,
          holdVersion: hold.version,
          movieTitle: vi,
          movieTitleEn: en,
          ageRatingCode: s.ageRatingSnapshot,
          cinemaName: s.auditorium.cinema.name,
          roomName: s.auditorium.name,
          startsAt: s.startsAt,
          expiresAt: hold.expiresAt,
          total: BigInt(items.reduce((sum, i) => sum + i.price, 0)),
          createdAt: now,
          items: { create: items },
        },
        include,
      });
      return dto(row, now);
    },
    ["CUSTOMER"],
  );
}
export async function readOrder(sessionId: string, id: string) {
  validId(id);
  return transaction(sessionId, async (tx, userId, now) =>
    dto(await owned(tx, id, userId), now),
  );
}
export async function listOrders(sessionId: string, pageInput: string) {
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(pageInput) || 1)));
  return transaction(sessionId, async (tx, userId, now) => {
    const rows = await tx.booking.findMany({
      where: { userId },
      include,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 20,
      skip: (page - 1) * 20,
    });
    const total = await tx.booking.count({ where: { userId } });
    return {
      items: rows.map((row) => dto(row, now)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / 20)),
    };
  });
}
export async function payOrder(
  sessionId: string,
  id: string,
  body: Record<string, unknown>,
) {
  validId(id);
  const key = validId(body.idempotencyKey),
    expected = version(body.version);
  const outcome = body.outcome;
  if (outcome !== "SUCCESS" && outcome !== "FAILED")
    throw new HoldError("INVALID_INPUT", 400);
  return transaction(
    sessionId,
    async (tx, userId, now) => {
      const row = await owned(tx, id, userId);
      const replay = row.attempts.find((a) => a.idempotencyKey === key);
      if (replay) {
        if (replay.outcome !== outcome || replay.bookingVersion !== expected)
          throw new HoldError("KEY_REUSED");
        return dto(row, now);
      }
      if (row.status !== "PENDING") throw new HoldError("ORDER_CLOSED");
      if (row.version !== expected) throw new HoldError("STALE_ORDER");
      if (body.ageConfirmed !== true || body.policyConfirmed !== true)
        throw new HoldError("CONFIRMATION_REQUIRED", 400);
      if (body.confirmationVersion !== CHECKOUT_CONFIRMATION_VERSION)
        throw new HoldError("CONFIRMATION_CHANGED", 409);
      if (row.attempts.length >= 10)
        throw new HoldError("TOO_MANY_REQUESTS", 429);
      const hold = await tx.holdSession.findUniqueOrThrow({
        where: { id: row.holdId },
        include: {
          seats: true,
          showtime: {
            include: { movie: true, auditorium: { include: { cinema: true } } },
          },
        },
      });
      const show = hold.showtime;
      if (
        hold.status !== "ACTIVE" ||
        hold.expiresAt <= now ||
        row.expiresAt <= now ||
        hold.version !== row.holdVersion
      )
        throw new HoldError("STALE_HOLD");
      if (
        show.status !== "ON_SALE" ||
        show.salesCutoffAt <= now ||
        !show.auditorium.active ||
        !show.auditorium.cinema.active ||
        !["NOW_SHOWING", "COMING_SOON"].includes(show.movie.status)
      )
        throw new HoldError("CLOSED");
      if (
        !row.items.length ||
        row.items.length > 8 ||
        row.items.length !== hold.seats.length ||
        row.items.some(
          (i) =>
            !hold.seats.some(
              (s) =>
                s.id === i.showtimeSeatId &&
                s.isSellable &&
                !s.soldBookingItemId &&
                s.showtimeId === row.showtimeId &&
                i.price ===
                  hold.quotedBasePrice +
                    (s.type === "VIP" ? hold.quotedVipSurcharge : 0),
            ),
        ) ||
        row.total !==
          row.items.reduce((sum, i) => sum + BigInt(i.price), BigInt(0))
      )
        throw new HoldError("SEAT_TAKEN");
      // Read the clock immediately before the simulated settlement, after all validation.
      const settledAt = await databaseNow(tx);
      if (settledAt >= hold.expiresAt || settledAt >= show.salesCutoffAt)
        throw new HoldError("ORDER_CLOSED");
      await tx.paymentAttempt.create({
        data: {
          bookingId: id,
          idempotencyKey: key,
          outcome,
          amount: row.total,
          bookingVersion: expected,
          createdAt: settledAt,
          confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
          confirmedAt: settledAt,
        },
      });
      if (outcome === "SUCCESS") {
        for (const item of row.items) {
          const result = await tx.showtimeSeat.updateMany({
            where: {
              id: item.showtimeSeatId,
              showtimeId: row.showtimeId,
              holdSessionId: hold.id,
              soldBookingItemId: null,
            },
            data: { soldBookingItemId: item.id, holdSessionId: null },
          });
          if (result.count !== 1)
            throw new Error("Seat settlement invariant failed");
          await tx.ticket.create({
            data: {
              bookingItemId: item.id,
              code: `TK-${randomBytes(12).toString("hex").toUpperCase()}`,
              issuedAt: settledAt,
            },
          });
        }
        await tx.holdSession.update({
          where: { id: hold.id },
          data: { status: "CONVERTED", version: { increment: 1 } },
        });
        await tx.booking.update({
          where: { id },
          data: {
            status: "PAID",
            paidAt: settledAt,
            version: { increment: 1 },
          },
        });
      } else
        await tx.booking.update({
          where: { id },
          data: { version: { increment: 1 } },
        });
      return dto(await owned(tx, id, userId), settledAt);
    },
    ["CUSTOMER"],
  );
}
export async function cancelOrder(
  sessionId: string,
  id: string,
  body: Record<string, unknown>,
) {
  validId(id);
  const expected = version(body.version);
  return transaction(sessionId, async (tx, userId, now) => {
    const row = await owned(tx, id, userId);
    if (row.status === "CANCELLED") return dto(row, now);
    if (row.status !== "PENDING") throw new HoldError("ORDER_CLOSED");
    if (row.version !== expected) throw new HoldError("STALE_ORDER");
    await tx.showtimeSeat.updateMany({
      where: { holdSessionId: row.holdId },
      data: { holdSessionId: null },
    });
    await tx.holdSession.updateMany({
      where: { id: row.holdId, status: "ACTIVE" },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    const after = await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: "CUSTOMER_CANCELLED",
        version: { increment: 1 },
      },
      include,
    });
    return dto(after, now);
  });
}
