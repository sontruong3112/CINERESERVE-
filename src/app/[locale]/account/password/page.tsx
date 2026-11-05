import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requirePageViewer } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";
export default async function PasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await requirePageViewer(
    locale,
    "account/password",
    undefined,
    true,
  );
  return <AuthForm mode="password" locale={locale} viewer={viewer} />;
}
