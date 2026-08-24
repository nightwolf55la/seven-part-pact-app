import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import {
  DomainError,
  CURRENT_HISTORY_CONTROL_VERSION,
  isLogicalStateCommandType,
} from "../shared/domain";

const analysisResultValidator = v.union(
  v.object({
    status: v.literal("no_canonical_campaign"),
  }),
  v.object({
    status: v.literal("already_initialized"),
    campaignId: v.string(),
    undoStackLength: v.number(),
    redoStackLength: v.number(),
  }),
  v.object({
    status: v.literal("ready"),
    campaignId: v.string(),
    campaignRevision: v.number(),
    expectedUndoStack: v.array(v.number()),
  }),
  v.object({
    status: v.literal("invalid"),
    errors: v.array(v.string()),
  }),
);

export const analyzeHistoryControlMigration = query({
  args: {},
  returns: analysisResultValidator,
  handler: async (ctx) => {
    const canonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (canonical === null || !("campaignKey" in canonical)) {
      return { status: "no_canonical_campaign" as const };
    }

    const campaignId = canonical.campaignId;
    const campaignRevision = canonical.campaignRevision;

    const existingControl = await ctx.db
      .query("campaignHistoryControl")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();

    if (existingControl !== null) {
      return {
        status: "already_initialized" as const,
        campaignId,
        undoStackLength: existingControl.undoStack.length,
        redoStackLength: existingControl.redoStack.length,
      };
    }

    const errors: string[] = [];

    const revisions = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_revision", (q) => q.eq("campaignId", campaignId))
      .collect();

    const revisionNumbers = revisions.map((r) => r.campaignRevision).sort((a, b) => a - b);

    for (let i = 0; i < revisionNumbers.length; i++) {
      if (revisionNumbers[i] !== i + 1) {
        errors.push(`Non-linear history: expected revision ${i + 1} at position ${i}, got ${revisionNumbers[i]}`);
        break;
      }
    }

    if (revisionNumbers.length !== campaignRevision) {
      errors.push(`Revision count ${revisionNumbers.length} does not match campaignRevision ${campaignRevision}`);
    }

    for (const rev of revisions) {
      if (!isLogicalStateCommandType(rev.commandType)) {
        errors.push(`Revision ${rev.campaignRevision} has non-logical-state commandType "${rev.commandType}" — cannot build initial undo stack from mixed history`);
      }
    }

    for (let i = 0; i < revisionNumbers.length; i++) {
      const r = revisionNumbers[i];
      const snapshot = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", campaignId).eq("campaignRevision", r),
        )
        .unique();
      if (snapshot === null) {
        errors.push(`Revision ${r} has no snapshot — undo requires snapshots at every logical-state revision`);
      }
    }

    if (errors.length > 0) {
      return { status: "invalid" as const, errors };
    }

    const expectedUndoStack: number[] = [0];
    for (const r of revisionNumbers) {
      expectedUndoStack.push(r);
    }

    return {
      status: "ready" as const,
      campaignId,
      campaignRevision,
      expectedUndoStack,
    };
  },
});

export const executeHistoryControlMigration = internalMutation({
  args: {
    campaignId: v.string(),
    expectedRevision: v.number(),
    expectedUndoStack: v.array(v.number()),
  },
  returns: v.object({
    status: v.literal("success"),
    campaignId: v.string(),
    undoStackLength: v.number(),
  }),
  handler: async (ctx, args) => {
    const canonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (canonical === null || !("campaignKey" in canonical)) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "No canonical campaign found during history control migration execution",
      );
    }

    if (canonical.campaignId !== args.campaignId) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Campaign ID mismatch: expected "${args.campaignId}", found "${canonical.campaignId}"`,
      );
    }

    if (canonical.campaignRevision !== args.expectedRevision) {
      throw new DomainError(
        "STALE_CAMPAIGN_REVISION",
        `Campaign revision changed: expected ${args.expectedRevision}, current ${canonical.campaignRevision}`,
      );
    }

    const existingControl = await ctx.db
      .query("campaignHistoryControl")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();

    if (existingControl !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "History control already exists — cannot re-migrate",
      );
    }

    if (args.expectedUndoStack.length === 0 || args.expectedUndoStack[0] !== 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "expectedUndoStack must start with 0",
      );
    }

    await ctx.db.insert("campaignHistoryControl", {
      historyControlVersion: CURRENT_HISTORY_CONTROL_VERSION,
      campaignId: args.campaignId,
      undoStack: args.expectedUndoStack,
      redoStack: [],
    });

    return {
      status: "success" as const,
      campaignId: args.campaignId,
      undoStackLength: args.expectedUndoStack.length,
    };
  },
});
