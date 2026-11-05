import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import { listOrders } from "@/lib/booking/orders";
import { orderMoney } from "@/lib/booking/orders-shared";
import { queryValue, type QueryParams } from "@/lib/query";
import styles from "@/components/orders.module.css";
export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "account/orders");
  const session = await currentSession();
  if (!session) notFound();
  const list = await listOrders(
    session.id,
    queryValue((await searchParams).page),
  );
  const names =
    locale === "vi"
      ? {
          PENDING: "Chờ thanh toán",
          PAID: "Đã thanh toán giả lập",
          EXPIRED: "Hết hạn",
          CANCELLED: "Đã hủy",
        }
      : {
          PENDING: "Awaiting payment",
          PAID: "Simulated payment completed",
          EXPIRED: "Expired",
          CANCELLED: "Cancelled",
        };
  return (
    <section className={`container ${styles.shell}`}>
      <p className="eyebrow">YOUR MOVIE NIGHTS</p>
      <h1>{locale === "vi" ? "Đơn hàng của tôi" : "My orders"}</h1>
      <p className={styles.demo}>
        {locale === "vi"
          ? "Đơn hàng và thanh toán thử nghiệm. Không thu tiền thật."
          : "Test orders and simulated payments. No real money is collected."}
      </p>
      <div className={styles.cards}>
        {list.items.map((order) => (
          <Link
            className={styles.card}
            key={order.id}
            href={`/${locale}/account/orders/${order.id}`}
          >
            <span
              className={`${styles.badge} ${order.status === "PAID" ? styles.paid : ""}`}
            >
              {names[order.status]}
            </span>
            <strong>{locale === "vi" ? order.title : order.titleEn}</strong>
            <p>
              {order.code} · {order.cinema} · {order.room}
            </p>
            <p>
              {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
                timeZone: "Asia/Ho_Chi_Minh",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(order.startsAt))}{" "}
              · {order.items.map((i) => i.label).join(", ") || "—"}
            </p>
            <span>{orderMoney(order.total, locale)} →</span>
          </Link>
        ))}
      </div>
      {!list.items.length && (
        <p className={styles.muted}>
          {locale === "vi"
            ? "Bạn chưa có đơn hàng. Chọn phim, suất và giữ ghế để bắt đầu."
            : "No orders yet. Choose a movie and session, then hold your seats."}{" "}
          <Link href={`/${locale}/movies`}>
            {locale === "vi" ? "Khám phá phim →" : "Explore movies →"}
          </Link>
        </p>
      )}
      <div className={styles.pager}>
        {list.page > 1 && <Link href={`?page=${list.page - 1}`}>←</Link>}
        <span>
          {list.page}/{list.pages} · {list.total}{" "}
          {locale === "vi" ? "đơn" : "orders"}
        </span>
        {list.page < list.pages && (
          <Link href={`?page=${list.page + 1}`}>→</Link>
        )}
      </div>
    </section>
  );
}
