import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import styles from "@/components/admin/admin.module.css";
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin", ["ADMIN"]);
  return (
    <div className={styles.workspace}>
      <nav
        className={styles.sidebar}
        aria-label={locale === "vi" ? "Quản trị" : "Administration"}
      >
        <p>CINERESERVE</p>
        {[
          ["", locale === "vi" ? "Tổng quan" : "Overview"],
          ["/movies", locale === "vi" ? "Quản lý phim" : "Movies"],
          ["/showtimes", locale === "vi" ? "Lịch chiếu" : "Showtimes"],
          ["/orders", locale === "vi" ? "Đơn hàng" : "Orders"],
          ["/staff", locale === "vi" ? "Nhân viên" : "Staff"],
          ["/reports", locale === "vi" ? "Doanh thu" : "Revenue"],
          ["/audit", locale === "vi" ? "Nhật ký" : "Audit log"],
        ].map(([href, label]) => (
          <Link key={href} href={`/${locale}/admin${href}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
