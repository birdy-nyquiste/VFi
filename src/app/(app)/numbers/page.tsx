import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardTitle, Empty, Notice, PageHeader, StatusBadge, buttonClass, inputClass } from "@/components/ui";
import { config } from "@/lib/config";
import { UserError, userMessage } from "@/lib/errors";
import { formatCents, formatDate, formatPhone } from "@/lib/format";
import { showStored } from "@/lib/stored-text";
import { listUserAgents } from "@/server/agents";
import { requireUser } from "@/server/auth";
import { listRecentNegativeBalanceReleases, listUserNumbers, refreshPendingNumbers, searchAvailableNumbers } from "@/server/numbers";
import { NegativeBalanceNotice } from "../negative-balance-notice";
import { assignAgentAction, buyNumberAction, releaseNumberAction, simulateInboundAction, simulateTextAction } from "./actions";
import { viewerTimeZone } from "@/server/time-zone";
import { currentBalanceCents } from "@/server/billing/ledger";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("numbers"))("title") };
}

export default async function NumbersPage({ searchParams }: { searchParams: Promise<{ area?: string; ends?: string }> }) {
  const user = await requireUser();
  const { area, ends } = await searchParams;
  const ending = ends?.trim() ?? "";
  const [t, tc, ts, locale] = await Promise.all([getTranslations("numbers"), getTranslations("common"), getTranslations("status"), getLocale()]);
  const tz = await viewerTimeZone();
  // A failed order is refunded while this renders: then the user row read earlier is out of date.
  const balanceCents = (await refreshPendingNumbers(user.id)) ? await currentBalanceCents(user.id) : user.balanceCents;
  const [numbers, agents, releasedForBalance] = await Promise.all([
    listUserNumbers(user.id),
    listUserAgents(user.id),
    listRecentNegativeBalanceReleases(user.id),
  ]);
  const owned = numbers.filter((n) => n.status !== "failed");
  const canBuy = owned.length < config.limits.numbersPerUser;
  // The first month is charged up front, so say so before the user searches and picks one.
  const canAfford = balanceCents >= config.pricing.numberMonthlyCents;
  // Each render asks the provider about pending orders. A row without an order id is a lost order,
  // looked up only once it is an hour old, so polling wouldn't settle it any sooner.
  const activating = numbers.some((n) => n.status === "pending" && n.providerOrderId);

  // The form always sends both boxes; either being present means the user searched.
  const searched = area !== undefined || ends !== undefined;
  let results: Awaited<ReturnType<typeof searchAvailableNumbers>>["numbers"] = [];
  let widened = false;
  let searchError: string | undefined;
  if (canBuy && searched) {
    try {
      ({ numbers: results, widened } = await searchAvailableNumbers(area?.trim() ?? "", ending));
    } catch (err) {
      console.error("Number search failed", { area, ends }, err);
      searchError = err instanceof UserError ? userMessage(err, locale) : t("searchFailed");
    }
  }

  return (
    <div className="space-y-6">
      {activating && <AutoRefresh everyMs={5000} />}
      <PageHeader
        title={t("title")}
        description={t("description", { price: formatCents(config.pricing.numberMonthlyCents, locale), max: config.limits.numbersPerUser })}
      />

      {balanceCents < 0 && numbers.some((n) => n.status === "active") && (
        <NegativeBalanceNotice user={user} hasNumber linkToBilling />
      )}

      {releasedForBalance.map((n) => (
        <Notice key={n.id} tone="red">
          {t.rich("releasedNegative", {
            number: formatPhone(n.e164),
            date: formatDate(n.releasedAt, locale, tz),
            link: (chunks) => (
              <Link href="/account/billing" className="font-medium underline">
                {chunks}
              </Link>
            ),
          })}
        </Notice>
      ))}

      {numbers.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <div className="space-y-3">
          {numbers.map((n) => (
            <Card key={n.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[28px] font-light leading-9 tracking-[-0.02em] tabular-nums">{formatPhone(n.e164)}</span>
                    <StatusBadge status={n.status} />
                  </div>
                  {n.status === "active" && n.paidThrough && (
                    <p className="mt-1.5 text-sm text-stone-600">{t("renews", { date: formatDate(n.paidThrough, locale, tz) })}</p>
                  )}
                  {n.status === "active" && config.features.inboundSms && (
                    <p className="mt-1.5 text-sm text-stone-600">
                      {n.smsEnabledAt ? (
                        t.rich("receivesTexts", {
                          price: formatCents(config.pricing.smsInboundPerPartCents, locale),
                          link: (chunks) => (
                            <Link href="/messages" className="underline">
                              {chunks}
                            </Link>
                          ),
                        })
                      ) : (
                        t("smsSettingUp")
                      )}
                    </p>
                  )}
                  {n.status === "pending" && <p className="mt-1.5 text-sm text-stone-600">{t("activating")}</p>}
                  {n.failureReason && n.status === "failed" && <p className="mt-1 text-sm text-red-600">{showStored(locale, n.failureReason, n.failureMsg)}</p>}
                </div>
                {n.status === "active" && (
                  <div className="flex flex-wrap items-start gap-3">
                    <ActionForm action={assignAgentAction} className="flex items-center gap-2">
                      <input type="hidden" name="numberId" value={n.id} />
                      <select name="agentId" aria-label={t("agentLabel")} defaultValue={n.agentId ?? ""} className={`${inputClass} w-48`}>
                        <option value="">{t("noAgentOption")}</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id} disabled={a.status !== "ready"}>
                            {a.status === "ready" ? a.name : t("agentStatus", { name: a.name, status: ts(a.status) })}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="secondary">{tc("save")}</SubmitButton>
                    </ActionForm>
                    <ActionForm action={releaseNumberAction}>
                      <input type="hidden" name="numberId" value={n.id} />
                      <SubmitButton variant="danger" confirm={t("releaseConfirm", { number: formatPhone(n.e164) })}>
                        {t("release")}
                      </SubmitButton>
                    </ActionForm>
                  </div>
                )}
                {n.status === "failed" && (
                  <ActionForm action={releaseNumberAction}>
                    <input type="hidden" name="numberId" value={n.id} />
                    <SubmitButton variant="secondary">{t("dismiss")}</SubmitButton>
                  </ActionForm>
                )}
              </div>
              {config.telnyx.mode === "mock" && n.status === "active" && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                  <ActionForm action={simulateInboundAction}>
                    <input type="hidden" name="numberId" value={n.id} />
                    <SubmitButton variant="secondary">{t("simulateCall")}</SubmitButton>
                  </ActionForm>
                  {n.smsEnabledAt && (
                    <ActionForm action={simulateTextAction}>
                      <input type="hidden" name="numberId" value={n.id} />
                      <SubmitButton variant="secondary">{t("simulateText")}</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!canBuy && (
        <p className="rounded-[20px] border border-dashed border-stone-300 px-5 py-4 text-sm text-stone-600">
          {t("atLimit", { max: config.limits.numbersPerUser })}
        </p>
      )}

      {canBuy && (
        <Card>
          <CardTitle>{t("get")}</CardTitle>
          {!canAfford && (
            <div className="mb-4">
              <Notice>
                {t.rich("needCredit", {
                  price: formatCents(config.pricing.numberMonthlyCents, locale),
                  link: (chunks) => (
                    <Link href="/account/billing" className="font-medium underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </Notice>
            </div>
          )}
          <form className="flex flex-wrap items-end gap-2" action="/numbers" role="search">
            <label className="flex flex-col gap-1.5 text-[13px] text-stone-600">
              {t("areaCode")}
              <input name="area" defaultValue={area} placeholder={t("areaPlaceholder")} inputMode="numeric" maxLength={3} className={`${inputClass} w-44`} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-stone-600">
              {t("endsWith")}
              <input name="ends" defaultValue={ends} placeholder={t("endsWithPlaceholder")} inputMode="numeric" maxLength={4} className={`${inputClass} w-44`} />
            </label>
            <button className={buttonClass("primary")}>{t("search")}</button>
          </form>
          <p className="mt-2 text-xs text-stone-500">{t("searchHint")}</p>
          {searchError && <p className="mt-3 text-sm text-red-600">{searchError}</p>}
          {widened && <p className="mt-3 text-sm text-stone-500">{t("widened", { area: area?.trim() ?? "", ending })}</p>}
          {!widened && results.length > 0 && results.every((r) => r.nearby) && (
            <p className="mt-3 text-sm text-stone-500">
              {ending ? t("nearbyOnlyEnding", { area: area?.trim() ?? "", ending }) : t("nearbyOnly", { area: area ?? "" })}
            </p>
          )}
          {searched && !searchError && results.length === 0 && (
            <p className="mt-3 text-sm text-stone-500">{ending ? t("noResultsEnding", { ending }) : t("noResults")}</p>
          )}
          {results.length > 0 && (
            <ul className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
              {results.map((r) => (
                <li key={r.e164} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-[18px] py-4">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[17px] tabular-nums">
                      <EndingDigits phone={formatPhone(r.e164)} ending={ending} />
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-[13px] text-stone-500">
                      {[r.locality, r.region].filter(Boolean).join(", ")}
                      {r.nearby && <Badge tone="amber">{t("nearby")}</Badge>}
                    </span>
                  </span>
                  <ActionForm action={buyNumberAction} className="ml-auto text-right">
                    <input type="hidden" name="e164" value={r.e164} />
                    <SubmitButton
                      variant="secondary"
                      disabled={!canAfford}
                      pendingText={t("ordering")}
                      confirm={t("buyConfirm", { number: formatPhone(r.e164), price: formatCents(config.pricing.numberMonthlyCents, locale) })}
                    >
                      {t("buy")}
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

/** The number with the searched-for last digits in bold. The last 4 digits close the formatted number too. */
function EndingDigits({ phone, ending }: { phone: string; ending: string }) {
  if (!ending || !phone.endsWith(ending)) return phone;
  return (
    <>
      {phone.slice(0, -ending.length)}
      <span className="font-semibold">{ending}</span>
    </>
  );
}
