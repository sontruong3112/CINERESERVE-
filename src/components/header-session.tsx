import { currentViewer } from "@/lib/auth/session";
import { SiteHeader } from "./site-header";
import type { Locale } from "@/lib/i18n";

export async function HeaderSession({ locale }: { locale: Locale }) {
  const viewer = await currentViewer();
  return (
    <SiteHeader
      locale={locale}
      viewer={viewer ? { name: viewer.name, role: viewer.role } : null}
    />
  );
}
