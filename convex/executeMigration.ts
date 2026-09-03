import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  syntheticMigrationCommandId,
  migrationCommandFingerprint,
  DomainError,
  parseCampaignId,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "../shared/domain";
import { analyzeLegacyMigration } from "../shared/domain/migration-analyzer";
import { serializeState } from "./persistence";
import { assertCampaignNotDeleting } from "./deletionBarrier";
import type { MonthDirection, MonthOrdinal } from "../shared/domain";

export const executeMigration = internalMutation({
  args: {
    campaignId: v.string(),
  },
  returns: v.object({
    status: v.literal("migrated"),
    campaignId: v.string(),
    campaignRevision: v.number(),
    snapshotsCreated: v.number(),
    revisionsCreated: v.number(),
    eventsCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);

    const campaignId = parseCampaignId(args.campaignId);

    const existingCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (existingCanonical !== null) {
      throw new DomainError("MIGRATION_ALREADY_APPLIED", "A canonical campaign already exists");
    }

    const existingRevisions = await ctx.db.query("campaignRevisions").first();
    if (existingRevisions !== null) {
      throw new DomainError("MIGRATION_CANONICAL_DATA_NOT_EMPTY", "campaignRevisions table is not empty");
    }

    const existingEvents = await ctx.db.query("campaignEvents").first();
    if (existingEvents !== null) {
      throw new DomainError("MIGRATION_CANONICAL_DATA_NOT_EMPTY", "campaignEvents table is not empty");
    }

    const existingSnapshots = await ctx.db.query("campaignSnapshots").first();
    if (existingSnapshots !== null) {
      throw new DomainError("MIGRATION_CANONICAL_DATA_NOT_EMPTY", "campaignSnapshots table is not empty");
    }

    const allCampaigns = await ctx.db.query("campaigns").collect();
    const legacyCampaigns = allCampaigns.filter(
      (c): c is typeof c & { monthOrdinal: number; revision: number } =>
        "monthOrdinal" in c && "revision" in c && !("campaignKey" in c),
    );

    if (legacyCampaigns.length !== 1) {
      throw new DomainError(
        "MIGRATION_NOT_READY",
        `Expected exactly 1 legacy campaign, found ${legacyCampaigns.length}`,
      );
    }

    const legacyCampaign = legacyCampaigns[0];
    const legacyEvents = await ctx.db.query("events").order("asc").collect();

    const campaignInputs = [{ monthOrdinal: legacyCampaign.monthOrdinal, revision: legacyCampaign.revision }];
    const eventInputs = legacyEvents.map((e) => ({
      type: e.type,
      revision: e.revision,
      direction: e.direction,
      previousMonthOrdinal: e.previousMonthOrdinal,
      newMonthOrdinal: e.newMonthOrdinal,
      previousMonth: e.previousMonth,
      newMonth: e.newMonth,
    }));

    const analysis = analyzeLegacyMigration(campaignInputs, eventInputs);

    if (analysis.status !== "ready") {
      const reason = analysis.status === "invalid" ? analysis.reason : "no migration needed";
      throw new DomainError("MIGRATION_NOT_READY", `Legacy analysis failed: ${reason}`);
    }

    for (const snapshot of analysis.snapshots) {
      await ctx.db.insert("campaignSnapshots", {
        campaignId: campaignId as string,
        campaignRevision: snapshot.campaignRevision,
        state: {
          schemaVersion: snapshot.state.schemaVersion,
          ruleset: { id: snapshot.state.ruleset.id, version: snapshot.state.ruleset.version },
          calendar: { monthOrdinal: snapshot.state.calendar.monthOrdinal as number },
        } as any,
      });
    }

    for (const rev of analysis.revisions) {
      const commandId = syntheticMigrationCommandId(rev.campaignRevision);
      const direction = rev.event.data.direction as MonthDirection;
      const fingerprint = migrationCommandFingerprint(rev.campaignRevision, direction);

      await ctx.db.insert("campaignRevisions", {
        campaignId: campaignId as string,
        campaignRevision: rev.campaignRevision,
        commandId: commandId as string,
        commandType: rev.commandType,
        commandFingerprint: fingerprint,
      });

      await ctx.db.insert("campaignEvents", {
        campaignId: campaignId as string,
        campaignRevision: rev.campaignRevision,
        eventIndex: 0,
        event: {
          type: rev.event.type,
          version: rev.event.version,
          data: {
            direction: rev.event.data.direction,
            fromOrdinal: rev.event.data.fromOrdinal as number,
            toOrdinal: rev.event.data.toOrdinal as number,
          },
        },
      });
    }

    const finalSnapshot = analysis.snapshots[analysis.snapshots.length - 1];
    // Legacy V1→V2 migration path is dead code (V1/V2 states removed).
    // Build a minimal V3-shaped state for the campaign document.
    const finalOrdinal = finalSnapshot.state.calendar.monthOrdinal as number as MonthOrdinal;
    const currentState = {
      schemaVersion: 3 as const,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: finalOrdinal as number | null },
      players: [] as any[],
      wizards: [] as any[],
      configuration: { ageId: null, facilitatorPlayerId: null },
      pactSeats: {} as Record<string, any>,
      lifecycle: { status: "active" as const },
      wizardmootHistory: [] as any[],
    };

    await ctx.db.replace(legacyCampaign._id, {
      campaignKey: "default" as const,
      campaignId: campaignId as string,
      campaignRevision: analysis.legacyCampaignRevision,
      state: serializeState(currentState as any),
    } as any);

    return {
      status: "migrated" as const,
      campaignId: campaignId as string,
      campaignRevision: analysis.legacyCampaignRevision,
      snapshotsCreated: analysis.snapshotCount,
      revisionsCreated: analysis.revisionRecordCount,
      eventsCreated: analysis.newEventRecordCount,
    };
  },
});
