import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  validateCampaignState,
  verifyMigrationInvariants,
  type RevisionRecord,
  type EventRecord,
  type SnapshotRecord,
  type CampaignDocument,
} from "../shared/domain";

const verificationResultValidator = v.union(
  v.object({
    status: v.literal("no_canonical_campaign"),
  }),
  v.object({
    status: v.literal("valid"),
    campaignId: v.string(),
    campaignRevision: v.number(),
    revisionRecordCount: v.number(),
    eventRecordCount: v.number(),
    snapshotCount: v.number(),
    campaignDocumentCount: v.number(),
  }),
  v.object({
    status: v.literal("invalid"),
    errors: v.array(v.string()),
  }),
);

export const verifyMigration = query({
  args: {},
  returns: verificationResultValidator,
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (
      maybeCanonical === null ||
      !("campaignKey" in maybeCanonical) ||
      maybeCanonical.campaignKey !== "default"
    ) {
      return { status: "no_canonical_campaign" as const };
    }

    const canonical = maybeCanonical as typeof maybeCanonical & {
      campaignId: string;
      campaignRevision: number;
      state: {
        schemaVersion: 1;
        ruleset: { id: string; version: number };
        calendar: { monthOrdinal: number };
      };
    };

    const campaignId = canonical.campaignId;
    const campaignRevision = canonical.campaignRevision;
    const errors: string[] = [];

    try {
      validateCampaignState(canonical.state);
    } catch {
      errors.push("Current campaign state fails domain validation");
    }

    const campaignRevisions = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_revision", (q) => q.eq("campaignId", campaignId))
      .collect();

    const campaignEvents = await ctx.db
      .query("campaignEvents")
      .withIndex("by_campaign_revision_index", (q) =>
        q.eq("campaignId", campaignId),
      )
      .collect();

    const campaignSnapshots = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) => q.eq("campaignId", campaignId))
      .collect();

    const allCampaignDocs = await ctx.db.query("campaigns").collect();

    const revisionRecords: RevisionRecord[] = campaignRevisions.map((r) => ({
      campaignRevision: r.campaignRevision,
      commandType: r.commandType,
      commandFingerprint: r.commandFingerprint,
    }));

    const eventRecords: EventRecord[] = campaignEvents.map((e) => ({
      campaignRevision: e.campaignRevision,
      eventIndex: e.eventIndex,
      event: e.event,
    }));

    const snapshotRecords: SnapshotRecord[] = campaignSnapshots.map((s) => ({
      campaignRevision: s.campaignRevision,
      state: s.state,
    }));

    const campaignDocuments: CampaignDocument[] = allCampaignDocs.map((d) => {
      if ("campaignKey" in d) {
        return {
          campaignKey: d.campaignKey,
          campaignId: d.campaignId,
          campaignRevision: d.campaignRevision,
          state: d.state,
        };
      }
      return {
        campaignKey: "__legacy__",
        campaignId: "",
        campaignRevision: d.revision,
        state: {
          schemaVersion: 1 as const,
          ruleset: { id: "seven_part_pact_draft4", version: 1 },
          calendar: { monthOrdinal: d.monthOrdinal },
        },
      };
    });

    const invariantResult = verifyMigrationInvariants({
      campaignRevision,
      revisions: revisionRecords,
      events: eventRecords,
      snapshots: snapshotRecords,
      campaignDocuments,
    });
    errors.push(...invariantResult.errors);

    for (const snap of campaignSnapshots) {
      try {
        validateCampaignState(snap.state);
      } catch {
        errors.push(
          `Snapshot at revision ${snap.campaignRevision} fails domain validation`,
        );
      }
    }

    const finalSnapshot = campaignSnapshots.find(
      (s) => s.campaignRevision === campaignRevision,
    );
    if (finalSnapshot) {
      const cs = canonical.state;
      const matches =
        finalSnapshot.state.schemaVersion === cs.schemaVersion &&
        finalSnapshot.state.ruleset.id === cs.ruleset.id &&
        finalSnapshot.state.ruleset.version === cs.ruleset.version &&
        finalSnapshot.state.calendar.monthOrdinal === cs.calendar.monthOrdinal;
      if (!matches) {
        errors.push("Final snapshot state does not match authoritative campaign state");
      }
    } else {
      errors.push("Final snapshot not found");
    }

    if (errors.length > 0) {
      return { status: "invalid" as const, errors };
    }

    return {
      status: "valid" as const,
      campaignId,
      campaignRevision,
      revisionRecordCount: campaignRevisions.length,
      eventRecordCount: campaignEvents.length,
      snapshotCount: campaignSnapshots.length,
      campaignDocumentCount: allCampaignDocs.length,
    };
  },
});
