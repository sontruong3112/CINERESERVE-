BEGIN;
-- Rebuild the exclusion check after shifting every room interval atomically;
-- checking each shifted row against unshifted rows would create false overlaps.
ALTER TABLE "Showtime" DROP CONSTRAINT "Showtime_no_room_overlap";
-- The adapter's installed datetime codec sends UTC wall times without an offset.
-- Preserve the application's existing intended instants before using UTC connections.
-- DB-generated now() fields and raw SQL AuthRateLimit dates are already absolute instants.
UPDATE "User" SET "updatedAt" = "updatedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "AuthSession" SET "expiresAt" = "expiresAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "Movie" SET "updatedAt" = "updatedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "Cinema" SET "updatedAt" = "updatedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "Showtime" SET
 "startsAt" = "startsAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "endsAt" = "endsAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "cleanupEndsAt" = "cleanupEndsAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "salesCutoffAt" = "salesCutoffAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "cancelledAt" = "cancelledAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "updatedAt" = "updatedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "HoldSession" SET
 "startedAt" = "startedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "expiresAt" = "expiresAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "Booking" SET
 "startsAt" = "startsAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "expiresAt" = "expiresAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "createdAt" = "createdAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "updatedAt" = "updatedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "paidAt" = "paidAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC',
 "cancelledAt" = "cancelledAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "PaymentAttempt" SET "createdAt" = "createdAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "Ticket" SET "issuedAt" = "issuedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "TicketRedemption" SET "redeemedAt" = "redeemedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
UPDATE "Refund" SET "completedAt" = "completedAt" AT TIME ZONE current_setting('TimeZone') AT TIME ZONE 'UTC';
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_no_room_overlap"
 EXCLUDE USING gist ("auditoriumId" WITH =, tstzrange("startsAt", "cleanupEndsAt", '[)') WITH &&)
 WHERE ("status" <> 'CANCELLED');
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC'); END $$;
COMMIT;
