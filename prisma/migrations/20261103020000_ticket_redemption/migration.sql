-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'USED';

-- DropForeignKey
ALTER TABLE "ShowtimeSeat" DROP CONSTRAINT "ShowtimeSeat_correct_sold_item";

-- CreateTable
CREATE TABLE "TicketRedemption" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "cinemaId" UUID NOT NULL,
    "requestKey" UUID NOT NULL,
    "redeemedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketRedemption_ticketId_key" ON "TicketRedemption"("ticketId");

-- CreateIndex
CREATE INDEX "TicketRedemption_cinemaId_redeemedAt_idx" ON "TicketRedemption"("cinemaId", "redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketRedemption_staffUserId_requestKey_key" ON "TicketRedemption"("staffUserId", "requestKey");

-- AddForeignKey
ALTER TABLE "TicketRedemption" ADD CONSTRAINT "TicketRedemption_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRedemption" ADD CONSTRAINT "TicketRedemption_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRedemption" ADD CONSTRAINT "TicketRedemption_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
