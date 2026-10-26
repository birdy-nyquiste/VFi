// One-off: re-fetch summaries for calls marked fetched before Telnyx had created their summary insight.
// Lists the calls by default; with --apply, hands them back to the daily cron, which fetches them again.
//   npx tsx --env-file=.env.local scripts/refetch-missing-summaries.mts [--apply]
import { config } from "@/lib/config";
import { reopenCallsMissingSummary } from "@/server/calls/backfill";

const apply = process.argv.includes("--apply");

// Without an insight group no call has a summary, so there is nothing to repair.
if (!config.telnyx.insightGroupId) {
  console.error("[refetch-missing-summaries] TELNYX_INSIGHT_GROUP_ID is not set");
  process.exit(1);
}

const reopened = await reopenCallsMissingSummary({ apply });
for (const c of reopened) console.log(c.id, c.endedAt?.toISOString());
console.log(
  apply
    ? `[refetch-missing-summaries] ${reopened.length} call(s) reopened; the next daily cron run fetches them (200 per run)`
    : `[refetch-missing-summaries] ${reopened.length} call(s) would be reopened; run again with --apply`,
);
process.exit(0);
