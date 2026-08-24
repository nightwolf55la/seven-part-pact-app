import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import {
  DomainError,
  CURRENT_HISTORY_CONTROL_VERSION,
  validateCampaignState,
  analyzeHistoryControlInitialization,
} from "../shared/domain";
import type {
  InitializationRevisionInfo,
  InitializationEventInfo,
  InitializationSnapshotInfo,
  SerializableCampaignState,
  CampaignHistoryControlV1,
  HistoryControlInitResult,
} from "../shared/domain";

// Shared helper: loads authoritative records from the database and invokes the
// pure analyzeHistoryControlInitialization function.
async function loadAndAnalyze(ctx: { db: any }): Promise<
  | { found: false }
  | { found: true; result: HistoryControlInitResult }
> {
  const canonical = await ctx.db
    .query("campaigns")
    .withIndex("by_campaignKey", (q: any) => q.eq("campaignKey", "default"))
    .unique();

  if (canonical === null || !("campaignKey" in canonical)) {
    return { found: false };
  }

  const campaignId: string = canonical.campaignId;
  const campaignRevision: number = canonical.campaignRevision;
  const campaignState: SerializableCampaignState = canonical.state;

  // Check for any non-canonical campaign documents (legacy remnants)
  const allCampaigns = await ctx.db.query("campaigns").collect();
  const nonCanonical = allCampaigns.filter(
    (d: any) => !("campaignKey" in d) || d.campaignKey !== "default",
  );
  if (nonCanonical.length > 0) {
    return {
      found: true,
      result: { status: "invalid" as const, errors: [`Found ${nonCanonical.length} non-canonical campaign document(s) — complete legacy migration first`] },
    };
  }
  if (allCampaigns.length !== 1) {
    return {
      found: true,
      result: { status: "invalid" as const, errors: [`Expected exactly 1 canonical campaign, found ${allCampaigns.length}`] },
    };
  }

  const revisionDocs = await ctx.db
    .query("campaignRevisions")
    .withIndex("by_campaign_revision", (q: any) => q.eq("campaignId", campaignId))
    .collect();

  const eventDocs = await ctx.db
    .query("campaignEvents")
    .withIndex("by_campaign_revision_index", (q: any) => q.eq("campaignId", campaignId))
    .collect();

  const snapshotDocs = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q: any) => q.eq("campaignId", campaignId))
    .collect();

  // Load ALL control docs (do not use .unique()) to detect duplicates
  const controlDocs = await ctx.db
    .query("campaignHistoryControl")
    .withIndex("by_campaignId", (q: any) => q.eq("campaignId", campaignId))
    .collect();

  // Validate each snapshot's state
  const snapshotValidationErrors: string[] = [];
  for (const snap of snapshotDocs) {
    try {
      validateCampaignState(snap.state);
    } catch {
      snapshotValidationErrors.push(`Snapshot at revision ${snap.campaignRevision} fails state validation`);
    }
  }
  if (snapshotValidationErrors.length > 0) {
    return {
      found: true,
      result: { status: "invalid" as const, errors: snapshotValidationErrors },
    };
  }

  const revisions: InitializationRevisionInfo[] = revisionDocs.map((r: any) => ({
    campaignRevision: r.campaignRevision,
    commandType: r.commandType,
    commandFingerprint: r.commandFingerprint,
  }));

  const events: InitializationEventInfo[] = eventDocs.map((e: any) => ({
    campaignRevision: e.campaignRevision,
    eventIndex: e.eventIndex,
    event: {
      type: e.event.type,
      version: e.event.version,
      data: e.event.data,
    },
  }));

  const snapshots: InitializationSnapshotInfo[] = snapshotDocs.map((s: any) => ({
    campaignRevision: s.campaignRevision,
    state: s.state,
  }));

  const existingControlDocs: CampaignHistoryControlV1[] = controlDocs.map((d: any) => ({
    historyControlVersion: d.historyControlVersion as 1,
    campaignId: d.campaignId,
    undoStack: d.undoStack,
    redoStack: d.redoStack,
  }));

  const result = analyzeHistoryControlInitialization({
    campaignId,
    campaignRevision,
    campaignState,
    revisions,
    events,
    snapshots,
    existingControlDocs,
  });

  return { found: true, result };
}

// --- READ-ONLY ANALYZER ---

const analysisResultValidator = v.union(
  v.object({
    status: v.literal("no_canonical_campaign"),
  }),
  v.object({
    status: v.literal("already_applied"),
    campaignId: v.string(),
    undoStackLength: v.number(),
    redoStackLength: v.number(),
  }),
  v.object({
    status: v.literal("ready"),
    campaignId: v.string(),
    campaignRevision: v.number(),
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
    const loaded = await loadAndAnalyze(ctx);

    if (!loaded.found) {
      return { status: "no_canonical_campaign" as const };
    }

    const r = loaded.result;
    if (r.status === "ready") {
      return {
        status: "ready" as const,
        campaignId: r.campaignId,
        campaignRevision: r.campaignRevision,
      };
    }
    if (r.status === "already_applied") {
      return {
        status: "already_applied" as const,
        campaignId: r.campaignId,
        undoStackLength: r.undoStackLength,
        redoStackLength: r.redoStackLength,
      };
    }
    return { status: "invalid" as const, errors: [...r.errors] };
  },
});

// --- EXECUTOR (INTERNAL MUTATION) ---

const executionResultValidator = v.union(
  v.object({
    status: v.literal("success"),
    campaignId: v.string(),
    undoStackLength: v.number(),
  }),
  v.object({
    status: v.literal("already_applied"),
    campaignId: v.string(),
    undoStackLength: v.number(),
    redoStackLength: v.number(),
  }),
);

export const executeHistoryControlMigration = internalMutation({
  args: {
    campaignId: v.string(),
    expectedRevision: v.number(),
  },
  returns: executionResultValidator,
  handler: async (ctx, args) => {
    const loaded = await loadAndAnalyze(ctx);

    if (!loaded.found) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "No canonical campaign found during history control migration execution",
      );
    }

    const result = loaded.result;

    // CAS-check: the campaign must still be at the expected revision
    const canonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q: any) => q.eq("campaignKey", "default"))
      .unique();

    if (canonical === null || !("campaignKey" in canonical)) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `No canonical campaign found for CAS check`,
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

    if (result.status === "already_applied") {
      return {
        status: "already_applied" as const,
        campaignId: result.campaignId,
        undoStackLength: result.undoStackLength,
        redoStackLength: result.redoStackLength,
      };
    }

    if (result.status === "invalid") {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control initialization preconditions failed: ${result.errors.join("; ")}`,
      );
    }

    // result.status === "ready" — insert the control record
    await ctx.db.insert("campaignHistoryControl", {
      historyControlVersion: CURRENT_HISTORY_CONTROL_VERSION,
      campaignId: result.campaignId,
      undoStack: [...result.undoStack],
      redoStack: [...result.redoStack],
    });

    return {
      status: "success" as const,
      campaignId: result.campaignId,
      undoStackLength: result.undoStack.length,
    };
  },
});
