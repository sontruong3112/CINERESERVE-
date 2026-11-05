import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import styles from "@/components/auth-form.module.css";
export default async function ForbiddenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className={styles.shell}>
      <section className={styles.panel}>
        <p className="eyebrow">403 · CINERESERVE</p>
        <h1>
          {locale === "vi"
            ? "Bạn không có quyền truy cập."
            : "Access is not permitted."}
        </h1>
        <p className={styles.description}>
          {locale === "vi"
            ? "Tài khoản hiện tại không được phép vào khu vực này."
            : "Your current account cannot access this workspace."}
        </p>
        <Link className="button buttonGold" href={`/${locale}`}>
          {locale === "vi" ? "Về trang chủ" : "Back home"}
        </Link>
      </section>
    </div>
  );
}
