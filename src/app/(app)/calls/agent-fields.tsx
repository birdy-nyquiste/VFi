"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Field, inputClass } from "@/components/ui";
import { MAX_VARIABLE_VALUE_LENGTH } from "@/lib/agent-settings";
import { Counted } from "@/components/counted";

export interface CallAgent {
  id: string;
  name: string;
  /** The agent's ask-on-each-call variables, with their defaults. */
  ask: { key: string; value: string }[];
  /** The number its calls go from unless the user picks another (see defaultCallerNumber). */
  numberId: string;
}

export interface CallFromNumber {
  id: string;
  /** The number, formatted, and the Assistant that answers it, if any. */
  label: string;
  /** Formatted, for the caller ID note. */
  number: string;
}

/**
 * The agent picker for a new call (beside `children`, the number field), the number to call from when
 * the user has more than one, then a field for each variable the chosen agent asks for. `after` (the
 * goal and the call button) goes before the caller ID note, which names the chosen number.
 */
export function AgentFields({
  agents,
  numbers,
  defaultAgentId,
  children,
  after,
}: {
  agents: CallAgent[];
  numbers: CallFromNumber[];
  defaultAgentId: string;
  children: ReactNode;
  after: ReactNode;
}) {
  const t = useTranslations("calls");
  const tc = useTranslations("common");
  const [agentId, setAgentId] = useState(defaultAgentId);
  const agentNumber = (id: string) => agents.find((a) => a.id === id)?.numberId ?? numbers[0]?.id ?? "";
  // Follows the chosen agent; a number the user picks holds until they choose another agent.
  const [numberId, setNumberId] = useState(() => agentNumber(defaultAgentId));
  const ask = agents.find((a) => a.id === agentId)?.ask ?? [];
  const from = numbers.find((n) => n.id === numberId) ?? numbers[0];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tc("agent")}>
          <select
            name="agentId"
            value={agentId}
            onChange={(e) => {
              setAgentId(e.target.value);
              setNumberId(agentNumber(e.target.value));
            }}
            className={inputClass}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
        {children}
        {numbers.length > 1 && (
          <Field label={t("callFrom")}>
            <select name="numberId" value={numberId} onChange={(e) => setNumberId(e.target.value)} className={`${inputClass} tabular-nums`}>
              {numbers.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {ask.map((v) => (
        <Field key={`${agentId}:${v.key}`} label={`{{${v.key}}}`} hint={v.value ? t("variableDefault", { value: v.value }) : undefined}>
          <Counted><input name={`var.${v.key}`} maxLength={MAX_VARIABLE_VALUE_LENGTH} placeholder={v.value} className={inputClass} /></Counted>
        </Field>
      ))}
      {after}
      <p className="text-xs text-stone-500">{t("callerId", { number: from?.number ?? "" })}</p>
    </>
  );
}
