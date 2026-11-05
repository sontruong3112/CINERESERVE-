import "server-only";
import { ChatError } from "./shared";

export type Generate = (
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
) => Promise<unknown>;
export function chatConfigured() {
  return (
    process.env.CHATBOT_ENABLED === "true" &&
    Boolean(process.env.GEMINI_API_KEY?.trim())
  );
}
export function geminiGenerator(
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Generate {
  return async (instructions, input, schema) => {
    if (!chatConfigured()) throw new ChatError("NOT_CONFIGURED", 503);
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    if (!/^gemini-[a-z0-9.-]{1,80}$/.test(model))
      throw new ChatError("NOT_CONFIGURED", 503);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!.trim(),
        },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(18000)])
          : AbortSignal.timeout(18000),
        cache: "no-store",
        redirect: "error",
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(input) }] },
          ],
          generationConfig: {
            maxOutputTokens: 1600,
            ...(/^gemini-3\./.test(model)
              ? { thinkingConfig: { thinkingLevel: "MINIMAL" } }
              : {}),
            candidateCount: 1,
            responseFormat: {
              text: { mimeType: "APPLICATION_JSON", schema },
            },
          },
        }),
      };
      let response = await request(endpoint, init);
      // Only transient 503 gets one retry, inside the SAME deadline. Never retry quota/input errors.
      if (response.status === 503 && !init.signal?.aborted) {
        console.info(
          JSON.stringify({ event: "chat_provider", status: 503, retry: true }),
        );
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 250));
        response = await request(endpoint, init);
      }
      if (!response.ok) {
        console.info(
          JSON.stringify({ event: "chat_provider", status: response.status }),
        );
        await response.body?.cancel();
        throw new ChatError(
          response.status === 429 ? "PROVIDER_LIMIT" : "PROVIDER_ERROR",
          503,
        );
      }
      const raw = await response.text();
      if (raw.length > 100000) throw new ChatError("PROVIDER_ERROR", 502);
      const result = JSON.parse(raw);
      const candidate = result.candidates?.[0];
      if (
        candidate?.finishReason !== "STOP" ||
        !Array.isArray(candidate.content?.parts)
      ) {
        console.info(
          JSON.stringify({
            event: "chat_provider",
            finishReason: candidate?.finishReason || "NO_CANDIDATE",
          }),
        );
        throw new ChatError("PROVIDER_ERROR", 502);
      }
      const text = candidate.content.parts
        .filter((part: { thought?: boolean }) => !part.thought)
        .map((part: { text?: string }) => part.text || "")
        .join("");
      if (!text || text.length > 14000)
        throw new ChatError("PROVIDER_ERROR", 502);
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof ChatError) throw error;
      if (
        signal?.aborted ||
        (error instanceof Error &&
          ["TimeoutError", "AbortError"].includes(error.name))
      )
        throw new ChatError("TIMEOUT", 504);
      throw new ChatError("PROVIDER_ERROR", 503);
    }
  };
}
