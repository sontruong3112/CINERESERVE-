"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import {
  staffCopy,
  type StaffRow,
  type StaffDirectory,
} from "@/lib/admin/staff-shared";
import styles from "./admin.module.css";
import extra from "./staff-manager.module.css";

export function StaffManager({
  items,
  cinemas,
  locale,
  children,
}: Pick<StaffDirectory, "items" | "cinemas"> & {
  locale: Locale;
  children?: ReactNode;
}) {
  const t = staffCopy[locale],
    router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState<StaffRow | null>(null),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  const working = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const active = cinemas.filter((c) => c.active);
  function close() {
    if (working.current) return;
    setOpen(false);
    setPassword("");
    setShowPassword(false);
    setError("");
  }
  function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    setPassword(
      Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
    );
    setShowPassword(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current) return;
    const data = new FormData(event.currentTarget);
    working.current = true;
    setBusy(true);
    setError("");
    setCreated(null);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          cinemaId: data.get("cinemaId"),
          temporaryPassword: password,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          response.status >= 500
            ? t.uncertain
            : t.errors[result.error] || t.errors.SERVER_ERROR,
        );
        return;
      }
      setCreated(result.staff);
      setOpen(false);
      setPassword("");
      setShowPassword(false);
      form.current?.reset();
      router.refresh();
    } catch {
      setError(t.uncertain);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className={styles.title}>
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button
          type="button"
          className="button buttonGold"
          disabled={busy || !active.length}
          onClick={() => {
            if (open) close();
            else {
              setOpen(true);
              setError("");
              setCreated(null);
            }
          }}
        >
          {open ? t.close : t.create}
        </button>
      </div>
      {!active.length && <p className={styles.error}>{t.noCinema}</p>}
      {created && (
        <div role="status" className={extra.created}>
          <strong>{t.created}</strong>
          <p>
            {created.name} · {created.email} · {created.cinema?.name}
          </p>
          <Link
            href={`/${locale}/admin/staff?q=${encodeURIComponent(created.email)}`}
          >
            {t.filter} →
          </Link>
        </div>
      )}
      {open && (
        <section className={styles.editor}>
          <h2>{t.create}</h2>
          <p className={styles.muted}>{t.requirement}</p>
          <form
            className={styles.form}
            ref={form}
            onSubmit={submit}
            autoComplete="off"
          >
            <fieldset disabled={busy}>
              <label>
                {t.name}
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="off"
                />
              </label>
              <label>
                {t.email}
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={254}
                  autoComplete="off"
                />
              </label>
              <label>
                {t.cinema}
                <select name="cinemaId" required defaultValue="">
                  <option value="" disabled>
                    {t.choose}
                  </option>
                  {active.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={extra.password}>
                <label htmlFor="staff-temporary-password">{t.password}</label>
                <input
                  id="staff-temporary-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  aria-describedby="staff-password-hint"
                />
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? t.hide : t.show}
                  </button>
                  <button type="button" onClick={generate}>
                    {t.generate}
                  </button>
                </div>
                <small id="staff-password-hint">{t.passwordHint}</small>
              </div>
            </fieldset>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button
                type="submit"
                className="button buttonGold"
                disabled={busy || !active.length}
              >
                {busy ? t.saving : t.save}
              </button>
              <button
                type="button"
                className="button buttonOutline"
                onClick={close}
                disabled={busy}
              >
                {t.close}
              </button>
            </div>
          </form>
        </section>
      )}
      {children}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.email}</th>
              <th>{t.cinema}</th>
              <th>{t.state}</th>
              <th>{t.firstLogin}</th>
              <th>{t.createdAt}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((staff) => (
              <tr key={staff.id}>
                <th scope="row" className={extra.name}>
                  {staff.name}
                </th>
                <td>{staff.email}</td>
                <td>
                  {staff.cinema?.name || t.unassigned}
                  {staff.cinema && !staff.cinema.active && (
                    <small className={extra.warning}>{t.inactiveCinema}</small>
                  )}
                </td>
                <td>
                  <span
                    className={extra.state}
                    data-active={staff.status === "ACTIVE"}
                  >
                    {staff.status === "ACTIVE" ? t.active : t.locked}
                  </span>
                </td>
                <td>{staff.mustChangePassword ? t.required : t.ready}</td>
                <td>
                  {new Intl.DateTimeFormat(
                    locale === "vi" ? "vi-VN" : "en-GB",
                    { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" },
                  ).format(new Date(staff.createdAt))}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={6}>{t.empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
