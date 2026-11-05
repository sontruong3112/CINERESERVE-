import "server-only";
import type { Prisma } from "@/generated/prisma/client";
export async function bookingLock(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(20261102)`;
}
export async function databaseNow(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<
    { millis: bigint }[]
  >`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS millis`;
  return new Date(Number(row.millis));
}
export async function cancelUserHolds(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.booking.updateMany({
    where: { status: "PENDING", hold: { userId, status: "ACTIVE" } },
    data: {
      status: "CANCELLED",
      cancelledAt: await databaseNow(tx),
      cancellationReason: "HOLD_RELEASED",
      version: { increment: 1 },
    },
  });
  await tx.showtimeSeat.updateMany({
    where: { hold: { userId, status: "ACTIVE" } },
    data: { holdSessionId: null },
  });
  await tx.holdSession.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED", version: { increment: 1 } },
  });
}
export async function expireHolds(tx: Prisma.TransactionClient, now: Date) {
  const expired = await tx.holdSession.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { expiresAt: { lte: now } },
        { user: { status: { not: "ACTIVE" } } },
        { showtime: { status: { not: "ON_SALE" } } },
      ],
    },
    select: { id: true },
  });
  const ids = expired.map((h) => h.id);
  if (!ids.length) return;
  await tx.booking.updateMany({
    where: { holdId: { in: ids }, status: "PENDING" },
    data: { status: "EXPIRED", version: { increment: 1 } },
  });
  await tx.showtimeSeat.updateMany({
    where: { holdSessionId: { in: ids } },
    data: { holdSessionId: null },
  });
  await tx.holdSession.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED", version: { increment: 1 } },
  });
}
export async function createInventory(
  tx: Prisma.TransactionClient,
  showtimeId: string,
  auditoriumId: string,
) {
  const seats = await tx.seat.findMany({ where: { auditoriumId } });
  await tx.showtimeSeat.createMany({
    data: seats.map((s) => ({
      showtimeId,
      seatId: s.id,
      rowLabel: s.rowLabel,
      seatNumber: s.seatNumber,
      type: s.type,
      isSellable: s.isSellable,
    })),
    skipDuplicates: true,
  });
}
