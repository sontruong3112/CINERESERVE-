import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import styles from "./brand.module.css";

// The same brand component is used by the header and footer.
export function Brand({ locale }: { locale: Locale }) {
  return (
    <Link
      href={`/${locale}`}
      className={styles.brand}
      aria-label="CineReserve"
      title={locale === "vi" ? "CineReserve — Trang chủ" : "CineReserve — Home"}
    >
      <Image
        src="/brand/cinereserve-mark.svg"
        alt=""
        width={44}
        height={44}
        className={styles.mark}
        unoptimized
      />
      <span className={styles.type} aria-hidden="true">
        <span className={styles.wordmark}>Cine<span>Reserve</span></span>
        <span className={styles.signature}>CINEMA. YOUR WAY.</span>
      </span>
    </Link>
  );
}
