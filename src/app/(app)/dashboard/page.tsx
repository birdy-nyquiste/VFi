import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveIndicator } from "@/components/logo";
import { ButtonLink, Card, CardTitle, DirectionIcon, focusRing, PageHeader, StatusBadge } from "@/components/ui";
import { formatCallerNumber, formatCents, formatDateTime, formatDuration, formatPhone } from "@/lib/format";
import { listUserAgents } from "@/server/agents";
import { requireUser } from "@/server/auth";
import { listUserCalls } from "@/server/calls";
import { listUserNumbers } from "@/server/numbers";
import { viewerTimeZone } from "@/server/time-zone";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("dashboard"))("title") };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [t, tc, tcl, tn, ts, locale] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getTranslations("calls"),
    getTranslations("numbers"),
    getTranslations("status"),
    getLocale(),
  ]);
  const tz = await viewerTimeZone();
  const [numbers, agents, recent] = await Promise.all([
    listUserNumbers(user.id),
    listUserAgents(user.id),
    listUserCalls(user.id, 5),
  ]);
  const activeNumber = numbers.find((n) => n.status === "active");
  const linkedAgent = agents.find((a) => a.id === activeNumber?.agentId);
  // Inbound calls are turned away unless the assigned agent is ready.
  const answering = linkedAgent?.status === "ready";

  const steps = [
    { done: user.balanceCents > 0, label: t("stepCredit"), href: "/account/billing" },
    { done: agents.some((a) => a.status === "ready"), label: t("stepAgent"), href: "/assistants/new" },
    { done: Boolean(activeNumber), label: t("stepNumber"), href: "/numbers" },
    { done: answering, label: t("stepConnect"), href: "/numbers" },
    { done: recent.length > 0, label: t("stepCall"), href: "/calls" },
  ];
  const allDone = steps.every((s) => s.done);

  const live = recent.find(({ call }) => call.status === "initiated" || call.status === "answered");

  return (
    <div className="space-y-6">
      {live && <AutoRefresh everyMs={3000} slowestMs={10000} />}
      <PageHeader
        title={t("title")}
        action={
          <ButtonLink href="/calls">
            <PhoneIcon />
            {t("placeCall")}
          </ButtonLink>
        }
      />

      {live && (
        <Link
          href={`/calls/${live.call.id}`}
          className={`flex flex-wrap items-center gap-4 rounded-[20px] bg-stone-900 px-5 py-4 text-white ${focusRing}`}
        >
          <LiveIndicator />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px]">
              {t("liveCall", {
                name: live.agentName ?? "—",
                number: formatCallerNumber(live.call.direction === "inbound" ? live.call.fromNumber : live.call.toNumber, tc("unknownNumber")),
              })}
            </span>
            <span className="text-[13px] text-stone-400">
              {live.call.direction === "inbound" ? tcl("directionInbound") : tcl("directionOutbound")}
              {live.call.answeredAt && (
                <>
                  {" · "}
                  <span className="tabular-nums">{formatDuration(Math.max(0, Math.floor((Date.now() - live.call.answeredAt.getTime()) / 1000)))}</span>
                </>
              )}
            </span>
          </span>
          <span className="ml-auto text-sm text-stone-300">{t("openCall")}</span>
        </Link>
      )}

      {/* Two columns until the cards are wide enough for a phone number on one line beside the sidebar. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm text-stone-500">{t("balance")}</h2>
          <p className={`text-[34px] font-light leading-[38px] tracking-[-0.03em] tabular-nums ${user.balanceCents <= 0 ? "text-red-600" : ""}`}>
            {formatCents(user.balanceCents, locale)}
          </p>
          <Link href="/account/billing" className="self-start text-sm underline hover:text-stone-600">
            {t("topUp")}
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm text-stone-500">{t("number")}</h2>
          <p className="whitespace-nowrap text-2xl leading-[38px] tracking-[-0.01em] tabular-nums">{activeNumber ? formatPhone(activeNumber.e164) : "—"}</p>
          {linkedAgent && !answering ? (
            <Link
              href={`/assistants/${linkedAgent.id}`}
              className={`text-sm hover:underline ${linkedAgent.status === "failed" ? "text-red-600" : "text-amber-700"}`}
            >
              {tn("agentStatus", { name: linkedAgent.name, status: ts(linkedAgent.status) })}
            </Link>
          ) : (
            <p className="flex items-center gap-2 text-sm text-stone-700">
              {answering && <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-emerald-500" />}
              {linkedAgent ? t("answeredBy", { name: linkedAgent.name }) : activeNumber ? t("noAgent") : t("noNumber")}
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm text-stone-500">{t("agents")}</h2>
          {agents.length === 0 ? (
            <p className="text-[34px] font-light leading-[38px]">0</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[15px]">
              {agents.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link href={`/assistants/${a.id}`} className="flex items-center justify-between gap-3 hover:underline">
                    <span className="min-w-0 truncate">{a.name}</span>
                    <span className={`shrink-0 text-[13px] ${a.status === "ready" ? "text-emerald-700" : a.status === "failed" ? "text-red-600" : "text-amber-700"}`}>
                      {ts(a.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/assistants" className="self-start text-sm underline hover:text-stone-600">
            {t("manage")}
          </Link>
        </Card>
      </div>

      {!allDone && (
        <Card>
          <CardTitle>{t("setup")}</CardTitle>
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 text-[15px]">
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums ${s.done ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-600"}`}
                >
                  {s.done ? (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {s.done ? (
                  <span className="text-stone-500 line-through">{s.label}</span>
                ) : (
                  <Link href={s.href} className="underline-offset-4 hover:underline">
                    {s.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <section className="overflow-hidden rounded-[20px] border border-stone-200 bg-white">
        <div className="flex items-center px-6 py-[18px]">
          <h2 className="text-base font-medium">{t("recentCalls")}</h2>
          <Link href="/calls" className="ml-auto text-sm underline hover:text-stone-600">
            {t("allCalls")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 py-8 text-[15px] text-stone-500">{t("noCalls")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[13px] text-stone-500">
                <tr>
                  <th scope="col" className="px-6 py-2.5 font-normal">{tcl("colCall")}</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-normal md:table-cell">{tc("agent")}</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-normal lg:table-cell">{tcl("summary")}</th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">{tcl("colDuration")}</th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">{tcl("colCost")}</th>
                  <th scope="col" className="px-6 py-2.5 text-right font-normal">{tcl("colWhen")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ call, agentName }) => (
                  <tr key={call.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-6 py-3.5">
                      <Link href={`/calls/${call.id}`} className={`flex items-center gap-3 whitespace-nowrap rounded tabular-nums ${focusRing}`}>
                        <DirectionIcon
                          inbound={call.direction === "inbound"}
                          label={call.direction === "inbound" ? tcl("directionInbound") : tcl("directionOutbound")}
                        />
                        {formatCallerNumber(call.direction === "inbound" ? call.fromNumber : call.toNumber, tc("unknownNumber"))}
                      </Link>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3.5 md:table-cell">{agentName ?? "—"}</td>
                    <td className="hidden max-w-[360px] truncate px-3 py-3.5 text-stone-600 lg:table-cell">
                      {call.summary ?? <StatusBadge status={call.status} />}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3.5 text-right sm:table-cell">{formatDuration(call.durationSec)}</td>
                    <td className="hidden whitespace-nowrap px-3 py-3.5 text-right sm:table-cell">
                      {call.billedCents != null ? formatCents(call.billedCents, locale) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right text-stone-500">{formatDateTime(call.createdAt, locale, tz)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
      <path d="M4.5 3.5h2.1a1 1 0 0 1 .97.76l.62 2.5a1 1 0 0 1-.37 1.04l-1.17.88a9 9 0 0 0 4.67 4.67l.88-1.17a1 1 0 0 1 1.04-.37l2.5.62a1 1 0 0 1 .76.97v2.1a1 1 0 0 1-1 1H14C8.2 16.5 3.5 11.8 3.5 6V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
