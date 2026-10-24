import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Messages } from "@/i18n/messages";
import { cloneElement, isValidElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Link to the list a detail page came from, e.g. { href: "/calls", label: "All calls" }. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link
            href={back.href}
            className="group -ml-1 mb-2 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-x-0.5">
              <path fillRule="evenodd" d="M12.8 4.2a.75.75 0 0 1 0 1.06L8.06 10l4.74 4.74a.75.75 0 1 1-1.06 1.06l-5.27-5.27a.75.75 0 0 1 0-1.06l5.27-5.27a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            {back.label}
          </Link>
        )}
        <h1 className="text-[30px] font-normal leading-9 tracking-[-0.025em]">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-stone-200 bg-white p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[15px] font-medium text-stone-900">{children}</h2>;
}

/** Pill and dot colors. Teal (green, blue) is a live or ready state; nothing else uses it. */
const tones = {
  green: ["bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  amber: ["bg-amber-50 text-amber-800", "bg-amber-500"],
  red: ["bg-red-50 text-red-700", "bg-red-600"],
  gray: ["bg-stone-100 text-stone-600", "bg-stone-400"],
  blue: ["bg-sky-50 text-sky-700", "bg-sky-500"],
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  // Never wraps ("↙ entrante", "đã hoàn tất"): in a tight row the text beside it gives way instead.
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs ${tones[tone][0]}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tones[tone][1]}`} />
      {children}
    </span>
  );
}

type Status = keyof Messages["status"];

export function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("status");
  const tone: Record<Status, keyof typeof tones> = {
    active: "green",
    ready: "green",
    completed: "gray",
    succeeded: "gray",
    answered: "blue",
    initiated: "blue",
    pending: "amber",
    processing: "amber",
    syncing: "amber",
    failed: "red",
    rejected: "red",
    released: "gray",
  };
  return <Badge tone={tone[status]}>{t(status)}</Badge>;
}

/** Inbound or outbound, as an arrow in a gray disc; `label` is what screen readers hear. */
export function DirectionIcon({ inbound, label }: { inbound: boolean; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-3.5 w-3.5">
        <path d={inbound ? "M17 7 7 17M15 17H7V9" : "M7 17 17 7M9 7h8v8"} />
      </svg>
    </span>
  );
}

/** A stock voice's gender as the catalog gives it ("female", "male"); unknown values show as-is. */
export function VoiceGender({ gender }: { gender: string }) {
  const t = useTranslations("gender");
  return gender === "female" || gender === "male" ? t(gender) : gender;
}

const btn = {
  primary: "bg-stone-900 text-white hover:bg-stone-700 disabled:bg-stone-400",
  secondary: "bg-white text-stone-900 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 disabled:text-stone-400",
  danger: "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:text-red-300",
};

/** Pill buttons. `lg` is for the landing and sign-in pages; the Dashboard uses the default size. */
export function buttonClass(variant: keyof typeof btn = "primary", size: "md" | "lg" = "md") {
  const sized = size === "lg" ? "min-h-12 px-6 text-base" : "min-h-10 px-[18px] text-sm";
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full py-1.5 transition-colors disabled:cursor-not-allowed ${focusRing} ${sized} ${btn[variant]}`;
}

export function ButtonLink({ variant = "primary", ...props }: ComponentProps<typeof Link> & { variant?: keyof typeof btn }) {
  return <Link {...props} className={buttonClass(variant)} />;
}

export const inputClass =
  "block w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-stone-500 focus:border-stone-500 focus:ring-2 focus:ring-emerald-100";

/**
 * Keyboard focus ring for links and buttons drawn without the browser's outline. Signal teal keeps
 * 3:1 against white, the canvas and the gray rows (WCAG 1.4.11); the offset keeps it off dark fills.
 */
export const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** What Field puts on its control: the id its label points at, and the hint that describes it. */
export interface FieldControl {
  id: string;
  "aria-describedby"?: string;
}

/**
 * A label, its control and an optional hint. The label names only the control and the hint is its
 * description, so screen readers don't read the hint (or a button beside the control) as part of the
 * name. A lone <input>, <select> or <textarea> gets the ids by itself; anything more (a control with
 * buttons beside it, a file picker component) is a function that puts `control` on the control.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode | ((control: FieldControl) => ReactNode);
}) {
  const id = useId();
  const control: FieldControl = { id, "aria-describedby": hint ? `${id}-hint` : undefined };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-900">
        {label}
      </label>
      {typeof children === "function" ? children(control) : withControl(children, control)}
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] leading-[19px] text-stone-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function withControl(children: ReactNode, control: FieldControl) {
  const isControl = isValidElement(children) && (children.type === "input" || children.type === "select" || children.type === "textarea");
  return isControl ? cloneElement(children as ReactElement<FieldControl>, control) : children;
}

/** A labelled group of controls, e.g. radio cards: a <fieldset>, so no label ends up inside another. */
export function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-900">{legend}</legend>
      <div className="mt-1.5">{children}</div>
    </fieldset>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[20px] border border-dashed border-stone-300 bg-white/60 p-10 text-center text-[15px] text-stone-600">{children}</div>;
}

export function Notice({ tone = "amber", children }: { tone?: "amber" | "red" | "green" | "blue"; children: ReactNode }) {
  const cls = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
  }[tone];
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-[21px] ${cls}`}>{children}</div>;
}

/** Whether `path` is `href` or a page under it. */
export function isActivePath(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

/** Underlined tab links; the active one is marked. `scroll={false}` keeps the page in place when switching. */
export function Tabs({ tabs }: { tabs: { href: string; label: ReactNode; active: boolean }[] }) {
  return (
    <nav className="flex gap-1 border-b border-stone-200">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          scroll={false}
          aria-current={t.active ? "page" : undefined}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${t.active ? "border-stone-900 font-medium text-stone-900" : "border-transparent text-stone-600 hover:text-stone-900"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
