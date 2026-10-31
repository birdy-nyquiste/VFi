import "server-only";
import { getTranslations } from "next-intl/server";
import type { AgentTab } from "@/lib/agent-tab-ids";

/** Each Assistant tab's name: the card it holds. */
export async function agentTabLabels(): Promise<Record<AgentTab, string>> {
  const [t, tr, tk] = await Promise.all([getTranslations("agents"), getTranslations("callResults"), getTranslations("knowledge")]);
  return {
    identity: t("sectionIdentity"),
    instructions: t("sectionInstructions"),
    conversation: t("sectionConversation"),
    ending: t("sectionEnding"),
    results: tr("title"),
    knowledge: tk("title"),
  };
}
