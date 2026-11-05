-- DropForeignKey
ALTER TABLE "ShowtimeSeat" DROP CONSTRAINT "ShowtimeSeat_soldBookingItemId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "ShowtimeSeat_soldBookingItemId_id_key" ON "ShowtimeSeat"("soldBookingItemId", "id");

-- AddForeignKey
ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_correct_sold_item" FOREIGN KEY ("soldBookingItemId", "id") REFERENCES "BookingItem"("id", "showtimeSeatId") ON DELETE RESTRICT ON UPDATE NO ACTION;
