/**
 * Static Mariner map presentation for the fixed Draft-4 Isha board.
 *
 * Geometry is presentation only. Adjacency, Route endpoints, Sea relationships,
 * Raider direction, and piece locations come from catalogs/state, never from
 * these coordinates.
 *
 * Source: Patreon Materials [04.26.04].pptx Slide 14 / slideLayout7,
 * distilled into a 1000x1000 SVG frame. PowerPoint object names are not IDs.
 */

import {
  MARINER_BOARD_ISLE_IDS,
  MARINER_EXTERNAL_LAND_IDS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_IDS,
  marinerRouteDefinition,
  marinerRouteEndpointsEqual,
  type MarinerBoardIsleId,
  type MarinerExternalLandId,
  type MarinerRouteEndpoint,
  type MarinerSeaRegionId,
} from "../shared/domain";

export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

export interface MapEllipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly rotate?: number;
}

export interface MarinerIsleTokenSlots {
  readonly market: MapPoint;
  readonly ravage: MapPoint;
  readonly beast: MapPoint;
}

export interface MarinerIsleGeometry {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly shapes: readonly MapEllipse[];
  readonly hit: MapEllipse;
  readonly label: MapPoint;
  readonly slots: MarinerIsleTokenSlots;
}

export interface MarinerRouteGeometry {
  readonly routeId: string;
  readonly pathD: string;
  readonly pieceAnchor: MapPoint;
  readonly tangentDeg: number;
}

export interface MarinerSeaTokenSlots {
  readonly storm: MapPoint;
  readonly beast: MapPoint;
  readonly researcher: MapPoint;
}

export interface MarinerSeaGeometry {
  readonly regionId: MarinerSeaRegionId;
  readonly hitPath: string;
  readonly label: MapPoint;
  readonly slots: MarinerSeaTokenSlots;
}

export interface MarinerExternalLandGeometry {
  readonly externalLandId: MarinerExternalLandId;
  readonly pathD: string;
  readonly label: MapPoint;
}

export const MARINER_MAP_VIEWBOX = { width: 1000, height: 1000 } as const;
export const MARINER_MAP_MIN_WIDTH_PX = 720;
export const MARINER_ROUTE_HIT_STROKE_WIDTH = 18;
export const MARINER_MAP_FRAME = { cx: 500, cy: 500, r: 420 } as const;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

function offset(point: MapPoint, dx: number, dy: number): MapPoint {
  return { x: point.x + dx, y: point.y + dy };
}

function isle(
  boardIsleId: MarinerBoardIsleId,
  shapes: readonly MapEllipse[],
  hit: MapEllipse,
  label: MapPoint,
): MarinerIsleGeometry {
  return {
    boardIsleId,
    shapes,
    hit,
    label,
    slots: {
      market: offset({ x: hit.cx, y: hit.cy }, 16, -10),
      ravage: { x: hit.cx, y: hit.cy },
      beast: offset({ x: hit.cx, y: hit.cy }, -16, 12),
    },
  };
}

function sea(
  regionId: MarinerSeaRegionId,
  label: MapPoint,
  rx: number,
  ry: number,
): MarinerSeaGeometry {
  return {
    regionId,
    hitPath: ellipsePath(label.x, label.y, rx, ry),
    label,
    slots: {
      storm: offset(label, 0, -20),
      beast: offset(label, 18, 12),
      researcher: offset(label, -20, 14),
    },
  };
}

function land(externalLandId: MarinerExternalLandId, label: MapPoint, w: number, h: number): MarinerExternalLandGeometry {
  const x = label.x - w / 2;
  const y = label.y - h / 2;
  return {
    externalLandId,
    pathD: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
    label,
  };
}

function route(
  routeId: string,
  pathD: string,
  pieceAnchor: MapPoint,
  tangentDeg: number,
): MarinerRouteGeometry {
  return { routeId, pathD, pieceAnchor, tangentDeg };
}

export const MARINER_ISLE_GEOMETRY: readonly MarinerIsleGeometry[] = [
  isle("ishana", [
    { cx: 676, cy: 536, rx: 25, ry: 48 },
    { cx: 679, cy: 488, rx: 25, ry: 34 },
    { cx: 662, cy: 445, rx: 25, ry: 19 },
    { cx: 604, cy: 563, rx: 25, ry: 35 },
    { cx: 652, cy: 588, rx: 22, ry: 35 },
    { cx: 665, cy: 561, rx: 33, ry: 27, rotate: -33 },
    { cx: 690, cy: 514, rx: 33, ry: 57, rotate: -50 },
  ], { cx: 656, cy: 530, rx: 70, ry: 85 }, { x: 656, y: 547 }),
  isle("scuttleport", [
    { cx: 731, cy: 258, rx: 56, ry: 14 },
    { cx: 758, cy: 262, rx: 45, ry: 14 },
    { cx: 748, cy: 290, rx: 36, ry: 14 },
    { cx: 774, cy: 260, rx: 12, ry: 10 },
    { cx: 708, cy: 258, rx: 17, ry: 10 },
  ], { cx: 740, cy: 268, rx: 78, ry: 32 }, { x: 759, y: 283 }),
  isle("orrery", [
    { cx: 253, cy: 490, rx: 18, ry: 16 },
  ], { cx: 260, cy: 495, rx: 22, ry: 20 }, { x: 290, y: 507 }),
  isle("far_reach", [
    { cx: 250, cy: 259, rx: 18, ry: 21 },
    { cx: 225, cy: 292, rx: 12, ry: 18 },
    { cx: 226, cy: 331, rx: 9, ry: 15 },
    { cx: 206, cy: 352, rx: 8, ry: 12 },
  ], { cx: 228, cy: 300, rx: 36, ry: 55 }, { x: 218, y: 299 }),
  isle("halcyon_isles", [
    { cx: 463, cy: 559, rx: 21, ry: 18 },
    { cx: 431, cy: 555, rx: 21, ry: 18 },
    { cx: 445, cy: 578, rx: 15, ry: 18 },
    { cx: 471, cy: 602, rx: 8, ry: 10 },
  ], { cx: 450, cy: 570, rx: 42, ry: 38 }, { x: 447, y: 568 }),
  isle("sage_atoll", [
    { cx: 336, cy: 800, rx: 16, ry: 14 },
  ], { cx: 350, cy: 798, rx: 28, ry: 22 }, { x: 384, y: 797 }),
  isle("graven_isle", [
    { cx: 743, cy: 734, rx: 16, ry: 14 },
  ], { cx: 743, cy: 730, rx: 24, ry: 22 }, { x: 743, y: 709 }),
  isle("tahv", [
    { cx: 572, cy: 679, rx: 16, ry: 20 },
  ], { cx: 572, cy: 679, rx: 22, ry: 24 }, { x: 579, y: 679 }),
  isle("izor", [
    { cx: 854, cy: 529, rx: 16, ry: 14 },
  ], { cx: 845, cy: 525, rx: 22, ry: 20 }, { x: 827, y: 519 }),
  isle("yeraine", [
    { cx: 536, cy: 856, rx: 16, ry: 14 },
  ], { cx: 520, cy: 858, rx: 28, ry: 22 }, { x: 475, y: 860 }),
  isle("koire", [
    { cx: 109, cy: 437, rx: 16, ry: 14 },
  ], { cx: 130, cy: 440, rx: 28, ry: 22 }, { x: 157, y: 445 }),
  isle("thyras", [
    { cx: 482, cy: 153, rx: 16, ry: 14 },
  ], { cx: 500, cy: 148, rx: 26, ry: 22 }, { x: 524, y: 142 }),
  isle("spyrholm", [
    { cx: 186, cy: 649, rx: 22, ry: 21 },
    { cx: 177, cy: 630, rx: 12, ry: 21 },
    { cx: 169, cy: 649, rx: 13, ry: 11 },
  ], { cx: 185, cy: 640, rx: 36, ry: 32 }, { x: 204, y: 635 }),
  isle("druntyr", [
    { cx: 546, cy: 275, rx: 16, ry: 14 },
  ], { cx: 530, cy: 268, rx: 24, ry: 22 }, { x: 498, y: 262 }),
  isle("caravesse", [
    { cx: 393, cy: 423, rx: 16, ry: 14 },
  ], { cx: 410, cy: 425, rx: 24, ry: 20 }, { x: 448, y: 421 }),
];

export const MARINER_ROUTE_GEOMETRY: readonly MarinerRouteGeometry[] = [
  route("ishana__tahv", "M 646 615 Q 608 628 588 662", { x: 617, y: 639 }, 141),
  route("ishana__scuttleport", "M 684 440 Q 736 380 738 300", { x: 711, y: 370 }, -69),
  route("izor__scuttleport", "M 854 523 Q 847 400 772 301", { x: 813, y: 412 }, -110),
  route("ishana__izor", "M 849 534 Q 795 502 733 511", { x: 791, y: 523 }, -169),
  route("izor__ur", "M 860 529 Q 905 544 949 527", { x: 905, y: 528 }, -1),
  route("scuttleport__thyras", "M 693 220 Q 603 152 490 152", { x: 592, y: 186 }, -161),
  route("far_reach__thyras", "M 477 149 Q 356 166 266 248", { x: 372, y: 199 }, 155),
  route("nebelheim__thyras", "M 489 147 Q 488 111 462 87", { x: 476, y: 117 }, -114),
  route("orrery__spyrholm", "M 253 500 Q 201 547 191 616", { x: 222, y: 558 }, 118),
  route("sage_atoll__spyrholm", "M 201 664 Q 239 754 326 798", { x: 264, y: 731 }, 47),
  route("far_reach__orrery", "M 230 343 Q 217 416 253 481", { x: 242, y: 412 }, 81),
  route("druntyr__thyras", "M 481 162 Q 497 228 552 268", { x: 517, y: 215 }, 56),
  route("druntyr__ishana", "M 545 283 Q 564 369 633 424", { x: 589, y: 354 }, 58),
  route("druntyr__scuttleport", "M 701 265 Q 626 243 554 274", { x: 628, y: 270 }, 176),
  route("tahv__yeraine", "M 580 687 Q 525 758 528 847", { x: 554, y: 767 }, 108),
  route("sage_atoll__yeraine", "M 343 807 Q 428 860 528 847", { x: 436, y: 827 }, 12),
  route("graven_isle__izor", "M 750 727 Q 833 649 853 536", { x: 802, y: 632 }, -62),
  route("koire__spyrholm", "M 168 622 Q 174 524 116 444", { x: 142, y: 533 }, -106),
  route("far_reach__koire", "M 204 362 Q 147 380 114 431", { x: 159, y: 397 }, 143),
  route("druj_lands__koire", "M 101 430 Q 65 414 27 425", { x: 64, y: 428 }, -176),
  route("hecares__yeraine", "M 537 867 Q 522 896 535 925", { x: 536, y: 896 }, 92),
  route("graven_isle__ishana", "M 646 615 Q 670 686 734 725", { x: 690, y: 670 }, 51),
  route("graven_isle__yeraine", "M 532 860 Q 651 827 732 733", { x: 632, y: 797 }, -32),
  route("caravesse__halcyon_isles", "M 406 553 Q 421 490 393 432", { x: 400, y: 493 }, -96),
  route("halcyon_isles__ishana", "M 488 561 Q 509 583 539 578", { x: 514, y: 570 }, 18),
  route("halcyon_isles__spyrholm", "M 443 598 Q 313 596 201 664", { x: 322, y: 631 }, 165),
  route("halcyon_isles__tahv", "M 477 608 Q 509 654 563 670", { x: 520, y: 639 }, 36),
  route("caravesse__orrery", "M 386 423 Q 311 434 260 490", { x: 323, y: 457 }, 152),
  route("caravesse__far_reach", "M 388 416 Q 349 322 260 275", { x: 324, y: 346 }, -132),
  route("caravesse__druntyr", "M 398 416 Q 493 371 538 276", { x: 468, y: 346 }, -45),
];

export const MARINER_SEA_GEOMETRY: readonly MarinerSeaGeometry[] = [
  sea("thyrian_sea", { x: 384, y: 269 }, 55, 42),
  sea("ruins_of_old_ishana", { x: 601, y: 213 }, 52, 38),
  sea("sunken_fleet", { x: 289, y: 375 }, 50, 40),
  sea("koiran_reef", { x: 185, y: 498 }, 52, 44),
  sea("scuttle_channel", { x: 650, y: 311 }, 48, 36),
  sea("wizard_strait", { x: 311, y: 577 }, 50, 40),
  sea("bay_of_ishana", { x: 516, y: 465 }, 48, 36),
  sea("devil_sea", { x: 767, y: 418 }, 52, 42),
  sea("kings_gulf", { x: 532, y: 614 }, 42, 32),
  sea("sidereal_sea", { x: 410, y: 717 }, 58, 42),
  sea("wainways", { x: 632, y: 732 }, 48, 36),
  sea("chalk_cliffs", { x: 767, y: 601 }, 48, 36),
  sea("northwest_horizon", { x: 218, y: 219 }, 80, 70),
  sea("northeast_horizon", { x: 793, y: 232 }, 80, 70),
  sea("southeast_horizon", { x: 769, y: 779 }, 80, 70),
  sea("southwest_horizon", { x: 194, y: 747 }, 80, 70),
];

export const MARINER_EXTERNAL_LAND_GEOMETRY: readonly MarinerExternalLandGeometry[] = [
  land("nebelheim", { x: 482, y: 70 }, 120, 36),
  land("druj_lands", { x: 70, y: 457 }, 92, 40),
  land("hecares", { x: 520, y: 920 }, 120, 36),
  land("ur", { x: 951, y: 558 }, 80, 40),
];

export const MARINER_DOMAIN_PRESENCE_ANCHOR: MapPoint = { x: 500, y: 978 };

const ISLE_BY_ID = new Map(MARINER_ISLE_GEOMETRY.map((entry) => [entry.boardIsleId, entry]));
const ROUTE_BY_ID = new Map(MARINER_ROUTE_GEOMETRY.map((entry) => [entry.routeId, entry]));
const SEA_BY_ID = new Map(MARINER_SEA_GEOMETRY.map((entry) => [entry.regionId, entry]));
const LAND_BY_ID = new Map(MARINER_EXTERNAL_LAND_GEOMETRY.map((entry) => [entry.externalLandId, entry]));

export function marinerIsleGeometry(boardIsleId: MarinerBoardIsleId): MarinerIsleGeometry {
  const found = ISLE_BY_ID.get(boardIsleId);
  if (found === undefined) throw new Error(`Missing Isle geometry: ${boardIsleId}`);
  return found;
}

export function marinerRouteGeometry(routeId: string): MarinerRouteGeometry | null {
  return ROUTE_BY_ID.get(routeId) ?? null;
}

export function marinerSeaGeometry(regionId: MarinerSeaRegionId): MarinerSeaGeometry {
  const found = SEA_BY_ID.get(regionId);
  if (found === undefined) throw new Error(`Missing Sea geometry: ${regionId}`);
  return found;
}

export function marinerExternalLandGeometry(externalLandId: MarinerExternalLandId): MarinerExternalLandGeometry {
  const found = LAND_BY_ID.get(externalLandId);
  if (found === undefined) throw new Error(`Missing external land geometry: ${externalLandId}`);
  return found;
}

export const MARINER_BOARD_ISLE_MAP_POINTS: Record<MarinerBoardIsleId, MapPoint> = Object.fromEntries(
  MARINER_ISLE_GEOMETRY.map((entry) => [entry.boardIsleId, { x: entry.hit.cx, y: entry.hit.cy }]),
) as Record<MarinerBoardIsleId, MapPoint>;

export const MARINER_EXTERNAL_LAND_MAP_POINTS: Record<MarinerExternalLandId, MapPoint> = Object.fromEntries(
  MARINER_EXTERNAL_LAND_GEOMETRY.map((entry) => [entry.externalLandId, entry.label]),
) as Record<MarinerExternalLandId, MapPoint>;

export const MARINER_SEA_REGION_MAP_POINTS: Record<MarinerSeaRegionId, MapPoint> = Object.fromEntries(
  MARINER_SEA_GEOMETRY.map((entry) => [entry.regionId, entry.label]),
) as Record<MarinerSeaRegionId, MapPoint>;

export function mapEndpointPoint(endpoint: MarinerRouteEndpoint): MapPoint {
  if (endpoint.kind === "board_isle") return MARINER_BOARD_ISLE_MAP_POINTS[endpoint.boardIsleId];
  return MARINER_EXTERNAL_LAND_MAP_POINTS[endpoint.externalLandId];
}

export function routePresentationPath(routeId: string): {
  readonly a: MapPoint;
  readonly b: MapPoint;
  readonly control: MapPoint | null;
  readonly d: string;
} | null {
  const definition = marinerRouteDefinition(routeId);
  const geometry = marinerRouteGeometry(routeId);
  if (definition === undefined || geometry === null) return null;
  return {
    a: mapEndpointPoint(definition.endpointA),
    b: mapEndpointPoint(definition.endpointB),
    control: geometry.pieceAnchor,
    d: geometry.pathD,
  };
}

export function raiderDirectionDeg(routeId: string, toward: MarinerRouteEndpoint): number {
  const geometry = marinerRouteGeometry(routeId);
  const origin = geometry?.pieceAnchor ?? { x: 500, y: 500 };
  const target = mapEndpointPoint(toward);
  return Math.atan2(target.y - origin.y, target.x - origin.x) * (180 / Math.PI);
}

export function geometryCoverageReport(): {
  readonly missingIsles: readonly MarinerBoardIsleId[];
  readonly extraIsles: readonly string[];
  readonly missingRoutes: readonly string[];
  readonly extraRoutes: readonly string[];
  readonly missingSeas: readonly MarinerSeaRegionId[];
  readonly extraSeas: readonly string[];
  readonly missingLands: readonly MarinerExternalLandId[];
  readonly extraLands: readonly string[];
} {
  const isleIds = new Set(MARINER_ISLE_GEOMETRY.map((entry) => entry.boardIsleId));
  const routeIds = new Set(MARINER_ROUTE_GEOMETRY.map((entry) => entry.routeId));
  const seaIds = new Set(MARINER_SEA_GEOMETRY.map((entry) => entry.regionId));
  const landIds = new Set(MARINER_EXTERNAL_LAND_GEOMETRY.map((entry) => entry.externalLandId));
  return {
    missingIsles: MARINER_BOARD_ISLE_IDS.filter((id) => !isleIds.has(id)),
    extraIsles: MARINER_ISLE_GEOMETRY.map((entry) => entry.boardIsleId).filter(
      (id, index, all) => !MARINER_BOARD_ISLE_IDS.includes(id) || all.indexOf(id) !== index,
    ),
    missingRoutes: MARINER_ROUTE_DEFINITIONS.map((route) => route.routeId).filter((id) => !routeIds.has(id)),
    extraRoutes: MARINER_ROUTE_GEOMETRY.map((entry) => entry.routeId).filter(
      (id, index, all) => marinerRouteDefinition(id) === undefined || all.indexOf(id) !== index,
    ),
    missingSeas: MARINER_SEA_REGION_IDS.filter((id) => !seaIds.has(id)),
    extraSeas: MARINER_SEA_GEOMETRY.map((entry) => entry.regionId).filter(
      (id, index, all) => !MARINER_SEA_REGION_IDS.includes(id) || all.indexOf(id) !== index,
    ),
    missingLands: MARINER_EXTERNAL_LAND_IDS.filter((id) => !landIds.has(id)),
    extraLands: MARINER_EXTERNAL_LAND_GEOMETRY.map((entry) => entry.externalLandId).filter(
      (id, index, all) => !MARINER_EXTERNAL_LAND_IDS.includes(id) || all.indexOf(id) !== index,
    ),
  };
}

export function routeGeometryUsesCatalogEndpoints(routeId: string): boolean {
  const definition = marinerRouteDefinition(routeId);
  const geometry = marinerRouteGeometry(routeId);
  if (definition === undefined || geometry === null) return false;
  return (
    marinerRouteEndpointsEqual(definition.endpointA, definition.endpointA)
    && marinerRouteEndpointsEqual(definition.endpointB, definition.endpointB)
    && !("endpointA" in geometry)
    && !("endpointB" in geometry)
  );
}
