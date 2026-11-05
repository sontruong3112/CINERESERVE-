import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { genreNames, type Movie } from "@/lib/catalogue";
import { copy, type Locale } from "@/lib/i18n";
import { MovieImage } from "./movie-image";
import styles from "./cinema-ui.module.css";
import { bookingQuery } from "@/lib/schedule";

export function MovieCard({
  movie,
  locale,
  cinema,
  day,
  compact = false,
}: {
  movie: Movie;
  locale: Locale;
  cinema?: string;
  day?: string;
  compact?: boolean;
}) {
  const t = copy[locale];
  const href = `/${locale}/movies/${movie.slug}${bookingQuery(cinema, day)}`;
  return (
    <article className={`${styles.card} ${compact ? styles.compact : ""}`}>
      <Link
        href={href}
        className={styles.poster}
        aria-label={movie.title[locale]}
      >
        <MovieImage
          src={movie.poster}
          alt={movie.title[locale]}
          title={movie.originalTitle}
        />
        <span className={styles.age}>{movie.age}</span>
      </Link>
      <h3>
        <Link href={href}>{movie.title[locale]}</Link>
      </h3>
      <div className={styles.cardMeta}>
        {genreNames[movie.genre[0]]?.[locale] ??
          (locale === "vi" ? "Phim" : "Movie")}
        <span aria-hidden="true"> · </span>
        {movie.duration} {t.minute}
      </div>
      <div className={styles.cardBottom}>
        <Link href={movie.status === "now" ? `${href}#showtimes` : href}>
          {movie.status === "now" ? t.showtimes : t.details}
          <ArrowUpRight size={13} />
        </Link>
        <span>2D · {movie.year}</span>
      </div>
    </article>
  );
}
