import { query } from "./_generated/server";
import { validateCampaignState, evaluateSetupReadiness, displayNameFromOrdinal } from "../shared/domain";
import type { MovablePlanetId } from "../shared/domain";
import type { LunarPhase } from "../shared/domain";

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

    const current = validateCampaignState(rawState);

    if (current.lifecycle.kind !== "setup") {
      return null;
    }

    const readiness = evaluateSetupReadiness(current);

    const orreryPositions: Record<string, number | null> = {};
    for (const planetId of ["saturn", "jupiter", "mars", "venus", "mercury"] as MovablePlanetId[]) {
      orreryPositions[planetId] = current.lifecycle.orrery[planetId];
    }

    const monthOrdinal = current.calendar.monthOrdinal;
    const monthDisplayName = monthOrdinal !== null ? displayNameFromOrdinal(monthOrdinal) : null;

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
      monthOrdinal: monthOrdinal as number | null,
      monthDisplayName,
      orreryPositions,
      readiness: readiness.ready
        ? { ready: true as const }
        : {
            ready: false as const,
            issues: readiness.issues.map((i) => ({
              code: i.code,
              message: i.message,
              seatId: i.seatId ?? null,
              planetId: i.planetId ?? null,
            })),
          },
    };
  },
});

export const getPlayReference = query({
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
    const current = validateCampaignState(doc.state);

    if (current.lifecycle.kind !== "play") {
      return null;
    }

    const monthOrdinal = current.calendar.monthOrdinal;
    const monthDisplayName = monthOrdinal !== null ? displayNameFromOrdinal(monthOrdinal) : null;

    const orreryPositions: Record<string, number> = {};
    for (const planetId of ["saturn", "jupiter", "mars", "venus", "mercury"] as MovablePlanetId[]) {
      orreryPositions[planetId] = current.lifecycle.orrery[planetId];
    }

    return {
      campaignId: doc.campaignId as string,
      campaignRevision: doc.campaignRevision as number,
      monthOrdinal: monthOrdinal as number,
      monthDisplayName,
      phase: current.lifecycle.phase as LunarPhase,
      orreryPositions,
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
