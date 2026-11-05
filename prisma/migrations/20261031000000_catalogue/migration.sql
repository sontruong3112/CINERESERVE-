-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('NOW_SHOWING', 'COMING_SOON', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('STANDARD', 'VIP');

-- CreateEnum
CREATE TYPE "ShowtimeStatus" AS ENUM ('DRAFT', 'ON_SALE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Movie" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "ageRatingCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "director" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "backdropUrl" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "status" "MovieStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieTranslation" (
    "id" UUID NOT NULL,
    "movieId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,

    CONSTRAINT "MovieTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieGenre" (
    "movieId" UUID NOT NULL,
    "genreId" UUID NOT NULL,

    CONSTRAINT "MovieGenre_pkey" PRIMARY KEY ("movieId","genreId")
);

-- CreateTable
CREATE TABLE "Cinema" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressVi" TEXT NOT NULL,
    "addressEn" TEXT NOT NULL,
    "areaVi" TEXT NOT NULL,
    "areaEn" TEXT NOT NULL,
    "opensAtMinute" INTEGER NOT NULL DEFAULT 540,
    "closesAtMinute" INTEGER NOT NULL DEFAULT 1410,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Cinema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditorium" (
    "id" UUID NOT NULL,
    "cinemaId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Auditorium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" UUID NOT NULL,
    "auditoriumId" UUID NOT NULL,
    "rowLabel" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "type" "SeatType" NOT NULL DEFAULT 'STANDARD',
    "isSellable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Showtime" (
    "id" UUID NOT NULL,
    "seedKey" TEXT,
    "movieId" UUID NOT NULL,
    "auditoriumId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "cleanupEndsAt" TIMESTAMPTZ(3) NOT NULL,
    "salesCutoffAt" TIMESTAMPTZ(3) NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "vipSurcharge" INTEGER NOT NULL,
    "durationSnapshot" INTEGER NOT NULL,
    "ageRatingSnapshot" TEXT NOT NULL,
    "status" "ShowtimeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Showtime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MovieTranslation_movieId_locale_key" ON "MovieTranslation"("movieId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_code_key" ON "Genre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Cinema_code_key" ON "Cinema"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Auditorium_cinemaId_code_key" ON "Auditorium"("cinemaId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_auditoriumId_rowLabel_seatNumber_key" ON "Seat"("auditoriumId", "rowLabel", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Showtime_seedKey_key" ON "Showtime"("seedKey");

-- CreateIndex
CREATE INDEX "Showtime_movieId_startsAt_idx" ON "Showtime"("movieId", "startsAt");

-- CreateIndex
CREATE INDEX "Showtime_auditoriumId_startsAt_idx" ON "Showtime"("auditoriumId", "startsAt");

-- AddForeignKey
ALTER TABLE "MovieTranslation" ADD CONSTRAINT "MovieTranslation_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditorium" ADD CONSTRAINT "Auditorium_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_auditoriumId_fkey" FOREIGN KEY ("auditoriumId") REFERENCES "Auditorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_auditoriumId_fkey" FOREIGN KEY ("auditoriumId") REFERENCES "Auditorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business constraints are enforced even for direct SQL writes.
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_duration_positive" CHECK ("durationMinutes" > 0);
ALTER TABLE "MovieTranslation" ADD CONSTRAINT "MovieTranslation_locale_valid" CHECK ("locale" IN ('vi', 'en'));
ALTER TABLE "Genre" ADD CONSTRAINT "Genre_code_supported" CHECK ("code" IN ('adventure', 'animation', 'drama', 'scifi'));
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_hours_valid" CHECK (0 <= "opensAtMinute" AND "opensAtMinute" < "closesAtMinute" AND "closesAtMinute" <= 1440);
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_number_positive" CHECK ("seatNumber" > 0);
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_values_valid" CHECK (
  "basePrice" > 0 AND "vipSurcharge" >= 0 AND "durationSnapshot" > 0
  AND "endsAt" = "startsAt" + "durationSnapshot" * INTERVAL '1 minute'
  AND "cleanupEndsAt" >= "endsAt" + INTERVAL '20 minutes'
  AND "salesCutoffAt" = "startsAt" - INTERVAL '10 minutes'
);
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_no_room_overlap"
  EXCLUDE USING gist ("auditoriumId" WITH =, tstzrange("startsAt", "cleanupEndsAt", '[)') WITH &&)
  WHERE ("status" <> 'CANCELLED');
