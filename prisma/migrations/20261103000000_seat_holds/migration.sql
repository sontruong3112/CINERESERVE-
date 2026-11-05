-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "HoldSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "showtimeId" UUID NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "quotedBasePrice" INTEGER NOT NULL,
    "quotedVipSurcharge" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HoldSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowtimeSeat" (
    "id" UUID NOT NULL,
    "showtimeId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "rowLabel" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "type" "SeatType" NOT NULL,
    "isSellable" BOOLEAN NOT NULL,
    "holdSessionId" UUID,

    CONSTRAINT "ShowtimeSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HoldSession_status_expiresAt_idx" ON "HoldSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "HoldSession_showtimeId_idx" ON "HoldSession"("showtimeId");

-- CreateIndex
CREATE INDEX "ShowtimeSeat_holdSessionId_idx" ON "ShowtimeSeat"("holdSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowtimeSeat_showtimeId_seatId_key" ON "ShowtimeSeat"("showtimeId", "seatId");

-- AddForeignKey
ALTER TABLE "HoldSession" ADD CONSTRAINT "HoldSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldSession" ADD CONSTRAINT "HoldSession_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "Showtime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "Showtime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowtimeSeat" ADD CONSTRAINT "ShowtimeSeat_holdSessionId_fkey" FOREIGN KEY ("holdSessionId") REFERENCES "HoldSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "HoldSession_one_active_user" ON "HoldSession" ("userId") WHERE "status" = 'ACTIVE';
ALTER TABLE "HoldSession" ADD CONSTRAINT "HoldSession_limits" CHECK (
 "expiresAt" > "startedAt" AND "expiresAt" <= "startedAt" + interval '5 minutes'
 AND "quotedBasePrice" > 0 AND "quotedVipSurcharge" >= 0 AND "version" >= 0
);
INSERT INTO "ShowtimeSeat" ("id","showtimeId","seatId","rowLabel","seatNumber","type","isSellable")
SELECT gen_random_uuid(), t."id", s."id", s."rowLabel", s."seatNumber", s."type", s."isSellable"
FROM "Showtime" t JOIN "Seat" s ON s."auditoriumId" = t."auditoriumId";
