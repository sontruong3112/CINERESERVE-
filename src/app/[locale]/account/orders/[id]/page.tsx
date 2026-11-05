import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentSession, requirePageViewer } from "@/lib/auth/session";
import { readOrder } from "@/lib/booking/orders";
import { OrderDetail } from "@/components/order-detail";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (
    !isLocale(locale) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const viewer = await requirePageViewer(locale, `account/orders/${id}`);
  const session = await currentSession();
  if (!session) notFound();
  const order = await readOrder(session.id, id).catch((error) => {
    if (error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return (
    <OrderDetail
      key={order.id}
      initial={order}
      locale={locale}
      canPurchase={viewer.role === "CUSTOMER"}
    />
  );
}
