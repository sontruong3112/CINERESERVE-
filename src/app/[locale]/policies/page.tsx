import { notFound } from "next/navigation";
import { isLocale, copy } from "@/lib/i18n";
import { bookingGuide } from "@/lib/public-policies";
import styles from "../content.module.css";

export default async function PoliciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = copy[locale];
  return (
    <div className="container">
      <div className={styles.intro}>
        <p className="eyebrow">THE CINERESERVE EXPERIENCE</p>
        <h1>{t.guideTitle}</h1>
        <p>{t.guideSub}</p>
      </div>
      <div className={styles.steps}>
        {bookingGuide[locale].map(([title, text], index) => (
          <article className={styles.step} key={title}>
            <span>0{index + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
