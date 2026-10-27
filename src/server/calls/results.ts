import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { calls, type Call } from "@/db/schema";
import { deliverCallResults, findCallForInsights, insightIdsFor } from "@/server/call-results";
import { voiceProvider, type InsightsReadyEvent } from "@/server/telnyx";
import { callRef, RESULTS_WAIT_MS } from "./state";

/**
 * Transcripts/summaries are produced asynchronously by the provider after hangup. The transcript is
 * kept as soon as there is one; RESULTS_WAIT_MS after the call, what there is becomes final.
 */
export async function fetchCallResults(call: Call, now = Date.now()): Promise<Call> {
  const ref = callRef(call);
  if (call.resultsFetched || call.purgedAt || !call.endedAt || !ref) return call;
  const final = now - call.endedAt.getTime() >= RESULTS_WAIT_MS;
  try {
    const res = await voiceProvider().getCallResults(ref, await insightIdsFor(call));
    const complete = !!res && !res.summaryPending;
    // Nothing new to store: no results yet, or the transcript is already kept and the summary still pending.
    if (!complete && !final && (!res || call.transcript)) return call;
    // Not onto a call whose content was deleted while the results were being fetched, nor over complete
    // results an overlapping fetch (another page refresh) already stored.
    const [u] = await db
      .update(calls)
      .set({ ...(res && { transcript: res.transcript, summary: res.summary ?? null }), resultsFetched: complete || final })
      .where(and(eq(calls.id, call.id), eq(calls.resultsFetched, false), isNull(calls.purgedAt), isNull(calls.deletedAt)))
      .returning();
    // The write that made the results final stores the field results and sends the email (once).
    if (u?.resultsFetched) await deliverCallResults(u, res).catch((err) => console.error("deliverCallResults failed", call.id, err));
    return u ?? call;
  } catch (err) {
    console.error("getCallResults failed", call.id, err);
    return call;
  }
}

/** The provider says a call's insights are done: fetch and finalize its results now, not on the next page view. */
export async function handleInsightsReady(e: InsightsReadyEvent): Promise<void> {
  const call = await findCallForInsights(e.conversationId, e.callControlId);
  if (!call) {
    console.warn("insight webhook for an unknown call", e.conversationId);
    return;
  }
  await fetchCallResults(call);
}

/**
 * Best-effort early fetch on long-lived servers. Serverless hosts may drop it;
 * the call page and the daily cron fetch anything still missing.
 */
export function fetchCallResultsSoon(callId: string): void {
  setTimeout(async () => {
    const [call] = await db.select().from(calls).where(eq(calls.id, callId));
    if (call) await fetchCallResults(call);
  }, 5000);
}
