import type { Locale } from "@/lib/i18n";

export type OperationsQuery = {
  q?: string;
  status?: string;
  cinema?: string;
  from?: string;
  to?: string;
  page?: string;
};
export type OperationsOrder = {
  id: string;
  code: string;
  status: string;
  title: string;
  titleEn: string;
  cinema: string;
  room: string;
  startsAt: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
  total: string;
  customer: { name: string; email: string; phone: string | null };
  items: {
    label: string;
    type: string;
    price: number;
    ticketStatus: string | null;
    usedAt: string | null;
  }[];
  attempts: { outcome: string; amount: string; createdAt: string }[];
  refund: { amount: string; reason: string; completedAt: string } | null;
  cancellationReason: string | null;
};
export type OperationsOrders = {
  rows: OperationsOrder[];
  total: number;
  page: number;
  pages: number;
  role: "ADMIN" | "STAFF";
  scope: string | null;
  needsCode: boolean;
  checkedAt: string;
  cinemas: { id: string; name: string }[];
  query: Required<OperationsQuery>;
};
export class OperationsError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const operationsCopy = {
  vi: {
    title: "Tra cứu đơn hàng",
    subtitle:
      "Kiểm tra đơn, ghế, thanh toán và hoàn tiền giả lập. Không thay đổi dữ liệu đặt vé.",
    code: "Mã đơn",
    codeHint: "Nhập đầy đủ mã CR-… khách cung cấp.",
    status: "Trạng thái",
    cinema: "Chi nhánh",
    all: "Tất cả",
    from: "Tạo từ ngày",
    to: "Đến ngày (bao gồm)",
    search: "Tra cứu",
    reset: "Đặt lại",
    empty: "Không có đơn phù hợp trong phạm vi được phép.",
    needCode: "Nhập đầy đủ mã đơn để tra cứu tại chi nhánh của bạn.",
    privacy:
      "Thông tin liên hệ đã được che một phần. Đối chiếu mã đơn cùng thông tin khách cung cấp; không cấp vé chỉ dựa vào tên. Màn hình này không hiển thị mã QR hoặc mã vé.",
    order: "Đơn / khách hàng",
    movie: "Phim / suất chiếu",
    amount: "Tổng tiền",
    details: "Xem chi tiết đối chiếu",
    customer: "Khách hàng",
    created: "Tạo đơn",
    paid: "Thanh toán",
    expires: "Hạn thanh toán",
    seat: "Ghế",
    type: "Loại",
    price: "Giá",
    ticket: "Trạng thái vé",
    used: "Dùng lúc",
    standard: "Thường",
    none: "Chưa có",
    attempts: "20 lần thử thanh toán gần nhất",
    refund: "Hoàn giả lập",
    reason: "Lý do hủy",
    mock: "Thanh toán và hoàn tiền giả lập — không chuyển tiền thật.",
    expiredNote:
      "Đơn chờ đã qua hạn hiển thị Hết hạn và không thể tiếp tục thanh toán.",
    scan: "Sang kiểm tra vé",
    back: "Khu vực nhân viên",
    checked: "Dữ liệu lúc",
    records: "đơn",
    errors: {
      INVALID_FILTER:
        "Bộ lọc chưa hợp lệ. Kiểm tra mã đơn, trạng thái, chi nhánh, trang và khoảng ngày tối đa 366 ngày.",
      CODE_REQUIRED: "Nhân viên cần nhập đầy đủ mã đơn dạng CR-…",
      FORBIDDEN: "Bạn không có quyền tra cứu phạm vi này.",
      UNAUTHENTICATED: "Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.",
      PASSWORD_CHANGE_REQUIRED: "Bạn cần đổi mật khẩu tạm trước khi tra cứu.",
      SERVER_ERROR: "Chưa thể tra cứu. Vui lòng thử lại.",
    } as Record<string, string>,
    states: {
      PENDING: "Chờ thanh toán",
      PAID: "Đã thanh toán",
      EXPIRED: "Hết hạn",
      CANCELLED: "Đã hủy",
      VALID: "Còn hiệu lực",
      USED: "Đã sử dụng",
      SUCCESS: "Thành công",
      FAILED: "Thất bại",
    } as Record<string, string>,
  },
  en: {
    title: "Order lookup",
    subtitle:
      "Review orders, seats, simulated payments and refunds. Booking data is not changed.",
    code: "Order code",
    codeHint: "Enter the complete CR-… code provided by the customer.",
    status: "Status",
    cinema: "Cinema",
    all: "All",
    from: "Created from",
    to: "Through (inclusive)",
    search: "Search",
    reset: "Reset",
    empty: "No matching orders within your permitted scope.",
    needCode:
      "Enter a complete order code to look it up at your assigned cinema.",
    privacy:
      "Contact details are partially masked. Match the order code and customer-provided information; never issue tickets based on a name alone. Ticket codes and QR images are not shown here.",
    order: "Order / customer",
    movie: "Movie / session",
    amount: "Total",
    details: "Review details",
    customer: "Customer",
    created: "Created",
    paid: "Paid",
    expires: "Payment deadline",
    seat: "Seat",
    type: "Type",
    price: "Price",
    ticket: "Ticket status",
    used: "Used at",
    standard: "Standard",
    none: "None yet",
    attempts: "Latest 20 payment attempts",
    refund: "Simulated refund",
    reason: "Cancellation reason",
    mock: "Simulated payments and refunds — no real money is transferred.",
    expiredNote:
      "Pending orders past their deadline display as Expired and cannot be paid.",
    scan: "Go to ticket inspection",
    back: "Staff workspace",
    checked: "Snapshot at",
    records: "orders",
    errors: {
      INVALID_FILTER:
        "Invalid filters. Check order code, status, cinema, page and date range (up to 366 days).",
      CODE_REQUIRED: "Staff must enter a complete CR-… order code.",
      FORBIDDEN: "You cannot access this scope.",
      UNAUTHENTICATED: "Your session is no longer valid. Please sign in again.",
      PASSWORD_CHANGE_REQUIRED:
        "Change your temporary password before continuing.",
      SERVER_ERROR: "Lookup is unavailable. Please try again.",
    } as Record<string, string>,
    states: {
      PENDING: "Pending payment",
      PAID: "Paid",
      EXPIRED: "Expired",
      CANCELLED: "Cancelled",
      VALID: "Valid",
      USED: "Used",
      SUCCESS: "Successful",
      FAILED: "Failed",
    } as Record<string, string>,
  },
};
export function operationsMoney(value: string | number, locale: Locale) {
  return (
    new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-GB").format(
      BigInt(value),
    ) + " ₫"
  );
}
