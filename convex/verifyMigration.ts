import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  validateCampaignState,
  verifyMigrationInvariants,
  verifyHistoryControl,
  CURRENT_HISTORY_CONTROL_VERSION,
  type RevisionRecord,
  type EventRecord,
  type SnapshotRecord,
  type CampaignDocument,
  type CampaignHistoryControlV1,
  type RevisionCommandInfo,
  type ReplayEventInfo,
  type SerializableCampaignState,
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
    historyControlStatus: v.union(
      v.literal("not_initialized"),
      v.literal("valid"),
      v.literal("invalid"),
    ),
    historyControlErrors: v.array(v.string()),
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
      event: {
        type: e.event.type,
        version: e.event.version,
        data: e.event.data as object,
      },
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

    // History control verification (separate from core migration validity)
    const controlDoc = await ctx.db
      .query("campaignHistoryControl")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();

    let historyControlStatus: "not_initialized" | "valid" | "invalid" = "not_initialized";
    let historyControlErrors: string[] = [];

    if (controlDoc !== null) {
      const control: CampaignHistoryControlV1 = {
        historyControlVersion: controlDoc.historyControlVersion as 1,
        campaignId: controlDoc.campaignId,
        undoStack: controlDoc.undoStack,
        redoStack: controlDoc.redoStack,
      };

      if (controlDoc.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
        historyControlStatus = "invalid";
        historyControlErrors = [`Unrecognized historyControlVersion: ${controlDoc.historyControlVersion}`];
      } else {
        const revCommandInfos: RevisionCommandInfo[] = campaignRevisions.map((r) => ({
          campaignRevision: r.campaignRevision,
          commandType: r.commandType,
        }));

        const replayEvents: ReplayEventInfo[] = campaignEvents.map((e) => ({
          campaignRevision: e.campaignRevision,
          event: {
            type: e.event.type,
            version: e.event.version,
            data: e.event.data as { fromRevision?: number; targetRevision?: number },
          },
        }));

        const snapshotRevisions = campaignSnapshots.map((s) => s.campaignRevision);

        const undoTop = control.undoStack[control.undoStack.length - 1];
        const undoTopSnapshot = campaignSnapshots.find((s) => s.campaignRevision === undoTop);
        const snapshotAtUndoTop: SerializableCampaignState | null = undoTopSnapshot
          ? undoTopSnapshot.state
          : null;

        const hcErrors = verifyHistoryControl({
          control,
          campaignId,
          campaignRevision,
          campaignState: canonical.state,
          revisions: revCommandInfos,
          events: replayEvents,
          snapshotRevisions,
          snapshotAtUndoTop,
        });

        if (hcErrors.length > 0) {
          historyControlStatus = "invalid";
          historyControlErrors = hcErrors;
        } else {
          historyControlStatus = "valid";
        }
      }
    }

    return {
      status: "valid" as const,
      campaignId,
      campaignRevision,
      revisionRecordCount: campaignRevisions.length,
      eventRecordCount: campaignEvents.length,
      snapshotCount: campaignSnapshots.length,
      campaignDocumentCount: allCampaignDocs.length,
      historyControlStatus,
      historyControlErrors,
    };
  },
});
