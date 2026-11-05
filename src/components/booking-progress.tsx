import { Check } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./booking-progress.module.css";

// Visual progress only. Booking authority remains with the server.
export function BookingProgress({
  locale,
  step,
}: {
  locale: Locale;
  step: 2 | 3 | 4;
}) {
  const labels =
    locale === "vi"
      ? ["Lịch chiếu", "Chọn ghế", "Thanh toán", "Vé của bạn"]
      : ["Session", "Seats", "Payment", "Your tickets"];
  return (
    <ol
      className={styles.steps}
      aria-label={locale === "vi" ? "Tiến trình đặt vé" : "Booking progress"}
    >
      {labels.map((label, index) => (
        <li
          key={label}
          aria-current={index + 1 === step ? "step" : undefined}
          className={index + 1 < step ? styles.done : undefined}
        >
          <span aria-hidden="true">
            {index + 1 < step ? (
              <Check size={13} />
            ) : (
              String(index + 1).padStart(2, "0")
            )}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
