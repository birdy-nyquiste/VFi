import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Card, Empty, FilterChips, Notice, PageHeader } from "@/components/ui";
import { config } from "@/lib/config";
import { formatCents, formatDateTime, formatPhone } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { listConversations } from "@/server/messages";
import { listUserNumbers } from "@/server/numbers";
import { AutoRefresh } from "@/components/auto-refresh";
import { messagePreview, threadHref } from "./format";
import { viewerTimeZone } from "@/server/time-zone";
import { isUuid } from "@/lib/uuid";
import { activeNumbersByAge } from "@/lib/phone-numbers";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("messages"))("title") };
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ number?: string }> }) {
  const user = await requireUser();
  const { number } = await searchParams;
  const numbers = await listUserNumbers(user.id);
  const activeNumbers = activeNumbersByAge(numbers);
  const active = activeNumbers[0];
  // Conversations say which of the user's numbers they were sent to, and can be filtered by it, once there's more than one.
  const showNumbers = activeNumbers.length > 1;
  const filter = showNumbers && number && isUuid(number) ? activeNumbers.find((n) => n.id === number) : undefined;
  const conversations = await listConversations(user.id, 500, filter?.e164);
  const [t, tc, locale] = await Promise.all([getTranslations("messages"), getTranslations("common"), getLocale()]);
  const tz = await viewerTimeZone();

  return (
    <div className="space-y-6">
      <AutoRefresh everyMs={10_000} maxMs={Infinity} />
      <PageHeader
        title={t("title")}
        description={t("description", { price: formatCents(config.pricing.smsInboundPerPartCents, locale) })}
      />

      {!config.features.inboundSms ? (
        <Notice>{t("smsOff")}</Notice>
      ) : !active ? (
        <Notice>
          {t.rich("getNumber", {
            link: (chunks) => (
              <Link href="/numbers" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </Notice>
      ) : (
        activeNumbers
          .filter((n) => !n.smsEnabledAt)
          .map((n) => <Notice key={n.id}>{t("smsSettingUp", { number: formatPhone(n.e164) })}</Notice>)
      )}

      {showNumbers && (
        <FilterChips
          label={tc("filterByNumber")}
          chips={[
            { href: "/messages", label: tc("allNumbers"), active: !filter },
            ...activeNumbers.map((n) => ({ href: `/messages?number=${n.id}`, label: formatPhone(n.e164), active: filter?.id === n.id })),
          ]}
        />
      )}

      {conversations.length === 0 ? (
        <Empty>{filter ? t("emptyForNumber") : t("empty")}</Empty>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-stone-100">
            {conversations.map((c) => (
              <li key={`${c.from} ${c.to}`}>
                <Link href={threadHref(c)} className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-stone-50">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {/* Names run up to 60 characters, so they truncate instead of pushing past the card on phones. */}
                      <span className={`min-w-0 max-w-full truncate ${c.unread ? "font-semibold" : "font-medium"}`}>{c.name ?? formatPhone(c.from)}</span>
                      {c.name && <span className="whitespace-nowrap text-xs text-stone-500">{formatPhone(c.from)}</span>}
                      {showNumbers && <span className="whitespace-nowrap text-xs tabular-nums text-stone-500">{t("toNumber", { number: formatPhone(c.to) })}</span>}
                      {c.unread > 0 && <span className="whitespace-nowrap"><Badge tone="blue">{t("newCount", { count: c.unread })}</Badge></span>}
                      {c.count > 1 && <span className="whitespace-nowrap text-xs text-stone-500">{t("textCount", { count: c.count })}</span>}
                    </div>
                    <p className={`mt-0.5 truncate text-sm ${c.unread ? "text-stone-800" : "text-stone-500"}`}>{messagePreview(c.last, t)}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-stone-500 sm:text-sm">{formatDateTime(c.last.receivedAt, locale, tz)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
