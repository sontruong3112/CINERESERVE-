import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MapPin,
  MessageCircle,
  Ticket,
} from "lucide-react";
import { copy, isLocale } from "@/lib/i18n";
import { genreNames } from "@/lib/catalogue";
import { getCatalogue, getScheduleOptions } from "@/lib/catalogue-repository";
import { MovieCard } from "@/components/movie-card";
import { QuickBooking } from "@/components/quick-booking";
import { AssistantTrigger } from "@/components/assistant-trigger";
import styles from "./page.module.css";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = copy[locale];
  const { movies, cinemas } = await getCatalogue();
  const options = await getScheduleOptions();
  const featured = movies.find((movie) => movie.status === "now") ?? movies[0];
  const now = movies.filter((movie) => movie.status === "now");
  const soon = movies.filter((movie) => movie.status === "soon");
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-label={t.featured}>
        {featured && (
          <Image
            className={styles.heroImage}
            src={featured.backdrop}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
          />
        )}
        <div className={`container ${styles.heroContent}`}>
          <p className={styles.edition}>
            {featured?.status === "soon" ? t.soon : t.now}
          </p>
          <p className={styles.heroKicker}>{featured?.originalTitle}</p>
          <h1>{featured?.title[locale] ?? t.heroTitle}</h1>
          {featured && (
            <div className={styles.heroMeta}>
              <span>{featured.age}</span>
              <span>{genreNames[featured.genre[0]]?.[locale]}</span>
              <span>
                <Clock3 size={14} /> {featured.duration} {t.minute}
              </span>
              <span>2D</span>
            </div>
          )}
          <p className={styles.heroDescription}>
            {featured?.synopsis[locale] ?? t.heroDescription}
          </p>
          <div className={styles.heroButtons}>
            <Link
              className="button buttonGold"
              href={
                featured
                  ? `/${locale}/movies/${featured.slug}#showtimes`
                  : `/${locale}/movies`
              }
            >
              <Ticket size={17} />
              {t.showtimes}
              <ArrowRight size={16} />
            </Link>
            {featured && (
              <Link
                className={styles.textLink}
                href={`/${locale}/movies/${featured.slug}`}
              >
                {t.details}
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>
      <div className="container">
        <QuickBooking
          locale={locale}
          options={options}
          movies={movies}
          cinemas={cinemas}
        />
        <section className={styles.movieSection}>
          <div className={styles.sectionHead}>
            <div>
              <h2>{t.now}</h2>
            </div>
            <Link
              className={styles.textLink}
              href={`/${locale}/movies?status=now`}
            >
              {t.viewAll}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.movieGrid}>
            {now.map((movie) => (
              <MovieCard key={movie.slug} movie={movie} locale={locale} />
            ))}
          </div>
        </section>
        <section className={styles.inspiration}>
          <div className={styles.aiMark} aria-hidden="true">
            <MessageCircle size={25} strokeWidth={1.5} />
          </div>
          <div>
            <h2>
              {locale === "vi"
                ? "Bạn chưa chọn được phim?"
                : "Need a hand choosing a film?"}
            </h2>
            <p>
              {locale === "vi"
                ? "Hỏi trợ lý về nội dung phim, độ tuổi phù hợp hoặc lịch chiếu tại rạp."
                : "Ask our assistant about films, age ratings or cinema showtimes."}
            </p>
          </div>
          <AssistantTrigger locale={locale} />
        </section>
        {!!soon.length && (
          <section className={styles.movieSection}>
            <div className={styles.sectionHead}>
              <div>
                <h2>{t.soon}</h2>
              </div>
              <Link
                className={styles.textLink}
                href={`/${locale}/movies?status=soon`}
              >
                {t.viewAll}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.comingGrid}>
              {soon.slice(0, 4).map((movie) => (
                <MovieCard
                  key={movie.slug}
                  movie={movie}
                  locale={locale}
                  compact
                />
              ))}
            </div>
          </section>
        )}
        <section className={styles.locations}>
          <div className={styles.locationPhoto}>
            <Image
              src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=85"
              alt={
                locale === "vi"
                  ? "Không gian ghế ngồi trong rạp chiếu phim"
                  : "Cinema auditorium seating"
              }
              fill
              unoptimized
              sizes="(max-width: 700px) 100vw, 50vw"
            />
          </div>
          <div className={styles.locationText}>
            <h2>
              {locale === "vi" ? "Hệ thống rạp CineReserve" : "Our cinemas"}
            </h2>
            <p>
              {locale === "vi"
                ? "Xem phim và lịch chiếu tại chi nhánh bạn muốn đến."
                : "Find films and showtimes at your preferred cinema."}
            </p>
            <div className={styles.branchLinks}>
              {cinemas.map((cinema) => (
                <Link
                  key={cinema.code}
                  href={`/${locale}/movies?cinema=${cinema.code}`}
                >
                  <MapPin size={15} />
                  {cinema.name.replace(/^CineReserve\s*/, "")}
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
            <Link className={styles.textLink} href={`/${locale}/cinemas`}>
              {t.locations}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <p className="demoNote">{t.demo}</p>
      </div>
    </div>
  );
}
