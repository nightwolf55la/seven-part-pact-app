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
  initialCampaignState,
  isValidCampaignId,
  DomainError,
  CURRENT_HISTORY_CONTROL_VERSION,
  validateHistoryControlStructure,
  statesDeepEqual,
} from "../shared/domain";
import type { MonthDirection, CampaignId, CampaignHistoryControlV1, CurrentCampaignState } from "../shared/domain";
import { deriveUndoTransition, deriveRedoTransition } from "../shared/domain/undo-redo";
import {
  monthDirectionValidator,
  monthDisplayNameValidator,
} from "./validators";
import { canonicalCommit } from "./canonicalCommit";

type CanonicalCampaignDoc = {
  _id: any;
  _creationTime: number;
  campaignKey: "default";
  campaignId: string;
  campaignRevision: number;
  state: { schemaVersion: 1; ruleset: { id: "seven_part_pact_draft4"; version: 1 }; calendar: { monthOrdinal: number } };
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

    const state = initialCampaignState();
    validateCampaignState(state);

    const campaignId = generateCampaignId();

    const persistState = {
      schemaVersion: state.schemaVersion,
      ruleset: { id: state.ruleset.id, version: state.ruleset.version },
      calendar: { monthOrdinal: state.calendar.monthOrdinal as number },
    };

    const docId = await ctx.db.insert("campaigns", {
      campaignKey: "default" as const,
      campaignId: campaignId as string,
      campaignRevision: 0,
      state: persistState,
    });

    await ctx.db.insert("campaignSnapshots", {
      campaignId: campaignId as string,
      campaignRevision: 0,
      state: persistState,
    });

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

const eventViewValidator = v.object({
  _id: v.string(),
  revision: v.number(),
  previousMonth: v.string(),
  newMonth: v.string(),
});

export const getRecentEvents = query({
  args: { count: v.number() },
  returns: v.array(eventViewValidator),
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

      return events.map((e) => {
        if (e.event.type !== "month_changed") {
          return null;
        }
        return {
          _id: e._id,
          revision: e.campaignRevision,
          previousMonth: displayNameFromOrdinal(e.event.data.fromOrdinal),
          newMonth: displayNameFromOrdinal(e.event.data.toOrdinal),
        };
      }).filter((e): e is NonNullable<typeof e> => e !== null);
    }

    const legacyEvents = await ctx.db.query("events").order("desc").take(args.count);
    return legacyEvents.map((e) => ({
      _id: e._id,
      revision: e.revision,
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

    return {
      canUndo: doc.undoStack.length > 1,
      canRedo: doc.redoStack.length > 0,
      campaignRevision: maybeCanonical.campaignRevision,
      logicalRevision: doc.undoStack[doc.undoStack.length - 1],
    };
  },
});
