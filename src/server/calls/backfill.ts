import { and, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { calls } from "@/db/schema";
import { config } from "@/lib/config";

/**
 * One-off repair for calls a premature fetch marked fetched before Telnyx had created their summary
 * insight (fixed 2026-10-26). Hands completed calls still inside the retention window with no summary
 * back to the daily cron, whose next fetch is final: it stores the summary if there is one now, and
 * otherwise only marks the call fetched again. Lists them without changing anything unless `apply`.
 */
export async function reopenCallsMissingSummary({ apply = false, now = new Date() } = {}) {
  const retentionCutoff = new Date(now.getTime() - config.policy.retentionDays * 24 * 60 * 60 * 1000);
  const where = and(
    eq(calls.status, "completed"),
    eq(calls.resultsFetched, true),
    isNull(calls.summary),
    isNotNull(calls.endedAt),
    isNull(calls.purgedAt),
    isNull(calls.deletedAt),
    gte(calls.createdAt, retentionCutoff),
  );
  const cols = { id: calls.id, endedAt: calls.endedAt };
  return apply
    ? db.update(calls).set({ resultsFetched: false }).where(where).returning(cols)
    : db.select(cols).from(calls).where(where);
}
