import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale, copy } from "@/lib/i18n";
import { getCatalogue } from "@/lib/catalogue-repository";
import styles from "../content.module.css";

export default async function CinemasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = copy[locale];
  const { cinemas } = await getCatalogue();
  return <div className="container"><div className={styles.intro}><p className="eyebrow">CINERESERVE SPACES</p><h1>{t.cinemaTitle}</h1><p>{t.cinemaSub}</p></div><div className={styles.cards}>{cinemas.map((cinema) => <article className={styles.cinemaCard} key={cinema.code}><MapPin size={32} strokeWidth={1.2} /><p className="eyebrow">{t.sampleLocation}</p><h2>{cinema.name}</h2><p>{cinema.address[locale]}<br />{t.opening}: 09:00–23:30<br />{cinema.rooms} {locale === "vi" ? "phòng chiếu mẫu · 2D" : "sample auditoriums · 2D"}</p><Link href={`/${locale}/movies?cinema=${cinema.code}&status=now`} className="button buttonOutline">{t.viewSchedule}<ArrowUpRight size={15} /></Link></article>)}</div><p className="demoNote">◦ {t.demo}</p></div>;
}
