import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { roleHome, type Role } from "@/lib/auth/shared";
import { checkoutCopy } from "@/lib/booking/checkout-policy";
import styles from "./orders.module.css";
export function CustomerBookingNotice({
  locale,
  role,
}: {
  locale: Locale;
  role: Role;
}) {
  const t = checkoutCopy[locale];
  return (
    <section className={`container ${styles.shell}`}>
      <article className={styles.panel}>
        <p className="eyebrow">CINERESERVE</p>
        <h1>{t.internalTitle}</h1>
        <p className={styles.policyText}>{t.internalText}</p>
        <p className={styles.policyText}>{t.existing}</p>
        <Link className="button buttonGold" href={roleHome(locale, role)}>
          {t.workspace}
        </Link>
      </article>
    </section>
  );
}
