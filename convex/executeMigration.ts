import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { DomainError, parseCampaignId } from "../shared/domain";
import { assertCampaignNotDeleting } from "./deletionBarrier";

export const executeMigration = internalMutation({
  args: {
    campaignId: v.string(),
  },
  returns: v.object({
    status: v.literal("migrated"),
    campaignId: v.string(),
    campaignRevision: v.number(),
    snapshotsCreated: v.number(),
    revisionsCreated: v.number(),
    eventsCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseCampaignId(args.campaignId);

    throw new DomainError(
      "UNSUPPORTED_LEGACY_STATE",
      "V1/V2 to V3 migration is not supported. " +
      "Pre-M4 campaign data cannot be automatically migrated to the V3 state format. " +
      "The campaign must be reset to begin with a fresh V3 state.",
    );
  },
});
