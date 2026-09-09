import type { ElementId } from "./shared-world";

/**
 * Mariner static source catalogs for the Draft-4 default map.
 *
 * SOURCE: Routes connect board locations; Storms and Beasts inhabit sea-map
 * regions; the Materials map names 15 noteworthy Isles, 12 interior Seas, and
 * four Horizon quadrants.
 *
 * APPLICATION DESIGN: board Isle slots reference shared World Isles; Sage Atoll
 * uses a neutral `sage_atoll` identity because the map labels Starlit Atoll
 * while other source text uses Moonlit Atoll; external lands are Route
 * endpoints, not board Isle slots.
 *
 * DEFERRED: arbitrary/custom topology after Gamechanging Impact.
 */

export const MARINER_BOARD_ISLE_IDS = [
  "ishana",
  "scuttleport",
  "orrery",
  "far_reach",
  "halcyon_isles",
  "sage_atoll",
  "graven_isle",
  "tahv",
  "izor",
  "yeraine",
  "koire",
  "thyras",
  "spyrholm",
  "druntyr",
  "caravesse",
] as const;

export type MarinerBoardIsleId = (typeof MARINER_BOARD_ISLE_IDS)[number];

export const MARINER_EXTERNAL_LAND_IDS = [
  "nebelheim",
  "druj_lands",
  "hecares",
  "ur",
] as const;

export type MarinerExternalLandId = (typeof MARINER_EXTERNAL_LAND_IDS)[number];

export const MARINER_HORIZON_CARDINAL_GROUP_IDS = [
  "north",
  "east",
  "south",
  "west",
] as const;

export type MarinerHorizonCardinalGroupId = (typeof MARINER_HORIZON_CARDINAL_GROUP_IDS)[number];

export const MARINER_HORIZON_REGION_IDS = [
  "northwest_horizon",
  "northeast_horizon",
  "southeast_horizon",
  "southwest_horizon",
] as const;

export type MarinerHorizonRegionId = (typeof MARINER_HORIZON_REGION_IDS)[number];

export const MARINER_INTERIOR_SEA_REGION_IDS = [
  "bay_of_ishana",
  "ruins_of_old_ishana",
  "wizard_strait",
  "sidereal_sea",
  "wainways",
  "chalk_cliffs",
  "devil_sea",
  "scuttle_channel",
  "thyrian_sea",
  "koiran_reef",
  "kings_gulf",
  "sunken_fleet",
] as const;

export type MarinerInteriorSeaRegionId = (typeof MARINER_INTERIOR_SEA_REGION_IDS)[number];

export const MARINER_SEA_REGION_IDS = [
  ...MARINER_INTERIOR_SEA_REGION_IDS,
  ...MARINER_HORIZON_REGION_IDS,
] as const;

export type MarinerSeaRegionId = (typeof MARINER_SEA_REGION_IDS)[number];

export const MARINER_LAW_OF_SEA_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type MarinerLawOfSeaId = (typeof MARINER_LAW_OF_SEA_IDS)[number];

export const MARINER_BUILTIN_BEAST_IDS = [
  "griffin",
  "roc",
  "sphinx",
  "phoenix",
  "chimera",
  "dragon",
  "giant",
  "hydra",
  "behemoth",
  "sea_serpent",
  "kraken",
  "leviathan",
] as const;

export type MarinerBuiltinBeastId = (typeof MARINER_BUILTIN_BEAST_IDS)[number];

export const MARINER_ARRANGEMENT_IDS = ["quiet", "dynamic", "explosive"] as const;

export type MarinerArrangementId = (typeof MARINER_ARRANGEMENT_IDS)[number];

export type MarinerRouteEndpoint =
  | { readonly kind: "board_isle"; readonly boardIsleId: MarinerBoardIsleId }
  | { readonly kind: "external_land"; readonly externalLandId: MarinerExternalLandId };

export type MarinerRouteId = string & { readonly __marinerRouteId: true };

export interface MarinerBoardIsleDefinition {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly displayName: string;
}

export interface MarinerExternalLandDefinition {
  readonly externalLandId: MarinerExternalLandId;
  readonly displayName: string;
  readonly cardinalGroupId: MarinerHorizonCardinalGroupId;
  readonly associatedBoardIsleId: MarinerBoardIsleId;
}

export interface MarinerRouteDefinition {
  readonly routeId: MarinerRouteId;
  readonly endpointA: MarinerRouteEndpoint;
  readonly endpointB: MarinerRouteEndpoint;
}

export interface MarinerInteriorSeaRegionDefinition {
  readonly regionId: MarinerInteriorSeaRegionId;
  readonly kind: "sea";
  readonly displayName: string;
  readonly adjacentBoardIsleIds: readonly MarinerBoardIsleId[];
  readonly adjacentRegionIds: readonly MarinerSeaRegionId[];
  readonly boundingRouteIds: readonly MarinerRouteId[];
}

export interface MarinerHorizonRegionDefinition {
  readonly regionId: MarinerHorizonRegionId;
  readonly kind: "horizon";
  readonly displayName: string;
  readonly cardinalGroupIds: readonly MarinerHorizonCardinalGroupId[];
  readonly adjacentBoardIsleIds: readonly MarinerBoardIsleId[];
  readonly adjacentRegionIds: readonly MarinerSeaRegionId[];
  readonly boundingRouteIds: readonly MarinerRouteId[];
}

export type MarinerSeaRegionDefinition =
  | MarinerInteriorSeaRegionDefinition
  | MarinerHorizonRegionDefinition;

export interface MarinerHorizonCardinalGroupDefinition {
  readonly groupId: MarinerHorizonCardinalGroupId;
  readonly displayName: string;
  readonly regionIds: readonly [MarinerHorizonRegionId, MarinerHorizonRegionId];
  readonly associatedBoardIsleId: MarinerBoardIsleId;
  readonly externalLandId: MarinerExternalLandId;
  readonly crossingRouteId: MarinerRouteId;
}

export interface MarinerLawOfSeaDefinition {
  readonly id: MarinerLawOfSeaId;
  readonly applicationLabel: string;
  /** Draft-4 source Law text. */
  readonly text: string;
}

export interface MarinerBuiltinBeastDefinition {
  readonly id: MarinerBuiltinBeastId;
  readonly name: string;
  readonly element: ElementId;
  readonly text: string;
}

export interface MarinerArrangementRaider {
  readonly routeId: MarinerRouteId;
  /**
   * SOURCE: Quiet, Dynamic, and Explosive place a Scuttleport–Ishana Raider
   * raiding Ishana. Quiet prose omits the verb; matching setup-diagram arrows
   * and Dynamic's explicit "raiding Ishana" fix the direction.
   */
  readonly toward: MarinerRouteEndpoint;
}

export interface MarinerArrangementDefinition {
  readonly arrangementId: MarinerArrangementId;
  readonly displayName: string;
  readonly shipRouteIds: readonly MarinerRouteId[];
  readonly raiders: readonly MarinerArrangementRaider[];
  readonly marketBoardIsleIds: readonly MarinerBoardIsleId[];
  readonly rarityBoardIsleIds: readonly MarinerBoardIsleId[];
  readonly seaStormCounts: Readonly<Partial<Record<MarinerSeaRegionId, number>>>;
  readonly isleRavageStormCounts: Readonly<Partial<Record<MarinerBoardIsleId, number>>>;
  readonly distrustingBeastRegionIds: readonly MarinerSeaRegionId[];
}

const BOARD_ISLE_DISPLAY_NAMES: Record<MarinerBoardIsleId, string> = {
  ishana: "Ishana",
  scuttleport: "Scuttleport",
  orrery: "Orrery",
  far_reach: "Far Reach",
  halcyon_isles: "Halcyon Isles",
  /** Neutral application name; map: Starlit Atoll; other source: Moonlit Atoll. */
  sage_atoll: "Sage Atoll",
  graven_isle: "Graven Isle",
  tahv: "Tahv",
  izor: "Izor",
  yeraine: "Yeraine",
  koire: "Koirë",
  thyras: "Thyras",
  spyrholm: "Spyrholm",
  druntyr: "Druntyr",
  caravesse: "Caravesse",
};

export const MARINER_BOARD_ISLE_DEFINITIONS: readonly MarinerBoardIsleDefinition[] =
  MARINER_BOARD_ISLE_IDS.map((boardIsleId) => ({
    boardIsleId,
    displayName: BOARD_ISLE_DISPLAY_NAMES[boardIsleId],
  }));

export const MARINER_EXTERNAL_LAND_DEFINITIONS: readonly MarinerExternalLandDefinition[] = [
  {
    externalLandId: "nebelheim",
    displayName: "Nebelheim",
    cardinalGroupId: "north",
    associatedBoardIsleId: "thyras",
  },
  {
    externalLandId: "druj_lands",
    displayName: "The Druj-lands",
    cardinalGroupId: "west",
    associatedBoardIsleId: "koire",
  },
  {
    externalLandId: "hecares",
    displayName: "The Hecares",
    cardinalGroupId: "south",
    associatedBoardIsleId: "yeraine",
  },
  {
    externalLandId: "ur",
    displayName: "Ur",
    cardinalGroupId: "east",
    associatedBoardIsleId: "izor",
  },
];

function endpointKey(endpoint: MarinerRouteEndpoint): string {
  return endpoint.kind === "board_isle" ? endpoint.boardIsleId : endpoint.externalLandId;
}

export function marinerRouteId(a: MarinerRouteEndpoint, b: MarinerRouteEndpoint): MarinerRouteId {
  const keys = [endpointKey(a), endpointKey(b)].sort();
  return `${keys[0]}__${keys[1]}` as MarinerRouteId;
}

function board(boardIsleId: MarinerBoardIsleId): MarinerRouteEndpoint {
  return { kind: "board_isle", boardIsleId };
}

function land(externalLandId: MarinerExternalLandId): MarinerRouteEndpoint {
  return { kind: "external_land", externalLandId };
}

function route(a: MarinerRouteEndpoint, b: MarinerRouteEndpoint): MarinerRouteDefinition {
  return { routeId: marinerRouteId(a, b), endpointA: a, endpointB: b };
}

/**
 * Complete Draft-4 default Route topology transcribed from the Materials map
 * vector connectors (slideLayout7), not from setup-arrangement prose.
 */
export const MARINER_ROUTE_DEFINITIONS: readonly MarinerRouteDefinition[] = [
  route(board("thyras"), land("nebelheim")),
  route(board("thyras"), board("far_reach")),
  route(board("thyras"), board("druntyr")),
  route(board("thyras"), board("scuttleport")),
  route(board("far_reach"), board("orrery")),
  route(board("far_reach"), board("koire")),
  route(board("far_reach"), board("caravesse")),
  route(board("koire"), land("druj_lands")),
  route(board("koire"), board("spyrholm")),
  route(board("orrery"), board("spyrholm")),
  route(board("orrery"), board("caravesse")),
  route(board("spyrholm"), board("sage_atoll")),
  route(board("spyrholm"), board("halcyon_isles")),
  route(board("sage_atoll"), board("yeraine")),
  route(board("yeraine"), land("hecares")),
  route(board("yeraine"), board("tahv")),
  route(board("yeraine"), board("graven_isle")),
  route(board("tahv"), board("ishana")),
  route(board("tahv"), board("halcyon_isles")),
  route(board("graven_isle"), board("ishana")),
  route(board("graven_isle"), board("izor")),
  route(board("izor"), land("ur")),
  route(board("izor"), board("ishana")),
  route(board("izor"), board("scuttleport")),
  route(board("ishana"), board("scuttleport")),
  route(board("ishana"), board("halcyon_isles")),
  route(board("ishana"), board("druntyr")),
  route(board("scuttleport"), board("druntyr")),
  route(board("druntyr"), board("caravesse")),
  route(board("caravesse"), board("halcyon_isles")),
];

export const MARINER_ROUTE_IDS: readonly MarinerRouteId[] = MARINER_ROUTE_DEFINITIONS.map((d) => d.routeId);

const ROUTE_BY_ID = new Map(MARINER_ROUTE_DEFINITIONS.map((d) => [d.routeId, d]));

export function marinerRouteDefinition(routeId: string): MarinerRouteDefinition | undefined {
  return ROUTE_BY_ID.get(routeId as MarinerRouteId);
}

function rid(a: MarinerRouteEndpoint, b: MarinerRouteEndpoint): MarinerRouteId {
  return marinerRouteId(a, b);
}

export const MARINER_HORIZON_CARDINAL_GROUPS: readonly MarinerHorizonCardinalGroupDefinition[] = [
  {
    groupId: "north",
    displayName: "Northern Horizon",
    regionIds: ["northwest_horizon", "northeast_horizon"],
    associatedBoardIsleId: "thyras",
    externalLandId: "nebelheim",
    crossingRouteId: rid(board("thyras"), land("nebelheim")),
  },
  {
    groupId: "east",
    displayName: "Eastern Horizon",
    regionIds: ["northeast_horizon", "southeast_horizon"],
    associatedBoardIsleId: "izor",
    externalLandId: "ur",
    crossingRouteId: rid(board("izor"), land("ur")),
  },
  {
    groupId: "south",
    displayName: "Southern Horizon",
    regionIds: ["southeast_horizon", "southwest_horizon"],
    associatedBoardIsleId: "yeraine",
    externalLandId: "hecares",
    crossingRouteId: rid(board("yeraine"), land("hecares")),
  },
  {
    groupId: "west",
    displayName: "Western Horizon",
    regionIds: ["northwest_horizon", "southwest_horizon"],
    associatedBoardIsleId: "koire",
    externalLandId: "druj_lands",
    crossingRouteId: rid(board("koire"), land("druj_lands")),
  },
];

export const MARINER_SEA_REGION_DEFINITIONS: readonly MarinerSeaRegionDefinition[] = [
  {
    regionId: "thyrian_sea",
    kind: "sea",
    displayName: "The Thyrian Sea",
    adjacentBoardIsleIds: ["far_reach", "thyras", "druntyr", "caravesse"],
    adjacentRegionIds: ["ruins_of_old_ishana", "sunken_fleet", "bay_of_ishana", "northwest_horizon"],
    boundingRouteIds: [
      rid(board("far_reach"), board("thyras")),
      rid(board("thyras"), board("druntyr")),
      rid(board("druntyr"), board("caravesse")),
      rid(board("caravesse"), board("far_reach")),
    ],
  },
  {
    regionId: "ruins_of_old_ishana",
    kind: "sea",
    displayName: "Ruins of Old Ishana",
    adjacentBoardIsleIds: ["druntyr", "thyras", "scuttleport"],
    adjacentRegionIds: ["thyrian_sea", "scuttle_channel", "northeast_horizon"],
    boundingRouteIds: [
      rid(board("druntyr"), board("thyras")),
      rid(board("thyras"), board("scuttleport")),
      rid(board("scuttleport"), board("druntyr")),
    ],
  },
  {
    regionId: "scuttle_channel",
    kind: "sea",
    displayName: "Scuttle Channel",
    adjacentBoardIsleIds: ["scuttleport", "ishana", "druntyr"],
    adjacentRegionIds: ["ruins_of_old_ishana", "bay_of_ishana", "devil_sea"],
    boundingRouteIds: [
      rid(board("scuttleport"), board("ishana")),
      rid(board("ishana"), board("druntyr")),
      rid(board("druntyr"), board("scuttleport")),
    ],
  },
  {
    regionId: "sunken_fleet",
    kind: "sea",
    displayName: "The Sunken Fleet",
    adjacentBoardIsleIds: ["orrery", "far_reach", "caravesse"],
    adjacentRegionIds: ["thyrian_sea", "koiran_reef", "wizard_strait"],
    boundingRouteIds: [
      rid(board("orrery"), board("far_reach")),
      rid(board("far_reach"), board("caravesse")),
      rid(board("caravesse"), board("orrery")),
    ],
  },
  {
    regionId: "koiran_reef",
    kind: "sea",
    displayName: "Koiran Reef",
    adjacentBoardIsleIds: ["far_reach", "orrery", "spyrholm", "koire"],
    adjacentRegionIds: ["sunken_fleet", "wizard_strait", "northwest_horizon", "southwest_horizon"],
    boundingRouteIds: [
      rid(board("far_reach"), board("orrery")),
      rid(board("orrery"), board("spyrholm")),
      rid(board("spyrholm"), board("koire")),
      rid(board("koire"), board("far_reach")),
    ],
  },
  {
    regionId: "wizard_strait",
    kind: "sea",
    displayName: "Wizard's Strait",
    adjacentBoardIsleIds: ["spyrholm", "orrery", "caravesse", "halcyon_isles"],
    adjacentRegionIds: ["sunken_fleet", "koiran_reef", "bay_of_ishana", "sidereal_sea"],
    boundingRouteIds: [
      rid(board("spyrholm"), board("orrery")),
      rid(board("orrery"), board("caravesse")),
      rid(board("caravesse"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("spyrholm")),
    ],
  },
  {
    regionId: "bay_of_ishana",
    kind: "sea",
    displayName: "Bay of Ishana",
    adjacentBoardIsleIds: ["ishana", "halcyon_isles", "caravesse", "druntyr"],
    adjacentRegionIds: ["thyrian_sea", "scuttle_channel", "wizard_strait", "kings_gulf"],
    boundingRouteIds: [
      rid(board("ishana"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("caravesse")),
      rid(board("caravesse"), board("druntyr")),
      rid(board("druntyr"), board("ishana")),
    ],
  },
  {
    regionId: "kings_gulf",
    kind: "sea",
    displayName: "King's Gulf",
    adjacentBoardIsleIds: ["ishana", "tahv", "halcyon_isles"],
    adjacentRegionIds: ["bay_of_ishana", "sidereal_sea", "wainways"],
    boundingRouteIds: [
      rid(board("ishana"), board("tahv")),
      rid(board("tahv"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("ishana")),
    ],
  },
  {
    regionId: "sidereal_sea",
    kind: "sea",
    displayName: "The Sidereal Sea",
    adjacentBoardIsleIds: ["sage_atoll", "spyrholm", "halcyon_isles", "tahv", "yeraine"],
    adjacentRegionIds: ["wizard_strait", "kings_gulf", "wainways", "southwest_horizon"],
    boundingRouteIds: [
      rid(board("sage_atoll"), board("spyrholm")),
      rid(board("spyrholm"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("tahv")),
      rid(board("tahv"), board("yeraine")),
      rid(board("yeraine"), board("sage_atoll")),
    ],
  },
  {
    regionId: "wainways",
    kind: "sea",
    displayName: "The Wainways",
    adjacentBoardIsleIds: ["yeraine", "tahv", "ishana", "graven_isle"],
    adjacentRegionIds: ["kings_gulf", "sidereal_sea", "chalk_cliffs", "southeast_horizon"],
    boundingRouteIds: [
      rid(board("yeraine"), board("tahv")),
      rid(board("tahv"), board("ishana")),
      rid(board("ishana"), board("graven_isle")),
      rid(board("graven_isle"), board("yeraine")),
    ],
  },
  {
    regionId: "chalk_cliffs",
    kind: "sea",
    displayName: "The Chalk Cliffs",
    adjacentBoardIsleIds: ["graven_isle", "ishana", "izor"],
    adjacentRegionIds: ["wainways", "devil_sea", "southeast_horizon"],
    boundingRouteIds: [
      rid(board("graven_isle"), board("ishana")),
      rid(board("ishana"), board("izor")),
      rid(board("izor"), board("graven_isle")),
    ],
  },
  {
    regionId: "devil_sea",
    kind: "sea",
    displayName: "The Devil's Sea",
    adjacentBoardIsleIds: ["izor", "ishana", "scuttleport"],
    adjacentRegionIds: ["scuttle_channel", "chalk_cliffs", "northeast_horizon"],
    boundingRouteIds: [
      rid(board("izor"), board("ishana")),
      rid(board("ishana"), board("scuttleport")),
      rid(board("scuttleport"), board("izor")),
    ],
  },
  {
    regionId: "northwest_horizon",
    kind: "horizon",
    displayName: "Northwest Horizon",
    cardinalGroupIds: ["north", "west"],
    adjacentBoardIsleIds: ["thyras", "far_reach", "koire"],
    adjacentRegionIds: ["northeast_horizon", "southwest_horizon", "thyrian_sea", "koiran_reef"],
    boundingRouteIds: [
      rid(board("thyras"), land("nebelheim")),
      rid(board("thyras"), board("far_reach")),
      rid(board("far_reach"), board("koire")),
      rid(board("koire"), land("druj_lands")),
    ],
  },
  {
    regionId: "northeast_horizon",
    kind: "horizon",
    displayName: "Northeast Horizon",
    cardinalGroupIds: ["north", "east"],
    adjacentBoardIsleIds: ["thyras", "scuttleport", "izor"],
    adjacentRegionIds: ["northwest_horizon", "southeast_horizon", "ruins_of_old_ishana", "devil_sea"],
    boundingRouteIds: [
      rid(board("thyras"), land("nebelheim")),
      rid(board("thyras"), board("scuttleport")),
      rid(board("scuttleport"), board("izor")),
      rid(board("izor"), land("ur")),
    ],
  },
  {
    regionId: "southeast_horizon",
    kind: "horizon",
    displayName: "Southeast Horizon",
    cardinalGroupIds: ["south", "east"],
    adjacentBoardIsleIds: ["yeraine", "graven_isle", "izor"],
    adjacentRegionIds: ["northeast_horizon", "southwest_horizon", "wainways", "chalk_cliffs"],
    boundingRouteIds: [
      rid(board("izor"), land("ur")),
      rid(board("izor"), board("graven_isle")),
      rid(board("graven_isle"), board("yeraine")),
      rid(board("yeraine"), land("hecares")),
    ],
  },
  {
    regionId: "southwest_horizon",
    kind: "horizon",
    displayName: "Southwest Horizon",
    cardinalGroupIds: ["south", "west"],
    adjacentBoardIsleIds: ["koire", "spyrholm", "sage_atoll", "yeraine"],
    adjacentRegionIds: ["northwest_horizon", "southeast_horizon", "koiran_reef", "sidereal_sea"],
    boundingRouteIds: [
      rid(board("koire"), land("druj_lands")),
      rid(board("koire"), board("spyrholm")),
      rid(board("spyrholm"), board("sage_atoll")),
      rid(board("sage_atoll"), board("yeraine")),
      rid(board("yeraine"), land("hecares")),
    ],
  },
];

const LAW_APPLICATION_LABELS: Record<MarinerLawOfSeaId, string> = {
  first: "First Law of the Sea",
  second: "Second Law of the Sea",
  third: "Third Law of the Sea",
  fourth: "Fourth Law of the Sea",
  fifth: "Fifth Law of the Sea",
  sixth: "Sixth Law of the Sea",
  seventh: "Seventh Law of the Sea",
};

const LAW_SOURCE_TEXT: Record<MarinerLawOfSeaId, string> = {
  first: "Never let a woman walk around aboard a ship, for she'll bring bad luck.",
  second: "Always sing to the ship each morning and each night, so she'll keep steady.",
  third: "Never set sail without first shedding blood upon the ship.",
  fourth: "Never speak of drowning or wish another goodbye aboard a ship, for it will bring what is spoken of.",
  fifth: "Never kill a bird while sailing, for their presence brings wisdom from the gods.",
  sixth: "Never whistle aboard a boat, for the nereids find it annoying.",
  seventh: "Always sail with a cat aboard, for good fortune.",
};

export const MARINER_LAW_OF_SEA_DEFINITIONS: readonly MarinerLawOfSeaDefinition[] =
  MARINER_LAW_OF_SEA_IDS.map((id) => ({
    id,
    applicationLabel: LAW_APPLICATION_LABELS[id],
    text: LAW_SOURCE_TEXT[id],
  }));

export const MARINER_BUILTIN_BEAST_DEFINITIONS: readonly MarinerBuiltinBeastDefinition[] = [
  {
    id: "griffin",
    name: "Griffin",
    element: "air",
    text: "Howling bird with lion's claws, pouncing upon the weakest of the herd, before leaping up into the air once more.",
  },
  {
    id: "roc",
    name: "Roc",
    element: "air",
    text: "Oh lord of mighty mountains, devourer of cattle, caravan-robber, that with wings wide enough to blot out the sun.",
  },
  {
    id: "sphinx",
    name: "Sphinx",
    element: "air",
    text: "Riddle-speaker, beauty from a distant land, with honeyed words and hypnotic grace.",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    element: "fire",
    text: "Shining bird with boiling feathers, king of the storm and the hearth, never truly dying, reborn from ashes.",
  },
  {
    id: "chimera",
    name: "Chimera",
    element: "fire",
    text: "Monster born from ancient magic, a lion roaring breath of flame, devil's goat butting from its shoulders.",
  },
  {
    id: "dragon",
    name: "Dragon",
    element: "fire",
    text: "Great king of beasts, lord of ancient days.",
  },
  {
    id: "giant",
    name: "Giant",
    element: "earth",
    text: "Man of stone with claylike visage, each hand as large as a village, skin which no blade may pierce.",
  },
  {
    id: "hydra",
    name: "Hydra",
    element: "earth",
    text: "A hundred snakes writhe atop its body, scrabbling claws and sturdy scales, dripping poison from its countless mouths.",
  },
  {
    id: "behemoth",
    name: "Behemoth",
    element: "earth",
    text: "Lumbering beast of apocalypse, king of the earth.",
  },
  {
    id: "sea_serpent",
    name: "Sea Serpent",
    element: "water",
    text: "Slithering coils which wrap around the earth, a starving maw filled with countless teeth, rotting poison pouring from its gullet.",
  },
  {
    id: "kraken",
    name: "Kraken",
    element: "water",
    text: "From the deepest sea the kraken emerges, tendrils lashing out at the waves, calling whirlpools to its command.",
  },
  {
    id: "leviathan",
    name: "Leviathan",
    element: "water",
    text: "An isle emerges from beneath the sea, covered in moss, stirring it to action.",
  },
];

const HORIZON_SHIP_ROUTE_IDS = [
  rid(board("thyras"), land("nebelheim")),
  rid(board("koire"), land("druj_lands")),
  rid(board("yeraine"), land("hecares")),
  rid(board("izor"), land("ur")),
] as const;

const WESTERN_SPINE_SHIP_ROUTE_IDS = [
  rid(board("spyrholm"), board("koire")),
  rid(board("spyrholm"), board("orrery")),
  rid(board("spyrholm"), board("sage_atoll")),
  rid(board("koire"), board("far_reach")),
  rid(board("far_reach"), board("thyras")),
] as const;

export const MARINER_ARRANGEMENT_DEFINITIONS: readonly MarinerArrangementDefinition[] = [
  {
    arrangementId: "quiet",
    displayName: "Quiet Arrangement",
    shipRouteIds: [
      ...HORIZON_SHIP_ROUTE_IDS,
      ...WESTERN_SPINE_SHIP_ROUTE_IDS,
      rid(board("caravesse"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("ishana")),
      rid(board("halcyon_isles"), board("tahv")),
      rid(board("ishana"), board("tahv")),
      rid(board("ishana"), board("graven_isle")),
      rid(board("scuttleport"), board("druntyr")),
      rid(board("scuttleport"), board("izor")),
    ],
    raiders: [{ routeId: rid(board("scuttleport"), board("ishana")), toward: board("ishana") }],
    marketBoardIsleIds: ["scuttleport"],
    rarityBoardIsleIds: [],
    seaStormCounts: { sidereal_sea: 1, bay_of_ishana: 1 },
    isleRavageStormCounts: {},
    distrustingBeastRegionIds: [],
  },
  {
    arrangementId: "dynamic",
    displayName: "Dynamic Arrangement",
    shipRouteIds: [
      ...HORIZON_SHIP_ROUTE_IDS,
      ...WESTERN_SPINE_SHIP_ROUTE_IDS,
      rid(board("caravesse"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("tahv")),
      rid(board("tahv"), board("ishana")),
      rid(board("ishana"), board("graven_isle")),
      rid(board("ishana"), board("izor")),
      rid(board("scuttleport"), board("druntyr")),
      rid(board("scuttleport"), board("izor")),
    ],
    raiders: [
      { routeId: rid(board("scuttleport"), board("ishana")), toward: board("ishana") },
      { routeId: rid(board("halcyon_isles"), board("ishana")), toward: board("ishana") },
    ],
    marketBoardIsleIds: ["scuttleport", "halcyon_isles"],
    rarityBoardIsleIds: [],
    seaStormCounts: { sidereal_sea: 1, bay_of_ishana: 1, devil_sea: 1 },
    isleRavageStormCounts: {},
    distrustingBeastRegionIds: ["sunken_fleet"],
  },
  {
    arrangementId: "explosive",
    displayName: "Explosive Arrangement",
    shipRouteIds: [
      rid(board("koire"), land("druj_lands")),
      rid(board("yeraine"), land("hecares")),
      rid(board("izor"), land("ur")),
      ...WESTERN_SPINE_SHIP_ROUTE_IDS,
      rid(board("caravesse"), board("halcyon_isles")),
      rid(board("halcyon_isles"), board("tahv")),
      rid(board("tahv"), board("ishana")),
      rid(board("ishana"), board("graven_isle")),
      rid(board("ishana"), board("izor")),
      rid(board("scuttleport"), board("druntyr")),
      rid(board("scuttleport"), board("izor")),
    ],
    raiders: [
      { routeId: rid(board("scuttleport"), board("ishana")), toward: board("ishana") },
      { routeId: rid(board("halcyon_isles"), board("ishana")), toward: board("ishana") },
      { routeId: rid(board("thyras"), land("nebelheim")), toward: board("thyras") },
    ],
    marketBoardIsleIds: ["scuttleport", "halcyon_isles"],
    rarityBoardIsleIds: ["scuttleport"],
    seaStormCounts: {
      sidereal_sea: 1,
      bay_of_ishana: 1,
      devil_sea: 1,
      wainways: 1,
      koiran_reef: 1,
      thyrian_sea: 1,
    },
    isleRavageStormCounts: { druntyr: 6 },
    distrustingBeastRegionIds: ["sunken_fleet"],
  },
];

export function isValidMarinerBoardIsleId(value: string): value is MarinerBoardIsleId {
  return (MARINER_BOARD_ISLE_IDS as readonly string[]).includes(value);
}

export function isValidMarinerExternalLandId(value: string): value is MarinerExternalLandId {
  return (MARINER_EXTERNAL_LAND_IDS as readonly string[]).includes(value);
}

export function isValidMarinerSeaRegionId(value: string): value is MarinerSeaRegionId {
  return (MARINER_SEA_REGION_IDS as readonly string[]).includes(value);
}

export function isValidMarinerHorizonRegionId(value: string): value is MarinerHorizonRegionId {
  return (MARINER_HORIZON_REGION_IDS as readonly string[]).includes(value);
}

export function isValidMarinerLawOfSeaId(value: string): value is MarinerLawOfSeaId {
  return (MARINER_LAW_OF_SEA_IDS as readonly string[]).includes(value);
}

export function isValidMarinerBuiltinBeastId(value: string): value is MarinerBuiltinBeastId {
  return (MARINER_BUILTIN_BEAST_IDS as readonly string[]).includes(value);
}

export function isValidMarinerArrangementId(value: string): value is MarinerArrangementId {
  return (MARINER_ARRANGEMENT_IDS as readonly string[]).includes(value);
}

export function marinerArrangementDefinition(
  arrangementId: string,
): MarinerArrangementDefinition | undefined {
  return MARINER_ARRANGEMENT_DEFINITIONS.find((d) => d.arrangementId === arrangementId);
}

export function isValidMarinerRouteId(value: string): value is MarinerRouteId {
  return ROUTE_BY_ID.has(value as MarinerRouteId);
}

export function marinerRouteEndpointsEqual(a: MarinerRouteEndpoint, b: MarinerRouteEndpoint): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "board_isle" && b.kind === "board_isle") {
    return a.boardIsleId === b.boardIsleId;
  }
  if (a.kind === "external_land" && b.kind === "external_land") {
    return a.externalLandId === b.externalLandId;
  }
  return false;
}

export function marinerRouteHasEndpoint(
  definition: MarinerRouteDefinition,
  endpoint: MarinerRouteEndpoint,
): boolean {
  return (
    marinerRouteEndpointsEqual(definition.endpointA, endpoint) ||
    marinerRouteEndpointsEqual(definition.endpointB, endpoint)
  );
}
