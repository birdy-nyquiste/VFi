"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Counted } from "@/components/counted";
import { Field, inputClass } from "@/components/ui";
import { MAX_VOICEMAIL_MESSAGE_LENGTH, VOICEMAIL_ACTIONS, type VoicemailAction } from "@/lib/agent-settings";

const LABELS = { hangup: "voicemailHangup", message: "voicemailMessage", continue: "voicemailContinue" } as const;
const HINTS = { hangup: "voicemailHangupHint", message: "voicemailMessageHint", continue: "voicemailContinueHint" } as const;

/** What the agent does when a call it places reaches voicemail; the message box shows only when it leaves one. */
export function VoicemailFields({ action: initialAction, message }: { action: VoicemailAction; message: string }) {
  const t = useTranslations("agents");
  const [action, setAction] = useState(initialAction);
  return (
    <>
      <Field label={t("voicemailAction")} hint={t(HINTS[action])}>
        <select name="voicemailAction" value={action} onChange={(e) => setAction(e.target.value as VoicemailAction)} className={inputClass}>
          {VOICEMAIL_ACTIONS.map((a) => (
            <option key={a} value={a}>{t(LABELS[a])}</option>
          ))}
        </select>
      </Field>
      {/* Hidden rather than removed, so a message typed before switching away is kept and saved. */}
      <div hidden={action !== "message"}>
        <Field label={t("voicemailMessageLabel")} hint={t("voicemailMessageLabelHint")}>
          <Counted>
            <textarea name="voicemailMessage" maxLength={MAX_VOICEMAIL_MESSAGE_LENGTH} defaultValue={message} rows={3} className={inputClass} />
          </Counted>
        </Field>
      </div>
    </>
  );
}
