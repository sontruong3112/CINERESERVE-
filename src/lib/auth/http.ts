import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { AuthError } from "./session";

export async function readAuthBody(
  request: Request,
  maximumBytes = 8192,
): Promise<Record<string, unknown>> {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AuthError("INVALID_ORIGIN", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AuthError("INVALID_INPUT", 400);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("INVALID_INPUT", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new AuthError("BODY_TOO_LARGE", 413);
    }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new AuthError("INVALID_INPUT", 400);
  }
}
export function authJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export function authFailure(error: unknown) {
  if (error instanceof AuthError)
    return authJson({ error: error.code }, error.status);
  // Never return raw database errors or credential input.
  return authJson({ error: "SERVER_ERROR" }, 500);
}
export async function throttle(
  scope: string,
  identity: string,
  maximum: number,
) {
  const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  const rows = await getDb().$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetsAt") VALUES (${key}, 1, clock_timestamp() + interval '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."resetsAt" <= clock_timestamp() THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "resetsAt" = CASE WHEN "AuthRateLimit"."resetsAt" <= clock_timestamp() THEN clock_timestamp() + interval '15 minutes' ELSE "AuthRateLimit"."resetsAt" END
    RETURNING "count"`;
  if (rows[0].count > maximum) throw new AuthError("TOO_MANY_REQUESTS", 429);
}
