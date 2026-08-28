import { mutation } from "./_generated/server";
import {
  validateAnyCampaignState,
  validateCampaignState,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
} from "../shared/domain";
import { migrateToCurrentVersion } from "../shared/domain/state-migration";
import { assertPortableCampaignState } from "../shared/domain/state-equality";

export const migrateCurrentStateToV2 = mutation({
  args: {},
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (
      maybeCanonical === null ||
      !("campaignKey" in maybeCanonical) ||
      (maybeCanonical as any).campaignKey !== "default"
    ) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", "No canonical campaign found for migration");
    }

    const doc = maybeCanonical as any;
    const rawState = doc.state;

    // Validate raw state is a supported version
    const validated = validateAnyCampaignState(rawState);

    // Already V2 - idempotent success
    if (validated.schemaVersion === CURRENT_STATE_SCHEMA_VERSION) {
      validateCampaignState(validated);
      return {
        migrated: false,
        campaignId: doc.campaignId,
        campaignRevision: doc.campaignRevision,
        schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      };
    }

    // Perform deterministic migration
    const migratedState = migrateToCurrentVersion(validated);

    // Validate the result
    validateCampaignState(migratedState);
    assertPortableCampaignState(migratedState);

    // Persist: update campaign document ONLY (not historical snapshots)
    // preserves campaignId, campaignRevision exactly
    await ctx.db.patch(doc._id, {
      state: migratedState as unknown as Record<string, unknown>,
    } as any);

    return {
      migrated: true,
      campaignId: doc.campaignId,
      campaignRevision: doc.campaignRevision,
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    };
  },
});
