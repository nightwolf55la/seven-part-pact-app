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
  applyImmediateShippingHazards,
  beastIsEntirelySurrounded,
  immediateHazardRouteIdsCausedBy,
  isValidMarinerArrangementId,
  selectMarinerIsleLoreContext,
  isValidMarinerBuiltinBeastId,
  isValidMarinerLawOfSeaId,
  marinerArrangementDefinition,
  pactSeatDisplayName,
  type DenizenId,
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
  type PactSeatStatus,
  type PowerfulDenizenProfile,
  type PowerfulDenizenStatus,
  type MarinerIsleLoreContextSelection,
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

export function newDenizenId(uuid: string = crypto.randomUUID()): string {
  return `den_${uuid}`;
}

export function newMethodEntryId(uuid: string = crypto.randomUUID()): string {
  return `pdmth_${uuid}`;
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
export const MARINER_POWERFUL_STATUSES = ["companion", "reliable", "disruptive", "malignant"] as const;

export const CREATE_BEAST_LABEL = "Create Beast";
export const MOVE_STORM_LABEL = "Record Guided Storm Move";
export const MOVE_SHIP_LABEL = "Record Ship Move";
export const NEST_BEAST_LABEL = "Help Beast Nest";
export const RAVAGE_RESULT_LABEL = "Record Ravage Result";
export const WIND_CONFIRMATION_LABEL = "I confirm this move is not against the actual prevailing Wind.";
export const RAVAGE_INCOMPLETE_COPY =
  "Board result recorded. The source Ravage procedure is not complete.";
export const RAVAGE_LORE_FOLLOW_THROUGH =
  "Update, change, or add this Isle's Lore using the contextual Lore panel.";
export const RAVAGE_LOCATION_FOLLOW_THROUGH =
  "Review established locations on this Isle and resolve source-required access or Complication consequences at the table.";
export const RAVAGE_MARKET_ABSORBED_COPY =
  "Board result recorded. The Market absorbed the Ravage; the Isle did not become Ravaged.";
export const NO_LORE_CONTEXT_COPY =
  "No automatic Lore context is available for this Isle. The table must choose a context; another context is not substituted.";

const PACT_SEAT_HOME_BOARD_ISLE: Record<PactSeatId, MarinerBoardIsleId> = {
  necromancer: "graven_isle",
  hierophant: "ishana",
  warlock: "halcyon_isles",
  mariner: "far_reach",
  faustian: "scuttleport",
  sage: "sage_atoll",
  sorcerer: "spyrholm",
};

export function marinerIsleOwnerSeat(boardIsleId: MarinerBoardIsleId): PactSeatId | null {
  const found = (Object.keys(PACT_SEAT_HOME_BOARD_ISLE) as PactSeatId[]).find(
    (seatId) => PACT_SEAT_HOME_BOARD_ISLE[seatId] === boardIsleId,
  );
  return found ?? null;
}

export function marinerIsleLoreSelection(
  boardIsleId: MarinerBoardIsleId,
  pactSeatStatuses: Partial<Record<PactSeatId, PactSeatStatus | null>>,
): MarinerIsleLoreContextSelection | { kind: "no_automatic_context" } {
  const ownerSeatId = marinerIsleOwnerSeat(boardIsleId);
  if (ownerSeatId === null) {
    return { kind: "no_automatic_context" };
  }
  const status = ownerSeatId in pactSeatStatuses ? pactSeatStatuses[ownerSeatId] ?? null : null;
  return selectMarinerIsleLoreContext(ownerSeatId, status);
}

export function distrustingBeastsInRegion(
  beasts: readonly MarinerBeastState[],
  regionId: MarinerSeaRegionId,
): MarinerBeastState[] {
  return beasts.filter(
    (beast) =>
      beast.condition === "distrusting"
      && beast.location.kind === "sea_region"
      && beast.location.regionId === regionId,
  );
}

export function routesBorderingIsle(
  boardIsleId: MarinerBoardIsleId,
): typeof MARINER_ROUTE_DEFINITIONS {
  return MARINER_ROUTE_DEFINITIONS.filter((route) =>
    (route.endpointA.kind === "board_isle" && route.endpointA.boardIsleId === boardIsleId)
    || (route.endpointB.kind === "board_isle" && route.endpointB.boardIsleId === boardIsleId),
  );
}

function regionDefinition(regionId: MarinerSeaRegionId) {
  return MARINER_SEA_REGION_DEFINITIONS.find((definition) => definition.regionId === regionId);
}

export function relevantSeaRegionsFor(regionId: MarinerSeaRegionId): MarinerSeaRegionId[] {
  const definition = regionDefinition(regionId);
  return definition === undefined ? [regionId] : [regionId, ...definition.adjacentRegionIds];
}

export function relevantRoutesForRegion(regionId: MarinerSeaRegionId): string[] {
  const focus = regionDefinition(regionId);
  if (focus === undefined) return [];
  const ids = new Set<string>(focus.boundingRouteIds);
  for (const adjacentId of focus.adjacentRegionIds) {
    const adjacent = regionDefinition(adjacentId);
    if (adjacent === undefined) continue;
    for (const routeId of focus.boundingRouteIds) {
      if (adjacent.boundingRouteIds.includes(routeId)) ids.add(routeId);
    }
  }
  return [...ids];
}

export function captureStormCounts(
  mariner: Pick<MarinerState, "seaRegions">,
  regionIds: readonly MarinerSeaRegionId[],
) {
  return regionIds.map((regionId) => ({
    regionId,
    stormCount: mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0,
  }));
}

export function captureRouteOccupancies(
  mariner: Pick<MarinerState, "routes">,
  routeIds: readonly string[],
) {
  return routeIds.map((routeId) => ({
    routeId,
    occupancy: mariner.routes.find((route) => route.routeId === routeId)?.occupancy ?? { kind: "empty" as const },
  }));
}

export function captureRelevantBeasts(
  mariner: Pick<MarinerState, "beasts">,
  regionIds: readonly MarinerSeaRegionId[],
) {
  const relevant = new Set(regionIds);
  return mariner.beasts
    .filter((beast) => beast.location.kind === "sea_region" && relevant.has(beast.location.regionId))
    .map((beast) => ({ denizenId: beast.denizenId, location: beast.location }));
}

export function captureRelevantBeastStates(
  mariner: Pick<MarinerState, "beasts">,
  regionIds: readonly MarinerSeaRegionId[],
) {
  const relevant = new Set(regionIds);
  return mariner.beasts
    .filter((beast) => beast.location.kind === "sea_region" && relevant.has(beast.location.regionId))
    .map((beast) => ({
      denizenId: beast.denizenId,
      location: beast.location,
      condition: beast.condition,
    }));
}

export function createBeastWouldRampage(
  mariner: Pick<MarinerState, "seaRegions" | "beasts" | "routes">,
  regionId: MarinerSeaRegionId,
): boolean {
  const previewBeasts = [
    ...mariner.beasts,
    {
      denizenId: "den_00000000-0000-0000-0000-0000000000ff" as DenizenId,
      element: "water" as const,
      definitionId: null,
      condition: "distrusting" as const,
      location: { kind: "sea_region" as const, regionId },
    },
  ];
  const board = { seaRegions: mariner.seaRegions, beasts: previewBeasts };
  const hazards = applyImmediateShippingHazards(
    mariner.routes,
    immediateHazardRouteIdsCausedBy(board, { focusRegionIds: [regionId] }),
  );
  return beastIsEntirelySurrounded(regionId, hazards.routes);
}

export function occupiedRoutesBorderingIsle(
  mariner: Pick<MarinerState, "routes">,
  boardIsleId: MarinerBoardIsleId,
) {
  return routesBorderingIsle(boardIsleId).filter((definition) => {
    const occupancy = mariner.routes.find((route) => route.routeId === definition.routeId)?.occupancy;
    return occupancy?.kind === "ship" || occupancy?.kind === "raider";
  });
}

export type MarinerOperabilityBoardSnapshot = Pick<MarinerState, "seaRegions" | "routes" | "beasts" | "boardIsles">;

export function captureOperabilityBoard(mariner: MarinerOperabilityBoardSnapshot): MarinerOperabilityBoardSnapshot {
  return {
    seaRegions: mariner.seaRegions.map((region) => ({ ...region })),
    routes: mariner.routes.map((route) => ({ ...route, occupancy: route.occupancy })),
    beasts: mariner.beasts.map((beast) => ({ ...beast, location: beast.location })),
    boardIsles: mariner.boardIsles.map((isle) => ({ ...isle, market: isle.market })),
  };
}

function uniqueRegionIds(regionIds: readonly MarinerSeaRegionId[]): MarinerSeaRegionId[] {
  return [...new Set(regionIds)];
}

function regionsBoundingRoute(routeId: string): MarinerSeaRegionId[] {
  return MARINER_SEA_REGION_DEFINITIONS
    .filter((definition) => definition.boundingRouteIds.includes(routeId as never))
    .map((definition) => definition.regionId);
}

export function expectedForCreateBeast(board: MarinerOperabilityBoardSnapshot, regionId: MarinerSeaRegionId) {
  const regionIds = relevantSeaRegionsFor(regionId);
  return {
    expectedStormCounts: captureStormCounts(board, regionIds),
    expectedRouteOccupancies: captureRouteOccupancies(board, relevantRoutesForRegion(regionId)),
    expectedRelevantBeasts: captureRelevantBeasts(board, regionIds),
  };
}

export function expectedForMoveStorm(
  board: MarinerOperabilityBoardSnapshot,
  sourceRegionId: MarinerSeaRegionId,
  destinationRegionId: MarinerSeaRegionId,
) {
  const regionIds = uniqueRegionIds([sourceRegionId, ...relevantSeaRegionsFor(destinationRegionId)]);
  return {
    expectedStormCounts: captureStormCounts(board, regionIds),
    expectedRouteOccupancies: captureRouteOccupancies(board, relevantRoutesForRegion(destinationRegionId)),
    expectedRelevantBeasts: captureRelevantBeasts(board, regionIds),
  };
}

export function expectedForMoveShip(
  board: MarinerOperabilityBoardSnapshot,
  sourceRouteId: string,
  destinationRouteId: string,
) {
  const regionIds = uniqueRegionIds(
    [...regionsBoundingRoute(sourceRouteId), ...regionsBoundingRoute(destinationRouteId)]
      .flatMap((regionId) => relevantSeaRegionsFor(regionId)),
  );
  const destBoundingRoutes = uniqueRegionIds(regionsBoundingRoute(destinationRouteId))
    .flatMap((regionId) => relevantRoutesForRegion(regionId));
  return {
    expectedSourceOccupancy: board.routes.find((route) => route.routeId === sourceRouteId)?.occupancy
      ?? { kind: "empty" as const },
    expectedDestinationOccupancy: board.routes.find((route) => route.routeId === destinationRouteId)?.occupancy
      ?? { kind: "empty" as const },
    expectedStormCounts: captureStormCounts(board, regionIds),
    expectedRouteOccupancies: captureRouteOccupancies(
      board,
      [...new Set([sourceRouteId, destinationRouteId, ...destBoundingRoutes])],
    ),
    expectedRelevantBeasts: captureRelevantBeastStates(board, regionIds),
    // B2A compile-only: B2B owns real Rampage resolution choices.
    rampageResolutions: [] as {
      denizenId: string;
      destinationSeatId: string;
      rampagingMethodEntryId: string | null;
    }[],
  };
}

export function expectedForNestBeast(
  board: MarinerOperabilityBoardSnapshot,
  denizenId: string,
  boardIsleId: MarinerBoardIsleId,
) {
  const beast = board.beasts.find((candidate) => candidate.denizenId === denizenId);
  const isle = board.boardIsles.find((candidate) => candidate.boardIsleId === boardIsleId);
  const nesting = nestingBeastsOnIsle(board.beasts, boardIsleId)[0];
  return {
    expectedBeastCondition: beast?.condition ?? "distrusting",
    expectedBeastLocation: beast?.location ?? { kind: "sea_region" as const, regionId: "sunken_fleet" as MarinerSeaRegionId },
    expectedMarket: isle?.market ?? { present: false as const },
    expectedRavageStormCount: isle?.ravageStormCount ?? 0,
    expectedNestingBeastDenizenId: nesting?.denizenId ?? null,
  };
}

export function expectedForRavageResult(
  board: MarinerOperabilityBoardSnapshot,
  boardIsleId: MarinerBoardIsleId,
  denizens: readonly { readonly denizenId: string; readonly powerfulProfile?: PowerfulDenizenProfile | null }[],
) {
  const isle = board.boardIsles.find((candidate) => candidate.boardIsleId === boardIsleId);
  const nesting = nestingBeastsOnIsle(board.beasts, boardIsleId)[0] ?? null;
  const profile = nesting === null
    ? null
    : denizens.find((denizen) => denizen.denizenId === nesting.denizenId)?.powerfulProfile ?? null;
  return {
    expectedMarket: isle?.market ?? { present: false as const },
    expectedRavageStormCount: isle?.ravageStormCount ?? 0,
    expectedNestingBeast: nesting === null
      ? null
      : {
          denizenId: nesting.denizenId,
          condition: nesting.condition,
          location: nesting.location,
        },
    expectedPowerfulStatus: profile?.status ?? null,
    expectedPowerfulGoal: profile?.goal ?? null,
    expectedHasRampagingMethod: profile !== null && profileHasStandardRampagingMethod(profile),
  };
}

export function buildCreateMarinerBeastPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: PowerfulDenizenStatus;
  readonly element: ElementId;
  readonly definitionId: MarinerBuiltinBeastId | null;
  readonly regionId: MarinerSeaRegionId;
  readonly expectedStormCounts: ReturnType<typeof captureStormCounts>;
  readonly expectedRouteOccupancies: ReturnType<typeof captureRouteOccupancies>;
  readonly expectedRelevantBeasts: ReturnType<typeof captureRelevantBeasts>;
  readonly rampageDestinationSeatId: PactSeatId | null;
  readonly rampagingMethodEntryId: string | null;
}) {
  return { ...args };
}

export function buildMoveMarinerStormPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly sourceRegionId: MarinerSeaRegionId;
  readonly destinationRegionId: MarinerSeaRegionId;
  readonly confirmedNotAgainstPrevailingWind: boolean;
  readonly expectedStormCounts: ReturnType<typeof captureStormCounts>;
  readonly expectedRouteOccupancies: ReturnType<typeof captureRouteOccupancies>;
  readonly expectedRelevantBeasts: ReturnType<typeof captureRelevantBeasts>;
}) {
  return { ...args };
}

export function buildMoveMarinerShipPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly sourceIsleId: MarinerBoardIsleId;
  readonly sourceRouteId: string;
  readonly destinationRouteId: string;
  readonly destinationToward: MarinerRouteEndpoint | null;
  readonly expectedSourceOccupancy: MarinerRouteOccupancy;
  readonly expectedDestinationOccupancy: MarinerRouteOccupancy;
  readonly expectedStormCounts: ReturnType<typeof captureStormCounts>;
  readonly expectedRouteOccupancies: ReturnType<typeof captureRouteOccupancies>;
  readonly expectedRelevantBeasts: ReturnType<typeof captureRelevantBeastStates>;
  readonly rampageResolutions: {
    denizenId: string;
    destinationSeatId: string;
    rampagingMethodEntryId: string | null;
  }[];
}) {
  return { ...args };
}

export function buildNestMarinerBeastPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly boardIsleId: MarinerBoardIsleId;
  readonly expectedBeastCondition: MarinerBeastCondition;
  readonly expectedBeastLocation: MarinerBeastLocation;
  readonly expectedMarket: MarinerIsleMarket;
  readonly expectedRavageStormCount: number;
  readonly expectedNestingBeastDenizenId: string | null;
}) {
  return { ...args };
}

export function buildRecordMarinerRavageResultPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly boardIsleId: MarinerBoardIsleId;
  readonly expectedMarket: MarinerIsleMarket;
  readonly expectedRavageStormCount: number;
  readonly expectedNestingBeast: {
    readonly denizenId: string;
    readonly condition: MarinerBeastCondition;
    readonly location: MarinerBeastLocation;
  } | null;
  readonly expectedPowerfulStatus: PowerfulDenizenStatus | null;
  readonly expectedPowerfulGoal: string | null;
  readonly expectedHasRampagingMethod: boolean;
  readonly rampageDestinationSeatId: PactSeatId | null;
  readonly rampagingMethodEntryId: string | null;
}) {
  return { ...args };
}
