import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import type { QueryParams } from "@/lib/query";
import { RevenueScreen } from "@/components/revenue-report";
export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin/reports", ["ADMIN"]);
  const session = await currentSession();
  if (!session) notFound();
  return (
    <RevenueScreen
      locale={locale}
      sessionId={session.id}
      query={await searchParams}
      base={`/${locale}/admin/reports`}
    />
  );
}
