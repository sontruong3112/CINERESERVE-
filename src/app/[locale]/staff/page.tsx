import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import styles from "@/components/auth-form.module.css";
export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await requirePageViewer(locale, "staff", ["STAFF"]);
  const cinema = viewer.cinema!;
  const sessions = await getDb().showtime.findMany({
    where: {
      auditorium: { cinemaId: cinema.id, active: true },
      startsAt: { gte: new Date() },
      status: "ON_SALE",
    },
    include: { movie: true, auditorium: true },
    orderBy: { startsAt: "asc" },
    take: 20,
  });
  return (
    <div className={styles.wide}>
      <section className={styles.panel}>
        <p className="eyebrow">STAFF WORKSPACE</p>
        <h1>{cinema.name}</h1>
        <p className={styles.description}>
          {locale === "vi"
            ? "Bạn chỉ xem lịch và kiểm tra vé thuộc chi nhánh được phân công. Đọc vé trước, xác nhận sử dụng sau."
            : "View sessions and check tickets only for your assigned cinema. Read first, then confirm admission."}
        </p>
        <Link className="button buttonGold" href={`/${locale}/staff/tickets`}>
          {locale === "vi" ? "Quét và kiểm tra vé" : "Scan and check tickets"}
        </Link>
        <Link
          className="button buttonOutline"
          style={{ marginLeft: 12 }}
          href={`/${locale}/staff/reports`}
        >
          {locale === "vi" ? "Doanh thu chi nhánh" : "Cinema revenue"}
        </Link>
        <ul className={styles.list}>
          <li><Link href={`/${locale}/staff/orders`}>{locale === 'vi' ? 'Tra cứu đơn hàng tại chi nhánh →' : 'Look up an order at your cinema →'}</Link></li>
          {sessions.map((session) => (
            <li key={session.id}>
              <span>
                {session.movie.originalTitle} · {session.auditorium.name}
              </span>
              <time dateTime={session.startsAt.toISOString()}>
                {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Asia/Ho_Chi_Minh",
                }).format(session.startsAt)}
              </time>
            </li>
          ))}
        </ul>
        {!sessions.length && (
          <p className={styles.description}>
            {locale === "vi"
              ? "Chưa có suất sắp chiếu."
              : "No upcoming sessions."}
          </p>
        )}
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
