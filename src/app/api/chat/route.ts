import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { readAuthBody, authJson, authFailure } from "@/lib/auth/http";
import { ChatError, parseChatInput } from "@/lib/chat/shared";
import { chatConfigured, geminiGenerator } from "@/lib/chat/provider";
import { answerChat } from "@/lib/chat/service";
import { consumeChatLimit } from "@/lib/chat/limits";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const requestId = randomUUID(),
    start = Date.now();
  try {
    const input = parseChatInput(await readAuthBody(request, 16000));
    if (!chatConfigured()) throw new ChatError("NOT_CONFIGURED", 503);
    const jar = await cookies(),
      name = "cinereserve_chat";
    const existing = jar.get(name)?.value;
    const visitor =
      existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : randomUUID();
    jar.set(name, visitor, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/api/chat",
      maxAge: 86400,
    });
    // Shared global cap still applies if a client forges or rotates the anonymous cookie.
    await consumeChatLimit("visitor", visitor, 10, 900);
    await consumeChatLimit("global", "all", 60, 900);
    const configured = Number(process.env.CHATBOT_DAILY_REQUEST_LIMIT || "100");
    const daily =
      Number.isInteger(configured) && configured >= 1 && configured <= 1000
        ? configured
        : 100;
    await consumeChatLimit("daily", "all", daily, 86400, true);
    const cancellation = new AbortController();
    const run = async (
      onStage?: (stage: "understanding" | "searching") => void,
    ) => {
      let metrics = {};
      const reply = await answerChat(input, {
        generate: geminiGenerator(
          AbortSignal.any([
            request.signal,
            cancellation.signal,
            AbortSignal.timeout(25000),
          ]),
        ),
        onStage,
        onMetrics: (value) => {
          metrics = value;
        },
      });
      // No question, response, token, IP, cookie or provider error payload is logged.
      console.info(
        JSON.stringify({
          event: "chat",
          requestId,
          result: "ok",
          durationMs: Date.now() - start,
          ...metrics,
        }),
      );
      return { ...reply, requestId };
    };
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      let closed = false;
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (value: unknown) => {
            if (!closed)
              try {
                controller.enqueue(
                  encoder.encode(JSON.stringify(value) + "\n"),
                );
              } catch {
                closed = true;
                cancellation.abort();
              }
          };
          try {
            const reply = await run((stage) => emit({ type: "stage", stage }));
            emit({ type: "reply", reply });
          } catch (error) {
            const code =
              error instanceof ChatError ? error.code : "SERVER_ERROR";
            emit({ type: "error", error: code, requestId });
            console.info(
              JSON.stringify({
                event: "chat",
                requestId,
                result: code,
                durationMs: Date.now() - start,
              }),
            );
          } finally {
            if (!closed) {
              closed = true;
              controller.close();
            }
          }
        },
        cancel() {
          closed = true;
          cancellation.abort();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "private, no-store",
          Vary: "Cookie, Accept",
          "X-Accel-Buffering": "no",
        },
      });
    }
    return authJson(await run());
  } catch (error) {
    const code = error instanceof ChatError ? error.code : "REQUEST_FAILED";
    console.info(
      JSON.stringify({
        event: "chat",
        requestId,
        result: code,
        durationMs: Date.now() - start,
      }),
    );
    if (error instanceof ChatError)
      return authJson({ error: error.code, requestId }, error.status);
    return authFailure(error);
  }
}
