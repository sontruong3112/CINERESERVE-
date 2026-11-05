"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clapperboard,
  MapPin,
  Ticket,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { formatDay, type Movie } from "@/lib/catalogue";
import { copy, type Locale } from "@/lib/i18n";
import styles from "./cinema-ui.module.css";
import {
  bookingQuery,
  scheduleDays,
  type ScheduleOption,
} from "@/lib/schedule";

export function QuickBooking({
  locale,
  options,
  movies,
  cinemas,
}: {
  locale: Locale;
  options: ScheduleOption[];
  movies: Movie[];
  cinemas: { code: string; name: string }[];
}) {
  const t = copy[locale];
  const router = useRouter();
  const branches = cinemas.filter((c) =>
    options.some((o) => o.cinema === c.code),
  );
  const [cinemaChoice, setCinema] = useState("");
  const cinema = branches.some((c) => c.code === cinemaChoice)
    ? cinemaChoice
    : (branches[0]?.code ?? "");
  const availableMovies = movies.filter((m) =>
    options.some((o) => o.cinema === cinema && o.movie === m.slug),
  );
  const [movieChoice, setMovie] = useState("");
  const movie = availableMovies.some((m) => m.slug === movieChoice)
    ? movieChoice
    : (availableMovies[0]?.slug ?? "");
  const days = scheduleDays(options, movie, cinema);
  const [dayChoice, setDay] = useState("");
  const day = days.includes(dayChoice) ? dayChoice : (days[0] ?? "");
  return (
    <section className={styles.quick} aria-label={locale === "vi" ? "Đặt vé nhanh" : "Quick booking"}>
      <div className={styles.quickHead}>
        <Ticket size={27} strokeWidth={1.4} />
        <div>
          <h2>{locale === "vi" ? "Đặt vé nhanh" : "Quick booking"}</h2>
          <p>
            {locale === "vi"
              ? "Chọn rạp · Chọn phim · Chọn ngày"
              : "Your cinema · Your film · Your day"}
          </p>
        </div>
      </div>
      <p role="status">
        {options.length
          ? locale === "vi"
            ? "Đăng nhập ở bước chọn ghế. Thanh toán giả lập, không thu tiền thật."
            : "Sign in when choosing seats. Simulated payments, no real charge."
          : locale === "vi"
            ? "Hiện chưa có suất đang mở bán. Bạn vẫn có thể khám phá danh sách phim."
            : "No sessions are currently on sale. You can still explore the movie catalogue."}
      </p>
      <form
        className={styles.quickForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (cinema && movie && day)
            router.push(
              `/${locale}/movies/${movie}${bookingQuery(cinema, day)}#showtimes`,
            );
        }}
      >
        <div className={styles.field}>
          <MapPin />
          <label htmlFor="quick-cinema">{t.chooseCinema}</label>
          <select
            disabled={!branches.length}
            id="quick-cinema"
            value={cinema}
            onChange={(e) => setCinema(e.target.value)}
          >
            {!branches.length && <option value="">—</option>}
            {branches.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <Clapperboard />
          <label htmlFor="quick-movie">{t.chooseMovie}</label>
          <select
            disabled={!availableMovies.length}
            id="quick-movie"
            value={movie}
            onChange={(e) => setMovie(e.target.value)}
          >
            {!availableMovies.length && <option value="">—</option>}
            {availableMovies.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.title[locale]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <CalendarDays />
          <label htmlFor="quick-date">{t.chooseDate}</label>
          <select
            disabled={!days.length}
            id="quick-date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {!days.length && <option value="">—</option>}
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDay(d, locale)}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={!cinema || !movie || !day}
          className="button buttonGold"
          type="submit"
        >
          {t.find}
          <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
