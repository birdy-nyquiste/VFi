import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, tableExists, type Queryable } from "@/db";
import { callVoicemail } from "@/db/schema";
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

/** The calls among these that reached voicemail, for the calls list. */
export async function callVoicemails(callIds: string[]): Promise<Map<string, VoicemailAction>> {
  if (!callIds.length || !(await voicemailTableExists())) return new Map();
  const rows = await db.select().from(callVoicemail).where(inArray(callVoicemail.callId, callIds));
  return new Map(rows.map((r) => [r.callId, r.action]));
}

/** Record that the call reached voicemail, once: returns the action stored first (a retry gets the same one). */
export async function recordVoicemail(callId: string, action: VoicemailAction): Promise<VoicemailAction | null> {
  if (!(await voicemailTableExists())) return null;
  await db.insert(callVoicemail).values({ callId, action }).onConflictDoNothing();
  return getCallVoicemail(callId);
}
