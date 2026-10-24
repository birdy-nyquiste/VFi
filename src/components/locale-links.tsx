"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/locale-actions";
import { BCP47, LOCALES } from "@/i18n/locales";

/** Every interface language as an inline link row, each in its own language; the current one is plain text. */
export function LocaleLinks() {
  const locale = useLocale();
  const t = useTranslations("localeSwitcher");
  const [pending, startTransition] = useTransition();
  return (
    <ul aria-label={t("label")} className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {LOCALES.map((l, i) => (
        <li key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-stone-300">·</span>}
          {l === locale ? (
            <span lang={BCP47[l]} aria-current="true" className="px-1 text-stone-900">
              {t(l)}
            </span>
          ) : (
            <button
              type="button"
              lang={BCP47[l]}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await setLocaleAction(l);
                  } catch (err) {
                    console.error(err);
                  }
                })
              }
              className="rounded px-1 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:cursor-wait"
            >
              {t(l)}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
