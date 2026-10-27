import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { agentCallResults, callResults, calls } from "@/db/schema";
import { DEFAULT_EMAIL_SETTINGS, readEmailSettings, renderCallEmail, sampleEmailData, unknownVariables, type EmailSettings } from "@/lib/call-email";
import { callBadge, fieldsJsonSchema, fieldsProblem, parseFieldResults, type CallField } from "@/lib/call-fields";
import { createAgent, updateAgent } from "@/server/agents";
import { parseResultsInput, sendTestEmail } from "@/server/call-results";
import { purgeCallContent } from "@/server/calls";
import { fetchCallResults, handleInsightsReady } from "@/server/calls/results";
import { mockInsights, mockProvider } from "@/server/telnyx/mock";
import { makeLine, makeUser, resetDb } from "./helpers";

const sent: { to: string | string[]; subject: string; text: string; html?: string }[] = [];
let sendFails = false;
vi.mock("@/server/email", () => ({
  sendEmail: async (msg: { to: string | string[]; subject: string; text: string; html?: string }) => {
    if (sendFails) throw new Error("Resend 422");
    sent.push(msg);
  },
}));

beforeEach(async () => {
  await resetDb();
  sent.length = 0;
  sendFails = false;
  mockInsights.groups.clear();
  mockInsights.failSync = false;
});
afterEach(() => vi.restoreAllMocks());

const urgent: CallField = { key: "furgent", name: "Urgent", description: "Needs an answer today", type: "yesno", options: [], badge: "urgent" };
const name: CallField = { key: "fname", name: "Name", description: "The caller's name", type: "text", options: [], badge: "none" };
const kind: CallField = { key: "fkind", name: "Call type", description: "", type: "choice", options: ["New", "Existing"], badge: "none" };

describe("call-result fields", () => {
  it("build a strict schema the provider accepts: every field required, each nullable, nothing else allowed", () => {
    expect(fieldsJsonSchema([name, kind, urgent])).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["fname", "fkind", "furgent"],
      properties: {
        fname: { type: ["string", "null"], description: "Name: The caller's name" },
        fkind: { type: ["string", "null"], enum: ["New", "Existing", null], description: "Call type" },
        furgent: { type: ["boolean", "null"], description: "Urgent: Needs an answer today" },
      },
    });
  });

  it("keep only the asked-for fields from the provider's result, with the right types", () => {
    const raw = JSON.stringify({ fname: " Dana ", fkind: "Partner", furgent: "yes", extra: 1 });
    expect(parseFieldResults([name, kind, urgent], raw)).toEqual({ fname: "Dana", fkind: null, furgent: null });
    expect(parseFieldResults([name], "not json")).toBeNull();
    expect(parseFieldResults([name], undefined)).toBeNull();
  });

  it("mark a call from a yes/no field set to show a badge", () => {
    expect(callBadge([urgent], { furgent: true })).toBe("urgent");
    expect(callBadge([urgent], { furgent: false })).toBeNull();
    expect(callBadge([{ ...urgent, badge: "none" }], { furgent: true })).toBeNull();
  });

  it("refuse duplicate names and choices without options", () => {
    expect(fieldsProblem([name, { ...name, key: "fother", name: "name" }])).toMatchObject({ key: "fieldNameDuplicate" });
    expect(fieldsProblem([{ ...kind, options: ["Only"] }])).toMatchObject({ key: "fieldNeedsOptions" });
    expect(fieldsProblem([name, kind, urgent])).toBeNull();
  });
});

describe("the email template", () => {
  const settings = (s: Partial<EmailSettings> = {}) => ({ ...DEFAULT_EMAIL_SETTINGS, ...s });
  const data = { ...sampleEmailData([name, urgent], "Front Desk", "en", "https://vfi.test/calls/1"), values: { fname: "Dana <b>Lee</b>", furgent: true } };

  it("fills in variables, by English or Chinese name, and fields by their names", () => {
    const r = renderCallEmail(settings({ subject: "{{Assistant}} / {{我方号码}} / {{name}} / {{Urgent}}" }), data, "en");
    expect(r.subject).toBe("Front Desk / (415) 555-0142 / Dana <b>Lee</b> / Yes");
  });

  it("uses the default subject in the agent's language, and the tag when its field is yes", () => {
    expect(renderCallEmail(settings(), data, "en").subject).toBe("Front Desk: call from (650) 555-0133");
    expect(renderCallEmail(settings({ tagField: "furgent" }), data, "en").subject).toBe("[Urgent] Front Desk: call from (650) 555-0133");
    expect(renderCallEmail(settings({ tagField: "furgent", tagText: "!!" }), { ...data, values: { furgent: false } }, "zh").subject).toBe(
      "Front Desk：来自 (650) 555-0133 的通话",
    );
  });

  it("describes calls the agent placed as calls to the number", () => {
    const outbound = { ...data, direction: "outbound" as const };
    const en = renderCallEmail(settings(), outbound, "en");
    expect(en.subject).toBe("Front Desk: call to (650) 555-0133");
    expect(en.text).toContain("Number called: (650) 555-0133");
    expect(en.text).not.toContain("Caller:");
    expect(renderCallEmail(settings(), outbound, "zh").subject).toBe("Front Desk：拨给 (650) 555-0133 的通话");
    // A subject the user wrote is kept as is.
    expect(renderCallEmail(settings({ subject: "{{Assistant}}" }), outbound, "en").subject).toBe("Front Desk");
  });

  it("leaves unknown variables empty and reports them", () => {
    expect(unknownVariables("Hi {{Nope}} {{Name}} {{助理}}", [name])).toEqual(["Nope"]);
    expect(renderCallEmail(settings({ subject: "A{{Nope}}B" }), data, "en").subject).toBe("AB");
  });

  it("includes only the parts that are ticked, and escapes values in the HTML", () => {
    const r = renderCallEmail(settings({ include: { caller: false, time: true, fields: true, summary: false, link: false } }), data, "en");
    expect(r.text).not.toContain("(650) 555-0133");
    expect(r.text).toContain("Name: Dana <b>Lee</b>");
    expect(r.text).not.toContain("Summary");
    expect(r.html).toContain("Dana &lt;b&gt;Lee&lt;/b&gt;");
    expect(r.html).not.toContain("<b>Lee");
  });

  it("says when the summary wasn't ready", () => {
    expect(renderCallEmail(settings(), { ...data, summary: null }, "en").text).toContain("The summary wasn't ready in time");
  });
});

describe("saving an agent's call results", () => {
  const input = { name: "Desk", instructions: "Be helpful", greeting: "Hi", language: "en", voice: "stock:Telnyx.KokoroTTS.af_heart" };
  const results = (fields: CallField[], email: Record<string, unknown> = {}) => ({ fields, email });

  it("sets up the agent's own insight group, updates it in place, and puts it on the assistant", async () => {
    const u = await makeUser();
    const create = vi.spyOn(mockProvider, "createAssistant");
    const a = await createAgent(u.id, { ...input, results: results([name, urgent]) });
    const [row] = await db.select().from(agentCallResults).where(eq(agentCallResults.agentId, a.id));
    expect(row).toMatchObject({ insightGroupId: expect.any(String), summaryInsightId: expect.any(String), fieldsInsightId: expect.any(String) });
    expect(create.mock.calls[0][0].insightGroupId).toBe(row.insightGroupId);
    const group = mockInsights.groups.get(row.insightGroupId!)!;
    expect(group.spec.fields?.schema).toEqual(fieldsJsonSchema([name, urgent]));
    expect(group.spec.summaryInstructions).toContain("Write in English");
    // Names can't tell anyone's gender; neither the summary nor the fields may guess it.
    expect(group.spec.summaryInstructions).toContain("never assume anyone's gender");
    expect(group.spec.fields?.instructions).toContain("never assume anyone's gender");

    // Same group and insights after an edit; no fields means no fields insight.
    await updateAgent(u.id, a.id, { ...input, language: "zh", voice: "stock:Telnyx.Ultra.7a5d4663-88ae-47b7-808e-8f9b9ee4127b", results: results([]) });
    const [after] = await db.select().from(agentCallResults).where(eq(agentCallResults.agentId, a.id));
    expect(after).toMatchObject({ insightGroupId: row.insightGroupId, summaryInsightId: row.summaryInsightId, fieldsInsightId: null });
    expect(mockInsights.groups.get(row.insightGroupId!)!.spec.summaryInstructions).toContain("Simplified Chinese");
  });

  it("keeps the agent working when the insight group can't be set up, and retries later", async () => {
    const u = await makeUser();
    mockInsights.failSync = true;
    const a = await createAgent(u.id, { ...input, results: results([name]) });
    expect(a.status).toBe("ready");
    expect(a.syncedConfig).toMatch(/:rpending$/);
  });

  it("checks what's posted", () => {
    expect(() => parseResultsInput(results([name, { ...name, key: "fx" }]))).toThrow(/named "Name"/);
    expect(() => parseResultsInput(results([], { recipients: ["a@b.co", "not-an-email"] }))).toThrow(/not-an-email/);
    expect(() => parseResultsInput(results([], { recipients: ["a@b.co", "b@b.co", "c@b.co", "d@b.co"] }))).toThrow(/up to 3/);
    expect(() => parseResultsInput(results([], { tagText: "x".repeat(31) }))).toThrow(/under 30/);
    expect(() => parseResultsInput(results([{ ...name, name: "x".repeat(41) }]))).toThrow(/under 40/);
    // Left empty, the subject and tag stay empty: the defaults are filled in when sending, in the agent's language.
    expect(parseResultsInput(results([], { subject: "  ", tagText: "" })).email).toMatchObject({ subject: "", tagText: "" });
    // A tag can only point at an existing yes/no field.
    expect(parseResultsInput(results([name], { tagField: "fname" })).email.tagField).toBeNull();
    expect(parseResultsInput(results([urgent], { enabled: true, tagField: "furgent" })).email).toMatchObject({ enabled: true, tagField: "furgent" });
  });
});

describe("after a call", () => {
  async function setUp(email: Record<string, unknown>, fields: CallField[] = [name, urgent]) {
    const line = await makeLine(1000);
    await db.insert(agentCallResults).values({
      agentId: line.agent.id,
      fields,
      email: readEmailSettings(email),
      insightGroupId: "g1",
      summaryInsightId: "s1",
      fieldsInsightId: "f1",
      // Set up before the call started.
      fieldsSince: new Date(Date.now() - 60 * 60_000),
      emailSince: new Date(Date.now() - 60 * 60_000),
    });
    const endedAt = new Date(Date.now() - 60_000);
    const [call] = await db
      .insert(calls)
      .values({
        userId: line.user.id,
        agentId: line.agent.id,
        phoneNumberId: line.number.id,
        direction: "inbound",
        fromNumber: "+16505550133",
        toNumber: line.number.e164,
        providerCallControlId: "cc-r",
        providerConversationId: "conv-r",
        status: "completed",
        answeredAt: new Date(endedAt.getTime() - 60_000),
        endedAt,
        durationSec: 60,
      })
      .returning();
    vi.spyOn(mockProvider, "getCallResults").mockResolvedValue({
      transcript: [{ role: "user", text: "Hi" }],
      summary: "Dana called.",
      fields: JSON.stringify({ fname: "Dana", furgent: true }),
    });
    return { ...line, call };
  }

  it("stores the field results and badge, and emails the recipients once", async () => {
    const { call } = await setUp({ enabled: true, recipients: ["team@example.com"], tagField: "furgent" });
    const getResults = vi.mocked(mockProvider.getCallResults);
    await fetchCallResults(call);
    expect(getResults.mock.calls[0][1]).toEqual({ summaryId: "s1", fieldsId: "f1" });
    const [row] = await db.select().from(callResults).where(eq(callResults.callId, call.id));
    expect(row).toMatchObject({ values: { fname: "Dana", furgent: true }, badge: "urgent", emailStatus: "sent", emailedTo: ["team@example.com"] });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["team@example.com"], subject: "[Urgent] Test agent: call from (650) 555-0133" });
    expect(sent[0].text).toContain("Dana called.");

    // The webhook, the page and the daily job can all get here again: still one email.
    await handleInsightsReady({ id: "e1", type: "insights.ready", rawType: "conversation_insight_result", occurredAt: new Date(), conversationId: "conv-r" });
    const [again] = await db.select().from(calls).where(eq(calls.id, call.id));
    await fetchCallResults(again);
    expect(sent).toHaveLength(1);
  });

  it("finishes the call when the insight webhook arrives", async () => {
    const { call } = await setUp({ enabled: true });
    await handleInsightsReady({ id: "e1", type: "insights.ready", rawType: "conversation_insight_result", occurredAt: new Date(), conversationId: "conv-r" });
    const [after] = await db.select().from(calls).where(eq(calls.id, call.id));
    expect(after).toMatchObject({ resultsFetched: true, summary: "Dana called." });
    // No recipients set: the account email.
    expect(sent[0].to).toEqual([expect.stringMatching(/@test\.dev$/)]);
  });

  it("stores results without emailing when email is off", async () => {
    const { call } = await setUp({ enabled: false });
    await fetchCallResults(call);
    expect(sent).toHaveLength(0);
    const [row] = await db.select().from(callResults).where(eq(callResults.callId, call.id));
    expect(row).toMatchObject({ emailStatus: "off", badge: "urgent" });
  });

  it("records a failed email instead of retrying it on every page view", async () => {
    const { call } = await setUp({ enabled: true });
    sendFails = true;
    await fetchCallResults(call);
    const [row] = await db.select().from(callResults).where(eq(callResults.callId, call.id));
    expect(row.emailStatus).toBe("failed");
  });

  it("doesn't email for calls the agent never handled", async () => {
    const { call } = await setUp({ enabled: true });
    await db.update(calls).set({ status: "rejected", resultsFetched: false }).where(eq(calls.id, call.id));
    const [rejected] = await db.select().from(calls).where(eq(calls.id, call.id));
    await fetchCallResults(rejected);
    expect(sent).toHaveLength(0);
  });

  it("sends the email without a summary once the wait is over", async () => {
    const { call } = await setUp({ enabled: true });
    vi.mocked(mockProvider.getCallResults).mockResolvedValue({ transcript: [], summaryPending: true });
    await db.update(calls).set({ endedAt: new Date(Date.now() - 31 * 60_000) }).where(eq(calls.id, call.id));
    const [late] = await db.select().from(calls).where(eq(calls.id, call.id));
    await fetchCallResults(late);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("The summary wasn't ready in time");
  });

  it("deletes the field results, and the badge they gave, with the call's content", async () => {
    const { call } = await setUp({ enabled: false });
    await fetchCallResults(call);
    const [finished] = await db.select().from(calls).where(eq(calls.id, call.id));
    await purgeCallContent(finished);
    const [row] = await db.select().from(callResults).where(eq(callResults.callId, call.id));
    expect(row).toMatchObject({ values: null, fields: null, badge: null });
  });

  it("gives calls from before the fields or the email were set up neither", async () => {
    const { call, agent } = await setUp({ enabled: true });
    await db
      .update(agentCallResults)
      // Set up after the call started.
      .set({ fieldsSince: new Date(call.createdAt.getTime() + 1000), emailSince: new Date(call.createdAt.getTime() + 1000) })
      .where(eq(agentCallResults.agentId, agent.id));
    await fetchCallResults(call);
    const [row] = await db.select().from(callResults).where(eq(callResults.callId, call.id));
    expect(row).toMatchObject({ fields: [], values: null, badge: null, emailStatus: "off" });
    expect(sent).toHaveLength(0);
  });

  it("finishes at once, without a summary, when the provider's insights failed", async () => {
    const { call } = await setUp({ enabled: true });
    vi.mocked(mockProvider.getCallResults).mockResolvedValue({ transcript: [], summaryPending: false });
    await fetchCallResults(call);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("The summary wasn't ready in time");
  });
});

describe("test emails", () => {
  it("go to the account email, at most 5 per agent per hour, and only for the user's own agents", async () => {
    const { user, agent } = await makeLine(1000);
    const settings = parseResultsInput({ fields: [name], email: { enabled: true, recipients: ["team@example.com"] } });
    for (let i = 0; i < 5; i++) await sendTestEmail(user.id, agent.id, settings);
    expect(sent.map((m) => m.to)).toEqual(Array(5).fill(user.email));
    await expect(sendTestEmail(user.id, agent.id, settings)).rejects.toThrow(/up to 5 test emails/);
    const other = await makeUser();
    await expect(sendTestEmail(other.id, agent.id, settings)).rejects.toThrow(/not found/i);
  });
});
