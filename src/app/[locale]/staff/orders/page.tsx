import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import { queryValue, type QueryParams } from "@/lib/query";
import { OperationsOrdersScreen } from "@/components/operations-orders";
import styles from "@/components/operations-orders.module.css";
export default async function StaffOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "staff/orders", ["STAFF"]);
  const session = await currentSession();
  if (!session) notFound();
  const raw = await searchParams;
  const query = Object.fromEntries(
    ["q", "status", "cinema", "from", "to", "page"].map((key) => [
      key,
      queryValue(raw[key]),
    ]),
  );
  return (
    <div className={styles.standalone}>
      <OperationsOrdersScreen
        locale={locale}
        sessionId={session.id}
        query={query}
        base={`/${locale}/staff/orders`}
      />
    </div>
  );
}
