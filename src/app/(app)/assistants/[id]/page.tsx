import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/forms";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { showStored } from "@/lib/stored-text";
import { config } from "@/lib/config";
import { getUserAgent, listModels, resyncStaleAgentsOnView } from "@/server/agents";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getAgentResultsRow, readResultsSettings } from "@/server/call-results";
import { getElevenLabsKey } from "@/server/elevenlabs/keys";
import { countAgentSources, hasPendingKnowledge, refreshKnowledge } from "@/server/knowledge";
import { listUserNumbers } from "@/server/numbers";
import { isElevenLabsVoice } from "@/server/telnyx/stock-voices";
import { listStockVoices, listUserVoices } from "@/server/voices";
import { deleteAgentAction } from "../actions";
import { AgentForm } from "../agent-form";
import { KnowledgeSection } from "../knowledge-section";
import { AgentTabPanel, AgentTabs } from "../agent-tabs";
import { readAgentTab } from "@/lib/agent-tabs";
import { agentTabLabels } from "../tab-labels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const agent = await getUserAgent(user.id, id);
  return { title: agent?.name ?? (await getTranslations("agents"))("title") };
}

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { saved, tab } = await searchParams;
  let agent = await getUserAgent(user.id, id);
  if (!agent) notFound();
  if (config.features.knowledgeBase) {
    // Settle sources and catch up the assistant here too, not only in the daily job.
    if (await hasPendingKnowledge(agent.id)) await refreshKnowledge({ agentId: agent.id });
    if (await resyncStaleAgentsOnView(user.id)) agent = (await getUserAgent(user.id, id)) ?? agent;
  }
  const [stock, clones, models, elKey, numbers, sources, resultsRow] = await Promise.all([
    // Without the catalog the form keeps the agent's current voice and says why there are no others.
    listStockVoices().catch((err) => {
      console.error("voice catalog unavailable", err);
      return null;
    }),
    listUserVoices(user.id),
    // Without the catalog the form still offers the default model.
    listModels().catch(() => []),
    getElevenLabsKey(user.id),
    listUserNumbers(user.id),
    config.features.knowledgeBase ? countAgentSources(agent.id) : 0,
    getAgentResultsRow(agent.id),
  ]);
  const [t, locale] = await Promise.all([getTranslations("agents"), getLocale()]);
  const keyRejected = isElevenLabsVoice(agent.voiceRef) && Boolean(elKey?.keyInvalidAt);
  // Say what deleting takes with it: the number's answering, and the paid knowledge base for good.
  const answers = numbers.some((n) => n.agentId === agent.id && n.status === "active");
  const deleteConfirm = answers
    ? sources
      ? "deleteConfirmNumberKnowledge"
      : "deleteConfirmNumber"
    : sources
      ? "deleteConfirmKnowledge"
      : "deleteConfirm";
  return (
    <AgentTabs initial={readAgentTab(tab)} knowledge={config.features.knowledgeBase}>
      <div className="space-y-6">
        <PageHeader back={{ href: "/assistants", label: t("all") }} title={agent.name} action={<StatusBadge status={agent.status} />} />
        {agent.status === "failed" && <Notice tone="red">{showStored(locale, agent.failureReason, agent.failureMsg)}</Notice>}
        {keyRejected && (
          <Notice tone="red">
            {t.rich("keyRejectedNotice", {
              link: (chunks) => (
                <Link href="/account/api-keys" className="font-medium underline">
                  {chunks}
                </Link>
              ),
            })}
          </Notice>
        )}
        {/* Keyed on updatedAt: React resets a form to its initial defaults after an action, so
            without a remount the fields would show pre-save values (and a second save would revert). */}
        <AgentForm
          key={agent.updatedAt.toISOString()}
          agent={agent}
          saved={Boolean(saved) && agent.status === "ready"}
          stock={stock}
          clones={clones}
          models={models}
          results={readResultsSettings(resultsRow)}
          accountEmail={user.email}
          tabLabels={await agentTabLabels()}
          deleteConfirm={t(deleteConfirm, { name: agent.name })}
        />
        {config.features.knowledgeBase && (
          <AgentTabPanel tab="knowledge">
            <KnowledgeSection agent={agent} />
          </AgentTabPanel>
        )}
        {/* Submitted by Delete in the bar above the tabs; only an error shows here. */}
        <ActionForm id="delete-agent" action={deleteAgentAction}>
          <input type="hidden" name="id" value={agent.id} />
        </ActionForm>
      </div>
    </AgentTabs>
  );
}
