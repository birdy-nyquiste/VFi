import "server-only";
import { and, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db, tableExists, type Queryable } from "@/db";
import { calls, callVoicemail } from "@/db/schema";
import type { VoicemailAction } from "@/lib/agent-settings";

/**
 * Whether the call_voicemail table exists. Previews run before the production migration (SPEC §2.6), so
 * until it's seen the calls pages show no voicemail and detection is ignored. Once seen it stays seen.
 */
let tableSeen = false;
async function voicemailTableExists(q: Queryable = db): Promise<boolean> {
  return (tableSeen ||= await tableExists(q, "call_voicemail"));
}

/** What the agent did when the call reached voicemail; null when it didn't (or a person answered). */
export async function getCallVoicemail(callId: string, q: Queryable = db): Promise<VoicemailAction | null> {
  if (!(await voicemailTableExists(q))) return null;
  const [row] = await q.select({ action: callVoicemail.action }).from(callVoicemail).where(eq(callVoicemail.callId, callId));
  return row?.action ?? null;
}

/**
 * SQL that's true for a call that reached voicemail (it has an action), for filtering the calls list; null
 * before the table exists, when no call has.
 */
export async function reachedVoicemail(): Promise<SQL | null> {
  if (!(await voicemailTableExists())) return null;
  return sql`exists (select 1 from ${callVoicemail} where ${callVoicemail.callId} = ${calls.id} and ${callVoicemail.action} is not null)`;
}

/** The calls among these that reached voicemail, for the calls list. */
export async function callVoicemails(callIds: string[]): Promise<Map<string, VoicemailAction>> {
  if (!callIds.length || !(await voicemailTableExists())) return new Map();
  const rows = await db
    .select({ callId: callVoicemail.callId, action: callVoicemail.action })
    .from(callVoicemail)
    .where(and(inArray(callVoicemail.callId, callIds), isNotNull(callVoicemail.action)));
  return new Map(rows.map((r) => [r.callId, r.action!]));
}

export interface VoicemailState {
  /** The action stored first: a retried detection gets the same one. */
  action: VoicemailAction | null;
  /** When the assistant finished, if it already has. */
  assistantEndedAt: Date | null;
}

/** Voicemail was detected: store the agent's action (once). Null before the table exists. */
export async function recordVoicemail(callId: string, action: VoicemailAction): Promise<VoicemailState | null> {
  if (!(await voicemailTableExists())) return null;
  const [row] = await db
    .insert(callVoicemail)
    .values({ callId, action })
    .onConflictDoUpdate({ target: callVoicemail.callId, set: { action: sql`coalesce(${callVoicemail.action}, excluded.action)` } })
    .returning({ action: callVoicemail.action, assistantEndedAt: callVoicemail.assistantEndedAt });
  return row;
}

/** The assistant finished on a call we placed: store when (once). Null before the table exists. */
export async function recordAssistantEnded(callId: string, at: Date): Promise<VoicemailState | null> {
  if (!(await voicemailTableExists())) return null;
  const [row] = await db
    .insert(callVoicemail)
    .values({ callId, assistantEndedAt: at })
    .onConflictDoUpdate({
      target: callVoicemail.callId,
      set: { assistantEndedAt: sql`coalesce(${callVoicemail.assistantEndedAt}, excluded.assistant_ended_at)` },
    })
    .returning({ action: callVoicemail.action, assistantEndedAt: callVoicemail.assistantEndedAt });
  return row;
}
