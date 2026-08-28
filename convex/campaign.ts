import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  displayNameFromOrdinal,
  advanceOrdinal,
  INITIAL_MONTH_ORDINAL,
  applyMoveMonth,
  validateCampaignState,
  parseLiveCommandId,
  moveMonthFingerprint,
  undoFingerprint,
  redoFingerprint,
  checkpointRestoreFingerprint,
  normalizeCheckpointLabel,
  validateCheckpointLabel,
  initialCampaignState,
  isValidCampaignId,
  isValidCheckpointId,
  parseCheckpointId,
  isLogicalStateCommandType,
  DomainError,
  CURRENT_HISTORY_CONTROL_VERSION,
  CURRENT_CHECKPOINT_VERSION,
  validateHistoryControlStructure,
  statesDeepEqual,
  mapEventToActivityEntry,
} from "../shared/domain";
import type { MonthDirection, CampaignId, CampaignHistoryControlV1, CurrentCampaignState, CampaignEvent, CheckpointRestoredEventV1 } from "../shared/domain";
import { deriveUndoTransition, deriveRedoTransition } from "../shared/domain/undo-redo";
import {
  monthDirectionValidator,
  monthDisplayNameValidator,
  activityEntryValidator,
} from "./validators";
import { canonicalCommit } from "./canonicalCommit";
import { loadCanonicalRecord, serializeState, snapshotRecord } from "./persistence";

type CanonicalCampaignDoc = {
  _id: any;
  _creationTime: number;
  campaignKey: "default";
  campaignId: string;
  campaignRevision: number;
  state: CurrentCampaignState;
};

function isCanonical(doc: unknown): doc is CanonicalCampaignDoc {
  return doc !== null && typeof doc === "object" && "campaignKey" in (doc as any) && (doc as any).campaignKey === "default";
}

function generateCampaignId(): CampaignId {
  const raw = `cmp_${crypto.randomUUID()}`;
  if (!isValidCampaignId(raw)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Generated CampaignId failed validation: "${raw}"`);
  }
  return raw;
}

const campaignViewValidator = v.union(
  v.object({
    _id: v.id("campaigns"),
    _creationTime: v.number(),
    monthOrdinal: v.number(),
    revision: v.number(),
  }),
  v.null(),
);

export const getCampaign = query({
  args: {},
  returns: campaignViewValidator,
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      return {
        _id: maybeCanonical._id,
        _creationTime: maybeCanonical._creationTime,
        monthOrdinal: maybeCanonical.state.calendar.monthOrdinal,
        revision: maybeCanonical.campaignRevision,
      };
    }

    const legacy = await ctx.db.query("campaigns").first();
    if (legacy === null) return null;
    if (!("monthOrdinal" in legacy)) return null;
    return {
      _id: legacy._id,
      _creationTime: legacy._creationTime,
      monthOrdinal: legacy.monthOrdinal,
      revision: legacy.revision,
    };
  },
});

export const ensureCampaign = mutation({
  args: {},
  returns: campaignViewValidator,
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      const snapshot = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", maybeCanonical.campaignId).eq("campaignRevision", 0),
        )
        .unique();

      if (snapshot === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          "Canonical campaign exists at revision 0 but its revision-0 snapshot is missing",
        );
      }

      if (
        snapshot.state.schemaVersion !== maybeCanonical.state.schemaVersion ||
        snapshot.state.ruleset.id !== maybeCanonical.state.ruleset.id ||
        snapshot.state.ruleset.version !== maybeCanonical.state.ruleset.version ||
        snapshot.state.calendar.monthOrdinal !== maybeCanonical.state.calendar.monthOrdinal
      ) {
        if (maybeCanonical.campaignRevision === 0) {
          throw new DomainError(
            "CAMPAIGN_STATE_CORRUPT",
            "Canonical campaign at revision 0 has contradictory revision-0 snapshot",
          );
        }
      }

      return {
        _id: maybeCanonical._id,
        _creationTime: maybeCanonical._creationTime,
        monthOrdinal: maybeCanonical.state.calendar.monthOrdinal,
        revision: maybeCanonical.campaignRevision,
      };
    }

    const allCampaigns = await ctx.db.query("campaigns").collect();

    if (allCampaigns.length > 0) {
      const hasLegacy = allCampaigns.some((c) => "monthOrdinal" in c && !("campaignKey" in c));
      if (hasLegacy) {
        const legacy = allCampaigns.find((c) => "monthOrdinal" in c && !("campaignKey" in c))!;
        return {
          _id: legacy._id,
          _creationTime: legacy._creationTime,
          monthOrdinal: (legacy as any).monthOrdinal,
          revision: (legacy as any).revision,
        };
      }
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Unexpected campaign documents found (${allCampaigns.length}) but none are canonical or legacy`,
      );
    }

    const legacyEvents = await ctx.db.query("events").first();
    if (legacyEvents !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Legacy events exist but no campaign document found",
      );
    }

    const orphanRevisions = await ctx.db.query("campaignRevisions").first();
    if (orphanRevisions !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignRevisions exist but no campaign document found",
      );
    }

    const orphanEvents = await ctx.db.query("campaignEvents").first();
    if (orphanEvents !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignEvents exist but no campaign document found",
      );
    }

    const orphanSnapshots = await ctx.db.query("campaignSnapshots").first();
    if (orphanSnapshots !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignSnapshots exist but no campaign document found",
      );
    }

    const orphanHistoryControl = await ctx.db.query("campaignHistoryControl").first();
    if (orphanHistoryControl !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignHistoryControl exist but no campaign document found",
      );
    }

    const orphanCheckpoints = await ctx.db.query("campaignCheckpoints").first();
    if (orphanCheckpoints !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignCheckpoints exist but no campaign document found",
      );
    }

    const state = initialCampaignState();
    validateCampaignState(state);

    const campaignId = generateCampaignId();

    const docId = await ctx.db.insert("campaigns", {
      campaignKey: "default" as const,
      campaignId: campaignId as string,
      campaignRevision: 0,
      state: serializeState(state),
    } as any);

    await ctx.db.insert("campaignSnapshots", snapshotRecord(campaignId as string, 0, state));

    await ctx.db.insert("campaignHistoryControl", {
      campaignId: campaignId as string,
      historyControlVersion: 1,
      undoStack: [0],
      redoStack: [],
    });

    const doc = await ctx.db.get(docId);
    if (doc === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", "Failed to read back newly created campaign");
    }

    return {
      _id: doc._id,
      _creationTime: doc._creationTime,
      monthOrdinal: state.calendar.monthOrdinal as number,
      revision: 0,
    };
  },
});

export const getRecentEvents = query({
  args: { count: v.number() },
  returns: v.array(activityEntryValidator),
  handler: async (ctx, args) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      const events = await ctx.db
        .query("campaignEvents")
        .withIndex("by_campaign_revision_index", (q) =>
          q.eq("campaignId", maybeCanonical.campaignId),
        )
        .order("desc")
        .take(args.count);

      return events.map((e) =>
        mapEventToActivityEntry(e._id, e.campaignRevision, e.event as CampaignEvent),
      );
    }

    const legacyEvents = await ctx.db.query("events").order("desc").take(args.count);
    return legacyEvents.map((e) => ({
      id: e._id,
      revision: e.revision,
      type: "month_changed" as const,
      previousMonth: e.previousMonth,
      newMonth: e.newMonth,
    }));
  },
});

export const moveMonth = mutation({
  args: {
    direction: monthDirectionValidator,
    commandId: v.string(),
  },
  returns: v.object({
    revision: v.number(),
    monthOrdinal: v.number(),
    month: monthDisplayNameValidator,
  }),
  handler: async (ctx, args) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      const commandId = parseLiveCommandId(args.commandId);
      const currentState = validateCampaignState(maybeCanonical.state);
      const direction = args.direction as MonthDirection;
      const { nextState, events } = applyMoveMonth(currentState, direction);
      const fingerprint = moveMonthFingerprint(direction);

      const receipt = await canonicalCommit(ctx, {
        campaignDocId: maybeCanonical._id,
        campaignId: maybeCanonical.campaignId,
        currentRevision: maybeCanonical.campaignRevision,
        currentState,
        commandId,
        commandType: "move_month",
        commandFingerprint: fingerprint,
        nextState,
        events,
        historyControlUpdate: { kind: "logical_state_append" },
      });

      return {
        revision: receipt.newRevision,
        monthOrdinal: receipt.state.calendar.monthOrdinal as number,
        month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      };
    }

    const legacy = await ctx.db.query("campaigns").first();

    if (legacy === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "No campaign exists. Call ensureCampaign first.",
      );
    }

    if (!("monthOrdinal" in legacy)) {
      throw new Error("Campaign has been migrated to new format");
    }

    const previousMonthOrdinal = legacy.monthOrdinal;
    const previousMonth = displayNameFromOrdinal(previousMonthOrdinal);

    const newMonthOrdinal = advanceOrdinal(previousMonthOrdinal, args.direction);
    const newMonth = displayNameFromOrdinal(newMonthOrdinal);
    const newRevision = legacy.revision + 1;

    await ctx.db.patch(legacy._id, {
      monthOrdinal: newMonthOrdinal,
      revision: newRevision,
    });

    await ctx.db.insert("events", {
      type: "month_changed",
      revision: newRevision,
      direction: args.direction,
      previousMonthOrdinal,
      newMonthOrdinal,
      previousMonth,
      newMonth,
    });

    return {
      revision: newRevision,
      monthOrdinal: newMonthOrdinal as number,
      month: newMonth,
    };
  },
});

// ============================================================
// Undo / Redo
// ============================================================

async function loadCanonicalCampaign(ctx: any) {
  const maybeCanonical = await ctx.db
    .query("campaigns")
    .withIndex("by_campaignKey", (q: any) => q.eq("campaignKey", "default"))
    .unique();

  if (maybeCanonical === null || !isCanonical(maybeCanonical)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", "No canonical campaign found");
  }
  return maybeCanonical;
}

async function loadHistoryControl(ctx: any, campaignId: string): Promise<{ doc: any; control: CampaignHistoryControlV1 }> {
  const controlDocs = await ctx.db
    .query("campaignHistoryControl")
    .withIndex("by_campaignId", (q: any) => q.eq("campaignId", campaignId))
    .collect();

  if (controlDocs.length === 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", "History control document missing");
  }
  if (controlDocs.length > 1) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Found ${controlDocs.length} history control documents — expected exactly 1`);
  }

  const doc = controlDocs[0];
  if (doc.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unrecognized historyControlVersion: ${doc.historyControlVersion}`);
  }

  const control: CampaignHistoryControlV1 = {
    historyControlVersion: doc.historyControlVersion as 1,
    campaignId: doc.campaignId,
    undoStack: doc.undoStack,
    redoStack: doc.redoStack,
  };

  return { doc, control };
}

async function loadSnapshotState(ctx: any, campaignId: string, revision: number): Promise<CurrentCampaignState | null> {
  const snap = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q: any) =>
      q.eq("campaignId", campaignId).eq("campaignRevision", revision),
    )
    .unique();

  if (snap === null) return null;
  return snap.state as CurrentCampaignState;
}

async function loadRevisionCommandType(ctx: any, campaignId: string, revision: number): Promise<string | null> {
  if (revision === 0) return null;
  const rec = await ctx.db
    .query("campaignRevisions")
    .withIndex("by_campaign_revision", (q: any) =>
      q.eq("campaignId", campaignId).eq("campaignRevision", revision),
    )
    .unique();
  return rec?.commandType ?? null;
}

const undoRedoReturnValidator = v.object({
  revision: v.number(),
  monthOrdinal: v.number(),
  month: monthDisplayNameValidator,
  alreadyApplied: v.boolean(),
});

export const undo = mutation({
  args: {
    commandId: v.string(),
    expectedRevision: v.number(),
  },
  returns: undoRedoReturnValidator,
  handler: async (ctx, args) => {
    const commandId = parseLiveCommandId(args.commandId);
    const fingerprint = undoFingerprint(args.expectedRevision);

    // Load campaign first solely to resolve campaignId for idempotency lookup
    const campaign = await loadCanonicalCampaign(ctx);
    const campaignId = campaign.campaignId;

    // STEP 1: Idempotency BEFORE CAS
    const existingCommand = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_commandId", (q) =>
        q.eq("campaignId", campaignId).eq("commandId", commandId as string),
      )
      .unique();

    if (existingCommand !== null) {
      if (existingCommand.commandType !== "undo" || existingCommand.commandFingerprint !== fingerprint) {
        throw new DomainError(
          "COMMAND_ID_REUSED",
          `CommandId "${commandId}" already committed with type="${existingCommand.commandType}" fingerprint="${existingCommand.commandFingerprint}", cannot reuse for type="undo" fingerprint="${fingerprint}"`,
        );
      }
      const snap = await loadSnapshotState(ctx, campaignId, existingCommand.campaignRevision);
      if (snap === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${existingCommand.campaignRevision}`);
      }
      validateCampaignState(snap);
      return {
        revision: existingCommand.campaignRevision,
        monthOrdinal: snap.calendar.monthOrdinal as number,
        month: displayNameFromOrdinal(snap.calendar.monthOrdinal),
        alreadyApplied: true,
      };
    }

    // STEP 2: CAS
    if (campaign.campaignRevision !== args.expectedRevision) {
      throw new DomainError(
        "STALE_CAMPAIGN_REVISION",
        `Expected revision ${args.expectedRevision}, current is ${campaign.campaignRevision}`,
      );
    }

    // STEP 3: Load history control
    const { control } = await loadHistoryControl(ctx, campaignId);

    // STEP 4: Load snapshots for transition
    const currentLogicalRevision = control.undoStack[control.undoStack.length - 1];
    const targetRevision = control.undoStack.length > 1
      ? control.undoStack[control.undoStack.length - 2]
      : undefined;

    const currentLogicalSnapshotState = await loadSnapshotState(ctx, campaignId, currentLogicalRevision);
    const targetSnapshotState = targetRevision !== undefined
      ? await loadSnapshotState(ctx, campaignId, targetRevision)
      : null;
    const targetCommandType = targetRevision !== undefined
      ? await loadRevisionCommandType(ctx, campaignId, targetRevision)
      : null;

    // STEP 5: Pure domain transition
    const currentState = validateCampaignState(campaign.state);
    const result = deriveUndoTransition(
      {
        control,
        campaignRevision: campaign.campaignRevision,
        campaignState: currentState,
        targetSnapshotState,
        currentLogicalSnapshotState,
        targetRevisionCommandType: targetCommandType as any,
      },
      campaignId,
    );

    // STEP 6: Canonical commit
    const receipt = await canonicalCommit(ctx, {
      campaignDocId: campaign._id,
      campaignId,
      currentRevision: campaign.campaignRevision,
      currentState,
      commandId: commandId as string,
      commandType: "undo",
      commandFingerprint: fingerprint,
      nextState: result.nextState,
      events: [result.event],
      historyControlUpdate: {
        kind: "history_navigation",
        nextUndoStack: result.nextUndoStack,
        nextRedoStack: result.nextRedoStack,
      },
    });

    return {
      revision: receipt.newRevision,
      monthOrdinal: receipt.state.calendar.monthOrdinal as number,
      month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      alreadyApplied: receipt.alreadyApplied,
    };
  },
});

export const redo = mutation({
  args: {
    commandId: v.string(),
    expectedRevision: v.number(),
  },
  returns: undoRedoReturnValidator,
  handler: async (ctx, args) => {
    const commandId = parseLiveCommandId(args.commandId);
    const fingerprint = redoFingerprint(args.expectedRevision);

    const campaign = await loadCanonicalCampaign(ctx);
    const campaignId = campaign.campaignId;

    // STEP 1: Idempotency BEFORE CAS
    const existingCommand = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_commandId", (q) =>
        q.eq("campaignId", campaignId).eq("commandId", commandId as string),
      )
      .unique();

    if (existingCommand !== null) {
      if (existingCommand.commandType !== "redo" || existingCommand.commandFingerprint !== fingerprint) {
        throw new DomainError(
          "COMMAND_ID_REUSED",
          `CommandId "${commandId}" already committed with type="${existingCommand.commandType}" fingerprint="${existingCommand.commandFingerprint}", cannot reuse for type="redo" fingerprint="${fingerprint}"`,
        );
      }
      const snap = await loadSnapshotState(ctx, campaignId, existingCommand.campaignRevision);
      if (snap === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${existingCommand.campaignRevision}`);
      }
      validateCampaignState(snap);
      return {
        revision: existingCommand.campaignRevision,
        monthOrdinal: snap.calendar.monthOrdinal as number,
        month: displayNameFromOrdinal(snap.calendar.monthOrdinal),
        alreadyApplied: true,
      };
    }

    // STEP 2: CAS
    if (campaign.campaignRevision !== args.expectedRevision) {
      throw new DomainError(
        "STALE_CAMPAIGN_REVISION",
        `Expected revision ${args.expectedRevision}, current is ${campaign.campaignRevision}`,
      );
    }

    // STEP 3: Load history control
    const { control } = await loadHistoryControl(ctx, campaignId);

    // STEP 4: Load snapshots for transition
    const currentLogicalRevision = control.undoStack[control.undoStack.length - 1];
    const targetRevision = control.redoStack.length > 0
      ? control.redoStack[control.redoStack.length - 1]
      : undefined;

    const currentLogicalSnapshotState = await loadSnapshotState(ctx, campaignId, currentLogicalRevision);
    const targetSnapshotState = targetRevision !== undefined
      ? await loadSnapshotState(ctx, campaignId, targetRevision)
      : null;
    const targetCommandType = targetRevision !== undefined
      ? await loadRevisionCommandType(ctx, campaignId, targetRevision)
      : null;

    // STEP 5: Pure domain transition
    const currentState = validateCampaignState(campaign.state);
    const result = deriveRedoTransition(
      {
        control,
        campaignRevision: campaign.campaignRevision,
        campaignState: currentState,
        targetSnapshotState,
        currentLogicalSnapshotState,
        targetRevisionCommandType: targetCommandType as any,
      },
      campaignId,
    );

    // STEP 6: Canonical commit
    const receipt = await canonicalCommit(ctx, {
      campaignDocId: campaign._id,
      campaignId,
      currentRevision: campaign.campaignRevision,
      currentState,
      commandId: commandId as string,
      commandType: "redo",
      commandFingerprint: fingerprint,
      nextState: result.nextState,
      events: [result.event],
      historyControlUpdate: {
        kind: "history_navigation",
        nextUndoStack: result.nextUndoStack,
        nextRedoStack: result.nextRedoStack,
      },
    });

    return {
      revision: receipt.newRevision,
      monthOrdinal: receipt.state.calendar.monthOrdinal as number,
      month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      alreadyApplied: receipt.alreadyApplied,
    };
  },
});

// ============================================================
// Read Model: Undo/Redo State
// ============================================================

export const getUndoRedoState = query({
  args: {},
  returns: v.union(
    v.object({
      canUndo: v.boolean(),
      canRedo: v.boolean(),
      campaignRevision: v.number(),
      logicalRevision: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical === null || !isCanonical(maybeCanonical)) {
      return null;
    }

    const campaignId = maybeCanonical.campaignId;

    const controlDocs = await ctx.db
      .query("campaignHistoryControl")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .collect();

    if (controlDocs.length !== 1) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        controlDocs.length === 0
          ? "History control document missing"
          : `Found ${controlDocs.length} history control documents — expected exactly 1`,
      );
    }

    const doc = controlDocs[0];
    if (doc.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Unrecognized historyControlVersion: ${doc.historyControlVersion}`,
      );
    }

    const structErrors = validateHistoryControlStructure({
      control: {
        historyControlVersion: doc.historyControlVersion as 1,
        campaignId: doc.campaignId,
        undoStack: doc.undoStack,
        redoStack: doc.redoStack,
      },
      campaignId,
      campaignRevision: maybeCanonical.campaignRevision,
    });

    if (structErrors.length > 0) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control structural validation failed: ${structErrors.join("; ")}`,
      );
    }

    const logicalRevision = doc.undoStack[doc.undoStack.length - 1];

    const logicalSnapshot = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", campaignId).eq("campaignRevision", logicalRevision),
      )
      .unique();

    if (logicalSnapshot === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control undoStack top (revision ${logicalRevision}) has no snapshot`,
      );
    }

    validateCampaignState(logicalSnapshot.state);

    if (!statesDeepEqual(logicalSnapshot.state, maybeCanonical.state)) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Snapshot at undoStack top (revision ${logicalRevision}) does not match authoritative campaign state`,
      );
    }

    if (logicalRevision > 0) {
      const logicalRevRec = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", campaignId).eq("campaignRevision", logicalRevision),
        )
        .unique();

      if (logicalRevRec === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `History control undoStack top revision ${logicalRevision} has no revision record`,
        );
      }

      if (!isLogicalStateCommandType(logicalRevRec.commandType)) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `History control undoStack top revision ${logicalRevision} has non-logical-state commandType "${logicalRevRec.commandType}"`,
        );
      }
    }

    return {
      canUndo: doc.undoStack.length > 1,
      canRedo: doc.redoStack.length > 0,
      campaignRevision: maybeCanonical.campaignRevision,
      logicalRevision,
    };
  },
});

// ============================================================
// Checkpoints
// ============================================================

export const createCheckpoint = mutation({
  args: {
    checkpointId: v.string(),
    label: v.string(),
  },
  returns: v.object({
    checkpointId: v.string(),
    label: v.string(),
    sourceRevision: v.number(),
    createdAtMs: v.number(),
    alreadyApplied: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const checkpointId = parseCheckpointId(args.checkpointId);

    const normalizedLabel = normalizeCheckpointLabel(args.label);
    const labelError = validateCheckpointLabel(normalizedLabel);
    if (labelError !== null) {
      throw new DomainError("INVALID_CHECKPOINT", labelError);
    }

    const campaign = await loadCanonicalCampaign(ctx);
    const campaignId = campaign.campaignId;

    // Idempotency: check for existing checkpoint with same ID
    const existingDocs = await ctx.db
      .query("campaignCheckpoints")
      .withIndex("by_checkpointId", (q: any) => q.eq("checkpointId", checkpointId as string))
      .collect();

    if (existingDocs.length > 1) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Found ${existingDocs.length} checkpoint documents for id "${checkpointId}" — expected at most 1`);
    }

    if (existingDocs.length === 1) {
      const existing = existingDocs[0];
      if (existing.campaignId !== campaignId || existing.label !== normalizedLabel) {
        throw new DomainError("CHECKPOINT_ID_REUSED", `CheckpointId "${checkpointId}" already exists with different campaign or label`);
      }

      // Validate the persisted checkpoint before returning idempotent success
      if (existing.checkpointVersion !== CURRENT_CHECKPOINT_VERSION) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" has unrecognized checkpointVersion: ${existing.checkpointVersion}`);
      }
      if (!isValidCheckpointId(existing.checkpointId)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint has invalid checkpointId format`);
      }
      if (existing.label !== normalizeCheckpointLabel(existing.label)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" has non-normalized label`);
      }
      const existingLabelError = validateCheckpointLabel(existing.label);
      if (existingLabelError !== null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" has invalid label: ${existingLabelError}`);
      }
      if (!Number.isSafeInteger(existing.createdAtMs) || existing.createdAtMs < 0) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" has invalid createdAtMs: ${existing.createdAtMs}`);
      }
      if (!Number.isSafeInteger(existing.sourceRevision) || existing.sourceRevision < 0) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" has invalid sourceRevision: ${existing.sourceRevision}`);
      }
      if (existing.sourceRevision > campaign.campaignRevision) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" sourceRevision ${existing.sourceRevision} exceeds campaignRevision ${campaign.campaignRevision}`);
      }
      const existingSnapshot = await loadSnapshotState(ctx, campaignId, existing.sourceRevision);
      if (existingSnapshot === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" sourceRevision ${existing.sourceRevision} has no snapshot`);
      }
      validateCampaignState(existingSnapshot);
      if (existing.sourceRevision > 0) {
        const existingRevType = await loadRevisionCommandType(ctx, campaignId, existing.sourceRevision);
        if (existingRevType === null) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" sourceRevision ${existing.sourceRevision} has no revision record`);
        }
        if (!isLogicalStateCommandType(existingRevType as any)) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Existing checkpoint "${checkpointId}" sourceRevision ${existing.sourceRevision} has non-logical-state commandType "${existingRevType}"`);
        }
      }

      return {
        checkpointId: existing.checkpointId,
        label: existing.label,
        sourceRevision: existing.sourceRevision,
        createdAtMs: existing.createdAtMs,
        alreadyApplied: true,
      };
    }

    // Load history control
    const { control } = await loadHistoryControl(ctx, campaignId);

    // Validate structural integrity
    const structErrors = validateHistoryControlStructure({
      control,
      campaignId,
      campaignRevision: campaign.campaignRevision,
    });
    if (structErrors.length > 0) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `History control structural validation failed: ${structErrors.join("; ")}`);
    }

    // sourceRevision = current logical state
    const sourceRevision = control.undoStack[control.undoStack.length - 1];

    // Load and validate source snapshot
    const sourceSnapshot = await loadSnapshotState(ctx, campaignId, sourceRevision);
    if (sourceSnapshot === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot for logical revision ${sourceRevision}`);
    }

    validateCampaignState(sourceSnapshot);

    // Verify snapshot matches authoritative state
    if (!statesDeepEqual(sourceSnapshot, campaign.state)) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot at undoStack top (revision ${sourceRevision}) does not match authoritative campaign state`);
    }

    // For non-zero sourceRevision, verify revision record is logical-state
    if (sourceRevision > 0) {
      const revCommandType = await loadRevisionCommandType(ctx, campaignId, sourceRevision);
      if (revCommandType === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Source revision ${sourceRevision} has no revision record`);
      }
      if (!isLogicalStateCommandType(revCommandType as any)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Source revision ${sourceRevision} has non-logical-state commandType "${revCommandType}"`);
      }
    }

    const createdAtMs = Date.now();

    await ctx.db.insert("campaignCheckpoints", {
      checkpointVersion: CURRENT_CHECKPOINT_VERSION,
      checkpointId: checkpointId as string,
      campaignId,
      label: normalizedLabel,
      sourceRevision,
      createdAtMs,
    });

    return {
      checkpointId: checkpointId as string,
      label: normalizedLabel,
      sourceRevision,
      createdAtMs,
      alreadyApplied: false,
    };
  },
});

export const listCheckpoints = query({
  args: {},
  returns: v.array(v.object({
    checkpointId: v.string(),
    label: v.string(),
    sourceRevision: v.number(),
    createdAtMs: v.number(),
  })),
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical === null || !isCanonical(maybeCanonical)) {
      return [];
    }

    const campaignId = maybeCanonical.campaignId;
    const campaignRevision = maybeCanonical.campaignRevision;

    // Load ALL checkpoint documents to detect cross-campaign orphans
    const allCheckpoints = await ctx.db.query("campaignCheckpoints").collect();

    // Detect global duplicate IDs (across all campaigns)
    const globalIdCounts = new Map<string, number>();
    for (const c of allCheckpoints) {
      globalIdCounts.set(c.checkpointId, (globalIdCounts.get(c.checkpointId) ?? 0) + 1);
    }
    for (const [id, count] of globalIdCounts) {
      if (count > 1) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Duplicate checkpointId "${id}" appears ${count} times globally`);
      }
    }

    // Detect orphans (wrong-campaign documents)
    for (const c of allCheckpoints) {
      if (c.campaignId !== campaignId) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" has campaignId "${c.campaignId}" which does not match canonical campaign "${campaignId}"`);
      }
    }

    // Full validation of each checkpoint record
    for (const c of allCheckpoints) {
      if (c.checkpointVersion !== CURRENT_CHECKPOINT_VERSION) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" has unrecognized checkpointVersion: ${c.checkpointVersion}`);
      }
      if (!isValidCheckpointId(c.checkpointId)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has invalid checkpointId format: "${c.checkpointId}"`);
      }
      if (c.label !== normalizeCheckpointLabel(c.label)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" has non-normalized label`);
      }
      const labelErr = validateCheckpointLabel(c.label);
      if (labelErr !== null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" has invalid label: ${labelErr}`);
      }
      if (!Number.isSafeInteger(c.createdAtMs) || c.createdAtMs < 0) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" has invalid createdAtMs: ${c.createdAtMs}`);
      }
      if (!Number.isSafeInteger(c.sourceRevision) || c.sourceRevision < 0) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" has invalid sourceRevision: ${c.sourceRevision}`);
      }
      if (c.sourceRevision > campaignRevision) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" sourceRevision ${c.sourceRevision} exceeds campaignRevision ${campaignRevision}`);
      }

      // Verify source snapshot exists and is valid
      const sourceSnapshot = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q: any) =>
          q.eq("campaignId", campaignId).eq("campaignRevision", c.sourceRevision),
        )
        .unique();
      if (sourceSnapshot === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" sourceRevision ${c.sourceRevision} has no snapshot`);
      }
      validateCampaignState(sourceSnapshot.state);

      // Verify source revision command type for non-zero
      if (c.sourceRevision > 0) {
        const revRec = await ctx.db
          .query("campaignRevisions")
          .withIndex("by_campaign_revision", (q: any) =>
            q.eq("campaignId", campaignId).eq("campaignRevision", c.sourceRevision),
          )
          .unique();
        if (revRec === null) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" sourceRevision ${c.sourceRevision} has no revision record`);
        }
        if (!isLogicalStateCommandType(revRec.commandType)) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${c.checkpointId}" sourceRevision ${c.sourceRevision} has non-logical-state commandType "${revRec.commandType}"`);
        }
      }
    }

    // Sort newest-first by createdAtMs, tie-break by checkpointId (stable)
    const sorted = [...allCheckpoints].sort((a, b) => {
      if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
      return a.checkpointId < b.checkpointId ? -1 : a.checkpointId > b.checkpointId ? 1 : 0;
    });

    return sorted.map((c) => ({
      checkpointId: c.checkpointId,
      label: c.label,
      sourceRevision: c.sourceRevision,
      createdAtMs: c.createdAtMs,
    }));
  },
});

export const restoreCheckpoint = mutation({
  args: {
    checkpointId: v.string(),
    commandId: v.string(),
    expectedRevision: v.number(),
  },
  returns: v.object({
    revision: v.number(),
    monthOrdinal: v.number(),
    month: monthDisplayNameValidator,
    alreadyApplied: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const checkpointId = parseCheckpointId(args.checkpointId);
    const commandId = parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `expectedRevision must be a non-negative safe integer, got ${args.expectedRevision}`);
    }

    const fingerprint = checkpointRestoreFingerprint(checkpointId as string, args.expectedRevision);

    const campaign = await loadCanonicalCampaign(ctx);
    const campaignId = campaign.campaignId;

    // STEP 1: Idempotency BEFORE CAS
    const existingCommand = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_commandId", (q) =>
        q.eq("campaignId", campaignId).eq("commandId", commandId as string),
      )
      .unique();

    if (existingCommand !== null) {
      if (existingCommand.commandType !== "checkpoint_restore" || existingCommand.commandFingerprint !== fingerprint) {
        throw new DomainError(
          "COMMAND_ID_REUSED",
          `CommandId "${commandId}" already committed with type="${existingCommand.commandType}" fingerprint="${existingCommand.commandFingerprint}", cannot reuse for type="checkpoint_restore" fingerprint="${fingerprint}"`,
        );
      }
      const snap = await loadSnapshotState(ctx, campaignId, existingCommand.campaignRevision);
      if (snap === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${existingCommand.campaignRevision}`);
      }
      validateCampaignState(snap);
      return {
        revision: existingCommand.campaignRevision,
        monthOrdinal: snap.calendar.monthOrdinal as number,
        month: displayNameFromOrdinal(snap.calendar.monthOrdinal),
        alreadyApplied: true,
      };
    }

    // STEP 2: CAS
    if (campaign.campaignRevision !== args.expectedRevision) {
      throw new DomainError(
        "STALE_CAMPAIGN_REVISION",
        `Expected revision ${args.expectedRevision}, current is ${campaign.campaignRevision}`,
      );
    }

    // STEP 3: Load checkpoint
    const checkpointDocs = await ctx.db
      .query("campaignCheckpoints")
      .withIndex("by_checkpointId", (q: any) => q.eq("checkpointId", checkpointId as string))
      .collect();

    if (checkpointDocs.length === 0) {
      throw new DomainError("CHECKPOINT_NOT_FOUND", `No checkpoint found with id "${checkpointId}"`);
    }
    if (checkpointDocs.length > 1) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Found ${checkpointDocs.length} checkpoint documents for id "${checkpointId}" — expected exactly 1`);
    }

    const checkpoint = checkpointDocs[0];

    if (checkpoint.campaignId !== campaignId) {
      throw new DomainError("CHECKPOINT_NOT_FOUND", `Checkpoint "${checkpointId}" does not belong to this campaign`);
    }

    if (checkpoint.checkpointVersion !== CURRENT_CHECKPOINT_VERSION) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has unrecognized checkpointVersion: ${checkpoint.checkpointVersion}`);
    }

    // Validate persisted metadata before proceeding
    if (checkpoint.label !== normalizeCheckpointLabel(checkpoint.label)) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${checkpointId}" has non-normalized persisted label`);
    }
    const storedLabelErr = validateCheckpointLabel(checkpoint.label);
    if (storedLabelErr !== null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${checkpointId}" has invalid persisted label: ${storedLabelErr}`);
    }
    if (!Number.isSafeInteger(checkpoint.createdAtMs) || checkpoint.createdAtMs < 0) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${checkpointId}" has invalid createdAtMs: ${checkpoint.createdAtMs}`);
    }
    if (!Number.isSafeInteger(checkpoint.sourceRevision) || checkpoint.sourceRevision < 0) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint "${checkpointId}" has invalid sourceRevision: ${checkpoint.sourceRevision}`);
    }

    // STEP 4: Load source snapshot
    const sourceSnapshot = await loadSnapshotState(ctx, campaignId, checkpoint.sourceRevision);
    if (sourceSnapshot === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot exists for checkpoint sourceRevision ${checkpoint.sourceRevision}`);
    }

    validateCampaignState(sourceSnapshot);

    // Verify source revision record if non-zero
    if (checkpoint.sourceRevision > 0) {
      const sourceCommandType = await loadRevisionCommandType(ctx, campaignId, checkpoint.sourceRevision);
      if (sourceCommandType === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} has no revision record`);
      }
      if (!isLogicalStateCommandType(sourceCommandType as any)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} has non-logical-state commandType "${sourceCommandType}"`);
      }
    }

    // STEP 5: Build event and commit
    const currentState = validateCampaignState(campaign.state);

    const event: CheckpointRestoredEventV1 = {
      type: "checkpoint_restored",
      version: 1,
      data: {
        checkpointId: checkpointId as string,
        sourceRevision: checkpoint.sourceRevision,
        labelAtRestore: checkpoint.label,
      },
    };

    const receipt = await canonicalCommit(ctx, {
      campaignDocId: campaign._id,
      campaignId,
      currentRevision: campaign.campaignRevision,
      currentState,
      commandId: commandId as string,
      commandType: "checkpoint_restore",
      commandFingerprint: fingerprint,
      nextState: sourceSnapshot,
      events: [event],
      historyControlUpdate: { kind: "logical_state_append" },
    });

    return {
      revision: receipt.newRevision,
      monthOrdinal: receipt.state.calendar.monthOrdinal as number,
      month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      alreadyApplied: receipt.alreadyApplied,
    };
  },
});
