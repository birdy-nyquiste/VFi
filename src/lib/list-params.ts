/** Rows per page on the lists that page: calls, conversations and billing activity. */
export const PAGE_SIZE = 15;

/**
 * A page's address parameters with one value each. A parameter given twice (`?q=1&q=2`) arrives as a list;
 * the first one is used, so a hand-edited address can't break the page.
 */
export function singleValues<K extends string>(params: Partial<Record<K, string | string[]>>): Partial<Record<K, string>> {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Partial<Record<K, string>>;
}

/** The page number in a list's address; anything that isn't a positive whole number is page 1. */
export function readPage(value: string | undefined): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}

/** `value` if it's one of `options`, otherwise undefined (a stale or hand-edited address shows everything). */
export function oneOf<T extends string>(value: string | undefined, options: readonly T[]): T | undefined {
  return options.find((o) => o === value);
}

/** The page to show: the requested one, or the last when the list got shorter (or filters changed). */
export function clampPage(page: number, total: number): number {
  return Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}

/**
 * A list's address with some of its parameters changed; an empty or undefined value removes one. Changing
 * anything but the page goes back to page 1, since the old page may no longer exist.
 */
export function listHref(path: string, current: Record<string, string | undefined>, changes: Record<string, string | undefined>): string {
  const next = { ...current, ...changes };
  if (!("page" in changes)) delete next.page;
  if (next.page === "1") delete next.page;
  const q = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** `text` for a SQL LIKE pattern, with its wildcards matched literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
