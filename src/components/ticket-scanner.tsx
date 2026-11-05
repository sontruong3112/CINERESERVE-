"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";
import {
  parseTicketCode,
  ticketMessages,
  type Inspection,
} from "@/lib/tickets/shared";
import { QrReader } from "./qr-reader";
import styles from "./ticket-scanner.module.css";
export function TicketScanner({
  locale,
  cinema,
}: {
  locale: Locale;
  cinema: string;
}) {
  const vi = locale === "vi",
    [code, setCode] = useState(""),
    [ticket, setTicket] = useState<Inspection | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const working = useRef(false),
    pending = useRef<{ code: string; requestKey: string } | null>(null);
  const message = (key: string) =>
    ticketMessages[locale][key as keyof typeof ticketMessages.vi] ??
    ticketMessages[locale].SERVER_ERROR;
  async function inspect(raw = code) {
    if (working.current || uncertain) return;
    setSuccess(false);
    setTicket(null);
    setError("");
    const value = parseTicketCode(raw);
    if (!value) {
      setError(message("INVALID_CODE"));
      return;
    }
    setCode(value);
    working.current = true;
    setBusy(true);
    pending.current = null;
    try {
      const response = await fetch("/api/staff/tickets/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const result = await response.json();
      if (response.ok) setTicket(result.ticket);
      else setError(message(result.error));
    } catch {
      setError(message("SERVER_ERROR"));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function confirm() {
    if (working.current || (!ticket?.canRedeem && !uncertain)) return;
    if (!pending.current) {
      if (!ticket) return;
      pending.current = { code: ticket.code, requestKey: crypto.randomUUID() };
    }
    working.current = true;
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      const response = await fetch("/api/staff/tickets/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const result = await response.json();
      if (response.ok) {
        setTicket(result.ticket);
        setSuccess(true);
        pending.current = null;
        setUncertain(false);
      } else {
        setError(message(result.error));
        if (response.status >= 500) setUncertain(true);
        else {
          pending.current = null;
          setUncertain(false);
          setTicket(null);
        }
      }
    } catch {
      setUncertain(true);
      setError(message("SERVER_ERROR"));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(vi ? "vi-VN" : "en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  function submit(e: FormEvent) {
    e.preventDefault();
    void inspect();
  }
  return (
    <section className={`container ${styles.shell}`}>
      <p className="eyebrow">CINERESERVE ADMISSION</p>
      <h1>{vi ? "Quét và kiểm tra vé" : "Scan and check tickets"}</h1>
      <p className={styles.muted}>
        {cinema} ·{" "}
        {vi
          ? "Chỉ kiểm tra vé thuộc chi nhánh được phân công. Cần kết nối mạng."
          : "Only your assigned cinema is allowed. An online connection is required."}
      </p>
      <div className={styles.layout}>
        <article className={styles.panel}>
          <h2>{vi ? "1. Đọc vé" : "1. Read ticket"}</h2>
          <form onSubmit={submit} className={styles.form}>
            <label>
              {vi ? "Mã vé" : "Ticket code"}
              <input
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                maxLength={100}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setTicket(null);
                  setSuccess(false);
                  setError("");
                  pending.current = null;
                }}
                disabled={busy || uncertain}
                placeholder="TK-…"
              />
            </label>
            <button
              type="submit"
              className="button buttonGold"
              disabled={busy || uncertain}
            >
              {busy
                ? vi
                  ? "Đang xử lý…"
                  : "Working…"
                : vi
                  ? "Kiểm tra vé"
                  : "Inspect ticket"}
            </button>
          </form>
          <QrReader
            locale={locale}
            onStart={() => {
              setTicket(null);
              setSuccess(false);
              setError("");
            }}
            disabled={busy || uncertain}
            onRead={(value) => void inspect(value)}
          />
        </article>
        <article className={styles.panel}>
          <h2>{vi ? "2. Kiểm tra và xác nhận" : "2. Review and confirm"}</h2>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {success && (
            <p role="status" className={styles.success}>
              {vi
                ? "Đã xác nhận sử dụng vé. Chỉ cho khách vào một lần."
                : "Admission confirmed. Admit this ticket only once."}
            </p>
          )}
          {!ticket && !error && (
            <p className={styles.muted}>
              {vi
                ? "Nhập mã hoặc quét QR để xem phim, phòng, ghế và thời gian cho phép."
                : "Enter or scan a code to review movie, room, seat and admission times."}
            </p>
          )}
          {ticket && (
            <>
              {!success && (
                <p
                  className={ticket.canRedeem ? styles.success : styles.warning}
                >
                  {message(ticket.reason)}
                </p>
              )}
              <h3>{vi ? ticket.title : ticket.titleEn}</h3>
              <dl className={styles.details}>
                <div>
                  <dt>{vi ? "Đơn" : "Order"}</dt>
                  <dd>{ticket.orderCode}</dd>
                </div>
                <div>
                  <dt>{vi ? "Rạp / phòng" : "Cinema / room"}</dt>
                  <dd>
                    {ticket.cinema} · {ticket.room}
                  </dd>
                </div>
                <div>
                  <dt>{vi ? "Ghế" : "Seat"}</dt>
                  <dd className={styles.seat}>{ticket.seat}</dd>
                </div>
                <div>
                  <dt>{vi ? "Bắt đầu" : "Starts"}</dt>
                  <dd>{date(ticket.startsAt)}</dd>
                </div>
                <div>
                  <dt>{vi ? "Được vào từ" : "Admission opens"}</dt>
                  <dd>{date(ticket.entryOpensAt)}</dd>
                </div>
                <div>
                  <dt>{vi ? "Ngừng nhận khi" : "Admission closes"}</dt>
                  <dd>{date(ticket.endsAt)}</dd>
                </div>
                {ticket.usedAt && (
                  <div>
                    <dt>{vi ? "Đã sử dụng lúc" : "Used at"}</dt>
                    <dd>{date(ticket.usedAt)}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
          {uncertain && (
            <p className={styles.warning}>
              {vi
                ? "Chưa rõ kết quả. Gửi lại cùng yêu cầu để xác nhận, không quét vé khác trong lúc này."
                : "The result is uncertain. Retry the same confirmation before reading another ticket."}
            </p>
          )}
          <button
            className="button buttonGold"
            disabled={busy || (!ticket?.canRedeem && !uncertain)}
            onClick={() => void confirm()}
          >
            {uncertain
              ? vi
                ? "Gửi lại xác nhận cũ"
                : "Retry same confirmation"
              : vi
                ? "Xác nhận sử dụng"
                : "Confirm admission"}
          </button>
          <p className={styles.muted}>
            {vi
              ? "Xác nhận sẽ đánh dấu vé đã dùng. Không hỗ trợ hoàn tác; kiểm tra đúng phim, phòng và ghế trước khi bấm."
              : "Confirmation marks the ticket as used. There is no undo; verify the movie, room and seat first."}
          </p>
        </article>
      </div>
    </section>
  );
}
