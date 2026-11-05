export type StaffRow = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "LOCKED";
  mustChangePassword: boolean;
  createdAt: string;
  cinema: { id: string; name: string; active: boolean } | null;
};
export type StaffQuery = { q?: string; cinema?: string; page?: string };
export type StaffDirectory = {
  items: StaffRow[];
  cinemas: { id: string; name: string; active: boolean }[];
  page: number;
  pages: number;
  total: number;
};
export class StaffError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const staffCopy = {
  vi: {
    title: "Nhân viên",
    subtitle:
      "Danh sách tài khoản nhân viên và chi nhánh phụ trách. Tạo tài khoản mới để phục vụ demo và vận hành cơ bản.",
    create: "Tạo nhân viên",
    close: "Đóng biểu mẫu",
    name: "Họ tên",
    email: "Email đăng nhập",
    cinema: "Chi nhánh",
    all: "Tất cả chi nhánh",
    choose: "Chọn chi nhánh đang hoạt động",
    search: "Tìm tên hoặc email",
    filter: "Tìm nhân viên",
    reset: "Bỏ bộ lọc",
    password: "Mật khẩu tạm",
    passwordHint:
      "10–128 ký tự. Hãy lưu để bàn giao trước khi tạo; mật khẩu không thể xem lại trong danh sách.",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
    generate: "Tạo mật khẩu ngẫu nhiên",
    requirement:
      "Tài khoản được tạo với vai trò Nhân viên, gắn một chi nhánh và phải đổi mật khẩu ở lần đăng nhập đầu.",
    save: "Tạo tài khoản",
    saving: "Đang tạo…",
    created:
      "Đã tạo nhân viên. Bàn giao email và mật khẩu tạm đã lưu cho người dùng.",
    uncertain:
      "Chưa rõ kết quả tạo. Kiểm tra danh sách bằng email trước khi gửi lại; không tạo thêm email khác chỉ để thử lại.",
    state: "Tài khoản",
    firstLogin: "Lần đầu đăng nhập",
    required: "Cần đổi mật khẩu",
    ready: "Đã đổi mật khẩu",
    active: "Hoạt động",
    locked: "Đã khóa",
    inactiveCinema: "Ngừng hoạt động",
    unassigned: "Chưa phân công",
    createdAt: "Ngày tạo",
    empty: "Chưa có nhân viên phù hợp.",
    noCinema:
      "Chưa có chi nhánh hoạt động để gán. Hãy chuẩn bị dữ liệu chi nhánh trước.",
    errors: {
      INVALID_INPUT:
        "Kiểm tra họ tên, email, mật khẩu tạm 10–128 ký tự và chi nhánh.",
      INVALID_FILTER: "Bộ lọc chưa hợp lệ. Hãy bỏ bộ lọc rồi thử lại.",
      CINEMA_UNAVAILABLE:
        "Chi nhánh không còn hoạt động hoặc không tồn tại. Hãy tải lại danh sách.",
      EMAIL_UNAVAILABLE:
        "Email này đã có tài khoản. Không tạo hoặc đổi quyền tài khoản cũ; hãy kiểm tra danh sách hoặc dùng email khác.",
      FORBIDDEN: "Chỉ quản trị viên được quản lý danh sách nhân viên.",
      UNAUTHENTICATED: "Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.",
      PASSWORD_CHANGE_REQUIRED: "Hãy đổi mật khẩu tạm trước khi tiếp tục.",
      INVALID_ORIGIN: "Yêu cầu không hợp lệ. Hãy tải lại trang.",
      BODY_TOO_LARGE: "Nội dung gửi quá dài.",
      SERVER_ERROR: "Chưa thể xử lý. Hãy thử lại sau.",
    } as Record<string, string>,
  },
  en: {
    title: "Staff",
    subtitle:
      "Staff accounts and assigned cinemas. Create new accounts for the demo and basic cinema operations.",
    create: "Add staff member",
    close: "Close form",
    name: "Full name",
    email: "Sign-in email",
    cinema: "Cinema",
    all: "All cinemas",
    choose: "Choose an active cinema",
    search: "Search name or email",
    filter: "Find staff",
    reset: "Clear filters",
    password: "Temporary password",
    passwordHint:
      "10–128 characters. Save it for handover before creating the account; it cannot be viewed in the list later.",
    show: "Show password",
    hide: "Hide password",
    generate: "Generate random password",
    requirement:
      "The new account has the Staff role, belongs to one cinema and must change its password on first sign-in.",
    save: "Create account",
    saving: "Creating…",
    created:
      "Staff account created. Hand over the email and the temporary password you saved.",
    uncertain:
      "The creation result is uncertain. Check the list by email before retrying; do not try another email just to retry.",
    state: "Account",
    firstLogin: "First sign-in",
    required: "Password change required",
    ready: "Password changed",
    active: "Active",
    locked: "Locked",
    inactiveCinema: "Inactive",
    unassigned: "Unassigned",
    createdAt: "Created",
    empty: "No matching staff accounts.",
    noCinema:
      "No active cinema is available. Prepare cinema data before creating staff.",
    errors: {
      INVALID_INPUT:
        "Check name, email, temporary password (10–128 characters) and cinema.",
      INVALID_FILTER: "Invalid filters. Clear them and try again.",
      CINEMA_UNAVAILABLE:
        "The cinema is inactive or no longer exists. Reload the list.",
      EMAIL_UNAVAILABLE:
        "An account already uses this email. Existing accounts are never promoted or overwritten; check the list or use another email.",
      FORBIDDEN: "Only administrators can manage staff.",
      UNAUTHENTICATED: "Your session is no longer valid. Sign in again.",
      PASSWORD_CHANGE_REQUIRED: "Change your temporary password first.",
      INVALID_ORIGIN: "Invalid request. Reload the page.",
      BODY_TOO_LARGE: "Request is too large.",
      SERVER_ERROR: "Unable to process this request. Please try again later.",
    } as Record<string, string>,
  },
};
