BEGIN;
-- Backfill existing orders before enforcing required attribution.
ALTER TABLE "Booking" ADD COLUMN "cinemaId" UUID, ADD COLUMN "movieId" UUID;
UPDATE "Booking" b SET "movieId" = s."movieId", "cinemaId" = a."cinemaId"
FROM "Showtime" s JOIN "Auditorium" a ON a.id = s."auditoriumId" WHERE b."showtimeId" = s.id;
ALTER TABLE "Booking" ALTER COLUMN "cinemaId" SET NOT NULL, ALTER COLUMN "movieId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_movieId_cinemaId_idx" ON "Booking"("movieId", "cinemaId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_outcome_createdAt_idx" ON "PaymentAttempt"("outcome", "createdAt");

-- CreateIndex
CREATE INDEX "Refund_completedAt_idx" ON "Refund"("completedAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
