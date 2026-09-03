import type { Brand } from "./brand";
import type { MonthOrdinal } from "./calendar";

export type CentidegreePosition = Brand<number, "CentidegreePosition">;

export const FULL_CIRCLE_CENTIDEGREES = 36000;
export const HOUSE_COUNT = 12;
export const HOUSE_WIDTH_CENTIDEGREES = 3000; // 30 degrees

export type MovablePlanetId = "saturn" | "jupiter" | "mars" | "venus" | "mercury";
export type CelestialBodyId = MovablePlanetId | "sun";

export const MOVABLE_PLANET_IDS: readonly MovablePlanetId[] = [
  "saturn", "jupiter", "mars", "venus", "mercury",
] as const;

export const CELESTIAL_BODY_IDS: readonly CelestialBodyId[] = [
  "sun", "saturn", "jupiter", "mars", "venus", "mercury",
] as const;

export type HouseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const HOUSE_NAMES: readonly string[] = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export interface PlanetDefinition {
  readonly id: MovablePlanetId;
  readonly arcCentidegrees: number;
  readonly gridCentidegrees: number;
  readonly gridOffsetCentidegrees: number;
}

export const PLANET_DEFINITIONS: Record<MovablePlanetId, PlanetDefinition> = {
  saturn: {
    id: "saturn",
    arcCentidegrees: 1000, // 10 degrees
    gridCentidegrees: 1000, // 10-degree sections
    gridOffsetCentidegrees: 500, // 5-degree boundary offset
  },
  jupiter: {
    id: "jupiter",
    arcCentidegrees: 2250, // 22.5 degrees
    gridCentidegrees: 750, // 7.5-degree grid
    gridOffsetCentidegrees: 0,
  },
  mars: {
    id: "mars",
    arcCentidegrees: 5250, // 52.5 degrees
    gridCentidegrees: 750, // 7.5-degree grid
    gridOffsetCentidegrees: 0,
  },
  venus: {
    id: "venus",
    arcCentidegrees: 7500, // 75 degrees
    gridCentidegrees: 1500, // 15-degree printed grid
    gridOffsetCentidegrees: 0,
  },
  mercury: {
    id: "mercury",
    arcCentidegrees: 10500, // 105 degrees
    gridCentidegrees: 1500, // 15-degree printed grid
    gridOffsetCentidegrees: 0,
  },
} as const;

function normalizeCentidegrees(value: number): number {
  return ((value % FULL_CIRCLE_CENTIDEGREES) + FULL_CIRCLE_CENTIDEGREES) % FULL_CIRCLE_CENTIDEGREES;
}

export function isValidCentidegreePosition(value: number): value is CentidegreePosition {
  return Number.isSafeInteger(value) && value >= 0 && value < FULL_CIRCLE_CENTIDEGREES;
}

export function asCentidegreePosition(value: number): CentidegreePosition {
  if (!isValidCentidegreePosition(value)) {
    throw new Error(`Invalid centidegree position: ${value}. Must be integer in [0, ${FULL_CIRCLE_CENTIDEGREES}).`);
  }
  return value;
}

export function houseIndexFromCentidegrees(position: number): HouseIndex {
  const normalized = normalizeCentidegrees(position);
  return Math.floor(normalized / HOUSE_WIDTH_CENTIDEGREES) as HouseIndex;
}

export function sunPositionFromMonthOrdinal(monthOrdinal: MonthOrdinal): CentidegreePosition {
  const index = ((monthOrdinal % HOUSE_COUNT) + HOUSE_COUNT) % HOUSE_COUNT;
  return (index * HOUSE_WIDTH_CENTIDEGREES) as CentidegreePosition;
}

export function arcStartAndEnd(
  startCentidegrees: CentidegreePosition,
  arcCentidegrees: number,
): { start: number; end: number } {
  const start = normalizeCentidegrees(startCentidegrees);
  const end = normalizeCentidegrees(start + arcCentidegrees);
  return { start, end };
}

export function housesOccupiedByArc(
  startCentidegrees: CentidegreePosition,
  arcCentidegrees: number,
): readonly HouseIndex[] {
  if (arcCentidegrees <= 0 || arcCentidegrees > FULL_CIRCLE_CENTIDEGREES) {
    return [];
  }

  const start = normalizeCentidegrees(startCentidegrees);
  const houses: HouseIndex[] = [];

  for (let h = 0; h < HOUSE_COUNT; h++) {
    const houseStart = h * HOUSE_WIDTH_CENTIDEGREES;
    const houseEnd = houseStart + HOUSE_WIDTH_CENTIDEGREES;

    if (arcOverlapsHouse(start, arcCentidegrees, houseStart, houseEnd)) {
      houses.push(h as HouseIndex);
    }
  }

  return houses;
}

function arcOverlapsHouse(
  arcStart: number,
  arcLength: number,
  houseStart: number,
  houseEnd: number,
): boolean {
  const arcEnd = arcStart + arcLength;

  if (arcEnd <= FULL_CIRCLE_CENTIDEGREES) {
    // No wraparound: half-open [arcStart, arcEnd) vs half-open [houseStart, houseEnd)
    return arcStart < houseEnd && arcEnd > houseStart;
  }

  // Wraparound: arc spans [arcStart, 36000) and [0, arcEnd % 36000)
  const wrappedEnd = arcEnd % FULL_CIRCLE_CENTIDEGREES;
  return (arcStart < houseEnd && FULL_CIRCLE_CENTIDEGREES > houseStart) ||
         (0 < houseEnd && wrappedEnd > houseStart);
}

export function housesOccupiedByBody(
  planetId: MovablePlanetId,
  startCentidegrees: CentidegreePosition,
): readonly HouseIndex[] {
  const def = PLANET_DEFINITIONS[planetId];
  return housesOccupiedByArc(startCentidegrees, def.arcCentidegrees);
}

export function sunHouse(monthOrdinal: MonthOrdinal): HouseIndex {
  const sunPos = sunPositionFromMonthOrdinal(monthOrdinal);
  return houseIndexFromCentidegrees(sunPos);
}

export interface BodyHouseOccupancy {
  readonly bodyId: CelestialBodyId;
  readonly houses: readonly HouseIndex[];
}

export interface Conjunction {
  readonly bodyA: CelestialBodyId;
  readonly bodyB: CelestialBodyId;
  readonly sharedHouses: readonly HouseIndex[];
}

export function computeAllOccupancies(
  positions: Readonly<Record<MovablePlanetId, CentidegreePosition>>,
  monthOrdinal: MonthOrdinal,
): readonly BodyHouseOccupancy[] {
  const result: BodyHouseOccupancy[] = [];

  const sunPos = sunPositionFromMonthOrdinal(monthOrdinal);
  result.push({
    bodyId: "sun",
    houses: housesOccupiedByArc(sunPos, HOUSE_WIDTH_CENTIDEGREES),
  });

  for (const planetId of MOVABLE_PLANET_IDS) {
    result.push({
      bodyId: planetId,
      houses: housesOccupiedByBody(planetId, positions[planetId]),
    });
  }

  return result;
}

export function computeConjunctions(
  occupancies: readonly BodyHouseOccupancy[],
): readonly Conjunction[] {
  const conjunctions: Conjunction[] = [];

  for (let i = 0; i < occupancies.length; i++) {
    for (let j = i + 1; j < occupancies.length; j++) {
      const a = occupancies[i];
      const b = occupancies[j];
      const aSet = new Set(a.houses);
      const shared = b.houses.filter((h) => aSet.has(h));
      if (shared.length > 0) {
        conjunctions.push({
          bodyA: a.bodyId,
          bodyB: b.bodyId,
          sharedHouses: shared,
        });
      }
    }
  }

  return conjunctions;
}

export function advancePlanetPosition(
  planetId: MovablePlanetId,
  currentStart: CentidegreePosition,
): CentidegreePosition {
  const def = PLANET_DEFINITIONS[planetId];
  return normalizeCentidegrees(currentStart + def.arcCentidegrees) as CentidegreePosition;
}

export function legalPositionsForPlanet(planetId: MovablePlanetId): readonly CentidegreePosition[] {
  const def = PLANET_DEFINITIONS[planetId];
  const positions: CentidegreePosition[] = [];
  let pos = def.gridOffsetCentidegrees;
  while (pos < FULL_CIRCLE_CENTIDEGREES) {
    positions.push(pos as CentidegreePosition);
    pos += def.gridCentidegrees;
  }
  return positions;
}

export function isLegalPosition(planetId: MovablePlanetId, position: CentidegreePosition): boolean {
  const legal = legalPositionsForPlanet(planetId);
  return legal.includes(position);
}

export interface SetupOrreryState {
  readonly saturn: CentidegreePosition | null;
  readonly jupiter: CentidegreePosition | null;
  readonly mars: CentidegreePosition | null;
  readonly venus: CentidegreePosition | null;
  readonly mercury: CentidegreePosition | null;
}

export interface OrreryState {
  readonly saturn: CentidegreePosition;
  readonly jupiter: CentidegreePosition;
  readonly mars: CentidegreePosition;
  readonly venus: CentidegreePosition;
  readonly mercury: CentidegreePosition;
}

export function isCompleteOrrery(setup: SetupOrreryState): setup is OrreryState {
  return setup.saturn !== null &&
         setup.jupiter !== null &&
         setup.mars !== null &&
         setup.venus !== null &&
         setup.mercury !== null;
}

export function emptySetupOrrery(): SetupOrreryState {
  return {
    saturn: null,
    jupiter: null,
    mars: null,
    venus: null,
    mercury: null,
  };
}

export function advanceAllPlanets(orrery: OrreryState): OrreryState {
  return {
    saturn: advancePlanetPosition("saturn", orrery.saturn),
    jupiter: advancePlanetPosition("jupiter", orrery.jupiter),
    mars: advancePlanetPosition("mars", orrery.mars),
    venus: advancePlanetPosition("venus", orrery.venus),
    mercury: advancePlanetPosition("mercury", orrery.mercury),
  };
}
