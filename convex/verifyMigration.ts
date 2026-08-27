import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  validateCampaignState,
  verifyMigrationInvariants,
  verifyHistoryControl,
  verifyCheckpointCollection,
  verifyCheckpointRestoreRevision,
  isValidCheckpointId,
  statesDeepEqual,
  CURRENT_HISTORY_CONTROL_VERSION,
  CURRENT_CHECKPOINT_VERSION,
  type RevisionRecord,
  type EventRecord,
  type SnapshotRecord,
  type CampaignDocument,
  type CampaignHistoryControlV1,
  type CampaignCheckpointV1,
  type RevisionCommandInfo,
  type ReplayEventInfo,
  type SerializableCampaignState,
} from "../shared/domain";
import {
  verifyBackupImportRevisionStructure,
  verifyBackupImportRevisionDigest,
} from "../shared/domain/backup-verification";

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
    checkpointCount: v.number(),
    checkpointStatus: v.union(v.literal("valid"), v.literal("invalid")),
    checkpointErrors: v.array(v.string()),
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
      state: s.state as SerializableCampaignState,
    }));

    const campaignDocuments: CampaignDocument[] = allCampaignDocs.map((d) => {
      if ("campaignKey" in d) {
        return {
          campaignKey: d.campaignKey,
          campaignId: d.campaignId,
          campaignRevision: d.campaignRevision,
          state: d.state as unknown as SerializableCampaignState,
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
      if (!statesDeepEqual(finalSnapshot.state, canonical.state)) {
        errors.push("Final snapshot state does not match authoritative campaign state");
      }
    } else {
      errors.push("Final snapshot not found");
    }

    // --- Build lookup maps for revision verification ---
    const snapshotMap = new Map<number, SerializableCampaignState>();
    for (const s of campaignSnapshots) {
      snapshotMap.set(s.campaignRevision, s.state as unknown as SerializableCampaignState);
    }

    const revisionMap = new Map<number, { commandType: string; commandFingerprint: string }>();
    for (const r of campaignRevisions) {
      revisionMap.set(r.campaignRevision, { commandType: r.commandType, commandFingerprint: r.commandFingerprint });
    }

    const eventsByRev = new Map<number, typeof campaignEvents>();
    for (const e of campaignEvents) {
      const list = eventsByRev.get(e.campaignRevision) ?? [];
      list.push(e);
      eventsByRev.set(e.campaignRevision, list);
    }

    // --- Verify checkpoint_restore revisions in immutable history ---
    for (const rev of campaignRevisions) {
      if (rev.commandType !== "checkpoint_restore") continue;

      const r = rev.campaignRevision;
      const evts = eventsByRev.get(r) ?? [];

      if (evts.length !== 1) {
        errors.push(`Revision ${r} (checkpoint_restore): expected exactly 1 event, found ${evts.length}`);
        continue;
      }

      const evt = evts[0];
      if (evt.eventIndex !== 0) {
        errors.push(`Revision ${r} (checkpoint_restore): expected eventIndex 0, got ${evt.eventIndex}`);
        continue;
      }

      const evtData = evt.event.data as { checkpointId?: string; sourceRevision?: number; labelAtRestore?: string };
      const sourceRev = typeof evtData.sourceRevision === "number" ? evtData.sourceRevision : -1;
      const sourceRevCommandType = sourceRev > 0
        ? (revisionMap.get(sourceRev)?.commandType ?? null) as any
        : null;

      const restoreErrors = verifyCheckpointRestoreRevision({
        campaignRevision: r,
        commandFingerprint: rev.commandFingerprint,
        eventType: evt.event.type,
        eventVersion: evt.event.version,
        eventCheckpointId: (evtData.checkpointId ?? "") as string,
        eventSourceRevision: sourceRev,
        eventLabelAtRestore: (evtData.labelAtRestore ?? "") as string,
        sourceSnapshotExists: snapshotMap.has(sourceRev),
        sourceSnapshotState: snapshotMap.get(sourceRev) ?? null,
        resultSnapshotExists: snapshotMap.has(r),
        resultSnapshotState: snapshotMap.get(r) ?? null,
        sourceRevisionCommandType: sourceRevCommandType,
      });

      errors.push(...restoreErrors);
    }

    // --- Verify backup_import revisions in immutable history ---
    for (const rev of campaignRevisions) {
      if (rev.commandType !== "backup_import") continue;

      const r = rev.campaignRevision;
      const evts = eventsByRev.get(r) ?? [];

      if (evts.length !== 1) {
        errors.push(`Revision ${r} (backup_import): expected exactly 1 event, found ${evts.length}`);
        continue;
      }

      const evt = evts[0];
      if (evt.eventIndex !== 0) {
        errors.push(`Revision ${r} (backup_import): expected eventIndex 0, got ${evt.eventIndex}`);
        continue;
      }

      // Defensively extract event data fields
      const rawData = evt.event.data as Record<string, unknown> | null | undefined;
      const eventData = {
        backupFormatVersion: typeof rawData?.backupFormatVersion === "number" ? rawData.backupFormatVersion : -1,
        sourceCampaignId: typeof rawData?.sourceCampaignId === "string" ? rawData.sourceCampaignId : "",
        sourceCampaignRevision: typeof rawData?.sourceCampaignRevision === "number" ? rawData.sourceCampaignRevision : -1,
        sourceLogicalRevision: typeof rawData?.sourceLogicalRevision === "number" ? rawData.sourceLogicalRevision : -1,
        exportedAtMs: typeof rawData?.exportedAtMs === "number" ? rawData.exportedAtMs : -1,
        payloadDigest: typeof rawData?.payloadDigest === "string" ? rawData.payloadDigest : "",
      };

      // Structural verification
      const structErrors = verifyBackupImportRevisionStructure({
        campaignRevision: r,
        commandFingerprint: rev.commandFingerprint,
        eventType: evt.event.type,
        eventVersion: evt.event.version,
        eventData,
        resultSnapshotExists: snapshotMap.has(r),
        resultSnapshotState: snapshotMap.get(r) ?? null,
      });
      errors.push(...structErrors);

      // Digest reconstruction verification (only if structural checks passed enough to proceed)
      if (structErrors.length === 0) {
        const digestErrors = await verifyBackupImportRevisionDigest({
          campaignRevision: r,
          commandFingerprint: rev.commandFingerprint,
          eventType: evt.event.type,
          eventVersion: evt.event.version,
          eventData,
          resultSnapshotExists: snapshotMap.has(r),
          resultSnapshotState: snapshotMap.get(r) ?? null,
        });
        errors.push(...digestErrors);
      }
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
          ? undoTopSnapshot.state as unknown as SerializableCampaignState
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

    // --- Checkpoint verification ---
    const allCheckpoints = await ctx.db
      .query("campaignCheckpoints")
      .collect();

    const checkpointErrors: string[] = [];

    const orphanCheckpoints = allCheckpoints.filter((c) => c.campaignId !== campaignId);
    if (orphanCheckpoints.length > 0) {
      checkpointErrors.push(`Found ${orphanCheckpoints.length} checkpoint(s) with unexpected campaignId (not "${campaignId}")`);
    }

    const campaignCheckpoints: CampaignCheckpointV1[] = allCheckpoints.map((c) => ({
      checkpointVersion: c.checkpointVersion as 1,
      checkpointId: c.checkpointId,
      campaignId: c.campaignId,
      label: c.label,
      sourceRevision: c.sourceRevision,
      createdAtMs: c.createdAtMs,
    }));

    const snapshotRevisionSet = new Set(campaignSnapshots.map((s) => s.campaignRevision));
    const revCommandTypeMap = new Map(campaignRevisions.map((r) => [r.campaignRevision, r.commandType as any]));

    const collectionErrors = verifyCheckpointCollection({
      checkpoints: campaignCheckpoints,
      campaignId,
      campaignRevision,
      snapshotRevisions: snapshotRevisionSet,
      revisionCommandTypes: revCommandTypeMap,
    });
    checkpointErrors.push(...collectionErrors);

    const checkpointCount = allCheckpoints.length;
    const checkpointStatus = checkpointErrors.length === 0 ? "valid" as const : "invalid" as const;

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
      checkpointCount,
      checkpointStatus,
      checkpointErrors,
    };
  },
});
