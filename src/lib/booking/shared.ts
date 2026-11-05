export type SeatMap = {
  serverNow: string;
  showtime: {
    id: string;
    title: string;
    titleEn: string;
    ageRatingCode: string;
    cinema: string;
    cinemaCode: string;
    room: string;
    startsAt: string;
    cutoffAt: string;
    basePrice: number;
    vipSurcharge: number;
    open: boolean;
    slug: string;
  };
  seats: {
    id: string;
    row: string;
    number: number;
    type: "STANDARD" | "VIP";
    status: "AVAILABLE" | "HELD" | "MINE" | "BLOCKED" | "SOLD";
  }[];
  hold: {
    id: string;
    showtimeId: string;
    expiresAt: string;
    version: number;
    seatIds: string[];
    basePrice: number;
    vipSurcharge: number;
    total: number;
  } | null;
};
export const holdMessages = {
  vi: {
    INVALID_INPUT: "Chọn tối đa 8 ghế trong cùng suất. Kiểm tra lại dữ liệu.",
    NOT_FOUND: "Không tìm thấy suất chiếu.",
    CLOSED: "Suất đã ngừng bán hoặc không còn hoạt động.",
    SEAT_TAKEN:
      "Có ghế vừa được người khác giữ. Lựa chọn đã giữ trước đó của bạn vẫn được giữ nguyên.",
    STALE_HOLD:
      "Phiên đã thay đổi ở tab khác hoặc đã hết hạn. Đã tải lại dữ liệu mới nhất.",
    ACTIVE_HOLD:
      "Bạn đang có phiên giữ ghế. Hãy quay lại phiên đó hoặc bỏ giữ trước khi chuyển suất.",
    TOO_MANY_REQUESTS:
      "Bạn tạo phiên quá nhanh. Vui lòng thử lại sau khoảng 15 phút.",
    UNAUTHENTICATED: "Vui lòng đăng nhập lại.",
    FORBIDDEN:
      "Chỉ tài khoản khách hàng được chọn và giữ ghế. Tài khoản nội bộ dùng cho khu vực vận hành.",
    PASSWORD_CHANGE_REQUIRED: "Vui lòng đổi mật khẩu tạm trước.",
    SERVER_ERROR: "Không thể cập nhật. Kiểm tra kết nối rồi thử lại.",
    INVALID_ORIGIN: "Yêu cầu không hợp lệ. Hãy tải lại trang.",
    BODY_TOO_LARGE: "Yêu cầu quá dài.",
  },
  en: {
    INVALID_INPUT:
      "Select up to 8 seats from this session. Check the submitted data.",
    NOT_FOUND: "Showtime not found.",
    CLOSED: "This session is no longer on sale or available.",
    SEAT_TAKEN:
      "Another customer just held a selected seat. Your previously held selection is unchanged.",
    STALE_HOLD:
      "Your hold changed in another tab or expired. The latest data has been loaded.",
    ACTIVE_HOLD:
      "You already have a hold. Return to it or release it before switching sessions.",
    TOO_MANY_REQUESTS: "Too many new holds. Try again in about 15 minutes.",
    UNAUTHENTICATED: "Please sign in again.",
    FORBIDDEN:
      "Only customer accounts can select and hold seats. Internal accounts are for cinema operations.",
    PASSWORD_CHANGE_REQUIRED: "Change your temporary password first.",
    SERVER_ERROR: "Unable to update. Check your connection and retry.",
    INVALID_ORIGIN: "Invalid request. Reload the page.",
    BODY_TOO_LARGE: "Request is too large.",
  },
};
