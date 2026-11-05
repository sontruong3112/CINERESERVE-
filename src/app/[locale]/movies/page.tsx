import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { copy, isLocale } from "@/lib/i18n";
import { genreNames, type Genre } from "@/lib/catalogue";
import { getCatalogue, getScheduleOptions } from "@/lib/catalogue-repository";
import { searchText, validDay } from "@/lib/schedule";
import { MovieCard } from "@/components/movie-card";
import { queryValue, type QueryParams } from "@/lib/query";
import styles from "../content.module.css";

export const metadata: Metadata = { title: "Phim · Movies" };
export default async function MoviesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = copy[locale];
  const { movies, cinemas } = await getCatalogue();
  const raw = await searchParams;
  const query = {
    q: queryValue(raw.q),
    genre: queryValue(raw.genre),
    status: queryValue(raw.status),
    cinema: queryValue(raw.cinema),
    date: queryValue(raw.date),
  };
  const q = (query.q ?? "").trim().slice(0, 100);
  const selectedCinema = cinemas.find((cinema) => cinema.code === query.cinema);
  const invalid = !!(
    (query.cinema && !selectedCinema) ||
    (query.date && !validDay(query.date)) ||
    (query.status && !["now", "soon"].includes(query.status)) ||
    (query.genre && !Object.hasOwn(genreNames, query.genre))
  );
  const options = query.cinema || query.date ? await getScheduleOptions() : [];
  const filtered = invalid
    ? []
    : movies.filter(
        (movie) =>
          searchText(
            `${movie.title.vi} ${movie.title.en} ${movie.originalTitle}`,
          ).includes(searchText(q)) &&
          (!query.genre || movie.genre.includes(query.genre as Genre)) &&
          (!query.status || movie.status === query.status) &&
          (!(query.cinema || query.date) ||
            options.some(
              (o) =>
                o.movie === movie.slug &&
                (!query.cinema || o.cinema === query.cinema) &&
                (!query.date || o.day === query.date),
            )),
      );
  return (
    <div className="container">
      <div className={styles.intro}>
        <h1>{t.catalogueTitle}</h1>
        <p>{t.catalogueSub}</p>
      </div>
      <form
        key={JSON.stringify(query)}
        className={styles.filters}
        action={`/${locale}/movies`}
        method="get"
      >
        <label>
          {locale === "vi" ? "Tên phim" : "Movie title"}
          <input
            name="q"
            type="search"
            placeholder={t.search}
            defaultValue={q}
            maxLength={100}
          />
        </label>
        <label>
          {t.genre}
          <select name="genre" defaultValue={query.genre ?? ""}>
            <option value="">{t.allGenres}</option>
            {Object.entries(genreNames).map(([key, names]) => (
              <option key={key} value={key}>
                {names[locale]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {locale === "vi" ? "Trạng thái" : "Status"}
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">{t.allMovies}</option>
            <option value="now">{t.now}</option>
            <option value="soon">{t.soon}</option>
          </select>
        </label>
        <label>
          {t.chooseCinema}
          <select name="cinema" defaultValue={selectedCinema?.code ?? ""}>
            <option value="">
              {locale === "vi" ? "Tất cả rạp" : "All cinemas"}
            </option>
            {cinemas.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.chooseDate}
          <input
            name="date"
            type="date"
            defaultValue={query.date && validDay(query.date) ? query.date : ""}
          />
        </label>
        <button className="button buttonGold" type="submit">
          <Search size={15} />
          {t.apply}
        </button>
      </form>
      <p className={styles.scheduleNote}>
        {invalid
          ? locale === "vi"
            ? "Bộ lọc không hợp lệ. Vui lòng chọn lại hoặc xóa bộ lọc."
            : "Invalid filters. Please choose again or clear the filters."
          : locale === "vi"
            ? "Chọn rạp hoặc ngày để chỉ xem phim có suất đang mở bán. Có thể tìm tên phim không dấu."
            : "Choose a cinema or date to see only movies with sessions on sale. Accents are optional when searching."}
      </p>
      <div className={styles.resultHead}>
        <span>
          {filtered.length} {t.results}
          {selectedCinema ? ` · ${selectedCinema.name}` : ""}
        </span>
        <Link href={`/${locale}/movies`}>{t.clear}</Link>
      </div>
      {filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((movie) => (
            <MovieCard
              key={movie.slug}
              movie={movie}
              locale={locale}
              cinema={selectedCinema?.code}
              day={query.date}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Search size={30} />
          <h2>{t.noResults}</h2>
          <p>{t.noResultsSub}</p>
          <Link className="button buttonOutline" href={`/${locale}/movies`}>
            {t.clear}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <p className="demoNote">◦ {t.demo}</p>
    </div>
  );
}
