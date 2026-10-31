import type { ErrorKey } from "./errors";

/**
 * The Assistant page's tabs (SPEC §5.1), one per settings card. The page's address names the open one
 * (`?tab=instructions`); Identity is the default and isn't named.
 */
export const AGENT_TABS = ["identity", "instructions", "conversation", "ending", "results", "knowledge"] as const;
export type AgentTab = (typeof AGENT_TABS)[number];

/** The tab an address names; Identity for anything else, or for Knowledge Base when it isn't offered. */
export function readAgentTab(value: unknown, knowledge = true): AgentTab {
  const tab = AGENT_TABS.find((t) => t === value) ?? "identity";
  return tab === "knowledge" && !knowledge ? "identity" : tab;
}

/** The page's address with `tab` open, keeping any other parameters in `query`. */
export function agentTabQuery(tab: AgentTab, query: Record<string, string> = {}): string {
  const q = new URLSearchParams(query);
  if (tab !== "identity") q.set("tab", tab);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Which tab holds the field a save error is about, so the page can open it. */
const ERROR_TABS: Partial<Record<ErrorKey, AgentTab>> = {
  nameRequired: "identity",
  voiceRequired: "identity",
  voicesUnavailable: "identity",
  unknownVoice: "identity",
  voiceNoMandarin: "identity",
  cloningUnavailablePickBuiltIn: "identity",
  cloneNotReady: "identity",
  elevenLabsNotConnectedForAgent: "identity",
  greetingRequired: "instructions",
  instructionsRequired: "instructions",
  tooManyVariables: "instructions",
  variableNameRequired: "instructions",
  variableKeyInvalid: "instructions",
  variableKeyReserved: "instructions",
  variableKeyDuplicate: "instructions",
  variableValueRequired: "instructions",
  variableValueTooLong: "instructions",
  modelUnavailable: "instructions",
  keyTermsTooLong: "conversation",
  voicemailMessageRequired: "ending",
  voicemailMessageTooLong: "ending",
  fieldNameRequired: "results",
  fieldNameTooLong: "results",
  fieldNameDuplicate: "results",
  fieldNeedsOptions: "results",
  fieldDescriptionTooLong: "results",
  fieldOptionTooLong: "results",
  tooManyFieldOptions: "results",
  tooManyFields: "results",
  tooManyRecipients: "results",
  invalidRecipient: "results",
  subjectTooLong: "results",
  noteTooLong: "results",
  tagTooLong: "results",
};

export function agentTabForError(key: ErrorKey | undefined): AgentTab | undefined {
  return key && ERROR_TABS[key];
}
