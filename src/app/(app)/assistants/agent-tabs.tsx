"use client";

import { useLocale, useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { buttonClass, focusRing } from "@/components/ui";
import { AGENT_TABS, type AgentTab } from "@/lib/agent-tabs";

/**
 * The Assistant page in tabs (SPEC §5.1). Every settings tab stays rendered inside the one form, only hidden,
 * so switching tabs keeps edits and one Save saves them all. The Knowledge Base tab sits outside that form:
 * it saves as sources are added.
 */
const TabsContext = createContext<{
  tab: AgentTab;
  tabs: readonly AgentTab[];
  select: (tab: AgentTab) => void;
  unsaved: ReadonlySet<AgentTab>;
  setUnsaved: (tabs: ReadonlySet<AgentTab>) => void;
} | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Agent tab pieces must be inside AgentTabs");
  return ctx;
}

export function AgentTabs({ initial, knowledge, children }: { initial: AgentTab; knowledge: boolean; children: ReactNode }) {
  const tabs: readonly AgentTab[] = knowledge ? AGENT_TABS : AGENT_TABS.filter((t) => t !== "knowledge");
  const [tab, setTab] = useState(tabs.includes(initial) ? initial : "identity");
  const [unsaved, setUnsaved] = useState<ReadonlySet<AgentTab>>(new Set());
  const select = (next: AgentTab) => {
    setTab(next);
    // Keep the open tab in the address for reloads and links, without loading the page again.
    const url = new URL(window.location.href);
    if (next === "identity") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };
  return <TabsContext.Provider value={{ tab, tabs, select, unsaved, setUnsaved }}>{children}</TabsContext.Provider>;
}

export function AgentTabList({ labels }: { labels: Record<AgentTab, string> }) {
  const t = useTranslations("agents");
  const { tab, tabs, select, unsaved } = useTabs();
  const refs = useRef(new Map<AgentTab, HTMLButtonElement>());
  // Arrow keys move between tabs, as in any tab list.
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    select(next);
    refs.current.get(next)?.focus();
  };
  return (
    <div role="tablist" aria-label={t("settingsTabs")} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-stone-200 [scrollbar-width:none]">
      {tabs.map((id) => (
        <button
          key={id}
          ref={(el) => {
            if (el) refs.current.set(id, el);
          }}
          type="button"
          role="tab"
          id={`agent-tab-${id}`}
          aria-controls={`agent-panel-${id}`}
          aria-selected={tab === id}
          tabIndex={tab === id ? 0 : -1}
          onClick={() => select(id)}
          className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3.5 py-2.5 text-sm ${focusRing} ${tab === id ? "border-stone-900 font-medium text-stone-900" : "border-transparent text-stone-600 hover:text-stone-900"}`}
        >
          {labels[id]}
          {unsaved.has(id) && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600">
              <span className="sr-only">{t("unsavedTab")}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AgentTabPanel({ tab: id, children }: { tab: AgentTab; children: ReactNode }) {
  const { tab } = useTabs();
  return (
    <div role="tabpanel" id={`agent-panel-${id}`} aria-labelledby={`agent-tab-${id}`} data-agent-tab={id} hidden={tab !== id}>
      {children}
    </div>
  );
}

/** Tells the save which tab was open, so the page reopens on it. */
export function AgentTabField() {
  return <input type="hidden" name="tab" value={useTabs().tab} />;
}

/**
 * Around the settings panels: notes which tabs have unsaved edits (by comparing each tab's fields with how they
 * loaded, so undoing an edit clears it), and when the browser refuses to save because a field on a hidden tab
 * is empty or invalid, opens that tab so the browser can point at the field.
 */
export function AgentEditTracker({ children }: { children: ReactNode }) {
  const { tab, select, setUnsaved } = useTabs();
  const ref = useRef<HTMLDivElement>(null);
  const loaded = useRef<Map<AgentTab, string> | null>(null);
  const current = useRef({ tab, select, setUnsaved });
  current.current = { tab, select, setUnsaved };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    loaded.current = snapshot(root);
    let timer: ReturnType<typeof setTimeout> | undefined;
    // After the event, so fields that keep their value in React state (call-result fields) have updated.
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const now = snapshot(root);
        current.current.setUnsaved(new Set([...now].filter(([id, v]) => loaded.current?.get(id) !== v).map(([id]) => id)));
      });
    };
    let switched = false;
    const onInvalid = (e: Event) => {
      const panel = (e.target as Element).closest<HTMLElement>("[data-agent-tab]")?.dataset.agentTab as AgentTab | undefined;
      // Only the first invalid field of a save, and only if it's on another tab.
      if (!panel || switched) return;
      switched = true;
      setTimeout(() => (switched = false));
      if (panel !== current.current.tab) flushSync(() => current.current.select(panel));
    };
    for (const type of ["input", "change", "click"]) root.addEventListener(type, check);
    root.addEventListener("invalid", onInvalid, true);
    return () => {
      clearTimeout(timer);
      for (const type of ["input", "change", "click"]) root.removeEventListener(type, check);
      root.removeEventListener("invalid", onInvalid, true);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}

/** Each tab's named fields and their values, as one string per tab. */
function snapshot(root: HTMLElement): Map<AgentTab, string> {
  const out = new Map<AgentTab, string[]>();
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[name], select[name], textarea[name]").forEach((el) => {
    const id = el.closest<HTMLElement>("[data-agent-tab]")?.dataset.agentTab as AgentTab | undefined;
    if (!id) return;
    const value = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? String(el.checked) : el.value;
    out.set(id, [...(out.get(id) ?? []), `${el.name}=${value}`]);
  });
  return new Map([...out].map(([id, v]) => [id, v.join("\n")]));
}

/** "Unsaved changes on Instructions and Ending calls", beside Save. */
export function UnsavedNote({ labels }: { labels: Record<AgentTab, string> }) {
  const t = useTranslations("agents");
  const locale = useLocale();
  const { tabs, unsaved } = useTabs();
  if (unsaved.size === 0) return null;
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(tabs.filter((id) => unsaved.has(id)).map((id) => labels[id]));
  return (
    <p className="flex items-center gap-1.5 text-sm text-stone-600">
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
      {t("unsavedOn", { tabs: names })}
    </p>
  );
}

/** Delete, in the bar beside Save but submitting its own form (`formId`), which sits outside the settings form. */
export function DeleteAgentButton({ formId, confirm, children }: { formId: string; confirm: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      form={formId}
      className={buttonClass("danger")}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
