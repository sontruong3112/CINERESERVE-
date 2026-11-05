export function parseTicketCode(value: unknown) {
  if (typeof value !== "string" || value.length > 100) return null;
  const text = value.trim().toUpperCase().replace(/^CR1:/, "");
  return /^TK-[A-F0-9]{24}$/.test(text) ? text : null;
}
export type Inspection = {
  id: string;
  code: string;
  status: "VALID" | "USED" | "CANCELLED";
  orderCode: string;
  title: string;
  titleEn: string;
  cinema: string;
  room: string;
  seat: string;
  startsAt: string;
  endsAt: string;
  entryOpensAt: string;
  usedAt: string | null;
  serverNow: string;
  canRedeem: boolean;
  reason:
    | "READY"
    | "CANCELLED"
    | "NOT_PAID"
    | "ALREADY_USED"
    | "OUTSIDE_WINDOW"
    | "UNAVAILABLE"
    | "INVALID_TICKET";
};
export const ticketMessages = {
  vi: {
    READY: "Vé hợp lệ, có thể xác nhận sử dụng.",
    INVALID_CODE: "Mã không hợp lệ. Nhập mã TK-… hoặc quét QR của CineReserve.",
    NOT_FOUND: "Không tìm thấy vé.",
    WRONG_CINEMA: "Vé thuộc chi nhánh khác với rạp bạn được phân công.",
    CANCELLED: "Vé hoặc suất đã bị hủy.",
    NOT_PAID: "Đơn chưa được thanh toán hợp lệ.",
    ALREADY_USED: "Vé đã được sử dụng, không thể xác nhận lần nữa.",
    OUTSIDE_WINDOW:
      "Chưa đến giờ vào phòng hoặc suất đã kết thúc. Kiểm tra thời điểm cho phép bên dưới.",
    UNAVAILABLE: "Suất, phòng hoặc chi nhánh không còn hoạt động.",
    INVALID_TICKET: "Vé không khớp với ghế đã bán. Liên hệ quản trị viên.",
    KEY_REUSED: "Mã yêu cầu đã dùng cho vé khác. Vui lòng đọc lại vé.",
    INVALID_INPUT: "Yêu cầu không hợp lệ. Vui lòng đọc lại vé.",
    UNAUTHENTICATED: "Vui lòng đăng nhập lại.",
    FORBIDDEN: "Chỉ nhân viên có chi nhánh hoạt động được kiểm tra vé.",
    PASSWORD_CHANGE_REQUIRED: "Vui lòng đổi mật khẩu tạm trước.",
    TOO_MANY_REQUESTS: "Đã kiểm tra quá nhiều lần. Vui lòng thử lại sau.",
    INVALID_ORIGIN: "Yêu cầu không hợp lệ. Hãy tải lại trang.",
    BODY_TOO_LARGE: "Yêu cầu quá dài.",
    SERVER_ERROR:
      "Chưa xác định được kết quả. Kiểm tra kết nối và gửi lại cùng yêu cầu xác nhận.",
  },
  en: {
    READY: "Valid ticket. You may confirm admission.",
    INVALID_CODE: "Invalid code. Enter a TK-… code or scan a CineReserve QR.",
    NOT_FOUND: "Ticket not found.",
    WRONG_CINEMA:
      "This ticket belongs to a different cinema from your assignment.",
    CANCELLED: "This ticket or session was cancelled.",
    NOT_PAID: "The order does not have a valid payment.",
    ALREADY_USED:
      "This ticket has already been used and cannot be redeemed again.",
    OUTSIDE_WINDOW:
      "Admission has not opened or the session has ended. Check the allowed times below.",
    UNAVAILABLE: "The session, auditorium or cinema is inactive.",
    INVALID_TICKET:
      "This ticket does not match the sold seat. Contact an administrator.",
    KEY_REUSED:
      "This request key was used for another ticket. Inspect the ticket again.",
    INVALID_INPUT: "Invalid request. Inspect the ticket again.",
    UNAUTHENTICATED: "Please sign in again.",
    FORBIDDEN: "Only staff assigned to an active cinema can check tickets.",
    PASSWORD_CHANGE_REQUIRED: "Change your temporary password first.",
    TOO_MANY_REQUESTS: "Too many requests. Please retry later.",
    INVALID_ORIGIN: "Invalid request. Reload the page.",
    BODY_TOO_LARGE: "Request is too large.",
    SERVER_ERROR:
      "The result is uncertain. Check the connection and retry the same confirmation.",
  },
};
