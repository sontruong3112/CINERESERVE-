import assert from "node:assert/strict";
import { preserveChatContext } from "../src/lib/chat/context";
import { parseChatInput, type ChatContext } from "../src/lib/chat/shared";
import type { Directory, SearchPlan } from "../src/lib/chat/catalogue";
const directory = {
  movies: [],
  genres: [],
  cinemas: [
    { id: "hn", name: "CineReserve Hà Nội", areaVi: "Hà Nội", areaEn: "Hanoi" },
    {
      id: "bn",
      name: "CineReserve Bắc Ninh",
      areaVi: "Bắc Ninh",
      areaEn: "Bac Ninh",
    },
  ],
} satisfies Directory;
const plan: SearchPlan = {
  intent: "recommend",
  movieIds: [],
  cinemaId: null,
  date: null,
  genres: [],
  age: null,
  unavailable: false,
};
const previous: ChatContext = { age: 8, cinemaId: "bn", date: "2026-11-07" };
let checks = 0;
function expect(
  question: string,
  model: Partial<SearchPlan>,
  expected: ChatContext,
  old: ChatContext | null = previous,
  history: { role: "user" | "assistant"; content: string }[] = [],
) {
  const result = preserveChatContext(
    { ...plan, ...model },
    [...history, { role: "user", content: question }],
    old ?? undefined,
    directory,
  );
  assert.deepEqual(
    { age: result.age, cinemaId: result.cinemaId, date: result.date },
    expected,
    question,
  );
  checks++;
}
expect(
  "con phim nao nua",
  { age: 18, cinemaId: "hn", date: "2026-11-05" },
  previous,
);
expect("Ha Noi nhe", { cinemaId: "hn" }, { ...previous, cinemaId: "hn" });
expect("HN", { cinemaId: "hn" }, { ...previous, cinemaId: "hn" });
expect('con phim nao o rap khong',{cinemaId:null},previous);
expect("BN", { cinemaId: "bn" }, previous);
expect("ngay kia", { date: "2026-11-07" }, previous);
expect("hom nay", { date: "2026-11-05" }, { ...previous, date: "2026-11-05" });
expect("ngay mai", { date: "2026-11-06" }, { ...previous, date: "2026-11-06" });
expect("thu 7", { date: "2026-11-07" }, previous);
expect("07/11", { date: "2026-11-07" }, previous);
expect("them anh 20 tuoi", { age: 20 }, previous);
expect("bo toi 45 tuoi di cung", { age: 45 }, previous);
expect("khong phai HN ma BN", { age: null, cinemaId: "bn" }, previous);
expect("khong phai 8 ma 12", { age: 8 }, { ...previous, age: 12 });
expect("ngay 8", { date: "2026-11-08" }, { ...previous, date: "2026-11-08" });
expect(
  "hom nay",
  { age: null, date: "2026-11-05" },
  { ...previous, age: 12, date: "2026-11-05" },
  previous,
  [
    { role: "user", content: "khong phai 8 tuoi ma 12 tuoi" },
    { role: "assistant", content: "Lần trả lời trước chưa hoàn tất." },
  ],
);
expect("be 6t", { age: null }, { ...previous, age: 6 });
expect("be 10t", { age: null }, { age: 10, cinemaId: null, date: null }, null);
expect("khong phai 8 tuoi ma 12 tuoi", { age: 12 }, { ...previous, age: 12 });
expect("khong phai 10, be 12 tuoi", { age: 12 }, { ...previous, age: 12 });
expect("doi nhom, be 12 tuoi", { age: 12 }, { ...previous, age: 12 });
expect("chi nguoi lon", { age: 18 }, { ...previous, age: 18 });
expect("bo loc tuoi", { age: 8 }, { ...previous, age: null });
expect("tat ca rap", { cinemaId: "hn" }, { ...previous, cinemaId: null });
expect(
  "ngay nao cung duoc",
  { date: "2026-11-06" },
  { ...previous, date: null },
);
expect(
  "co phim khac ko",
  { age: 8, cinemaId: "bn", date: "2026-11-07" },
  previous,
  previous,
  [
    { role: "user", content: "di voi be 5 tuoi o Ha Noi" },
    { role: "assistant", content: "Old group" },
  ],
);
expect("them nguoi 30 years old", { age: 30 }, previous);
expect(
  "con phim nao nua",
  { age: 8, cinemaId: "bn", date: "2026-11-07" },
  { age: null, cinemaId: null, date: null },
  { age: null, cinemaId: null, date: null },
  [
    { role: "user", content: "be 8 tuoi mai Bac Ninh" },
    { role: "assistant", content: "Old constraints before clear" },
  ],
);
const input = {
  locale: "vi",
  messages: [{ role: "user", content: "phim vui" }],
};
const safe = {
  age: 8,
  cinemaId: "11111111-1111-4111-8111-111111111111",
  date: "2026-11-07",
};
assert.deepEqual(parseChatInput({ ...input, context: safe }).context, safe);
checks++;
for (const context of [
  null,
  [],
  {},
  { ...safe, age: -1 },
  { ...safe, age: 121 },
  { ...safe, age: "8" },
  { ...safe, cinemaId: "../../private" },
  { ...safe, date: "2026-02-30" },
  { ...safe, role: "ADMIN" },
  { ...safe, token: "secret" },
]) {
  assert.throws(() => parseChatInput({ ...input, context }));
  checks++;
}
console.log(
  `Chat context checks passed: ${checks}. No API calls, no DB writes.`,
);
