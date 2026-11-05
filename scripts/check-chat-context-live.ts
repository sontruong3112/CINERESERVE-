import { mkdir, writeFile } from "node:fs/promises";
import type { ChatMessage, ChatReply } from "../src/lib/chat/shared";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = {
  id: "server-only",
  filename: require.resolve("server-only"),
  loaded: true,
  exports: {},
} as NodeJS.Module;

const base = "http://localhost:3001";
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
});
const day = (offset: number) =>
  new Date(+new Date(`${today}T12:00:00Z`) + offset * 86400000)
    .toISOString()
    .slice(0, 10);
const chains = [
  [
    {
      q: "phim cho be 8 tuoi mai Bac Ninh",
      age: 8,
      cinema: "Bắc Ninh",
      date: day(1),
    },
    { q: "Ha Noi nhe", age: 8, cinema: "Hà Nội", date: day(1) },
    { q: "ngay kia", age: 8, cinema: "Hà Nội", date: day(2) },
    { q: "them anh 20 tuoi", age: 8, cinema: "Hà Nội", date: day(2) },
    { q: "tim phim khac", age: 8, cinema: "Hà Nội", date: day(2) },
    { q: "con phim nao nua", age: 8, cinema: "Hà Nội", date: day(2) },
  ],
  [
    { q: "mai Ha Noi, di voi be 10t", age: 10, cinema: "Hà Nội", date: day(1) },
    { q: "doi sang Bac Ninh", age: 10, cinema: "Bắc Ninh", date: day(1) },
    {
      q: "khong phai 10, be 12 tuoi",
      age: 12,
      cinema: "Bắc Ninh",
      date: day(1),
    },
    { q: "hom nay", age: 12, cinema: "Bắc Ninh", date: today },
  ],
];
async function main() {
  const { ageAllowed } = await import("../src/lib/chat/catalogue");
  const rows = [];
  for (const [chain, steps] of chains.entries()) {
    const history: ChatMessage[] = [];
    let cookie = "";
    let context: ChatReply["context"];
    for (const step of steps) {
      const start = Date.now();
      let reply: (ChatReply & { error?: string }) | undefined,
        status = 0;
      try {
        const response = await fetch(base + "/api/chat", {
          method: "POST",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: JSON.stringify({
            locale: "vi",
            ...(context ? { context } : {}),
            messages: [...history.slice(-8), { role: "user", content: step.q }],
          }),
          signal: AbortSignal.timeout(35000),
        });
        cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
        status = response.status;
        reply = await response.json();
      } catch {
        reply = {
          text: "",
          movies: [],
          source: "guide",
          checkedAt: new Date().toISOString(),
          error: "TRANSPORT_ERROR",
        };
      }
      if (status === 200 && reply && !reply.error && reply.context)
        context = reply.context;
      const issues: string[] = [];
      if (status === 200 && !reply?.error) {
        if (reply?.filters?.age !== step.age) issues.push("age");
        if (!reply?.filters?.cinema?.includes(step.cinema))
          issues.push("cinema");
        if (reply?.filters?.date !== step.date) issues.push("date");
        for (const movie of reply?.movies || []) {
          if (!ageAllowed(movie.age, step.age)) issues.push("ineligible_movie");
          for (const session of movie.sessions) {
            if (session.cinema.indexOf(step.cinema) < 0)
              issues.push("wrong_session_cinema");
            if (
              new Date(session.startsAt).toLocaleDateString("en-CA", {
                timeZone: "Asia/Ho_Chi_Minh",
              }) !== step.date
            )
              issues.push("wrong_session_date");
          }
        }
      }
      rows.push({
        chain,
        question: step.q,
        expected: step,
        status,
        error: reply?.error,
        issues,
        elapsedMs: Date.now() - start,
        reply,
      });
      history.push(
        { role: "user", content: step.q },
        {
          role: "assistant",
          content:
            reply && !reply.error
              ? (
                  reply.text +
                  "\n" +
                  reply.movies.map((movie) => movie.title).join(", ")
                ).slice(0, 1200)
              : "Lần trả lời trước chưa hoàn tất.",
        },
      );
      console.log(
        JSON.stringify({
          chain,
          question: step.q,
          status,
          error: reply?.error,
          issues,
          filters: reply?.filters,
          elapsedMs: Date.now() - start,
        }),
      );
    }
  }
  await mkdir(".qa", { recursive: true });
  await writeFile(
    `.qa/chat-context-${Date.now()}.json`,
    JSON.stringify(rows, null, 2),
  );
  if (rows.some((row) => row.status !== 200 || row.error || row.issues.length))
    process.exitCode = 1;
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Context check failed",
  );
  process.exitCode = 1;
});
