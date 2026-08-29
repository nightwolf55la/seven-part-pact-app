import { query } from "./_generated/server";
import { validateCampaignState, validateAnyCampaignState, DomainError } from "../shared/domain";

export const getCampaignSetup = query({
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
      return null;
    }

    const doc = maybeCanonical as any;
    const rawState = doc.state;

    // Fail closed: current campaign document MUST already be V2.
    let current;
    try {
      current = validateCampaignState(rawState);
    } catch (e: unknown) {
      try {
        const any = validateAnyCampaignState(rawState);
        if (any.schemaVersion === 1) {
          throw new DomainError(
            "MIGRATION_REQUIRED",
            "Campaign state is V1. Run the explicit admin migration (adminMigration:migrateCurrentStateToV2) before using M3 queries.",
          );
        }
      } catch (inner: unknown) {
        if (inner instanceof DomainError && inner.code === "MIGRATION_REQUIRED") throw inner;
      }
      throw e;
    }

    return {
      campaignId: doc.campaignId as string,
      campaignRevision: doc.campaignRevision as number,
      configuration: {
        ageId: current.configuration.ageId as string | null,
        facilitatorPlayerId: current.configuration.facilitatorPlayerId as string | null,
      },
      players: current.players.map((p) => ({
        playerId: p.playerId as string,
        name: p.name,
      })),
      wizards: current.wizards.map((w) => ({
        wizardId: w.wizardId as string,
        name: w.name,
        portrayedByPlayerId: w.portrayedByPlayerId as string | null,
      })),
      pactSeats: Object.fromEntries(
        Object.entries(current.pactSeats).map(([seatId, seat]) => [
          seatId,
          {
            status: seat.status as string | null,
            wizardId: seat.wizardId as string | null,
            watcherPlayerId: seat.watcherPlayerId as string | null,
          },
        ]),
      ),
    };
  },
});
