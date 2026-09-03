import { v } from "convex/values";
import { query } from "./_generated/server";
import { analyzeLegacyMigration } from "../shared/domain/migration-analyzer";
import type { MigrationAnalysisResult } from "../shared/domain/migration-analyzer";

const migrationSnapshotPlanValidator = v.object({
  campaignRevision: v.number(),
  state: v.object({
    schemaVersion: v.literal(1),
    ruleset: v.object({
      id: v.literal("seven_part_pact_draft4"),
      version: v.literal(1),
    }),
    calendar: v.object({
      monthOrdinal: v.number(),
    }),
  }),
});

const migrationRevisionPlanValidator = v.object({
  campaignRevision: v.number(),
  commandType: v.union(v.literal("move_month"), v.literal("legacy_month_change")),
  event: v.object({
    type: v.literal("month_changed"),
    version: v.literal(1),
    data: v.object({
      direction: v.union(v.literal("forward"), v.literal("backward")),
      fromOrdinal: v.number(),
      toOrdinal: v.number(),
    }),
  }),
});

const analysisResultValidator = v.union(
  v.object({ status: v.literal("not_needed") }),
  v.object({
    status: v.literal("ready"),
    legacyCampaignRevision: v.number(),
    initialMonthOrdinal: v.number(),
    finalMonthOrdinal: v.number(),
    legacyEventCount: v.number(),
    revisionRecordCount: v.number(),
    newEventRecordCount: v.number(),
    snapshotCount: v.number(),
    snapshots: v.array(migrationSnapshotPlanValidator),
    revisions: v.array(migrationRevisionPlanValidator),
    migrationCommandType: v.union(
      v.literal("move_month"),
      v.literal("legacy_month_change"),
    ),
    idsDeferred: v.literal(true),
  }),
  v.object({
    status: v.literal("invalid"),
    reason: v.string(),
  }),
);

function toMutableResult(result: MigrationAnalysisResult) {
  if (result.status !== "ready") return result;
  return {
    ...result,
    snapshots: result.snapshots.map((s: (typeof result.snapshots)[number]) => ({ ...s, state: { ...s.state, ruleset: { ...s.state.ruleset }, calendar: { ...s.state.calendar } } })),
    revisions: result.revisions.map((r: (typeof result.revisions)[number]) => ({ ...r, event: { ...r.event, data: { ...r.event.data } } })),
  };
}

export const analyzeMigration = query({
  args: {},
  returns: analysisResultValidator,
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect();

    const legacyCampaigns = campaigns.filter(
      (c): c is typeof c & { monthOrdinal: number; revision: number } =>
        "monthOrdinal" in c && "revision" in c && !("campaignKey" in c),
    );

    const legacyEvents = await ctx.db.query("events").order("asc").collect();

    const campaignInputs = legacyCampaigns.map((c) => ({
      monthOrdinal: c.monthOrdinal,
      revision: c.revision,
    }));

    const eventInputs = legacyEvents.map((e) => ({
      type: e.type,
      revision: e.revision,
      direction: e.direction,
      previousMonthOrdinal: e.previousMonthOrdinal,
      newMonthOrdinal: e.newMonthOrdinal,
      previousMonth: e.previousMonth,
      newMonth: e.newMonth,
    }));

    const result = analyzeLegacyMigration(campaignInputs, eventInputs);
    return toMutableResult(result);
  },
});
