import { internalMutation } from "./_generated/server";
import {
  validateCampaignState,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
} from "../shared/domain";
import { assertCampaignNotDeleting } from "./deletionBarrier";

export const migrateCurrentStateToV2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    await assertCampaignNotDeleting(ctx);

    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (
      maybeCanonical === null ||
      !("campaignKey" in maybeCanonical) ||
      (maybeCanonical as any).campaignKey !== "default"
    ) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", "No canonical campaign found");
    }

    const doc = maybeCanonical as any;
    const rawState = doc.state;

    if (
      rawState == null ||
      typeof rawState !== "object" ||
      rawState.schemaVersion !== CURRENT_STATE_SCHEMA_VERSION
    ) {
      throw new DomainError(
        "UNSUPPORTED_LEGACY_STATE",
        "V1/V2 to V3 migration is not supported. " +
        "Pre-M4 campaign data cannot be automatically migrated to the V3 state format. " +
        "The campaign must be reset to begin with a fresh V3 state.",
      );
    }

    validateCampaignState(rawState);

    return {
      migrated: false,
      campaignId: doc.campaignId,
      campaignRevision: doc.campaignRevision,
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    };
  },
});
