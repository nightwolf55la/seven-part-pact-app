import type { AgeDefinitionId } from "./ages";
import type { MonthOrdinal, MonthId } from "./calendar";
import { monthIdFromOrdinal } from "./calendar";
import type { SetupOrreryState, MovablePlanetId, CentidegreePosition } from "./orrery";
import { MOVABLE_PLANET_IDS, legalPositionsForPlanet, isLegalPosition } from "./orrery";

export type AgeSetupIssueCode =
  | "AGE_MONTH_MISMATCH"
  | "AGE_ORRERY_POSITION_MISMATCH"
  | "AGE_ORRERY_POSITION_ILLEGAL";

export interface AgeSetupIssue {
  readonly code: AgeSetupIssueCode;
  readonly message: string;
  readonly planetId?: MovablePlanetId;
}

export type AgeSetupResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: readonly AgeSetupIssue[] };

const AWAKENING_REQUIRED_MONTH_ID: MonthId = "march";

const AWAKENING_POSITION_INDICES: Record<MovablePlanetId, number> = {
  saturn: 16,
  jupiter: 1,
  mars: 18,
  venus: 14,
  mercury: 17,
};

const CALAMITY_REQUIRED_MONTH_ID: MonthId = "december";

const CALAMITY_POSITION_INDICES: Record<MovablePlanetId, number> = {
  saturn: 31,
  jupiter: 33,
  mars: 21,
  venus: 4,
  mercury: 20,
};

const DOMINION_VALID_MONTH_IDS: readonly MonthId[] = ["march", "june", "september", "december"];

function presetPositions(indices: Record<MovablePlanetId, number>): Record<MovablePlanetId, CentidegreePosition> {
  const result = {} as Record<MovablePlanetId, CentidegreePosition>;
  for (const planetId of MOVABLE_PLANET_IDS) {
    result[planetId] = legalPositionsForPlanet(planetId)[indices[planetId]];
  }
  return result;
}

const AWAKENING_POSITIONS = presetPositions(AWAKENING_POSITION_INDICES);
const CALAMITY_POSITIONS = presetPositions(CALAMITY_POSITION_INDICES);

export function evaluateAgeSetup(
  ageId: AgeDefinitionId,
  monthOrdinal: MonthOrdinal,
  orrery: SetupOrreryState,
): AgeSetupResult {
  const issues: AgeSetupIssue[] = [];

  if (ageId === "awakening") {
    const derivedMonthId = monthIdFromOrdinal(monthOrdinal);
    if (derivedMonthId !== AWAKENING_REQUIRED_MONTH_ID) {
      issues.push({
        code: "AGE_MONTH_MISMATCH",
        message: `Age of Awakening requires starting month March, got ${derivedMonthId} (ordinal ${monthOrdinal})`,
      });
    }
    for (const planetId of MOVABLE_PLANET_IDS) {
      const pos = orrery[planetId];
      if (pos !== null && pos !== AWAKENING_POSITIONS[planetId]) {
        issues.push({
          code: "AGE_ORRERY_POSITION_MISMATCH",
          message: `Age of Awakening requires ${planetId} at the source-defined position`,
          planetId,
        });
      }
    }
  } else if (ageId === "dominion") {
    const derivedMonthId = monthIdFromOrdinal(monthOrdinal);
    if (!DOMINION_VALID_MONTH_IDS.includes(derivedMonthId)) {
      issues.push({
        code: "AGE_MONTH_MISMATCH",
        message: `Age of Dominion requires the month preceding a season (March, June, September, or December), got ${derivedMonthId} (ordinal ${monthOrdinal})`,
      });
    }
    for (const planetId of MOVABLE_PLANET_IDS) {
      const pos = orrery[planetId];
      if (pos !== null && !isLegalPosition(planetId, pos)) {
        issues.push({
          code: "AGE_ORRERY_POSITION_ILLEGAL",
          message: `Age of Dominion requires ${planetId} at a legal printed setup position`,
          planetId,
        });
      }
    }
  } else if (ageId === "calamity") {
    const derivedMonthId = monthIdFromOrdinal(monthOrdinal);
    if (derivedMonthId !== CALAMITY_REQUIRED_MONTH_ID) {
      issues.push({
        code: "AGE_MONTH_MISMATCH",
        message: `Age of Calamity requires starting month December, got ${derivedMonthId} (ordinal ${monthOrdinal})`,
      });
    }
    for (const planetId of MOVABLE_PLANET_IDS) {
      const pos = orrery[planetId];
      if (pos !== null && pos !== CALAMITY_POSITIONS[planetId]) {
        issues.push({
          code: "AGE_ORRERY_POSITION_MISMATCH",
          message: `Age of Calamity requires ${planetId} at the source-defined position`,
          planetId,
        });
      }
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return { valid: true };
}
