import type { AgeDefinitionId } from "./ages";
import type { MonthOrdinal } from "./calendar";
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

const AWAKENING_MONTH = 0 as MonthOrdinal;

const AWAKENING_POSITION_INDICES: Record<MovablePlanetId, number> = {
  saturn: 20,
  jupiter: 5,
  mars: 22,
  venus: 16,
  mercury: 19,
};

const CALAMITY_MONTH = 9 as MonthOrdinal;

const CALAMITY_POSITION_INDICES: Record<MovablePlanetId, number> = {
  saturn: 35,
  jupiter: 37,
  mars: 25,
  venus: 6,
  mercury: 22,
};

const DOMINION_VALID_MONTHS: readonly number[] = [0, 3, 6, 9];

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
    if (monthOrdinal !== AWAKENING_MONTH) {
      issues.push({
        code: "AGE_MONTH_MISMATCH",
        message: `Age of Awakening requires starting month March (ordinal 0), got ordinal ${monthOrdinal}`,
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
    if (!DOMINION_VALID_MONTHS.includes(monthOrdinal)) {
      issues.push({
        code: "AGE_MONTH_MISMATCH",
        message: `Age of Dominion requires a season-starting month (ordinal 0, 3, 6, or 9), got ordinal ${monthOrdinal}`,
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
    if (monthOrdinal !== CALAMITY_MONTH) {
      issues.push({
        code: "AGE_MONTH_MISMATCH",
        message: `Age of Calamity requires starting month December (ordinal 9), got ordinal ${monthOrdinal}`,
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
