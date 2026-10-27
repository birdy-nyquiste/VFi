import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, messages, phoneNumbers, type Message, type PhoneNumber } from "@/db/schema";
import { config } from "@/lib/config";
import { UserError } from "@/lib/errors";
import { stored } from "@/lib/stored-text";
import { applyLedger } from "./billing/ledger";
import { voiceProvider, type InboundMessageEvent } from "./telnyx";
import { withWebhookDedupe } from "./webhooks";

/**
 * Receive-only texting (SPEC §7). Texts are stored and billed per segment; nothing is ever sent,
 * so no 10DLC registration is needed.
 */

/** Store and bill one inbound text. Safe to call repeatedly with the same event. */
export async function handleInboundMessage(e: InboundMessageEvent): Promise<void> {
  await withWebhookDedupe("telnyx", e.id, e.rawType, async () => {
    const [num] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.e164, e.to), eq(phoneNumbers.status, "active")));
    if (!num) {
      console.warn("Text to a number we don't have active", e.to);
      return;
    }
    const usd = Number(e.costUsd);
    const billedCents = e.parts * config.pricing.smsInboundPerPartCents;
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(messages)
        .values({
          userId: num.userId,
          phoneNumberId: num.id,
          fromNumber: e.from,
          toNumber: e.to,
          body: e.text,
          parts: e.parts,
          mediaCount: e.mediaCount,
          providerMessageId: e.messageId,
          billedCents,
          providerCostMicros: Number.isFinite(usd) ? Math.round(usd * 1_000_000) : null,
          receivedAt: e.occurredAt,
        })
        .onConflictDoNothing()
        .returning();
      if (!created || billedCents === 0) return;
      // Texts can't be refused, so they're billed even when the balance is empty (it goes negative,
      // and the usual grace-period release applies).
      await applyLedger(
        {
          userId: num.userId,
          amountCents: -billedCents,
          kind: "sms",
          idempotencyKey: `sms:${e.messageId}`,
          description: stored("ledgerSms", { from: e.from, parts: e.parts }),
          refType: "message",
          refId: created.id,
        },
        tx,
      );
    });
  });
}

/** Put a number on the messaging profile. Failures are logged and retried by the daily cron. */
export async function enableInboundSms(n: Pick<PhoneNumber, "id" | "e164">): Promise<boolean> {
  if (!config.features.inboundSms) return false;
  try {
    await voiceProvider().enableInboundMessaging(n.e164);
  } catch (err) {
    console.error("enableInboundMessaging failed", n.id, err);
    return false;
  }
  await db.update(phoneNumbers).set({ smsEnabledAt: new Date() }).where(eq(phoneNumbers.id, n.id));
  return true;
}

/** Active numbers not yet on the messaging profile (bought before texting existed, or a failed attempt). */
export async function enablePendingInboundSms(): Promise<number> {
  if (!config.features.inboundSms) return 0;
  const pending = await db
    .select()
    .from(phoneNumbers)
    .where(and(eq(phoneNumbers.status, "active"), isNull(phoneNumbers.smsEnabledAt)));
  let enabled = 0;
  for (const n of pending) if (await enableInboundSms(n)) enabled++;
  return enabled;
}

export interface Conversation {
  from: string;
  /** The user's number it was sent to: a sender who texts two of them has two conversations. */
  to: string;
  /** The user's name for this sender, if they set one. */
  name?: string;
  last: Message;
  count: number;
  unread: number;
}

/**
 * Conversations (one per sender and receiving number), newest first, at most `limit` of them; only
 * those sent to `to` when it's given. Counts are over every text in the conversation, so they match
 * the unread badge.
 */
export async function listConversations(userId: string, limit = 500, to?: string): Promise<Conversation[]> {
  const visible = and(eq(messages.userId, userId), isNull(messages.deletedAt), to ? eq(messages.toNumber, to) : undefined);
  const groups = await db
    .select({
      from: messages.fromNumber,
      to: messages.toNumber,
      count: sql<number>`count(*)::int`,
      unread: sql<number>`(count(*) filter (where ${messages.readAt} is null))::int`,
    })
    .from(messages)
    .where(visible)
    .groupBy(messages.fromNumber, messages.toNumber)
    .orderBy(desc(sql`max(${messages.receivedAt})`), asc(messages.fromNumber), asc(messages.toNumber))
    .limit(limit);
  if (groups.length === 0) return [];
  const [latest, names] = await Promise.all([
    db
      .selectDistinctOn([messages.fromNumber, messages.toNumber])
      .from(messages)
      .where(and(visible, inArray(messages.fromNumber, groups.map((g) => g.from))))
      .orderBy(messages.fromNumber, messages.toNumber, desc(messages.receivedAt)),
    getContactNames(userId),
  ]);
  const key = (from: string, to: string) => `${from} ${to}`;
  const lastByKey = new Map(latest.map((m) => [key(m.fromNumber, m.toNumber), m]));
  return groups.flatMap((g) => {
    const last = lastByKey.get(key(g.from, g.to));
    // Missing only if the conversation was deleted between the two queries.
    return last ? [{ ...g, name: names.get(g.from), last }] : [];
  });
}

export async function countUnreadMessages(userId: string): Promise<number> {
  return db.$count(messages, and(eq(messages.userId, userId), isNull(messages.deletedAt), isNull(messages.readAt)));
}

/**
 * Which conversation: one sender's texts to one of the user's numbers, or to any of them when `to` is
 * omitted (links from before texts were split by the number they went to).
 */
export interface ConversationKey {
  from: string;
  to?: string;
}

function conversationTexts(userId: string, { from, to }: ConversationKey) {
  return and(eq(messages.userId, userId), eq(messages.fromNumber, from), to ? eq(messages.toNumber, to) : undefined, isNull(messages.deletedAt));
}

/** Every text in a conversation, oldest first. */
export async function getConversation(userId: string, key: ConversationKey): Promise<Message[]> {
  return db.select().from(messages).where(conversationTexts(userId, key)).orderBy(asc(messages.receivedAt));
}

/** Marks texts read, up to the newest one the user has seen. Returns how many changed. */
export async function markConversationRead(userId: string, key: ConversationKey, upTo: Date): Promise<number> {
  const changed = await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(conversationTexts(userId, key), isNull(messages.readAt), lte(messages.receivedAt, upTo)))
    .returning({ id: messages.id });
  return changed.length;
}

/** Deletes the text content of a conversation; billing rows stay. */
export async function deleteConversation(userId: string, key: ConversationKey): Promise<void> {
  const now = new Date();
  const deleted = await db
    .update(messages)
    .set({ body: null, purgedAt: now, deletedAt: now })
    .where(conversationTexts(userId, key))
    .returning({ id: messages.id });
  if (deleted.length === 0) throw new UserError("conversationNotFound");
}

/** Retention: blank text content older than the cutoff. */
export async function purgeExpiredMessages(cutoff: Date): Promise<number> {
  const purged = await db
    .update(messages)
    .set({ body: null, purgedAt: new Date() })
    .where(and(lt(messages.receivedAt, cutoff), isNull(messages.purgedAt)))
    .returning({ id: messages.id });
  return purged.length;
}

export const MAX_CONTACT_NAME_LENGTH = 60;

/** The user's names for senders, keyed by number. */
export async function getContactNames(userId: string): Promise<Map<string, string>> {
  const rows = await db.select().from(contacts).where(eq(contacts.userId, userId));
  return new Map(rows.map((c) => [c.number, c.name]));
}

export async function getContactName(userId: string, number: string): Promise<string | undefined> {
  const [c] = await db
    .select({ name: contacts.name })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.number, number)));
  return c?.name;
}

/** Longer than any phone number, short code or sender ID a text can come from. */
const MAX_SENDER_LENGTH = 64;

/** Name a sender who has texted the user; an empty name removes it. */
export async function setContactName(userId: string, number: string, rawName: string): Promise<void> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!number) throw new UserError("missingNumber");
  if (name.length > MAX_CONTACT_NAME_LENGTH) {
    throw new UserError("contactNameTooLong", { max: MAX_CONTACT_NAME_LENGTH });
  }
  if (!name) {
    await db.delete(contacts).where(and(eq(contacts.userId, userId), eq(contacts.number, number)));
    return;
  }
  // The number comes from the form, so only senders the user has actually had texts from (deleted
  // conversations too) get a row; anything else could add rows without limit.
  const [texted] =
    number.length > MAX_SENDER_LENGTH
      ? []
      : await db
          .select({ id: messages.id })
          .from(messages)
          .where(and(eq(messages.userId, userId), eq(messages.fromNumber, number)))
          .limit(1);
  if (!texted) throw new UserError("conversationNotFound");
  await db
    .insert(contacts)
    .values({ userId, number, name })
    .onConflictDoUpdate({ target: [contacts.userId, contacts.number], set: { name, updatedAt: new Date() } });
}
