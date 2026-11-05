import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { readChatStream } from "../src/lib/chat/stream";
const base = "http://localhost:3001",
  baseline = process.argv.includes("--baseline"),
  streaming = process.argv.includes("--stream");
const questions = baseline
  ? ["phim vui", "phim hoạt hình cho bé 8 tuổi"]
  : [
      "chào",
      "phim vui",
      "bé 8 tuổi",
      "mai Bac Ninh",
      "phim đó nói về gì",
      "2+2 bằng mấy",
      "giữ bao lâu",
      "đặt luôn giúp tôi",
    ];
async function main() {
  let cookie = "";
  const history: { role: "user" | "assistant"; content: string }[] = [],
    rows = [];
  for (const [index, question] of questions.entries()) {
    const messages =
      baseline || index < 2 || index > 4
        ? [{ role: "user", content: question }]
        : [...history.slice(-6), { role: "user", content: question }];
    const start = Date.now();
    const response = await fetch(base + "/api/chat", {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        ...(streaming ? { Accept: "application/x-ndjson" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ locale: "vi", messages }),
      signal: AbortSignal.timeout(40000),
    });
    cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
    let firstStageMs: number | undefined;
    const reply =
      response.ok && streaming
        ? await readChatStream(response, () => {
            firstStageMs ??= Date.now() - start;
          }).catch((error) => ({ error: error.message }))
        : await response.json();
    rows.push({
      question,
      status:
        "error" in reply
          ? response.ok
            ? 502
            : response.status
          : response.status,
      firstStageMs,
      elapsedMs: Date.now() - start,
      reply,
    });
    if (!response.ok || "error" in reply) {
      console.log(
        JSON.stringify({
          question,
          status: response.status,
          error: reply.error,
        }),
      );
      if (!baseline)
        history.push(
          { role: "user", content: question },
          { role: "assistant", content: "Lần trả lời trước chưa hoàn tất." },
        );
      continue;
    }
    try {
      assert.equal(typeof reply.text, "string");
      if (!baseline && index === 2)
        assert.equal(reply.filters?.age, 8, "Explicit young viewer age");
      if (!baseline && index === 3) {
        assert.equal(reply.filters?.age, 8, "Follow-up preserves age");
        assert.ok(
          reply.filters?.cinema?.includes("Bắc Ninh"),
          "Short accent-free branch follow-up",
        );
      }
      if (!baseline && index === 7)
        assert.equal(reply.movies.length, 0, "No booking actions");
    } catch (error) {
      Object.assign(rows[rows.length - 1], {
        issue: error instanceof Error ? error.message : "Assertion failed",
      });
    }
    history.push(
      { role: "user", content: question },
      {
        role: "assistant",
        content: (
          reply.text +
          "\n" +
          reply.movies.map((m: { title: string }) => m.title).join(", ")
        ).slice(0, 1200),
      },
    );
    console.log(
      JSON.stringify({
        question,
        elapsedMs: Date.now() - start,
        movies: reply.movies.length,
        mode: reply.mode || "legacy",
      }),
    );
  }
  await mkdir(".qa", { recursive: true });
  await writeFile(
    `.qa/chat-${baseline ? "baseline" : "upgraded"}-${streaming ? "stream-" : ""}${Date.now()}-live.json`,
    JSON.stringify(rows, null, 2),
  );
  if (rows.some((row) => row.status !== 200 || "issue" in row))
    process.exitCode = 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Live check failed");
  process.exitCode = 1;
});
