"use client";

import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";
import type { FieldControl } from "./ui";

type BoxProps = { id?: string; "aria-describedby"?: string };

/**
 * A text box with its length and limit under it ("42 / 200"), so the limit is never a surprise.
 * Wraps one <input> or <textarea> that has a maxLength. It reads the box itself, so it works for
 * controlled and uncontrolled boxes, text inserted by code, and forms that reset. Inside a Field it
 * passes the label's id on to the box. `className` is for the wrapper, e.g. a grid column span.
 */
export function Counted({
  children,
  className,
  id,
  "aria-describedby": describedBy,
}: { children: ReactElement<BoxProps>; className?: string } & Partial<FieldControl>) {
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

  const box = cloneElement(children, {
    id: id ?? children.props.id,
    "aria-describedby": [describedBy, children.props["aria-describedby"], count ? counterId : undefined].filter(Boolean).join(" ") || undefined,
  });

  return (
    <div ref={wrapper} className={className}>
      {box}
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
