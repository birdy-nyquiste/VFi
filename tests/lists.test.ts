import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { callResults, calls, callVoicemail, contacts, messages, type Call } from "@/db/schema";
import { listHref, readPage, singleValues } from "@/lib/list-params";
import { applyLedger } from "@/server/billing/ledger";
import { listLedger } from "@/server/billing/payments";
import { findUserCalls } from "@/server/calls/list";
import { listConversations } from "@/server/messages";
import { makeLine, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("list addresses", () => {
  it("reads only positive whole page numbers", () => {
    expect([undefined, "0", "-2", "1.5", "abc", "3"].map(readPage)).toEqual([1, 1, 1, 1, 1, 3]);
  });

  it("uses the first value of a parameter given twice", () => {
    expect(singleValues({ q: ["1", "2"], page: "3" })).toEqual({ q: "1", page: "3" });
  });

  it("drops empty values and goes back to page 1 when a filter changes", () => {
    const current = { q: "0188", status: "failed", page: "3" };
    expect(listHref("/calls", current, { status: undefined })).toBe("/calls?q=0188");
    expect(listHref("/calls", current, { page: "4" })).toBe("/calls?q=0188&status=failed&page=4");
    expect(listHref("/calls", current, { page: "1" })).toBe("/calls?q=0188&status=failed");
  });
});

describe("calls list", () => {
  async function setup() {
    const line = await makeLine();
    const t0 = Date.now() - 60_000;
    const add = async (fields: Partial<typeof calls.$inferInsert>, secondsAgo: number) =>
      (
        await db
          .insert(calls)
          .values({
            userId: line.user.id,
            agentId: line.agent.id,
            phoneNumberId: line.number.id,
            direction: "inbound",
            fromNumber: "+15715550188",
            toNumber: line.number.e164,
            status: "completed",
            ...fields,
            createdAt: new Date(t0 - secondsAgo * 1000),
          })
          .returning()
      )[0];
    const inbound = await add({ durationSec: 190, billedCents: 32 }, 10);
    const outbound = await add({ direction: "outbound", fromNumber: line.number.e164, toNumber: "+12025550188", durationSec: 41, billedCents: 10 }, 20);
    const voicemail = await add({ direction: "outbound", fromNumber: line.number.e164, toNumber: "+17035559999", durationSec: 30, billedCents: 10 }, 30);
    const rejected = await add({ fromNumber: "+13125550101", status: "rejected" }, 40 * 24 * 3600);
    // Still on the line: voicemail is detected while the call is answered.
    const liveVoicemail = await add({ direction: "outbound", fromNumber: line.number.e164, toNumber: "+17035558888", status: "answered" }, 5 * 24 * 3600);
    await db.insert(callVoicemail).values([
      { callId: voicemail.id, action: "hangup" },
      { callId: liveVoicemail.id, action: "message" },
    ]);
    await db.insert(callResults).values({ callId: inbound.id, badge: "urgent", emailStatus: "off" });
    return { ...line, inbound, outbound, voicemail, rejected, liveVoicemail };
  }
  const ids = (rows: { call: Call }[]) => rows.map((r) => r.call.id);

  it("searches the other party's number, whichever way the call went", async () => {
    const s = await setup();
    const { rows, total } = await findUserCalls(s.user.id, { search: "0188" });
    expect(ids(rows)).toEqual([s.inbound.id, s.outbound.id]);
    expect(total).toBe(2);
    // Our own number is on every call, so it isn't searched.
    expect((await findUserCalls(s.user.id, { search: s.number.e164.slice(-4) })).total).toBe(0);
    expect((await findUserCalls(s.user.id, { search: "abc" })).total).toBe(0);
  });

  it("lists voicemail calls under voicemail and no other status, live or not", async () => {
    const s = await setup();
    expect(ids((await findUserCalls(s.user.id, { status: "voicemail" })).rows)).toEqual([s.voicemail.id, s.liveVoicemail.id]);
    expect(ids((await findUserCalls(s.user.id, { status: "completed" })).rows)).toEqual([s.inbound.id, s.outbound.id]);
    expect((await findUserCalls(s.user.id, { status: "answered" })).total).toBe(0);
    expect(ids((await findUserCalls(s.user.id, { status: "rejected" })).rows)).toEqual([s.rejected.id]);
  });

  it("filters by direction, mark and time", async () => {
    const s = await setup();
    expect(ids((await findUserCalls(s.user.id, { direction: "outbound" })).rows)).toEqual([s.outbound.id, s.voicemail.id, s.liveVoicemail.id]);
    expect(ids((await findUserCalls(s.user.id, { badge: "urgent" })).rows)).toEqual([s.inbound.id]);
    expect((await findUserCalls(s.user.id, { badge: "followup" })).total).toBe(0);
    expect((await findUserCalls(s.user.id, { period: "7d" })).total).toBe(4);
    expect((await findUserCalls(s.user.id, { period: "30d" })).total).toBe(4);
    expect((await findUserCalls(s.user.id, { period: "today", timeZone: "America/New_York" })).total).toBeLessThanOrEqual(3);
  });

  it("sorts by length and cost, with calls that have none last", async () => {
    const s = await setup();
    expect(ids((await findUserCalls(s.user.id, {}, "longest")).rows)).toEqual([s.inbound.id, s.outbound.id, s.voicemail.id, s.liveVoicemail.id, s.rejected.id]);
    expect(ids((await findUserCalls(s.user.id, {}, "shortest")).rows)).toEqual([s.voicemail.id, s.outbound.id, s.inbound.id, s.liveVoicemail.id, s.rejected.id]);
    expect(ids((await findUserCalls(s.user.id, {}, "oldest")).rows)[0]).toBe(s.rejected.id);
    expect(ids((await findUserCalls(s.user.id, {}, "cheapest")).rows).at(-1)).toBe(s.rejected.id);
  });

  it("pages 15 at a time and shows the last page for one past the end", async () => {
    const { user, agent, number } = await makeLine();
    await db.insert(calls).values(
      Array.from({ length: 20 }, (_, i) => ({
        userId: user.id,
        agentId: agent.id,
        phoneNumberId: number.id,
        direction: "inbound" as const,
        fromNumber: `+1202555${String(1000 + i)}`,
        toNumber: number.e164,
        createdAt: new Date(Date.now() - i * 1000),
      })),
    );
    expect((await findUserCalls(user.id, {}, "newest", 1)).rows).toHaveLength(15);
    const last = await findUserCalls(user.id, {}, "newest", 9);
    expect([last.page, last.rows.length, last.total]).toEqual([2, 5, 20]);
  });

  it("never lists another user's calls", async () => {
    await setup();
    const other = await makeUser();
    expect((await findUserCalls(other.id, { search: "0188" })).total).toBe(0);
  });
});

describe("conversations list", () => {
  async function setup() {
    const { user, number } = await makeLine();
    const t0 = Date.now() - 60_000;
    const text = (from: string, i: number, read = false) => ({
      userId: user.id,
      fromNumber: from,
      toNumber: number.e164,
      body: `${from} ${i}`,
      providerMessageId: `${from}-${i}`,
      receivedAt: new Date(t0 + i * 1000),
      readAt: read ? new Date() : null,
    });
    await db.insert(messages).values([text("+15715550102", 1), text("+14155557731", 2, true), text("+12125550188", 3, true)]);
    await db.insert(contacts).values({ userId: user.id, number: "+15715550102", name: "Dana (plumber)" });
    return { user };
  }
  const froms = (r: { conversations: { from: string }[] }) => r.conversations.map((c) => c.from);

  it("searches names and numbers", async () => {
    const { user } = await setup();
    expect(froms(await listConversations(user.id, { search: "plumb" }))).toEqual(["+15715550102"]);
    expect(froms(await listConversations(user.id, { search: "7731" }))).toEqual(["+14155557731"]);
    expect((await listConversations(user.id, { search: "%" })).total).toBe(0);
  });

  it("shows only unread, and oldest first when asked", async () => {
    const { user } = await setup();
    expect(froms(await listConversations(user.id, { unreadOnly: true }))).toEqual(["+15715550102"]);
    expect(froms(await listConversations(user.id, { oldestFirst: true }))).toEqual(["+15715550102", "+14155557731", "+12125550188"]);
  });

  it("counts every match and pages through them", async () => {
    const { user, number } = await makeLine();
    await db.insert(messages).values(
      Array.from({ length: 17 }, (_, i) => ({
        userId: user.id,
        fromNumber: `+1202555${1000 + i}`,
        toNumber: number.e164,
        body: "hi",
        providerMessageId: `p-${i}`,
        receivedAt: new Date(Date.now() - i * 1000),
      })),
    );
    const page2 = await listConversations(user.id, { page: 2 });
    expect([page2.total, page2.page, froms(page2)]).toEqual([17, 2, ["+12025551015", "+12025551016"]]);
    expect((await listConversations(user.id, { page: 9 })).page).toBe(2);
  });
});

describe("billing activity", () => {
  it("filters by kind and pages", async () => {
    const user = await makeUser();
    for (let i = 0; i < 17; i++) {
      await applyLedger({ userId: user.id, amountCents: 100, kind: i % 2 ? "topup" : "adjustment", idempotencyKey: `k${i}`, description: `e${i}` });
    }
    const all = await listLedger(user.id);
    expect([all.total, all.entries.length]).toEqual([17, 15]);
    const topups = await listLedger(user.id, { kind: "topup" });
    expect(topups.total).toBe(8);
    expect(topups.entries.every((e) => e.kind === "topup")).toBe(true);
    expect((await listLedger(user.id, { page: 2 })).entries).toHaveLength(2);
  });
});
