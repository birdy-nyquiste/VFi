import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink, Card, Empty, focusRing, PageHeader, StatusBadge } from "@/components/ui";
import { config } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import { listUserAgents, resyncStaleAgentsOnView } from "@/server/agents";
import { requireUser } from "@/server/auth";
import { getElevenLabsKey } from "@/server/elevenlabs/keys";
import { isElevenLabsVoice } from "@/server/telnyx/stock-voices";
import { listUserNumbers } from "@/server/numbers";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("agents"))("title") };
}

export default async function AgentsPage() {
  const user = await requireUser();
  // Bring agents up to date with changed platform model settings (cheap no-op otherwise).
  await resyncStaleAgentsOnView(user.id);
  const [agents, numbers, elKey] = await Promise.all([listUserAgents(user.id), listUserNumbers(user.id), getElevenLabsKey(user.id)]);
  const keyRejected = Boolean(elKey?.keyInvalidAt);
  const [t, tl] = await Promise.all([getTranslations("agents"), getTranslations("languages")]);
  const max = config.limits.agentsPerUser;
  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          agents.length < max ? (
            <ButtonLink href="/assistants/new">{t("new")}</ButtonLink>
          ) : (
            <p className="max-w-xs text-sm text-stone-500">{t("limitReached", { max })}</p>
          )
        }
      />
      {agents.length === 0 ? (
        <Empty>
          {t.rich("empty", {
            link: (chunks) => (
              <Link href="/assistants/new" className="font-medium underline">
                {chunks}
              </Link>
            ),
          })}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((a) => {
            const nums = numbers.filter((n) => n.agentId === a.id && n.status === "active");
            return (
              <Link key={a.id} href={`/assistants/${a.id}`} className={`group rounded-[20px] ${focusRing}`}>
                <Card className="h-full transition-colors group-hover:border-stone-900">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-base font-medium">{a.name}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-[21px] text-stone-600">{a.greeting}</p>
                  {keyRejected && isElevenLabsVoice(a.voiceRef) && (
                    <p className="mt-2 text-xs text-red-600">{t("keyRejected")}</p>
                  )}
                  <p className="mt-4 text-[13px] text-stone-500">
                    {tl(a.language)} · {nums.length ? t("answers", { number: nums.map((n) => formatPhone(n.e164)).join(", ") }) : t("notOnNumber")}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
