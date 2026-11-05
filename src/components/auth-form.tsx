"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import {
  authMessages,
  roleHome,
  safeNext,
  type AuthCode,
  type Viewer,
} from "@/lib/auth/shared";
import styles from "./auth-form.module.css";

type Mode = "login" | "register" | "password" | "profile";
export function AuthForm({
  mode,
  locale,
  next,
  viewer,
}: {
  mode: Mode;
  locale: Locale;
  next?: string;
  viewer?: Viewer;
}) {
  const router = useRouter();
  const vi = locale === "vi";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const title = {
    login: vi ? "Chào mừng bạn trở lại." : "Welcome back.",
    register: vi
      ? "Bắt đầu câu chuyện của bạn."
      : "Your next story starts here.",
    password: vi ? "Đổi mật khẩu" : "Change password",
    profile: vi ? "Tài khoản của bạn" : "Your account",
  }[mode];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setDone(false);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          authMessages[locale][result.error as AuthCode] ??
            authMessages[locale].SERVER_ERROR,
        );
        return;
      }
      if (mode === "profile") {
        setDone(true);
        router.refresh();
        return;
      }
      const user = result.user as Viewer;
      if (!user) {
        setError(authMessages[locale].UNAUTHENTICATED);
        return;
      }
      const destination = user.mustChangePassword
        ? `/${locale}/account/password`
        : mode === "password"
          ? roleHome(locale, user.role)
          : (safeNext(next, locale) ?? roleHome(locale, user.role));
      form.reset();
      router.replace(destination);
      router.refresh();
    } catch {
      setError(authMessages[locale].SERVER_ERROR);
    } finally {
      setPending(false);
    }
  }
  const passwordInput = (name: string, label: string, autocomplete: string) => (
    <div key={name} className={styles.field}>
      <label htmlFor={name}>{label}</label>
      <div className={styles.password}>
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autocomplete}
          required
          minLength={name === "currentPassword" || mode === "login" ? 1 : 10}
          maxLength={128}
          aria-describedby="password-help"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={
            vi
              ? show
                ? "Ẩn mật khẩu"
                : "Hiện mật khẩu"
              : show
                ? "Hide password"
                : "Show password"
          }
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
  return (
    <div className={styles.shell}>
      <section className={styles.panel}>
        <LockKeyhole className={styles.icon} size={28} />
        <h1>{title}</h1>
        <p className={styles.description}>
          {mode === "password" && viewer?.mustChangePassword
            ? vi
              ? "Bạn đang dùng mật khẩu tạm. Hãy đổi trước khi truy cập khu vực làm việc."
              : "You are using a temporary password. Change it before opening your workspace."
            : mode === "profile"
              ? `${viewer?.email} · ${viewer?.role}`
              : vi
                ? "Một tài khoản để tiếp tục hành trình cùng CineReserve."
                : "One account for your CineReserve experience."}
        </p>
        <form className={styles.form} onSubmit={submit}>
          {(mode === "register" || mode === "profile") && (
            <label htmlFor="name">
              {vi ? "Họ tên" : "Full name"}
              <input
                id="name"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                defaultValue={viewer?.name}
                required
              />
            </label>
          )}
          {(mode === "register" || mode === "login") && (
            <label htmlFor="email">
              {mode === "login"
                ? vi
                  ? "Email / tài khoản"
                  : "Email / username"
                : "Email"}
              <input
                id="email"
                name="email"
                type={mode === "login" ? "text" : "email"}
                autoComplete={mode === "login" ? "username" : "email"}
                maxLength={254}
                required
              />
            </label>
          )}
          {mode === "profile" && (
            <label htmlFor="phone">
              {vi ? "Số điện thoại (không bắt buộc)" : "Phone (optional)"}
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={25}
                defaultValue={viewer?.phone ?? ""}
              />
            </label>
          )}
          {mode === "password" &&
            passwordInput(
              "currentPassword",
              vi ? "Mật khẩu hiện tại" : "Current password",
              "current-password",
            )}
          {mode !== "profile" &&
            passwordInput(
              "password",
              vi
                ? mode === "password"
                  ? "Mật khẩu mới"
                  : "Mật khẩu"
                : mode === "password"
                  ? "New password"
                  : "Password",
              mode === "login" ? "current-password" : "new-password",
            )}
          {(mode === "register" || mode === "password") &&
            passwordInput(
              "confirmPassword",
              vi ? "Nhập lại mật khẩu" : "Confirm password",
              "new-password",
            )}
          {mode !== "profile" && (
            <small className="muted" id="password-help">
              {mode === "login" ? (vi ? "Nhập thông tin đăng nhập của tài khoản đã có." : "Enter your existing account credentials.") : vi
                ? "Mật khẩu 10–128 ký tự. Không dùng mật khẩu của tài khoản khác."
                : "Use 10–128 characters and a password unique to this account."}
            </small>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {done && (
            <p role="status" className={styles.success}>
              {vi ? "Đã lưu thông tin." : "Profile saved."}
            </p>
          )}
          <button
            disabled={pending}
            className="button buttonGold"
            type="submit"
          >
            {pending
              ? vi
                ? "Đang xử lý…"
                : "Working…"
              : mode === "login"
                ? vi
                  ? "Đăng nhập"
                  : "Sign in"
                : mode === "register"
                  ? vi
                    ? "Tạo tài khoản"
                    : "Create account"
                  : vi
                    ? "Lưu thay đổi"
                    : "Save changes"}
          </button>
        </form>
        {(mode === "login" || mode === "register") && (
          <p className={styles.switch}>
            {mode === "login"
              ? vi
                ? "Chưa có tài khoản? "
                : "New here? "
              : vi
                ? "Đã có tài khoản? "
                : "Already have an account? "}
            <Link
              href={`/${locale}/${mode === "login" ? "register" : "login"}${safeNext(next, locale) ? `?next=${encodeURIComponent(next!)}` : ""}`}
            >
              {mode === "login"
                ? vi
                  ? "Đăng ký"
                  : "Create account"
                : vi
                  ? "Đăng nhập"
                  : "Sign in"}
            </Link>
          </p>
        )}
        {mode === "profile" && (
          <div className={styles.links}>
            <Link
              className="button buttonOutline"
              href={`/${locale}/account/password`}
            >
              {vi ? "Đổi mật khẩu" : "Change password"}
            </Link>
            {viewer && viewer.role !== "CUSTOMER" && (
              <Link
                className="button buttonOutline"
                href={roleHome(locale, viewer.role)}
              >
                {vi ? "Khu vực làm việc" : "Workspace"}
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
