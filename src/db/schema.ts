import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Locale } from "@/i18n/locales";
import type { AgentBehavior, AgentVariable, VoicemailAction } from "@/lib/agent-settings";
import type { CallBadge } from "@/lib/call-fields";
import type { Language } from "@/lib/language";
import type { StoredMessage } from "@/lib/stored-text";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

// ---------- Users & auth ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  googleSub: text("google_sub").unique(),
  /** Cached balance in US cents; only ever changed together with a ledger insert. */
  balanceCents: integer("balance_cents").notNull().default(0),
  /** When the balance first went negative; null while balance >= 0. */
  negativeSince: ts("negative_since"),
  /** Interface language the user picked; null until they pick one. Restored to the cookie at sign-in. */
  locale: text("locale").$type<Locale>(),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  /** sha256(token) — the raw token only lives in the cookie. */
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
});

export const emailOtps = pgTable(
  "email_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("email_otps_email_idx").on(t.email)],
);

// ---------- Billing ----------

export const paymentStatus = pgEnum("payment_status", ["pending", "succeeded", "failed"]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(), // "stripe"
  providerRef: text("provider_ref").notNull().unique(), // Stripe Checkout Session id
  amountCents: integer("amount_cents").notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  failureReason: text("failure_reason"),
  failureMsg: jsonb("failure_msg").$type<StoredMessage>(),
  createdAt: createdAt(),
  completedAt: ts("completed_at"),
});

export const ledgerKind = pgEnum("ledger_kind", [
  "topup",
  "call",
  "number_monthly",
  "voice_clone",
  "sms",
  "knowledge_source",
  "refund",
  "adjustment",
]);

/** Immutable record of every balance change. Sum(amount) per user == users.balance_cents. */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    amountCents: integer("amount_cents").notNull(), // + credit, - debit
    balanceAfterCents: integer("balance_after_cents").notNull(),
    kind: ledgerKind("kind").notNull(),
    /**
     * Guarantees a charge/credit is applied once: "call:<id>", "sms:<message id>", "number:<id>:0" (first month)
     * or "number:<id>:<paid through>" (renewals), "voice:<id>", "knowledge:<id>", "payment:<payments.id>",
     * "dev-credit:<uuid>"; a refund adds ":refund".
     */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    description: text("description").notNull(),
    /** The message `description` was written from, to show it in the viewer's language (null on older rows). */
    descriptionMsg: jsonb("description_msg").$type<StoredMessage>(),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_user_idx").on(t.userId, t.createdAt)],
);

// ---------- Resources ----------

export const numberStatus = pgEnum("number_status", ["pending", "active", "failed", "released"]);

export const phoneNumbers = pgTable(
  "phone_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    e164: text("e164").notNull(),
    providerOrderId: text("provider_order_id"),
    providerNumberId: text("provider_number_id"),
    status: numberStatus("status").notNull().default("pending"),
    failureReason: text("failure_reason"),
    failureMsg: jsonb("failure_msg").$type<StoredMessage>(),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    /** Monthly rental is paid up to this instant. */
    paidThrough: ts("paid_through"),
    /** When the number was put on the platform messaging profile (it can receive texts from then on). */
    smsEnabledAt: ts("sms_enabled_at"),
    createdAt: createdAt(),
    releasedAt: ts("released_at"),
  },
  (t) => [index("phone_numbers_e164_idx").on(t.e164), index("phone_numbers_user_idx").on(t.userId)],
);

export const voiceStatus = pgEnum("voice_status", ["processing", "ready", "failed"]);

/** Where a clone lives: on our Telnyx account, or in the user's own ElevenLabs account. */
export const cloneProvider = pgEnum("clone_provider", ["telnyx", "elevenlabs"]);

/** Cloned voices owned by users. Stock voices come straight from the provider catalog. */
export const voices = pgTable("voices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  language: text("language").$type<Language>().notNull(),
  provider: cloneProvider("provider").notNull().default("telnyx"),
  /** Provider clone id (for status/delete calls). */
  providerVoiceId: text("provider_voice_id"),
  /** Voice string used in assistant voice settings, e.g. "Telnyx.Qwen3TTS.<id>" or "ElevenLabs.<model>.<id>". */
  voiceRef: text("voice_ref"),
  status: voiceStatus("status").notNull().default("processing"),
  failureReason: text("failure_reason"),
  failureMsg: jsonb("failure_msg").$type<StoredMessage>(),
  consentAt: ts("consent_at").notNull(),
  createdAt: createdAt(),
  deletedAt: ts("deleted_at"),
});

/**
 * A user's own ElevenLabs API key (bring your own key). Clones made with it live in their
 * ElevenLabs account, and calls with those voices use their ElevenLabs credits.
 */
export const elevenLabsKeys = pgTable("elevenlabs_keys", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  /** AES-256-GCM, see server/secrets.ts. We need the key itself to clone, delete and preview voices. */
  keyEncrypted: text("key_encrypted").notNull(),
  /** Last 4 characters, for display. */
  keyHint: text("key_hint").notNull(),
  /** ElevenLabs account the key belongs to; a replacement key must be from the same account. */
  accountId: text("account_id").notNull(),
  /** Telnyx integration secret holding the same key; agents reference `telnyxSecretRef` as voice api_key_ref. */
  telnyxSecretId: text("telnyx_secret_id").notNull(),
  telnyxSecretRef: text("telnyx_secret_ref").notNull(),
  /** When ElevenLabs last answered whether the key works (see elevenLabsKeyUsable). */
  keyCheckedAt: ts("key_checked_at"),
  /** Set while ElevenLabs rejects the key (revoked, expired, missing permissions); calls with its voices are refused. */
  keyInvalidAt: ts("key_invalid_at"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const agentStatus = pgEnum("agent_status", ["syncing", "ready", "failed"]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  greeting: text("greeting").notNull(),
  language: text("language").$type<Language>().notNull(),
  /** Provider voice identifier actually sent to the assistant. */
  voiceRef: text("voice_ref").notNull(),
  /** Set when the voice is one of the user's clones. */
  voiceId: uuid("voice_id").references(() => voices.id),
  /** LLM id; null means the platform default (config.telnyx.llmModel). */
  model: text("model"),
  /** Call behavior (voice speed, turn-taking, when to hang up…); read with readBehavior(). */
  behavior: jsonb("behavior").$type<Partial<AgentBehavior>>().notNull().default({}),
  /** The user's own {{variables}} with default values; read with readVariables(). */
  variables: jsonb("variables").$type<AgentVariable[]>().notNull().default([]),
  providerAssistantId: text("provider_assistant_id"),
  /** Fingerprint of the platform model settings last pushed to the provider; see platformFingerprint(). */
  syncedConfig: text("synced_config"),
  status: agentStatus("status").notNull().default("syncing"),
  failureReason: text("failure_reason"),
  failureMsg: jsonb("failure_msg").$type<StoredMessage>(),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

// ---------- Knowledge base (SPEC §8) ----------

/** How an agent uses its knowledge base on calls. */
export const knowledgeMode = pgEnum("knowledge_mode", ["off", "reference", "strict"]);
export const knowledgeBaseStatus = pgEnum("knowledge_base_status", ["ready", "deleting"]);
export const knowledgeSourceType = pgEnum("knowledge_source_type", ["text", "file", "url"]);
export const knowledgeSourceStatus = pgEnum("knowledge_source_status", ["processing", "ready", "failed", "deleting"]);

/**
 * An agent's knowledge base: one provider storage bucket. A separate table rather than columns on
 * `agents`, because previews share the production database before migrations run (SPEC §2.6).
 */
export const agentKnowledge = pgTable("agent_knowledge", {
  agentId: uuid("agent_id").primaryKey().references(() => agents.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  mode: knowledgeMode("mode").notNull().default("reference"),
  /** Provider bucket name; derived from the agent id so creating it can be retried. */
  bucket: text("bucket").notNull(),
  status: knowledgeBaseStatus("status").notNull().default("ready"),
  /** When embedding was turned on for the bucket; null until it is. */
  embeddedAt: ts("embedded_at"),
  createdAt: createdAt(),
});

/** A source in an agent's knowledge base. Never edited; deleting it removes the row once the provider copy is gone. */
export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    type: knowledgeSourceType("type").notNull(),
    /** Shown in the list: the title, file name or URL. Cleared on delete. */
    name: text("name"),
    /** Typed text, shown on request in the list. Cleared on delete. */
    content: text("content"),
    /** The website (URL sources), linked from the list. Cleared on delete. */
    url: text("url"),
    /** Provider crawl task (URL sources). */
    crawlTaskId: text("crawl_task_id"),
    sizeBytes: integer("size_bytes"),
    /** What was charged, so a refund matches it even if the price changes. */
    priceCents: integer("price_cents").notNull(),
    status: knowledgeSourceStatus("status").notNull().default("processing"),
    failureReason: text("failure_reason"),
    failureMsg: jsonb("failure_msg").$type<StoredMessage>(),
    createdAt: createdAt(),
  },
  (t) => [index("knowledge_sources_user_idx").on(t.userId), index("knowledge_sources_agent_idx").on(t.agentId)],
);

// ---------- Calls ----------

export const callDirection = pgEnum("call_direction", ["inbound", "outbound"]);
export const callStatus = pgEnum("call_status", [
  "initiated",
  "answered",
  "completed",
  "rejected",
  "failed",
]);

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    phoneNumberId: uuid("phone_number_id").references(() => phoneNumbers.id),
    direction: callDirection("direction").notNull(),
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),
    /** Outbound only: what the user asked the agent to do on this call ({{call_goal}}). */
    goal: text("goal"),
    /** Outbound only: values the user gave for the agent's ask-on-each-call variables. */
    variables: jsonb("variables").$type<Record<string, string>>(),
    providerCallControlId: text("provider_call_control_id").unique(),
    providerCallSessionId: text("provider_call_session_id"),
    providerConversationId: text("provider_conversation_id"),
    status: callStatus("status").notNull().default("initiated"),
    /** Human-readable explanation for rejected / failed / unanswered calls. */
    outcome: text("outcome"),
    outcomeMsg: jsonb("outcome_msg").$type<StoredMessage>(),
    hangupCause: text("hangup_cause"),
    answeredAt: ts("answered_at"),
    endedAt: ts("ended_at"),
    durationSec: integer("duration_sec"),
    billedCents: integer("billed_cents"),
    /** True when the call failed on our side (e.g. agent didn't start); no charge. */
    chargeWaived: boolean("charge_waived").notNull().default(false),
    /** Telnyx cost from the call.cost webhook, in micro-USD; reconciliation only, never billed. */
    providerCostMicros: integer("provider_cost_micros"),
    /** Provider recording URLs expire quickly, so we only remember that one exists and fetch on demand. */
    hasRecording: boolean("has_recording").notNull().default(false),
    transcript: jsonb("transcript").$type<{ role: string; text: string }[]>(),
    summary: text("summary"),
    resultsFetched: boolean("results_fetched").notNull().default(false),
    /** Set once recording/transcript/summary were deleted here and at the provider. */
    purgedAt: ts("purged_at"),
    createdAt: createdAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("calls_user_idx").on(t.userId, t.createdAt), index("calls_session_idx").on(t.providerCallSessionId)],
);

// ---------- Text messages (receive only; SPEC §7) ----------

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    phoneNumberId: uuid("phone_number_id").references(() => phoneNumbers.id),
    /** Sender: usually E.164, but short codes send texts too. */
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),
    /** Null once purged (retention or deleted by the user). */
    body: text("body"),
    /** SMS segments, as billed. */
    parts: integer("parts").notNull().default(1),
    /** MMS attachments are counted, never downloaded. */
    mediaCount: integer("media_count").notNull().default(0),
    providerMessageId: text("provider_message_id").notNull().unique(),
    billedCents: integer("billed_cents").notNull().default(0),
    /** Telnyx cost from the webhook, in micro-USD; reconciliation only. */
    providerCostMicros: integer("provider_cost_micros"),
    receivedAt: ts("received_at").notNull(),
    readAt: ts("read_at"),
    purgedAt: ts("purged_at"),
    createdAt: createdAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("messages_user_idx").on(t.userId, t.receivedAt)],
);

/** A user's own label for a number that texts them. */
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    /** As it appears on messages.from_number. */
    number: text("number").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("contacts_user_number_idx").on(t.userId, t.number)],
);

// ---------- Webhook dedupe ----------

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    receivedAt: createdAt(),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.eventId)],
);

export type User = typeof users.$inferSelect;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type Voice = typeof voices.$inferSelect;
export type ElevenLabsKey = typeof elevenLabsKeys.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type AgentKnowledge = typeof agentKnowledge.$inferSelect;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type KnowledgeMode = AgentKnowledge["mode"];

// ---------- Call results and email (SPEC §9.2) ----------

/**
 * What an agent records from each call and who gets emailed afterwards, plus the provider insight group
 * that does the recording. Its own table because previews share the production database (SPEC §2.6).
 * No row means no fields and no email; the insight ids are filled in on the agent's next push.
 */
export const agentCallResults = pgTable("agent_call_results", {
  agentId: uuid("agent_id").primaryKey().references(() => agents.id),
  /** CallField[] (src/lib/call-fields.ts). */
  fields: jsonb("fields").$type<unknown[]>().notNull().default([]),
  /** EmailSettings (src/lib/call-email.ts). */
  email: jsonb("email").$type<Record<string, unknown>>().notNull().default({}),
  /** When the fields last changed: calls that started earlier get no field results (they were asked other things). */
  fieldsSince: ts("fields_since"),
  /** When the email was last turned on: calls that started earlier aren't emailed. */
  emailSince: ts("email_since"),
  insightGroupId: text("insight_group_id"),
  summaryInsightId: text("summary_insight_id"),
  fieldsInsightId: text("fields_insight_id"),
  /** What the provider's insights were last set up from; they're updated when it changes. */
  insightsHash: text("insights_hash"),
  /** When test emails were sent in the last hour, for their limit. */
  testEmailsAt: jsonb("test_emails_at").$type<string[]>().notNull().default([]),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/**
 * A finished call's field results and its email. Written once, when the call's results become final; the
 * insert is what makes sure each call is emailed at most once.
 */
export const callResults = pgTable("call_results", {
  callId: uuid("call_id").primaryKey().references(() => calls.id),
  /** The fields as they were for this call, so later edits don't relabel old results. Cleared on purge. */
  fields: jsonb("fields").$type<unknown[]>(),
  /** Field key → value. Null when the provider returned none, or once purged. */
  values: jsonb("values").$type<Record<string, string | boolean | null>>(),
  /** "urgent" or "followup" from a yes/no field, for the calls list. */
  badge: text("badge").$type<CallBadge>(),
  emailStatus: text("email_status").$type<EmailStatus>().notNull(),
  emailedTo: jsonb("emailed_to").$type<string[]>(),
  emailedAt: ts("emailed_at"),
  createdAt: createdAt(),
});

/**
 * Voicemail on a call the agent placed (SPEC §9.3). Either webhook may arrive first, so each fills in its
 * half: `action` when voicemail was detected (the agent's setting at the time), `assistantEndedAt` when the
 * assistant finished. A row without an action is a call that hasn't reached voicemail (so far).
 */
export const callVoicemail = pgTable("call_voicemail", {
  callId: uuid("call_id").primaryKey().references(() => calls.id),
  action: text("action").$type<VoicemailAction>(),
  assistantEndedAt: ts("assistant_ended_at"),
  createdAt: createdAt(),
});

/** "off" (email not on for the call), "pending" (being sent), "sent", "failed" (not retried). */
export type EmailStatus = "off" | "pending" | "sent" | "failed";

export type AgentCallResults = typeof agentCallResults.$inferSelect;
export type CallResultRow = typeof callResults.$inferSelect;
