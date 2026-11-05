import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Client } from "pg";

if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
const db = new PrismaClient({ adapter: new PrismaPg({connectionString: process.env.DATABASE_URL}) });
async function check() {
  const counts = { movies: await db.movie.count(), cinemas: await db.cinema.count(), rooms: await db.auditorium.count(), seats: await db.seat.count(), showtimes: await db.showtime.count() };
  assert.ok(counts.movies >= 6 && counts.cinemas >= 2 && counts.seats > 0 && counts.showtimes > 0);
  const movie = await db.movie.findFirstOrThrow({ include: { translations: true } });
  assert.ok(movie.translations.some((translation) => translation.locale === "vi"));
  assert.ok(movie.translations.some((translation) => translation.locale === "en"));
  const session = await db.showtime.findFirstOrThrow();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  async function expectConstraint(sql: string, params: unknown[], code: string, constraint: string) {
    await client.query("BEGIN");
    let failure: {code?:string;constraint?:string} | undefined;
    try { await client.query(sql, params); } catch (error) { failure = error as typeof failure; }
    finally { await client.query("ROLLBACK"); }
    assert.equal(failure?.code, code);
    assert.equal(failure?.constraint, constraint);
  }
  try {
    const timezone = await client.query('SHOW timezone');
    assert.equal(timezone.rows[0].TimeZone, 'UTC');
    const instant = await client.query('SELECT EXTRACT(EPOCH FROM "startsAt") * 1000 AS milliseconds FROM "Showtime" WHERE id=$1', [session.id]);
    assert.equal(Number(instant.rows[0].milliseconds), session.startsAt.getTime());
    await expectConstraint('UPDATE "Movie" SET "durationMinutes"=0 WHERE id=$1', [movie.id], "23514", "Movie_duration_positive");
    await expectConstraint(`INSERT INTO "Showtime" (id,"movieId","auditoriumId","startsAt","endsAt","cleanupEndsAt","salesCutoffAt","basePrice","vipSurcharge","durationSnapshot","ageRatingSnapshot",status,"updatedAt") SELECT gen_random_uuid(),"movieId","auditoriumId","startsAt","endsAt","cleanupEndsAt","salesCutoffAt","basePrice","vipSurcharge","durationSnapshot","ageRatingSnapshot",status,"updatedAt" FROM "Showtime" WHERE id=$1`, [session.id], "23P01", "Showtime_no_room_overlap");
  } finally { await client.end(); }
  console.log("Database checks passed:", counts, "VI/EN translations, duration constraint, overlapping-room constraint. Test writes were rolled back.");
}
check().finally(() => db.$disconnect());
