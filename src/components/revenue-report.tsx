import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n";
import { queryValue, type QueryParams } from "@/lib/query";
import { revenueReport } from "@/lib/reports/revenue";
import {
  count,
  money,
  percent,
  reportMessages,
  type RevenueReport,
  type RevenueRow,
} from "@/lib/reports/shared";
import styles from "./revenue-report.module.css";

export async function RevenueScreen({
  locale,
  sessionId,
  query,
  base,
}: {
  locale: Locale;
  sessionId: string;
  query: QueryParams;
  base: string;
}) {
  const vi = locale === "vi";
  let report: RevenueReport;
  try {
    report = await revenueReport(sessionId, {
      from: queryValue(query.from),
      to: queryValue(query.to),
      bucket: queryValue(query.bucket),
      movie: queryValue(query.movie),
      cinema: queryValue(query.cinema),
    });
  } catch (error) {
    const code = (error as { code?: string }).code ?? "SERVER_ERROR";
    return (
      <section className={styles.report}>
        <h1>{vi ? "Thống kê doanh thu" : "Revenue reports"}</h1>
        <p role="alert" className={styles.error}>
          {reportMessages[locale][code as keyof typeof reportMessages.vi] ??
            reportMessages[locale].SERVER_ERROR}
        </p>
        <Link
          className="button buttonGold"
          href={code === "UNAUTHENTICATED" ? `/${locale}/login` : base}
        >
          {vi ? "Tải lại với bộ lọc mặc định" : "Reload default filters"}
        </Link>
      </section>
    );
  }
  const params = new URLSearchParams({
    from: report.from,
    to: report.to,
    bucket: report.bucket,
    ...(report.movie ? { movie: report.movie } : {}),
    ...(report.cinema ? { cinema: report.cinema } : {}),
    locale,
    format: "csv",
  });
  const max = report.time.reduce(
    (value, r) =>
      [BigInt(value), BigInt(r.gross), BigInt(r.refunds)]
        .reduce((a, b) => (a > b ? a : b))
        .toString(),
    "0",
  );
  const table = (title: string, rows: RevenueRow[], first: string) => (
    <article className={styles.panel}>
      <h2>{title}</h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {[
                first,
                vi ? "Tiền thu" : "Gross",
                vi ? "Tiền hoàn" : "Refunds",
                vi ? "Sau hoàn" : "Net",
                vi ? "Đơn thu / hoàn" : "Paid / refunded orders",
                vi ? "Ghế bán / hoàn" : "Sold / refunded seats",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{vi ? row.label : row.labelEn}</th>
                <td>{money(row.gross, locale)}</td>
                <td>{money(row.refunds, locale)}</td>
                <td
                  className={
                    BigInt(row.net) < BigInt(0) ? styles.negative : styles.net
                  }
                >
                  {money(row.net, locale)}
                </td>
                <td>
                  {count(row.paidOrders, locale)} /{" "}
                  {count(row.refundedOrders, locale)}
                </td>
                <td>
                  {count(row.soldSeats, locale)} /{" "}
                  {count(row.refundedSeats, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className={styles.muted}>
          {vi
            ? "Không có giao dịch phát sinh với bộ lọc này."
            : "No events match these filters."}
        </p>
      )}
    </article>
  );
  return (
    <section className={styles.report}>
      <div className={styles.title}>
        <div>
          <p className={styles.eyebrow}>CINERESERVE INSIGHTS</p>
          <h1>{vi ? "Thống kê doanh thu" : "Revenue reports"}</h1>
          <p className={styles.muted}>
            {report.scopeName ??
              (vi
                ? "Tất cả chi nhánh trong quyền quản trị"
                : "All cinemas in your administrative scope")}{" "}
            · {vi ? "Tiền tệ" : "Currency"}: VND · UTC+7
          </p>
        </div>
        <a
          className="button buttonOutline"
          href={`/api/reports/revenue?${params}`}
        >
          {vi ? "Tải báo cáo CSV" : "Download CSV"}
        </a>
      </div>
      <p className={styles.note}>
        {vi
          ? "Số liệu thanh toán giả lập, không phải tiền thật. Tính theo ngày thu/hoàn tiền, không theo ngày chiếu. Thanh toán thất bại và đơn chưa trả không được tính."
          : "Simulated payment data, not real money. Grouped by payment/refund date, not show date. Failed attempts and unpaid orders are excluded."}
      </p>
      <form className={styles.filters} key={params.toString()}>
        <label>
          {vi ? "Từ ngày" : "From"}
          <input name="from" type="date" defaultValue={report.from} required />
        </label>
        <label>
          {vi ? "Đến ngày (bao gồm)" : "To (inclusive)"}
          <input name="to" type="date" defaultValue={report.to} required />
        </label>
        <label>
          {vi ? "Gộp thời gian" : "Time bucket"}
          <select name="bucket" defaultValue={report.bucket}>
            <option value="day">{vi ? "Theo ngày" : "Daily"}</option>
            <option value="month">{vi ? "Theo tháng" : "Monthly"}</option>
          </select>
        </label>
        <label>
          {vi ? "Phim" : "Movie"}
          <select name="movie" defaultValue={report.movie}>
            <option value="">{vi ? "Tất cả phim" : "All movies"}</option>
            {report.options.movies.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {vi ? movie.label : movie.labelEn}
              </option>
            ))}
          </select>
        </label>
        <label>
          {vi ? "Chi nhánh" : "Cinema"}
          {report.role === "STAFF" ? (
            <>
              <input
                value={report.scopeName ?? ""}
                readOnly
                aria-readonly="true"
              />
              <input type="hidden" name="cinema" value={report.cinema} />
            </>
          ) : (
            <select name="cinema" defaultValue={report.cinema}>
              <option value="">
                {vi ? "Tất cả chi nhánh" : "All cinemas"}
              </option>
              {report.options.cinemas.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.label}
                  {!cinema.active
                    ? vi
                      ? " (ngừng hoạt động)"
                      : " (inactive)"
                    : ""}
                </option>
              ))}
            </select>
          )}
        </label>
        <div className={styles.actions}>
          <button className="button buttonGold" type="submit">
            {vi ? "Xem báo cáo" : "Apply filters"}
          </button>
          <Link href={base}>{vi ? "Đặt lại" : "Reset"}</Link>
        </div>
      </form>
      <div className={styles.cards}>
        {[
          {
            title: vi ? "Tiền thu thành công" : "Successful payments",
            value: money(report.summary.gross, locale),
          },
          {
            title: vi ? "Tiền đã hoàn" : "Completed refunds",
            value: money(report.summary.refunds, locale),
          },
          {
            title: vi ? "Doanh thu sau hoàn" : "Net after refunds",
            value: money(report.summary.net, locale),
            negative: BigInt(report.summary.net) < BigInt(0),
          },
          {
            title: vi ? "Đơn đã thu / đã hoàn" : "Paid / refunded orders",
            value: `${count(report.summary.paidOrders, locale)} / ${count(report.summary.refundedOrders, locale)}`,
          },
          {
            title: vi ? "Ghế đã bán / đã hoàn" : "Sold / refunded seats",
            value: `${count(report.summary.soldSeats, locale)} / ${count(report.summary.refundedSeats, locale)}`,
          },
        ].map((card) => (
          <article key={card.title}>
            <p>{card.title}</p>
            <strong className={card.negative ? styles.negative : ""}>
              {card.value}
            </strong>
          </article>
        ))}
      </div>
      {report.summary.paidOrders === "0" &&
        report.summary.refundedOrders === "0" && (
          <p role="status" className={styles.empty}>
            {vi
              ? "Chưa có giao dịch thu/hoàn trong khoảng này. Báo cáo lấy dữ liệu thật trong database; không tự chèn doanh thu mẫu."
              : "No payment/refund events in this range. Reports use stored transactions; no sample revenue is inserted automatically."}
          </p>
        )}
      <article className={styles.panel}>
        <h2>
          {vi
            ? "Tiền thu và hoàn theo thời gian"
            : "Payments and refunds over time"}
        </h2>
        <p className={styles.muted}>
          {vi
            ? "Xanh: tiền thu · Cam: tiền hoàn. Doanh thu sau hoàn có thể âm khi hoàn cho đơn đã thu ở kỳ trước."
            : "Green: payments · Orange: refunds. Net may be negative when refunding payments collected in a previous period."}
        </p>
        <div
          className={styles.chart}
          role="img"
          aria-label={
            vi
              ? "Biểu đồ tiền thu và tiền hoàn. Số liệu đầy đủ ở bảng thời gian bên dưới."
              : "Payment and refund chart. Full figures are in the time table below."
          }
        >
          {report.time.map((row) => (
            <div className={styles.chartRow} key={row.key}>
              <span>{row.key}</span>
              <div>
                <div className={styles.track}>
                  <div
                    className={styles.grossBar}
                    style={{ width: `${percent(row.gross, max)}%` }}
                  />
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.refundBar}
                    style={{ width: `${percent(row.refunds, max)}%` }}
                  />
                </div>
              </div>
              <div className={styles.chartAmounts}>
                <span>{money(row.gross, locale)}</span>
                <span>{money(row.refunds, locale)}</span>
              </div>
            </div>
          ))}
        </div>
      </article>
      {table(
        vi ? "Theo phim" : "By movie",
        report.movies,
        vi ? "Phim" : "Movie",
      )}
      {table(
        vi ? "Theo chi nhánh" : "By cinema",
        report.cinemas,
        vi ? "Chi nhánh" : "Cinema",
      )}
      {table(
        vi
          ? `Theo ${report.bucket === "day" ? "ngày" : "tháng"}`
          : `By ${report.bucket === "day" ? "day" : "month"}`,
        report.time,
        vi ? "Thời gian" : "Period",
      )}
      <p className={styles.muted}>
        {vi ? "Chụp số liệu lúc" : "Snapshot generated"}:{" "}
        {new Intl.DateTimeFormat(isLocale(locale) && vi ? "vi-VN" : "en-GB", {
          timeZone: "Asia/Ho_Chi_Minh",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(report.generatedAt))}
        .{" "}
        {vi
          ? "Chọn tối đa 366 ngày; dùng nhóm tháng cho khoảng dài. Tên phim/rạp hiển thị theo danh mục hiện tại, số tiền theo giao dịch đã lưu."
          : "Select up to 366 days; use monthly buckets for longer ranges. Labels use the current catalogue; amounts use stored transactions."}
      </p>
    </section>
  );
}
