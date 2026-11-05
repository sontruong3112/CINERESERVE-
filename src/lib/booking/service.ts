import "server-only";
import { getDb } from "@/lib/db";
import { AuthError } from "@/lib/auth/session";
import { authJson, authFailure } from "@/lib/auth/http";
import type { Prisma } from "@/generated/prisma/client";
import type { SeatMap } from "./shared";
import { bookingLock, databaseNow, expireHolds } from "./maintenance";
import { syncPendingBooking } from "./order-maintenance";
import type { Role } from "@/lib/auth/shared";
export class HoldError extends Error {
  constructor(
    public code: string,
    public status = 409,
  ) {
    super(code);
  }
}
export function holdFailure(error: unknown) {
  if (error instanceof HoldError)
    return authJson({ error: error.code }, error.status);
  if (error instanceof AuthError) return authFailure(error);
  return authJson({ error: "SERVER_ERROR" }, 500);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validId(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value))
    throw new HoldError("INVALID_INPUT", 400);
  return value.toLowerCase();
}
export async function transaction<T>(
  sessionId: string,
  fn: (tx: Prisma.TransactionClient, userId: string, now: Date) => Promise<T>,
  roles?: Role[],
) {
  return getDb()
    .$transaction(
      async (tx) => {
        await bookingLock(tx);
        const now = await databaseNow(tx);
        const session = await tx.authSession.findUnique({
          where: { id: sessionId },
          include: { user: true },
        });
        if (
          !session ||
          session.expiresAt <= now ||
          session.user.status !== "ACTIVE" ||
          session.authVersion !== session.user.authVersion
        )
          throw new AuthError("UNAUTHENTICATED", 401);
        if (session.user.mustChangePassword)
          throw new AuthError("PASSWORD_CHANGE_REQUIRED", 428);
        if (roles && !roles.includes(session.user.role))
          throw new AuthError("FORBIDDEN", 403);
        await expireHolds(tx, now);
        // Errors are returned outside the transaction so expiry maintenance can commit.
        try {
          return { value: await fn(tx, session.userId, now) };
        } catch (error) {
          if (error instanceof HoldError) return { error };
          throw error;
        }
      },
      { timeout: 15000, maxWait: 10000 },
    )
    .then((result) => {
      if ("error" in result) throw result.error;
      return result.value;
    });
}
async function map(
  tx: Prisma.TransactionClient,
  userId: string,
  showtimeId: string,
  now: Date,
): Promise<SeatMap> {
  const show = await tx.showtime.findUnique({
    where: { id: showtimeId },
    include: {
      movie: { include: { translations: true } },
      auditorium: { include: { cinema: true } },
      seats: { orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }] },
    },
  });
  if (
    !show ||
    show.status === "DRAFT" ||
    !["NOW_SHOWING", "COMING_SOON"].includes(show.movie.status)
  )
    throw new HoldError("NOT_FOUND", 404);
  const hold = await tx.holdSession.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { seats: true },
  });
  const mine = new Set(hold?.seats.map((s) => s.id));
  return {
    serverNow: now.toISOString(),
    showtime: {
      id: show.id,
      title:
        show.movie.translations.find((t) => t.locale === "vi")?.title ??
        show.movie.originalTitle,
      titleEn:
        show.movie.translations.find((t) => t.locale === "en")?.title ??
        show.movie.translations.find((t) => t.locale === "vi")?.title ??
        show.movie.originalTitle,
      ageRatingCode: show.ageRatingSnapshot,
      slug: show.movie.slug,
      cinema: show.auditorium.cinema.name,
      cinemaCode: show.auditorium.cinema.code,
      room: show.auditorium.name,
      startsAt: show.startsAt.toISOString(),
      cutoffAt: show.salesCutoffAt.toISOString(),
      basePrice: show.basePrice,
      vipSurcharge: show.vipSurcharge,
      open:
        show.status === "ON_SALE" &&
        show.salesCutoffAt > now &&
        show.auditorium.active &&
        show.auditorium.cinema.active &&
        ["NOW_SHOWING", "COMING_SOON"].includes(show.movie.status),
    },
    seats: show.seats.map((s) => ({
      id: s.id,
      row: s.rowLabel,
      number: s.seatNumber,
      type: s.type,
      status: !s.isSellable
        ? "BLOCKED"
        : s.soldBookingItemId
          ? "SOLD"
          : mine.has(s.id)
            ? "MINE"
            : s.holdSessionId
              ? "HELD"
              : "AVAILABLE",
    })),
    hold: hold
      ? {
          id: hold.id,
          showtimeId: hold.showtimeId,
          expiresAt: hold.expiresAt.toISOString(),
          version: hold.version,
          seatIds: hold.seats.map((s) => s.id),
          basePrice: hold.quotedBasePrice,
          vipSurcharge: hold.quotedVipSurcharge,
          total: hold.seats.reduce(
            (sum, s) =>
              sum +
              hold.quotedBasePrice +
              (s.type === "VIP" ? hold.quotedVipSurcharge : 0),
            0,
          ),
        }
      : null,
  };
}
export async function getSeatMap(sessionId: string, showtimeId: string) {
  validId(showtimeId);
  return transaction(
    sessionId,
    (tx, userId, now) => map(tx, userId, showtimeId, now),
    ["CUSTOMER"],
  );
}
export async function updateHold(
  sessionId: string,
  showtimeId: string,
  body: Record<string, unknown>,
) {
  validId(showtimeId);
  if (
    !Array.isArray(body.seatIds) ||
    body.seatIds.length > 8 ||
    new Set(body.seatIds).size !== body.seatIds.length
  )
    throw new HoldError("INVALID_INPUT", 400);
  const ids = body.seatIds.map(validId);
  return transaction(
    sessionId,
    async (tx, userId, now) => {
      const before = await map(tx, userId, showtimeId, now);
      if (!before.showtime.open) throw new HoldError("CLOSED");
      let hold = await tx.holdSession.findFirst({
        where: { userId, status: "ACTIVE" },
      });
      if (hold && hold.showtimeId !== showtimeId)
        throw new HoldError("ACTIVE_HOLD");
      if (
        hold
          ? body.holdId !== hold.id || body.version !== hold.version
          : body.holdId != null
      )
        throw new HoldError("STALE_HOLD");
      if (!hold && !ids.length) throw new HoldError("INVALID_INPUT", 400);
      const selected = await tx.showtimeSeat.findMany({
        where: { showtimeId, id: { in: ids } },
      });
      if (selected.length !== ids.length || selected.some((s) => !s.isSellable))
        throw new HoldError("INVALID_INPUT", 400);
      if (
        selected.some(
          (s) =>
            s.soldBookingItemId ||
            (s.holdSessionId && s.holdSessionId !== hold?.id),
        )
      )
        throw new HoldError("SEAT_TAKEN");
      if (!hold) {
        const recent = await tx.holdSession.count({
          where: {
            userId,
            startedAt: { gt: new Date(now.getTime() - 15 * 60000) },
          },
        });
        if (recent >= 5) throw new HoldError("TOO_MANY_REQUESTS", 429);
        hold = await tx.holdSession.create({
          data: {
            userId,
            showtimeId,
            startedAt: now,
            expiresAt: new Date(
              Math.min(
                now.getTime() + 300000,
                new Date(before.showtime.cutoffAt).getTime(),
              ),
            ),
            quotedBasePrice: before.showtime.basePrice,
            quotedVipSurcharge: before.showtime.vipSurcharge,
          },
        });
      } else
        hold = await tx.holdSession.update({
          where: { id: hold.id },
          data: { version: { increment: 1 } },
        });
      await tx.showtimeSeat.updateMany({
        where: { holdSessionId: hold.id, id: { notIn: ids } },
        data: { holdSessionId: null },
      });
      await tx.showtimeSeat.updateMany({
        where: { showtimeId, id: { in: ids } },
        data: { holdSessionId: hold.id },
      });
      await syncPendingBooking(tx, hold.id);
      return map(tx, userId, showtimeId, await databaseNow(tx));
    },
    ["CUSTOMER"],
  );
}
export async function releaseHold(
  sessionId: string,
  showtimeId: string,
  body: Record<string, unknown>,
) {
  validId(showtimeId);
  return transaction(sessionId, async (tx, userId, now) => {
    const hold = await tx.holdSession.findFirst({
      where: { userId, showtimeId, status: "ACTIVE" },
    });
    if (!hold || body.holdId !== hold.id || body.version !== hold.version)
      throw new HoldError("STALE_HOLD");
    await tx.booking.updateMany({
      where: { holdId: hold.id, status: "PENDING" },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: "HOLD_RELEASED",
        version: { increment: 1 },
      },
    });
    await tx.showtimeSeat.updateMany({
      where: { holdSessionId: hold.id },
      data: { holdSessionId: null },
    });
    await tx.holdSession.update({
      where: { id: hold.id },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    return map(tx, userId, showtimeId, now);
  });
}
