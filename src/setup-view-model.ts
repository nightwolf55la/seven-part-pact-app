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
