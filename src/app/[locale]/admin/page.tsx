import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import styles from "@/components/admin/admin.module.css";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin", ["ADMIN"]);
  const db = getDb();
  const [users, movies, cinemas] = await Promise.all([
    db.user.count(),
    db.movie.count(),
    db.cinema.count(),
  ]);
  return (
    <div>
      <section>
        <p className="eyebrow">ADMIN WORKSPACE</p>
        <h1>
          {locale === "vi"
            ? "Quản trị CineReserve"
            : "CineReserve administration"}
        </h1>
        <p className={styles.description}>
          {locale === "vi"
            ? "Quản lý nội dung phim, xếp lịch theo phòng và theo dõi thay đổi. Số liệu được lấy trực tiếp từ cơ sở dữ liệu."
            : "Manage movie content, schedule auditoriums and review changes. Counts come directly from the database."}
        </p>
        <div className={styles.stats}>
          {[
            [locale === "vi" ? "Tài khoản" : "Accounts", users],
            [locale === "vi" ? "Phim" : "Movies", movies],
            [locale === "vi" ? "Chi nhánh" : "Cinemas", cinemas],
          ].map(([label, value]) => (
            <article key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className={styles.actions} style={{ marginTop: 24 }}>
          <Link className="button buttonGold" href={`/${locale}/admin/movies`}>
            {locale === "vi" ? "Quản lý phim" : "Manage movies"}
          </Link>
          <Link
            className="button buttonOutline"
            href={`/${locale}/admin/showtimes`}
          >
            {locale === "vi" ? "Quản lý lịch chiếu" : "Manage showtimes"}
          </Link>
        </div>
        <Link
          className="button buttonOutline"
          href={`/${locale}/account/profile`}
        >
          {locale === "vi" ? "Thông tin tài khoản" : "Account settings"}
        </Link>
      </section>
    </div>
  );
}
