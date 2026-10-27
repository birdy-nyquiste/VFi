import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, DirectionIcon, Empty, Field, FilterChips, Notice, PageHeader, StatusBadge, inputClass } from "@/components/ui";
import { config } from "@/lib/config";
import { formatCallerNumber, formatCents, formatDateTime, formatDuration, formatPhone } from "@/lib/format";
import { listUserAgents, MAX_CALL_GOAL_LENGTH } from "@/server/agents";
import { requireUser } from "@/server/auth";
import { listUserCalls } from "@/server/calls";
import { isCallLive } from "@/server/calls/state";
import { listUserNumbers } from "@/server/numbers";
import { startCallAction } from "./actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { readVariables } from "@/lib/agent-settings";
import type { Agent, PhoneNumber } from "@/db/schema";
import { activeNumbersByAge, defaultCallerNumber, ourNumber } from "@/lib/phone-numbers";
import { isUuid } from "@/lib/uuid";
import { AgentFields, type CallAgent } from "./agent-fields";
import { viewerTimeZone } from "@/server/time-zone";

function callAgent(a: Agent, numbers: PhoneNumber[]): CallAgent {
  const ask = readVariables(a.variables).filter((v) => v.askPerCall);
  return { id: a.id, name: a.name, ask: ask.map(({ key, value }) => ({ key, value })), numberId: defaultCallerNumber(numbers, a.id)?.id ?? "" };
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("calls"))("title") };
}

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ to?: string; number?: string }> }) {
  const user = await requireUser();
  // "Call them back" on a call page opens this form with the number filled in.
  const { to, number } = await searchParams;
  const [agents, numbers] = await Promise.all([listUserAgents(user.id), listUserNumbers(user.id)]);
  // Once the user has more than one number, calls can go from any of them and the list shows and filters by them.
  const activeNumbers = activeNumbersByAge(numbers);
  const showNumbers = activeNumbers.length > 1;
  const filter = showNumbers && number && isUuid(number) ? activeNumbers.find((n) => n.id === number) : undefined;
  const rows = await listUserCalls(user.id, 50, filter?.id);
  const readyAgents = agents.filter((a) => a.status === "ready");
  const activeNumber = activeNumbers[0];
  const agentNames = new Map(agents.map((a) => [a.id, a.name]));
  const [t, tc, locale] = await Promise.all([getTranslations("calls"), getTranslations("common"), getLocale()]);
  const tz = await viewerTimeZone();
  const numberLink = (chunks: React.ReactNode) => (
    <Link href="/numbers" className="underline">
      {chunks}
    </Link>
  );
  const agentLink = (chunks: React.ReactNode) => (
    <Link href="/assistants/new" className="underline">
      {chunks}
    </Link>
  );
  const inFlight = rows.some(({ call }) => isCallLive(call));

  return (
    <div className="space-y-6">
      {inFlight && <AutoRefresh />}
      <PageHeader title={t("title")} description={t("description", { price: formatCents(config.pricing.callPerMinuteCents, locale) })} />

      <Card className="scroll-mt-6">
        <h2 id="place" className="mb-3 scroll-mt-6 text-[15px] font-medium text-stone-900">
          {t("placeTitle")}
        </h2>
        {!activeNumber || readyAgents.length === 0 ? (
          <Notice>
            {t.rich(!activeNumber && readyAgents.length === 0 ? "needBoth" : !activeNumber ? "needNumber" : "needAgent", {
              number: numberLink,
              agent: agentLink,
            })}
          </Notice>
        ) : (
          <ActionForm action={startCallAction} className="space-y-3">
            {/* The number's agent only if it's ready: an id not in the list would hide the shown agent's per-call fields. */}
            <AgentFields
              agents={readyAgents.map((a) => callAgent(a, numbers))}
              numbers={activeNumbers.map((n) => {
                const name = n.agentId ? agentNames.get(n.agentId) : undefined;
                return { id: n.id, number: formatPhone(n.e164), label: name ? `${formatPhone(n.e164)} · ${name}` : formatPhone(n.e164) };
              })}
              defaultAgentId={readyAgents.find((a) => a.id === activeNumber.agentId)?.id ?? readyAgents[0].id}
              after={
                <>
                  <Field
                    label={t("goal")}
                    hint={t.rich("goalHint", { code: (chunks) => <code>{chunks}</code> })}
                  >
                    <textarea
                      name="goal"
                      rows={2}
                      maxLength={MAX_CALL_GOAL_LENGTH}
                      placeholder={t("goalPlaceholder")}
                      className={inputClass}
                    />
                  </Field>
                  <SubmitButton pendingText={t("dialing")}>{t("call")}</SubmitButton>
                </>
              }
            >
              <Field label={t("to")}>
                <input name="to" required inputMode="tel" placeholder="(415) 555-0100" defaultValue={to ? formatPhone(to) : undefined} className={inputClass} />
              </Field>
            </AgentFields>
          </ActionForm>
        )}
        {(!activeNumber || readyAgents.length === 0) && (
          <p className="mt-3 text-xs text-stone-500">
            {t("callerId", { number: activeNumber ? formatPhone(activeNumber.e164) : "" })}
          </p>
        )}
      </Card>

      {showNumbers && (
        <FilterChips
          label={tc("filterByNumber")}
          chips={[
            { href: "/calls", label: tc("allNumbers"), active: !filter },
            ...activeNumbers.map((n) => ({ href: `/calls?number=${n.id}`, label: formatPhone(n.e164), active: filter?.id === n.id })),
          ]}
        />
      )}

      {rows.length === 0 ? (
        <Empty>{filter ? t("emptyForNumber") : t("empty")}</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 text-left text-[13px] text-stone-500">
              <tr>
                <th className="px-6 py-3.5 font-normal">{t("colCall")}</th>
                {showNumbers && <th className="hidden px-3 py-3.5 font-normal sm:table-cell">{t("colYourNumber")}</th>}
                <th className="hidden px-3 py-3.5 font-medium sm:table-cell">{tc("agent")}</th>
                <th className="px-3 py-3.5 font-normal">{t("colStatus")}</th>
                <th className="hidden px-3 py-3.5 text-right font-medium sm:table-cell">{t("colDuration")}</th>
                <th className="hidden px-3 py-3.5 text-right font-medium sm:table-cell">{t("colCost")}</th>
                <th className="hidden px-6 py-3.5 text-right font-medium sm:table-cell">{t("colWhen")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(({ call, agentName }) => (
                <tr key={call.id} className="hover:bg-stone-50">
                  <td className="px-6 py-3.5">
                    <Link href={`/calls/${call.id}`} className="flex items-center gap-3 whitespace-nowrap tabular-nums">
                      <DirectionIcon inbound={call.direction === "inbound"} label={t(call.direction === "inbound" ? "directionInbound" : "directionOutbound")} />
                      {formatCallerNumber(call.direction === "inbound" ? call.fromNumber : call.toNumber, tc("unknownNumber"))}
                    </Link>
                    {/* On phones the time (and our number) go here instead of in their own columns. */}
                    <div className="mt-0.5 text-xs text-stone-500 sm:hidden">
                      {formatDateTime(call.createdAt, locale, tz)}
                      {showNumbers && <span className="tabular-nums"> · {formatPhone(ourNumber(call))}</span>}
                    </div>
                  </td>
                  {showNumbers && <td className="hidden whitespace-nowrap px-3 py-3.5 tabular-nums text-stone-600 sm:table-cell">{formatPhone(ourNumber(call))}</td>}
                  <td className="hidden px-3 py-3.5 text-stone-600 sm:table-cell">{agentName ?? "—"}</td>
                  <td className="px-3 py-3.5"><StatusBadge status={call.status} /></td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums sm:table-cell">{formatDuration(call.durationSec)}</td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums sm:table-cell">{call.billedCents != null ? formatCents(call.billedCents, locale) : "—"}</td>
                  <td className="hidden whitespace-nowrap px-6 py-3.5 text-right text-stone-500 sm:table-cell">{formatDateTime(call.createdAt, locale, tz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
