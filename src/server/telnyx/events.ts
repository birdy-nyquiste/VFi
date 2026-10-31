import { isUuid } from "@/lib/uuid";
import type { CallEvent, CallEventType, InboundMessageEvent, InsightsReadyEvent, ProviderEvent } from "./types";

const KNOWN: CallEventType[] = [
  "call.initiated",
  "call.answered",
  "call.hangup",
  "call.recording.saved",
  "call.conversation.created",
  "call.conversation.start_failed",
  "call.cost",
  "call.conversation.ended",
  "call.machine.premium.detection.ended",
];

function date(v: unknown): Date | undefined {
  return typeof v === "string" && v ? new Date(v) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

/** Our client_state is always a call id; anything else is dropped, so the call is matched by its other ids. */
export function decodeClientState(v: unknown): string | undefined {
  const s = str(v);
  const decoded = s && Buffer.from(s, "base64").toString("utf8");
  return decoded && isUuid(decoded) ? decoded : undefined;
}

export function encodeClientState(v: string): string {
  return Buffer.from(v, "utf8").toString("base64");
}

function envelopeData(body: unknown): Record<string, unknown> {
  const data = (body as { data?: Record<string, unknown> })?.data;
  if (!data || typeof data !== "object") throw new Error("Malformed webhook: missing data");
  return data;
}

/**
 * An insight group's webhook (conversation_insight_result): the call's summary and fields are done. Seen
 * both inside the usual `data` envelope and without it, so either is accepted.
 */
function parseInsightResult(body: unknown): InsightsReadyEvent | undefined {
  const outer = body as { data?: Record<string, unknown> } & Record<string, unknown>;
  const data = outer?.data && typeof outer.data === "object" ? outer.data : outer;
  if (data?.event_type !== "conversation_insight_result") return undefined;
  const p = (data.payload ?? {}) as Record<string, unknown>;
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const conversationId = str(p.conversation_id);
  return {
    id: str(data.id) ?? `conversation_insight_result:${conversationId ?? ""}:${str(p.insight_group_id) ?? ""}`,
    type: "insights.ready",
    rawType: "conversation_insight_result",
    occurredAt: date(data.occurred_at) ?? new Date(),
    conversationId,
    callControlId: str(meta.call_control_id),
  };
}

/** Call Control, messaging and insight webhooks share one endpoint; route by event type. */
export function parseTelnyxEnvelope(body: unknown): ProviderEvent {
  const insights = parseInsightResult(body);
  if (insights) return insights;
  const data = envelopeData(body);
  if (data.event_type === "message.received") {
    const message = parseInboundMessage(data);
    if (message) return message;
  }
  return parseCallEnvelope(body);
}

/**
 * message.received: `from` is an object and `to` an array (unlike call events, where both are strings).
 * Returns undefined for anything we can't attribute to one of our numbers.
 */
function parseInboundMessage(data: Record<string, unknown>): InboundMessageEvent | undefined {
  const p = (data.payload ?? {}) as Record<string, unknown>;
  const messageId = str(p.id);
  const from = str((p.from as { phone_number?: unknown } | undefined)?.phone_number);
  const to = Array.isArray(p.to) ? str((p.to[0] as { phone_number?: unknown } | undefined)?.phone_number) : undefined;
  if (!messageId || !from || !to || (p.direction && p.direction !== "inbound")) return undefined;
  const parts = typeof p.parts === "number" && p.parts > 0 ? Math.floor(p.parts) : 1;
  return {
    id: str(data.id) ?? `message.received:${messageId}`,
    type: "message.received",
    rawType: "message.received",
    occurredAt: date(data.occurred_at) ?? new Date(),
    messageId,
    from,
    to,
    text: typeof p.text === "string" ? p.text : "",
    parts,
    mediaCount: Array.isArray(p.media) ? p.media.length : 0,
    costUsd: str((p.cost as { amount?: unknown } | null | undefined)?.amount),
  };
}

/**
 * Normalize a Telnyx v2 webhook envelope. Note: call.hangup carries no end_time
 * (use occurredAt) and call.recording.saved has no call_control_id.
 */
export function parseCallEnvelope(body: unknown): CallEvent {
  const data = envelopeData(body);
  const rawType = str(data.event_type) ?? "unknown";
  const p = (data.payload ?? {}) as Record<string, unknown>;
  return {
    id: str(data.id) ?? `${rawType}:${str(p.call_control_id) ?? ""}:${str(data.occurred_at) ?? ""}`,
    type: (KNOWN as string[]).includes(rawType) ? (rawType as CallEventType) : "other",
    rawType,
    occurredAt: date(data.occurred_at) ?? new Date(),
    callControlId: str(p.call_control_id),
    callSessionId: str(p.call_session_id),
    direction: p.direction === "incoming" || p.direction === "inbound" ? "inbound" : p.direction ? "outbound" : undefined,
    from: str(p.from),
    to: str(p.to),
    clientState: decodeClientState(p.client_state),
    hangupCause: str(p.hangup_cause),
    startTime: date(p.start_time),
    endTime: date(p.end_time),
    conversationId: str(p.conversation_id),
    failureReason: str(p.reason),
    totalCostUsd: str(p.total_cost),
    reachedMachine: rawType === "call.machine.premium.detection.ended" ? p.result === "machine" : undefined,
  };
}
