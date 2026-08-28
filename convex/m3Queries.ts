import { query } from "./_generated/server";
import { validateAnyCampaignState } from "../shared/domain";
import { migrateToCurrentVersion } from "../shared/domain/state-migration";

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
    const validated = validateAnyCampaignState(rawState);
    const current = migrateToCurrentVersion(validated);

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
