-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentOutcome" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "HoldStatus" ADD VALUE 'CONVERTED';

-- AlterTable
ALTER TABLE "ShowtimeSeat" ADD COLUMN     "soldBookingItemId" UUID;

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "showtimeId" UUID NOT NULL,
    "holdId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "movieTitle" TEXT NOT NULL,
    "movieTitleEn" TEXT NOT NULL,
    "cinemaName" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "total" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "holdVersion" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "showtimeSeatId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SeatType" NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "outcome" "PaymentOutcome" NOT NULL,
    "amount" BIGINT NOT NULL,
    "bookingVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_holdId_key" ON "Booking"("holdId");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_showtimeId_status_idx" ON "Booking"("showtimeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingItem_bookingId_showtimeSeatId_key" ON "BookingItem"("bookingId", "showtimeSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingItem_id_showtimeSeatId_key" ON "BookingItem"("id", "showtimeSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_bookingId_idempotencyKey_key" ON "PaymentAttempt"("bookingId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_bookingItemId_key" ON "Ticket"("bookingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_bookingId_key" ON "Refund"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowtimeSeat_soldBookingItemId_key" ON "ShowtimeSeat"("soldBookingItemId");

-- AddForeignKey
ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_soldBookingItemId_fkey" FOREIGN KEY ("soldBookingItemId") REFERENCES "BookingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "Showtime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "HoldSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_showtimeSeatId_fkey" FOREIGN KEY ("showtimeSeatId") REFERENCES "ShowtimeSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_not_held_and_sold" CHECK ("holdSessionId" IS NULL OR "soldBookingItemId" IS NULL);
ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_correct_sold_item" FOREIGN KEY ("soldBookingItemId", "id") REFERENCES "BookingItem" ("id", "showtimeSeatId") ON DELETE RESTRICT;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_values" CHECK ("total" >= 0 AND "currency" = 'VND' AND "version" >= 0 AND "holdVersion" >= 0 AND ("status" <> 'PAID' OR ("paidAt" IS NOT NULL AND "total" > 0)));
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_price_positive" CHECK ("price" > 0);
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_amount_positive" CHECK ("amount" > 0 AND "bookingVersion" >= 0);
CREATE UNIQUE INDEX "PaymentAttempt_one_success" ON "PaymentAttempt" ("bookingId") WHERE "outcome" = 'SUCCESS';
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
