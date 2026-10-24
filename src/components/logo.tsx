/**
 * The VFi mark: five voice bars dipping into a V, the middle one in signal teal. Bars take the
 * text color, so the mark works on light and dark grounds.
 */
export function LogoMark({ className = "h-6 w-6", signal = "#0e9aa7" }: { className?: string; signal?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`shrink-0 ${className}`}>
      <rect x="3" y="5" width="4.6" height="21" rx="2.3" fill="currentColor" />
      <rect x="10.4" y="9.5" width="4.6" height="21" rx="2.3" fill="currentColor" />
      <rect x="17.7" y="14" width="4.6" height="21" rx="2.3" fill={signal} />
      <rect x="25" y="9.5" width="4.6" height="21" rx="2.3" fill="currentColor" />
      <rect x="32.4" y="5" width="4.6" height="21" rx="2.3" fill="currentColor" />
    </svg>
  );
}

/** Mark and wordmark. The word is real text, so it reads as "VFi" to screen readers and search. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: ["h-5 w-5", "text-lg"], md: ["h-6 w-6", "text-[22px]"], lg: ["h-8 w-8", "text-3xl"] }[size];
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={s[0]} />
      <span className={`${s[1]} font-medium leading-none tracking-[-0.05em]`}>VFi</span>
    </span>
  );
}

/** Three bars that rise and fall in a teal disc: something is live (a call in progress). */
export function LiveIndicator({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center gap-[3px] rounded-full bg-emerald-500 ${className}`}>
      <span className="h-3.5 w-[3px] animate-vfi-bar rounded-sm bg-white" />
      <span className="h-[19px] w-[3px] animate-vfi-bar rounded-sm bg-white [animation-delay:150ms]" />
      <span className="h-3.5 w-[3px] animate-vfi-bar rounded-sm bg-white [animation-delay:300ms]" />
    </span>
  );
}
