"use client";
import { BookingProgress } from "./booking-progress";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { holdMessages, type SeatMap } from "@/lib/booking/shared";
import { money } from "@/lib/catalogue";
import styles from "./seat-picker.module.css";
import { orderMessages } from "@/lib/booking/orders-shared";
import { ageExplanation, checkoutCopy } from "@/lib/booking/checkout-policy";
import { bookingQuery } from "@/lib/schedule";

export function SeatPicker({
  initial,
  locale,
}: {
  initial: SeatMap;
  locale: Locale;
}) {
  const vi = locale === "vi",
    router = useRouter();
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState<string[]>(
      initial.hold?.showtimeId === initial.showtime.id
        ? initial.hold.seatIds
        : [],
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [clock, setClock] = useState(Date.parse(initial.serverNow));
  const busyRef = useRef(false),
    current = useRef(initial),
    alive = useRef(true);
  const endpoint = `/api/showtimes/${initial.showtime.id}/seats`;
  const apply = useCallback((next: SeatMap) => {
    const old = current.current;
    if (Date.parse(next.serverNow) < Date.parse(old.serverNow)) return;
    current.current = next;
    setData(next);
    setClock(Date.parse(next.serverNow));
    if (
      old.hold?.id !== next.hold?.id ||
      old.hold?.version !== next.hold?.version
    )
      setSelected(
        next.hold?.showtimeId === next.showtime.id ? next.hold.seatIds : [],
      );
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!alive.current || busyRef.current) return;
      if (response.status === 401) {
        router.replace(
          `/${locale}/login?next=${encodeURIComponent(`/${locale}/showtimes/${initial.showtime.id}/seats`)}`,
        );
        return;
      }
      if (response.ok) apply(await response.json());
      else setError(holdMessages[locale].SERVER_ERROR);
    } catch {
      if (alive.current) setError(holdMessages[locale].SERVER_ERROR);
    }
  }, [apply, endpoint, initial.showtime.id, locale, router]);
  useEffect(() => {
    alive.current = true;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !busyRef.current)
        void refresh();
    }, 5000);
    const focus = () => {
      if (!busyRef.current) void refresh();
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
      server = Date.parse(data.serverNow);
    const tick = () => setClock(server + performance.now() - start);
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [data.serverNow]);
  const own = data.hold?.showtimeId === data.showtime.id ? data.hold : null;
  const other = data.hold && !own ? data.hold : null;
  const remaining = own
    ? Math.max(0, Math.ceil((Date.parse(own.expiresAt) - clock) / 1000))
    : 0;
  const open = data.showtime.open && clock < Date.parse(data.showtime.cutoffAt);
  const expiryRequested = useRef("");
  useEffect(() => {
    if (own && remaining === 0 && expiryRequested.current !== own.id) {
      expiryRequested.current = own.id;
      void refresh();
    }
  }, [own, remaining, refresh]);
  const price = own?.basePrice ?? data.showtime.basePrice,
    surcharge = own?.vipSurcharge ?? data.showtime.vipSurcharge;
  const chosen = data.seats.filter((s) => selected.includes(s.id));
  const total = chosen.reduce(
    (sum, s) => sum + price + (s.type === "VIP" ? surcharge : 0),
    0,
  );
  const changed =
    [...selected].sort().join(",") !==
    [...(own?.seatIds ?? [])].sort().join(",");
  async function checkout() {
    if (!own || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId: own.id, version: own.version }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          orderMessages[locale][
            result.error as keyof typeof orderMessages.vi
          ] ?? orderMessages[locale].SERVER_ERROR,
        );
        return;
      }
      router.push(`/${locale}/account/orders/${result.order.id}`);
    } catch {
      setError(orderMessages[locale].SERVER_ERROR);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function save(release = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: release ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatIds: selected,
          holdId: own?.id ?? null,
          version: own?.version ?? null,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        apply(result);
        setNotice(
          release
            ? vi
              ? "Đã bỏ giữ ghế."
              : "Your hold was released."
            : vi
              ? "Đã xác nhận giữ ghế. Hạn giữ không được gia hạn khi đổi ghế."
              : "Your seats are held. Changing seats does not extend the deadline.",
        );
      } else {
        setError(
          holdMessages[locale][result.error as keyof typeof holdMessages.vi] ??
            holdMessages[locale].SERVER_ERROR,
        );
        if (response.status === 401)
          router.replace(
            `/${locale}/login?next=${encodeURIComponent(`/${locale}/showtimes/${data.showtime.id}/seats`)}`,
          );
      }
    } catch {
      setError(holdMessages[locale].SERVER_ERROR);
    } finally {
      busyRef.current = false;
      setBusy(false);
      void refresh();
    }
  }
  const time = new Intl.DateTimeFormat(vi ? "vi-VN" : "en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(data.showtime.startsAt));
  const rows = [...new Set(data.seats.map((s) => s.row))];
  return (
    <section className={`container ${styles.shell}`}>
      <BookingProgress locale={locale} step={2} />
      <Link
        className={styles.back}
        href={`/${locale}/movies/${data.showtime.slug}${bookingQuery(data.showtime.cinemaCode, new Date(data.showtime.startsAt).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }))}#showtimes`}
      >
        ← {vi ? "Đổi suất chiếu" : "Choose another session"}
      </Link>
      <h1>{vi ? data.showtime.title : data.showtime.titleEn}</h1>
      <p className={styles.meta}>
        {data.showtime.cinema} · {data.showtime.room} · {time} (UTC+7)
      </p>
      {other && (
        <p className={styles.alert}>
          {vi
            ? "Bạn đang giữ ghế ở một suất khác."
            : "You have a hold for another session."}{" "}
          <Link href={`/${locale}/showtimes/${other.showtimeId}/seats`}>
            {vi
              ? "Quay lại phiên giữ để tiếp tục hoặc bỏ giữ →"
              : "Return to your hold to continue or release it →"}
          </Link>
        </p>
      )}
      {!open && (
        <p className={styles.alert}>
          {vi
            ? "Suất đã ngừng bán hoặc không còn hoạt động. Bạn có thể chọn suất khác."
            : "This session is no longer available. Choose another session."}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.alert}>
          {error}{" "}
          <button onClick={() => void refresh()}>
            {vi ? "Tải lại ghế" : "Refresh seats"}
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      <div className={styles.layout}>
        <div className={styles.map}>
          <div className={styles.screen}>{vi ? "MÀN HÌNH" : "SCREEN"}</div>
          <p className={styles.hint}>
            {vi
              ? "Chọn 1–8 ghế, sau đó bấm giữ ghế. Chỉ khi có xác nhận thành công, ghế mới được giữ cho bạn."
              : "Select 1–8 seats, then confirm your hold. Seats are reserved only after a successful confirmation."}
          </p>
          <p className={styles.swipeHint}>
            {vi
              ? "Vuốt ngang sơ đồ để xem các ghế bên cạnh."
              : "Swipe the seating chart sideways to see more seats."}
          </p>
          <div
            className={styles.scroll}
            tabIndex={0}
            role="region"
            aria-label={
              vi
                ? "Sơ đồ ghế, có thể cuộn ngang"
                : "Seating chart, scroll horizontally"
            }
          >
            <div className={styles.rows}>
              {rows.map((row) => (
                <div key={row} className={styles.row}>
                  <span className={styles.rowLabel}>{row}</span>
                  {data.seats
                    .filter((s) => s.row === row)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={selected.includes(s.id)}
                        aria-label={`${s.row}${s.number} · ${s.type} · ${s.status}`}
                        title={`${s.row}${s.number} · ${money(price + (s.type === "VIP" ? surcharge : 0), locale)}`}
                        disabled={
                          busy ||
                          !open ||
                          Boolean(other) ||
                          Boolean(own && remaining === 0) ||
                          s.status === "BLOCKED" ||
                          s.status === "HELD" ||
                          s.status === "SOLD"
                        }
                        className={`${styles.seat} ${s.type === "VIP" ? styles.vip : ""} ${s.status === "MINE" ? styles.mine : ""} ${selected.includes(s.id) ? styles.selected : ""}`}
                        onClick={() => {
                          setError("");
                          setNotice("");
                          setSelected((previous) =>
                            previous.includes(s.id)
                              ? previous.filter((id) => id !== s.id)
                              : previous.length < 8
                                ? [...previous, s.id]
                                : previous,
                          );
                        }}
                      >
                        {s.row}
                        {s.number}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.legend}>
            <span>□ {vi ? "Ghế thường" : "Standard"}</span>
            <span className={styles.vipText}>□ VIP</span>
            <span>
              ■ {vi ? "Màu vàng: bạn đã giữ" : "Gold: your held seats"}
            </span>
            <span>
              ▣ {vi ? "Viền trắng: đang chọn" : "White border: selection"}
            </span>
            <span className={styles.disabledText}>
              ■ {vi ? "Mờ: không khả dụng" : "Dimmed: unavailable"}
            </span>
          </div>
        </div>
        <aside className={styles.summary} id="seat-summary">
          <p className="eyebrow">
            {vi ? "LỰA CHỌN CỦA BẠN" : "YOUR SELECTION"}
          </p>
          <h2>{vi ? "Chọn ghế" : "Choose seats"}</h2>
          <p className={styles.hint}>
            {checkoutCopy[locale].age}:{" "}
            <strong>{data.showtime.ageRatingCode}</strong> ·{" "}
            {ageExplanation(data.showtime.ageRatingCode, locale)}
          </p>
          <div
            className={styles.timer}
            role="timer"
            aria-label={
              vi ? "Thời gian giữ ghế còn lại" : "Hold time remaining"
            }
          >
            {own
              ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
              : "05:00"}
          </div>
          <p className={styles.hint}>
            {own
              ? remaining
                ? vi
                  ? "Thời gian còn lại. Tải lại hoặc đổi ghế không gia hạn."
                  : "Time remaining. Refreshing or changing seats does not extend it."
                : vi
                  ? "Phiên đã hết hạn. Đang kiểm tra lại ghế…"
                  : "Hold expired. Refreshing availability…"
              : vi
                ? "Tối đa 5 phút kể từ lần giữ đầu tiên, có thể ngắn hơn nếu gần giờ ngừng bán."
                : "Up to 5 minutes from your first hold, shortened by the sales cutoff."}
          </p>
          <dl>
            <div>
              <dt>{vi ? "Ghế đang chọn" : "Selected seats"}</dt>
              <dd>
                {chosen.map((s) => `${s.row}${s.number}`).join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt>{vi ? "Ghế đã giữ" : "Held seats"}</dt>
              <dd>
                {data.seats
                  .filter((s) => s.status === "MINE")
                  .map((s) => `${s.row}${s.number}`)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt>{vi ? "Giá thường" : "Standard"}</dt>
              <dd>{money(price, locale)}</dd>
            </div>
            <div>
              <dt>{vi ? "Phụ thu VIP" : "VIP surcharge"}</dt>
              <dd>+{money(surcharge, locale)}</dd>
            </div>
            <div className={styles.total}>
              <dt>{vi ? "Tạm tính" : "Subtotal"}</dt>
              <dd>{money(total, locale)}</dd>
            </div>
          </dl>
          <button
            className="button buttonGold"
            disabled={
              busy ||
              !open ||
              Boolean(other) ||
              Boolean(own && remaining === 0) ||
              (!own && !selected.length) ||
              !changed
            }
            onClick={() => void save()}
          >
            {busy
              ? vi
                ? "Đang xử lý…"
                : "Working…"
              : own
                ? vi
                  ? "Cập nhật ghế đã giữ"
                  : "Update held seats"
                : vi
                  ? "Giữ ghế trong 5 phút"
                  : "Hold seats for 5 minutes"}
          </button>
          {own && (
            <button
              className="button buttonGold"
              disabled={
                busy ||
                !open ||
                remaining === 0 ||
                !own.seatIds.length ||
                changed
              }
              onClick={() => void checkout()}
            >
              {vi ? "Tiếp tục đến thanh toán" : "Continue to checkout"}
            </button>
          )}
          {own && (
            <button
              className="button buttonOutline"
              disabled={busy}
              onClick={() => void save(true)}
            >
              {vi ? "Bỏ giữ toàn bộ ghế" : "Release hold"}
            </button>
          )}
          <p className={styles.hint}>
            {vi
              ? "Thanh toán ở bước tiếp theo là giả lập, không thu tiền thật. Chuyển sang thanh toán không gia hạn giữ ghế."
              : "Checkout uses simulated payments; no real money is collected. Proceeding does not extend your hold."}
          </p>
        </aside>
      </div>
      <div
        className={styles.mobileSelection}
        aria-label={vi ? "Tóm tắt ghế đang chọn" : "Seat selection summary"}
      >
        <div>
          <span>
            {selected.length} {vi ? "ghế đang chọn" : "selected seats"}
          </span>
          <strong>{money(total, locale)}</strong>
        </div>
        <a className="button buttonGold" href="#seat-summary">
          {vi ? "Xem lựa chọn" : "Review seats"} ↓
        </a>
      </div>
    </section>
  );
}
