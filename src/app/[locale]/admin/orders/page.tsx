import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import { queryValue, type QueryParams } from "@/lib/query";
import { OperationsOrdersScreen } from "@/components/operations-orders";
export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requirePageViewer(locale, "admin/orders", ["ADMIN"]);
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
    <OperationsOrdersScreen
      locale={locale}
      sessionId={session.id}
      query={query}
      base={`/${locale}/admin/orders`}
    />
  );
}
