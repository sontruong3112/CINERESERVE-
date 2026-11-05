"use client";

import { useRef, useId } from "react";
import Link from "next/link";
import { copy, type Locale } from "@/lib/i18n";
import { money } from "@/lib/catalogue";
import styles from "./cinema-ui.module.css";

export function SampleSession({
  time,
  locale,
  price,
  showtimeId,
}: {
  time: string;
  locale: Locale;
  price: number;
  showtimeId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const t = copy[locale];
  if (showtimeId)
    return (
      <Link
        className={styles.session}
        href={`/${locale}/showtimes/${showtimeId}/seats`}
        aria-label={`${t.showtimes} ${time}`}
      >
        <strong>{time}</strong>
        <span>2D · {money(price, locale)}</span>
      </Link>
    );
  return (
    <>
      <button
        type="button"
        className={styles.session}
        onClick={() => dialog.current?.showModal()}
        aria-label={`${t.sampleTime} ${time}`}
      >
        <strong>{time}</strong>
        <span>2D · {money(price, locale)}</span>
      </button>
      <dialog className={styles.dialog} ref={dialog} aria-labelledby={id}>
        <h2 id={id}>{t.nextStage}</h2>
        <p>{t.nextStageText}</p>
        <button
          type="button"
          className="button buttonGold"
          onClick={() => dialog.current?.close()}
        >
          {t.close}
        </button>
      </dialog>
    </>
  );
}
