/**
 * The Assistant page's tabs (SPEC §5.1), one per settings card. The page's address names the open one
 * (`?tab=instructions`); Identity is the default and isn't named.
 */
export const AGENT_TABS = ["identity", "instructions", "conversation", "ending", "results", "knowledge"] as const;
export type AgentTab = (typeof AGENT_TABS)[number];

export function readAgentTab(value: unknown): AgentTab {
  return AGENT_TABS.find((t) => t === value) ?? "identity";
}

/** The page's address with `tab` open, keeping any other parameters in `query`. */
export function agentTabQuery(tab: AgentTab, query: Record<string, string> = {}): string {
  const q = new URLSearchParams(query);
  if (tab !== "identity") q.set("tab", tab);
  const s = q.toString();
  return s ? `?${s}` : "";
}
