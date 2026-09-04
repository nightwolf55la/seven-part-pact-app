/**
 * Typed persistence boundary helpers for the campaigns table.
 *
 * Convex generates types from validators (v.union of legacy + new record shapes).
 * Our domain layer uses branded types (MonthOrdinal, PlayerId, etc.) that are
 * structurally identical to their base types but cannot be assigned without assertion.
 * These helpers consolidate the necessary type assertions at a single boundary
 * rather than scattering `as any` throughout mutation code.
 */
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { CurrentCampaignState } from "../shared/domain";

export interface CanonicalCampaignRecord {
  readonly docId: Id<"campaigns">;
  readonly campaignId: string;
  readonly campaignRevision: number;
  readonly rawState: unknown;
}

export async function loadCanonicalRecord(
  ctx: QueryCtx | MutationCtx,
): Promise<CanonicalCampaignRecord | null> {
  const doc = await ctx.db
    .query("campaigns")
    .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
    .unique();

  if (doc === null || !("campaignKey" in doc)) {
    return null;
  }

  const record = doc as unknown as {
    _id: Id<"campaigns">;
    campaignId: string;
    campaignRevision: number;
    state: unknown;
  };

  return {
    docId: record._id,
    campaignId: record.campaignId,
    campaignRevision: record.campaignRevision,
    rawState: record.state,
  };
}

/**
 * Serialize CurrentCampaignState for Convex persistence.
 * Branded types are structurally identical to their base types at runtime;
 * this assertion documents the persistence boundary.
 */
export function serializeState(state: CurrentCampaignState): Record<string, unknown> {
  return state as unknown as Record<string, unknown>;
}

/**
 * Build a campaign snapshot insert record.
 */
export function snapshotRecord(
  campaignId: string,
  campaignRevision: number,
  state: CurrentCampaignState,
) {
  return {
    campaignId,
    campaignRevision,
    state: serializeState(state),
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Convex validator union
}

/**
 * Build a campaign document patch (for updating current state + revision).
 */
export function campaignPatch(
  campaignRevision: number,
  state: CurrentCampaignState,
) {
  return {
    campaignRevision,
    state: serializeState(state),
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Convex validator union
}
