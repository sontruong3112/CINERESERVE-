"use client";
import { BookingProgress } from "./booking-progress";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  orderMessages,
  orderMoney,
  type Order,
} from "@/lib/booking/orders-shared";
import styles from "./orders.module.css";
import {
  CHECKOUT_CONFIRMATION_VERSION,
  checkoutCopy,
  ageExplanation,
} from "@/lib/booking/checkout-policy";
type RequestInfo = {
  idempotencyKey: string;
  outcome: "SUCCESS" | "FAILED";
  version: number;
  ageConfirmed: true;
  policyConfirmed: true;
  confirmationVersion: string;
};
export function OrderDetail({
  initial,
  locale,
  canPurchase,
}: {
  initial: Order;
  locale: Locale;
  canPurchase: boolean;
}) {
  const vi = locale === "vi",
    [order, setOrder] = useState(initial),
    [clock, setClock] = useState(Date.parse(initial.serverNow));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const [confirmation, setConfirmation] = useState({
    version: initial.version,
    age: false,
    policy: false,
  });
  const policy = checkoutCopy[locale];
  const ageConfirmed =
    confirmation.version === order.version && confirmation.age;
  const policyConfirmed =
    confirmation.version === order.version && confirmation.policy;
  const pending = useRef<RequestInfo | null>(null),
    working = useRef(false),
    alive = useRef(true),
    latest = useRef(initial.serverNow);
  const names = vi
    ? {
        PENDING: "Chờ thanh toán",
        PAID: "Đã thanh toán giả lập",
        EXPIRED: "Đã hết hạn",
        CANCELLED: "Đã hủy",
      }
    : {
        PENDING: "Awaiting payment",
        PAID: "Simulated payment completed",
        EXPIRED: "Expired",
        CANCELLED: "Cancelled",
      };
  const apply = useCallback((next: Order) => {
    if (Date.parse(next.serverNow) < Date.parse(latest.current)) return;
    latest.current = next.serverNow;
    setOrder(next);
    setClock(Date.parse(next.serverNow));
    if (
      pending.current &&
      (next.status !== "PENDING" ||
        next.attempts.some((a) => a.key === pending.current?.idempotencyKey))
    ) {
      pending.current = null;
      setUncertain(false);
    }
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${initial.id}`, {
        cache: "no-store",
      });
      if (!alive.current || working.current) return;
      if (response.ok) apply((await response.json()).order);
      else
        setError(
          orderMessages[locale][
            (await response.json()).error as keyof typeof orderMessages.vi
          ] ?? orderMessages[locale].SERVER_ERROR,
        );
    } catch {
      if (alive.current) setError(orderMessages[locale].SERVER_ERROR);
    }
  }, [apply, initial.id, locale]);
  useEffect(() => {
    alive.current = true;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !working.current)
        void refresh();
    }, 5000);
    const focus = () => {
      if (!working.current) void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      alive.current = false;
      clearInterval(interval);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    const start = performance.now(),
      server = Date.parse(order.serverNow);
    const timer = setInterval(
      () => setClock(server + performance.now() - start),
      250,
    );
    return () => clearInterval(timer);
  }, [order.serverNow]);
  const remaining = Math.max(
    0,
    Math.ceil((Date.parse(order.expiresAt) - clock) / 1000),
  );
  const canPay =
    canPurchase &&
    order.status === "PENDING" &&
    remaining > 0 &&
    order.items.length > 0 &&
    ageConfirmed &&
    policyConfirmed;
  async function pay(outcome?: "SUCCESS" | "FAILED") {
    if (working.current || !canPurchase) return;
    if (!pending.current) {
      if (!outcome || !canPay) return;
      pending.current = {
        idempotencyKey: crypto.randomUUID(),
        outcome,
        version: order.version,
        ageConfirmed: true,
        policyConfirmed: true,
        confirmationVersion: CHECKOUT_CONFIRMATION_VERSION,
      };
    }
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${order.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const result = await response.json();
      if (response.ok) {
        pending.current = null;
        setUncertain(false);
        apply(result.order);
      } else {
        setError(
          orderMessages[locale][
            result.error as keyof typeof orderMessages.vi
          ] ?? orderMessages[locale].SERVER_ERROR,
        );
        if (response.status >= 500) setUncertain(true);
        else {
          pending.current = null;
          setUncertain(false);
        }
      }
    } catch {
      setUncertain(true);
      setError(orderMessages[locale].SERVER_ERROR);
    } finally {
      working.current = false;
      setBusy(false);
      void refresh();
    }
  }
  async function cancel() {
    if (working.current || uncertain) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: order.version }),
      });
      const result = await response.json();
      if (response.ok) apply(result.order);
      else
        setError(
          orderMessages[locale][
            result.error as keyof typeof orderMessages.vi
          ] ?? orderMessages[locale].SERVER_ERROR,
        );
    } catch {
      setError(orderMessages[locale].SERVER_ERROR);
    } finally {
      working.current = false;
      setBusy(false);
      void refresh();
    }
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(vi ? "vi-VN" : "en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <section className={`container ${styles.shell}`}>
      {(order.status === "PENDING" || order.status === "PAID") && (
        <BookingProgress
          locale={locale}
          step={order.status === "PAID" ? 4 : 3}
        />
      )}
      <Link className={styles.back} href={`/${locale}/account/orders`}>
        ← {vi ? "Đơn hàng của tôi" : "My orders"}
      </Link>
      <div className={styles.heading}>
        <div>
          <h1>
            {vi ? "Đơn hàng" : "Order"} {order.code}
          </h1>
          <p className={styles.muted}>{date(order.createdAt)}</p>
        </div>
        <span
          className={`${styles.badge} ${order.status === "PAID" ? styles.paid : ""}`}
        >
          {names[order.status]}
        </span>
      </div>
      <p className={styles.demo}>
        {vi
          ? "GIẢ LẬP — KHÔNG THU TIỀN THẬT. Không nhập thông tin thẻ hoặc ngân hàng."
          : "SIMULATION — NO REAL CHARGE. Do not enter card or banking information."}
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.grid}>
        <article className={styles.panel}>
          <h2>{vi ? order.title : order.titleEn}</h2>
          <p className={styles.muted}>
            {order.cinema} · {order.room} · {date(order.startsAt)} (UTC+7)
          </p>
          <p className={styles.policyText}>
            {policy.age}: <strong>{order.ageRatingCode}</strong> ·{" "}
            {ageExplanation(order.ageRatingCode, locale)}
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{vi ? "Ghế" : "Seat"}</th>
                <th>{vi ? "Loại" : "Type"}</th>
                <th>{vi ? "Giá" : "Price"}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td>
                    {item.type === "VIP" ? "VIP" : vi ? "Thường" : "Standard"}
                  </td>
                  <td>{orderMoney(item.price, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.total}>
            <span>{vi ? "Tổng tiền" : "Total"}</span>
            <strong>{orderMoney(order.total, locale)}</strong>
          </div>
          {order.items.some((i) => i.ticket) && (
            <div className={styles.tickets}>
              <h3>{vi ? "Mã vé đã phát hành" : "Issued ticket codes"}</h3>
              {order.items.map(
                (i) =>
                  i.ticket && (
                    <article className={styles.ticketCard} key={i.id}>
                      <h3>
                        {vi ? "Ghế" : "Seat"} {i.label} · {order.cinema} ·{" "}
                        {order.room}
                      </h3>
                      <p>
                        {vi ? order.title : order.titleEn} ·{" "}
                        {date(order.startsAt)}
                      </p>
                      {order.status === "PAID" &&
                        i.ticket.status !== "CANCELLED" && (
                          <Image
                            src={`/api/tickets/${i.ticket.id}/qr`}
                            width={260}
                            height={260}
                            unoptimized
                            alt={`${vi ? "QR vé ghế" : "Ticket QR for seat"} ${i.label}`}
                            className={styles.qr}
                          />
                        )}
                      <p>
                        {i.label} · <code>{i.ticket.code}</code> ·{" "}
                        {i.ticket.status === "VALID"
                          ? vi
                            ? "Có hiệu lực"
                            : "Valid"
                          : i.ticket.status === "USED"
                            ? vi
                              ? "Đã sử dụng"
                              : "Used"
                            : vi
                              ? "Đã hủy"
                              : "Cancelled"}
                      </p>
                      {i.ticket.usedAt && (
                        <p>
                          {vi ? "Đã sử dụng lúc" : "Used at"}:{" "}
                          {date(i.ticket.usedAt)}
                        </p>
                      )}
                      {order.status === "PAID" &&
                        i.ticket.status !== "CANCELLED" && (
                          <a
                            className="button buttonOutline"
                            href={`/api/tickets/${i.ticket.id}/qr?download=1`}
                            download
                          >
                            {vi ? "Tải QR" : "Download QR"}
                          </a>
                        )}
                    </article>
                  ),
              )}
              <p className={styles.muted}>
                {vi
                  ? "QR chỉ chứa mã vé. Không chia sẻ mã/ảnh QR; người có mã có thể dùng vé. Đây là vé thử nghiệm, không có giá trị vào rạp thật."
                  : "QR contains only the ticket code. Keep codes and QR images private; anyone with a code may use it. These are test tickets, not real cinema admission."}
              </p>
              <button
                className="button buttonOutline"
                onClick={() => window.print()}
              >
                {vi ? "In / lưu vé PDF" : "Print / save tickets as PDF"}
              </button>
            </div>
          )}
          {order.refund && (
            <p className={styles.success}>
              {vi
                ? "Đã hoàn giả lập toàn bộ"
                : "Full simulated refund completed"}
              : {orderMoney(order.refund.amount, locale)} ·{" "}
              {order.refund.reason}
            </p>
          )}
          {order.status === "CANCELLED" && order.cancellationReason && (
            <p className={styles.muted}>
              {vi ? "Lý do" : "Reason"}: {order.cancellationReason}
            </p>
          )}
        </article>
        <aside className={styles.panel}>
          <h2>{vi ? "Thanh toán giả lập" : "Simulated payment"}</h2>
          {order.status === "PENDING" ? (
            <>
              <div className={styles.timer} role="timer">
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
              </div>
              <p className={styles.muted}>
                {vi
                  ? "Hạn giữ ban đầu, không gia hạn khi tạo đơn hoặc thử lại thanh toán."
                  : "The original hold deadline; checkout and retries do not extend it."}
              </p>
              {!order.items.length && (
                <p>
                  {vi
                    ? "Chưa có ghế. Quay lại chọn ghế trước khi thanh toán."
                    : "No seats selected. Return to seat selection before paying."}
                </p>
              )}
              <div className={styles.actions}>
                {!canPurchase && (
                  <p role="status" className={styles.policyText}>
                    {policy.internalText} {policy.existing}
                  </p>
                )}
                {canPurchase && !uncertain && (
                  <fieldset className={styles.confirmation} disabled={busy}>
                    <legend>{policy.title}</legend>
                    <p>
                      <strong>{order.ageRatingCode}</strong> ·{" "}
                      {ageExplanation(order.ageRatingCode, locale)}
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(event) =>
                          setConfirmation((current) => ({
                            version: order.version,
                            age: event.target.checked,
                            policy:
                              current.version === order.version &&
                              current.policy,
                          }))
                        }
                      />{" "}
                      <span>{policy.confirmAge}</span>
                    </label>
                    <ul>
                      {policy.policies.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                    <Link
                      href={`/${locale}/policies`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {policy.details} ↗
                    </Link>
                    <label>
                      <input
                        type="checkbox"
                        checked={policyConfirmed}
                        onChange={(event) =>
                          setConfirmation((current) => ({
                            version: order.version,
                            policy: event.target.checked,
                            age:
                              current.version === order.version && current.age,
                          }))
                        }
                      />{" "}
                      <span>{policy.confirmPolicy}</span>
                    </label>
                    <small>
                      {policy.note} {policy.changed}
                    </small>
                  </fieldset>
                )}
                <div className={styles.paymentTotal}>
                  <span>{vi ? "Tổng thanh toán" : "Payment total"}</span>
                  <strong>{orderMoney(order.total, locale)}</strong>
                </div>
                {uncertain ? (
                  <>
                    <p>
                      {vi
                        ? "Chưa rõ kết quả. Kiểm tra đơn hoặc gửi lại đúng yêu cầu cũ."
                        : "The result is uncertain. Check the order or retry the same request."}
                    </p>
                    <button
                      className="button buttonGold"
                      disabled={busy || !canPurchase}
                      onClick={() => void pay()}
                    >
                      {vi ? "Gửi lại yêu cầu cũ" : "Retry the same request"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button buttonGold"
                      disabled={busy || !canPay}
                      onClick={() => void pay("SUCCESS")}
                    >
                      {vi
                        ? "Giả lập thanh toán thành công"
                        : "Simulate successful payment"}
                    </button>
                    <button
                      className="button buttonOutline"
                      disabled={busy || !canPay}
                      onClick={() => void pay("FAILED")}
                    >
                      {vi
                        ? "Giả lập thanh toán thất bại"
                        : "Simulate failed payment"}
                    </button>
                    {canPurchase && (
                      <Link
                        className="button buttonOutline"
                        href={`/${locale}/showtimes/${order.showtimeId}/seats`}
                      >
                        {vi ? "Quay lại sửa ghế" : "Edit seats"}
                      </Link>
                    )}
                    <button
                      className="button buttonOutline"
                      disabled={busy}
                      onClick={() => void cancel()}
                    >
                      {vi
                        ? "Hủy đơn và bỏ giữ ghế"
                        : "Cancel order and release seats"}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <p
              className={
                order.status === "PAID" ? styles.success : styles.muted
              }
            >
              {order.status === "PAID"
                ? vi
                  ? "Đã ghi nhận thanh toán giả lập và bán ghế. Đơn không bị hết hạn theo đồng hồ giữ ghế nữa."
                  : "Simulated payment and seat sale confirmed. The hold deadline no longer expires this order."
                : vi
                  ? "Đơn đã kết thúc. Chọn suất và giữ ghế lại để tạo đơn mới."
                  : "This order has ended. Select a session and hold seats again to create a new order."}
            </p>
          )}
          <button
            className={`button buttonOutline ${styles.refresh}`}
            disabled={busy}
            onClick={() => void refresh()}
          >
            {vi ? "Kiểm tra trạng thái đơn" : "Check order status"}
          </button>
        </aside>
      </div>
      <article className={styles.panel} style={{ marginTop: 24 }}>
        <h2>{vi ? "Lịch sử thanh toán" : "Payment history"}</h2>
        {!order.attempts.length && (
          <p className={styles.muted}>
            {vi ? "Chưa có lần thanh toán nào." : "No payment attempts yet."}
          </p>
        )}
        {order.attempts.map((a) => (
          <div key={a.id}>
            <div className={styles.attempt}>
              <span>{date(a.createdAt)}</span>
              <strong>
                {a.outcome === "SUCCESS"
                  ? vi
                    ? "Thành công (giả lập)"
                    : "Success (simulation)"
                  : vi
                    ? "Thất bại (giả lập)"
                    : "Failed (simulation)"}
              </strong>
              <span>{orderMoney(a.amount, locale)}</span>
            </div>
            <p className={styles.confirmationRecord}>
              {a.confirmedAt
                ? `${policy.recorded} · ${date(a.confirmedAt)}`
                : policy.legacy}
            </p>
          </div>
        ))}
      </article>
    </section>
  );
}
