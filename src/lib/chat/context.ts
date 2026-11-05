import type { ChatContext, ChatMessage } from "./shared";
import type { Directory, SearchPlan } from "./catalogue";
import { searchText } from "@/lib/schedule";

/** Previous filters are self-declared preferences, never authority to access private data. */
export function preserveChatContext(
  plan: SearchPlan,
  messages: ChatMessage[],
  previous: ChatContext | undefined,
  directory: Directory,
): SearchPlan {
  // A failed turn did not produce a new snapshot. Replay only the unanswered tail,
  // not old errors that were already followed by a successful response.
  if (previous) {
    const pending = [messages.at(-1)!];
    for (let index = messages.length - 2; index >= 1; index -= 2) {
      const content = messages[index].content.trim();
      if (
        content !== "Lần trả lời trước chưa hoàn tất." &&
        content !== "The previous response did not complete."
      )
        break;
      pending.unshift(messages[index - 1]);
    }
    if (pending.length > 1) {
      let state = previous,
        result = plan;
      for (const message of pending) {
        result = preserveChatContext(plan, [message], state, directory);
        state = {
          age: result.age,
          cinemaId: result.cinemaId,
          date: result.date,
        };
      }
      return result;
    }
  }
  const text = searchText(messages.at(-1)!.content),
    next = { ...plan };
  const clearAge =
    /bo(?: loc| dieu kien)?(?: do)? tuoi|khong loc tuoi|clear.*age/.test(text);
  const clearCinema =
    /tat ca (?:cac )?rap|rap nao cung duoc|bo(?: loc)? rap|all cinemas|any cinema/.test(
      text,
    );
  const clearDate =
    /bo(?: loc)? ngay|ngay nao cung duoc|khong loc ngay|any date|clear.*date/.test(
      text,
    );
  const newGroup = /doi nhom|nhom moi|new group/.test(text);
  const bareAgeCorrection =
    /(?:khong|ko) phai\s+\d{1,3}\s*(?:tuoi|t)?\s*[,;]?\s*ma\s+(\d{1,3})\b/.exec(
      text,
    );
  const ageChange =
    /\b\d{1,3}\s*(?:tuoi|t\b|years? old)|\b(?:be|tre em|child|kid)\b|nguoi lon|adults|\bage\b/.test(
      text,
    ) ||
    newGroup ||
    Boolean(bareAgeCorrection) ||
    clearAge;
  const branchChange =
    directory.cinemas.some((branch) => {
      const aliases = [branch.name, branch.areaVi, branch.areaEn]
        .map(searchText)
        .filter((value) => value.length >= 3);
      return (
        aliases.some((alias) => text.includes(alias)) ||
        [branch.areaVi, branch.areaEn].some((area) => {
          const words = searchText(area).split(/\s+/);
          const abbreviation =
            words.length === 2 ? words.map((word) => word[0]).join("") : "";
          return (
            abbreviation.length === 2 &&
            new RegExp(`\\b${abbreviation}\\b`).test(text)
          );
        })
      );
    }) ||
    /doi.*rap|doi sang|chuyen sang|rap khac|change.*cinema|other cinema/.test(text) ||
    clearCinema;
  const dateChange =
    /\bmai\b|\bkia\b|hom nay|hom sau|tomorrow|today|thu\s*[2-7]|\bt[2-7]\b|chu nhat|cuoi tuan|weekend|\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|\d{1,4}[/-]\d{1,2}|doi.*ngay|ngay khac|\bngay\s+\d{1,2}\b/.test(
      text,
    ) || clearDate;
  if (previous) {
    if (!ageChange) next.age = previous.age;
    if (!branchChange) next.cinemaId = previous.cinemaId;
    if (!dateChange) next.date = previous.date;
  }
  if (clearAge) next.age = null;
  if (clearCinema) next.cinemaId = null;
  if (clearDate) next.date = null;
  let explicitAge: number | undefined = previous?.age ?? undefined;
  // With a prior snapshot, old messages describe previous groups; only apply the latest update.
  const users = previous
    ? messages.slice(-1)
    : messages.filter((message) => message.role === "user");
  for (const message of users) {
    let value = searchText(message.content);
    if (
      /(?:khong|ko) phai|\bnot\b/.test(value) &&
      /\d{1,3}\s*(?:tuoi|t\b|years? old)/.test(value)
    ) {
      explicitAge = undefined;
      // A correction must not retain the age it explicitly rejects.
      if (/\bma\b|\bbut\b/.test(value))
        value = value.split(/\bma\b|\bbut\b/).at(-1)!;
      else if (/\d{1,3}\s*(?:tuoi|t\b|years? old)/.test(value))
        value = value.replace(
          /khong phai\s+\d{1,3}\s*(?:tuoi|t\b|years? old)?/,
          "",
        );
      else continue;
    }
    if (/doi nhom|nhom moi|new group/.test(value)) explicitAge = undefined;
    if (/chi nguoi lon|adults only|all adults/.test(value)) explicitAge = 18;
    const ages = [...value.matchAll(/\b(\d{1,3})\s*(?:tuoi|t\b|years? old)\b/g)]
      .map((match) => Number(match[1]))
      .filter((age) => age <= 120);
    if (ages.length) explicitAge = Math.min(explicitAge ?? 120, ...ages);
  }
  if (bareAgeCorrection && Number(bareAgeCorrection[1]) <= 120)
    explicitAge = Number(bareAgeCorrection[1]);
  if (!clearAge && explicitAge !== undefined) next.age = explicitAge;
  return next;
}
