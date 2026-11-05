BEGIN;
ALTER TABLE "Booking" ADD COLUMN "ageRatingCode" TEXT;
UPDATE "Booking" b SET "ageRatingCode" = s."ageRatingSnapshot" FROM "Showtime" s WHERE b."showtimeId" = s.id;
ALTER TABLE "Booking" ALTER COLUMN "ageRatingCode" SET NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_age_rating_valid" CHECK ("ageRatingCode" IN ('P','K','T13','T16','T18'));
ALTER TABLE "PaymentAttempt" ADD COLUMN "confirmationVersion" TEXT, ADD COLUMN "confirmedAt" TIMESTAMPTZ(3);
-- Historical attempts remain NULL: do not invent consent for existing customers.
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_confirmation_pair" CHECK (
  ("confirmationVersion" IS NULL AND "confirmedAt" IS NULL) OR
  ("confirmationVersion" IS NOT NULL AND length("confirmationVersion") BETWEEN 1 AND 80 AND "confirmedAt" IS NOT NULL)
);
COMMIT;
