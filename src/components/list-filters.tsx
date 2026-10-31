"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

/**
 * The filter bar above a list: its boxes and menus live in the address, so Back, reload and auto-refresh keep
 * the view. A menu applies as soon as it changes; the search box on Enter. `keep` carries the list's other
 * parameters (set by chips or column headers). Applying filters goes back to page 1. Give it a `key` that
 * changes with the address, so its menus show the current filters after Back or "Clear filters".
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
  function apply(form: HTMLFormElement) {
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
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) apply(e.currentTarget);
      }}
    >
      {children}
    </form>
  );
}
