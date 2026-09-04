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
 * Mutable persistence representation of a readonly domain value.
 *
 * Convex validator inference models arrays/objects as mutable, while the
 * domain state is intentionally readonly. The runtime representation is
 * identical; this type removes readonly only at the persistence boundary.
 */
type PersistedValue<T> =
  T extends string | number | boolean | bigint | symbol | null | undefined
    ? T
    : T extends readonly (infer U)[]
      ? PersistedValue<U>[]
      : T extends object
        ? { -readonly [K in keyof T]: PersistedValue<T[K]> }
        : T;

type PersistedCampaignState = PersistedValue<CurrentCampaignState>;

/**
 * Serialize CurrentCampaignState for Convex persistence.
 *
 * This is an identity operation at runtime. The assertion only adapts the
 * domain's readonly type to Convex's mutable validator-inferred type.
 */
export function serializeState(
  state: CurrentCampaignState,
): PersistedCampaignState {
  return state as PersistedCampaignState;
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
