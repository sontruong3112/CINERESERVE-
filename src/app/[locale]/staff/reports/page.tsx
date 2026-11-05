import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import type { QueryParams } from "@/lib/query";
import { RevenueScreen } from "@/components/revenue-report";
import styles from "@/components/revenue-report.module.css";
export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "staff/reports", ["STAFF"]);
  const session = await currentSession();
  if (!session) notFound();
  return (
    <div className={`container ${styles.standalone}`}>
      <RevenueScreen
        locale={locale}
        sessionId={session.id}
        query={await searchParams}
        base={`/${locale}/staff/reports`}
      />
    </div>
  );
}
