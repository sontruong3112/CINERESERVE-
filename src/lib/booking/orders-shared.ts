export type Order = {
  id: string;
  code: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  version: number;
  holdVersion: number;
  holdId: string;
  showtimeId: string;
  title: string;
  titleEn: string;
  ageRatingCode: string;
  cinema: string;
  room: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  total: string;
  currency: string;
  serverNow: string;
  cancellationReason: string | null;
  items: {
    id: string;
    seatId: string;
    label: string;
    type: "STANDARD" | "VIP";
    price: number;
    ticket: {
      id: string;
      code: string;
      status: "VALID" | "CANCELLED" | "USED";
      usedAt: string | null;
    } | null;
  }[];
  attempts: {
    id: string;
    key: string;
    outcome: "SUCCESS" | "FAILED";
    amount: string;
    version: number;
    createdAt: string;
    confirmationVersion: string | null;
    confirmedAt: string | null;
  }[];
  refund: { amount: string; reason: string; completedAt: string } | null;
};
export const orderMessages = {
  vi: {
    CONFIRMATION_REQUIRED:
      "Vui lòng xác nhận độ tuổi của tất cả người xem và đồng ý chính sách trước khi thanh toán.",
    CONFIRMATION_CHANGED:
      "Chính sách đã được cập nhật. Hãy tải lại trang, đọc và xác nhận lại.",
    INVALID_INPUT: "Thông tin không hợp lệ. Vui lòng tải lại đơn.",
    NOT_FOUND: "Không tìm thấy đơn hoặc phiên giữ của bạn.",
    STALE_HOLD: "Ghế đã thay đổi hoặc phiên giữ đã hết hạn. Hãy kiểm tra lại.",
    STALE_ORDER:
      "Đơn đã thay đổi ở tab khác. Đã tải lại bản mới nhất, hãy kiểm tra trước khi thanh toán.",
    CLOSED: "Suất chiếu không còn mở bán.",
    ORDER_CLOSED:
      "Đơn đã hết hạn, bị hủy hoặc đã thanh toán. Vui lòng kiểm tra trạng thái.",
    EMPTY_HOLD: "Cần giữ ít nhất một ghế trước khi tạo đơn.",
    SEAT_TAKEN: "Ghế không còn thuộc phiên giữ này. Hãy chọn lại ghế.",
    KEY_REUSED:
      "Mã yêu cầu đã được dùng với kết quả hoặc phiên bản khác. Hãy tải lại đơn.",
    TOO_MANY_REQUESTS: "Đã đạt giới hạn 10 lần thanh toán thử cho đơn này.",
    UNAUTHENTICATED: "Vui lòng đăng nhập lại.",
    PASSWORD_CHANGE_REQUIRED: "Vui lòng đổi mật khẩu tạm trước.",
    INVALID_ORIGIN: "Yêu cầu không hợp lệ. Vui lòng tải lại trang.",
    BODY_TOO_LARGE: "Yêu cầu quá dài.",
    FORBIDDEN:
      "Tài khoản không có quyền thực hiện thao tác này. Chỉ tài khoản khách hàng được tạo thanh toán mới.",
    SERVER_ERROR:
      "Chưa xác định được kết quả. Hãy kiểm tra trạng thái đơn hoặc gửi lại cùng yêu cầu.",
  },
  en: {
    CONFIRMATION_REQUIRED:
      "Confirm that all viewers meet age conditions and accept the policies before paying.",
    CONFIRMATION_CHANGED:
      "The policies were updated. Reload this page, review and confirm again.",
    INVALID_INPUT: "Invalid request. Reload this order.",
    NOT_FOUND: "Order or hold not found for your account.",
    STALE_HOLD:
      "Your seats changed or your hold expired. Review your selection.",
    STALE_ORDER:
      "The order changed in another tab. The latest version has been loaded; review it before paying.",
    CLOSED: "This session is no longer on sale.",
    ORDER_CLOSED:
      "This order expired, was cancelled or was already paid. Check its status.",
    EMPTY_HOLD: "Hold at least one seat before checkout.",
    SEAT_TAKEN:
      "These seats no longer belong to this hold. Select your seats again.",
    KEY_REUSED:
      "This request key was already used with different parameters. Reload the order.",
    TOO_MANY_REQUESTS:
      "This order reached its limit of 10 simulated payment attempts.",
    UNAUTHENTICATED: "Please sign in again.",
    PASSWORD_CHANGE_REQUIRED: "Change your temporary password first.",
    INVALID_ORIGIN: "Invalid request. Reload this page.",
    BODY_TOO_LARGE: "Request is too large.",
    FORBIDDEN: "This account cannot perform this action. Only customer accounts can start new payments.",
    SERVER_ERROR:
      "The result is uncertain. Check the order status or retry the same request.",
  },
};
export function orderMoney(value: string | number, locale: string) {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(typeof value === "string" ? BigInt(value) : value);
}
