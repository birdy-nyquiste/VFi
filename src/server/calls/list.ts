import "server-only";
import { and, asc, count, desc, eq, isNull, like, not, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { agents, callResults, calls, callVoicemail } from "@/db/schema";
import type { CallBadge } from "@/lib/call-fields";
import { clampPage, PAGE_SIZE } from "@/lib/list-params";
import { callResultsTablesExist } from "@/server/call-results";
import { voicemailTableExists } from "./voicemail";

/**
 * What the calls list can filter by. "voicemail" is a status of its own because the list shows "Reached
 * voicemail" in place of the status (SPEC §9.3), so those calls aren't listed under "completed".
 */
export const CALL_STATUS_FILTERS = ["initiated", "answered", "completed", "voicemail", "rejected", "failed"] as const;
export type CallStatusFilter = (typeof CALL_STATUS_FILTERS)[number];
export const CALL_PERIODS = ["today", "7d", "30d"] as const;
export const CALL_SORTS = ["newest", "oldest", "longest", "shortest", "costliest", "cheapest"] as const;
export type CallSort = (typeof CALL_SORTS)[number];

export interface CallFilters {
  /** Digits anywhere in the other party's number, e.g. its last 4. */
  search?: string;
  direction?: "inbound" | "outbound";
  status?: CallStatusFilter;
  agentId?: string;
  phoneNumberId?: string;
  badge?: CallBadge;
  period?: (typeof CALL_PERIODS)[number];
  /** For "today": where the viewer's day starts. UTC when the browser hasn't said. */
  timeZone?: string | null;
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
    // Calls have no names to match, so a search without digits finds nothing.
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
    // Before the voicemail table exists (previews), no call has reached voicemail.
    const voicemail = (await voicemailTableExists())
      ? sql`exists (select 1 from ${callVoicemail} where ${callVoicemail.callId} = ${calls.id} and ${callVoicemail.action} is not null)`
      : undefined;
    if (f.status === "voicemail") out.push(voicemail ?? sql`false`);
    else if (f.status === "completed") out.push(and(eq(calls.status, "completed"), voicemail && not(voicemail)));
    else out.push(eq(calls.status, f.status));
  }
  if (f.badge) {
    out.push(
      (await callResultsTablesExist())
        ? sql`exists (select 1 from ${callResults} where ${callResults.callId} = ${calls.id} and ${callResults.badge} = ${f.badge})`
        : sql`false`,
    );
  }
  if (f.period === "today") {
    const tz = f.timeZone ?? "UTC";
    out.push(sql`${calls.createdAt} >= (date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`);
  } else if (f.period) {
    out.push(sql`${calls.createdAt} >= now() - ${f.period === "7d" ? "7 days" : "30 days"}::interval`);
  }
  return out;
}
