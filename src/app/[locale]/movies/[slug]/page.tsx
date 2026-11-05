import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowDown, Clock3, MapPin } from "lucide-react";
import { copy, isLocale } from "@/lib/i18n";
import { genreNames, getDemoDays } from "@/lib/catalogue";
import {
  getCatalogue,
  getShowtimes,
  getScheduleOptions,
} from "@/lib/catalogue-repository";
import { bookingQuery, scheduleDays, validDay } from "@/lib/schedule";
import { DateStrip } from "@/components/date-strip";
import { MovieImage } from "@/components/movie-image";
import { SampleSession } from "@/components/sample-session";
import { queryValue, type QueryParams } from "@/lib/query";
import styles from "../../content.module.css";

type Params = { locale: string; slug: string };
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { movies } = await getCatalogue();
  const movie = movies.find((item) => item.slug === slug);
  return {
    title: movie && isLocale(locale) ? movie.title[locale] : "CineReserve",
  };
}
export default async function MoviePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const { movies, cinemas, source } = await getCatalogue();
  const movie = movies.find((item) => item.slug === slug);
  if (!movie) notFound();
  const t = copy[locale];
  const raw = await searchParams;
  const query = { cinema: queryValue(raw.cinema), date: queryValue(raw.date) };
  const selectedCinema = cinemas.find((cinema) => cinema.code === query.cinema);
  const options = await getScheduleOptions(slug);
  const days = source === "demo" ? getDemoDays() : scheduleDays(options, slug);
  const invalid = !!(
    (query.date && !validDay(query.date)) ||
    (query.cinema && !selectedCinema)
  );
  // An explicit date must never silently turn into a booking for another day.
  const date = query.date || days[0] || getDemoDays()[0];
  const dayLinks = [
    ...new Set([...days, ...(validDay(date) ? [date] : [])]),
  ].sort();
  const visibleCinemas = selectedCinema ? [selectedCinema] : cinemas;
  const sessions = invalid
    ? []
    : await getShowtimes(slug, date, selectedCinema?.code);
  return (
    <>
      <section className={styles.detailHero}>
        <Image
          src={movie.backdrop}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className={styles.backdrop}
        />
        <div className="container">
          <Link
            className={styles.backLink}
            href={`/${locale}/movies${bookingQuery(selectedCinema?.code, validDay(date) ? date : undefined)}`}
          >
            <ArrowLeft size={14} />
            {t.back}
          </Link>
          <div className={styles.detailGrid}>
            <div className={styles.detailPoster}>
              <MovieImage
                src={movie.poster}
                alt={movie.title[locale]}
                title={movie.originalTitle}
                priority
              />
            </div>
            <div>
              <p className="eyebrow">
                {movie.status === "now" ? t.now : t.soon}
              </p>
              <h1>{movie.title[locale]}</h1>
              <div className={styles.detailMeta}>
                <span className={styles.rating}>{movie.age}</span>
                <span>
                  <Clock3 size={14} />
                  {movie.duration} {t.minute}
                </span>
                <span>
                  {movie.genre
                    .map((genre) => genreNames[genre]?.[locale] ?? genre)
                    .join(" / ")}
                </span>
                <span>{movie.year}</span>
              </div>
              <p className={styles.synopsis}>{movie.synopsis[locale]}</p>
              <dl className={styles.facts}>
                <div>
                  <dt>{t.director}</dt>
                  <dd>{movie.director}</dd>
                </div>
                <div>
                  <dt>{t.format}</dt>
                  <dd>2D · {locale === "vi" ? "Phụ đề" : "Subtitled"}</dd>
                </div>
              </dl>
              <a className="button buttonGold" href="#showtimes">
                {t.showtimes}
                <ArrowDown size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className={`container ${styles.schedule}`} id="showtimes">
        <h2>{locale === "vi" ? "Chọn lịch chiếu" : "Choose a session"}</h2>
        <p className={styles.scheduleNote}>
          {locale === "vi"
            ? "Chọn ngày, rạp rồi bấm giờ chiếu để chọn ghế. Giá ghế thường; VIP có phụ thu."
            : "Choose a date, cinema and session time to select seats. Standard prices shown; VIP costs extra."}
        </p>
        {invalid ? (
          <div className={styles.empty}>
            <h3>
              {locale === "vi"
                ? "Ngày hoặc rạp không hợp lệ"
                : "Invalid date or cinema"}
            </h3>
            <Link href={`/${locale}/movies/${slug}#showtimes`}>
              {locale === "vi" ? "Chọn lại lịch chiếu" : "Reset schedule"}
            </Link>
          </div>
        ) : source === "demo" && movie.status === "soon" ? (
          <div className={styles.empty}>
            <h3>{t.noSchedule}</h3>
            <Link
              className="button buttonOutline"
              href={`/${locale}/movies?status=now`}
            >
              {t.now}
            </Link>
          </div>
        ) : (
          <>
            <DateStrip
              days={dayLinks}
              selected={date}
              cinema={selectedCinema?.code}
              slug={slug}
              locale={locale}
              today={getDemoDays()[0]}
              tomorrow={getDemoDays()[1]}
            />
            <nav className={styles.cinemaChoices} aria-label={t.chooseCinema}>
              <Link
                scroll={false}
                aria-current={!selectedCinema ? "true" : undefined}
                href={`/${locale}/movies/${slug}${bookingQuery(undefined, date)}#showtimes`}
              >
                {locale === "vi" ? "Tất cả rạp" : "All cinemas"}
              </Link>
              {cinemas.map((cinema) => (
                <Link
                  key={cinema.code}
                  scroll={false}
                  aria-current={
                    selectedCinema?.code === cinema.code ? "true" : undefined
                  }
                  href={`/${locale}/movies/${slug}${bookingQuery(cinema.code, date)}#showtimes`}
                >
                  {cinema.name.replace(/^CineReserve\s*/, "")}
                </Link>
              ))}
            </nav>
            {source === "database" && !sessions.length && (
              <div className={styles.empty}>
                <h3>
                  {locale === "vi"
                    ? "Chưa có suất mở bán phù hợp"
                    : "No matching sessions on sale"}
                </h3>
                <p>
                  {locale === "vi"
                    ? "Chọn ngày hoặc rạp khác để xem lịch."
                    : "Choose another date or cinema."}
                </p>
                <Link
                  className="button buttonOutline"
                  href={`/${locale}/movies/${slug}#showtimes`}
                >
                  {locale === "vi"
                    ? "Tìm suất gần nhất tại tất cả rạp"
                    : "Find the next session at all cinemas"}
                </Link>
              </div>
            )}
            {visibleCinemas.map((cinema) => {
              const branchSessions = sessions.filter(
                (session) => session.auditorium.cinema.code === cinema.code,
              );
              if (source === "database" && !branchSessions.length) return null;
              return (
                <div className={styles.cinemaBlock} key={cinema.code}>
                  <h3>{cinema.name}</h3>
                  <p>
                    <MapPin size={12} /> {cinema.address[locale]} ·{" "}
                    {t.sampleLocation}
                  </p>
                  <div className={styles.sessions}>
                    {source === "demo"
                      ? ["10:00", "13:30", "17:00", "20:00"].map((time) => (
                          <SampleSession
                            key={time}
                            time={time}
                            locale={locale}
                            price={cinema.code === "ha-noi" ? 90000 : 80000}
                          />
                        ))
                      : branchSessions.map((session) => (
                          <div key={session.id}>
                            <SampleSession
                              time={new Intl.DateTimeFormat("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Ho_Chi_Minh",
                              }).format(session.startsAt)}
                              locale={locale}
                              price={session.basePrice}
                              showtimeId={session.id}
                            />
                            <p>{session.auditorium.name}</p>
                          </div>
                        ))}
                    {source === "database" && !branchSessions.length && (
                      <p>
                        {locale === "vi"
                          ? "Không có suất còn mở bán trong ngày này."
                          : "No sessions are available on this date."}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </>
  );
}
