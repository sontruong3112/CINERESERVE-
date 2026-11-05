import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { currentViewer } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/shared";
import { AuthForm } from "@/components/auth-form";
import { queryValue, type QueryParams } from "@/lib/query";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<QueryParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (viewer) redirect(roleHome(locale, viewer.role));
  return (
    <AuthForm
      mode="register"
      locale={locale}
      next={queryValue((await searchParams).next)}
    />
  );
}
