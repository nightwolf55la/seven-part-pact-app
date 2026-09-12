import {
  EMPTY_MARINER_STATE,
  MARINER_ARRANGEMENT_DEFINITIONS,
  MARINER_BOARD_ISLE_DEFINITIONS,
  MARINER_BOARD_ISLE_IDS,
  MARINER_BUILTIN_BEAST_DEFINITIONS,
  MARINER_EXTERNAL_LAND_DEFINITIONS,
  MARINER_LAW_OF_SEA_DEFINITIONS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_DEFINITIONS,
  PACT_SEAT_IDS,
  isValidMarinerArrangementId,
  isValidMarinerBuiltinBeastId,
  isValidMarinerLawOfSeaId,
  marinerArrangementDefinition,
  pactSeatDisplayName,
  type ElementId,
  type MarinerArrangementId,
  type MarinerBeastCondition,
  type MarinerBeastLocation,
  type MarinerBeastState,
  type MarinerBoardIsleId,
  type MarinerBuiltinBeastId,
  type MarinerExternalLandId,
  type MarinerIsleMarket,
  type MarinerLawOfSeaId,
  type MarinerRouteEndpoint,
  type MarinerRouteOccupancy,
  type MarinerSeaRegionId,
  type MarinerState,
  type PactSeatId,
  type PowerfulDenizenProfile,
  type SorcererExternalPresence,
  type UpdateMarinerBeastFields,
  denizenHasBuiltinTaxonomy,
  profileHasStandardRampagingMethod,
  powerfulStatusLabel,
} from "../shared/domain";
import type { PlaceRef } from "./WorldSurface";

export {
  MARINER_BOARD_ISLE_MAP_POINTS,
  MARINER_DOMAIN_PRESENCE_ANCHOR,
  MARINER_EXTERNAL_LAND_GEOMETRY,
  MARINER_EXTERNAL_LAND_MAP_POINTS,
  MARINER_ISLE_GEOMETRY,
  MARINER_MAP_FRAME,
  MARINER_MAP_MIN_WIDTH_PX,
  MARINER_MAP_VIEWBOX,
  MARINER_ROUTE_GEOMETRY,
  MARINER_ROUTE_HIT_STROKE_WIDTH,
  MARINER_SEA_GEOMETRY,
  MARINER_SEA_REGION_MAP_POINTS,
  mapEndpointPoint,
  marinerExternalLandGeometry,
  marinerIsleGeometry,
  marinerRouteGeometry,
  marinerSeaGeometry,
  raiderDirectionDeg,
  type MapEllipse,
  type MapPoint,
  type MarinerExternalLandGeometry,
  type MarinerIsleGeometry,
  type MarinerRouteGeometry,
  type MarinerSeaGeometry,
} from "./mariner-map-geometry";

export interface NamedDenizen {
  readonly denizenId: string;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly powerfulProfile?: PowerfulDenizenProfile | null;
}

export interface NamedIsle {
  readonly isleId: string;
  readonly name: string;
}

export interface NamedPlace {
  readonly placeId: string;
  readonly name: string;
  readonly placement?: PlaceRef["placement"];
}

export type MarinerIsleBindings = Partial<Record<MarinerBoardIsleId, string>>;

export function isMarinerInitialized(mariner: Pick<MarinerState, keyof MarinerState>): boolean {
  return (
    mariner.shipPlaceId !== EMPTY_MARINER_STATE.shipPlaceId ||
    mariner.selectedLawOfSeaIds.length > 0 ||
    mariner.boardIsles.length > 0 ||
    mariner.routes.length > 0 ||
    mariner.seaRegions.length > 0 ||
    mariner.beasts.length > 0
  );
}

export function newCommandId(uuid: string = crypto.randomUUID()): string {
  return `cmd_${uuid}`;
}

export function boardIsleDisplayName(boardIsleId: MarinerBoardIsleId): string {
  return MARINER_BOARD_ISLE_DEFINITIONS.find((d) => d.boardIsleId === boardIsleId)?.displayName ?? boardIsleId;
}

export function externalLandDisplayName(externalLandId: MarinerExternalLandId): string {
  return MARINER_EXTERNAL_LAND_DEFINITIONS.find((d) => d.externalLandId === externalLandId)?.displayName ?? externalLandId;
}

export function seaRegionDisplayName(regionId: MarinerSeaRegionId): string {
  return MARINER_SEA_REGION_DEFINITIONS.find((d) => d.regionId === regionId)?.displayName ?? regionId;
}

export function worldIsleName(isles: readonly NamedIsle[], worldIsleId: string | null): string {
  if (worldIsleId === null) return "Unbound";
  const found = isles.find((isle) => isle.isleId === worldIsleId);
  return found === undefined ? "Unknown Isle" : found.name;
}

export function placeName(places: readonly NamedPlace[], placeId: string | null): string {
  if (placeId === null) return "None";
  const found = places.find((place) => place.placeId === placeId);
  return found === undefined ? "Unknown Place" : found.name;
}

export function denizenName(denizens: readonly NamedDenizen[], denizenId: string): string {
  const found = denizens.find((denizen) => denizen.denizenId === denizenId);
  return found === undefined ? "Unknown Denizen" : found.name;
}

export function boardIsleWorldName(
  mariner: Pick<MarinerState, "boardIsles">,
  isles: readonly NamedIsle[],
  boardIsleId: MarinerBoardIsleId,
): string {
  const slot = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId);
  return slot === undefined ? boardIsleDisplayName(boardIsleId) : worldIsleName(isles, slot.worldIsleId);
}

export function routeEndpointLabel(
  endpoint: MarinerRouteEndpoint,
  mariner: Pick<MarinerState, "boardIsles">,
  isles: readonly NamedIsle[],
): string {
  if (endpoint.kind === "external_land") {
    return externalLandDisplayName(endpoint.externalLandId);
  }
  return boardIsleWorldName(mariner, isles, endpoint.boardIsleId);
}

export function routeOccupancyLabel(
  occupancy: MarinerRouteOccupancy,
  mariner: Pick<MarinerState, "boardIsles">,
  isles: readonly NamedIsle[],
): string {
  if (occupancy.kind === "empty") return "Empty";
  if (occupancy.kind === "ship") return "Ship";
  return `Raider toward ${routeEndpointLabel(occupancy.toward, mariner, isles)}`;
}

export function isTyphoon(stormCount: number): boolean {
  return stormCount >= 2;
}

export function seaRegionStateLabel(stormCount: number): string {
  const typhoon = isTyphoon(stormCount) ? " · Typhoon" : "";
  return `Storms ${stormCount}${typhoon}`;
}

export function stormPiecePresentation(stormCount: number): {
  readonly tokenCount: number;
  readonly typhoon: boolean;
  readonly accessibleCount: string;
} {
  if (stormCount <= 0) {
    return { tokenCount: 0, typhoon: false, accessibleCount: "Storms 0" };
  }
  if (stormCount === 1) {
    return { tokenCount: 1, typhoon: false, accessibleCount: "Storms 1" };
  }
  return {
    tokenCount: Math.min(stormCount, 3),
    typhoon: true,
    accessibleCount: `Storms ${stormCount} · Typhoon`,
  };
}

export function researcherOperationalLabel(operationalThisMonth: boolean): string {
  return operationalThisMonth ? "Working this month" : "Unavailable this month";
}

export function marinerSeaResearchers(
  presence: readonly SorcererExternalPresence[],
  regionId: MarinerSeaRegionId,
): Extract<SorcererExternalPresence, { kind: "researcher" }>[] {
  return presence.filter(
    (entry): entry is Extract<SorcererExternalPresence, { kind: "researcher" }> =>
      entry.kind === "researcher"
      && entry.target.kind === "mariner_sea_region"
      && entry.target.seaRegionId === regionId,
  );
}

export function marinerDomainDisruptiveArcanists(
  presence: readonly SorcererExternalPresence[],
): Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }>[] {
  return presence.filter(
    (entry): entry is Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }> =>
      entry.kind === "disruptive_arcanist" && entry.seatId === "mariner",
  );
}

export function beastsOnIsle(
  beasts: readonly MarinerBeastState[],
  boardIsleId: MarinerBoardIsleId,
): MarinerBeastState[] {
  return beasts.filter((beast) => beast.location.kind === "board_isle" && beast.location.boardIsleId === boardIsleId);
}

export function marinerBeastLocationEqual(a: MarinerBeastLocation, b: MarinerBeastLocation): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "sea_region" && b.kind === "sea_region") return a.regionId === b.regionId;
  if (a.kind === "board_isle" && b.kind === "board_isle") return a.boardIsleId === b.boardIsleId;
  if (a.kind === "other_domain" && b.kind === "other_domain") return a.seatId === b.seatId;
  return a.kind === "off_map" && b.kind === "off_map";
}

export function beastLocationLabel(
  location: MarinerBeastLocation,
  mariner: Pick<MarinerState, "boardIsles">,
  isles: readonly NamedIsle[],
): string {
  if (location.kind === "sea_region") return seaRegionDisplayName(location.regionId);
  if (location.kind === "board_isle") return boardIsleWorldName(mariner, isles, location.boardIsleId);
  if (location.kind === "off_map") return "Beyond Isha";
  return pactSeatDisplayName(location.seatId);
}

export function builtinBeastName(definitionId: MarinerBuiltinBeastId | null): string | null {
  if (definitionId === null) return null;
  return MARINER_BUILTIN_BEAST_DEFINITIONS.find((d) => d.id === definitionId)?.name ?? definitionId;
}

export function builtinBeastElement(definitionId: string): ElementId | null {
  if (!isValidMarinerBuiltinBeastId(definitionId)) return null;
  return MARINER_BUILTIN_BEAST_DEFINITIONS.find((d) => d.id === definitionId)?.element ?? null;
}

export function definitionsMatchingElement(element: ElementId): typeof MARINER_BUILTIN_BEAST_DEFINITIONS {
  return MARINER_BUILTIN_BEAST_DEFINITIONS.filter((d) => d.element === element);
}

export function availableMobileShipPlaces(places: readonly NamedPlace[]): NamedPlace[] {
  return places.filter((place) => place.placement?.kind === "mobile");
}

export function availableIndividualBeastDenizens(
  denizens: readonly NamedDenizen[],
  beasts: readonly MarinerBeastState[],
): NamedDenizen[] {
  const used = new Set(beasts.map((beast) => beast.denizenId as string));
  return denizens.filter((denizen) =>
    denizen.representation === "individual"
    && !used.has(denizen.denizenId)
    && denizenHasBuiltinTaxonomy(denizen, "beast")
    && denizen.powerfulProfile != null,
  );
}

export function denizenHasRampagingMethod(denizen: NamedDenizen | undefined): boolean {
  return denizen?.powerfulProfile != null && profileHasStandardRampagingMethod(denizen.powerfulProfile);
}

export function denizenSharedStatusLabel(denizen: NamedDenizen | undefined): string {
  if (denizen?.powerfulProfile == null) return "unset";
  return powerfulStatusLabel(denizen.powerfulProfile.status);
}

export function otherDomainSeatOptions(): PactSeatId[] {
  return PACT_SEAT_IDS.filter((seatId) => seatId !== "mariner");
}

export function nestingBeastsOnIsle(
  beasts: readonly MarinerBeastState[],
  boardIsleId: MarinerBoardIsleId,
): MarinerBeastState[] {
  return beasts.filter(
    (beast) =>
      beast.condition === "friendly_nesting" &&
      beast.location.kind === "board_isle" &&
      beast.location.boardIsleId === boardIsleId,
  );
}

export function beastsInRegion(
  beasts: readonly MarinerBeastState[],
  regionId: MarinerSeaRegionId,
): MarinerBeastState[] {
  return beasts.filter((beast) => beast.location.kind === "sea_region" && beast.location.regionId === regionId);
}

export function marketBeastConflict(
  marketPresent: boolean,
  beasts: readonly MarinerBeastState[],
  boardIsleId: MarinerBoardIsleId,
): boolean {
  return marketPresent && nestingBeastsOnIsle(beasts, boardIsleId).length > 0;
}

export function arrangementSetupSummary(arrangementId: string): string {
  const definition = marinerArrangementDefinition(arrangementId);
  if (definition === undefined) return "";
  const marketNames = definition.marketBoardIsleIds.map(boardIsleDisplayName).join(", ") || "none";
  const stormParts = Object.entries(definition.seaStormCounts).map(
    ([regionId, count]) => `${seaRegionDisplayName(regionId as MarinerSeaRegionId)} ${count}`,
  );
  const ravageParts = Object.entries(definition.isleRavageStormCounts).map(
    ([boardIsleId, count]) => `${boardIsleDisplayName(boardIsleId as MarinerBoardIsleId)} ${count}`,
  );
  const beast = definition.distrustingBeastRegionIds.length === 0
    ? "no starting Beast"
    : `starting Beast in ${definition.distrustingBeastRegionIds.map((id) => seaRegionDisplayName(id)).join(", ")}`;
  const rarity = definition.rarityBoardIsleIds.length === 0
    ? "no starting Rarity"
    : `Rarity required at ${definition.rarityBoardIsleIds.map(boardIsleDisplayName).join(", ")}`;
  return [
    `${definition.displayName}: ${definition.shipRouteIds.length} Ships, ${definition.raiders.length} Raider${definition.raiders.length === 1 ? "" : "s"}.`,
    `Markets: ${marketNames}.`,
    `Sea Storms: ${stormParts.join("; ") || "none"}.`,
    `Isle Ravage: ${ravageParts.join("; ") || "none"}.`,
    `${beast}; ${rarity}.`,
  ].join(" ");
}

export function uniqueSelectedLawIds(ids: readonly string[]): MarinerLawOfSeaId[] {
  const seen = new Set<string>();
  const ordered: MarinerLawOfSeaId[] = [];
  for (const id of ids) {
    if (!isValidMarinerLawOfSeaId(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

export function setupLawsValid(ids: readonly string[]): boolean {
  return uniqueSelectedLawIds(ids).length === 2 && ids.length === 2;
}

export function unresolvedBoardIsleBindings(bindings: MarinerIsleBindings): MarinerBoardIsleId[] {
  return MARINER_BOARD_ISLE_IDS.filter((boardIsleId) => {
    const worldIsleId = bindings[boardIsleId];
    return worldIsleId === undefined || worldIsleId.trim() === "";
  });
}

export function duplicateWorldIsleBindings(bindings: MarinerIsleBindings): string[] {
  const counts = new Map<string, number>();
  for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
    const worldIsleId = bindings[boardIsleId];
    if (worldIsleId === undefined || worldIsleId.trim() === "") continue;
    counts.set(worldIsleId, (counts.get(worldIsleId) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

export function worldIsleOptionsForSlot(
  isles: readonly NamedIsle[],
  bindings: MarinerIsleBindings,
  slotId: MarinerBoardIsleId,
): NamedIsle[] {
  const taken = new Set(
    MARINER_BOARD_ISLE_IDS.filter((id) => id !== slotId)
      .map((id) => bindings[id])
      .filter((id): id is string => id !== undefined && id !== ""),
  );
  return isles.filter((isle) => isle.isleId === bindings[slotId] || !taken.has(isle.isleId));
}

export interface MarinerSetupDraft {
  readonly arrangementId: string;
  readonly selectedLawIds: readonly string[];
  readonly isleBindings: MarinerIsleBindings;
  readonly shipPlaceId: string;
  readonly startingBeastDenizenId: string;
  readonly startingBeastElement: ElementId | "";
  readonly startingBeastDefinitionId: string;
  readonly scuttleportRarity: string;
}

export interface MarinerWizardRef {
  readonly wizardId: string;
  readonly name: string;
  readonly homeIsleId: string | null;
  readonly sanctumPlaceId: string | null;
}

export function arrangementNeedsStartingBeast(arrangementId: string): boolean {
  return arrangementId === "dynamic" || arrangementId === "explosive";
}

export function arrangementNeedsRarity(arrangementId: string): boolean {
  return arrangementId === "explosive";
}

export function shipSanctumMismatch(
  shipPlaceId: string,
  wizard: MarinerWizardRef | null,
): boolean {
  if (wizard === null) return false;
  return wizard.sanctumPlaceId === null || wizard.sanctumPlaceId !== shipPlaceId;
}

export function marinerSetupReady(
  draft: MarinerSetupDraft,
  places: readonly NamedPlace[],
  wizard: MarinerWizardRef | null,
): boolean {
  if (!isValidMarinerArrangementId(draft.arrangementId)) return false;
  if (!setupLawsValid(draft.selectedLawIds)) return false;
  if (unresolvedBoardIsleBindings(draft.isleBindings).length > 0) return false;
  if (duplicateWorldIsleBindings(draft.isleBindings).length > 0) return false;
  const ship = places.find((place) => place.placeId === draft.shipPlaceId);
  if (ship === undefined || ship.placement?.kind !== "mobile") return false;
  if (shipSanctumMismatch(draft.shipPlaceId, wizard)) return false;
  if (arrangementNeedsStartingBeast(draft.arrangementId)) {
    if (draft.startingBeastDenizenId.trim() === "") return false;
    if (draft.startingBeastElement === "") return false;
    if (draft.startingBeastDefinitionId !== "") {
      const element = builtinBeastElement(draft.startingBeastDefinitionId);
      if (element === null || element !== draft.startingBeastElement) return false;
    }
  }
  if (arrangementNeedsRarity(draft.arrangementId) && draft.scuttleportRarity.trim() === "") {
    return false;
  }
  return true;
}

export function buildInitializeMarinerPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly draft: MarinerSetupDraft;
  readonly places: readonly NamedPlace[];
  readonly wizard: MarinerWizardRef | null;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly arrangementId: MarinerArrangementId;
  readonly shipPlaceId: string;
  readonly selectedLawOfSeaIds: MarinerLawOfSeaId[];
  readonly isleBindings: { boardIsleId: MarinerBoardIsleId; worldIsleId: string }[];
  readonly arrangementBeasts: MarinerBeastState[];
  readonly rarityDescriptions: { boardIsleId: MarinerBoardIsleId; description: string }[];
} | null {
  if (!marinerSetupReady(args.draft, args.places, args.wizard)) return null;
  const arrangementId = args.draft.arrangementId as MarinerArrangementId;
  const arrangementBeasts: MarinerBeastState[] = arrangementNeedsStartingBeast(arrangementId)
    ? [{
        denizenId: args.draft.startingBeastDenizenId as MarinerBeastState["denizenId"],
        element: args.draft.startingBeastElement as ElementId,
        definitionId: args.draft.startingBeastDefinitionId === ""
          ? null
          : args.draft.startingBeastDefinitionId as MarinerBuiltinBeastId,
        condition: "distrusting",
        location: { kind: "sea_region", regionId: "sunken_fleet" },
      }]
    : [];
  const rarityDescriptions = arrangementNeedsRarity(arrangementId)
    ? [{ boardIsleId: "scuttleport" as const, description: args.draft.scuttleportRarity.trim() }]
    : [];
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    arrangementId,
    shipPlaceId: args.draft.shipPlaceId,
    selectedLawOfSeaIds: uniqueSelectedLawIds(args.draft.selectedLawIds),
    isleBindings: MARINER_BOARD_ISLE_IDS.map((boardIsleId) => ({
      boardIsleId,
      worldIsleId: args.draft.isleBindings[boardIsleId]!,
    })),
    arrangementBeasts,
    rarityDescriptions,
  };
}

export function buildSetMarinerShipPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedShipPlaceId: string;
  readonly shipPlaceId: string;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedShipPlaceId: string;
  readonly shipPlaceId: string;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedShipPlaceId: args.expectedShipPlaceId,
    shipPlaceId: args.shipPlaceId,
  };
}

export function buildSetSelectedSeaLawsPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedSelectedLawOfSeaIds: readonly string[];
  readonly selectedLawIds: readonly string[];
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedSelectedLawOfSeaIds: string[];
  readonly selectedLawOfSeaIds: MarinerLawOfSeaId[];
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedSelectedLawOfSeaIds: [...args.expectedSelectedLawOfSeaIds],
    selectedLawOfSeaIds: uniqueSelectedLawIds(args.selectedLawIds),
  };
}

export function buildSetMarinerRouteOccupancyPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly routeId: string;
  readonly expectedOccupancy: MarinerRouteOccupancy;
  readonly occupancy: MarinerRouteOccupancy;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly routeId: string;
  readonly expectedOccupancy: MarinerRouteOccupancy;
  readonly occupancy: MarinerRouteOccupancy;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    routeId: args.routeId,
    expectedOccupancy: args.expectedOccupancy,
    occupancy: args.occupancy,
  };
}

export function buildSetMarinerSeaStormCountPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly regionId: string;
  readonly expectedStormCount: number;
  readonly stormCount: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly regionId: string;
  readonly expectedStormCount: number;
  readonly stormCount: number;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    regionId: args.regionId,
    expectedStormCount: args.expectedStormCount,
    stormCount: args.stormCount,
  };
}

export function buildSetMarinerIsleMarketPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly boardIsleId: string;
  readonly expectedMarket: MarinerIsleMarket;
  readonly market: MarinerIsleMarket;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly boardIsleId: string;
  readonly expectedMarket: MarinerIsleMarket;
  readonly market: MarinerIsleMarket;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    boardIsleId: args.boardIsleId,
    expectedMarket: args.expectedMarket,
    market: args.market,
  };
}

export function buildSetMarinerIsleRavagePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly boardIsleId: string;
  readonly expectedRavageStormCount: number;
  readonly ravageStormCount: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly boardIsleId: string;
  readonly expectedRavageStormCount: number;
  readonly ravageStormCount: number;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    boardIsleId: args.boardIsleId,
    expectedRavageStormCount: args.expectedRavageStormCount,
    ravageStormCount: args.ravageStormCount,
  };
}

export function buildAddMarinerBeastPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly beast: MarinerBeastState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly element: ElementId;
  readonly definitionId: MarinerBuiltinBeastId | null;
  readonly condition: MarinerBeastCondition;
  readonly location: MarinerBeastLocation;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.beast.denizenId,
    element: args.beast.element,
    definitionId: args.beast.definitionId,
    condition: args.beast.condition,
    location: args.beast.location,
  };
}

export function buildUpdateMarinerBeastFields(
  current: MarinerBeastState,
  next: Pick<MarinerBeastState, "element" | "definitionId" | "condition" | "location">,
): UpdateMarinerBeastFields | null {
  const fields: {
    element?: UpdateMarinerBeastFields["element"];
    definitionId?: UpdateMarinerBeastFields["definitionId"];
    condition?: UpdateMarinerBeastFields["condition"];
    location?: UpdateMarinerBeastFields["location"];
  } = {};
  if (current.element !== next.element) {
    fields.element = { expected: current.element, value: next.element };
  }
  if (current.definitionId !== next.definitionId) {
    fields.definitionId = { expected: current.definitionId, value: next.definitionId };
  }
  if (current.condition !== next.condition) {
    fields.condition = { expected: current.condition, value: next.condition };
  }
  if (!marinerBeastLocationEqual(current.location, next.location)) {
    fields.location = { expected: current.location, value: next.location };
  }
  return Object.keys(fields).length === 0 ? null : fields;
}

export function buildUpdateMarinerBeastPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly fields: UpdateMarinerBeastFields;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly fields: UpdateMarinerBeastFields;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.denizenId,
    fields: args.fields,
  };
}

export function buildRemoveMarinerBeastPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedBeast: MarinerBeastState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedBeast: MarinerBeastState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.denizenId,
    expectedBeast: args.expectedBeast,
  };
}

export function parseNonNegInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

export function conditionLabel(condition: MarinerBeastCondition): string {
  if (condition === "distrusting") return "Distrusting";
  if (condition === "friendly_nesting") return "Friendly / Nesting";
  return "Rampaging";
}

export const MARINER_LAW_OPTIONS = MARINER_LAW_OF_SEA_DEFINITIONS;
export const MARINER_ARRANGEMENT_OPTIONS = MARINER_ARRANGEMENT_DEFINITIONS;
export const MARINER_BOARD_SLOTS = MARINER_BOARD_ISLE_DEFINITIONS;
export const MARINER_ROUTE_CATALOG = MARINER_ROUTE_DEFINITIONS;
export const MARINER_SEA_REGION_CATALOG = MARINER_SEA_REGION_DEFINITIONS;
export const MARINER_BEAST_DEFINITIONS = MARINER_BUILTIN_BEAST_DEFINITIONS;
export const MARINER_ELEMENTS: readonly ElementId[] = ["air", "fire", "earth", "water"];
