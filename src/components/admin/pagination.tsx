import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import styles from "./admin.module.css";
export function Pagination({
  base,
  query,
  page,
  pages,
  total,
  locale,
}: {
  base: string;
  query: Record<string, string>;
  page: number;
  pages: number;
  total: number;
  locale: Locale;
}) {
  function href(p: number) {
    const params = new URLSearchParams({ ...query, page: String(p) });
    return `${base}?${params}`;
  }
  return (
    <div className={styles.pagination}>
      {page > 1 && (
        <Link href={href(page - 1)}>
          ← {locale === "vi" ? "Trước" : "Previous"}
        </Link>
      )}
      <span>
        {locale === "vi" ? "Trang" : "Page"} {page}/{pages} · {total}{" "}
        {locale === "vi" ? "bản ghi" : "records"}
      </span>
      {page < pages && (
        <Link href={href(page + 1)}>{locale === "vi" ? "Tiếp" : "Next"} →</Link>
      )}
    </div>
  );
}
