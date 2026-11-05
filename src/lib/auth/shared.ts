export type Role = "CUSTOMER" | "STAFF" | "ADMIN";
export type Viewer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  mustChangePassword: boolean;
  cinema: { id: string; name: string; code: string } | null;
};

export function roleHome(locale: string, role: Role) {
  return `/${locale}/${role === "ADMIN" ? "admin" : role === "STAFF" ? "staff" : "account"}`;
}
export function safeNext(value: unknown, locale: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith(`/${locale}/`) ||
    /[\\\x00-\x20]/.test(value)
  )
    return null;
  const pathname = value.split(/[?#]/)[0];
  if (
    /\/(login|register)(\/|$)/.test(pathname) ||
    /%2f|%5c|%2e/i.test(pathname)
  )
    return null;
  return value;
}

export const authMessages = {
  vi: {
    INVALID_INPUT:
      "Thông tin chưa hợp lệ. Mật khẩu cần 10–128 ký tự; kiểm tra email, họ tên và xác nhận mật khẩu.",
    INVALID_CREDENTIALS:
      "Email hoặc mật khẩu không đúng, hoặc tài khoản không hoạt động.",
    EMAIL_UNAVAILABLE:
      "Không thể đăng ký email này. Hãy dùng email khác hoặc đăng nhập.",
    UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục.",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    PASSWORD_CHANGE_REQUIRED: "Vui lòng đổi mật khẩu tạm trước khi tiếp tục.",
    TOO_MANY_REQUESTS:
      "Đã thử quá nhiều lần. Vui lòng chờ khoảng 15 phút rồi thử lại.",
    INVALID_ORIGIN: "Yêu cầu không hợp lệ. Hãy tải lại trang.",
    BODY_TOO_LARGE: "Nội dung gửi lên quá dài.",
    SERVER_ERROR: "Chưa xử lý được yêu cầu. Hãy kiểm tra kết nối và thử lại.",
    PASSWORD_REUSED: "Mật khẩu mới cần khác mật khẩu hiện tại.",
  },
  en: {
    INVALID_INPUT:
      "Check your email, name and password confirmation. Passwords must contain 10–128 characters.",
    INVALID_CREDENTIALS:
      "Invalid email or password, or the account is inactive.",
    EMAIL_UNAVAILABLE:
      "This email cannot be registered. Try another email or sign in.",
    UNAUTHENTICATED: "Please sign in to continue.",
    FORBIDDEN: "You do not have permission for this action.",
    PASSWORD_CHANGE_REQUIRED:
      "Change your temporary password before continuing.",
    TOO_MANY_REQUESTS:
      "Too many attempts. Wait about 15 minutes and try again.",
    INVALID_ORIGIN: "Invalid request. Reload this page.",
    BODY_TOO_LARGE: "The submitted content is too large.",
    SERVER_ERROR:
      "The request could not be completed. Check your connection and retry.",
    PASSWORD_REUSED: "Choose a password different from your current password.",
  },
};
export type AuthCode = keyof typeof authMessages.vi;
