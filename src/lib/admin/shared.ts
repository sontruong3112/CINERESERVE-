export const movieStatuses = [
  "DRAFT",
  "NOW_SHOWING",
  "COMING_SOON",
  "ARCHIVED",
] as const;
export type MovieStatus = (typeof movieStatuses)[number];
export type AdminMovie = {
  id: string;
  slug: string;
  originalTitle: string;
  titleVi: string;
  titleEn: string;
  synopsisVi: string;
  synopsisEn: string;
  durationMinutes: number;
  ageRatingCode: string;
  year: number;
  director: string;
  posterUrl: string;
  backdropUrl: string;
  accent: string;
  status: MovieStatus;
  genres: string[];
  releaseDate: string;
  version: number;
};
export type AdminShowtime = {
  id: string;
  movieId: string;
  auditoriumId: string;
  movieTitle: string;
  cinemaName: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  cleanupEndsAt: string;
  basePrice: number;
  vipSurcharge: number;
  status: "DRAFT" | "ON_SALE" | "CANCELLED";
  version: number;
  cancellationReason: string | null;
};
export const messages = {
  vi: {
    SHOWTIME_HAS_USED_TICKETS:
      "Suất đã có vé sử dụng, không thể hủy theo luồng thông thường. Cần xử lý ngoại lệ với quản trị viên.",
    SHOWTIME_HAS_HOLDS:
      "Suất có phiên giữ còn hiệu lực hoặc đơn đã thanh toán, chưa thể sửa. Phòng cũng không được đổi sau khi đã có lịch sử giữ ghế; hãy hủy suất và tạo suất mới nếu cần.",
    INVALID_INPUT:
      "Thông tin chưa hợp lệ. Kiểm tra các trường được yêu cầu và giới hạn dữ liệu.",
    NOT_FOUND: "Không tìm thấy bản ghi.",
    STALE_VERSION:
      "Dữ liệu đã được người khác sửa. Hãy tải lại và mở bản mới nhất.",
    DUPLICATE_SLUG: "Đường dẫn phim đã được sử dụng.",
    MOVIE_HAS_SCHEDULE:
      "Phim còn lịch tương lai. Không được đổi thời lượng, phân loại tuổi hoặc chuyển về nháp/lưu trữ.",
    MOVIE_UNAVAILABLE: "Phim chưa công bố hoặc đã lưu trữ, không thể xếp lịch.",
    ROOM_UNAVAILABLE: "Phòng/rạp không hoạt động hoặc chưa có ghế được mở bán.",
    INVALID_TIME:
      "Giờ chiếu không hợp lệ hoặc đã qua mốc ngừng bán. Chọn thời điểm tương lai, ít nhất 10 phút trước khi bắt đầu.",
    OUTSIDE_HOURS:
      "Phim và 20 phút dọn phòng phải nằm trong giờ hoạt động của rạp và không qua nửa đêm.",
    SCHEDULE_CONFLICT:
      "Phòng đã có suất khác trong khoảng này, kể cả thời gian dọn phòng.",
    STATE_CONFLICT:
      "Trạng thái hiện tại không cho phép thao tác này. Suất đã hủy không được sửa/mở lại.",
    REASON_REQUIRED: "Cần nhập lý do hủy từ 5 đến 500 ký tự.",
    UNAUTHENTICATED: "Vui lòng đăng nhập lại.",
    FORBIDDEN: "Chỉ quản trị viên được thao tác.",
    PASSWORD_CHANGE_REQUIRED: "Vui lòng đổi mật khẩu tạm trước.",
    SERVER_ERROR: "Chưa xử lý được yêu cầu. Vui lòng thử lại.",
    INVALID_ORIGIN: "Yêu cầu không hợp lệ. Tải lại trang.",
    BODY_TOO_LARGE: "Nội dung quá dài.",
  },
  en: {
    SHOWTIME_HAS_USED_TICKETS:
      "A ticket for this session has already been used. Normal cancellation is blocked; contact an administrator for exception handling.",
    SHOWTIME_HAS_HOLDS:
      "This session has an active hold or a paid order and cannot be edited. The auditorium cannot change once hold history exists; cancel and create a new session if needed.",
    INVALID_INPUT: "Check required fields and data limits.",
    NOT_FOUND: "Record not found.",
    STALE_VERSION:
      "Someone else changed this record. Reload and open the latest version.",
    DUPLICATE_SLUG: "This movie slug is already in use.",
    MOVIE_HAS_SCHEDULE:
      "Future sessions exist. Duration, age rating, and draft/archive changes are blocked.",
    MOVIE_UNAVAILABLE: "Only published movies can be scheduled.",
    ROOM_UNAVAILABLE:
      "The auditorium/cinema is inactive or has no sellable seats.",
    INVALID_TIME:
      "Invalid time or sales cutoff reached. Choose a future session at least 10 minutes ahead.",
    OUTSIDE_HOURS:
      "The movie and 20-minute cleaning period must fit cinema hours on the same day.",
    SCHEDULE_CONFLICT:
      "This auditorium already has an overlapping session or cleaning period.",
    STATE_CONFLICT:
      "This action is not allowed in the current state. Cancelled sessions cannot be changed or reopened.",
    REASON_REQUIRED: "Enter a cancellation reason of 5–500 characters.",
    UNAUTHENTICATED: "Please sign in again.",
    FORBIDDEN: "Administrator access is required.",
    PASSWORD_CHANGE_REQUIRED: "Change your temporary password first.",
    SERVER_ERROR: "Unable to complete this request. Please retry.",
    INVALID_ORIGIN: "Invalid request. Reload this page.",
    BODY_TOO_LARGE: "The submitted content is too large.",
  },
};
export function localDateTime(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 16);
}
