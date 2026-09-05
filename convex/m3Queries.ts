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

export const getPlanningWorkspace = query({
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

    if (current.lifecycle.kind !== "play" || current.lifecycle.phase !== "planning") {
      return null;
    }

    const monthOrdinal = current.calendar.monthOrdinal;
    if (monthOrdinal === null) return null;

    const wizardNameById = new Map<string, string>();
    for (const w of current.wizards) {
      wizardNameById.set(w.wizardId as string, w.name);
    }

    const timeParticipants = current.lifecycle.currentMonth.timeParticipants.map((tp) => {
      const wizardId = tp.participant.wizardId as string;
      const wizardName = wizardNameById.get(wizardId);
      if (!wizardName) {
        throw new Error(`Unresolved wizard for time participant: ${wizardId}`);
      }
      return {
        wizardId,
        wizardName,
        effectiveBudget: tp.effectiveBudget,
        rescheduleAllowance: tp.rescheduleAllowance,
        reschedulesUsed: tp.reschedulesUsed,
        allocations: tp.allocations.map((a) => ({
          allocationId: a.allocationId as string,
          destination: a.destination,
          note: a.note,
          resolution: a.resolution,
        })),
      };
    });

    const engagements = current.lifecycle.currentMonth.engagements.map((e) => ({
      engagementId: e.engagementId as string,
      actingWizardId: e.actingWizardId as string,
      target: e.target,
      resolution: e.resolution,
      linkedTimeAllocationId: e.linkedTimeAllocationId as string | null,
    }));

    const modeledWizards = current.wizards.map((w) => ({
      wizardId: w.wizardId as string,
      name: w.name,
    }));

    return {
      monthOrdinal: monthOrdinal as number,
      timeParticipants,
      engagements,
      modeledWizards,
    };
  },
});

export const getStoryWorkspace = query({
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

    if (current.lifecycle.kind !== "play" || current.lifecycle.phase !== "story") {
      return null;
    }

    const monthOrdinal = current.calendar.monthOrdinal;
    if (monthOrdinal === null) return null;

    const wizardNameById = new Map<string, string>();
    for (const w of current.wizards) {
      wizardNameById.set(w.wizardId as string, w.name);
    }

    const timeParticipants = current.lifecycle.currentMonth.timeParticipants.map((tp) => {
      const wizardId = tp.participant.wizardId as string;
      const wizardName = wizardNameById.get(wizardId);
      if (!wizardName) {
        throw new Error(`Unresolved wizard for time participant: ${wizardId}`);
      }
      return {
        wizardId,
        wizardName,
        effectiveBudget: tp.effectiveBudget,
        rescheduleAllowance: tp.rescheduleAllowance,
        reschedulesUsed: tp.reschedulesUsed,
        allocations: tp.allocations.map((a) => ({
          allocationId: a.allocationId as string,
          destination: a.destination,
          note: a.note,
          resolution: a.resolution,
        })),
      };
    });

    const engagements = current.lifecycle.currentMonth.engagements.map((e) => ({
      engagementId: e.engagementId as string,
      actingWizardId: e.actingWizardId as string,
      target: e.target,
      resolution: e.resolution,
      linkedTimeAllocationId: e.linkedTimeAllocationId as string | null,
    }));

    const modeledWizards = current.wizards.map((w) => ({
      wizardId: w.wizardId as string,
      name: w.name,
    }));

    const orreryPositions = {
      saturn: current.lifecycle.orrery.saturn as number,
      jupiter: current.lifecycle.orrery.jupiter as number,
      mars: current.lifecycle.orrery.mars as number,
      venus: current.lifecycle.orrery.venus as number,
      mercury: current.lifecycle.orrery.mercury as number,
    };

    return {
      monthOrdinal: monthOrdinal as number,
      timeParticipants,
      engagements,
      modeledWizards,
      orreryPositions,
    };
  },
});

export const getMeetingWorkspace = query({
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

    if (current.lifecycle.kind !== "play" || current.lifecycle.phase !== "meeting") {
      return null;
    }

    const monthOrdinal = current.calendar.monthOrdinal;
    if (monthOrdinal === null) return null;

    const wizardNameById = new Map<string, string>();
    for (const w of current.wizards) {
      wizardNameById.set(w.wizardId as string, w.name);
    }

    const month = current.lifecycle.currentMonth;
    const attendance = month.wizardmootAttendance;
    if (attendance === null) return null;

    const timeParticipants = month.timeParticipants;

    const attendanceRows = attendance.map((a) => {
      const wizardId = a.wizardId as string;
      const wizardName = wizardNameById.get(wizardId);
      if (!wizardName) {
        throw new Error(`Unresolved wizard for attendance: ${wizardId}`);
      }
      const tp = timeParticipants.find(
        (t) => t.participant.wizardId as string === wizardId,
      );
      const meetingAllocs = tp
        ? tp.allocations.filter(
            (al) => al.destination !== null && al.destination.kind === "meeting",
          )
        : [];
      const pendingMeetingAllocs = meetingAllocs.filter(
        (al) => al.resolution === "pending",
      );
      const expectedAttended = meetingAllocs.length > 0;
      return {
        wizardId,
        wizardName,
        expectedAttended,
        actualAttended: a.attended,
        exceptionReason: a.exceptionReason as string | null,
        meetingAllocationCount: meetingAllocs.length,
        pendingMeetingAllocationCount: pendingMeetingAllocs.length,
      };
    });

    return {
      monthOrdinal: monthOrdinal as number,
      attendance: attendanceRows,
    };
  },
});

export const getQuietWorkspace = query({
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

    if (current.lifecycle.kind !== "play" || current.lifecycle.phase !== "quiet") {
      return null;
    }

    const monthOrdinal = current.calendar.monthOrdinal;
    if (monthOrdinal === null) return null;

    const wizardNameById = new Map<string, string>();
    for (const w of current.wizards) {
      wizardNameById.set(w.wizardId as string, w.name);
    }

    const timeParticipants = current.lifecycle.currentMonth.timeParticipants.map((tp) => {
      const wizardId = tp.participant.wizardId as string;
      const wizardName = wizardNameById.get(wizardId);
      if (!wizardName) {
        throw new Error(`Unresolved wizard for time participant: ${wizardId}`);
      }
      return {
        wizardId,
        wizardName,
        allocations: tp.allocations.map((a) => ({
          allocationId: a.allocationId as string,
          destination: a.destination,
          note: a.note,
          resolution: a.resolution,
        })),
      };
    });

    const engagements = current.lifecycle.currentMonth.engagements.map((e) => ({
      engagementId: e.engagementId as string,
      actingWizardId: e.actingWizardId as string,
      target: e.target,
      resolution: e.resolution,
      linkedTimeAllocationId: e.linkedTimeAllocationId as string | null,
    }));

    const wizardmootAttendance =
      current.lifecycle.currentMonth.wizardmootAttendance !== null
        ? current.lifecycle.currentMonth.wizardmootAttendance.map((a) => {
            const wizardId = a.wizardId as string;
            const wizardName = wizardNameById.get(wizardId);
            if (!wizardName) {
              throw new Error(`Unresolved wizard for attendance: ${wizardId}`);
            }
            return {
              wizardId,
              wizardName,
              attended: a.attended,
              exceptionReason: a.exceptionReason as string | null,
            };
          })
        : [];

    const modeledWizards = current.wizards.map((w) => ({
      wizardId: w.wizardId as string,
      name: w.name,
    }));

    return {
      monthOrdinal: monthOrdinal as number,
      timeParticipants,
      engagements,
      wizardmootAttendance,
      modeledWizards,
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
