import { z } from "zod";
import { formatFieldValue, type CallField, type FieldValue } from "./call-fields";
import type { Language } from "./language";

/**
 * The email after each call (SPEC §9.2): its settings, the variables its subject and note can use, and
 * rendering. Pure, so the settings preview, the test email and the real email all come from here. The
 * email is written in the agent's main language, whatever language the user reads the app in.
 */

export const MAX_RECIPIENTS = 3;
export const MAX_SUBJECT_LENGTH = 200;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_TAG_LENGTH = 30;
/** Test emails per agent per hour. */
export const TEST_EMAILS_PER_HOUR = 5;

export const EMAIL_PARTS = ["caller", "time", "fields", "summary", "link"] as const;
export type EmailPart = (typeof EMAIL_PARTS)[number];

const emailAddress = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const emailSettings = z.object({
  enabled: z.boolean().catch(false),
  /** Empty: the account email. */
  recipients: z.array(emailAddress).max(MAX_RECIPIENTS).catch([]),
  /** Empty: the default subject in the agent's language. */
  subject: z.string().trim().max(MAX_SUBJECT_LENGTH).catch(""),
  note: z.string().trim().max(MAX_NOTE_LENGTH).catch(""),
  include: z
    .object(Object.fromEntries(EMAIL_PARTS.map((p) => [p, z.boolean().catch(true)])) as Record<EmailPart, z.ZodCatch<z.ZodBoolean>>)
    .catch(Object.fromEntries(EMAIL_PARTS.map((p) => [p, true])) as Record<EmailPart, boolean>),
  /** Key of a yes/no field: when it's yes, `tagText` goes before the subject. */
  tagField: z.string().nullable().catch(null),
  tagText: z.string().trim().max(MAX_TAG_LENGTH).catch(""),
});
export type EmailSettings = z.infer<typeof emailSettings>;

export function readEmailSettings(raw: unknown): EmailSettings {
  return emailSettings.parse(raw && typeof raw === "object" ? raw : {});
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = readEmailSettings({});

/** Built-in variables, by the name shown in each language. Both names work in either language. */
const BUILT_IN = {
  assistant: { en: "Assistant", zh: "助理" },
  caller: { en: "Caller number", zh: "对方号码" },
  ourNumber: { en: "Your number", zh: "我方号码" },
  time: { en: "Time", zh: "时间" },
  length: { en: "Length", zh: "时长" },
} as const;
type BuiltIn = keyof typeof BUILT_IN;

/** The subject used when the user leaves it empty: "call from" for calls the agent answered, "call to" for ones it placed. */
export function defaultSubject(language: Language, direction: CallDirection = "inbound"): string {
  return COPY[language].subject[direction];
}

export function defaultTagText(language: Language): string {
  return COPY[language].tag;
}

/** How the email writes the call's time, and the caller when there's no number. */
export function emailFormat(language: Language): { locale: string; unknownNumber: string } {
  return { locale: COPY[language].locale, unknownNumber: COPY[language].unknownNumber };
}

/** The variable names to offer in the editor: built-ins in the agent's language, then the fields. */
export function variableNames(fields: Pick<CallField, "name">[], language: Language): string[] {
  return [...Object.values(BUILT_IN).map((names) => names[language]), ...fields.map((f) => f.name)];
}

function lookup(fields: Pick<CallField, "name">[]) {
  const names = new Map<string, BuiltIn | { field: number }>();
  for (const [key, byLanguage] of Object.entries(BUILT_IN) as [BuiltIn, Record<Language, string>][]) {
    for (const name of Object.values(byLanguage)) names.set(name.toLowerCase(), key);
  }
  // A field named like a built-in variable wins: it's the one the user just made.
  fields.forEach((f, i) => names.set(f.name.toLowerCase(), { field: i }));
  return names;
}

const VARIABLE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Variables used in a subject or note that don't exist. They come out empty when the email is sent. */
export function unknownVariables(text: string, fields: Pick<CallField, "name">[]): string[] {
  const known = lookup(fields);
  return [...new Set([...text.matchAll(VARIABLE)].map((m) => m[1]).filter((n) => !known.has(n.toLowerCase())))];
}

export type CallDirection = "inbound" | "outbound";

export interface CallEmailData {
  assistant: string;
  /** Inbound: the other party called the agent. Outbound: the agent placed the call. */
  direction: CallDirection;
  /** Formatted. */
  caller: string;
  ourNumber: string;
  time: string;
  length: string;
  fields: CallField[];
  values: Record<string, FieldValue> | null;
  /** Null: the summary wasn't ready in time. */
  summary: string | null;
  link: string;
}

/** Everything the email says that depends on the agent's language. A new language is one more entry here. */
const COPY = {
  en: {
    subject: { inbound: "{{Assistant}}: call from {{Caller number}}", outbound: "{{Assistant}}: call to {{Caller number}}" },
    tag: "[Urgent]",
    locale: "en-US",
    unknownNumber: "Unknown number",
    caller: { inbound: "Caller", outbound: "Number called" },
    ourNumber: "Your number",
    assistant: "Assistant",
    time: "Time",
    length: "Length",
    results: "Call results",
    summary: "Summary",
    noSummary: "The summary wasn't ready in time. Open the call to see the transcript.",
    open: "Open the call in VFi",
    footer: (name: string) => `You get this because email after each call is on for ${name}. Turn it off on the Assistant's page in VFi.`,
    sample: {
      text: (field: string) => `(sample ${field.toLowerCase()})`,
      time: "Oct 27, 2026, 11:40 AM",
      summary:
        "Sample: Dana Lee asked about after-hours call answering for three warehouses. She needs English and Mandarin and wants a quote today.",
    },
  },
  zh: {
    subject: { inbound: "{{助理}}：来自 {{对方号码}} 的通话", outbound: "{{助理}}：拨给 {{对方号码}} 的通话" },
    tag: "[紧急]",
    locale: "zh-CN",
    unknownNumber: "未知号码",
    caller: { inbound: "对方号码", outbound: "对方号码" },
    ourNumber: "我方号码",
    assistant: "助理",
    time: "时间",
    length: "时长",
    results: "通话结果",
    summary: "摘要",
    noSummary: "摘要未能及时生成，请打开通话查看转写。",
    open: "在 VFi 中打开通话",
    footer: (name: string) => `你收到这封邮件，是因为 ${name} 开启了每通电话后的邮件。可在 VFi 的助理页面关闭。`,
    sample: {
      text: (field: string) => `（${field}的示例内容）`,
      time: "2026年10月27日 上午11:40",
      summary: "示例：Dana Lee 来电询问三个仓库的下班后接听服务，需要中英双语，希望今天拿到报价。",
    },
  },
} satisfies Record<Language, unknown>;

function fill(text: string, data: CallEmailData, language: Language): string {
  const known = lookup(data.fields);
  return text.replace(VARIABLE, (_, name: string) => {
    const hit = known.get(name.toLowerCase());
    if (!hit) return "";
    if (typeof hit === "object") {
      const f = data.fields[hit.field];
      return formatFieldValue(data.values?.[f.key], language);
    }
    return data[hit];
  });
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderCallEmail(settings: EmailSettings, data: CallEmailData, language: Language): RenderedEmail {
  const L = COPY[language];
  const tagField = settings.tagField && data.fields.find((f) => f.key === settings.tagField && f.type === "yesno");
  const tagged = tagField && data.values?.[tagField.key] === true;
  const tag = tagged ? (settings.tagText || defaultTagText(language)) + " " : "";
  // One line: a field value with a line break mustn't split the subject.
  const subject = (tag + fill(settings.subject || defaultSubject(language, data.direction), data, language)).replace(/\s+/g, " ").trim();
  const note = fill(settings.note, data, language).trim();

  const facts: [string, string][] = [];
  if (settings.include.caller) facts.push([L.caller[data.direction], data.caller], [L.ourNumber, data.ourNumber]);
  facts.push([L.assistant, data.assistant]);
  if (settings.include.time) facts.push([L.time, data.time], [L.length, data.length]);
  const results: [string, string][] = settings.include.fields
    ? data.fields.map((f) => [f.name, formatFieldValue(data.values?.[f.key], language)])
    : [];
  const summary = settings.include.summary ? (data.summary ?? L.noSummary) : null;

  const text = [
    note,
    facts.map(([k, v]) => `${k}: ${v}`).join("\n"),
    results.length ? `${L.results}\n${results.map(([k, v]) => `${k}: ${v}`).join("\n")}` : "",
    summary ? `${L.summary}\n${summary}` : "",
    settings.include.link ? `${L.open}: ${data.link}` : "",
    "—\n" + L.footer(data.assistant),
  ]
    .filter(Boolean)
    .join("\n\n");

  const table = (rows: [string, string][]) =>
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:3px 16px 3px 0;color:#6e6f75;vertical-align:top">${escapeHtml(k)}</td><td style="padding:3px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
      )
      .join("")}</table>`;
  const html = [
    `<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#0b0b0c;max-width:560px">`,
    `<p style="font-weight:600;margin:0 0 16px">VFi</p>`,
    note ? `<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(note)}</p>` : "",
    `<div style="margin:0 0 16px">${table(facts)}</div>`,
    results.length ? `<p style="margin:0 0 4px;color:#6e6f75">${escapeHtml(L.results)}</p><div style="margin:0 0 16px">${table(results)}</div>` : "",
    summary ? `<p style="margin:0 0 4px;color:#6e6f75">${escapeHtml(L.summary)}</p><p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(summary)}</p>` : "",
    settings.include.link
      ? `<p style="margin:0 0 20px"><a href="${escapeHtml(data.link)}" style="display:inline-block;background:#0b0b0c;color:#fbfaf9;border-radius:999px;padding:7px 14px;text-decoration:none">${escapeHtml(L.open)}</a></p>`
      : "",
    `<p style="margin:0;border-top:1px solid #e8e6e3;padding-top:12px;font-size:12px;color:#6e6f75">${escapeHtml(L.footer(data.assistant))}</p>`,
    `</div>`,
  ].join("");
  return { subject, text, html };
}

/** Example answers for the settings preview and the test email. */
export function sampleEmailData(fields: CallField[], assistant: string, language: Language, link: string): CallEmailData {
  const sample = COPY[language].sample;
  const values = Object.fromEntries(
    fields.map((f): [string, FieldValue] => [
      f.key,
      f.type === "yesno" ? true : f.type === "choice" ? (f.options[0] ?? null) : sample.text(f.name),
    ]),
  );
  return {
    assistant,
    direction: "inbound",
    caller: "(650) 555-0133",
    ourNumber: "(415) 555-0142",
    time: sample.time,
    length: "2:14",
    fields,
    values,
    summary: sample.summary,
    link,
  };
}
