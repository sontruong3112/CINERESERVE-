import EmbeddedPostgres from "embedded-postgres";
import { randomBytes } from "node:crypto";
import { mkdir, access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "dotenv";

const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, ".local", "postgres");
const envFile = resolve(root, ".env");
try {
  await access(envFile);
} catch {
  const password = randomBytes(24).toString("hex");
  await writeFile(envFile, `DATABASE_URL="postgresql://cinereserve:${password}@127.0.0.1:55432/cinereserve"\nCATALOGUE_SOURCE="database"\nALLOW_DEMO_SEED="true"\n`, { flag: "wx", mode: 0o600 });
}
const settings = parse(await readFile(envFile));
const url = new URL(settings.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/cinereserve" || url.username !== "cinereserve") {
  throw new Error("This script manages only the dedicated localhost:55432/cinereserve cluster. Existing .env was not changed.");
}
await mkdir(resolve(root, ".local"), { recursive: true });
const pg = new EmbeddedPostgres({ databaseDir: directory, port: 55432, user: "cinereserve", password: decodeURIComponent(url.password), persistent: true, authMethod: "scram-sha-256", postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: (message) => console.error(String(message)) });
try { await access(resolve(directory, "PG_VERSION")); } catch { await pg.initialise(); }
await pg.start();
const client = pg.getPgClient("postgres", "127.0.0.1");
try {
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["cinereserve"]);
  if (!existing.rowCount) await client.query('CREATE DATABASE "cinereserve"');
} finally { await client.end(); }
console.log("CineReserve PostgreSQL is running at 127.0.0.1:55432. Keep this terminal open. Ctrl+C stops the server; data is preserved.");
setInterval(() => {}, 60_000);
