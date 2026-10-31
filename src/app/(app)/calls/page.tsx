import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, DirectionIcon, Empty, Field, FilterChips, Notice, PageHeader, StatusBadge, compactInputClass, inputClass } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { Pagination, SortHeader } from "@/components/pagination";
import { listHref, oneOf, readPage } from "@/lib/list-params";
import { CALL_BADGES } from "@/lib/call-fields";
import { callBadges } from "@/server/call-results";
import { config } from "@/lib/config";
import { formatCallerNumber, formatCents, formatDateTime, formatDuration, formatPhone } from "@/lib/format";
import { listUserAgents, MAX_CALL_GOAL_LENGTH } from "@/server/agents";
import { requireUser } from "@/server/auth";
import { CALL_PERIODS, CALL_SORTS, CALL_STATUS_FILTERS, findUserCalls, type CallSort } from "@/server/calls/list";
import { isCallLive } from "@/server/calls/state";
import { callVoicemails } from "@/server/calls/voicemail";
import { listUserNumbers } from "@/server/numbers";
import { startCallAction } from "./actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { readVariables } from "@/lib/agent-settings";
import type { Agent, PhoneNumber } from "@/db/schema";
import { activeNumbersByAge, defaultCallerNumber, ourNumber } from "@/lib/phone-numbers";
import { isUuid } from "@/lib/uuid";
import { AgentFields, type CallAgent } from "./agent-fields";
import { viewerTimeZone } from "@/server/time-zone";
import { Counted } from "@/components/counted";

function callAgent(a: Agent, numbers: PhoneNumber[]): CallAgent {
  const ask = readVariables(a.variables).filter((v) => v.askPerCall);
  return { id: a.id, name: a.name, ask: ask.map(({ key, value }) => ({ key, value })), numberId: defaultCallerNumber(numbers, a.id)?.id ?? "" };
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("calls"))("title") };
}

/** The list's address parameters; `to` belongs to the call form, not the list. */
type ListParams = { q?: string; dir?: string; status?: string; agent?: string; when?: string; number?: string; badge?: string; sort?: string; page?: string };

/** Which column a sort orders, and which way; clicking a column sorts it high to low, then flips. */
const SORT_COLUMNS = { when: ["newest", "oldest"], duration: ["longest", "shortest"], cost: ["costliest", "cheapest"] } as const satisfies Record<string, [CallSort, CallSort]>;

export default async function CallsPage({ searchParams }: { searchParams: Promise<ListParams & { to?: string }> }) {
  const user = await requireUser();
  // "Call them back" on a call page opens this form with the number filled in.
  const { to, ...params } = await searchParams;
  const { number } = params;
  const [agents, numbers] = await Promise.all([listUserAgents(user.id), listUserNumbers(user.id)]);
  // Once the user has more than one number, calls can go from any of them and the list shows and filters by them.
  const activeNumbers = activeNumbersByAge(numbers);
  const showNumbers = activeNumbers.length > 1;
  const filter = showNumbers && number && isUuid(number) ? activeNumbers.find((n) => n.id === number) : undefined;
  const tz = await viewerTimeZone();
  const filters = {
    search: params.q?.trim() || undefined,
    direction: oneOf(params.dir, ["inbound", "outbound"] as const),
    status: oneOf(params.status, CALL_STATUS_FILTERS),
    agentId: agents.find((a) => a.id === params.agent)?.id,
    phoneNumberId: filter?.id,
    badge: oneOf(params.badge, CALL_BADGES),
    period: oneOf(params.when, CALL_PERIODS),
    timeZone: tz,
  };
  const sort = oneOf(params.sort, CALL_SORTS) ?? "newest";
  const { rows, total, page } = await findUserCalls(user.id, filters, sort, readPage(params.page));
  const filtered = Object.entries(filters).some(([k, v]) => k !== "timeZone" && v !== undefined);
  // The address as the list shows it: unknown values dropped, so links built from it stay clean.
  const shown: ListParams = {
    q: filters.search,
    dir: filters.direction,
    status: filters.status,
    agent: filters.agentId,
    when: filters.period,
    number: filter?.id,
    badge: filters.badge,
    sort: sort === "newest" ? undefined : sort,
    page: String(page),
  };
  const href = (changes: Partial<ListParams>) => listHref("/calls", shown, changes);
  const sortHref = ([high, low]: readonly [CallSort, CallSort]) => href({ sort: sort === high ? low : high === "newest" ? undefined : high });
  const sortedAs = ([high, low]: readonly [CallSort, CallSort]) => (sort === high ? "desc" : sort === low ? "asc" : undefined);
  const ariaSort = (cols: readonly [CallSort, CallSort]) => {
    const as = sortedAs(cols);
    return as === "desc" ? "descending" : as === "asc" ? "ascending" : "none";
  };
  const [badges, voicemails] = await Promise.all([callBadges(rows.map(({ call }) => call.id)), callVoicemails(rows.map(({ call }) => call.id))]);
  const readyAgents = agents.filter((a) => a.status === "ready");
  const activeNumber = activeNumbers[0];
  const agentNames = new Map(agents.map((a) => [a.id, a.name]));
  const [t, tc, tr, ts, locale] = await Promise.all([
    getTranslations("calls"),
    getTranslations("common"),
    getTranslations("callResults"),
    getTranslations("status"),
    getLocale(),
  ]);
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
                    <Counted>
                      <textarea
                        name="goal"
                        rows={2}
                        maxLength={MAX_CALL_GOAL_LENGTH}
                        placeholder={t("goalPlaceholder")}
                        className={inputClass}
                      />
                    </Counted>
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

      {(total > 0 || filtered) && (
        <div className="space-y-3">
          <ListFilters key={href({})} action="/calls" label={t("filtersLabel")} keep={{ number: shown.number, badge: shown.badge }}>
            <input
              name="q"
              type="search"
              defaultValue={filters.search}
              aria-label={t("searchLabel")}
              placeholder={t("searchPlaceholder")}
              inputMode="tel"
              className={`${compactInputClass} min-w-0 flex-[1_1_220px]`}
            />
            <select name="dir" defaultValue={filters.direction ?? ""} aria-label={t("direction")} className={`${compactInputClass}`}>
              <option value="">{t("anyDirection")}</option>
              <option value="inbound">{t("directionInbound")}</option>
              <option value="outbound">{t("directionOutbound")}</option>
            </select>
            <select name="status" defaultValue={filters.status ?? ""} aria-label={t("colStatus")} className={`${compactInputClass}`}>
              <option value="">{t("anyStatus")}</option>
              {CALL_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s === "voicemail" ? t("voicemailBadge") : ts(s)}</option>
              ))}
            </select>
            {agents.length > 1 && (
              <select name="agent" defaultValue={filters.agentId ?? ""} aria-label={tc("agent")} className={`${compactInputClass}`}>
                <option value="">{t("allAgents")}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <select name="when" defaultValue={filters.period ?? ""} aria-label={t("colWhen")} className={`${compactInputClass}`}>
              <option value="">{t("anyTime")}</option>
              <option value="today">{t("today")}</option>
              <option value="7d">{t("last7Days")}</option>
              <option value="30d">{t("last30Days")}</option>
            </select>
            {/* On phones the sortable columns are hidden, so sorting is a menu there. */}
            <select name="sort" defaultValue={shown.sort ?? ""} aria-label={tc("sort")} className={`${compactInputClass} sm:hidden`}>
              {CALL_SORTS.map((s) => (
                <option key={s} value={s === "newest" ? "" : s}>{t(`sorts.${s}`)}</option>
              ))}
            </select>
          </ListFilters>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {showNumbers ? (
              <FilterChips
                label={tc("filterByNumber")}
                chips={[
                  { href: href({ number: undefined }), label: tc("allNumbers"), active: !filter },
                  ...activeNumbers.map((n) => ({ href: href({ number: n.id }), label: formatPhone(n.e164), active: filter?.id === n.id })),
                ]}
              />
            ) : (
              <span />
            )}
            <FilterChips
              label={t("filterByBadge")}
              chips={CALL_BADGES.map((b) => ({
                href: href({ badge: filters.badge === b ? undefined : b }),
                label: tr(b === "urgent" ? "badgeUrgent" : "badgeFollowup"),
                active: filters.badge === b,
              }))}
            />
          </div>
          {filtered && (
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-stone-500">
              {t("matching", { count: total })}
              <Link href={sort === "newest" ? "/calls" : `/calls?sort=${sort}`} scroll={false} className="underline hover:text-stone-900">
                {tc("clearFilters")}
              </Link>
            </p>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>{filtered ? t("emptyFiltered") : t("empty")}</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 text-left text-[13px] text-stone-500">
              <tr>
                <th className="px-6 py-3.5 font-normal">{t("colCall")}</th>
                {showNumbers && <th className="hidden px-3 py-3.5 font-normal sm:table-cell">{t("colYourNumber")}</th>}
                <th className="hidden px-3 py-3.5 font-medium sm:table-cell">{tc("agent")}</th>
                <th className="px-3 py-3.5 font-normal">{t("colStatus")}</th>
                <th aria-sort={ariaSort(SORT_COLUMNS.duration)} className="hidden px-3 py-3.5 text-right font-normal sm:table-cell">
                  <SortHeader label={t("colDuration")} current={sortedAs(SORT_COLUMNS.duration)} href={sortHref(SORT_COLUMNS.duration)} align="right" />
                </th>
                <th aria-sort={ariaSort(SORT_COLUMNS.cost)} className="hidden px-3 py-3.5 text-right font-normal sm:table-cell">
                  <SortHeader label={t("colCost")} current={sortedAs(SORT_COLUMNS.cost)} href={sortHref(SORT_COLUMNS.cost)} align="right" />
                </th>
                <th aria-sort={ariaSort(SORT_COLUMNS.when)} className="hidden px-6 py-3.5 text-right font-normal sm:table-cell">
                  <SortHeader label={t("colWhen")} current={sortedAs(SORT_COLUMNS.when)} href={sortHref(SORT_COLUMNS.when)} align="right" />
                </th>
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
                  <td className="px-3 py-3.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {voicemails.has(call.id) ? <Badge tone="amber">{t("voicemailBadge")}</Badge> : <StatusBadge status={call.status} />}
                      {badges.get(call.id) === "urgent" && <Badge tone="red">{tr("badgeUrgent")}</Badge>}
                      {badges.get(call.id) === "followup" && <Badge tone="amber">{tr("badgeFollowup")}</Badge>}
                    </span>
                    {voicemails.has(call.id) && <div className="mt-0.5 text-xs text-stone-500">{t(`voicemailResult.${voicemails.get(call.id)!}`)}</div>}
                  </td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums sm:table-cell">{formatDuration(call.durationSec)}</td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums sm:table-cell">{call.billedCents != null ? formatCents(call.billedCents, locale) : "—"}</td>
                  <td className="hidden whitespace-nowrap px-6 py-3.5 text-right text-stone-500 sm:table-cell">{formatDateTime(call.createdAt, locale, tz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} total={total} href={(p) => href({ page: String(p) })} />
        </Card>
      )}
    </div>
  );
}
