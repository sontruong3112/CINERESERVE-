import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { copy, type Locale } from "@/lib/i18n";
import { Brand } from "./brand";
import styles from "./cinema-ui.module.css";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return <footer className={styles.footer}><div className="container"><div className={styles.footerTop}><div><Brand locale={locale} /><p>{t.footerLine}</p></div><nav aria-label="Footer" className={styles.footerLinks}><Link href={`/${locale}/movies`}>{t.movies}</Link><Link href={`/${locale}/cinemas`}>{t.cinemas}</Link><Link href={`/${locale}/policies`}>{t.policies} <ArrowUpRight size={12} /></Link></nav></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} CineReserve</span><span>{t.footerNote}</span></div></div></footer>;
}
