# Tài liệu dự án

**Cập nhật 0.3.0 — giao diện khách hàng:** [nghiên cứu, hệ màu, bố cục, kiến thức code và kiểm chứng](20-thiet-ke-lai-giao-dien-khach-hang.md). Trang chủ/khám phá/lịch/mua vé đồng bộ, giữ logo và nghiệp vụ hiện tại. 416 kiểm tra liên quan đạt.

**Cập nhật 0.2.8 — kiểm thử toàn luồng:** [kịch bản, kết quả và giải thích doanh thu](19-kiem-thu-toan-luong-dat-ve.md). 234 kiểm tra mới đạt; đã đọc ảnh QR/xác nhận/chặn dùng lại và đối chiếu báo cáo trên giao diện. Camera vật lý còn cần kiểm tra.

**Cập nhật 0.2.7 — kiểm tra ngữ cảnh:** giữ riêng tuổi/rạp/ngày khi hội thoại dài, xử lý câu ngắn/đổi/xóa điều kiện và lượt lỗi. [Kết quả kiểm tra](18-kiem-tra-chat-ngan-va-ngu-canh.md). 170 kiểm tra tự động liên quan đạt; 18 lượt Gemini thật có 15 phản hồi khớp và 3 lỗi dịch vụ.

**Cập nhật 0.2.6 — trợ lý phim:** hội thoại tự nhiên/câu ngắn, tư vấn kiến thức phim, hỏi lại khi mơ hồ; một lượt AI logic thay hai bước, tiến độ NDJSON, dừng/thử lại và khung mở rộng. [Kết quả, tốc độ và giới hạn](17-tro-ly-phim-hoi-thoai-va-toc-do.md). 128 kiểm tra mô phỏng đạt; Gemini thật có cả lượt nhanh và lỗi/timeout, chưa cam kết tốc độ hoặc độ đúng tuyệt đối.

**Cập nhật 0.2.5 — mobile:** dãy ngày có nút cuộn, ghế 44px và vùng vuốt riêng, thanh tóm tắt lựa chọn, menu tài khoản gọn, checkout dễ đọc/bấm hơn. [Kiểm chứng và giải thích](16-toi-uu-giao-dien-mobile.md). 208 kiểm tra liên quan, lint và production build đạt. Đã thử viewport 320/390/768px; điện thoại thật còn cần kiểm tra.

**Cập nhật 0.2.4:** lịch chi tiết chọn ngày/rạp bằng nút bấm, tự cập nhật; bỏ ô nhập ngày và nút tìm suất, chỉ nhóm các rạp có kết quả. [Giải thích và phạm vi](15-lich-chieu-bo-loc-va-trai-nghiem-mua-ve.md). 49 kiểm tra lịch đạt.

**Hiện tại — v2 đợt 4, 0.2.3:** [Lịch chiếu, bộ lọc và trải nghiệm mua vé](15-lich-chieu-bo-loc-va-trai-nghiem-mua-ve.md): hoàn thành V2-07/V2-10, đặt nhanh dùng lịch mở bán thực, tìm không dấu, giữ rạp/ngày, thông báo trống rõ ràng. 201 kiểm tra liên quan, lint và build đạt. Tiếp theo ưu tiên kiểm tra mobile, chuẩn bị lịch demo và báo cáo. Các mốc dưới là lịch sử.

**Hiện tại — v2 đợt 3, 0.2.2:** [Quản lý nhân viên tối giản](14-quan-ly-nhan-vien-toi-gian.md) đã có danh sách/tìm/lọc/tạo STAFF/gán rạp lúc tạo, mật khẩu tạm bắt buộc đổi; tổng 840 kiểm tra đạt. Đặc tả 1.4 thu gọn theo đồ án, không yêu cầu các quy trình nhân sự/vận hành sâu. [Kế hoạch tiếp theo](11-ra-soat-va-lo-trinh-v2.md) ưu tiên lịch/bộ lọc, giao diện mua vé, kiểm thử demo và báo cáo. Các mốc bên dưới là lịch sử.

**Hiện tại — v2 đợt 2, 0.2.1:** [Quyền mua vé và xác nhận tuổi/chính sách](13-quyen-mua-ve-va-xac-nhan.md) đã hoàn thành V2-02/V2-03, giữ lịch sử vé và replay an toàn; 727 kiểm tra đạt. Bước tiếp theo: quản lý nhân viên. Các mốc bên dưới là lịch sử.

**Đọc tiếp tại đây — v2 đợt 1, 04/11/2026:** [Rà soát đặc tả và lộ trình một tháng](11-ra-soat-va-lo-trinh-v2.md) phân biệt đã đủ, còn thiếu và cần sửa; có ma trận 25 tiêu chí nghiệm thu. Đã bắt đầu v2 bằng [Tra cứu đơn cho ADMIN/STAFF](12-tra-cuu-don-van-hanh.md) và sửa nội dung giao diện cũ. 552 kiểm tra cũ + 80 kiểm tra mới đạt. Các mốc bên dưới là lịch sử triển khai.

**Bổ sung 04/11/2026:** chatbot Gemini đã kết nối AI thật ở local; 7 câu mẫu đạt 90 đối chiếu phim/lịch/giá/quy tắc, bên cạnh 89 kiểm tra dùng phản hồi mô phỏng. Đã có giao diện VI/EN, chỉ đọc dữ liệu công khai. Đọc [Hướng dẫn và đánh giá chatbot](10-chatbot-tu-van-phim.md).

**Tiến độ hiện tại — 03/11/2026:** đã hoàn thành báo cáo doanh thu theo phim, ngày/tháng và chi nhánh, xuất CSV, phân quyền ADMIN/STAFF. Tổng 463 kiểm tra tích hợp đạt. Thanh toán còn giả lập, chatbot AI chưa triển khai. Các mục tiến độ bên dưới ghi lại lịch sử từng bước.

Đọc [Đặc tả sản phẩm CineReserve — phiên bản 1.5](00-dac-ta-san-pham.md): phạm vi đồ án đã thu gọn, phân quyền, nghiệp vụ, sơ đồ, tiêu chí nghiệm thu và lộ trình. Chatbot AI đã được bổ sung ngày 24/10/2026; tên đề tài có AI là tên dự kiến chờ xác nhận trong phiếu chính thức.

Thiết kế kỹ thuật được tách theo nhiệm vụ:

- [Thống kê doanh thu](09-thong-ke-doanh-thu.md): bộ lọc phim/thời gian/chi nhánh, thu–hoàn–ròng, quyền nhân viên, CSV, múi giờ và cách hiểu số liệu.

- [QR và kiểm tra vé](08-qr-va-kiem-tra-ve.md): QR từng ghế, camera/ảnh/nhập mã, xác nhận một lần, quyền chi nhánh, cửa sổ giờ/dọn phòng, audit và giới hạn thiết bị.

- [Đơn hàng và thanh toán giả lập](07-don-hang-va-thanh-toan-gia-lap.md): luồng checkout, idempotency, transaction bán ghế/phát hành mã vé, hủy/hoàn mô phỏng và kiểm thử.

- [Chọn ghế và giữ ghế 5 phút](06-chon-ghe-va-giu-ghe.md): Seat/ShowtimeSeat, phiên giữ, chống tranh chấp, hết hạn, sơ đồ xử lý và hướng dẫn tài khoản admin local.

- [Quản lý phim và lịch chiếu](05-quan-ly-phim-va-lich-chieu.md): đã triển khai CRUD phim, lịch nháp/mở bán/hủy, chống trùng phòng, version, nhật ký; có sơ đồ luồng và phần giải thích code để học.

- [Đăng nhập và phân quyền](04-dang-nhap-va-phan-quyen.md): đăng ký/đăng nhập, cookie phiên, ba vai trò, phạm vi chi nhánh, tài khoản phát triển và các kiểm thử đã chạy.

- [Thiết kế database phiên bản 1.9](02-thiet-ke-database.md): danh mục/lịch, tài khoản, giữ ghế, đơn/thanh toán/hoàn giả lập, QR/check-in, doanh thu và dấu xác nhận tuổi/chính sách. Không lưu lịch sử chat lâu dài.
- [Thiết kế giao diện và luồng màn hình phiên bản 1.0](03-thiet-ke-giao-dien.md): sơ đồ điều hướng, bố cục mẫu, màn hình khách/nhân viên/quản trị, chatbot, responsive và thứ tự code. Đã triển khai bước đầu của khu vực khách, các màn hình còn lại là thiết kế.

## Tiến độ ngày 24/10/2026

Đã khởi tạo project độc lập tại `D:/DA` bằng Next.js, React, TypeScript và CSS Modules. Đã có trang chủ, danh sách phim/tìm kiếm/bộ lọc, chi tiết phim/lịch minh họa, chi nhánh mẫu, hướng dẫn và VI/EN. Chạy bằng `npm run dev`, mở `http://localhost:3001`. Hướng dẫn cấu trúc code: [README project](../README.md).

Tại mốc này chưa có PostgreSQL/Prisma thực tế; đã bổ sung ở mốc 31/10 bên dưới. Các phim/suất vẫn là dữ liệu mẫu, không nhận bán vé.

## Tiến độ ngày 31/10/2026

Đã tạo và chạy PostgreSQL local riêng cho CineReserve, thêm Prisma schema/migration/seed và nối trang chủ, danh sách/chi tiết phim, chi nhánh, lịch chiếu vào database. Bộ lọc chi nhánh dùng lịch còn mở bán thay vì giả định mọi rạp có mọi phim. Có lỗi đọc DB thì báo lỗi, không âm thầm chuyển sang fixture. Đã kiểm tra seed không trùng, bản dịch và chống trùng lịch phòng.

Chưa có tài khoản, giữ ghế, thanh toán, vé QR, nhân viên/quản trị hoặc AI thực tế. Bước tiếp theo: xác thực và phân quyền trước khi mở các chức năng quản lý phim/lịch. Mỗi lần mở máy: terminal một `npm run db:local`, terminal hai `npm run dev`.

### Bổ sung ngày 31/10/2026 — tài khoản và quyền

Đã triển khai đăng ký CUSTOMER, đăng nhập/đăng xuất, hồ sơ, đổi mật khẩu và phiên PostgreSQL; thêm trang ADMIN và STAFF có kiểm tra quyền server, API riêng và giới hạn chi nhánh. 44 kiểm tra tích hợp auth đã đạt. Thông tin tài khoản phát triển ở `.local/dev-accounts.md`; khách tự đăng ký. Chi tiết đọc tài liệu 04 ở trên. Chưa có CRUD quản trị, giữ ghế, thanh toán hoặc AI.

## Bổ sung ngày 02/11/2026 — quản lý phim/lịch

Đã có khu vực ADMIN quản lý phim VI/EN, lưu trữ, lịch theo ngày/rạp, tạo nháp/mở bán/hủy kèm lý do và nhật ký thay đổi. Bổ sung kiểm tra giờ hoạt động, 20 phút dọn phòng, bảo vệ thời lượng/phân loại phim có lịch tương lai và version chống ghi đè. 73 kiểm tra tích hợp quản trị đã đạt. Chi tiết đọc tài liệu 05. Bước tiếp theo là ghế theo suất và giữ ghế 5 phút; chưa có đặt vé/thanh toán/AI.

Đã cập nhật theo phiếu giáo viên: giao diện tiếng Việt/tiếng Anh trong phiên bản đầu, báo cáo doanh thu theo phim/theo thời gian và CSS Modules. Tài liệu yêu cầu tổng hợp giữ riêng, các thiết kế/triển khai tách theo nhiệm vụ.

Tài liệu dùng Markdown và sơ đồ Mermaid. Trong VS Code, dùng Ctrl + Shift + V để xem bản trình bày.

## Bổ sung ngày 03/11/2026 — chọn ghế và giữ ghế

Đã có chọn/giữ 1–8 ghế theo suất, tối đa 5 phút và không vượt cutoff. Đổi ghế, tải lại và đổi ngôn ngữ không gia hạn; kiểm tra phiên cũ, chống hai khách giữ cùng ghế, bỏ giữ/đăng xuất/hủy suất giải phóng ghế. Thêm tài khoản admin/admin chỉ cho local theo yêu cầu. 64 kiểm tra giữ ghế, 73 quản trị và 44 auth đã đạt. Bước tiếp theo là đơn hàng và thanh toán giả lập; chưa thu tiền hoặc phát hành vé.

## Bổ sung ngày 03/11/2026 — đơn hàng và thanh toán giả lập

Đã có checkout từ phiên giữ, đơn cá nhân VI/EN, lịch sử thanh toán, thành công/thất bại giả lập, retry an toàn, hết hạn và hủy đơn chờ. Thành công ghi đơn/ghế đã bán/mã vé từng ghế cùng transaction; rạp hủy thì hủy vé, hoàn mô phỏng toàn bộ và giữ lịch sử thu. 98 kiểm tra mới, tổng 279 kiểm tra tích hợp đạt. Chưa có cổng tiền thật, QR/check-in, thống kê hoặc AI. Đọc tài liệu 07 để hiểu luồng và cách thử.

## Bổ sung ngày 03/11/2026 — QR/check-in

Đã có QR tải/in từng ghế, nhân viên đọc mã/camera/ảnh rồi xác nhận một lần. Kiểm tra chi nhánh, trạng thái, giờ và thời gian dọn phòng; gửi lặp không tiêu thụ vé thêm lần nữa. Vé đã dùng chặn hủy suất thông thường. 69 kiểm tra mới, tổng 348 kiểm tra đạt; đã thử đọc ảnh QR trên giao diện, camera vật lý cần thử thêm. Bước tiếp theo là thống kê doanh thu và chatbot AI; thanh toán vẫn giả lập.
