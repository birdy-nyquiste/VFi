import Link from "next/link";
import { useTranslations } from "next-intl";
import { PAGE_SIZE } from "@/lib/list-params";
import { focusRing } from "./ui";

/** Page numbers to offer: the first, the last, and the ones around the current page; null is a gap. */
function pageNumbers(page: number, last: number): (number | null)[] {
  const wanted = [...new Set([1, page - 1, page, page + 1, last])].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  return wanted.flatMap((p, i) => (i > 0 && p - wanted[i - 1] > 1 ? [null, p] : [p]));
}

/** The footer of a paged list: which rows are shown, out of how many, and links to the other pages. */
export function Pagination({ page, total, href }: { page: number; total: number; href: (page: number) => string }) {
  const t = useTranslations("common");
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const cell = `inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] px-2 tabular-nums ${focusRing}`;
  const arrow = (target: number, label: string, glyph: string) =>
    target < 1 || target > last ? (
      <span className={`${cell} text-stone-300`} aria-hidden>
        {glyph}
      </span>
    ) : (
      <Link href={href(target)} scroll={false} aria-label={label} className={`${cell} text-stone-600 hover:text-stone-900`}>
        {glyph}
      </Link>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-6 py-3 text-[13px] text-stone-500">
      <span className="tabular-nums">{t("listRange", { from, to, total })}</span>
      {last > 1 && (
        <nav aria-label={t("pages")} className="flex items-center gap-1">
          {arrow(page - 1, t("previousPage"), "‹")}
          {pageNumbers(page, last).map((p, i) =>
            p === null ? (
              <span key={`gap${i}`} className="px-1" aria-hidden>
                …
              </span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                scroll={false}
                aria-current={p === page ? "page" : undefined}
                className={`${cell} ${p === page ? "border border-stone-300 font-medium text-stone-900" : "text-stone-600 hover:text-stone-900"}`}
              >
                {p}
              </Link>
            ),
          )}
          {arrow(page + 1, t("nextPage"), "›")}
        </nav>
      )}
    </div>
  );
}

/**
 * A column header that sorts the list by that column: the first click sorts it high to low (or newest
 * first), a click on the sorted column flips it. `current` says how the column is sorted now, if it is.
 */
export function SortHeader({
  label,
  current,
  href,
  align = "left",
}: {
  label: string;
  current?: "asc" | "desc";
  href: string;
  align?: "left" | "right";
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex items-center gap-1 rounded-md hover:text-stone-900 ${current ? "text-stone-900" : ""} ${align === "right" ? "flex-row-reverse" : ""} ${focusRing}`}
    >
      {label}
      <span aria-hidden className={current ? "" : "text-stone-300"}>
        {current === "asc" ? "↑" : current === "desc" ? "↓" : "↕"}
      </span>
    </Link>
  );
}
