import type { CurrentCampaignState } from "./campaign-state";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";
import { MOVABLE_PLANET_IDS } from "./orrery";
import type { MovablePlanetId } from "./orrery";
import type { PlayerId, WizardId } from "./ids";
import { evaluateAgeSetup } from "./age-setup";
import type { AgeSetupIssueCode } from "./age-setup";

export type SetupReadinessIssueCode =
  | "LIFECYCLE_NOT_SETUP"
  | "AGE_NOT_SELECTED"
  | "FACILITATOR_NOT_SELECTED"
  | "FACILITATOR_PLAYER_NOT_FOUND"
  | "MONTH_ORDINAL_NOT_SET"
  | "ORRERY_POSITION_NOT_SET"
  | "SEAT_STATUS_NOT_CLASSIFIED"
  | "PRESENT_SEAT_MISSING_WIZARD"
  | "SILENT_SEAT_MISSING_WIZARD"
  | "PRESENT_WIZARD_MISSING_PORTRAYAL"
  | "WATCHER_NOT_ASSIGNED"
  | "PLAYER_PORTRAYS_MULTIPLE_PRESENT_WIZARDS"
  | AgeSetupIssueCode;

export interface SetupReadinessIssue {
  readonly code: SetupReadinessIssueCode;
  readonly message: string;
  readonly seatId?: PactSeatId;
  readonly planetId?: MovablePlanetId;
  readonly playerId?: PlayerId;
  readonly wizardId?: WizardId;
}

export type SetupReadinessResult =
  | { readonly ready: true }
  | { readonly ready: false; readonly issues: readonly SetupReadinessIssue[] };

export function evaluateSetupReadiness(state: CurrentCampaignState): SetupReadinessResult {
  const issues: SetupReadinessIssue[] = [];

  if (state.lifecycle.kind !== "setup") {
    issues.push({
      code: "LIFECYCLE_NOT_SETUP",
      message: "Lifecycle must be Setup to begin Play",
    });
    return { ready: false, issues };
  }

  if (state.configuration.ageId === null) {
    issues.push({
      code: "AGE_NOT_SELECTED",
      message: "An Age must be selected before beginning Play",
    });
  }

  if (state.configuration.facilitatorPlayerId === null) {
    issues.push({
      code: "FACILITATOR_NOT_SELECTED",
      message: "A facilitator must be assigned before beginning Play",
    });
  } else {
    const playerExists = state.players.some(
      (p) => p.playerId === state.configuration.facilitatorPlayerId,
    );
    if (!playerExists) {
      issues.push({
        code: "FACILITATOR_PLAYER_NOT_FOUND",
        message: "The assigned facilitator does not reference an existing player",
        playerId: state.configuration.facilitatorPlayerId,
      });
    }
  }

  if (state.calendar.monthOrdinal === null) {
    issues.push({
      code: "MONTH_ORDINAL_NOT_SET",
      message: "A starting month must be set before beginning Play",
    });
  }

  const orrery = state.lifecycle.orrery;
  for (const planetId of MOVABLE_PLANET_IDS) {
    if (orrery[planetId] === null) {
      issues.push({
        code: "ORRERY_POSITION_NOT_SET",
        message: `Orrery position for ${planetId} must be set before beginning Play`,
        planetId,
      });
    }
  }

  const wizardById = new Map<string, { wizardId: string; portrayedByPlayerId: PlayerId | null }>();
  for (const w of state.wizards) {
    wizardById.set(w.wizardId, w);
  }

  const playerIds = new Set(state.players.map((p) => p.playerId));

  const presentWizardPlayerMap = new Map<PlayerId, PactSeatId>();

  for (const seatId of PACT_SEAT_IDS) {
    const seat = state.pactSeats[seatId];

    if (seat.status === null) {
      issues.push({
        code: "SEAT_STATUS_NOT_CLASSIFIED",
        message: `Pact seat ${seatId} must be classified as present, silent, or absent`,
        seatId,
      });
    }

    if (seat.status === "present" || seat.status === "silent") {
      if (seat.wizardId === null) {
        issues.push({
          code: seat.status === "present" ? "PRESENT_SEAT_MISSING_WIZARD" : "SILENT_SEAT_MISSING_WIZARD",
          message: `Pact seat ${seatId} with status "${seat.status}" must have an assigned wizard`,
          seatId,
        });
      }
    }

    if (seat.status === "present" && seat.wizardId !== null) {
      const wizard = wizardById.get(seat.wizardId);
      if (wizard && wizard.portrayedByPlayerId !== null) {
        const existingSeat = presentWizardPlayerMap.get(wizard.portrayedByPlayerId);
        if (existingSeat !== undefined) {
          issues.push({
            code: "PLAYER_PORTRAYS_MULTIPLE_PRESENT_WIZARDS",
            message: `Player ${wizard.portrayedByPlayerId} portrays Present Pact wizards in multiple seats: ${existingSeat} and ${seatId}`,
            playerId: wizard.portrayedByPlayerId,
            seatId,
          });
        } else {
          presentWizardPlayerMap.set(wizard.portrayedByPlayerId, seatId);
        }
      }

      if (wizard && wizard.portrayedByPlayerId === null) {
        issues.push({
          code: "PRESENT_WIZARD_MISSING_PORTRAYAL",
          message: `Present wizard in seat ${seatId} must have a portraying player`,
          seatId,
          wizardId: seat.wizardId,
        });
      }
    }

    if (seat.watcherPlayerId === null) {
      issues.push({
        code: "WATCHER_NOT_ASSIGNED",
        message: `Pact seat ${seatId} must have an assigned watcher`,
        seatId,
      });
    } else if (!playerIds.has(seat.watcherPlayerId)) {
      issues.push({
        code: "WATCHER_NOT_ASSIGNED",
        message: `Pact seat ${seatId} watcher does not reference an existing player`,
        seatId,
        playerId: seat.watcherPlayerId,
      });
    }
  }

  if (state.configuration.ageId !== null && state.calendar.monthOrdinal !== null) {
    const ageResult = evaluateAgeSetup(
      state.configuration.ageId,
      state.calendar.monthOrdinal,
      state.lifecycle.orrery,
    );
    if (!ageResult.valid) {
      for (const issue of ageResult.issues) {
        issues.push({
          code: issue.code,
          message: issue.message,
          planetId: issue.planetId,
        });
      }
    }
  }

  if (issues.length > 0) {
    return { ready: false, issues };
  }
  return { ready: true };
}
