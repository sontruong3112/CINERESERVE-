import type { Locale } from "@/lib/i18n";
import { validDay } from "@/lib/schedule";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatContext = {
  age: number | null;
  cinemaId: string | null;
  date: string | null;
};
export type ChatInput = {
  locale: Locale;
  messages: ChatMessage[];
  context?: ChatContext;
};
export type ChatMovie = {
  id: string;
  title: string;
  href: string;
  age: string;
  duration: number;
  genres: string[];
  synopsis: string;
  reason?: string;
  sessions: {
    id: string;
    href: string;
    startsAt: string;
    cinema: string;
    room: string;
    basePrice: number;
    vipSurcharge: number;
  }[];
};
export type ChatReply = {
  context?: ChatContext;
  mode?: "catalogue" | "conversation" | "clarify" | "policy" | "restricted";
  suggestions?: string[];
  text: string;
  movies: ChatMovie[];
  source: "gemini" | "guide";
  checkedAt: string;
  filters?: {
    date: string | null;
    cinema: string | null;
    age: number | null;
    genres: string[];
  };
};
export class ChatError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function parseChatInput(body: Record<string, unknown>): ChatInput {
  if (
    !["vi", "en"].includes(String(body.locale)) ||
    !Array.isArray(body.messages) ||
    body.messages.length < 1 ||
    body.messages.length > 9
  )
    throw new ChatError("INVALID_INPUT");
  let total = 0;
  const messages = body.messages.map((item: unknown, index: number) => {
    if (!item || typeof item !== "object") throw new ChatError("INVALID_INPUT");
    const { role, content } = item as Record<string, unknown>;
    if (
      role !== (index % 2 === 0 ? "user" : "assistant") ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 1200
    )
      throw new ChatError("INVALID_INPUT");
    total += content.length;
    if (
      role === "user" &&
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\s.-]?){9,}|AIza[\w-]{20,}|sk-[\w-]{16,}|TK-[A-F0-9]{24}|(?:password|mật khẩu|api key)\s*[:=]\s*\S+/i.test(
        content
          .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
          .replace(/\b\d{1,2}:\d{2}\b/g, ""),
      )
    )
      throw new ChatError("SENSITIVE_INPUT");
    return { role, content: content.trim() } as ChatMessage;
  });
  if (messages.length % 2 === 0 || total > 7000)
    throw new ChatError("INVALID_INPUT");
  const context = body.context;
  if (context !== undefined) {
    if (!context || typeof context !== "object" || Array.isArray(context))
      throw new ChatError("INVALID_INPUT");
    const c = context as Record<string, unknown>;
    if (
      Object.keys(c).some(
        (key) => !["age", "cinemaId", "date"].includes(key),
      ) ||
      !(
        c.age === null ||
        (typeof c.age === "number" &&
          Number.isInteger(c.age) &&
          c.age >= 0 &&
          c.age <= 120)
      ) ||
      !(
        c.cinemaId === null ||
        (typeof c.cinemaId === "string" && /^[0-9a-f-]{36}$/i.test(c.cinemaId))
      ) ||
      !(c.date === null || (typeof c.date === "string" && validDay(c.date)))
    )
      throw new ChatError("INVALID_INPUT");
  }
  return {
    locale: body.locale as Locale,
    messages,
    ...(context !== undefined ? { context: context as ChatContext } : {}),
  };
}
export const chatCopy = {
  vi: {
    title: "Trợ lý chọn phim",
    subtitle: "Cùng bạn chọn phim và lên một buổi xem đáng nhớ.",
    open: "Tư vấn phim",
    close: "Đóng trợ lý",
    reset: "Cuộc trò chuyện mới",
    welcome:
      "Chào bạn! Bạn có thể nói ngắn thôi: “phim vui”, “mai Bắc Ninh”, hoặc “đi với bé 8 tuổi”. Tôi có thể tư vấn gu phim, giải thích nội dung không spoil và tìm lịch phù hợp. Chưa rõ ý thì tôi sẽ hỏi thêm nhé.",
    suggestions: ["phim vui", "mai Bắc Ninh", "đi với bé 8 tuổi"],
    privacy:
      "Câu hỏi được gửi đến Google Gemini để tư vấn. Không nhập mật khẩu, thông tin cá nhân hoặc mã vé. Hội thoại chỉ giữ tạm trong tab này.",
    placeholder: "Bạn thích phim gì, đi rạp nào?",
    send: "Gửi",
    thinking: "Đang hiểu câu hỏi của bạn…",
    searching: "Đang đối chiếu phim và lịch mở bán…",
    knowledge: "Trò chuyện AI · kiến thức chung, không phải lịch/giá hiện tại",
    stop: "Dừng trả lời",
    retry: "Thử lại câu này",
    ai: "Gợi ý AI · hãy kiểm tra chi tiết trước khi đặt",
    guide: "Hướng dẫn hệ thống",
    find: "Tìm phim",
    policies: "Hướng dẫn đặt vé",
    empty:
      "Không có phim phù hợp với các điều kiện đã hiểu. Bạn có thể đổi thể loại, tuổi, rạp hoặc ngày.",
    noSessions: "Chưa có suất phù hợp trong lần tra cứu này.",
    price: "Ghế thường",
    vip: "Phụ thu VIP",
    minute: "phút",
    checked: "Tra cứu lúc",
    filters: "Điều kiện đã hiểu",
    age: "Tuổi",
    clear: "Đã xóa cuộc trò chuyện.",
    errors: {
      CANCELLED: "Đã dừng trả lời. Bạn có thể hỏi tiếp hoặc thử lại câu này.",
      SENSITIVE_INPUT:
        "Hãy bỏ email, số điện thoại, mật khẩu, API key hoặc mã vé khỏi câu hỏi trước khi gửi cho AI.",
      NOT_CONFIGURED:
        "Trợ lý AI chưa được kết nối. Bạn vẫn có thể tìm phim và xem lịch bằng bộ lọc.",
      TOO_MANY_REQUESTS:
        "Bạn đã hỏi nhiều lần liên tiếp. Vui lòng thử lại sau ít phút.",
      DAILY_LIMIT:
        "Trợ lý đã đạt giới hạn sử dụng hôm nay. Bạn vẫn có thể tìm phim bình thường.",
      PROVIDER_LIMIT:
        "Dịch vụ AI đang hết hạn mức. Vui lòng thử lại sau hoặc dùng tìm phim.",
      TIMEOUT: "AI trả lời quá lâu. Bạn thử lại hoặc dùng bộ lọc phim nhé.",
      INVALID_INPUT: "Câu hỏi chưa hợp lệ. Mỗi câu tối đa 1.200 ký tự.",
      BODY_TOO_LARGE: "Nội dung quá dài. Hãy bắt đầu cuộc trò chuyện mới.",
      PROVIDER_ERROR:
        "Chưa nhận được câu trả lời đáng tin cậy từ AI. Vui lòng thử lại hoặc tìm phim bên dưới.",
      SERVER_ERROR: "Chưa thể tra cứu lúc này. Vui lòng thử lại sau.",
      INVALID_ORIGIN: "Yêu cầu không hợp lệ. Hãy tải lại trang.",
    } as Record<string, string>,
  },
  en: {
    title: "Your movie companion",
    subtitle: "A thoughtful pick for your next movie night.",
    open: "Movie advice",
    close: "Close assistant",
    reset: "New conversation",
    welcome:
      "Hi! A few words are enough: “something fun”, “Bac Ninh tomorrow”, or “with an 8-year-old”. I can discuss films without spoilers and find matching sessions. If your meaning is unclear, I will ask.",
    suggestions: [
      "Animated films for an 8-year-old",
      "What's showing in Hanoi today?",
      "How do seat holds and payments work?",
    ],
    privacy:
      "Questions are sent to Google Gemini for advice. Do not enter passwords, personal information or ticket codes. This tab keeps the conversation temporarily.",
    placeholder: "What kind of movie are you looking for?",
    send: "Send",
    thinking: "Finding a good match…",
    searching: "Checking movies and current sessions…",
    knowledge:
      "AI conversation · general knowledge, not current sessions or prices",
    stop: "Stop response",
    retry: "Retry this question",
    ai: "AI advice · check details before booking",
    guide: "System guide",
    find: "Find movies",
    policies: "Booking guide",
    empty:
      "No movies match the understood filters. Try another genre, age, cinema or date.",
    noSessions: "No matching sessions found in this lookup.",
    price: "Standard seat",
    vip: "VIP surcharge",
    minute: "min",
    checked: "Checked at",
    filters: "Understood filters",
    age: "Age",
    clear: "Conversation cleared.",
    errors: {
      CANCELLED: "Response stopped. Continue chatting or retry this question.",
      SENSITIVE_INPUT:
        "Please remove emails, phone numbers, passwords, API keys or ticket codes before sending a question to the AI.",
      NOT_CONFIGURED:
        "The AI assistant is not connected yet. Search and showtime filters are still available.",
      TOO_MANY_REQUESTS:
        "Too many questions in a short time. Please try again in a few minutes.",
      DAILY_LIMIT:
        "The assistant has reached today's usage limit. Movie search is still available.",
      PROVIDER_LIMIT:
        "The AI service has reached its quota. Try again later or use movie search.",
      TIMEOUT: "The AI took too long. Please retry or use movie filters.",
      INVALID_INPUT:
        "Invalid question. Each message can contain up to 1,200 characters.",
      BODY_TOO_LARGE: "This conversation is too long. Please start a new one.",
      PROVIDER_ERROR:
        "We could not get a reliable AI response. Please retry or find movies below.",
      SERVER_ERROR: "Lookup is unavailable right now. Please try again later.",
      INVALID_ORIGIN: "Invalid request. Please reload the page.",
    } as Record<string, string>,
  },
};
