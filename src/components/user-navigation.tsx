"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Viewer } from "@/lib/auth/shared";
import { roleHome } from "@/lib/auth/shared";
import styles from "./cinema-ui.module.css";

export function UserNavigation({
  locale,
  viewer,
}: {
  locale: Locale;
  viewer: Pick<Viewer, "name" | "role"> | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  if (!viewer)
    return (
      <Link href={`/${locale}/login`} className={styles.accountLink}>
        {locale === "vi" ? "Đăng nhập" : "Sign in"}
      </Link>
    );
  return (
    <div className={styles.userNav}>
      <Link className={styles.accountLink} href={`/${locale}/account/orders`}>
        {locale === "vi"
          ? viewer.role === "CUSTOMER"
            ? "Đơn hàng"
            : "Đơn cá nhân"
          : viewer.role === "CUSTOMER"
            ? "Orders"
            : "Personal orders"}
      </Link>
      {viewer.role !== "CUSTOMER" && (
        <Link
          className={styles.accountLink}
          href={roleHome(locale, viewer.role)}
        >
          {viewer.role === "ADMIN"
            ? locale === "vi"
              ? "Quản trị"
              : "Admin"
            : locale === "vi"
              ? "Nhân viên"
              : "Staff"}
        </Link>
      )}
      <Link
        className={styles.accountLink}
        href={`/${locale}/account/profile`}
        title={viewer.name}
      >
        {viewer.name}
      </Link>
      <button
        disabled={pending}
        type="button"
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            const res = await fetch("/api/auth/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            if (!res.ok) throw new Error();
            router.replace(`/${locale}`);
            router.refresh();
          } catch {
            setError(true);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "…" : locale === "vi" ? "Thoát" : "Sign out"}
      </button>
      {error && (
        <span role="alert">{locale === "vi" ? "Thử lại" : "Retry"}</span>
      )}
    </div>
  );
}
