import { z } from "zod";
import type { Language } from "./language";

/**
 * What an agent writes down from every call besides the summary (SPEC §9.2). The provider fills them in
 * after the call from a JSON schema built here.
 */

export const MAX_FIELDS = 8;
export const MAX_FIELD_NAME_LENGTH = 40;
export const MAX_FIELD_DESCRIPTION_LENGTH = 200;
export const MAX_FIELD_OPTIONS = 8;
export const MAX_FIELD_OPTION_LENGTH = 40;

export const FIELD_TYPES = ["text", "choice", "yesno"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** How a "yes" on a yes/no field marks the call in the calls list. */
export const FIELD_BADGES = ["none", "urgent", "followup"] as const;
export type FieldBadge = (typeof FIELD_BADGES)[number];
/** The mark a call gets in the calls list. */
export type CallBadge = Exclude<FieldBadge, "none">;
export const CALL_BADGES = FIELD_BADGES.filter((b): b is CallBadge => b !== "none");

export const callField = z.object({
  /** Stable id, so renaming a field keeps its results and the email's urgent tag pointing at it. */
  key: z.string().regex(/^f[a-z0-9]{1,16}$/),
  name: z.string().trim().min(1, "fieldNameRequired").max(MAX_FIELD_NAME_LENGTH, "fieldNameTooLong"),
  description: z.string().trim().max(MAX_FIELD_DESCRIPTION_LENGTH, "fieldDescriptionTooLong").default(""),
  type: z.enum(FIELD_TYPES),
  options: z.array(z.string().trim().min(1).max(MAX_FIELD_OPTION_LENGTH, "fieldOptionTooLong")).max(MAX_FIELD_OPTIONS, "tooManyFieldOptions").default([]),
  badge: z.enum(FIELD_BADGES).default("none"),
});
export type CallField = z.infer<typeof callField>;

/** Read a stored fields column; anything invalid is dropped rather than breaking the page. */
export function readFields(raw: unknown): CallField[] {
  const r = z.array(z.unknown()).safeParse(raw);
  if (!r.success) return [];
  return r.data.flatMap((f) => {
    const p = callField.safeParse(f);
    return p.success ? [normalizeField(p.data)] : [];
  });
}

/** Options only belong to "one of" fields and badges only to yes/no ones. */
export function normalizeField(f: CallField): CallField {
  return {
    ...f,
    options: f.type === "choice" ? [...new Set(f.options)] : [],
    badge: f.type === "yesno" ? f.badge : "none",
  };
}

/** Why a set of fields can't be saved, as an error key, or null. */
export function fieldsProblem(fields: CallField[]): { key: string; params?: Record<string, string | number> } | null {
  if (fields.length > MAX_FIELDS) return { key: "tooManyFields", params: { max: MAX_FIELDS } };
  const names = new Set<string>();
  for (const f of fields) {
    const lower = f.name.toLowerCase();
    if (names.has(lower)) return { key: "fieldNameDuplicate", params: { name: f.name } };
    names.add(lower);
    if (f.type === "choice" && f.options.length < 2) return { key: "fieldNeedsOptions", params: { name: f.name } };
  }
  return null;
}

export function newFieldKey(): string {
  return `f${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The provider requires a strict schema: every property listed in `required` and no others allowed. So
 * each field may be null, for calls that never got to it.
 */
export function fieldsJsonSchema(fields: CallField[]): Record<string, unknown> {
  const properties = Object.fromEntries(
    fields.map((f) => {
      const description = f.description ? `${f.name}: ${f.description}` : f.name;
      const schema =
        f.type === "yesno"
          ? { type: ["boolean", "null"], description }
          : f.type === "choice"
            ? { type: ["string", "null"], enum: [...f.options, null], description }
            : { type: ["string", "null"], description };
      return [f.key, schema];
    }),
  );
  return { type: "object", properties, required: fields.map((f) => f.key), additionalProperties: false };
}

const LANGUAGE_NAME: Record<Language, string> = { en: "English", zh: "Simplified Chinese (Mandarin)" };

/** Names can't tell anyone's gender, so results never guess it (a summary said "he" for a caller named Chen Li). */
const NO_GENDER = "Refer to people by name or role (the caller, the assistant); never assume anyone's gender or use gendered pronouns.";

export function summaryInstructions(language: Language): string {
  return (
    "Summarize this phone call for the business that owns the assistant, in 2 to 4 sentences: who called or was called, " +
    "what they wanted, what was agreed or promised, and any follow-up the team needs to do. Include names, companies, " +
    `phone numbers, email addresses, dates and times exactly as given. ${NO_GENDER} Write in ${LANGUAGE_NAME[language]}.`
  );
}

export function fieldsInstructions(language: Language): string {
  return (
    "Fill in each field from this phone call, following its description. Use null for anything the call didn't cover; " +
    `never guess. For text fields, be brief and write in ${LANGUAGE_NAME[language]}. For "one of" fields, pick exactly one of the allowed values. ` +
    NO_GENDER
  );
}

/** A field's value as stored: text, one of its options, yes/no, or nothing. */
export type FieldValue = string | boolean | null;

/** The provider's JSON result for the fields insight, kept to the fields we asked for and their types. */
export function parseFieldResults(fields: CallField[], raw: string | null | undefined): Record<string, FieldValue> | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  return Object.fromEntries(
    fields.map((f) => {
      const v = obj[f.key];
      if (f.type === "yesno") return [f.key, typeof v === "boolean" ? v : null];
      if (typeof v !== "string" || !v.trim()) return [f.key, null];
      if (f.type === "choice" && !f.options.includes(v)) return [f.key, null];
      return [f.key, v.trim()];
    }),
  );
}

/** The badge a call gets: from the first yes/no field marked for one whose answer is yes. */
export function callBadge(fields: CallField[], values: Record<string, FieldValue> | null): CallBadge | null {
  if (!values) return null;
  const hit = fields.find((f) => f.type === "yesno" && f.badge !== "none" && values[f.key] === true);
  return hit ? (hit.badge as CallBadge) : null;
}

const YES_NO: Record<Language, [string, string]> = { en: ["Yes", "No"], zh: ["是", "否"] };

/** A value for display, in the given language; "—" when the call didn't cover it. */
export function formatFieldValue(v: FieldValue | undefined, language: Language): string {
  if (v === true) return YES_NO[language][0];
  if (v === false) return YES_NO[language][1];
  return v ?? "—";
}
