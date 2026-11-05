"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy, type Locale } from "@/lib/i18n";
import styles from "./cinema-ui.module.css";
import { UserNavigation } from "./user-navigation";
import type { Viewer } from "@/lib/auth/shared";
import { Brand } from "./brand";

export function SiteHeader({
  locale,
  viewer,
}: {
  locale: Locale;
  viewer: Pick<Viewer, "name" | "role"> | null;
}) {
  const path = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !accountMenu.current?.contains(event.target)
      )
        accountMenu.current?.removeAttribute("open");
      if (event.target instanceof Node && !header.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const t = copy[locale];
  const links = [
    ["movies", t.movies],
    ["cinemas", t.cinemas],
    ["policies", t.policies],
  ];
  function languageHref(language: Locale) {
    const suffix = search.toString();
    return (
      path.replace(/^\/(vi|en)(?=\/|$)/, `/${language}`) +
      (suffix ? `?${suffix}` : "")
    );
  }
  return (
    <header
      ref={header}
      className={styles.headerShell}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (open) menuButton.current?.focus({ preventScroll: true });
          setOpen(false);
          if (accountMenu.current?.open) {
            accountMenu.current.removeAttribute("open");
            accountMenu.current.querySelector("summary")?.focus({ preventScroll: true });
          }
        }
      }}
    >
      <div className={`container ${styles.header}`}>
        <Brand locale={locale} />
        <nav
          id="main-navigation"
          aria-label={locale === "vi" ? "Điều hướng chính" : "Main navigation"}
          className={`${styles.nav} ${open ? styles.navOpen : ""}`}
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              className={path.includes(`/${href}`) ? styles.active : undefined}
              aria-current={path.includes(`/${href}`) ? "page" : undefined}
              href={`/${locale}/${href}`}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className={styles.mobileAccount}>
            <UserNavigation locale={locale} viewer={viewer} />
          </div>
        </nav>
        <div className={styles.actions}>
          <div className={styles.desktopAccount}>
            {viewer ? (
              <details ref={accountMenu} className={styles.accountDropdown}>
                <summary>
                  <UserRound size={17} />
                  <span>{locale === "vi" ? "Tài khoản" : "Account"}</span>
                  <ChevronDown size={13} />
                </summary>
                <div
                  className={styles.accountMenu}
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a")
                    )
                      accountMenu.current?.removeAttribute("open");
                  }}
                >
                  <UserNavigation locale={locale} viewer={viewer} />
                </div>
              </details>
            ) : (
              <UserNavigation locale={locale} viewer={viewer} />
            )}
          </div>
          <div
            className={styles.locale}
            aria-label={locale === "vi" ? "Ngôn ngữ" : "Language"}
          >
            {(["vi", "en"] as const).map((language, i) => (
              <span key={language}>
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    style={{ marginRight: 8, opacity: 0.3 }}
                  >
                    /
                  </span>
                )}
                <Link
                  href={languageHref(language)}
                  hrefLang={language}
                  onClick={() => {
                    document.cookie = `cinereserve-locale=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
                    setOpen(false);
                  }}
                  aria-current={locale === language ? "true" : undefined}
                >
                  {language.toUpperCase()}
                </Link>
              </span>
            ))}
          </div>
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-controls="main-navigation"
            aria-expanded={open}
            aria-label={
              locale === "vi" ? "Mở hoặc đóng menu" : "Toggle navigation"
            }
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
