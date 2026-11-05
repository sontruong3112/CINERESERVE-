"use client";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n";
export function AssistantTrigger({ locale }: { locale: Locale }) {
  return (
    <button
      type="button"
      className="button buttonOutline"
      onClick={() =>
        window.dispatchEvent(new Event("cinereserve:open-assistant"))
      }
    >
      <Sparkles size={16} />
      {locale === "vi" ? "Tìm phim cùng AI" : "Find a film with AI"}
      <ArrowUpRight size={15} />
    </button>
  );
}
