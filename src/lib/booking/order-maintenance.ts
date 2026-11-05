import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export async function syncPendingBooking(
  tx: Prisma.TransactionClient,
  holdId: string,
) {
  const booking = await tx.booking.findUnique({ where: { holdId } });
  if (!booking || booking.status !== "PENDING") return;
  const hold = await tx.holdSession.findUniqueOrThrow({
    where: { id: holdId },
    include: { seats: true },
  });
  const items = hold.seats.map((s) => ({
    showtimeSeatId: s.id,
    label: `${s.rowLabel}${s.seatNumber}`,
    type: s.type,
    price:
      hold.quotedBasePrice + (s.type === "VIP" ? hold.quotedVipSurcharge : 0),
  }));
  await tx.bookingItem.deleteMany({ where: { bookingId: booking.id } });
  await tx.booking.update({
    where: { id: booking.id },
    data: {
      holdVersion: hold.version,
      total: BigInt(items.reduce((sum, s) => sum + s.price, 0)),
      version: { increment: 1 },
      items: { create: items },
    },
  });
}
export async function cancelShowtimeBookings(
  tx: Prisma.TransactionClient,
  showtimeId: string,
  reason: string,
  now: Date,
) {
  const paid = await tx.booking.findMany({
    where: { showtimeId, status: "PAID" },
  });
  for (const booking of paid) {
    await tx.refund.create({
      data: {
        bookingId: booking.id,
        amount: booking.total,
        reason,
        completedAt: now,
      },
    });
  }
  await tx.ticket.updateMany({
    where: { item: { booking: { showtimeId, status: "PAID" } } },
    data: { status: "CANCELLED" },
  });
  await tx.booking.updateMany({
    where: { showtimeId, status: { in: ["PENDING", "PAID"] } },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancellationReason: reason,
      version: { increment: 1 },
    },
  });
}
