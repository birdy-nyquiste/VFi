// One-off: re-fetch summaries for calls marked fetched without one: fetched before Telnyx had created the
// summary insight, or while summaries were only asked for with TELNYX_INSIGHT_GROUP_ID set.
// Lists the calls by default; with --apply, hands them back to the daily cron, which fetches them again.
//   npx tsx --env-file=.env.local scripts/refetch-missing-summaries.mts [--apply]
import { reopenCallsMissingSummary } from "@/server/calls/backfill";

const apply = process.argv.includes("--apply");

const reopened = await reopenCallsMissingSummary({ apply });
for (const c of reopened) console.log(c.id, c.endedAt?.toISOString());
console.log(
  apply
    ? `[refetch-missing-summaries] ${reopened.length} call(s) reopened; the next daily cron run fetches them (200 per run)`
    : `[refetch-missing-summaries] ${reopened.length} call(s) would be reopened; run again with --apply`,
);
process.exit(0);
