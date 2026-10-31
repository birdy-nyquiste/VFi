import "server-only";
import { and, asc, count, desc, eq, isNull, like, not, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { agents, callDirection, calls } from "@/db/schema";
import { CALL_BADGES, type CallBadge } from "@/lib/call-fields";
import { clampPage, oneOf, PAGE_SIZE, readPage } from "@/lib/list-params";
import { markedAs } from "@/server/call-results";
import { reachedVoicemail } from "./voicemail";

/**
 * What the calls list can filter by. "voicemail" is a status of its own because the list shows "Reached
 * voicemail" in place of the status (SPEC §9.3), so those calls are listed under no other status.
 */
export const CALL_STATUS_FILTERS = ["initiated", "answered", "completed", "voicemail", "rejected", "failed"] as const;
export type CallStatusFilter = (typeof CALL_STATUS_FILTERS)[number];
export const CALL_DIRECTIONS = callDirection.enumValues;
/** How far back the list goes; "today" starts at midnight where the viewer is. */
const PERIOD_INTERVALS = { today: null, "7d": "7 days", "30d": "30 days" } as const;
export type CallPeriod = keyof typeof PERIOD_INTERVALS;
export const CALL_PERIODS = Object.keys(PERIOD_INTERVALS) as CallPeriod[];
export const CALL_SORTS = ["newest", "oldest", "longest", "shortest", "costliest", "cheapest"] as const;
export type CallSort = (typeof CALL_SORTS)[number];

export interface CallFilters {
  /** Digits anywhere in the other party's number, e.g. its last 4. */
  search?: string;
  direction?: (typeof CALL_DIRECTIONS)[number];
  status?: CallStatusFilter;
  agentId?: string;
  phoneNumberId?: string;
  badge?: CallBadge;
  period?: CallPeriod;
  /** For "today": where the viewer's day starts. UTC when the browser hasn't said. */
  timeZone?: string | null;
}

/** The calls list's address: each filter, the sort and the page. */
export type CallListParams = Partial<Record<"q" | "dir" | "status" | "agent" | "when" | "number" | "badge" | "sort" | "page", string>>;
const FILTER_PARAMS = ["q", "dir", "status", "agent", "when", "number", "badge"] as const;

/**
 * The list's filters, sort and page from its address. Values that aren't offered (another user's Assistant, a
 * stale status) are dropped, and `shown` is the address as the list then shows it, for building its links.
 */
export function readCallList(params: CallListParams, ctx: { agentIds: string[]; numberIds: string[]; timeZone: string | null }) {
  const filters: CallFilters = {
    search: params.q?.trim() || undefined,
    direction: oneOf(params.dir, CALL_DIRECTIONS),
    status: oneOf(params.status, CALL_STATUS_FILTERS),
    agentId: ctx.agentIds.find((id) => id === params.agent),
    phoneNumberId: ctx.numberIds.find((id) => id === params.number),
    badge: oneOf(params.badge, CALL_BADGES),
    period: oneOf(params.when, CALL_PERIODS),
    timeZone: ctx.timeZone,
  };
  const sort = oneOf(params.sort, CALL_SORTS) ?? "newest";
  const shown: CallListParams = {
    q: filters.search,
    dir: filters.direction,
    status: filters.status,
    agent: filters.agentId,
    when: filters.period,
    number: filters.phoneNumberId,
    badge: filters.badge,
    sort: sort === "newest" ? undefined : sort,
  };
  return { filters, sort, page: readPage(params.page), shown, filtered: FILTER_PARAMS.some((k) => shown[k]) };
}

const ORDER: Record<CallSort, SQL[]> = {
  newest: [desc(calls.createdAt)],
  oldest: [asc(calls.createdAt)],
  longest: [sql`${calls.durationSec} desc nulls last`],
  shortest: [sql`${calls.durationSec} asc nulls last`],
  costliest: [sql`${calls.billedCents} desc nulls last`],
  cheapest: [sql`${calls.billedCents} asc nulls last`],
};

/** One page of the user's calls, matching `filters`, and how many match in all. */
export async function findUserCalls(userId: string, filters: CallFilters, sort: CallSort = "newest", page = 1) {
  const where = and(eq(calls.userId, userId), isNull(calls.deletedAt), ...(await conditions(filters)));
  const [{ total }] = await db.select({ total: count() }).from(calls).where(where);
  const shown = clampPage(page, total);
  const rows = await db
    .select({ call: calls, agentName: agents.name })
    .from(calls)
    .leftJoin(agents, eq(calls.agentId, agents.id))
    .where(where)
    .orderBy(...ORDER[sort], desc(calls.createdAt), desc(calls.id))
    .limit(PAGE_SIZE)
    .offset((shown - 1) * PAGE_SIZE);
  return { rows, total, page: shown };
}

async function conditions(f: CallFilters): Promise<(SQL | undefined)[]> {
  const out: (SQL | undefined)[] = [];
  if (f.search !== undefined) {
    const digits = f.search.replace(/\D/g, "");
    // Calls have no names to match, so a search without digits finds nothing (the page says why).
    out.push(
      digits
        ? or(
            and(eq(calls.direction, "inbound"), like(calls.fromNumber, `%${digits}%`)),
            and(eq(calls.direction, "outbound"), like(calls.toNumber, `%${digits}%`)),
          )
        : sql`false`,
    );
  }
  if (f.direction) out.push(eq(calls.direction, f.direction));
  if (f.agentId) out.push(eq(calls.agentId, f.agentId));
  if (f.phoneNumberId) out.push(eq(calls.phoneNumberId, f.phoneNumberId));
  if (f.status) {
    const voicemail = await reachedVoicemail();
    if (f.status === "voicemail") out.push(voicemail ?? sql`false`);
    // Whatever its status, a call that reached voicemail is listed as such, so no other status includes it.
    else out.push(and(eq(calls.status, f.status), voicemail ? not(voicemail) : undefined));
  }
  if (f.badge) out.push((await markedAs(f.badge)) ?? sql`false`);
  if (f.period) {
    const interval = PERIOD_INTERVALS[f.period];
    const tz = f.timeZone ?? "UTC";
    out.push(
      interval
        ? sql`${calls.createdAt} >= now() - ${interval}::interval`
        : sql`${calls.createdAt} >= (date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`,
    );
  }
  return out;
}
