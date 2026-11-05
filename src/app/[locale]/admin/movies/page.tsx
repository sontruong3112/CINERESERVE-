import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { movieList } from "@/lib/admin/service";
import { movieStatuses } from "@/lib/admin/shared";
import { queryValue, type QueryParams } from "@/lib/query";
import { MovieManager } from "@/components/admin/movie-manager";
import { Pagination } from "@/components/admin/pagination";
import styles from "@/components/admin/admin.module.css";
export default async function MoviesAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin/movies", ["ADMIN"]);
  const raw = await searchParams;
  const query = {
    q: queryValue(raw.q),
    status: queryValue(raw.status),
    page: queryValue(raw.page),
  };
  const list = await movieList(query);
  const names =
    locale === "vi"
      ? ["Nháp", "Đang chiếu", "Sắp chiếu", "Lưu trữ"]
      : ["Draft", "Now showing", "Coming soon", "Archived"];
  return (
    <>
      <form key={JSON.stringify(query)} className={styles.filters} method="get">
        <label>
          {locale === "vi" ? "Tên phim" : "Movie title"}
          <input name="q" defaultValue={query.q} maxLength={100} />
        </label>
        <label>
          {locale === "vi" ? "Trạng thái" : "Status"}
          <select name="status" defaultValue={query.status}>
            <option value="">{locale === "vi" ? "Tất cả" : "All"}</option>
            {movieStatuses.map((s, i) => (
              <option key={s} value={s}>
                {names[i]}
              </option>
            ))}
          </select>
        </label>
        <button className="button buttonOutline" type="submit">
          {locale === "vi" ? "Lọc phim" : "Filter"}
        </button>
      </form>
      <MovieManager items={list.items} locale={locale} />
      <Pagination
        base={`/${locale}/admin/movies`}
        query={{ q: query.q, status: query.status }}
        {...list}
        locale={locale}
      />
    </>
  );
}
