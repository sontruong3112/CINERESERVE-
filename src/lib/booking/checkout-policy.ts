import type { Locale } from "@/lib/i18n";

// Bump when the customer-facing booking conditions change materially.
export const CHECKOUT_CONFIRMATION_VERSION = "booking-2026-11-04";
export const checkoutCopy = {
  vi: {
    title: "Điều kiện trước khi thanh toán",
    age: "Phân loại độ tuổi",
    confirmAge:
      "Tôi xác nhận tất cả người xem trong nhóm đáp ứng điều kiện độ tuổi của phim; có người giám hộ đi cùng khi phân loại yêu cầu.",
    confirmPolicy:
      "Tôi đã đọc và đồng ý với chính sách đặt vé, hủy/đổi và hoàn tiền nêu trên.",
    note: "Đây là xác nhận của người đặt, không phải xác minh tuổi. Nhân viên có thể đối chiếu điều kiện tại rạp.",
    policies: [
      "Thanh toán hiện được giả lập, không chuyển tiền thật và không yêu cầu thông tin ngân hàng.",
      "Giữ ghế tối đa 5 phút và không quá giờ ngừng bán trước suất 10 phút. Tạo đơn hoặc thử lại thanh toán không gia hạn.",
      "Sau khi thanh toán không hỗ trợ khách tự hủy/đổi; không đến xem không tự hoàn tiền.",
      "Nếu rạp hủy suất hợp lệ, vé bị hủy và hệ thống hoàn giả lập toàn bộ số tiền đã thu.",
    ],
    details: "Xem hướng dẫn đầy đủ",
    changed:
      "Hãy kiểm tra lại thông tin và xác nhận cho lần thanh toán mới khi đơn thay đổi.",
    internalTitle: "Dùng tài khoản khách hàng để mua vé",
    internalText:
      "Bạn đang sử dụng tài khoản quản trị hoặc nhân viên. Tài khoản này dùng cho công việc vận hành, không giữ ghế hoặc tạo thanh toán mới. Để mua vé, hãy đăng xuất rồi đăng nhập/đăng ký tài khoản khách hàng.",
    workspace: "Về khu vực làm việc",
    existing:
      "Đơn và vé cá nhân đã phát sinh vẫn có thể xem lại; đơn đang chờ có thể hủy để giải phóng ghế.",
    recorded: "Đã ghi nhận xác nhận tuổi và chính sách",
    legacy:
      "Lần thanh toán này diễn ra trước khi hệ thống ghi nhận xác nhận tuổi/chính sách.",
  },
  en: {
    title: "Before you pay",
    age: "Age classification",
    confirmAge:
      "I confirm that every viewer in my group meets the film’s age conditions, including an accompanying guardian where required.",
    confirmPolicy:
      "I have read and accept the booking, cancellation/exchange and refund policies shown here.",
    note: "This is the booker’s declaration, not age verification. Staff may check admission conditions at the cinema.",
    policies: [
      "Payments are simulated. No real money is transferred and no banking details are required.",
      "Holds last up to 5 minutes and end by the sales cutoff, 10 minutes before the session. Checkout and payment retries do not extend them.",
      "Customers cannot cancel/exchange after payment. Not attending does not automatically qualify for a refund.",
      "If the cinema cancels an eligible session, tickets are cancelled and the full amount collected is refunded in the simulation.",
    ],
    details: "Read the full guide",
    changed:
      "Review the updated order and confirm again before starting a new payment attempt.",
    internalTitle: "Use a customer account to book",
    internalText:
      "You are using an administrator or staff account. This account is for cinema operations and cannot hold seats or start new payments. To buy tickets, sign out and sign in/register as a customer.",
    workspace: "Back to workspace",
    existing:
      "Existing personal orders and tickets remain accessible; pending orders can be cancelled to release seats.",
    recorded: "Age and policy confirmation recorded",
    legacy: "This payment predates recorded age/policy confirmations.",
  },
};
export function ageExplanation(code: string, locale: Locale) {
  const descriptions: Record<string, [string, string]> = {
    P: ["Phù hợp với mọi độ tuổi.", "Suitable for all ages."],
    K: [
      "Người xem dưới 13 tuổi cần cha, mẹ hoặc người giám hộ đi cùng.",
      "Viewers under 13 require an accompanying parent or guardian.",
    ],
    T13: ["Dành cho người xem từ đủ 13 tuổi.", "For viewers aged 13 and over."],
    T16: ["Dành cho người xem từ đủ 16 tuổi.", "For viewers aged 16 and over."],
    T18: ["Dành cho người xem từ đủ 18 tuổi.", "For viewers aged 18 and over."],
  };
  return (
    descriptions[code]?.[locale === "vi" ? 0 : 1] ||
    (locale === "vi"
      ? "Vui lòng kiểm tra điều kiện với rạp."
      : "Please check admission conditions with the cinema.")
  );
}
