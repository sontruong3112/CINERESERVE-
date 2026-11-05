import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import { getSeatMap } from "@/lib/booking/service";
import { SeatPicker } from "@/components/seat-picker";
import { CustomerBookingNotice } from "@/components/customer-booking-notice";
export default async function SeatsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requirePageViewer(locale, `showtimes/${id}/seats`);
  if (viewer.role !== "CUSTOMER")
    return <CustomerBookingNotice locale={locale} role={viewer.role} />;
  const session = await currentSession();
  if (!session) notFound();
  const initial = await getSeatMap(session.id, id).catch((error) => {
    if (error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return <SeatPicker initial={initial} locale={locale} />;
}
