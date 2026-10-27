"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { Card, CardTitle, Field, buttonClass, inputClass } from "@/components/ui";
import {
  EMAIL_PARTS,
  MAX_NOTE_LENGTH,
  MAX_RECIPIENTS,
  MAX_SUBJECT_LENGTH,
  MAX_TAG_LENGTH,
  defaultSubject,
  defaultTagText,
  renderCallEmail,
  sampleEmailData,
  unknownVariables,
  variableNames,
  type EmailPart,
  type EmailSettings,
} from "@/lib/call-email";
import {
  FIELD_BADGES,
  FIELD_TYPES,
  MAX_FIELD_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_FIELD_OPTION_LENGTH,
  MAX_FIELD_OPTIONS,
  MAX_FIELDS,
  newFieldKey,
  normalizeField,
  type CallField,
  type FieldBadge,
  type FieldType,
} from "@/lib/call-fields";
import type { Language } from "@/lib/language";
import { sendTestEmailAction } from "./actions";

const PART_LABEL = {
  caller: "includeCaller",
  time: "includeTime",
  fields: "includeFields",
  summary: "includeSummary",
  link: "includeLink",
} as const satisfies Record<EmailPart, string>;

/** Name, type, what to record, and a remove button; wraps on phones. */
const FIELD_COLUMNS = "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_auto]";

/**
 * The two cards after "Ending calls": what the agent records from each call, and the email after it
 * (SPEC §9.2). Both are posted with the agent form as one JSON field, `results`.
 */
export function ResultsSection({
  agentId,
  language,
  assistantName,
  accountEmail,
  initial,
}: {
  /** Absent for a new agent: the test email needs a saved one. */
  agentId?: string;
  /** The agent's main language: results and the email are written in it. */
  language: Language;
  assistantName: string;
  accountEmail: string;
  initial: { fields: CallField[]; email: EmailSettings };
}) {
  const t = useTranslations("callResults");
  const tl = useTranslations("languages");
  const [fields, setFields] = useState<CallField[]>(initial.fields);
  const [email, setEmail] = useState<EmailSettings>({
    ...initial.email,
    subject: initial.email.subject || defaultSubject(language),
    tagText: initial.email.tagText || defaultTagText(language),
  });
  const [newRecipient, setNewRecipient] = useState("");
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, startSending] = useTransition();
  const subjectRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const lastText = useRef<"subject" | "note">("subject");

  const update = (i: number, change: Partial<CallField>) => setFields((fs) => fs.map((f, j) => (j === i ? normalizeField({ ...f, ...change }) : f)));
  const yesNoFields = fields.filter((f) => f.type === "yesno");
  const tagField = yesNoFields.some((f) => f.key === email.tagField) ? email.tagField : null;
  const payload = { fields, email: { ...email, tagField } };
  const unknown = [...unknownVariables(email.subject, fields), ...unknownVariables(email.note, fields)];
  const preview = useMemo(
    () => renderCallEmail({ ...email, tagField }, sampleEmailData(fields, assistantName || "VFi", language, "#"), language),
    [email, tagField, fields, assistantName, language],
  );

  function insertVariable(name: string) {
    const target = lastText.current === "note" ? noteRef.current : subjectRef.current;
    if (!target) return;
    const token = `{{${name}}}`;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const value = target.value.slice(0, start) + token + target.value.slice(end);
    setEmail((e) => ({ ...e, [lastText.current]: value }));
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function addRecipient() {
    const address = newRecipient.trim().toLowerCase();
    if (!address || email.recipients.includes(address) || email.recipients.length >= MAX_RECIPIENTS) return;
    setEmail((e) => ({ ...e, recipients: [...e.recipients, address] }));
    setNewRecipient("");
  }

  function sendTest() {
    if (!agentId) return;
    setTestMessage(null);
    startSending(async () => {
      const r = await sendTestEmailAction(agentId, JSON.stringify(payload));
      setTestMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: t("testSent", { email: r.sentTo ?? accountEmail }) });
    });
  }

  return (
    <>
      <input type="hidden" name="results" value={JSON.stringify(payload)} />

      <Card>
        <CardTitle>{t("title")}</CardTitle>
        <div className="space-y-4">
          <p className="text-sm text-stone-600">{t("hint", { language: tl(language) })}</p>
          {fields.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">{t("empty")}</p>
          ) : (
            <div className="space-y-2.5">
              <div className={`hidden gap-2.5 px-3.5 text-xs text-stone-500 sm:grid ${FIELD_COLUMNS}`}>
                <span>{t("colName")}</span>
                <span>{t("colType")}</span>
                <span>{t("colDescription")}</span>
                <span className="w-14" />
              </div>
              {fields.map((f, i) => (
                <div key={f.key} className="space-y-2.5 rounded-2xl border border-stone-200 px-3.5 py-3">
                  <div className={`grid grid-cols-2 items-start gap-2.5 ${FIELD_COLUMNS}`}>
                    <input
                      aria-label={t("colName")}
                      value={f.name}
                      maxLength={MAX_FIELD_NAME_LENGTH}
                      onChange={(e) => update(i, { name: e.target.value })}
                      className={inputClass}
                    />
                    <select aria-label={t("colType")} value={f.type} onChange={(e) => update(i, { type: e.target.value as FieldType })} className={inputClass}>
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>{t(`type_${type}`)}</option>
                      ))}
                    </select>
                    <input
                      aria-label={t("colDescription")}
                      value={f.description}
                      maxLength={MAX_FIELD_DESCRIPTION_LENGTH}
                      placeholder={t("descriptionPlaceholder")}
                      onChange={(e) => update(i, { description: e.target.value })}
                      className={`${inputClass} col-span-2 sm:col-span-1`}
                    />
                    <button type="button" onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))} className="justify-self-start self-center text-[13px] text-stone-600 underline sm:justify-self-end">
                      {t("remove")}
                    </button>
                  </div>
                  {f.type === "choice" && <OptionsEditor field={f} onChange={(options) => update(i, { options })} />}
                  {f.type === "yesno" && (
                    <label className="flex flex-wrap items-center gap-2 text-[13px] text-stone-600">
                      {t("badgeLabel")}
                      {/* inputClass is w-full, so the wrapper sets the width. */}
                      <span className="w-40">
                        <select value={f.badge} onChange={(e) => update(i, { badge: e.target.value as FieldBadge })} className={inputClass}>
                          {FIELD_BADGES.map((b) => (
                            <option key={b} value={b}>{t(`badge_${b}`)}</option>
                          ))}
                        </select>
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={fields.length >= MAX_FIELDS}
              onClick={() => setFields((fs) => [...fs, { key: newFieldKey(), name: "", description: "", type: "text", options: [], badge: "none" }])}
              className={buttonClass("secondary")}
            >
              {t("addField")}
            </button>
            <span className="text-[13px] text-stone-500">{t("count", { count: fields.length, max: MAX_FIELDS })} · {t("appliesNext")}</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("emailTitle")}</CardTitle>
        <div className="space-y-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={email.enabled}
              onChange={(e) => setEmail((s) => ({ ...s, enabled: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-stone-900"
            />
            <span>
              <span className="block text-sm font-medium text-stone-900">{t("emailToggle")}</span>
              <span className="block text-[13px] leading-[19px] text-stone-500">{t("emailToggleHint")}</span>
            </span>
          </label>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <Field label={t("sendTo")} hint={t("recipientsHint", { max: MAX_RECIPIENTS, email: accountEmail })}>
                {(control) => (
                  <div className="space-y-2">
                    {email.recipients.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {email.recipients.map((r) => (
                          <li key={r} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 py-0.5 pl-3 pr-1.5 text-[13px]">
                            {r}
                            <button
                              type="button"
                              aria-label={t("removeRecipient", { email: r })}
                              onClick={() => setEmail((s) => ({ ...s, recipients: s.recipients.filter((x) => x !== r) }))}
                              className="px-1 text-stone-500 hover:text-stone-900"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <input
                        {...control}
                        type="email"
                        value={newRecipient}
                        placeholder={t("recipientPlaceholder")}
                        disabled={email.recipients.length >= MAX_RECIPIENTS}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addRecipient();
                          }
                        }}
                        className={`${inputClass} max-w-64`}
                      />
                      <button type="button" onClick={addRecipient} disabled={email.recipients.length >= MAX_RECIPIENTS} className={buttonClass("secondary")}>
                        {t("add")}
                      </button>
                    </div>
                  </div>
                )}
              </Field>

              <Field label={t("subject")}>
                <input
                  ref={subjectRef}
                  value={email.subject}
                  maxLength={MAX_SUBJECT_LENGTH}
                  onFocus={() => (lastText.current = "subject")}
                  onChange={(e) => setEmail((s) => ({ ...s, subject: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label={t("note")} hint={t("noteHint")}>
                <textarea
                  ref={noteRef}
                  rows={2}
                  value={email.note}
                  maxLength={MAX_NOTE_LENGTH}
                  onFocus={() => (lastText.current = "note")}
                  onChange={(e) => setEmail((s) => ({ ...s, note: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="space-y-1.5">
                <p className="text-[13px] text-stone-500">{t("variablesHint")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {variableNames(fields.filter((f) => f.name.trim()), language).map((name) => (
                    <button
                      key={name}
                      type="button"
                      // Keep the caret in the subject or note while inserting.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertVariable(name)}
                      className="rounded-md border border-stone-300 bg-stone-50 px-1.5 py-0.5 font-mono text-xs text-stone-700 hover:border-stone-900"
                    >
                      {`{{${name}}}`}
                    </button>
                  ))}
                </div>
                {unknown.length > 0 && <p className="text-xs text-amber-700">{t("unknownVariables", { names: unknown.map((n) => `{{${n}}}`).join(", ") })}</p>}
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-stone-900">{t("include")}</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {EMAIL_PARTS.map((part) => (
                    <label key={part} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={email.include[part]}
                        onChange={(e) => setEmail((s) => ({ ...s, include: { ...s.include, [part]: e.target.checked } }))}
                        className="h-4 w-4 accent-stone-900"
                      />
                      {t(PART_LABEL[part])}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("tagWhen")}>
                  <select value={tagField ?? ""} onChange={(e) => setEmail((s) => ({ ...s, tagField: e.target.value || null }))} className={inputClass}>
                    <option value="">{t("tagNever")}</option>
                    {yesNoFields.map((f) => (
                      <option key={f.key} value={f.key}>{t("tagFieldYes", { name: f.name || "…" })}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("tag")}>
                  <input
                    value={email.tagText}
                    maxLength={MAX_TAG_LENGTH}
                    disabled={!tagField}
                    onChange={(e) => setEmail((s) => ({ ...s, tagText: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={sendTest} disabled={!agentId || sending} className={buttonClass("secondary")}>
                  {sending ? t("sendingTest") : t("sendTest")}
                </button>
                {!agentId && <span className="text-[13px] text-stone-500">{t("saveFirst")}</span>}
                {testMessage && <span className={`text-[13px] ${testMessage.ok ? "text-emerald-700" : "text-red-600"}`}>{testMessage.text}</span>}
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-[13px] text-stone-500">{t("preview", { language: tl(language) })}</p>
              <div className={`overflow-hidden rounded-2xl border border-stone-300 bg-white transition-opacity ${email.enabled ? "" : "opacity-50"}`}>
                <div className="space-y-0.5 border-b border-stone-200 px-4 py-3">
                  <p className="text-[15px] font-medium text-stone-900">{preview.subject}</p>
                  <p className="text-xs text-stone-500">{t("previewTo", { to: email.recipients.length ? email.recipients.join(", ") : accountEmail })}</p>
                </div>
                {/* Sandboxed: the preview is the email's own HTML, as a mail app would show it. */}
                <iframe title={t("previewFrame")} sandbox="" srcDoc={preview.html} className="h-[26rem] w-full bg-white" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

function OptionsEditor({ field, onChange }: { field: CallField; onChange: (options: string[]) => void }) {
  const t = useTranslations("callResults");
  const [draft, setDraft] = useState("");
  const add = () => {
    const option = draft.trim();
    if (!option || field.options.includes(option) || field.options.length >= MAX_FIELD_OPTIONS) return;
    onChange([...field.options, option]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-stone-600">
      <span>{t("options")}</span>
      {field.options.map((o) => (
        <span key={o} className="inline-flex items-center gap-1 rounded-full border border-stone-300 py-0.5 pl-2.5 pr-1 text-stone-900">
          {o}
          <button type="button" aria-label={t("removeOption", { option: o })} onClick={() => onChange(field.options.filter((x) => x !== o))} className="px-1 text-stone-500 hover:text-stone-900">
            ×
          </button>
        </span>
      ))}
      {field.options.length < MAX_FIELD_OPTIONS && (
        <input
          aria-label={t("addOption")}
          value={draft}
          maxLength={MAX_FIELD_OPTION_LENGTH}
          placeholder={t("addOption")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="w-32 rounded-full border border-dashed border-stone-300 bg-transparent px-2.5 py-0.5 text-[13px] outline-none focus:border-stone-900"
        />
      )}
    </div>
  );
}
