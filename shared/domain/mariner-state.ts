import type { DenizenId, IsleId, PlaceId } from "./ids";
import type { ElementId } from "./shared-world";
import type {
  MarinerBoardIsleId,
  MarinerBuiltinBeastId,
  MarinerLawOfSeaId,
  MarinerRouteEndpoint,
  MarinerRouteId,
  MarinerSeaRegionId,
} from "./mariner-catalogs";
import {
  MARINER_BOARD_ISLE_IDS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_IDS,
} from "./mariner-catalogs";

export type MarinerIsleMarket =
  | { readonly present: false }
  | { readonly present: true; readonly rarity: string | null };

export interface MarinerBoardIsleState {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly worldIsleId: IsleId;
  readonly market: MarinerIsleMarket;
  readonly ravageStormCount: number;
}

/**
 * APPLICATION DESIGN: each Route has exactly one occupancy slot.
 * SOURCE: a Route may be empty, hold a normal Ship, or hold a directional Raider Ship.
 */
export type MarinerRouteOccupancy =
  | { readonly kind: "empty" }
  | { readonly kind: "ship" }
  | { readonly kind: "raider"; readonly toward: MarinerRouteEndpoint };

export interface MarinerRouteState {
  readonly routeId: MarinerRouteId;
  readonly occupancy: MarinerRouteOccupancy;
}

export interface MarinerSeaRegionState {
  readonly regionId: MarinerSeaRegionId;
  readonly stormCount: number;
}

export type MarinerBeastCondition = "distrusting" | "friendly_nesting" | "rampaging";

/**
 * Location is separate from condition. Sea-map Beast locations use the same
 * region identity as Storm state. Off-map / other-Domain location is permitted.
 */
export type MarinerBeastLocation =
  | { readonly kind: "sea_region"; readonly regionId: MarinerSeaRegionId }
  | { readonly kind: "board_isle"; readonly boardIsleId: MarinerBoardIsleId }
  | { readonly kind: "off_map" };

export interface MarinerBeastState {
  readonly denizenId: DenizenId;
  readonly element: ElementId;
  readonly definitionId: MarinerBuiltinBeastId | null;
  readonly condition: MarinerBeastCondition;
  readonly location: MarinerBeastLocation;
}

export interface MarinerState {
  readonly shipPlaceId: PlaceId | null;
  readonly selectedLawOfSeaIds: readonly MarinerLawOfSeaId[];
  readonly boardIsles: readonly MarinerBoardIsleState[];
  readonly routes: readonly MarinerRouteState[];
  readonly seaRegions: readonly MarinerSeaRegionState[];
  readonly beasts: readonly MarinerBeastState[];
}

export const EMPTY_MARINER_STATE: MarinerState = {
  shipPlaceId: null,
  selectedLawOfSeaIds: [],
  boardIsles: [],
  routes: [],
  seaRegions: [],
  beasts: [],
};

export interface InitializedDefaultMarinerInput {
  readonly shipPlaceId: PlaceId;
  readonly worldIsleIds: Readonly<Record<MarinerBoardIsleId, IsleId>>;
  readonly selectedLawOfSeaIds?: readonly MarinerLawOfSeaId[];
  readonly beasts?: readonly MarinerBeastState[];
  readonly boardIsleOverrides?: Readonly<Partial<Record<MarinerBoardIsleId, Partial<MarinerBoardIsleState>>>>;
  readonly routeOccupancy?: Readonly<Partial<Record<MarinerRouteId, MarinerRouteOccupancy>>>;
  readonly seaStormCounts?: Readonly<Partial<Record<MarinerSeaRegionId, number>>>;
}

export function buildInitializedDefaultMarinerState(
  input: InitializedDefaultMarinerInput,
): MarinerState {
  return {
    shipPlaceId: input.shipPlaceId,
    selectedLawOfSeaIds: input.selectedLawOfSeaIds ?? [],
    boardIsles: MARINER_BOARD_ISLE_IDS.map((boardIsleId) => {
      const override = input.boardIsleOverrides?.[boardIsleId];
      return {
        boardIsleId,
        worldIsleId: input.worldIsleIds[boardIsleId],
        market: override?.market ?? { present: false },
        ravageStormCount: override?.ravageStormCount ?? 0,
      };
    }),
    routes: MARINER_ROUTE_DEFINITIONS.map((definition) => ({
      routeId: definition.routeId,
      occupancy: input.routeOccupancy?.[definition.routeId] ?? { kind: "empty" },
    })),
    seaRegions: MARINER_SEA_REGION_IDS.map((regionId) => ({
      regionId,
      stormCount: input.seaStormCounts?.[regionId] ?? 0,
    })),
    beasts: input.beasts ?? [],
  };
}
