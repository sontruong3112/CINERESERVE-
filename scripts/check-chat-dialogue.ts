import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readChatStream } from "../src/lib/chat/stream";
import type { ChatMovie, ChatInput, ChatReply } from "../src/lib/chat/shared";
import type { Directory } from "../src/lib/chat/catalogue";
const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = {
  id: "server-only",
  filename: require.resolve("server-only"),
  loaded: true,
  exports: {},
} as NodeJS.Module;
let checks = 0;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function rejects(fn: () => Promise<unknown>) {
  await assert.rejects(fn);
  checks++;
}
const directory: Directory = {
  movies: [
    {
      id: "a",
      title: "Robot",
      originalTitle: "Robot",
      director: "QA",
      age: "P",
      genres: ["animation"],
      synopsis: "A warm family adventure.",
    },
    {
      id: "b",
      title: "Adult film",
      originalTitle: "Adult film",
      director: "QA",
      age: "T18",
      genres: [],
      synopsis: "Adult drama.",
    },
  ],
  cinemas: [
    { id: "c", name: "Bắc Ninh", areaVi: "Bắc Ninh", areaEn: "Bac Ninh" },
  ],
  genres: [{ code: "animation", nameVi: "Hoạt hình", nameEn: "Animation" }],
};
const movie: ChatMovie = {
  id: "a",
  title: "Robot",
  href: "/vi/movies/robot#showtimes",
  age: "P",
  duration: 100,
  genres: ["Hoạt hình"],
  synopsis: "Warm family adventure",
  sessions: [],
};
const plan = {
  intent: "recommend",
  movieIds: [],
  cinemaId: null,
  date: null,
  genres: [],
  age: null,
  unavailable: false,
};
const answer = {
  mode: "catalogue",
  plan,
  text: "Một chuyến phiêu lưu ấm áp cho nhóm của bạn.",
  picks: [
    { id: "a", reason: "Ấm áp và dễ theo dõi, hợp một buổi xem nhẹ nhàng." },
  ],
  policyTopic: "all",
};
const input: ChatInput = {
  locale: "vi",
  messages: [{ role: "user", content: "phim vui" }],
};
async function main() {
  const { answerChat } = await import("../src/lib/chat/service");
  let calls = 0;
  const stages: string[] = [];
  let metrics: unknown;
  const deps = {
    directory: async () => directory,
    search: async () => [movie],
    generate: async () => {
      calls++;
      return answer;
    },
    onStage: (stage: "understanding" | "searching") => stages.push(stage),
    onMetrics: (value: unknown) => {
      metrics = value;
    },
  };
  const result = await answerChat(input, deps);
  check(calls === 1, "One provider call for recommendation");
  check(
    result.movies[0].reason === answer.picks[0].reason,
    "Grounded reason retained",
  );
  check(
    stages.join(",") === "understanding,searching",
    "Progress stages reflect work",
  );
  check(
    (metrics as { modelCalls: number }).modelCalls === 1,
    "Timing metadata, no question logged",
  );
  const chat = await answerChat(
    { ...input, messages: [{ role: "user", content: "2+2" }] },
    {
      ...deps,
      generate: async () => ({
        ...answer,
        mode: "conversation",
        text: "2 + 2 = 4.",
      }),
      search: async () => {
        throw new Error("No search for general chat");
      },
    },
  );
  check(
    chat.text.includes("4") && !chat.movies.length,
    "General conversation can contain numbers without pretending to be catalogue data",
  );
  const clarify = await answerChat(
    { ...input, messages: [{ role: "user", content: "ừ" }] },
    {
      ...deps,
      generate: async () => ({
        ...answer,
        mode: "clarify",
        text: "Bạn muốn tư vấn phim hay tìm lịch?",
      }),
      search: async () => {
        throw new Error("No invented search");
      },
    },
  );
  check(
    clarify.mode === "clarify" && !clarify.movies.length,
    "Ambiguous fragment asks one question",
  );
  const context: ChatInput = {
    locale: "vi",
    messages: [
      { role: "user", content: "bé 8 tuổi" },
      { role: "assistant", content: "Robot hoặc Adult film" },
      { role: "user", content: "phim đó" },
    ],
  };
  const before = calls;
  const ambiguous = await answerChat(context, deps);
  check(
    calls === before && ambiguous.mode === "clarify",
    "Multiple possible movie references ask locally without spending another model call",
  );
  check(
    ambiguous.suggestions?.length === 2,
    "Clarification provides actual movie names",
  );
  const comparison = await answerChat(
    {
      ...context,
      messages: [
        ...context.messages.slice(0, 2),
        { role: "user", content: "So sánh các phim này" },
      ],
    },
    {
      ...deps,
      generate: async () => ({
        ...answer,
        mode: "conversation",
        text: "Robot ấm áp, còn bộ phim kia có không khí căng thẳng hơn.",
      }),
    },
  );
  check(
    comparison.mode === "conversation",
    "Plural comparison is not mistaken for an ambiguous singular movie reference",
  );
  let captured: unknown;
  const follow = await answerChat(
    {
      ...context,
      messages: [
        ...context.messages.slice(0, 2),
        { role: "user", content: "mai Bac Ninh" },
      ],
    },
    {
      ...deps,
      generate: async (_prompt: string, payload: unknown) => {
        captured = payload;
        return {
          ...answer,
          plan: {
            ...plan,
            intent: "schedule",
            age: 8,
            cinemaId: "c",
            date: "2026-11-06",
          },
          picks: [{ id: "b", reason: "Drama" }],
        };
      },
    },
  );
  check(
    JSON.stringify(captured).includes("bé 8 tuổi") &&
      JSON.stringify(captured).includes("mai Bac Ninh"),
    "Short follow-up sends prior user context to the model",
  );
  check(
    follow.filters?.age === 8 && follow.filters.cinema === "Bắc Ninh",
    "Validated understood conditions returned",
  );
  check(
    follow.movies.every((m) => m.id === "a"),
    "Model pick outside server-filtered eligibility never reaches cards",
  );
  const remembered = await answerChat(
    {
      locale: "vi",
      messages: [
        { role: "user", content: "bé 8 tuổi" },
        { role: "assistant", content: "Lần trả lời trước chưa hoàn tất." },
        { role: "user", content: "mai Bac Ninh" },
      ],
    },
    {
      ...deps,
      generate: async () => ({ ...answer, plan: { ...plan, age: null } }),
    },
  );
  check(
    remembered.filters?.age === 8,
    "Explicit age survives a failed previous answer and a null model age",
  );
  const group = await answerChat(
    {
      locale: "vi",
      messages: [
        { role: "user", content: "bé 8 tuổi" },
        { role: "assistant", content: "Bạn muốn xem phim gì?" },
        { role: "user", content: "anh 20 tuổi đi cùng" },
      ],
    },
    {
      ...deps,
      generate: async () => ({ ...answer, plan: { ...plan, age: 20 } }),
    },
  );
  check(
    group.filters?.age === 8,
    "Adding an older companion does not erase the youngest viewer",
  );
  for (const topic of ["hold", "payment", "qr", "refund", "all"]) {
    const policy = await answerChat(input, {
      ...deps,
      generate: async () => ({
        ...answer,
        mode: "policy",
        policyTopic: topic,
        text: "Fake policy invented by model",
      }),
    });
    check(
      policy.source === "guide" && !policy.text.includes("Fake policy"),
      `Authoritative policy: ${topic}`,
    );
  }
  for (const raw of [
    { ...answer, mode: "unknown" },
    { ...answer, text: "<script>" },
    { ...answer, text: "https://wrong.test" },
    { ...answer, plan: { ...plan, cinemaId: "private" } },
    { ...answer, picks: [{ id: "invented", reason: "Test" }] },
    { ...answer, picks: [answer.picks[0], answer.picks[0]] },
  ])
    await rejects(() =>
      answerChat(input, { ...deps, generate: async () => raw }),
    );
  const blocked = await answerChat(input, {
    ...deps,
    generate: async () => ({ ...answer, mode: "restricted" }),
    search: async () => {
      throw new Error("No transaction access");
    },
  });
  check(
    blocked.source === "guide" && !blocked.movies.length,
    "No booking/private actions",
  );
  const noMatch = await answerChat(input, {
    ...deps,
    generate: async () => ({ ...answer, plan: { ...plan, unavailable: true } }),
    search: async () => {
      throw new Error("Do not substitute unavailable branch/movie");
    },
  });
  check(
    !noMatch.movies.length && noMatch.text.includes("Chưa có"),
    "Unavailable request never substitutes another movie",
  );
  const injected = await answerChat(input, {
    ...deps,
    generate: async () => ({ ...answer, text: "Giá 123 VND" }),
  });
  check(
    !injected.text.includes("123"),
    "Unverified operational digits not rendered in catalogue intro",
  );
  const reply: ChatReply = {
    text: "Xin chào bạn!",
    movies: [],
    source: "gemini",
    mode: "conversation",
    checkedAt: new Date().toISOString(),
  };
  const encoder = new TextEncoder();
  function response(text: string, chunk = 1) {
    const bytes = encoder.encode(text);
    return new Response(
      new ReadableStream({
        start(controller) {
          for (let i = 0; i < bytes.length; i += chunk)
            controller.enqueue(bytes.slice(i, i + chunk));
          controller.close();
        },
      }),
    );
  }
  const frames =
    JSON.stringify({ type: "stage", stage: "understanding" }) +
    "\n" +
    JSON.stringify({ type: "reply", reply }) +
    "\n";
  const seen: string[] = [];
  const streamed = await readChatStream(response(frames), (stage) =>
    seen.push(stage),
  );
  check(
    streamed.text === reply.text,
    "UTF-8 accents survive byte-split stream",
  );
  check(seen[0] === "understanding", "Progress before final reply");
  check(
    (await readChatStream(response(frames.trimEnd(), 13), () => {})).text ===
      reply.text,
    "Final frame without newline accepted",
  );
  await rejects(() => readChatStream(response("{broken\n"), () => {}));
  await rejects(() =>
    readChatStream(
      response('{"type":"stage","stage":"understanding"}\n'),
      () => {},
    ),
  );
  await rejects(() =>
    readChatStream(response('{"type":"error","error":"TIMEOUT"}\n'), () => {}),
  );
  await rejects(() =>
    readChatStream(
      response(frames + JSON.stringify({ type: "reply", reply }) + "\n"),
      () => {},
    ),
  );
  await rejects(() =>
    readChatStream(response("x".repeat(100001), 65536), () => {}),
  );
  const snapshot = { age: 8, cinemaId: "c", date: "2026-11-07" };
  const longChat = await answerChat(
    {
      locale: "vi",
      messages: [{ role: "user", content: "con phim nao nua" }],
      context: snapshot,
    },
    {
      ...deps,
      generate: async () => ({
        ...answer,
        plan: { ...plan, age: 18, date: "2026-11-05" },
      }),
    },
  );
  check(
    longChat.filters?.age === 8 &&
      longChat.filters.cinema === "Bắc Ninh" &&
      longChat.filters.date === "2026-11-07",
    "Age/cinema/date survive history truncation and mistaken model changes",
  );
  check(
    JSON.stringify(longChat.context) === JSON.stringify(snapshot),
    "Validated snapshot returned to the next turn",
  );
  const unavailableBranch = await answerChat(
    {
      locale: "vi",
      messages: [{ role: "user", content: "con phim khac" }],
      context: { ...snapshot, cinemaId: "deleted" },
    },
    {
      ...deps,
      generate: async () => {
        throw new Error("Must ask instead of substituting a cinema");
      },
    },
  );
  check(
    unavailableBranch.mode === "clarify" &&
      !unavailableBranch.movies.length &&
      unavailableBranch.context?.cinemaId === null,
    "Removed branch asks again without exposing private IDs or substituting all cinemas",
  );
  const { geminiGenerator } = await import("../src/lib/chat/provider");
  const saved = {
    enabled: process.env.CHATBOT_ENABLED,
    key: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
  };
  try {
    process.env.CHATBOT_ENABLED = "true";
    process.env.GEMINI_API_KEY = "qa-not-real";
    process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
    let attempts = 0;
    let deadline: RequestInit["signal"];
    const transport: typeof fetch = async (_url, init) => {
      attempts++;
      if (attempts === 1) {
        deadline = init?.signal;
        return new Response("{}", { status: 503 });
      }
      check(deadline === init?.signal, "Retry shares original deadline");
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"ok":true}' }] },
          },
        ],
      });
    };
    const generated = await geminiGenerator(undefined, transport)("", {}, {});
    check(
      attempts === 2 && (generated as { ok: boolean }).ok,
      "One bounded retry for transient 503",
    );
    attempts = 0;
    await rejects(() =>
      geminiGenerator(undefined, async () => {
        attempts++;
        return new Response("{}", { status: 429 });
      })("", {}, {}),
    );
    check(attempts === 1, "Quota errors are not automatically retried");
  } finally {
    for (const [key, value] of [
      ["CHATBOT_ENABLED", saved.enabled],
      ["GEMINI_API_KEY", saved.key],
      ["GEMINI_MODEL", saved.model],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
  console.log(
    `Dialogue/stream checks passed: ${checks}. Mock AI; no paid API calls or AI-quality claims.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
