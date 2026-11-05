# CineReserve

**Cập nhật 0.3.0 — giao diện khách hàng:** thiết kế phòng chiếu hiện đại với xanh mực/champagne, trang chủ ưu tiên phim và đặt nhanh, thẻ sắp chiếu gọn, lịch theo khối rạp, thanh bước mua vé và mở trợ lý AI trực tiếp. [Nghiên cứu, thiết kế và kiểm chứng](docs/20-thiet-ke-lai-giao-dien-khach-hang.md). 416 kiểm tra liên quan đạt; đã kiểm tra VI/EN, mobile/tablet/desktop và thao tác mua vé trên giao diện.

**Cập nhật 0.2.8 — kiểm thử toàn luồng:** thêm bộ kiểm thử tích hợp từ giữ ghế đến thanh toán, đọc QR, soát vé và đối chiếu doanh thu/hoàn tiền. 234 kiểm tra mới đạt; đã thử đọc ảnh QR, chặn vé dùng lại và xem báo cáo trên giao diện. [Kết quả và phần còn cần kiểm tra](docs/19-kiem-thu-toan-luong-dat-ve.md).

**Cập nhật 0.2.7 — kiểm tra ngữ cảnh:** giữ riêng tuổi/rạp/ngày khi hội thoại dài, xử lý câu ngắn/đổi/xóa điều kiện và lượt lỗi. [Kết quả kiểm tra](docs/18-kiem-tra-chat-ngan-va-ngu-canh.md). 170 kiểm tra tự động liên quan đạt; 18 lượt Gemini thật có 15 phản hồi khớp và 3 lỗi dịch vụ.

**Cập nhật 0.2.6 — trợ lý phim:** hội thoại tự nhiên/câu ngắn, tư vấn kiến thức phim, hỏi lại khi mơ hồ; một lượt AI logic thay hai bước, tiến độ NDJSON, dừng/thử lại và khung mở rộng. [Kết quả, tốc độ và giới hạn](docs/17-tro-ly-phim-hoi-thoai-va-toc-do.md). 128 kiểm tra mô phỏng đạt; Gemini thật có cả lượt nhanh và lỗi/timeout, chưa cam kết tốc độ hoặc độ đúng tuyệt đối.

**Cập nhật 0.2.5 — mobile:** dãy ngày có nút cuộn, ghế 44px và vùng vuốt riêng, thanh tóm tắt lựa chọn, menu tài khoản gọn, checkout dễ đọc/bấm hơn. [Kiểm chứng và giải thích](docs/16-toi-uu-giao-dien-mobile.md). 208 kiểm tra liên quan, lint và production build đạt. Đã thử viewport 320/390/768px; điện thoại thật còn cần kiểm tra.

**Cập nhật 0.2.4:** lịch chi tiết chọn ngày/rạp bằng nút bấm, tự cập nhật; bỏ ô nhập ngày và nút tìm suất, chỉ nhóm các rạp có kết quả. [Giải thích và phạm vi](docs/15-lich-chieu-bo-loc-va-trai-nghiem-mua-ve.md). 49 kiểm tra lịch đạt.

**v2 đợt 4 — 0.2.3:** lịch theo suất mở bán thực tế, bộ lọc rạp/ngày, tìm phim không dấu và đặt nhanh theo rạp → phim → ngày. Giữ rạp/ngày khi chuyển trang; không tự đổi ngày khi không có suất. [Hướng dẫn và kiến thức cần hiểu](docs/15-lich-chieu-bo-loc-va-trai-nghiem-mua-ve.md). Đợt này chạy 201 kiểm tra liên quan đạt; lint và production build đạt. Đã bổ sung 48 suất demo cho 05–10/11/2026 ở cả hai rạp. Sau khi hết lịch, có thể chạy `npm run demo:showtimes` để thêm lịch hôm nay và 5 ngày tới trong database local, hoặc tạo lịch qua quản trị.

**v2 đợt 3 — 0.2.2:** quản lý nhân viên tối giản: danh sách/tìm/lọc, tạo STAFF mới và gán rạp ngay khi tạo, bắt buộc đổi mật khẩu tạm. [Hướng dẫn và phạm vi đồ án đã thu gọn](docs/14-quan-ly-nhan-vien-toi-gian.md). Đặc tả 1.4 chuyển quản trị nhân sự/cơ sở vật chất nâng cao và hàng đợi hoàn tiền sang mở rộng; trọng tâm tiếp theo là trải nghiệm mua vé, demo và báo cáo. Tổng 840 kiểm tra đạt.

**v2 đợt 2 — 0.2.1 (04/11/2026):** chỉ CUSTOMER mua vé mới; checkout có xác nhận tuổi/chính sách VI/EN được kiểm tra ở server, giữ replay thanh toán an toàn và lịch sử vé cũ. Migration mới cần generate/deploy. [Hướng dẫn và kiến thức cần hiểu](docs/13-quyen-mua-ve-va-xac-nhan.md). Tổng 727 kiểm tra đạt.

**v2 đang phát triển — đợt 1 (04/11/2026), mã nguồn 0.2.0:** đã rà soát đặc tả, bổ sung tra cứu đơn ADMIN/STAFF và sửa nội dung giao diện cũ. [Kết quả đã đủ/còn thiếu/cần sửa và lộ trình một tháng](docs/11-ra-soat-va-lo-trinh-v2.md). Chưa phải bản v2 hoàn tất.

Website đặt vé xem phim mới, xây bằng Next.js App Router, React, TypeScript, CSS Modules, Prisma và PostgreSQL. Đã có **khám phá phim, tài khoản/phân quyền, quản lý phim/lịch, giữ ghế 5 phút, đơn hàng, thanh toán giả lập, QR/check-in một lần, báo cáo doanh thu và chatbot Gemini**. Chatbot đã được cấu hình và thử dịch vụ AI thật ở local; máy mới cần API key riêng. Chưa có cổng thanh toán thật. Toàn bộ phát triển độc lập trong `D:/DA`.

## Chạy local

Yêu cầu Node.js 20.9 trở lên và npm.

```sh
npm install
npm run db:local
```

Giữ terminal PostgreSQL mở. Với lần cài mới, mở terminal thứ hai:

```sh
npm run db:deploy
npm run db:seed
npm run auth:dev-accounts
npm run dev
```

Mở `http://localhost:3001`. Trang gốc chuyển sang `/vi`; đổi VI/EN trên header để xem tiếng Anh, giữ đường dẫn và bộ lọc hiện tại. Dùng cổng 3001 để tránh trùng project cũ.

```sh
npm run lint
npm run typecheck
npm run build
npm run db:check
npm run test:auth
npm run test:admin
npm run test:holds
npm run test:orders
npm run test:tickets
npm run test:journey
npm run test:revenue
npm run test:chat
npm run test:operations
npm run test:checkout
npm run test:staff
```

## Đã triển khai

- **Nhân viên tối giản** tại `/vi/admin/staff`: ADMIN xem/tìm/lọc/phân trang, tạo STAFF mới gắn một rạp đang hoạt động. Mật khẩu tạm băm, phải đổi trước khi làm việc, không xem lại trong danh sách; tạo cùng phân công và audit trong transaction. Không có điều chuyển/khóa/mở/reset qua UI. `npm run test:staff` đạt 113 kiểm tra, không thêm migration.

- Tra cứu đơn vận hành VI/EN: ADMIN lọc/phân trang, STAFF cần mã chính xác và chỉ xem rạp được phân công; chi tiết ghế/vé/thanh toán/hoàn, liên hệ che một phần, không trả mã QR/vé. [Hướng dẫn](docs/12-tra-cuu-don-van-hanh.md). 80 kiểm tra mới đạt; 552 kiểm tra cũ đã chạy lại đạt trong lượt rà soát.

- Trợ lý chọn phim VI/EN: hiểu sở thích/tuổi/rạp/ngày, tra cứu database công khai, gợi ý kèm thẻ/lịch/giá/link hợp lệ, hướng dẫn đặt vé, ngữ cảnh trong tab, hạn mức và xử lý lỗi. **Đã chạy Gemini thật**: 7 câu mẫu/90 đối chiếu đạt; thêm 89 kiểm tra bằng phản hồi mô phỏng. [Hướng dẫn lấy key, kết quả đánh giá và giới hạn](docs/10-chatbot-tu-van-phim.md).

- Báo cáo doanh thu VI/EN theo phim, ngày/tháng và chi nhánh; tách tiền thu, hoàn, ròng và số đơn/ghế. ADMIN xem toàn hệ thống, STAFF chỉ rạp được phân công; tải CSV theo bộ lọc. [Cách dùng và giải thích cách tính](docs/09-thong-ke-doanh-thu.md).

- QR riêng từng ghế, tải/in vé; nhân viên đọc mã/camera/ảnh rồi xác nhận một lần ở đúng rạp và cửa sổ giờ, có kiểm tra dọn phòng. Vé đã dùng/hủy bị chặn, xác nhận có audit và gửi lặp an toàn. [Hướng dẫn QR và giới hạn camera](docs/08-qr-va-kiem-tra-ve.md).

- Đơn hàng từ phiên giữ, tổng tiền từ server, thanh toán giả lập thành công/thất bại và lịch sử đơn VI/EN. Gửi lặp không tạo giao dịch/vé trùng; thanh toán, bán ghế và mã vé cùng transaction. Hủy suất hoàn giả lập toàn bộ đơn đã trả. [Tài liệu và sơ đồ](docs/07-don-hang-va-thanh-toan-gia-lap.md).

- Chọn 1–8 ghế theo suất, giá thường/VIP, xác nhận giữ tối đa 5 phút với hạn server, chống hai khách giữ cùng ghế. Đổi ghế/tải lại/VI–EN không gia hạn. Bỏ giữ, đăng xuất và hủy suất giải phóng ghế. [Hướng dẫn và kiến thức cần hiểu](docs/06-chon-ghe-va-giu-ghe.md).

- Quản trị phim/lịch chiếu có kiểm tra quyền ADMIN: thêm/sửa/lưu trữ phim VI/EN, tạo suất nháp/mở bán/hủy kèm lý do, lọc/phân trang và nhật ký. Chặn trùng phòng kể cả 20 phút dọn, ngoài giờ, ghi đè phiên bản cũ. Xem [hướng dẫn và luồng code](docs/05-quan-ly-phim-va-lich-chieu.md).

- Trang chủ phong cách điện ảnh, đặt nhanh dẫn tới lịch chiếu minh họa.
- Danh sách phim có tìm tên, lọc thể loại và trạng thái, thông báo không có kết quả.
- Chi tiết phim, chọn ngày/rạp và suất mở bán để đăng nhập, chọn và giữ ghế.
- Trang chi nhánh mẫu và hướng dẫn/chính sách.
- VI/EN qua đường dẫn, menu mobile, hỗ trợ bàn phím, ảnh lỗi có dự phòng tại thẻ phim.

Dữ liệu phim thực được dùng làm mẫu hiển thị, không đại diện lịch phát hành hoặc lịch bán vé hiện tại. Chi nhánh, suất và giá chỉ minh họa. Poster/backdrop tải từ TMDB, ảnh rạp từ Unsplash, font Be Vietnam Pro từ Google Fonts; cần mạng để tải tài nguyên bên ngoài, có font hệ thống dự phòng. Trước vận hành thật cần rà soát quyền sử dụng tài nguyên và thay dữ liệu/ảnh được cấp phép phù hợp.

## Cấu trúc để học

| Đường dẫn | Vai trò |
| --- | --- |
| `src/app/[locale]` | Các trang và layout cho vi/en |
| `src/components/movie-card.tsx` | Mẫu thẻ phim tái sử dụng; nhận `movie` và `locale` qua props |
| `src/components/quick-booking.tsx` | Ví dụ state khi đổi rạp/phim/ngày, rồi chuyển trang |
| `src/lib/catalogue.ts` | Kiểu Movie, nhãn thể loại và fixture dùng để seed |
| `src/lib/catalogue-repository.ts` | Server đọc phim, rạp và lịch từ PostgreSQL rồi chuyển thành props cho giao diện |
| `prisma/schema.prisma` | Danh mục, tài khoản, lịch/ghế, đơn/thanh toán/hoàn và vé |
| `src/lib/reports` | Tổng hợp doanh thu, kiểu dữ liệu và xuất CSV |
| `prisma/migrations` | Lịch sử tạo bảng và ràng buộc, gồm chống trùng lịch/phòng |
| `src/lib/i18n.ts` | Nhãn giao diện hai ngôn ngữ |
| `src/app/globals.css` | Màu, chữ và style toàn ứng dụng |
| Các file `.module.css` | Style riêng từng nhóm component/trang |

Ví dụ: `movies.map(...)` lấy từng bộ phim và đưa vào cùng `MovieCard`. Sửa thẻ một lần thì cả danh sách và trang chủ được cập nhật. `QuickBooking` dùng `useState` để nhớ lựa chọn hiện tại; đây chỉ là trạng thái giao diện, không phải giữ ghế hoặc lưu đơn ở server.

Tài liệu nghiệp vụ và thiết kế: [docs/README.md](docs/README.md).

## PostgreSQL local và dữ liệu phát triển

`npm run db:local` dùng PostgreSQL portable 17 từ package npm `embedded-postgres`; chỉ lắng nghe `127.0.0.1:55432`, dữ liệu ở `.local/postgres`. Không cài Windows service. Lần đầu tạo `.env` bằng mật khẩu ngẫu nhiên; không in mật khẩu ra màn hình và không ghi đè `.env` đã có. `.env`, `.local` và Prisma Client sinh tự động đều được gitignore.

Mỗi lần mở máy, chạy `npm run db:local` và giữ terminal mở rồi chạy website ở terminal khác. Ctrl+C terminal database dừng server, giữ nguyên dữ liệu. Không xóa `.local` để xử lý lỗi kết nối. Sao lưu dữ liệu trước khi đổi máy/nâng PostgreSQL; đây là môi trường phát triển, không phải cấu hình vận hành thật.

`CATALOGUE_SOURCE=database` bật đọc database. Khi DB lỗi, trang báo lỗi chứ không tự trả fixture. Có thể chủ động dùng `CATALOGUE_SOURCE=demo` để xem giao diện không cần DB; đổi cấu hình rồi khởi động lại Next.js. Database vẫn chứa **dữ liệu mẫu**, không đồng nghĩa đang bán vé thật.

Seed yêu cầu `ALLOW_DEMO_SEED=true`, chỉ dùng database phát triển. Chạy lại không xóa hoặc ghi đè dữ liệu đã sửa; tạo thêm lịch cho năm ngày từ hiện tại và không làm tăng bản ghi trùng. Seed không phải công cụ quản lý lịch thật; nếu lịch đã sửa gây xung đột thì migration/constraint sẽ từ chối. Không dùng seed cho production.

Nhóm danh mục/lịch có 8 bảng: Movie, MovieTranslation, Genre, MovieGenre, Cinema, Auditorium, Seat, Showtime; `_prisma_migrations` là bảng kỹ thuật riêng. Đã bổ sung ShowtimeSeat và HoldSession ngày 03/11, chưa có đơn/vé. Giá từng suất hiện dùng số nguyên PostgreSQL Int, chưa có tổng tiền giao dịch; sẽ dùng BigInt cho tổng tiền ở chặng đơn hàng.

Bổ sung auth: có thêm User, AuthSession, StaffAssignment, AuthRateLimit (tổng 12 bảng nghiệp vụ). Có đăng ký/đăng nhập/đăng xuất, hồ sơ, đổi mật khẩu, ba role và phạm vi rạp. Tài khoản nội bộ local được tạo bằng `auth:dev-accounts`, mật khẩu tạm lưu ở `.local/dev-accounts.md`, phải đổi ở lần đầu. Script không reset hoặc nâng quyền các tài khoản có sẵn. Hướng dẫn và giới hạn: [Đăng nhập và phân quyền](docs/04-dang-nhap-va-phan-quyen.md).

`npm run test:auth` cần PostgreSQL và dev server đang chạy. Tạo dữ liệu QA riêng, kiểm tra HTTP, rồi dọn tài khoản/phiên QA. Không chạy trên database vận hành. Cookie Secure dùng trong production HTTPS; tài khoản email hiện chưa được xác minh, chưa có quên mật khẩu hoặc OAuth.

Bổ sung quản trị 02/11/2026: thêm AuditLog (tổng 13 bảng nghiệp vụ), ngày phát hành và DRAFT cho phim, version cho phim/suất, lý do/thời điểm hủy. Sau khi lấy code mới chạy `npm run db:generate` và `npm run db:deploy` trước khi chạy app. `npm run test:admin` đã đạt 73 kiểm tra với dữ liệu QA riêng. Quản trị ở `/vi/admin/movies` và `/vi/admin/showtimes`; chưa có đơn/vé nên chưa xử lý ảnh hưởng khách/hoàn tiền khi sửa hoặc hủy lịch.

Tham chiếu kỹ thuật: [Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) và [PostgreSQL portable](https://github.com/leinelissen/embedded-postgres).

## Bổ sung 03/11/2026 — chọn và giữ ghế

Thêm `ShowtimeSeat` và `HoldSession` (tổng 15 bảng nghiệp vụ). Migration chụp ghế của lịch có sẵn; lịch mới tạo inventory cùng transaction. `npm run test:holds` đạt 64 kiểm tra, cần DB và dev server đang chạy. Chưa có trạng thái ghế đã bán/đơn/vé; không thu tiền. Dọn hạn khi đọc/ghi inventory, chưa có worker nền; polling 5 giây và khóa chung phù hợp local/tải nhỏ.

Theo yêu cầu chủ project, đã tạo thêm tài khoản local **admin / admin** qua `npm run auth:local-admin`. Chỉ hoạt động ngoài production với `ALLOW_LOCAL_ADMIN_LOGIN=true` và đúng DB local của project; không đổi mật khẩu/quyền tài khoản nội bộ trước đó. Đăng ký khách vẫn yêu cầu mật khẩu 10–128 ký tự. Chi tiết phạm vi và cách kiểm tra trong tài liệu 06.

## Bổ sung 03/11/2026 — đơn hàng và thanh toán giả lập

Migration `20261103010000_orders_and_mock_payments` thêm Booking, BookingItem, PaymentAttempt, Ticket và Refund (tổng 20 bảng nghiệp vụ), HoldStatus.CONVERTED và chủ ghế đã bán. Chạy generate/deploy sau khi lấy code mới. `npm run test:orders` đạt 98 kiểm tra; cùng bộ cũ tổng 279 kiểm tra tích hợp. Các đoạn tiến độ trước là lịch sử tại mốc triển khai; hiện đã có đơn, mã vé và hoàn tiền **giả lập**, chưa có QR hoặc chuyển tiền thật.

Giữ ghế → Tiếp tục đến thanh toán → chọn kết quả mô phỏng → xem lại trong `/vi/account/orders`. Mỗi tài khoản chỉ thấy đơn của mình. Tiền tổng/thu/hoàn dùng BigInt, API trả chuỗi VND. Hướng dẫn lỗi/mất phản hồi và giới hạn ở tài liệu 07.

## Bổ sung 03/11/2026 — QR và kiểm tra vé

Thêm TicketRedemption (tổng 21 bảng), trạng thái USED và composite FK ghế đã bán được khai báo trong Prisma. Nhân viên vào `/vi/staff/tickets`, dùng tài khoản STAFF có rạp hoạt động và đã đổi mật khẩu tạm. Chỉ đọc QR chưa tiêu thụ vé; bấm xác nhận mới ghi nhận sử dụng. Khách lấy QR từ đơn đã trả. Chưa có check-in offline hoặc hoàn tác vé đã dùng.

`npm run test:tickets` đạt 69 kiểm tra, tổng 348 kiểm tra tích hợp. Đã thử đọc ảnh QR trên giao diện; camera vật lý cần thử thêm trên thiết bị thật, HTTPS/quyền camera theo trình duyệt. Dữ liệu vẫn dùng thử, không có giá trị vào rạp thật. Các đoạn tiến độ phía trên mô tả lịch sử tại mốc trước đó.
