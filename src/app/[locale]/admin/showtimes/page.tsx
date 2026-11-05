import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { showtimeList, scheduleOptions } from "@/lib/admin/service";
import { queryValue, type QueryParams } from "@/lib/query";
import { ShowtimeManager } from "@/components/admin/showtime-manager";
import { Pagination } from "@/components/admin/pagination";
import styles from "@/components/admin/admin.module.css";
export default async function ShowtimesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin/showtimes", ["ADMIN"]);
  const raw = await searchParams,
    query = {
      date: queryValue(raw.date),
      cinema: queryValue(raw.cinema),
      page: queryValue(raw.page),
    };
  const [list, options] = await Promise.all([
    showtimeList(query),
    scheduleOptions(),
  ]);
  const cinemas = [
    ...new Map(options.rooms.map((r) => [r.cinemaCode, r.cinema])).entries(),
  ];
  return (
    <>
      <form className={styles.filters}>
        <label>
          {locale === "vi" ? "Ngày chiếu" : "Date"}
          <input type="date" name="date" defaultValue={list.date} />
        </label>
        <label>
          {locale === "vi" ? "Chi nhánh" : "Cinema"}
          <select name="cinema" defaultValue={query.cinema ?? ""}>
            <option value="">{locale === "vi" ? "Tất cả" : "All"}</option>
            {cinemas.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button className="button buttonOutline">
          {locale === "vi" ? "Lọc lịch" : "Filter"}
        </button>
      </form>
      <ShowtimeManager
        locale={locale}
        items={list.items}
        options={options}
        date={list.date}
      />
      <Pagination
        locale={locale}
        base={`/${locale}/admin/showtimes`}
        query={{ date: list.date, cinema: query.cinema }}
        {...list}
      />
    </>
  );
}
