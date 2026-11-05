import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { transaction, HoldError, validId } from "@/lib/booking/service";
import { databaseNow } from "@/lib/booking/maintenance";
import { parseTicketCode, type Inspection } from "./shared";
async function staffCinema(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: { staffAssignment: { include: { cinema: true } } },
  });
  if (
    user?.role !== "STAFF" ||
    user.status !== "ACTIVE" ||
    !user.staffAssignment?.cinema.active
  )
    throw new HoldError("FORBIDDEN", 403);
  return user.staffAssignment.cinemaId;
}
const include = {
  redemption: true,
  item: {
    include: {
      seat: true,
      booking: {
        include: {
          showtime: { include: { auditorium: { include: { cinema: true } } } },
        },
      },
    },
  },
} as const;
type TicketRow = Prisma.TicketGetPayload<{ include: typeof include }>;
async function inspection(
  tx: Prisma.TransactionClient,
  row: TicketRow,
  cinemaId: string,
  now: Date,
): Promise<Inspection> {
  const booking = row.item.booking,
    show = booking.showtime;
  if (show.auditorium.cinemaId !== cinemaId)
    throw new HoldError("WRONG_CINEMA", 403);
  const previous = await tx.showtime.findFirst({
    where: {
      auditoriumId: show.auditoriumId,
      status: { not: "CANCELLED" },
      startsAt: { lt: show.startsAt },
    },
    orderBy: { cleanupEndsAt: "desc" },
    select: { cleanupEndsAt: true },
  });
  const opens = new Date(
    Math.max(
      show.startsAt.getTime() - 30 * 60000,
      previous?.cleanupEndsAt.getTime() ?? 0,
    ),
  );
  let reason: Inspection["reason"] = "READY";
  if (
    row.status === "CANCELLED" ||
    booking.status === "CANCELLED" ||
    show.status === "CANCELLED"
  )
    reason = "CANCELLED";
  else if (row.status === "USED" || row.redemption) reason = "ALREADY_USED";
  else if (booking.status !== "PAID" || !booking.paidAt) reason = "NOT_PAID";
  else if (
    show.status !== "ON_SALE" ||
    !show.auditorium.active ||
    !show.auditorium.cinema.active
  )
    reason = "UNAVAILABLE";
  else if (
    row.item.seat.soldBookingItemId !== row.bookingItemId ||
    row.item.seat.showtimeId !== show.id ||
    row.item.seat.holdSessionId
  )
    reason = "INVALID_TICKET";
  else if (now < opens || now >= show.endsAt) reason = "OUTSIDE_WINDOW";
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    orderCode: booking.code,
    title: booking.movieTitle,
    titleEn: booking.movieTitleEn,
    cinema: booking.cinemaName,
    room: booking.roomName,
    seat: row.item.label,
    startsAt: show.startsAt.toISOString(),
    endsAt: show.endsAt.toISOString(),
    entryOpensAt: opens.toISOString(),
    usedAt: row.redemption?.redeemedAt.toISOString() ?? null,
    serverNow: now.toISOString(),
    canRedeem: reason === "READY",
    reason,
  };
}
async function find(tx: Prisma.TransactionClient, code: string) {
  const row = await tx.ticket.findUnique({ where: { code }, include });
  if (!row) throw new HoldError("NOT_FOUND", 404);
  return row;
}
export async function inspectTicket(sessionId: string, raw: unknown) {
  const code = parseTicketCode(raw);
  if (!code) throw new HoldError("INVALID_CODE", 400);
  return transaction(sessionId, async (tx, userId, now) => {
    const cinemaId = await staffCinema(tx, userId);
    return inspection(tx, await find(tx, code), cinemaId, now);
  });
}
export async function redeemTicket(
  sessionId: string,
  body: Record<string, unknown>,
) {
  const code = parseTicketCode(body.code);
  if (!code) throw new HoldError("INVALID_CODE", 400);
  const requestKey = validId(body.requestKey);
  return transaction(sessionId, async (tx, userId) => {
    const cinemaId = await staffCinema(tx, userId),
      row = await find(tx, code),
      now = await databaseNow(tx);
    const preview = await inspection(tx, row, cinemaId, now);
    const replay = await tx.ticketRedemption.findUnique({
      where: { staffUserId_requestKey: { staffUserId: userId, requestKey } },
    });
    if (replay) {
      if (replay.ticketId !== row.id) throw new HoldError("KEY_REUSED");
      return { ticket: preview, replayed: true };
    }
    if (!preview.canRedeem) throw new HoldError(preview.reason);
    const usedAt = await databaseNow(tx);
    if (
      usedAt < new Date(preview.entryOpensAt) ||
      usedAt >= new Date(preview.endsAt)
    )
      throw new HoldError("OUTSIDE_WINDOW");
    const changed = await tx.ticket.updateMany({
      where: { id: row.id, status: "VALID", redemption: { is: null } },
      data: { status: "USED" },
    });
    if (changed.count !== 1)
      throw new Error("Ticket redemption invariant failed");
    await tx.ticketRedemption.create({
      data: {
        ticketId: row.id,
        staffUserId: userId,
        cinemaId,
        requestKey,
        redeemedAt: usedAt,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        action: "TICKET_REDEEMED",
        entityType: "Ticket",
        entityId: row.id,
        beforeData: { status: "VALID" },
        afterData: {
          status: "USED",
          cinemaId,
          seat: preview.seat,
          redeemedAt: usedAt.toISOString(),
        },
      },
    });
    return {
      ticket: await inspection(tx, await find(tx, code), cinemaId, usedAt),
      replayed: false,
    };
  });
}
export async function ownTicketQr(sessionId: string, id: string) {
  validId(id);
  return transaction(sessionId, async (tx, userId) => {
    const row = await tx.ticket.findFirst({
      where: { id, item: { booking: { userId, status: "PAID" } } },
    });
    if (!row || row.status === "CANCELLED")
      throw new HoldError("NOT_FOUND", 404);
    return { code: row.code, payload: `CR1:${row.code}` };
  });
}
