import "server-only";
import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, tableExists, type Queryable } from "@/db";
import { agentCallResults, agents, callResults, calls, users, type Agent, type AgentCallResults, type Call, type CallResultRow } from "@/db/schema";
import { readBehavior } from "@/lib/agent-settings";
import {
  callBadge,
  callField,
  fieldsProblem,
  type CallBadge,
  MAX_FIELD_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_FIELD_OPTION_LENGTH,
  MAX_FIELD_OPTIONS,
  MAX_FIELDS,
  normalizeField,
  fieldsJsonSchema,
  fieldsInstructions,
  parseFieldResults,
  readFields,
  summaryInstructions,
  type CallField,
} from "@/lib/call-fields";
import {
  EMAIL_PARTS,
  emailFormat,
  MAX_NOTE_LENGTH,
  MAX_RECIPIENTS,
  MAX_SUBJECT_LENGTH,
  MAX_TAG_LENGTH,
  readEmailSettings,
  renderCallEmail,
  sampleEmailData,
  TEST_EMAILS_PER_HOUR,
  type EmailSettings,
} from "@/lib/call-email";
import { config } from "@/lib/config";
import { UserError, type ErrorKey } from "@/lib/errors";
import { formatCallerNumber, formatDuration, formatPhone } from "@/lib/format";
import { sendEmail } from "./email";
import { voiceProvider, type CallResults } from "./telnyx";

/**
 * Call-result fields and the email after each call (SPEC §9.2): each agent's settings, the provider
 * insight group that fills the fields in, and what happens when a call's results become final.
 */

/**
 * The tables arrive with a migration that previews (sharing the production database) run without, so
 * every entry point checks first. Once they exist they stay, so a yes is remembered.
 */
let tablesSeen = false;
export async function callResultsTablesExist(q: Queryable = db): Promise<boolean> {
  return (tablesSeen ||= await tableExists(q, "call_results"));
}

/** An agent's fields and email settings, as stored (defaults when it has none). */
export interface AgentResultsSettings {
  fields: CallField[];
  email: EmailSettings;
}

export function readResultsSettings(row: Pick<AgentCallResults, "fields" | "email"> | null | undefined): AgentResultsSettings {
  return { fields: readFields(row?.fields), email: readEmailSettings(row?.email) };
}

export async function getAgentResultsRow(agentId: string, q: Queryable = db): Promise<AgentCallResults | null> {
  if (!(await callResultsTablesExist(q))) return null;
  const [row] = await q.select().from(agentCallResults).where(eq(agentCallResults.agentId, agentId));
  return row ?? null;
}

/** Store an agent's fields and email settings (validated by the caller). */
export async function saveResultsSettings(agentId: string, settings: AgentResultsSettings, q: Queryable = db): Promise<void> {
  if (!(await callResultsTablesExist(q))) return;
  const now = new Date();
  const [before] = await q.select().from(agentCallResults).where(eq(agentCallResults.agentId, agentId));
  const was = readResultsSettings(before);
  const fieldsChanged = JSON.stringify(was.fields) !== JSON.stringify(settings.fields);
  const values = {
    fields: settings.fields,
    email: settings.email,
    // Calls from before a change get nothing from it (SPEC §9.2): see deliverCallResults.
    fieldsSince: fieldsChanged || !before?.fieldsSince ? now : before.fieldsSince,
    emailSince: settings.email.enabled && !was.email.enabled ? now : (before?.emailSince ?? null),
    updatedAt: now,
  };
  await q
    .insert(agentCallResults)
    .values({ agentId, ...values })
    .onConflictDoUpdate({ target: agentCallResults.agentId, set: values });
}

function webhookUrl(): string {
  return `${config.appUrl}/api/webhooks/telnyx`;
}

/** What the agent's insight group should be set up from; it's updated whenever this changes. */
function insightsSpec(agent: Pick<Agent, "id" | "name" | "language">, fields: CallField[]) {
  return {
    name: `VFi ${agent.name} (${agent.id.slice(0, 8)})`,
    webhookUrl: webhookUrl(),
    summaryInstructions: summaryInstructions(agent.language),
    fields: fields.length ? { instructions: fieldsInstructions(agent.language), schema: fieldsJsonSchema(fields) } : null,
  };
}

/** A short hash of what the insight group is set up from (the name is left out: renaming needs no update). */
export function insightsHash(agent: Pick<Agent, "id" | "name" | "language">, row: Pick<AgentCallResults, "fields"> | null): string {
  const spec = insightsSpec(agent, readFields(row?.fields));
  const hashed = { webhookUrl: spec.webhookUrl, summaryInstructions: spec.summaryInstructions, fields: spec.fields };
  return createHash("sha256").update(JSON.stringify(hashed)).digest("hex").slice(0, 16);
}

/** The insights hash each agent should have pushed with; empty before the tables exist. */
export async function desiredInsightsHashes(list: Pick<Agent, "id" | "name" | "language">[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!list.length || !(await callResultsTablesExist())) return out;
  const rows = await db.select().from(agentCallResults).where(inArray(agentCallResults.agentId, list.map((a) => a.id)));
  const byAgent = new Map(rows.map((r) => [r.agentId, r]));
  for (const a of list) out.set(a.id, insightsHash(a, byAgent.get(a.id) ?? null));
  return out;
}

/**
 * Make the agent's insight group match its fields. Returns the group to put on the assistant and the
 * hash it was set up from. On failure the hash is null (and the group is the one it had, if any), so the
 * agent stays stale and is retried; before the tables exist (previews) there is no hash at all, matching
 * what desiredInsightsHashes expects there. Never throws: a provider problem mustn't fail saving the agent.
 */
export async function ensureInsights(agent: Agent): Promise<{ groupId?: string; hash?: string | null }> {
  try {
    if (!(await callResultsTablesExist())) return {};
    const row = await getAgentResultsRow(agent.id);
    const hash = insightsHash(agent, row);
    if (row?.insightGroupId && row.summaryInsightId && row.insightsHash === hash) return { groupId: row.insightGroupId, hash };
    const ids = await voiceProvider().syncInsights(
      row && { groupId: row.insightGroupId ?? undefined, summaryId: row.summaryInsightId ?? undefined, fieldsId: row.fieldsInsightId },
      insightsSpec(agent, readFields(row?.fields)),
    );
    const set = { insightGroupId: ids.groupId, summaryInsightId: ids.summaryId, fieldsInsightId: ids.fieldsId, insightsHash: hash };
    await db
      .insert(agentCallResults)
      .values({ agentId: agent.id, ...set })
      .onConflictDoUpdate({ target: agentCallResults.agentId, set });
    return { groupId: ids.groupId, hash };
  } catch (err) {
    console.error("ensureInsights failed", agent.id, err);
    const row = await getAgentResultsRow(agent.id).catch(() => null);
    return { groupId: row?.insightGroupId ?? undefined, hash: null };
  }
}

/** Remove a deleted agent's insight group at the provider. Best effort: a leftover group costs nothing. */
export async function deleteInsightsQuietly(agentId: string): Promise<void> {
  try {
    const row = await getAgentResultsRow(agentId);
    if (!row?.insightGroupId) return;
    await voiceProvider().deleteInsights({ groupId: row.insightGroupId, summaryId: row.summaryInsightId ?? undefined, fieldsId: row.fieldsInsightId });
    await db.update(agentCallResults).set({ insightGroupId: null, summaryInsightId: null, fieldsInsightId: null, insightsHash: null }).where(eq(agentCallResults.agentId, agentId));
  } catch (err) {
    console.error("deleteInsights failed", agentId, err);
  }
}

/** Which insights to read a call's summary and fields from: its agent's own, when it has them. */
export async function insightIdsFor(call: Pick<Call, "agentId">): Promise<{ summaryId?: string | null; fieldsId?: string | null } | undefined> {
  if (!call.agentId) return undefined;
  const row = await getAgentResultsRow(call.agentId).catch(() => null);
  return row?.summaryInsightId ? { summaryId: row.summaryInsightId, fieldsId: row.fieldsInsightId } : undefined;
}

/**
 * Once a call's results are final: store its field results and send the email, once. The insert is the
 * guard: the call page, the daily job and the insight webhook can all get here for the same call.
 * Only calls the agent actually handled (answered or placed and connected) get this.
 */
export async function deliverCallResults(call: Call, results: CallResults | null): Promise<void> {
  if (call.status !== "completed" || !call.agentId || !(await callResultsTablesExist())) return;
  const [agent] = await db.select().from(agents).where(eq(agents.id, call.agentId));
  if (!agent) return;
  const settingsRow = await getAgentResultsRow(agent.id);
  const settings = readResultsSettings(settingsRow);
  // Only for calls that started after the fields were set up and after the email was turned on.
  const after = (since: Date | null | undefined) => Boolean(since && call.createdAt >= since);
  const fields = after(settingsRow?.fieldsSince) ? settings.fields : [];
  const email = settings.email.enabled && after(settingsRow?.emailSince) ? settings.email : null;
  const values = fields.length ? parseFieldResults(fields, results?.fields) : null;
  const [row] = await db
    .insert(callResults)
    .values({ callId: call.id, fields, values, badge: callBadge(fields, values), emailStatus: email ? "pending" : "off" })
    .onConflictDoNothing()
    .returning();
  if (!row || !email) return;

  let to: string[] = email.recipients;
  try {
    if (!to.length) to = (await db.select({ email: users.email }).from(users).where(eq(users.id, call.userId))).map((u) => u.email);
    const rendered = renderCallEmail(email, callEmailData(call, agent, fields, values), agent.language);
    await sendEmail({ to, ...rendered });
    await db.update(callResults).set({ emailStatus: "sent", emailedTo: to, emailedAt: new Date() }).where(eq(callResults.callId, call.id));
  } catch (err) {
    console.error("call email failed", call.id, err);
    await db.update(callResults).set({ emailStatus: "failed", emailedTo: to }).where(eq(callResults.callId, call.id));
  }
}

function callEmailData(call: Call, agent: Agent, fields: CallField[], values: ReturnType<typeof parseFieldResults>) {
  const inbound = call.direction === "inbound";
  const timeZone = readBehavior(agent.behavior).timeZone;
  const { locale, unknownNumber } = emailFormat(agent.language);
  return {
    assistant: agent.name,
    direction: call.direction,
    caller: formatCallerNumber(inbound ? call.fromNumber : call.toNumber, unknownNumber),
    ourNumber: formatPhone(inbound ? call.toNumber : call.fromNumber),
    time: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(
      call.answeredAt ?? call.createdAt,
    ),
    length: formatDuration(call.durationSec),
    fields,
    values,
    summary: call.summary,
    link: `${config.appUrl}/calls/${call.id}`,
  };
}

/** An email still "pending" after this was cut off mid-send (the server stopped); the call page then says it failed. */
export const EMAIL_SEND_TIMEOUT_MS = 10 * 60 * 1000;

/** A finished call's stored results, for its page. */
export async function getCallResultRow(callId: string): Promise<CallResultRow | null> {
  if (!(await callResultsTablesExist())) return null;
  const [row] = await db.select().from(callResults).where(eq(callResults.callId, callId));
  return row ?? null;
}

/** Badges for the calls list, by call id. */
export async function callBadges(callIds: string[]): Promise<Map<string, CallBadge>> {
  const out = new Map<string, CallBadge>();
  if (!callIds.length || !(await callResultsTablesExist())) return out;
  const rows = await db
    .select({ callId: callResults.callId, badge: callResults.badge })
    .from(callResults)
    .where(and(inArray(callResults.callId, callIds), sql`${callResults.badge} is not null`));
  for (const r of rows) if (r.badge) out.set(r.callId, r.badge);
  return out;
}

/** Retention and user deletes: the field results go with the rest of the call's content. */
export async function purgeCallResults(callId: string, q: Queryable = db): Promise<void> {
  if (!(await callResultsTablesExist(q))) return;
  await q.update(callResults).set({ fields: null, values: null, badge: null }).where(eq(callResults.callId, callId));
}

/**
 * Send the user an example of the email with the settings on screen (saved or not), to their account
 * email. Limited per agent per hour, counted on the agent's settings row.
 */
export async function sendTestEmail(userId: string, agentId: string, settings: AgentResultsSettings): Promise<string> {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId), isNull(agents.deletedAt)));
  if (!agent) throw new UserError("agentNotFound");
  if (!(await callResultsTablesExist())) throw new UserError("notAvailable");
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));

  const hourAgo = Date.now() - 60 * 60 * 1000;
  const allowed = await db.transaction(async (tx) => {
    await tx.insert(agentCallResults).values({ agentId }).onConflictDoNothing();
    const [row] = await tx.select().from(agentCallResults).where(eq(agentCallResults.agentId, agentId)).for("update");
    const recent = (row.testEmailsAt ?? []).filter((t) => Date.parse(t) > hourAgo);
    if (recent.length >= TEST_EMAILS_PER_HOUR) return false;
    await tx.update(agentCallResults).set({ testEmailsAt: [...recent, new Date().toISOString()] }).where(eq(agentCallResults.agentId, agentId));
    return true;
  });
  if (!allowed) throw new UserError("testEmailLimit", { max: TEST_EMAILS_PER_HOUR });

  const data = sampleEmailData(settings.fields, agent.name, agent.language, `${config.appUrl}/calls`);
  const rendered = renderCallEmail(settings.email, data, agent.language);
  await sendEmail({ to: user.email, ...rendered });
  return user.email;
}

/**
 * The call an insight webhook is about: by its conversation, or by its call control id when the
 * conversation id hasn't been stored yet.
 */
export async function findCallForInsights(conversationId?: string, callControlId?: string): Promise<Call | null> {
  if (conversationId) {
    const [c] = await db.select().from(calls).where(eq(calls.providerConversationId, conversationId));
    if (c) return c;
  }
  if (callControlId) {
    const [c] = await db.select().from(calls).where(eq(calls.providerCallControlId, callControlId));
    if (c) return c;
  }
  return null;
}

/** The limit each field error names, so the message and the check can't disagree. */
const FIELD_ERRORS: Record<string, number> = {
  fieldNameRequired: 1,
  fieldNameTooLong: MAX_FIELD_NAME_LENGTH,
  fieldDescriptionTooLong: MAX_FIELD_DESCRIPTION_LENGTH,
  fieldOptionTooLong: MAX_FIELD_OPTION_LENGTH,
  tooManyFieldOptions: MAX_FIELD_OPTIONS,
  tooManyFields: MAX_FIELDS,
};

/**
 * The fields and email settings posted with the agent form, checked strictly (stored values are read
 * leniently instead, see readResultsSettings). Throws a UserError naming what's wrong.
 */
export function parseResultsInput(raw: unknown): AgentResultsSettings {
  const r = (raw ?? {}) as { fields?: unknown; email?: Record<string, unknown> };
  const parsed = z.array(callField).max(MAX_FIELDS, "tooManyFields").safeParse(Array.isArray(r.fields) ? r.fields : []);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    if (message && message in FIELD_ERRORS) throw new UserError(message as ErrorKey, { max: FIELD_ERRORS[message] });
    throw new UserError("invalidInput");
  }
  const fields = parsed.data.map(normalizeField);
  const problem = fieldsProblem(fields);
  if (problem) throw new UserError(problem.key as ErrorKey, problem.params);

  const e = r.email ?? {};
  const recipients = (Array.isArray(e.recipients) ? e.recipients : []).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (recipients.length > MAX_RECIPIENTS) throw new UserError("tooManyRecipients", { max: MAX_RECIPIENTS });
  for (const address of recipients) {
    if (!z.email().safeParse(address).success) throw new UserError("invalidRecipient", { address });
  }
  const subject = String(e.subject ?? "").trim();
  if (subject.length > MAX_SUBJECT_LENGTH) throw new UserError("subjectTooLong", { max: MAX_SUBJECT_LENGTH });
  const note = String(e.note ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) throw new UserError("noteTooLong", { max: MAX_NOTE_LENGTH });
  const tagText = String(e.tagText ?? "").trim();
  if (tagText.length > MAX_TAG_LENGTH) throw new UserError("tagTooLong", { max: MAX_TAG_LENGTH });
  const tagField = fields.some((f) => f.key === e.tagField && f.type === "yesno") ? String(e.tagField) : null;
  const include = (e.include ?? {}) as Record<string, unknown>;
  const email = readEmailSettings({
    enabled: e.enabled === true,
    recipients: [...new Set(recipients)],
    subject,
    note,
    include: Object.fromEntries(EMAIL_PARTS.map((p) => [p, include[p] !== false])),
    tagField,
    tagText,
  });
  return { fields, email };
}
