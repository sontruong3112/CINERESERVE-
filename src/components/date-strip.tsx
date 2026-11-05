"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { bookingQuery } from "@/lib/schedule";
import styles from "./date-strip.module.css";

export function DateStrip({
  days,
  selected,
  cinema,
  slug,
  locale,
  today,
  tomorrow,
}: {
  days: string[];
  selected: string;
  cinema?: string;
  slug: string;
  locale: Locale;
  today: string;
  tomorrow: string;
}) {
  const track = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 2,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    const active = element.querySelector<HTMLElement>('[aria-current="date"]');
    if (active)
      element.scrollLeft +=
        active.getBoundingClientRect().left -
        element.getBoundingClientRect().left -
        (element.clientWidth - active.clientWidth) / 2;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [selected, days]);
  function move(direction: number) {
    const element = track.current;
    if (element)
      element.scrollBy({
        left: direction * element.clientWidth * 0.8,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <div className={styles.shell}>
      <div className={styles.heading}>
        <span>{locale === "vi" ? "Chọn ngày" : "Choose a date"}</span>
        <div className={styles.arrows}>
          <button
            type="button"
            disabled={edges.start}
            onClick={() => move(-1)}
            aria-label={
              locale === "vi" ? "Xem ngày trước" : "Show earlier dates"
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            disabled={edges.end}
            onClick={() => move(1)}
            aria-label={
              locale === "vi" ? "Xem ngày tiếp theo" : "Show later dates"
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <nav
        ref={track}
        className={styles.track}
        aria-label={locale === "vi" ? "Chọn ngày" : "Choose a date"}
      >
        {days.map((day) => {
          const value = new Date(`${day}T12:00:00+07:00`);
          return (
            <Link
              key={day}
              scroll={false}
              aria-current={day === selected ? "date" : undefined}
              href={`/${locale}/movies/${slug}${bookingQuery(cinema, day)}#showtimes`}
            >
              <span>
                {day === today
                  ? locale === "vi"
                    ? "Hôm nay"
                    : "Today"
                  : day === tomorrow
                    ? locale === "vi"
                      ? "Ngày mai"
                      : "Tomorrow"
                    : (locale === "vi"
                        ? [
                            "CN",
                            "Thứ 2",
                            "Thứ 3",
                            "Thứ 4",
                            "Thứ 5",
                            "Thứ 6",
                            "Thứ 7",
                          ]
                        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])[
                        value.getUTCDay()
                      ]}
              </span>
              <strong>
                {day.slice(8, 10)}/{day.slice(5, 7)}
              </strong>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
