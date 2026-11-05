import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { queryValue, type QueryParams } from "@/lib/query";
import { Pagination } from "@/components/admin/pagination";
import styles from "@/components/admin/admin.module.css";
export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin/audit", ["ADMIN"]);
  const page = Math.max(
    1,
    Math.min(
      10000,
      Math.trunc(Number(queryValue((await searchParams).page)) || 1),
    ),
  );
  const [rows, total] = await Promise.all([
    getDb().auditLog.findMany({
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      include: { actor: { select: { name: true } } },
      skip: (page - 1) * 20,
      take: 20,
    }),
    getDb().auditLog.count(),
  ]);
  return (
    <>
      <div className={styles.title}>
        <div>
          <h1>
            {locale === "vi" ? "Nhật ký quản trị" : "Administration audit log"}
          </h1>
          <p>
            {locale === "vi"
              ? "Ghi nhận người thao tác, thời điểm, dữ liệu trước/sau và lý do hủy. Nhật ký được lưu cùng giao dịch thay đổi dữ liệu."
              : "Actor, time, before/after data and cancellation reasons are recorded in the same transaction as each change."}
          </p>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {(locale === "vi"
                ? ["Thời điểm / người sửa", "Thao tác", "Chi tiết"]
                : ["Time / actor", "Action", "Details"]
              ).map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {new Intl.DateTimeFormat(
                    locale === "vi" ? "vi-VN" : "en-GB",
                    {
                      timeZone: "Asia/Ho_Chi_Minh",
                      dateStyle: "short",
                      timeStyle: "short",
                    },
                  ).format(row.occurredAt)}
                  <div>{row.actor.name}</div>
                </td>
                <td>
                  {row.action}
                  <div className={styles.muted}>
                    {row.entityType} · {row.entityId}
                  </div>
                  {row.reason && <p>{row.reason}</p>}
                </td>
                <td>
                  <details>
                    <summary>
                      {locale === "vi" ? "Xem thay đổi" : "View changes"}
                    </summary>
                    <pre className={styles.auditDetail}>
                      {JSON.stringify(
                        { before: row.beforeData, after: row.afterData },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p style={{ padding: 20 }}>
            {locale === "vi"
              ? "Chưa có thao tác quản trị."
              : "No administration changes yet."}
          </p>
        )}
      </div>
      <Pagination
        locale={locale}
        base={`/${locale}/admin/audit`}
        query={{}}
        page={page}
        total={total}
        pages={Math.max(1, Math.ceil(total / 20))}
      />
    </>
  );
}
