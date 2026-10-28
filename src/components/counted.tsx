"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";

/**
 * A text box with its length and limit under it ("42 / 200"), so the limit is never a surprise.
 * Wraps one <input> or <textarea> that has a maxLength. It reads the box itself, so it works for
 * controlled and uncontrolled boxes, text inserted by code, and forms that reset. It never looks at
 * its children's props (from a server component they can arrive as lazy references, not elements):
 * inside a Field, the Field gives the box its label's id, and the counter is linked to the box here
 * through the DOM. `className` is for the wrapper, e.g. a grid column span.
 */
export function Counted({ children, className }: { children: ReactNode; className?: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const counterId = useId();
  const locale = useLocale() as Locale;
  const [count, setCount] = useState<{ length: number; max: number } | null>(null);

  const read = useCallback(() => {
    const box = wrapper.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (box && box.maxLength > 0) setCount((c) => (c?.length === box.value.length && c.max === box.maxLength ? c : { length: box.value.length, max: box.maxLength }));
  }, []);

  // After every render, for boxes whose value comes from state.
  useLayoutEffect(read);

  // Add the counter to the box's description, keeping what the box already has (e.g. a Field's hint).
  // Every render, since React rewrites the attribute whenever the box's own value for it changes.
  useLayoutEffect(() => {
    const box = wrapper.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (!box || !count) return;
    const ids = (box.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    if (!ids.includes(counterId)) box.setAttribute("aria-describedby", [...ids, counterId].join(" "));
  });

  // Typing, and forms that clear themselves after a successful submit.
  useEffect(() => {
    const box = wrapper.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (!box) return;
    const onReset = () => setTimeout(read);
    box.addEventListener("input", read);
    box.form?.addEventListener("reset", onReset);
    return () => {
      box.removeEventListener("input", read);
      box.form?.removeEventListener("reset", onReset);
    };
  }, [read]);

  return (
    <div ref={wrapper} className={className}>
      {children}
      {count && (
        <p
          id={counterId}
          className={`mt-1 text-right text-xs tabular-nums ${count.length >= count.max * 0.9 ? "text-amber-700" : "text-stone-500"}`}
        >
          {formatNumber(count.length, locale)} / {formatNumber(count.max, locale)}
        </p>
      )}
    </div>
  );
}
