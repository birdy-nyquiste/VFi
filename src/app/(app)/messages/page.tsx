import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Card, Empty, FilterChips, Notice, PageHeader, compactInputClass } from "@/components/ui";
import { ListFilters } from "@/components/list-filters";
import { FilterSummary, Pagination } from "@/components/list-parts";
import { listHref, readPage, singleValues } from "@/lib/list-params";
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

type ListParams = { q?: string; unread?: string; sort?: string; number?: string; page?: string };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Partial<Record<keyof ListParams, string | string[]>>> }) {
  const user = await requireUser();
  const params = singleValues(await searchParams);
  const { number } = params;
  const numbers = await listUserNumbers(user.id);
  const activeNumbers = activeNumbersByAge(numbers);
  const active = activeNumbers[0];
  // Conversations say which of the user's numbers they were sent to, and can be filtered by it, once there's more than one.
  const showNumbers = activeNumbers.length > 1;
  const filter = showNumbers && number && isUuid(number) ? activeNumbers.find((n) => n.id === number) : undefined;
  const search = params.q?.trim() || undefined;
  const unreadOnly = params.unread === "1";
  const oldestFirst = params.sort === "oldest";
  const { conversations, total, page } = await listConversations(user.id, {
    to: filter?.e164,
    search,
    unreadOnly,
    oldestFirst,
    page: readPage(params.page),
  });
  const filtered = Boolean(filter || search || unreadOnly);
  const shown: ListParams = { q: search, unread: unreadOnly ? "1" : undefined, sort: oldestFirst ? "oldest" : undefined, number: filter?.id, page: String(page) };
  const href = (changes: Partial<ListParams>) => listHref("/messages", shown, changes);
  const [t, tc, locale] = await Promise.all([getTranslations("messages"), getTranslations("common"), getLocale()]);
  const tz = await viewerTimeZone();

  return (
    <div className="space-y-6">
      <AutoRefresh everyMs={10_000} maxMs={Infinity} />
      <PageHeader
        title={t("title")}
        description={t(showNumbers ? "descriptionMany" : "description", { price: formatCents(config.pricing.smsInboundPerPartCents, locale) })}
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

      {(total > 0 || filtered) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-[1_1_320px]">
              <ListFilters key={href({})} action="/messages" label={t("filtersLabel")} keep={{ unread: shown.unread, number: shown.number }}>
                <input
                  name="q"
                  type="search"
                  defaultValue={search}
                  aria-label={t("searchLabel")}
                  placeholder={t("searchPlaceholder")}
                  className={`${compactInputClass} min-w-0 flex-[1_1_200px]`}
                />
                <select name="sort" defaultValue={oldestFirst ? "oldest" : ""} aria-label={tc("sort")} className={compactInputClass}>
                  <option value="">{t("sortNewest")}</option>
                  <option value="oldest">{t("sortOldest")}</option>
                </select>
              </ListFilters>
            </div>
            <FilterChips label={t("unreadLabel")} chips={[{ href: href({ unread: unreadOnly ? undefined : "1" }), label: t("unreadOnly"), active: unreadOnly }]} />
          </div>
          {showNumbers && (
            <FilterChips
              label={tc("filterByNumber")}
              chips={[
                { href: href({ number: undefined }), label: tc("allNumbers"), active: !filter },
                ...activeNumbers.map((n) => ({ href: href({ number: n.id }), label: formatPhone(n.e164), active: filter?.id === n.id })),
              ]}
            />
          )}
          {filtered && <FilterSummary matching={t("matching", { count: total })} clearHref={listHref("/messages", { sort: shown.sort }, {})} />}
        </div>
      )}

      {conversations.length === 0 ? (
        <Empty>{filtered ? t("emptyFiltered") : t("empty")}</Empty>
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
          <Pagination page={page} total={total} href={(p) => href({ page: String(p) })} />
        </Card>
      )}
    </div>
  );
}
