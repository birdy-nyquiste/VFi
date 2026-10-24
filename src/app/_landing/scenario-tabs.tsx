"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { LandingCopy, ScenarioCopy } from "./copy";

type Id = ScenarioCopy["id"];

/** The three scenarios as tabs: facts on the left, a picture of the product doing it on the right. */
export function ScenarioTabs({ copy, speakers }: { copy: LandingCopy["scenarios"]; speakers: { caller: string; assistant: string } }) {
  const [active, setActive] = useState<Id>("reception");
  const base = useId();
  const items = copy.items as ScenarioCopy[];
  const current = items.find((s) => s.id === active) ?? items[0];

  // Arrow keys move between tabs, as the ARIA tabs pattern expects.
  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = items.findIndex((s) => s.id === active);
    const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
    setActive(next.id);
    document.getElementById(`${base}-tab-${next.id}`)?.focus();
  }

  const facts = [
    { label: copy.labels.task, body: current.task },
    { label: copy.labels.setup, body: current.setup },
    { label: copy.labels.example, body: current.example },
    { label: copy.labels.team, body: current.team },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="max-w-[640px] text-[34px] font-light leading-10 tracking-[-0.035em] sm:text-[44px] sm:leading-[50px]">{copy.title}</h2>
        <div role="tablist" aria-label={copy.title} className="flex flex-wrap gap-1.5 rounded-full bg-stone-100 p-1">
          {items.map((s) => {
            const on = s.id === active;
            return (
              <button
                key={s.id}
                id={`${base}-tab-${s.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${base}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(s.id)}
                onKeyDown={onKey}
                className={`h-9 rounded-full px-4 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${on ? "bg-stone-900 text-white" : "text-stone-700 hover:text-stone-900"}`}
              >
                {s.tab}
              </button>
            );
          })}
        </div>
      </div>

      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${current.id}`} className="flex flex-wrap items-stretch gap-6">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-7 py-2">
          <h3 className="text-[26px] font-light leading-[34px] tracking-[-0.02em] [text-wrap:balance] sm:text-[30px] sm:leading-[38px]">{current.headline}</h3>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5 border-t border-stone-200 pt-4">
                <dt className="text-[13px] text-stone-500">{f.label}</dt>
                <dd className="text-[15px] leading-[23px]">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex min-h-[380px] min-w-0 flex-[1_1_420px] items-center justify-center rounded-[28px] bg-stone-100 p-5 sm:p-7">
          {current.id === "reception" && <ReceptionCard copy={copy.reception} />}
          {current.id === "qa" && <QaCard copy={copy.qa} speakers={speakers} />}
          {current.id === "outreach" && <OutreachCard copy={copy.outreach} />}
        </div>
      </div>
      <p className="text-xs text-stone-500">{copy.note}</p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "amber" | "teal"; children: string }) {
  const cls = tone === "amber" ? ["bg-amber-50 text-amber-800", "bg-amber-500"] : ["bg-emerald-50 text-emerald-700", "bg-emerald-500"];
  return (
    <span className={`inline-flex h-[26px] items-center gap-1.5 self-start rounded-full px-2.5 text-xs ${cls[0]}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${cls[1]}`} />
      {children}
    </span>
  );
}

const card = "w-full max-w-[400px] rounded-[20px] border border-stone-200 bg-white p-[22px] shadow-[0_12px_32px_rgba(11,11,12,0.06)]";

function ReceptionCard({ copy }: { copy: LandingCopy["scenarios"]["reception"] }) {
  // Illustration: the sample details stay in English, as a US caller would give them.
  const rows: [string, string][] = [
    [copy.name, "Marcus Bell"],
    [copy.company, "Bell & Rowe Interiors"],
    [copy.need, "Distribution partnership in the Midwest"],
    [copy.callback, "+1 (312) 555-0187"],
  ];
  return (
    <div className={`${card} flex flex-col gap-3.5`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{copy.title}</span>
        <span className="text-xs tabular-nums text-stone-500">3:41 · {copy.inbound}</span>
      </div>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-stone-500">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <Pill tone="amber">{copy.followUp}</Pill>
    </div>
  );
}

function QaCard({ copy, speakers }: { copy: LandingCopy["scenarios"]["qa"]; speakers: { caller: string; assistant: string } }) {
  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-[20px] border border-stone-200 bg-white px-5 py-[18px]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{copy.title}</span>
          <span className="inline-flex h-6 items-center rounded-full bg-stone-900 px-2.5 text-xs text-white">{copy.strict}</span>
        </div>
        {["Company profile.pdf", "Product catalog 2026.pdf", "Partner FAQ"].map((name) => (
          <div key={name} className="flex justify-between text-sm">
            <span>{name}</span>
            <span className="text-xs text-emerald-700">{copy.ready}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 rounded-[20px] border border-stone-200 bg-white px-5 py-[18px] text-sm leading-[21px]">
        <p>
          <span className="text-stone-500">{speakers.caller} · </span>Do you offer net-60 payment terms?
        </p>
        <p>
          <span className="text-emerald-700">{speakers.assistant} · </span>I can&apos;t confirm that, so I&apos;ll have the team follow up. What&apos;s the best email for you?
        </p>
        <Pill tone="amber">{copy.toConfirm}</Pill>
      </div>
    </div>
  );
}

function OutreachCard({ copy }: { copy: LandingCopy["scenarios"]["outreach"] }) {
  return (
    <div className={`${card} flex flex-col gap-3.5`}>
      <span className="text-sm font-medium">{copy.title}</span>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-stone-500">{copy.number}</span>
        <div className="flex h-[42px] items-center rounded-xl border border-stone-300 px-3 text-sm tabular-nums">+1 (646) 555-0119</div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-stone-500">{copy.goal}</span>
        <div className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm leading-[21px]">
          Confirm a 30-minute call with Priya next week and offer Tuesday or Thursday afternoon.
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <Pill tone="teal">{copy.confirmed}</Pill>
        <span aria-hidden className="inline-flex h-[38px] items-center rounded-full bg-stone-900 px-[18px] text-sm text-white">
          {copy.call}
        </span>
      </div>
    </div>
  );
}
