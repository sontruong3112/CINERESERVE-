import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { TicketScanner } from "@/components/ticket-scanner";
export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await requirePageViewer(locale, "staff/tickets", ["STAFF"]);
  return <TicketScanner locale={locale} cinema={viewer.cinema!.name} />;
}
