import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { ChatError } from "./shared";

export async function consumeChatLimit(
  scope: string,
  identity: string,
  maximum: number,
  seconds: number,
  daily = false,
) {
  const key = createHash("sha256")
    .update(`chat:${scope}:${identity}`)
    .digest("hex");
  const [row] = await getDb().$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetsAt") VALUES (${key}, 1, clock_timestamp() + make_interval(secs => ${seconds}::int))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."resetsAt" <= clock_timestamp() THEN 1 ELSE LEAST("AuthRateLimit"."count" + 1, ${maximum + 1}) END,
      "resetsAt" = CASE WHEN "AuthRateLimit"."resetsAt" <= clock_timestamp() THEN clock_timestamp() + make_interval(secs => ${seconds}::int) ELSE "AuthRateLimit"."resetsAt" END
    RETURNING "count"`;
  if (row.count > maximum)
    throw new ChatError(daily ? "DAILY_LIMIT" : "TOO_MANY_REQUESTS", 429);
}
