import type { ChatReply } from "./shared";

/** Only progress and a fully validated final answer are displayed, never partial provider JSON. */
export async function readChatStream(
  response: Response,
  onStage: (stage: "understanding" | "searching") => void,
): Promise<ChatReply> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("SERVER_ERROR");
  const decoder = new TextDecoder();
  let buffer = "",
    total = 0,
    reply: ChatReply | undefined;
  function event(line: string) {
    if (!line.trim()) return;
    const value = JSON.parse(line);
    if (
      value.type === "stage" &&
      (value.stage === "understanding" || value.stage === "searching")
    )
      onStage(value.stage);
    else if (value.type === "error")
      throw new Error(
        typeof value.error === "string" ? value.error : "SERVER_ERROR",
      );
    else if (value.type === "reply") {
      if (
        reply ||
        !value.reply ||
        typeof value.reply.text !== "string" ||
        !Array.isArray(value.reply.movies)
      )
        throw new Error("SERVER_ERROR");
      reply = value.reply;
    }
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 100000) throw new Error("SERVER_ERROR");
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        event(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) event(buffer);
    if (!reply) throw new Error("SERVER_ERROR");
    return reply;
  } finally {
    await reader.cancel().catch(() => {});
  }
}
