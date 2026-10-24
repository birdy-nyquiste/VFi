"use client";

import { useOptimistic, useTransition } from "react";
import { setLocaleAction } from "@/app/locale-actions";
import type { LandingLang } from "./copy";

/** EN / 中文 for the landing page; it saves the choice like the app's language picker does. */
export function LanguageToggle({ lang, label }: { lang: LandingLang; label: string }) {
  const [pending, startTransition] = useTransition();
  const [shown, show] = useOptimistic<LandingLang>(lang);
  const pick = (next: LandingLang) => {
    if (next === lang) return;
    startTransition(async () => {
      show(next);
      try {
        await setLocaleAction(next);
      } catch (err) {
        console.error(err);
      }
    });
  };
  const options: [LandingLang, string, string][] = [
    ["en", "EN", "en-US"],
    ["zh", "中文", "zh-CN"],
  ];
  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-stone-100 p-[3px]">
      {options.map(([value, text, bcp]) => (
        <button
          key={value}
          type="button"
          lang={bcp}
          aria-pressed={shown === value}
          disabled={pending}
          onClick={() => pick(value)}
          className={`h-8 min-w-11 rounded-full px-3 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait ${shown === value ? "bg-white text-stone-900 shadow-[0_1px_3px_rgba(11,11,12,0.12)]" : "text-stone-600 hover:text-stone-900"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
