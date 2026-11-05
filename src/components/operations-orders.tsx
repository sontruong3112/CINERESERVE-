import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { operationsOrders } from "@/lib/operations/orders";
import {
  OperationsError,
  operationsCopy,
  operationsMoney,
  type OperationsQuery,
} from "@/lib/operations/orders-shared";
import { Pagination } from "@/components/admin/pagination";
import styles from "./operations-orders.module.css";

export async function OperationsOrdersScreen({
  locale,
  sessionId,
  query,
  base,
}: {
  locale: Locale;
  sessionId: string;
  query: OperationsQuery;
  base: string;
}) {
  const t = operationsCopy[locale];
  let report;
  try {
    report = await operationsOrders(sessionId, query);
  } catch (error) {
    return (
      <section className={styles.notice} role="alert">
        <h1>{t.title}</h1>
        <p>
          {t.errors[
            error instanceof OperationsError ? error.code : "SERVER_ERROR"
          ] || t.errors.SERVER_ERROR}
        </p>
        <Link href={base}>{t.reset}</Link>
      </section>
    );
  }
  const staff = report.role === "STAFF";
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
          timeZone: "Asia/Ho_Chi_Minh",
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value))
      : "—";
  return (
    <div className={styles.screen}>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">CINERESERVE OPERATIONS</p>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          {report.scope && <strong>{report.scope}</strong>}
        </div>
        {staff && (
          <Link href={`/${locale}/staff/tickets`} className="button buttonGold">
            {t.scan}
          </Link>
        )}
      </header>
      <p className={styles.privacy}>{t.privacy}</p>
      <form
        action={base}
        method="get"
        className={styles.filters}
        key={JSON.stringify(report.query)}
      >
        <label>
          {t.code}
          <input
            name="q"
            defaultValue={report.query.q}
            maxLength={32}
            placeholder="CR-…"
            autoComplete="off"
            required={staff}
            pattern={staff ? "[Cc][Rr]-[A-Fa-f0-9]{12}" : "[A-Za-z0-9-]{0,32}"}
          />
          <small>{staff ? t.codeHint : "CR-…"}</small>
        </label>
        <label>
          {t.status}
          <select name="status" defaultValue={report.query.status}>
            <option value="">{t.all}</option>
            {["PENDING", "PAID", "EXPIRED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {t.states[s]}
              </option>
            ))}
          </select>
        </label>
        {!staff && (
          <label>
            {t.cinema}
            <select name="cinema" defaultValue={report.query.cinema}>
              <option value="">{t.all}</option>
              {report.cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t.from}
          <input
            type="date"
            name="from"
            defaultValue={report.query.from}
            min="2000-01-01"
            max="2099-12-31"
          />
        </label>
        <label>
          {t.to}
          <input
            type="date"
            name="to"
            defaultValue={report.query.to}
            min="2000-01-01"
            max="2099-12-31"
          />
        </label>
        <button className="button buttonGold" type="submit">
          {t.search}
        </button>
        <Link href={base}>{t.reset}</Link>
      </form>
      <p className={styles.note}>
        {t.mock} {t.expiredNote}
      </p>
      {report.needsCode || !report.rows.length ? (
        <p className={styles.empty}>
          {report.needsCode ? t.needCode : t.empty}
        </p>
      ) : (
        <>
          <p className={styles.count}>
            {report.total} {t.records}
          </p>
          <div className={styles.orders}>
            {report.rows.map((order) => (
              <article key={order.id} className={styles.card}>
                <div className={styles.summary}>
                  <div>
                    <strong className={styles.code}>{order.code}</strong>
                    <span className={styles.state} data-status={order.status}>
                      {t.states[order.status]}
                    </span>
                    <p>{locale === "vi" ? order.title : order.titleEn}</p>
                    <span>
                      {order.cinema} · {order.room}
                    </span>
                    <time dateTime={order.startsAt}>
                      {date(order.startsAt)} · UTC+7
                    </time>
                  </div>
                  <div className={styles.amount}>
                    <span>{t.amount}</span>
                    <strong>{operationsMoney(order.total, locale)}</strong>
                    <small>
                      {order.items.map((i) => i.label).join(", ") || "—"}
                    </small>
                  </div>
                </div>
                <details className={styles.details}>
                  <summary>{t.details}</summary>
                  <div className={styles.detailGrid}>
                    <dl>
                      <div>
                        <dt>{t.customer}</dt>
                        <dd>
                          {order.customer.name}
                          <br />
                          {order.customer.email}
                          {order.customer.phone && (
                            <>
                              <br />
                              {order.customer.phone}
                            </>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{t.created}</dt>
                        <dd>{date(order.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>{t.paid}</dt>
                        <dd>{date(order.paidAt)}</dd>
                      </div>
                      <div>
                        <dt>{t.expires}</dt>
                        <dd>{date(order.expiresAt)}</dd>
                      </div>
                      {order.cancellationReason && (
                        <div>
                          <dt>{t.reason}</dt>
                          <dd>{order.cancellationReason}</dd>
                        </div>
                      )}
                      {order.refund && (
                        <div>
                          <dt>{t.refund}</dt>
                          <dd>
                            {operationsMoney(order.refund.amount, locale)}
                            <br />
                            {date(order.refund.completedAt)}
                            <br />
                            {order.refund.reason}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div>
                      <div className={styles.tableWrap}>
                        <table>
                          <thead>
                            <tr>
                              <th>{t.seat}</th>
                              <th>{t.type}</th>
                              <th>{t.price}</th>
                              <th>{t.ticket}</th>
                              <th>{t.used}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.label}>
                                <th scope="row">{item.label}</th>
                                <td>
                                  {item.type === "VIP" ? "VIP" : t.standard}
                                </td>
                                <td>{operationsMoney(item.price, locale)}</td>
                                <td>
                                  {item.ticketStatus
                                    ? t.states[item.ticketStatus]
                                    : t.none}
                                </td>
                                <td>{date(item.usedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <h3>{t.attempts}</h3>
                      {order.attempts.length ? (
                        <ul className={styles.attempts}>
                          {order.attempts.map((attempt, i) => (
                            <li key={i}>
                              <span>{date(attempt.createdAt)}</span>
                              <strong>{t.states[attempt.outcome]}</strong>
                              <span>
                                {operationsMoney(attempt.amount, locale)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{t.none}</p>
                      )}
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
          <Pagination
            base={base}
            query={report.query}
            page={report.page}
            pages={report.pages}
            total={report.total}
            locale={locale}
          />
        </>
      )}
      <p className={styles.note}>
        {t.checked}: {date(report.checkedAt)} · UTC+7
      </p>
      {staff && <Link href={`/${locale}/staff`}>← {t.back}</Link>}
    </div>
  );
}
