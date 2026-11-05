import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { HeaderSession } from "@/components/header-session";
import { SiteFooter } from "@/components/site-footer";
import { MovieAssistant } from "@/components/movie-assistant";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "CineReserve — A bigger screen. A better story.",
    template: "%s | CineReserve",
  },
  description:
    "Khám phá phim, chọn lịch chiếu và đặt vé cùng CineReserve. Hỗ trợ Việt/Anh, trợ lý AI và thanh toán giả lập.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skipLink">
          {locale === "vi" ? "Đến nội dung chính" : "Skip to content"}
        </a>
        <Suspense
          fallback={<div style={{ height: "var(--header-height)" }} />}
        >
          <HeaderSession locale={locale} />
        </Suspense>
        <main id="main-content">{children}</main>
        <SiteFooter locale={locale} />
        <MovieAssistant key={locale} locale={locale} />
      </body>
    </html>
  );
}
