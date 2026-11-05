"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { genreNames } from "@/lib/catalogue";
import { messages, movieStatuses, type AdminMovie } from "@/lib/admin/shared";
import styles from "./admin.module.css";

export function MovieManager({
  items,
  locale,
}: {
  items: AdminMovie[];
  locale: Locale;
}) {
  const vi = locale === "vi",
    router = useRouter();
  const [editing, setEditing] = useState<AdminMovie | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const statusNames = vi
    ? {
        DRAFT: "Nháp",
        NOW_SHOWING: "Đang chiếu",
        COMING_SOON: "Sắp chiếu",
        ARCHIVED: "Lưu trữ",
      }
    : {
        DRAFT: "Draft",
        NOW_SHOWING: "Now showing",
        COMING_SOON: "Coming soon",
        ARCHIVED: "Archived",
      };
  function start(movie: AdminMovie | null) {
    setEditing(movie);
    setError("");
    setSuccess(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(body: Record<string, unknown>, id?: string) {
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      const response = await fetch(`/api/admin/movies${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          messages[locale][result.error as keyof typeof messages.vi] ??
            messages[locale].SERVER_ERROR,
        );
        return;
      }
      setEditing(undefined);
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
    const body: Record<string, unknown> = {
      ...Object.fromEntries(form),
      genres: form.getAll("genres"),
      version: editing?.version,
    };
    for (const name of ["durationMinutes", "year"])
      body[name] = Number(form.get(name));
    void save(body, editing?.id);
  }
  const field = (
    name: keyof AdminMovie,
    label: string,
    type = "text",
    required = true,
    maxLength = 180,
  ) => (
    <label key={name}>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={
          editing
            ? String(editing[name] ?? "")
            : name === "year"
              ? String(new Date().getFullYear())
              : name === "accent"
                ? "#edc076"
                : ""
        }
        required={required}
        maxLength={maxLength}
        {...(name === "durationMinutes"
          ? { min: 1, max: 360 }
          : name === "year"
            ? { min: 1888, max: 2100 }
            : {})}
      />
    </label>
  );
  return (
    <>
      <div className={styles.title}>
        <div>
          <h1>{vi ? "Quản lý phim" : "Movie catalogue"}</h1>
          <p>
            {vi
              ? "Quản lý nội dung Việt–Anh. Phim nháp/lưu trữ không xuất hiện ở khu vực khách. Không xóa lịch sử khi lưu trữ."
              : "Manage Vietnamese/English content. Draft and archived movies are hidden from customers; history is preserved."}
          </p>
        </div>
        <button
          type="button"
          className="button buttonGold"
          onClick={() => start(null)}
        >
          {vi ? "+ Thêm phim" : "+ Add movie"}
        </button>
      </div>
      {success && (
        <p role="status" className={styles.success}>
          {vi
            ? "Đã lưu phim. Danh sách đang được cập nhật."
            : "Movie saved. Refreshing the list."}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {editing !== undefined && (
        <section className={styles.editor}>
          <h2>
            {editing
              ? vi
                ? "Sửa phim"
                : "Edit movie"
              : vi
                ? "Thêm phim"
                : "New movie"}
          </h2>
          <p className={styles.muted}>
            {vi
              ? "Tên/mô tả tiếng Việt bắt buộc. Tiếng Anh để trống cả hai trường để dùng nội dung dự phòng. Ảnh dùng đường dẫn HTTPS hoặc file nội bộ /brand/…; chưa hỗ trợ tải file."
              : "Vietnamese content is required. Leave both English fields empty for fallback. Use HTTPS or an internal image path; file upload is not available."}
          </p>
          <form
            key={editing?.id ?? "new"}
            className={styles.form}
            onSubmit={submit}
          >
            <fieldset disabled={busy}>
              {field("titleVi", vi ? "Tên phim (VI)" : "Title (VI)")}
              {field(
                "titleEn",
                vi ? "Tên phim (EN)" : "Title (EN)",
                "text",
                false,
              )}
              {field("originalTitle", vi ? "Tên gốc" : "Original title")}
              {field(
                "slug",
                vi ? "Đường dẫn (vd: ten-phim)" : "Slug (e.g. movie-title)",
                "text",
                true,
                100,
              )}
              <label className={styles.full}>
                {vi ? "Nội dung (VI)" : "Synopsis (VI)"}
                <textarea
                  name="synopsisVi"
                  minLength={10}
                  maxLength={5000}
                  required
                  defaultValue={editing?.synopsisVi}
                />
              </label>
              <label className={styles.full}>
                {vi ? "Nội dung (EN)" : "Synopsis (EN)"}
                <textarea
                  name="synopsisEn"
                  maxLength={5000}
                  defaultValue={editing?.synopsisEn}
                />
              </label>
              {field("director", vi ? "Đạo diễn" : "Director")}
              {field(
                "durationMinutes",
                vi ? "Thời lượng (phút)" : "Duration (minutes)",
                "number",
              )}
              {field("year", vi ? "Năm phát hành" : "Release year", "number")}
              {field(
                "releaseDate",
                vi
                  ? "Ngày phát hành (không bắt buộc)"
                  : "Release date (optional)",
                "date",
                false,
              )}
              <label>
                {vi ? "Phân loại tuổi" : "Age rating"}
                <select
                  name="ageRatingCode"
                  defaultValue={editing?.ageRatingCode ?? "P"}
                >
                  {["P", "K", "T13", "T16", "T18"].map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
              </label>
              <label>
                {vi ? "Trạng thái" : "Status"}
                <select name="status" defaultValue={editing?.status ?? "DRAFT"}>
                  {movieStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusNames[status]}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.full}>
                <p>
                  {vi
                    ? "Thể loại (chọn ít nhất một)"
                    : "Genres (select at least one)"}
                </p>
                <div className={styles.genres}>
                  {Object.entries(genreNames).map(([code, names]) => (
                    <label key={code}>
                      <input
                        type="checkbox"
                        name="genres"
                        value={code}
                        defaultChecked={editing?.genres.includes(code)}
                      />
                      {names[locale]}
                    </label>
                  ))}
                </div>
              </div>
              {field(
                "posterUrl",
                vi ? "Đường dẫn poster" : "Poster URL",
                "text",
                true,
                1500,
              )}
              {field(
                "backdropUrl",
                vi ? "Đường dẫn ảnh nền" : "Backdrop URL",
                "text",
                true,
                1500,
              )}
              {field(
                "accent",
                vi ? "Màu điểm nhấn (#hex)" : "Accent colour (#hex)",
              )}
              <div className={`${styles.actions} ${styles.full}`}>
                <button type="submit" className="button buttonGold">
                  {busy
                    ? vi
                      ? "Đang lưu…"
                      : "Saving…"
                    : vi
                      ? "Lưu phim"
                      : "Save movie"}
                </button>
                <button type="button" onClick={() => setEditing(undefined)}>
                  {vi ? "Đóng biểu mẫu" : "Close editor"}
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
              <th>{vi ? "Phim" : "Movie"}</th>
              <th>{vi ? "Thời lượng" : "Duration"}</th>
              <th>{vi ? "Trạng thái" : "Status"}</th>
              <th>{vi ? "Thao tác" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((movie) => (
              <tr key={movie.id}>
                <td>
                  <strong>
                    {locale === "en"
                      ? movie.titleEn || movie.originalTitle
                      : movie.titleVi}
                  </strong>
                  <div className={styles.muted}>
                    {movie.slug} · {movie.ageRatingCode}
                  </div>
                </td>
                <td>
                  {movie.durationMinutes} {vi ? "phút" : "min"}
                </td>
                <td>
                  <span
                    className={`${styles.badge} ${movie.status === "NOW_SHOWING" ? styles.live : movie.status === "ARCHIVED" ? styles.archived : ""}`}
                  >
                    {statusNames[movie.status]}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button disabled={busy} onClick={() => start(movie)}>
                      {vi ? "Sửa" : "Edit"}
                    </button>
                    {movie.status !== "ARCHIVED" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              vi
                                ? `Lưu trữ “${movie.titleVi}”? Phim sẽ ẩn với khách nhưng giữ lịch sử.`
                                : `Archive “${movie.originalTitle}”? History will be preserved.`,
                            )
                          )
                            void save(
                              { ...movie, status: "ARCHIVED" },
                              movie.id,
                            );
                        }}
                      >
                        {vi ? "Lưu trữ" : "Archive"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <p style={{ padding: 20 }}>
            {vi ? "Không có phim phù hợp." : "No matching movies."}
          </p>
        )}
      </div>
    </>
  );
}
