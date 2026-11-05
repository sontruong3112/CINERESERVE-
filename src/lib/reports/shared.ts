export type RevenueTotals = {
  gross: string;
  refunds: string;
  net: string;
  paidOrders: string;
  refundedOrders: string;
  soldSeats: string;
  refundedSeats: string;
};
export type RevenueRow = RevenueTotals & {
  key: string;
  label: string;
  labelEn: string;
};
export type RevenueReport = {
  from: string;
  to: string;
  bucket: "day" | "month";
  movie: string;
  cinema: string;
  generatedAt: string;
  role: "ADMIN" | "STAFF";
  scopeName: string | null;
  summary: RevenueTotals;
  time: RevenueRow[];
  movies: RevenueRow[];
  cinemas: RevenueRow[];
  options: {
    movies: { id: string; label: string; labelEn: string }[];
    cinemas: { id: string; label: string; active: boolean }[];
  };
};
export type RevenueQuery = {
  from?: string;
  to?: string;
  bucket?: string;
  movie?: string;
  cinema?: string;
};
export const reportMessages = {
  vi: {
    INVALID_RANGE:
      "Ngày chưa hợp lệ. Chọn ngày bắt đầu không sau ngày kết thúc, tối đa 366 ngày.",
    INVALID_FILTER: "Bộ lọc phim hoặc chi nhánh không hợp lệ.",
    FORBIDDEN: "Bạn không có quyền xem báo cáo của chi nhánh này.",
    UNAUTHENTICATED: "Vui lòng đăng nhập lại.",
    PASSWORD_CHANGE_REQUIRED: "Vui lòng đổi mật khẩu tạm trước.",
    SERVER_ERROR: "Chưa tải được báo cáo. Kiểm tra kết nối rồi thử lại.",
  },
  en: {
    INVALID_RANGE:
      "Invalid dates. Start must not follow end; choose up to 366 days.",
    INVALID_FILTER: "Invalid movie or cinema filter.",
    FORBIDDEN: "You cannot view reports for this cinema.",
    UNAUTHENTICATED: "Please sign in again.",
    PASSWORD_CHANGE_REQUIRED: "Change your temporary password first.",
    SERVER_ERROR: "Unable to load this report. Check the connection and retry.",
  },
};
export function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(BigInt(value));
}
export function count(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-GB").format(
    BigInt(value),
  );
}
export function percent(value: string, max: string) {
  return BigInt(max) > BigInt(0)
    ? Number((BigInt(value) * BigInt(10000)) / BigInt(max)) / 100
    : 0;
}
