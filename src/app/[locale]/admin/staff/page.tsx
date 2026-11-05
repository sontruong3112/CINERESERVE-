import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import { queryValue, type QueryParams } from "@/lib/query";
import { staffDirectory } from "@/lib/admin/staff";
import { StaffError, staffCopy } from "@/lib/admin/staff-shared";
import { StaffManager } from "@/components/admin/staff-manager";
import { Pagination } from "@/components/admin/pagination";
import styles from "@/components/admin/admin.module.css";
export default async function StaffAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin/staff", ["ADMIN"]);
  const session = await currentSession();
  if (!session) notFound();
  const raw = await searchParams,
    query = {
      q: queryValue(raw.q),
      cinema: queryValue(raw.cinema),
      page: queryValue(raw.page),
    },
    t = staffCopy[locale];
  let list;
  try {
    list = await staffDirectory(session.id, query);
  } catch (error) {
    return (
      <section className={styles.error} role="alert">
        <h1>{t.title}</h1>
        <p>
          {t.errors[
            error instanceof StaffError ? error.code : "SERVER_ERROR"
          ] || t.errors.SERVER_ERROR}
        </p>
        <Link href={`/${locale}/admin/staff`}>{t.reset}</Link>
      </section>
    );
  }
  return (
    <>
      <StaffManager items={list.items} cinemas={list.cinemas} locale={locale}>
        <form
          key={JSON.stringify(query)}
          method="get"
          className={styles.filters}
          style={{ marginTop: 22 }}
        >
          <label>
            {t.search}
            <input name="q" defaultValue={query.q} maxLength={100} />
          </label>
          <label>
            {t.cinema}
            <select name="cinema" defaultValue={query.cinema}>
              <option value="">{t.all}</option>
              {list.cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.active ? "" : ` · ${t.inactiveCinema}`}
                </option>
              ))}
            </select>
          </label>
          <button className="button buttonOutline" type="submit">
            {t.filter}
          </button>
          <Link href={`/${locale}/admin/staff`}>{t.reset}</Link>
        </form>
      </StaffManager>
      <Pagination
        base={`/${locale}/admin/staff`}
        query={{ q: query.q, cinema: query.cinema }}
        {...list}
        locale={locale}
      />
    </>
  );
}
