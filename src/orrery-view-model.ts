import type { MonthOrdinal } from "../shared/domain/calendar";
import {
  monthOfYearIndexFromOrdinal,
  MONTH_DISPLAY_NAMES,
} from "../shared/domain/calendar";
import {
  HOUSE_NAMES,
  HOUSE_WIDTH_CENTIDEGREES,
  sunPositionFromMonthOrdinal,
  sunHouse,
  computeAllOccupancies,
  computeConjunctions,
  PLANET_DEFINITIONS,
  MOVABLE_PLANET_IDS,
  CELESTIAL_BODY_IDS,
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

export function sunDisplayPosition(monthOrdinal: MonthOrdinal): CentidegreePosition {
  const authoritative = sunPositionFromMonthOrdinal(monthOrdinal);
  const centered = authoritative + HOUSE_WIDTH_CENTIDEGREES / 2;
  return (centered % FULL_CIRCLE_CENTIDEGREES) as CentidegreePosition;
}

export function sunDisplaySvgAngle(monthOrdinal: MonthOrdinal): number {
  return centidegreesToSvgAngle(sunDisplayPosition(monthOrdinal));
}

export function bodiesConjunctWith(
  conjunctions: readonly ConjunctionDisplayInfo[],
  bodyId: CelestialBodyId,
): readonly CelestialBodyId[] {
  const result: CelestialBodyId[] = [];
  for (const c of conjunctions) {
    if (c.bodyA === bodyId) {
      result.push(c.bodyB);
    } else if (c.bodyB === bodyId) {
      result.push(c.bodyA);
    }
  }
  return result;
}

export function occupiedHousesOfBody(
  model: OrreryDisplayModel,
  bodyId: CelestialBodyId,
): readonly HouseIndex[] {
  if (bodyId === "sun") {
    return [model.sun.houseIndex];
  }
  const planet = model.planets.find((pi) => pi.planetId === bodyId);
  if (!planet) return [];
  return [...planet.occupiedHouses];
}

export interface BodyConjunctionSummaryEntry {
  readonly otherBodyId: CelestialBodyId;
  readonly otherBodyName: string;
  readonly sharedHouseNames: readonly string[];
}

export interface BodyHoverSummary {
  readonly bodyId: CelestialBodyId;
  readonly bodyName: string;
  readonly occupiedHouseNames: readonly string[];
  readonly conjunctions: readonly BodyConjunctionSummaryEntry[];
}

const BODY_DISPLAY_NAMES: Record<CelestialBodyId, string> = {
  sun: "Sun",
  saturn: "Saturn",
  jupiter: "Jupiter",
  mars: "Mars",
  venus: "Venus",
  mercury: "Mercury",
};

export function buildBodyHoverSummary(
  model: OrreryDisplayModel,
  bodyId: CelestialBodyId,
): BodyHoverSummary {
  const occupiedHouses = occupiedHousesOfBody(model, bodyId);
  const occupiedHouseNames = occupiedHouses.map((h) => HOUSE_NAMES[h]);

  const conjunctions: BodyConjunctionSummaryEntry[] = [];
  for (const c of model.conjunctions) {
    if (c.bodyA === bodyId) {
      conjunctions.push({
        otherBodyId: c.bodyB,
        otherBodyName: BODY_DISPLAY_NAMES[c.bodyB],
        sharedHouseNames: c.sharedHouseNames,
      });
    } else if (c.bodyB === bodyId) {
      conjunctions.push({
        otherBodyId: c.bodyA,
        otherBodyName: BODY_DISPLAY_NAMES[c.bodyA],
        sharedHouseNames: c.sharedHouseNames,
      });
    }
  }

  return {
    bodyId,
    bodyName: BODY_DISPLAY_NAMES[bodyId],
    occupiedHouseNames,
    conjunctions,
  };
}

export interface BodyConjunctionPartner {
  readonly otherBodyId: CelestialBodyId;
  readonly otherBodyName: string;
  readonly sharedHouseNames: readonly string[];
}

export interface BodyIndexedConjunctionEntry {
  readonly bodyId: CelestialBodyId;
  readonly bodyName: string;
  readonly partners: readonly BodyConjunctionPartner[];
}

export function buildBodyIndexedConjunctionReference(
  model: OrreryDisplayModel,
): readonly BodyIndexedConjunctionEntry[] {
  const result: BodyIndexedConjunctionEntry[] = [];

  for (const bodyId of CELESTIAL_BODY_IDS) {
    const partners: BodyConjunctionPartner[] = [];
    for (const c of model.conjunctions) {
      if (c.bodyA === bodyId) {
        partners.push({
          otherBodyId: c.bodyB,
          otherBodyName: BODY_DISPLAY_NAMES[c.bodyB],
          sharedHouseNames: c.sharedHouseNames,
        });
      } else if (c.bodyB === bodyId) {
        partners.push({
          otherBodyId: c.bodyA,
          otherBodyName: BODY_DISPLAY_NAMES[c.bodyA],
          sharedHouseNames: c.sharedHouseNames,
        });
      }
    }
    result.push({
      bodyId,
      bodyName: BODY_DISPLAY_NAMES[bodyId],
      partners,
    });
  }

  return result;
}
