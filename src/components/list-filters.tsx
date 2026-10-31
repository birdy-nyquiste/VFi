"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

/**
 * The filter bar above a list: its boxes and menus live in the address, so Back, reload and auto-refresh keep
 * the view. A menu picked with the mouse applies at once; one changed from the keyboard (where arrowing through
 * it changes it at every step) applies on Enter or on leaving it, so the list doesn't reload under the user.
 * The search box applies on Enter. `keep` carries the list's other parameters (set by chips or column headers).
 * Applying filters goes back to page 1. Give it a `key` that changes with the address, so its menus show the
 * current filters after Back or "Clear filters".
 */
export function ListFilters({
  action,
  keep,
  label,
  children,
}: {
  action: string;
  keep: Record<string, string | undefined>;
  label: string;
  children: ReactNode;
}) {
  const router = useRouter();
  /** A menu being changed from the keyboard, and whether it has changed yet. */
  const typing = useRef<{ menu: HTMLSelectElement; changed: boolean } | null>(null);
  function apply(form: HTMLFormElement) {
    typing.current = null;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v.trim()) q.set(k, v.trim());
    const s = q.toString();
    router.push(s ? `${action}?${s}` : action, { scroll: false });
  }
  return (
    <form
      role="search"
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (!(e.target instanceof HTMLSelectElement)) return;
        if (e.key === "Enter" && typing.current?.changed) {
          e.preventDefault();
          apply(e.currentTarget);
        } else if (e.key !== "Tab" && e.key !== "Enter") {
          typing.current = { menu: e.target, changed: typing.current?.menu === e.target && typing.current.changed };
        }
      }}
      onChange={(e) => {
        if (!(e.target instanceof HTMLSelectElement)) return;
        if (typing.current?.menu === e.target) typing.current.changed = true;
        else apply(e.currentTarget);
      }}
      onBlur={(e) => {
        if (typing.current?.menu !== (e.target as Element)) return;
        if (typing.current.changed) apply(e.currentTarget);
        else typing.current = null;
      }}
    >
      {children}
    </form>
  );
}
