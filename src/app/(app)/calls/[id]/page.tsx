import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LiveIndicator } from "@/components/logo";
import { ButtonLink, Card, CardTitle, Notice, PageHeader, StatusBadge } from "@/components/ui";
import type { Call } from "@/db/schema";
import { formatCents, formatDateTime, formatDuration, formatPhone } from "@/lib/format";
import { showStored, type StoredMessage } from "@/lib/stored-text";
import { requireUser } from "@/server/auth";
import { callAgentName, getUserCall } from "@/server/calls";
import { listUserNumbers } from "@/server/numbers";
import { getCallResultRow } from "@/server/call-results";
import { readFields, type FieldValue } from "@/lib/call-fields";
import { activeNumbersByAge, ourNumber } from "@/lib/phone-numbers";
import { isAwaitingResults, isCallLive } from "@/server/calls/state";
import { deleteCallAction, hangupAction } from "../actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { viewerTimeZone } from "@/server/time-zone";
import { RecordingPlayer } from "./recording-player";

/** Outcomes that are just how the call went at the other end, or a routine rejection; any other is a failure. */
const ROUTINE_OUTCOMES = new Set<StoredMessage["key"]>([
  "stored.outcomeNoAnswer",
  "stored.outcomeLineBusy",
  "stored.outcomeDeclined",
  "stored.outcomeCallerHungUp",
  "stored.outcomeCancelled",
  "stored.outcomeUnreachable",
  "stored.outcomeEndedEarly",
  "stored.outcomeBusy",
]);
// The title and the page share one load per request: loading a call may ask the provider for its results.
const loadCall = cache(async (id: string) => getUserCall((await requireUser()).id, id));

/** "Call from (415) 555-0100": the page header, and the browser tab. */
async function callTitle(call: Call) {
  const t = await getTranslations("calls");
  const other = call.direction === "inbound" ? call.fromNumber : call.toNumber;
  return /^\+\d/.test(other) ? t(call.direction === "inbound" ? "from" : "toTitle", { number: formatPhone(other) }) : t("fromUnknown");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const call = await loadCall((await params).id);
  return { title: call ? await callTitle(call) : (await getTranslations("calls"))("title") };
}

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await loadCall(id); // signs the viewer in, or redirects
  if (!call) notFound();
  const [agentName, numbers, results] = await Promise.all([callAgentName(call), listUserNumbers(call.userId), getCallResultRow(call.id)]);
  const resultFields = readFields(results?.fields);
  // Which of the user's numbers took or placed the call; shown only once they have more than one.
  const shownOurNumber = activeNumbersByAge(numbers).length > 1 ? ourNumber(call) : null;
  const live = isCallLive(call);
  const awaitingResults = isAwaitingResults(call);
  const [t, tc, tr, locale] = await Promise.all([getTranslations("calls"), getTranslations("common"), getTranslations("callResults"), getLocale()]);
  const showValue = (v: FieldValue | undefined) => (v === true ? tr("yes") : v === false ? tr("no") : (v ?? "—"));
  const tz = await viewerTimeZone();
  const other = call.direction === "inbound" ? call.fromNumber : call.toNumber;
  const meta = [
    t(call.direction === "inbound" ? "directionInbound" : "directionOutbound"),
    agentName,
    shownOurNumber ? t("yourNumber", { number: formatPhone(shownOurNumber) }) : null,
    call.durationSec != null ? formatDuration(call.durationSec) : null,
    call.billedCents != null ? formatCents(call.billedCents, locale) : null,
    formatDateTime(call.createdAt, locale, tz),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {(live || awaitingResults) && <AutoRefresh everyMs={live ? 1500 : 4000} slowestMs={live ? 5000 : undefined} />}
      <PageHeader
        back={{ href: "/calls", label: t("all") }}
        title={await callTitle(call)}
        description={meta.join(" · ")}
        action={<StatusBadge status={call.status} />}
      />

      {live && (
        <div className="flex flex-wrap items-center gap-4 rounded-[20px] bg-stone-900 px-5 py-4 text-white">
          <LiveIndicator />
          <span className="text-[15px]">{call.status === "answered" ? t("inProgress") : t("connecting")}</span>
          <ActionForm action={hangupAction} className="ml-auto">
            <input type="hidden" name="id" value={call.id} />
            <SubmitButton variant="danger">{t("hangUp")}</SubmitButton>
          </ActionForm>
        </div>
      )}
      {call.goal && (
        <Card>
          <CardTitle>{t("goalTitle")}</CardTitle>
          <p className="whitespace-pre-wrap text-sm text-stone-700">{call.goal}</p>
        </Card>
      )}
      {call.outcome && (
        <Notice tone={call.outcomeMsg && ROUTINE_OUTCOMES.has(call.outcomeMsg.key) ? "amber" : "red"}>
          {showStored(locale, call.outcome, call.outcomeMsg)}
        </Notice>
      )}


      {call.status === "completed" && (
        <>
          {results && (resultFields.length > 0 || results.emailStatus !== "off") && (
            <Card>
              <CardTitle>{tr("resultsTitle")}</CardTitle>
              {resultFields.length > 0 && (
                <dl className="divide-y divide-stone-100 text-sm">
                  {resultFields.map((f) => (
                    <div key={f.key} className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                      <dt className="text-stone-500">{f.name}</dt>
                      <dd className="whitespace-pre-wrap text-stone-900">{showValue(results.values?.[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {results.emailStatus !== "off" && (
                <p className={`mt-3 text-[13px] ${results.emailStatus === "failed" ? "text-red-600" : "text-stone-500"}`}>
                  {results.emailStatus === "sent"
                    ? tr("emailedTo", { to: (results.emailedTo ?? []).join(", "), time: formatDateTime(results.emailedAt, locale, tz) })
                    : results.emailStatus === "failed"
                      ? tr("emailFailed", { to: (results.emailedTo ?? []).join(", ") })
                      : tr("emailPending")}
                </p>
              )}
            </Card>
          )}
          <Card>
            <CardTitle>{t("summary")}</CardTitle>
            <p className="text-[17px] leading-[27px]">{call.summary ?? (awaitingResults ? t("generating") : t("noSummary"))}</p>
          </Card>
          {call.hasRecording && (
            <Card>
              <CardTitle>{t("recording")}</CardTitle>
              <RecordingPlayer src={`/api/calls/${call.id}/recording`} seed={call.id} durationSec={call.durationSec} />
            </Card>
          )}
          <Card>
            <CardTitle>{t("transcript")}</CardTitle>
            {call.transcript?.length ? (
              <ol className="space-y-3.5">
                {call.transcript.map((m, i) => (
                  <li key={i} className={`flex ${m.role === "assistant" ? "" : "justify-end"}`}>
                    <div className={`max-w-[78%] rounded-[18px] px-4 py-3 text-[15px] leading-[22px] ${m.role === "assistant" ? "bg-stone-100" : "bg-stone-900 text-white"}`}>
                      <div className={`mb-1 text-xs ${m.role === "assistant" ? "text-emerald-700" : "text-stone-400"}`}>{m.role === "assistant" ? agentName ?? tc("agent") : t("caller")}</div>
                      {m.text}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-stone-500">{awaitingResults ? t("fetchingTranscript") : t("noTranscript")}</p>
            )}
          </Card>
        </>
      )}

      {!live && /^\+\d/.test(other) && (
        <Card className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle>{t("callBackTitle")}</CardTitle>
            <p className="-mt-1 text-sm text-stone-600">{t("callBackBody")}</p>
          </div>
          <ButtonLink href={`/calls?to=${encodeURIComponent(other)}#place`}>{t("callBackAction")}</ButtonLink>
        </Card>
      )}

      {!live && (
        <ActionForm action={deleteCallAction}>
          <input type="hidden" name="id" value={call.id} />
          <SubmitButton variant="danger" confirm={t("deleteConfirm")}>
            {t("delete")}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
