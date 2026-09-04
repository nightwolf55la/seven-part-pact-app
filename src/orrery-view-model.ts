import type { MonthOrdinal } from "../shared/domain/calendar";
import {
  monthOfYearIndexFromOrdinal,
  MONTH_DISPLAY_NAMES,
} from "../shared/domain/calendar";
import {
  HOUSE_NAMES,
  sunPositionFromMonthOrdinal,
  sunHouse,
  computeAllOccupancies,
  computeConjunctions,
  PLANET_DEFINITIONS,
  MOVABLE_PLANET_IDS,
  FULL_CIRCLE_CENTIDEGREES,
  housesOccupiedByBody,
} from "../shared/domain/orrery";
import type {
  MovablePlanetId,
  CentidegreePosition,
  HouseIndex,
  CelestialBodyId,
} from "../shared/domain/orrery";

export interface HouseDisplayInfo {
  readonly index: HouseIndex;
  readonly name: string;
  readonly monthDisplayName: string;
  readonly hasSun: boolean;
}

export interface SunDisplayInfo {
  readonly position: CentidegreePosition;
  readonly houseIndex: HouseIndex;
  readonly houseName: string;
}

export interface PlanetDisplayInfo {
  readonly planetId: MovablePlanetId;
  readonly arcStart: CentidegreePosition;
  readonly arcLength: number;
  readonly occupiedHouses: readonly HouseIndex[];
  readonly occupiedHouseNames: readonly string[];
}

export interface ConjunctionDisplayInfo {
  readonly bodyA: CelestialBodyId;
  readonly bodyB: CelestialBodyId;
  readonly sharedHouseNames: readonly string[];
}

export interface OrreryDisplayModel {
  readonly houses: readonly HouseDisplayInfo[];
  readonly sun: SunDisplayInfo;
  readonly planets: readonly PlanetDisplayInfo[];
  readonly conjunctions: readonly ConjunctionDisplayInfo[];
  readonly monthOrdinal: MonthOrdinal;
  readonly monthDisplayName: string;
}

export function buildOrreryDisplayModel(
  monthOrdinal: MonthOrdinal,
  planetPositions: Readonly<Record<MovablePlanetId, CentidegreePosition>>,
): OrreryDisplayModel {
  const sunHouseIndex = sunHouse(monthOrdinal);
  const sunPos = sunPositionFromMonthOrdinal(monthOrdinal);

  const houses: HouseDisplayInfo[] = [];
  for (let h = 0; h < 12; h++) {
    const hi = h as HouseIndex;
    const monthIndex = monthOfYearIndexFromOrdinal(hi);
    houses.push({
      index: hi,
      name: HOUSE_NAMES[hi],
      monthDisplayName: MONTH_DISPLAY_NAMES[monthIndex],
      hasSun: hi === sunHouseIndex,
    });
  }

  const planets: PlanetDisplayInfo[] = MOVABLE_PLANET_IDS.map((planetId) => {
    const arcStart = planetPositions[planetId];
    const def = PLANET_DEFINITIONS[planetId];
    const occupiedHouses = housesOccupiedByBody(planetId, arcStart);
    return {
      planetId,
      arcStart,
      arcLength: def.arcCentidegrees,
      occupiedHouses,
      occupiedHouseNames: occupiedHouses.map((h) => HOUSE_NAMES[h]),
    };
  });

  const occupancies = computeAllOccupancies(planetPositions, monthOrdinal);
  const conjunctions = computeConjunctions(occupancies);

  const conjunctionDisplay: ConjunctionDisplayInfo[] = conjunctions.map((c) => ({
    bodyA: c.bodyA,
    bodyB: c.bodyB,
    sharedHouseNames: c.sharedHouses.map((h) => HOUSE_NAMES[h]),
  }));

  const monthIndex = monthOfYearIndexFromOrdinal(monthOrdinal);

  return {
    houses,
    sun: {
      position: sunPos,
      houseIndex: sunHouseIndex,
      houseName: HOUSE_NAMES[sunHouseIndex],
    },
    planets,
    conjunctions: conjunctionDisplay,
    monthOrdinal,
    monthDisplayName: MONTH_DISPLAY_NAMES[monthIndex],
  };
}

export function centidegreesToSvgAngle(centidegrees: number): number {
  return (centidegrees / FULL_CIRCLE_CENTIDEGREES) * 360;
}

export function arcSvgAngles(
  arcStart: CentidegreePosition,
  arcLength: number,
): { startAngle: number; endAngle: number; largeArc: boolean } {
  const startAngle = centidegreesToSvgAngle(arcStart);
  const endAngle = centidegreesToSvgAngle(arcStart + arcLength);
  const largeArc = arcLength > FULL_CIRCLE_CENTIDEGREES / 2;
  return { startAngle, endAngle, largeArc };
}
