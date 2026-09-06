import type { MonthId, MonthOrdinal } from "../shared/domain/calendar";
import {
  firstCycleOrdinalForMonthId,
  monthIdFromOrdinal,
  displayNameFromMonthId,
} from "../shared/domain/calendar";
import type { MovablePlanetId, CentidegreePosition } from "../shared/domain/orrery";
import {
  legalPositionsForPlanet,
} from "../shared/domain/orrery";
import { getFixedAgePresetIndices } from "../shared/domain/age-setup";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";

export type DominionSeasonId = "spring" | "summer" | "autumn" | "winter";

const DOMINION_SEASON_TO_MONTH_ID: Record<DominionSeasonId, MonthId> = {
  spring: "march",
  summer: "june",
  autumn: "september",
  winter: "december",
};

const DOMINION_MONTH_ID_TO_SEASON: Partial<Record<MonthId, DominionSeasonId>> = {
  march: "spring",
  june: "summer",
  september: "autumn",
  december: "winter",
};

export function dominionSeasonToMonthOrdinal(season: DominionSeasonId): MonthOrdinal {
  const monthId = DOMINION_SEASON_TO_MONTH_ID[season];
  return firstCycleOrdinalForMonthId(monthId);
}

export function dominionSeasonFromMonthOrdinal(
  monthOrdinal: MonthOrdinal | null,
): DominionSeasonId | null {
  if (monthOrdinal === null) return null;
  const monthId = monthIdFromOrdinal(monthOrdinal);
  return DOMINION_MONTH_ID_TO_SEASON[monthId] ?? null;
}

export interface FixedAgeSetupSummary {
  readonly ageId: "awakening" | "calamity";
  readonly requiredMonthId: MonthId;
  readonly requiredMonthDisplayName: string;
  readonly requiredMonthOrdinal: MonthOrdinal;
  readonly presetIndices: Record<MovablePlanetId, number>;
}

export function getFixedAgeSetupSummary(
  ageId: "awakening" | "calamity",
): FixedAgeSetupSummary {
  const presetIndices = getFixedAgePresetIndices(ageId);
  if (presetIndices === null) throw new Error(`No fixed preset for age ${ageId}`);
  const requiredMonthId: MonthId =
    ageId === "awakening" ? "march" : "december";
  return {
    ageId,
    requiredMonthId,
    requiredMonthDisplayName: displayNameFromMonthId(requiredMonthId),
    requiredMonthOrdinal: firstCycleOrdinalForMonthId(requiredMonthId),
    presetIndices,
  };
}

export interface PlanetPositionSelector {
  readonly planetId: MovablePlanetId;
  readonly legalPositions: readonly CentidegreePosition[];
  readonly currentIndex: number | null;
  readonly offGrid: boolean;
}

export function buildPlanetPositionSelector(
  planetId: MovablePlanetId,
  currentPosition: CentidegreePosition | null,
): PlanetPositionSelector {
  const legalPositions = legalPositionsForPlanet(planetId);
  if (currentPosition === null) {
    return { planetId, legalPositions, currentIndex: null, offGrid: false };
  }
  const idx = legalPositions.indexOf(currentPosition);
  if (idx === -1) {
    return { planetId, legalPositions, currentIndex: null, offGrid: true };
  }
  return { planetId, legalPositions, currentIndex: idx, offGrid: false };
}

export type PactSeatStatus = "present" | "silent" | "absent" | null;

export interface WizardCreationDefaultsInput {
  readonly currentStatus: PactSeatStatus;
  readonly currentWatcherPlayerId: string | null;
  readonly portrayedByPlayerId: string | null;
}

export interface WizardCreationDefaults {
  readonly applyStatusDefault: boolean;
  readonly defaultStatus: "present" | null;
  readonly applyWatcherDefault: boolean;
  readonly defaultWatcherPlayerId: string | null;
}

export function wizardCreationDefaults(
  input: WizardCreationDefaultsInput,
): WizardCreationDefaults {
  const hasPlayer = input.portrayedByPlayerId !== null;
  const applyStatusDefault = hasPlayer && input.currentStatus === null;
  const applyWatcherDefault = hasPlayer && input.currentWatcherPlayerId === null;

  return {
    applyStatusDefault,
    defaultStatus: applyStatusDefault ? "present" : null,
    applyWatcherDefault,
    defaultWatcherPlayerId: applyWatcherDefault ? input.portrayedByPlayerId : null,
  };
}

// --- Portrayal eligibility helpers ---

export interface SetupPlayer {
  readonly playerId: string;
  readonly name: string;
}

export interface SetupWizard {
  readonly wizardId: string;
  readonly name: string;
  readonly portrayedByPlayerId: string | null;
}

export interface SetupPactSeat {
  readonly status: string | null;
  readonly wizardId: string | null;
  readonly watcherPlayerId: string | null;
}

export type SetupPactSeats = Record<string, SetupPactSeat>;

export function playerIdsPortrayingSeatedWizards(
  pactSeats: SetupPactSeats,
  wizards: readonly SetupWizard[],
): Set<string> {
  const result = new Set<string>();
  for (const seatId of PACT_SEAT_IDS) {
    const seat = pactSeats[seatId];
    if (seat && seat.wizardId !== null) {
      const wizard = wizards.find((w) => w.wizardId === seat.wizardId);
      if (wizard && wizard.portrayedByPlayerId !== null) {
        result.add(wizard.portrayedByPlayerId);
      }
    }
  }
  return result;
}

export function eligiblePortrayingPlayersForNewWizard(
  players: readonly SetupPlayer[],
  pactSeats: SetupPactSeats,
  wizards: readonly SetupWizard[],
): SetupPlayer[] {
  const used = playerIdsPortrayingSeatedWizards(pactSeats, wizards);
  return players.filter((p) => !used.has(p.playerId));
}

export function eligiblePortrayingPlayersForWizard(
  players: readonly SetupPlayer[],
  pactSeats: SetupPactSeats,
  wizards: readonly SetupWizard[],
  wizardId: string,
): SetupPlayer[] {
  const used = playerIdsPortrayingSeatedWizards(pactSeats, wizards);
  const ownWizard = wizards.find((w) => w.wizardId === wizardId);
  const ownPortrayer = ownWizard?.portrayedByPlayerId ?? null;
  return players.filter((p) => p.playerId === ownPortrayer || !used.has(p.playerId));
}

export function isUnseatedWizardAssignableToSeat(
  pactSeats: SetupPactSeats,
  wizards: readonly SetupWizard[],
  wizardId: string,
): boolean {
  const wizard = wizards.find((w) => w.wizardId === wizardId);
  if (!wizard) return false;
  if (wizard.portrayedByPlayerId === null) return true;
  for (const seatId of PACT_SEAT_IDS) {
    const seat = pactSeats[seatId];
    if (seat && seat.wizardId !== null && seat.wizardId !== wizardId) {
      const seatedWizard = wizards.find((w) => w.wizardId === seat.wizardId);
      if (seatedWizard && seatedWizard.portrayedByPlayerId === wizard.portrayedByPlayerId) {
        return false;
      }
    }
  }
  return true;
}
