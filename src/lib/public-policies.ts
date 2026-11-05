// Single public source for the policies page and chatbot. Never include internal information.
export const bookingGuide = {
  vi: [
    [
      "Chọn câu chuyện của bạn",
      "Khám phá phim, chọn chi nhánh, ngày và suất phù hợp. Dữ liệu rạp và lịch hiện dùng để minh họa.",
    ],
    [
      "Đăng nhập và chọn ghế",
      "Đăng nhập bằng tài khoản khách hàng, chọn 1–8 ghế rồi xác nhận giữ. Tài khoản nhân viên/quản trị không mua vé mới. Giữ tối đa 5 phút, không vượt giờ ngừng bán trước suất 10 phút. Đổi ghế hoặc tải lại không gia hạn; bỏ giữ hoặc đăng xuất sẽ giải phóng ghế.",
    ],
    [
      "Kiểm tra và thanh toán",
      "Kiểm tra ghế, tổng tiền và phân loại phim; xác nhận mọi người xem đáp ứng điều kiện tuổi và đồng ý chính sách trước lần thanh toán mới. Đây là tự xác nhận, không phải xác minh tuổi. Thanh toán được giả lập, không chuyển tiền thật. Thất bại có thể thử lại trong hạn giữ ban đầu sau khi kiểm tra/xác nhận lại; không gia hạn.",
    ],
    [
      "Nhận vé và đến rạp",
      "Mỗi ghế có một QR trong đơn đã thanh toán giả lập, có thể tải hoặc in. Nhân viên đúng chi nhánh xác nhận dùng một lần, từ 30 phút trước giờ chiếu đến trước khi phim kết thúc; cần chờ dọn phòng xong nếu có suất trước. Vé thử không có giá trị vào rạp thật.",
    ],
    [
      "Hủy và hoàn tiền",
      "Vé đã thanh toán không hỗ trợ hủy/đổi theo nhu cầu cá nhân. Nếu rạp hủy suất hợp lệ, hệ thống hoàn toàn bộ số tiền đã thu.",
    ],
    [
      "Tư vấn phim bằng AI",
      "Mở Trợ lý chọn phim để hỏi theo thể loại, độ tuổi, rạp hoặc ngày. Cần cấu hình Gemini để nhận gợi ý AI. Câu hỏi được gửi đến Google; không nhập dữ liệu nhạy cảm. Hội thoại chỉ giữ tạm trong tab, xóa khi tải lại hoặc bắt đầu cuộc trò chuyện mới. Kiểm tra chi tiết phim/lịch trước đặt; chatbot không đặt vé thay bạn.",
    ],
  ],
  en: [
    [
      "Find your story",
      "Explore movies and choose a cinema, date and session. Cinema and schedule data are illustrative.",
    ],
    [
      "Sign in and choose seats",
      "Sign in as a customer, select 1–8 seats and confirm. Staff/admin accounts cannot make new purchases. Holds last up to 5 minutes and end by the sales cutoff, 10 minutes before the session. Refreshing or changing seats does not extend the deadline; releasing or signing out frees them.",
    ],
    [
      "Review and pay",
      "Review seats, total and film classification; confirm every viewer meets age conditions and accept the policies before a new payment attempt. This is a declaration, not age verification. Payments are simulated, with no real money transferred. After failure, review and confirm again within the original deadline; it is not extended.",
    ],
    [
      "Get your tickets",
      "Each seat has a downloadable/printable QR after simulated payment. Assigned staff confirm one admission, from 30 minutes before the session until before it ends, after previous cleaning is finished. Test tickets do not grant real admission.",
    ],
    [
      "Cancellations and refunds",
      "Paid tickets cannot be cancelled or exchanged for a change of plans. If the cinema cancels an eligible session, the full amount collected is refunded.",
    ],
    [
      "AI movie advice",
      "Open the movie companion to ask about genres, ages, cinemas or dates. Gemini configuration is required for AI advice. Questions are sent to Google; do not enter sensitive data. This tab keeps the conversation temporarily; reloading or starting a new chat clears it. Check movie and session details before booking; the assistant cannot book for you.",
    ],
  ],
};
