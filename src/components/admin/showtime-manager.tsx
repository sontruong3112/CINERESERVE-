"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import {
  localDateTime,
  messages,
  type AdminShowtime,
} from "@/lib/admin/shared";
import styles from "./admin.module.css";

type Options = {
  movies: { id: string; title: string; duration: number }[];
  rooms: {
    id: string;
    name: string;
    cinema: string;
    cinemaCode: string;
    opens: number;
    closes: number;
  }[];
};
export function ShowtimeManager({
  items,
  locale,
  options,
  date,
}: {
  items: AdminShowtime[];
  locale: Locale;
  options: Options;
  date: string;
}) {
  const vi = locale === "vi",
    router = useRouter();
  const [editing, setEditing] = useState<AdminShowtime | null | undefined>();
  const [cancelling, setCancelling] = useState<AdminShowtime>();
  const [movieId, setMovieId] = useState("");
  const [starts, setStarts] = useState(`${date}T10:00`);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  const names = vi
    ? { DRAFT: "Nháp", ON_SALE: "Đang mở bán", CANCELLED: "Đã hủy" }
    : { DRAFT: "Draft", ON_SALE: "On sale", CANCELLED: "Cancelled" };
  function start(item: AdminShowtime | null) {
    setEditing(item);
    setCancelling(undefined);
    setMovieId(item?.movieId ?? options.movies[0]?.id ?? "");
    setStarts(item ? localDateTime(item.startsAt) : `${date}T10:00`);
    setError("");
    setSuccess(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(body: Record<string, unknown>, id?: string) {
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      const response = await fetch(
        `/api/admin/showtimes${id ? `/${id}` : ""}`,
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(
          messages[locale][result.error as keyof typeof messages.vi] ??
            messages[locale].SERVER_ERROR,
        );
        return;
      }
      setEditing(undefined);
      setCancelling(undefined);
      setSuccess(true);
      router.refresh();
    } catch {
      setError(messages[locale].SERVER_ERROR);
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(
      {
        ...Object.fromEntries(form),
        basePrice: Number(form.get("basePrice")),
        vipSurcharge: Number(form.get("vipSurcharge")),
        version: editing?.version,
      },
      editing?.id,
    );
  }
  const duration = options.movies.find((m) => m.id === movieId)?.duration ?? 0;
  const previewStart = new Date(`${starts}:00+07:00`);
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  const hours = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return (
    <>
      <div className={styles.title}>
        <div>
          <h1>{vi ? "Quản lý lịch chiếu" : "Showtime management"}</h1>
          <p>
            {vi
              ? "Tạo nháp → kiểm tra → mở bán. Mọi giờ hiển thị theo giờ Việt Nam (UTC+7). Phòng được giữ thêm 20 phút dọn sau khi phim kết thúc."
              : "Create a draft → review → publish. All times use Vietnam time (UTC+7), with 20 minutes of cleaning after each movie."}
          </p>
        </div>
        <button className="button buttonGold" onClick={() => start(null)}>
          {vi ? "+ Thêm suất chiếu" : "+ Add showtime"}
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" className={styles.success}>
          {vi ? "Đã lưu thay đổi." : "Changes saved."}
        </p>
      )}
      {editing !== undefined && (
        <section className={styles.editor}>
          <h2>
            {editing
              ? vi
                ? "Sửa suất chiếu"
                : "Edit showtime"
              : vi
                ? "Thêm suất nháp"
                : "New draft showtime"}
          </h2>
          <form
            className={styles.form}
            key={editing?.id ?? "new"}
            onSubmit={submit}
          >
            <fieldset disabled={busy}>
              <label>
                {vi ? "Phim" : "Movie"}
                <select
                  name="movieId"
                  required
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                >
                  {!options.movies.length && <option value="">—</option>}
                  {options.movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} · {m.duration} {vi ? "phút" : "min"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {vi ? "Rạp / phòng" : "Cinema / auditorium"}
                <select
                  name="auditoriumId"
                  required
                  defaultValue={editing?.auditoriumId ?? ""}
                >
                  <option value="" disabled>
                    {vi ? "Chọn phòng" : "Choose auditorium"}
                  </option>
                  {options.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.cinema} · {r.name} ({hours(r.opens)}–{hours(r.closes)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {vi ? "Bắt đầu (giờ Việt Nam)" : "Start (Vietnam time)"}
                <input
                  name="startsAtLocal"
                  type="datetime-local"
                  required
                  value={starts}
                  onChange={(e) => setStarts(e.target.value)}
                />
              </label>
              <label>
                {vi ? "Giá ghế thường (VND)" : "Standard seat price (VND)"}
                <input
                  name="basePrice"
                  type="number"
                  min={1000}
                  max={10000000}
                  step={1000}
                  required
                  defaultValue={editing?.basePrice ?? 90000}
                />
              </label>
              <label>
                {vi ? "Phụ thu VIP (VND)" : "VIP surcharge (VND)"}
                <input
                  name="vipSurcharge"
                  type="number"
                  min={0}
                  max={10000000}
                  step={1000}
                  required
                  defaultValue={editing?.vipSurcharge ?? 20000}
                />
              </label>
              <div className={`${styles.preview} ${styles.full}`}>
                {!Number.isNaN(previewStart.getTime()) && duration > 0 ? (
                  <>
                    {vi ? "Dự kiến kết thúc phim" : "Estimated movie end"}:{" "}
                    <strong>
                      {time(
                        new Date(
                          previewStart.getTime() + duration * 60000,
                        ).toISOString(),
                      )}
                    </strong>{" "}
                    · {vi ? "Phòng trống sau dọn" : "Room ready after cleaning"}
                    :{" "}
                    <strong>
                      {time(
                        new Date(
                          previewStart.getTime() + (duration + 20) * 60000,
                        ).toISOString(),
                      )}
                    </strong>
                    <br />
                    {vi
                      ? "Máy chủ sẽ kiểm tra lại thời lượng, giờ hoạt động và lịch trùng khi lưu. Suất nháp cũng chiếm lịch phòng."
                      : "The server rechecks duration, opening hours and overlaps on save. Draft sessions also reserve the auditorium."}
                  </>
                ) : vi ? (
                  "Chọn phim và giờ bắt đầu để xem dự kiến."
                ) : (
                  "Choose a movie and start time for the preview."
                )}
              </div>
              <div className={`${styles.actions} ${styles.full}`}>
                <button
                  type="submit"
                  disabled={!options.movies.length || !options.rooms.length}
                  className="button buttonGold"
                >
                  {busy
                    ? vi
                      ? "Đang lưu…"
                      : "Saving…"
                    : editing
                      ? vi
                        ? "Lưu thay đổi"
                        : "Save changes"
                      : vi
                        ? "Lưu nháp"
                        : "Save draft"}
                </button>
                <button type="button" onClick={() => setEditing(undefined)}>
                  {vi ? "Đóng biểu mẫu" : "Close editor"}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {cancelling && (
        <section className={styles.editor}>
          <h2>
            {vi ? "Hủy suất chiếu" : "Cancel showtime"}: {cancelling.movieTitle}
          </h2>
          <p>
            {cancelling.cinemaName} · {cancelling.roomName} ·{" "}
            {time(cancelling.startsAt)}
          </p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void save(
                {
                  action: "cancel",
                  version: cancelling.version,
                  reason: form.get("reason"),
                },
                cancelling.id,
              );
            }}
          >
            <fieldset disabled={busy}>
              <label className={styles.full}>
                {vi
                  ? "Lý do hủy (bắt buộc, lưu vào nhật ký)"
                  : "Cancellation reason (required, recorded in audit log)"}
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={500}
                />
              </label>
              <div className={`${styles.actions} ${styles.full}`}>
                <button type="submit">
                  {vi ? "Xác nhận hủy suất" : "Confirm cancellation"}
                </button>
                <button type="button" onClick={() => setCancelling(undefined)}>
                  {vi ? "Quay lại" : "Back"}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{vi ? "Phim / phòng" : "Movie / auditorium"}</th>
              <th>{vi ? "Bắt đầu → kết thúc" : "Start → end"}</th>
              <th>{vi ? "Giá / VIP" : "Price / VIP"}</th>
              <th>{vi ? "Trạng thái" : "Status"}</th>
              <th>{vi ? "Thao tác" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.movieTitle}</strong>
                  <div className={styles.muted}>
                    {item.cinemaName} · {item.roomName}
                  </div>
                </td>
                <td>
                  {time(item.startsAt)} → {time(item.endsAt)}
                  <div className={styles.muted}>
                    {vi ? "Dọn đến" : "Cleaning until"}{" "}
                    {time(item.cleanupEndsAt)}
                  </div>
                </td>
                <td>
                  {item.basePrice.toLocaleString("vi-VN")} đ
                  <div className={styles.muted}>
                    +{item.vipSurcharge.toLocaleString("vi-VN")} đ
                  </div>
                </td>
                <td>
                  <span
                    className={`${styles.badge} ${item.status === "ON_SALE" ? styles.live : item.status === "CANCELLED" ? styles.archived : ""}`}
                  >
                    {names[item.status]}
                  </span>
                  {item.cancellationReason && (
                    <div className={styles.muted}>
                      {item.cancellationReason}
                    </div>
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    {item.status !== "CANCELLED" && (
                      <>
                        <button disabled={busy} onClick={() => start(item)}>
                          {vi ? "Sửa" : "Edit"}
                        </button>
                        {item.status === "DRAFT" && (
                          <button
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  vi
                                    ? "Mở bán suất này cho khách?"
                                    : "Publish this session to customers?",
                                )
                              )
                                void save(
                                  { action: "publish", version: item.version },
                                  item.id,
                                );
                            }}
                          >
                            {vi ? "Mở bán" : "Publish"}
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => {
                            setCancelling(item);
                            setEditing(undefined);
                            setError("");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          {vi ? "Hủy suất" : "Cancel"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <p style={{ padding: 20 }}>
            {vi
              ? "Không có suất chiếu trong ngày này."
              : "No sessions on this date."}
          </p>
        )}
      </div>
    </>
  );
}
