"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MessageCircle,
  Send,
  Sparkles,
  X,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import {
  chatCopy,
  type ChatMessage,
  type ChatReply,
  type ChatContext,
} from "@/lib/chat/shared";
import styles from "./movie-assistant.module.css";
import { readChatStream } from "@/lib/chat/stream";

type Turn = { question: string; reply?: ChatReply; error?: string };
export function MovieAssistant({ locale }: { locale: Locale }) {
  const pathname = usePathname(),
    t = chatCopy[locale];
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(""),
    [turns, setTurns] = useState<Turn[]>([]),
    [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const context = useRef<ChatContext | undefined>(undefined);
  const [stage, setStage] = useState<"understanding" | "searching">(
    "understanding",
  );
  const field = useRef<HTMLTextAreaElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    scroll = useRef<HTMLDivElement>(null),
    controller = useRef<AbortController | null>(null);
  const hidden = /\/(admin|staff|account|showtimes|login|register)(\/|$)/.test(
    pathname,
  );
  useEffect(() => {
    if (open && !hidden) field.current?.focus();
  }, [open, hidden]);
  useEffect(() => {
    scroll.current?.scrollTo({
      top: scroll.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, busy]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("cinereserve:open-assistant", show);
    return () => window.removeEventListener("cinereserve:open-assistant", show);
  }, []);
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  function reset() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setTurns([]);
    context.current = undefined;
    setDraft("");
    field.current?.focus();
  }
  async function send(question = draft) {
    question = question.trim();
    if (!question || question.length > 1200 || busy) return;
    const history: ChatMessage[] = turns
      .filter((turn) => turn.reply || turn.error)
      .slice(-4)
      .flatMap((turn) => [
        { role: "user" as const, content: turn.question },
        {
          role: "assistant" as const,
          content: (
            (turn.reply?.text ||
              (locale === "vi"
                ? "Lần trả lời trước chưa hoàn tất."
                : "The previous response did not complete.")) +
            "\n" +
            (turn.reply?.movies
              .map((m) => `${m.title}: ${m.reason || ""}`)
              .join("\n") || "")
          ).slice(0, 1200),
        },
      ]);
    while (
      history.reduce(
        (sum, message) => sum + message.content.length,
        question.length,
      ) > 7000
    )
      history.splice(0, 2);
    const pending = { question },
      abort = new AbortController();
    controller.current = abort;
    setTurns((current) => [...current.slice(-19), pending]);
    setDraft("");
    setBusy(true);
    setStage("understanding");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          locale,
          messages: [...history, { role: "user", content: question }],
          ...(context.current ? { context: context.current } : {}),
        }),
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(40000)]),
      });
      let result: ChatReply & { error?: string };
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("application/x-ndjson")
      ) {
        result = await readChatStream(response, (value) => {
          if (controller.current === abort) setStage(value);
        });
      } else result = await response.json();
      if (controller.current !== abort) return;
      if (response.ok && result.context) context.current = result.context;
      setTurns((current) => [
        ...current.slice(0, -1),
        response.ok
          ? { question, reply: result as ChatReply }
          : { question, error: result.error || "SERVER_ERROR" },
      ]);
    } catch (error) {
      if (controller.current !== abort || abort.signal.aborted) return;
      setTurns((current) => [
        ...current.slice(0, -1),
        {
          question,
          error:
            error instanceof Error && error.name === "TimeoutError"
              ? "TIMEOUT"
              : error instanceof Error && t.errors[error.message]
                ? error.message
                : "SERVER_ERROR",
        },
      ]);
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setBusy(false);
        field.current?.focus();
      }
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void send();
  }
  if (hidden) return null;
  return (
    <aside className={styles.widget} aria-label={t.title}>
      {open && (
        <section
          className={`${styles.panel} ${expanded ? styles.expanded : ""}`}
          role="dialog"
          aria-modal="false"
          aria-labelledby="movie-assistant-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <header className={styles.header}>
            <span className={styles.icon}>
              <Sparkles size={20} />
            </span>
            <div>
              <h2 id="movie-assistant-title">{t.title}</h2>
              <p>{t.subtitle}</p>
            </div>
            <button type="button" onClick={close} aria-label={t.close}>
              <X size={20} />
            </button>
          </header>
          <div className={styles.toolbar}>
            <span>GEMINI · CINERESERVE</span>
            <button
              type="button"
              aria-pressed={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {locale === "vi"
                ? expanded
                  ? "Thu gọn"
                  : "Mở rộng"
                : expanded
                  ? "Compact"
                  : "Expand"}
            </button>
            <button type="button" onClick={reset}>
              <RotateCcw size={13} />
              {t.reset}
            </button>
          </div>
          <div
            className={styles.messages}
            ref={scroll}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className={styles.welcome}>
              <Sparkles size={21} />
              <p>{t.welcome}</p>
            </div>
            {!turns.length && (
              <div className={styles.suggestions}>
                {t.suggestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void send(question)}
                  >
                    {question}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            )}
            {turns.map((turn, index) => (
              <div key={index} className={styles.turn}>
                <p className={styles.question}>{turn.question}</p>
                {turn.error && (
                  <div className={styles.error} role="alert">
                    {t.errors[turn.error] || t.errors.SERVER_ERROR}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void send(turn.question)}
                    >
                      {t.retry}
                    </button>
                  </div>
                )}
                {turn.reply && (
                  <div className={styles.answer}>
                    <span className={styles.source}>
                      <Sparkles size={12} />
                      {turn.reply.mode === "conversation"
                        ? t.knowledge
                        : turn.reply.source === "gemini"
                          ? t.ai
                          : t.guide}
                    </span>
                    <p className={styles.text}>{turn.reply.text}</p>
                    {turn.reply.filters && (
                      <p className={styles.filters}>
                        {t.filters}:{" "}
                        {[
                          ...turn.reply.filters.genres,
                          turn.reply.filters.cinema,
                          turn.reply.filters.date,
                          turn.reply.filters.age !== null
                            ? `${t.age} ${turn.reply.filters.age}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          (locale === "vi" ? "Chưa giới hạn" : "No filters")}
                      </p>
                    )}
                    {turn.reply.movies.map((movie) => (
                      <article className={styles.movie} key={movie.id}>
                        <Link
                          href={movie.href}
                          onClick={close}
                          className={styles.movieTitle}
                        >
                          {movie.title}
                          <ArrowUpRight size={15} />
                        </Link>
                        <span className={styles.meta}>
                          {movie.age} · {movie.duration} {t.minute} ·{" "}
                          {movie.genres.join(", ")}
                        </span>
                        <p>{movie.reason || movie.synopsis}</p>
                        {movie.sessions.length ? (
                          <div className={styles.sessions}>
                            {movie.sessions.map((session) => (
                              <Link
                                href={session.href}
                                onClick={close}
                                key={session.id}
                              >
                                <strong>
                                  {new Intl.DateTimeFormat(
                                    locale === "vi" ? "vi-VN" : "en-GB",
                                    {
                                      timeZone: "Asia/Ho_Chi_Minh",
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    },
                                  ).format(new Date(session.startsAt))}
                                </strong>
                                <span>
                                  {session.cinema} · {session.room}
                                </span>
                                <span>
                                  {t.price}:{" "}
                                  {new Intl.NumberFormat(
                                    locale === "vi" ? "vi-VN" : "en-GB",
                                  ).format(session.basePrice)}{" "}
                                  ₫ · {t.vip}:{" "}
                                  {new Intl.NumberFormat(
                                    locale === "vi" ? "vi-VN" : "en-GB",
                                  ).format(session.vipSurcharge)}{" "}
                                  ₫
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.meta}>{t.noSessions}</p>
                        )}
                      </article>
                    ))}
                    {!!turn.reply.suggestions?.length && (
                      <div className={styles.suggestions}>
                        {turn.reply.suggestions.map((question) => (
                          <button
                            type="button"
                            key={question}
                            disabled={busy}
                            onClick={() => void send(question)}
                          >
                            {question}
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                      </div>
                    )}
                    <small className={styles.meta}>
                      {t.checked}{" "}
                      {new Intl.DateTimeFormat(
                        locale === "vi" ? "vi-VN" : "en-GB",
                        {
                          timeZone: "Asia/Ho_Chi_Minh",
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          hour12: false,
                        },
                      ).format(new Date(turn.reply.checkedAt))}{" "}
                      · UTC+7
                    </small>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <p className={styles.thinking} role="status">
                <Sparkles size={14} />
                {stage === "searching" ? t.searching : t.thinking}
                <button
                  type="button"
                  onClick={() => {
                    controller.current?.abort();
                    controller.current = null;
                    setBusy(false);
                    setTurns((current) =>
                      current.map((turn, index) =>
                        index === current.length - 1
                          ? { question: turn.question, error: "CANCELLED" }
                          : turn,
                      ),
                    );
                    field.current?.focus();
                  }}
                >
                  {t.stop}
                </button>
              </p>
            )}
            <div className={styles.fallback}>
              <Link href={`/${locale}/movies`} onClick={close}>
                {t.find}
                <ArrowUpRight size={12} />
              </Link>
              <Link href={`/${locale}/policies`} onClick={close}>
                {t.policies}
              </Link>
            </div>
          </div>
          <form className={styles.composer} onSubmit={submit}>
            <label
              className={styles.inputLabel}
              htmlFor="movie-assistant-message"
            >
              {t.placeholder}
            </label>
            <div>
              <textarea
                id="movie-assistant-message"
                ref={field}
                value={draft}
                maxLength={1200}
                rows={2}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t.placeholder}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                aria-label={t.send}
                type="submit"
                disabled={busy || !draft.trim()}
              >
                <Send size={18} />
              </button>
            </div>
            <p>{t.privacy}</p>
          </form>
        </section>
      )}
      <button
        ref={launcher}
        className={styles.launcher}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.open}
      >
        <MessageCircle size={20} />
        <span>{t.open}</span>
      </button>
    </aside>
  );
}
