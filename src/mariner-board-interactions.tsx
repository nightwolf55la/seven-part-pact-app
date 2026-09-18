import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  MARINER_BOARD_ISLE_IDS,
  createUndescribedRareMarinerMarket,
  isReservedMarinerRarityDescriptionInput,
  marinerMarketHasUndescribedRarity,
  type ElementId,
  type MarinerBeastState,
  type MarinerBoardIsleId,
  type MarinerIsleMarket,
  type MarinerRampageResolution,
  type MarinerRouteEndpoint,
  type MarinerRouteOccupancy,
  type MarinerSeaRegionId,
  type MarinerState,
  type PactSeatId,
} from "../shared/domain";
import { pactSeatDisplayName } from "../shared/domain";
import {
  MARINER_ELEMENTS,
  MARINER_SEA_REGION_CATALOG,
  availableIndividualBeastDenizens,
  boardIsleWorldName,
  buildAddMarinerBeastPayload,
  buildCreateMarinerShipPayload,
  buildMoveMarinerBeastPayload,
  buildMoveMarinerMarketPayload,
  buildMoveMarinerShipPayload,
  buildMoveMarinerStormPayload,
  buildNestMarinerBeastPayload,
  buildRelocateMarinerNestingBeastPayload,
  buildRemoveMarinerBeastPayload,
  buildSetMarinerIsleMarketPayload,
  buildSetMarinerRouteOccupancyPayload,
  buildSetMarinerSeaStormCountPayload,
  captureOperabilityBoard,
  definitionsMatchingElement,
  denizenName,
  expectedForCreateShip,
  expectedForMoveBeast,
  expectedForMoveMarket,
  expectedForMoveShip,
  expectedForMoveStorm,
  expectedForNestBeast,
  expectedForRelocateNestingBeastToIsle,
  expectedForRelocateNestingBeastToSea,
  marinerRarityEditorPrefill,
  nestingBeastsOnIsle,
  newCommandId,
  newMethodEntryId,
  otherDomainSeatOptions,
  predictedMovedBeastWouldRampage,
  predictedNewlyTrappedBeastIdsAfterShipPlacement,
  routeEndpointLabel,
  seaRegionDisplayName,
  MARINER_ROUTE_CATALOG,
} from "./mariner-view-model";
import type { WorldReference } from "./WorldSurface";
import { marinerSeaOperationalView } from "./mariner-operational-view";
import {
  endpointKey,
  findIsleDropId,
  findRouteDropId,
  findSeaDropRegionId,
  isEmptyRoute,
  oppositeRouteEndpoint,
  pointerMovementExceedsDragThreshold,
  raiderTowardAppliesOnRoute,
  representableRaiderEndpoints,
  routeOccupancyAt,
  routesShareBoardIsleEndpoint,
} from "./mariner-board-pointer";

type DragKind =
  | "storm"
  | "route-piece"
  | "tray-ship"
  | "tray-raider"
  | "tray-storm"
  | "beast"
  | "tray-market"
  | "tray-rare-market"
  | "board-market";

type DragSession = {
  readonly kind: DragKind;
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly dragging: boolean;
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly sourceRegionId?: MarinerSeaRegionId;
  readonly sourceRouteId?: string;
  readonly sourceOccupancy?: MarinerRouteOccupancy;
  readonly sourceBeast?: MarinerBeastState;
  readonly sourceBoardIsleId?: MarinerBoardIsleId;
  readonly sourceMarket?: MarinerIsleMarket;
};

export type PendingRaiderDirection = {
  readonly destinationRouteId: string;
  readonly choices: readonly MarinerRouteEndpoint[];
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly dropClientX?: number;
  readonly dropClientY?: number;
} & (
  | { readonly action: "move"; readonly sourceRouteId: string }
  | { readonly action: "create" }
  | { readonly action: "replace"; readonly destinationRouteId: string }
);

type PendingPlacementOccupancy =
  | { readonly kind: "ship" }
  | { readonly kind: "raider"; readonly toward: MarinerRouteEndpoint };

export type PendingShipRampage = {
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly predictedBeastIds: readonly string[];
  readonly occupancy: PendingPlacementOccupancy;
} & (
  | { readonly action: "create"; readonly targetRouteId: string }
  | { readonly action: "move"; readonly sourceRouteId: string; readonly destinationRouteId: string }
);

export type BoardDragVisual = {
  readonly kind: DragKind;
  readonly clientX: number;
  readonly clientY: number;
  readonly typhoon: boolean;
  readonly occupancyKind?: "ship" | "raider";
};

export type PendingBeastRampage = {
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly beast: MarinerBeastState;
  readonly destinationRegionId: MarinerSeaRegionId;
  readonly dropClientX?: number;
  readonly dropClientY?: number;
} & (
  | { readonly action: "move"; readonly sourceRegionId: MarinerSeaRegionId }
  | { readonly action: "relocate" }
);

export type PendingBeastAdd = {
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly target:
    | { readonly kind: "sea"; readonly regionId: MarinerSeaRegionId }
    | { readonly kind: "isle"; readonly boardIsleId: MarinerBoardIsleId };
  readonly clientX: number;
  readonly clientY: number;
};

export type PendingRarityEditor = {
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly boardIsleId: MarinerBoardIsleId;
  readonly expectedMarket: MarinerIsleMarket;
  readonly mode: "add" | "edit" | "describe";
  readonly clientX: number;
  readonly clientY: number;
};

export type PendingBeastElsewhereChooser = {
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly beast: MarinerBeastState;
  readonly clientX: number;
  readonly clientY: number;
} & (
  | { readonly kind: "move" | "nest"; readonly sourceRegionId: MarinerSeaRegionId }
  | { readonly kind: "relocate-nest" | "leave-nest" }
);

export type PendingBeastRemove = {
  readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
  readonly beast: MarinerBeastState;
  readonly clientX: number;
  readonly clientY: number;
};

export type BoardContextMenu =
  | {
      readonly kind: "route";
      readonly routeId: string;
      readonly occupancy: MarinerRouteOccupancy;
      readonly clientX: number;
      readonly clientY: number;
      readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
    }
  | {
      readonly kind: "sea";
      readonly regionId: MarinerSeaRegionId;
      readonly stormCount: number;
      readonly clientX: number;
      readonly clientY: number;
      readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
    }
  | {
      readonly kind: "beast";
      readonly beast: MarinerBeastState;
      readonly clientX: number;
      readonly clientY: number;
      readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
    }
  | {
      readonly kind: "isle";
      readonly boardIsleId: MarinerBoardIsleId;
      readonly market: MarinerIsleMarket;
      readonly clientX: number;
      readonly clientY: number;
      readonly snapshot: ReturnType<typeof captureOperabilityBoard>;
    };

function snapshotBeast(beast: MarinerBeastState): MarinerBeastState {
  return { ...beast, location: beast.location };
}

function seaDefinition(regionId: MarinerSeaRegionId) {
  return MARINER_SEA_REGION_CATALOG.find((region) => region.regionId === regionId);
}

function adjacentSeaIds(regionId: MarinerSeaRegionId): readonly MarinerSeaRegionId[] {
  return seaDefinition(regionId)?.adjacentRegionIds ?? [];
}

function adjacentIsleIds(regionId: MarinerSeaRegionId): readonly MarinerBoardIsleId[] {
  return seaDefinition(regionId)?.adjacentBoardIsleIds ?? [];
}

function marketOnSnapshot(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): MarinerIsleMarket {
  return snapshot.boardIsles.find((isle) => isle.boardIsleId === boardIsleId)?.market ?? { present: false };
}

function isleRavageOnSnapshot(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): number {
  return snapshot.boardIsles.find((isle) => isle.boardIsleId === boardIsleId)?.ravageStormCount ?? 0;
}

function isleAcceptsMarket(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): boolean {
  if (marketOnSnapshot(snapshot, boardIsleId).present) return false;
  return nestingBeastsOnIsle(snapshot.beasts, boardIsleId).length === 0;
}

function isleAcceptsNest(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): boolean {
  if (marketOnSnapshot(snapshot, boardIsleId).present) return false;
  if (isleRavageOnSnapshot(snapshot, boardIsleId) > 0) return false;
  return nestingBeastsOnIsle(snapshot.beasts, boardIsleId).length === 0;
}

function nestBlockReason(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): string | null {
  if (marketOnSnapshot(snapshot, boardIsleId).present) return "Market present";
  if (isleRavageOnSnapshot(snapshot, boardIsleId) > 0) return "Ravaged";
  if (nestingBeastsOnIsle(snapshot.beasts, boardIsleId).length > 0) return "Beast already Nesting here";
  return null;
}

function isleHasNestingBeast(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): boolean {
  return nestingBeastsOnIsle(snapshot.beasts, boardIsleId).length > 0;
}

function isleAcceptsOrdinarySupplyMarket(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): boolean {
  if (isleHasNestingBeast(snapshot, boardIsleId)) return false;
  const market = marketOnSnapshot(snapshot, boardIsleId);
  if (!market.present) return true;
  return market.rarity !== null;
}

function isleAcceptsRareSupplyMarket(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): boolean {
  if (isleHasNestingBeast(snapshot, boardIsleId)) return false;
  const market = marketOnSnapshot(snapshot, boardIsleId);
  if (!market.present) return true;
  return market.rarity === null;
}

function isleAcceptsExistingMarketMove(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  sourceBoardIsleId: MarinerBoardIsleId,
  destinationBoardIsleId: MarinerBoardIsleId,
): boolean {
  if (destinationBoardIsleId === sourceBoardIsleId) return false;
  if (marketOnSnapshot(snapshot, destinationBoardIsleId).present) return false;
  return !isleHasNestingBeast(snapshot, destinationBoardIsleId);
}

function isleAcceptsManualBeast(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  boardIsleId: MarinerBoardIsleId,
): boolean {
  return isleAcceptsNest(snapshot, boardIsleId);
}

function isPrimaryPointerButton(event: { button: number }): boolean {
  return event.button === 0;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function stormCountOnSnapshot(
  snapshot: ReturnType<typeof captureOperabilityBoard>,
  regionId: MarinerSeaRegionId,
): number {
  return snapshot.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
}

export function useMarinerBoardInteractions(args: {
  readonly mariner: MarinerState;
  readonly campaignId: string;
  readonly pending: boolean;
  readonly selectedRouteId: string | null;
  readonly selectedRegionId: MarinerSeaRegionId | null;
  readonly run: (action: () => Promise<void>) => Promise<boolean>;
  readonly moveMarinerStorm: (payload: ReturnType<typeof buildMoveMarinerStormPayload>) => Promise<unknown>;
  readonly moveMarinerShip: (payload: ReturnType<typeof buildMoveMarinerShipPayload>) => Promise<unknown>;
  readonly createMarinerShip: (payload: ReturnType<typeof buildCreateMarinerShipPayload>) => Promise<unknown>;
  readonly setMarinerRouteOccupancy: (payload: ReturnType<typeof buildSetMarinerRouteOccupancyPayload>) => Promise<unknown>;
  readonly setMarinerSeaStormCount: (payload: ReturnType<typeof buildSetMarinerSeaStormCountPayload>) => Promise<unknown>;
  readonly moveMarinerBeast: (payload: ReturnType<typeof buildMoveMarinerBeastPayload>) => Promise<unknown>;
  readonly nestMarinerBeast: (payload: ReturnType<typeof buildNestMarinerBeastPayload>) => Promise<unknown>;
  readonly relocateMarinerNestingBeast: (payload: ReturnType<typeof buildRelocateMarinerNestingBeastPayload>) => Promise<unknown>;
  readonly addMarinerBeast: (payload: ReturnType<typeof buildAddMarinerBeastPayload>) => Promise<unknown>;
  readonly removeMarinerBeast: (payload: ReturnType<typeof buildRemoveMarinerBeastPayload>) => Promise<unknown>;
  readonly setMarinerIsleMarket: (payload: ReturnType<typeof buildSetMarinerIsleMarketPayload>) => Promise<unknown>;
  readonly moveMarinerMarket: (payload: ReturnType<typeof buildMoveMarinerMarketPayload>) => Promise<unknown>;
  readonly onSelectRegion: (regionId: MarinerSeaRegionId) => void;
  readonly onSelectRoute: (routeId: string) => void;
  readonly onSelectIsle: (boardIsleId: MarinerBoardIsleId) => void;
  readonly onSelectBeast: (denizenId: string) => void;
}) {
  const {
    mariner,
    campaignId,
    pending,
    selectedRouteId,
    selectedRegionId,
    run,
    moveMarinerStorm,
    moveMarinerShip,
    createMarinerShip,
    setMarinerRouteOccupancy,
    setMarinerSeaStormCount,
    moveMarinerBeast,
    nestMarinerBeast,
    relocateMarinerNestingBeast,
    addMarinerBeast,
    removeMarinerBeast,
    setMarinerIsleMarket,
    moveMarinerMarket,
    onSelectRegion,
    onSelectRoute,
    onSelectIsle,
    onSelectBeast,
  } = args;

  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingActive, setDraggingActive] = useState(false);
  const [dragVisual, setDragVisual] = useState<BoardDragVisual | null>(null);
  const [hoveredSeaId, setHoveredSeaId] = useState<MarinerSeaRegionId | null>(null);
  const [hoveredRouteDropId, setHoveredRouteDropId] = useState<string | null>(null);
  const [hoveredIsleId, setHoveredIsleId] = useState<MarinerBoardIsleId | null>(null);
  const hoveredSeaRef = useRef<MarinerSeaRegionId | null>(null);
  const hoveredRouteRef = useRef<string | null>(null);
  hoveredSeaRef.current = hoveredSeaId;
  hoveredRouteRef.current = hoveredRouteDropId;
  const [pendingRaiderDirection, setPendingRaiderDirection] = useState<PendingRaiderDirection | null>(null);
  const [pendingShipRampage, setPendingShipRampage] = useState<PendingShipRampage | null>(null);
  const [pendingBeastRampage, setPendingBeastRampage] = useState<PendingBeastRampage | null>(null);
  const [pendingBeastAdd, setPendingBeastAdd] = useState<PendingBeastAdd | null>(null);
  const [pendingRarityEditor, setPendingRarityEditor] = useState<PendingRarityEditor | null>(null);
  const [pendingBeastRemove, setPendingBeastRemove] = useState<PendingBeastRemove | null>(null);
  const [pendingBeastElsewhere, setPendingBeastElsewhere] = useState<PendingBeastElsewhereChooser | null>(null);
  const [contextMenu, setContextMenu] = useState<BoardContextMenu | null>(null);
  const contextMenuRef = useRef<BoardContextMenu | null>(null);
  contextMenuRef.current = contextMenu;
  const selectedRouteIdRef = useRef(selectedRouteId);
  selectedRouteIdRef.current = selectedRouteId;
  const selectedRegionIdRef = useRef(selectedRegionId);
  selectedRegionIdRef.current = selectedRegionId;
  const marinerRef = useRef(mariner);
  marinerRef.current = mariner;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const hasPendingDirectIntent = pendingRaiderDirection !== null
    || pendingShipRampage !== null
    || pendingBeastRampage !== null
    || pendingBeastAdd !== null
    || pendingRarityEditor !== null
    || pendingBeastRemove !== null
    || pendingBeastElsewhere !== null;
  const hasPendingDirectIntentRef = useRef(hasPendingDirectIntent);
  hasPendingDirectIntentRef.current = hasPendingDirectIntent;

  const dragKind = draggingActive ? sessionRef.current?.kind ?? null : null;
  const stormDragSourceId = dragKind === "storm"
    ? sessionRef.current?.sourceRegionId ?? null
    : null;
  const routeDragSourceId = dragKind === "route-piece"
    ? sessionRef.current?.sourceRouteId ?? null
    : null;
  const trayRouteDragActive = dragKind === "tray-ship" || dragKind === "tray-raider";
  const trayStormDragActive = dragKind === "tray-storm";
  const beastDragActive = dragKind === "beast";
  const beastDragSourceId = beastDragActive
    ? sessionRef.current?.sourceRegionId ?? null
    : null;
  const beastDragSourceIsleId = beastDragActive
    ? sessionRef.current?.sourceBoardIsleId ?? null
    : null;
  const beastDragDenizenId = beastDragActive
    ? sessionRef.current?.sourceBeast?.denizenId ?? null
    : null;
  const marketDragActive = dragKind === "tray-market" || dragKind === "tray-rare-market" || dragKind === "board-market";

  const recommendedSeaIds = stormDragSourceId === null
    ? (beastDragSourceId === null ? [] : [...adjacentSeaIds(beastDragSourceId)])
    : marinerSeaOperationalView(mariner, stormDragSourceId).adjacentRegionIds;

  const cancelDrag = useCallback(() => {
    sessionRef.current = null;
    setDraggingActive(false);
    setDragVisual(null);
    setHoveredSeaId(null);
    setHoveredRouteDropId(null);
    setHoveredIsleId(null);
  }, []);

  const finishNoOpDrag = useCallback(() => {
    cancelDrag();
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, [cancelDrag]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const isBusy = useCallback((): boolean => (
    pendingRef.current || hasPendingDirectIntentRef.current || sessionRef.current !== null
  ), []);

  const commitStormDrop = useCallback(async (destinationRegionId: MarinerSeaRegionId) => {
    const session = sessionRef.current;
    if (session?.kind !== "storm" || session.sourceRegionId === undefined) return;
    if (destinationRegionId === session.sourceRegionId) {
      finishNoOpDrag();
      return;
    }
    const payload = buildMoveMarinerStormPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      sourceRegionId: session.sourceRegionId,
      destinationRegionId,
      ...expectedForMoveStorm(session.snapshot, session.sourceRegionId, destinationRegionId),
    });
    const ok = await run(async () => { await moveMarinerStorm(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, moveMarinerStorm, run]);

  const commitShipMove = useCallback(async (
    sourceRouteId: string,
    destinationRouteId: string,
    destinationToward: MarinerRouteEndpoint | null,
    snapshot: ReturnType<typeof captureOperabilityBoard>,
  ) => {
    const payload = buildMoveMarinerShipPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      sourceRouteId,
      destinationRouteId,
      destinationToward,
      ...expectedForMoveShip(snapshot, sourceRouteId, destinationRouteId),
      rampageResolutions: [],
    });
    const predicted = predictedNewlyTrappedBeastIdsAfterShipPlacement(
      snapshot,
      destinationRouteId,
      destinationToward === null ? { kind: "ship" } : { kind: "raider", toward: destinationToward },
      sourceRouteId,
    );
    if (predicted.length > 0) {
      setPendingShipRampage({
        action: "move",
        sourceRouteId,
        destinationRouteId,
        occupancy: destinationToward === null ? { kind: "ship" } : { kind: "raider", toward: destinationToward },
        snapshot,
        predictedBeastIds: predicted,
      });
      cancelDrag();
      return;
    }
    const ok = await run(async () => { await moveMarinerShip(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, moveMarinerShip, run]);

  const commitCreateShip = useCallback(async (
    targetRouteId: string,
    destinationToward: MarinerRouteEndpoint | null,
    snapshot: ReturnType<typeof captureOperabilityBoard>,
  ) => {
    const occupancy = destinationToward === null
      ? { kind: "ship" as const }
      : { kind: "raider" as const, toward: destinationToward };
    const predicted = predictedNewlyTrappedBeastIdsAfterShipPlacement(snapshot, targetRouteId, occupancy);
    if (predicted.length > 0) {
      setPendingShipRampage({
        action: "create",
        targetRouteId,
        occupancy,
        snapshot,
        predictedBeastIds: predicted,
      });
      cancelDrag();
      return;
    }
    const payload = buildCreateMarinerShipPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      targetRouteId,
      destinationToward,
      ...expectedForCreateShip(snapshot, targetRouteId),
      rampageResolutions: [],
    });
    const ok = await run(async () => { await createMarinerShip(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, createMarinerShip, run]);

  const commitRoutePieceDrop = useCallback(async (destinationRouteId: string) => {
    const session = sessionRef.current;
    if (session?.kind !== "route-piece" || session.sourceRouteId === undefined || session.sourceOccupancy === undefined) {
      return;
    }
    if (destinationRouteId === session.sourceRouteId) {
      finishNoOpDrag();
      return;
    }
    if (!isEmptyRoute(session.snapshot.routes, destinationRouteId)) {
      finishNoOpDrag();
      return;
    }

    if (session.sourceOccupancy.kind === "ship") {
      await commitShipMove(session.sourceRouteId, destinationRouteId, null, session.snapshot);
      return;
    }
    if (session.sourceOccupancy.kind === "raider") {
      if (raiderTowardAppliesOnRoute(session.sourceOccupancy.toward, destinationRouteId)) {
        await commitShipMove(
          session.sourceRouteId,
          destinationRouteId,
          session.sourceOccupancy.toward,
          session.snapshot,
        );
        return;
      }
      const choices = representableRaiderEndpoints(destinationRouteId);
      if (choices.length === 1) {
        await commitShipMove(session.sourceRouteId, destinationRouteId, choices[0], session.snapshot);
        return;
      }
      setPendingRaiderDirection({
        action: "move",
        sourceRouteId: session.sourceRouteId,
        destinationRouteId,
        choices,
        snapshot: session.snapshot,
      });
      cancelDrag();
    }
  }, [cancelDrag, commitShipMove, finishNoOpDrag]);

  const commitReplaceRouteOccupancy = useCallback(async (
    routeId: string,
    expectedOccupancy: MarinerRouteOccupancy,
    occupancy: MarinerRouteOccupancy,
  ) => {
    const payload = buildSetMarinerRouteOccupancyPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      routeId,
      expectedOccupancy,
      occupancy,
    });
    const ok = await run(async () => { await setMarinerRouteOccupancy(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, run, setMarinerRouteOccupancy]);

  const commitTrayRouteDrop = useCallback(async (
    destinationRouteId: string,
    dropClientX: number,
    dropClientY: number,
  ) => {
    const session = sessionRef.current;
    if (session === null || (session.kind !== "tray-ship" && session.kind !== "tray-raider")) return;
    const destinationOccupancy = routeOccupancyAt(session.snapshot.routes, destinationRouteId);
    if (session.kind === "tray-ship") {
      if (destinationOccupancy.kind === "empty") {
        await commitCreateShip(destinationRouteId, null, session.snapshot);
        return;
      }
      if (destinationOccupancy.kind === "ship") {
        finishNoOpDrag();
        return;
      }
      await commitReplaceRouteOccupancy(
        destinationRouteId,
        destinationOccupancy,
        { kind: "ship" },
      );
      return;
    }
    if (destinationOccupancy.kind === "empty") {
      setPendingRaiderDirection({
        action: "create",
        destinationRouteId,
        choices: representableRaiderEndpoints(destinationRouteId),
        snapshot: session.snapshot,
        dropClientX,
        dropClientY,
      });
      cancelDrag();
      return;
    }
    if (destinationOccupancy.kind === "raider") {
      finishNoOpDrag();
      return;
    }
    setPendingRaiderDirection({
      action: "replace",
      destinationRouteId,
      choices: representableRaiderEndpoints(destinationRouteId),
      snapshot: session.snapshot,
      dropClientX,
      dropClientY,
    });
    cancelDrag();
  }, [cancelDrag, commitCreateShip, commitReplaceRouteOccupancy, finishNoOpDrag]);

  const commitTrayStormDrop = useCallback(async (destinationRegionId: MarinerSeaRegionId) => {
    const session = sessionRef.current;
    if (session?.kind !== "tray-storm") return;
    const expectedStormCount = stormCountOnSnapshot(session.snapshot, destinationRegionId);
    const payload = buildSetMarinerSeaStormCountPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      regionId: destinationRegionId,
      expectedStormCount,
      stormCount: expectedStormCount + 1,
    });
    const ok = await run(async () => { await setMarinerSeaStormCount(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, run, setMarinerSeaStormCount]);

  const commitBeastMove = useCallback(async (
    beast: MarinerBeastState,
    sourceRegionId: MarinerSeaRegionId,
    destinationRegionId: MarinerSeaRegionId,
    snapshot: ReturnType<typeof captureOperabilityBoard>,
    dropClientX?: number,
    dropClientY?: number,
  ) => {
    if (destinationRegionId === sourceRegionId) {
      finishNoOpDrag();
      return;
    }
    if (predictedMovedBeastWouldRampage(snapshot, beast.denizenId, destinationRegionId)) {
      setPendingBeastRampage({
        action: "move",
        snapshot,
        beast,
        sourceRegionId,
        destinationRegionId,
        dropClientX,
        dropClientY,
      });
      cancelDrag();
      return;
    }
    const payload = buildMoveMarinerBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      denizenId: beast.denizenId,
      sourceRegionId,
      destinationRegionId,
      ...expectedForMoveBeast(snapshot, beast.denizenId, sourceRegionId, destinationRegionId),
      rampageResolution: null,
    });
    const ok = await run(async () => { await moveMarinerBeast(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, moveMarinerBeast, run]);

  const commitBeastNest = useCallback(async (
    beast: MarinerBeastState,
    boardIsleId: MarinerBoardIsleId,
    snapshot: ReturnType<typeof captureOperabilityBoard>,
    sourceRegionId: MarinerSeaRegionId,
  ) => {
    if (!isleAcceptsNest(snapshot, boardIsleId)) {
      finishNoOpDrag();
      return;
    }
    const payload = buildNestMarinerBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      denizenId: beast.denizenId,
      boardIsleId,
      ...expectedForNestBeast(snapshot, beast.denizenId, boardIsleId),
    });
    const ok = await run(async () => { await nestMarinerBeast(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, nestMarinerBeast, run]);

  const commitTrayMarketDrop = useCallback(async (boardIsleId: MarinerBoardIsleId) => {
    const session = sessionRef.current;
    if (session?.kind !== "tray-market") return;
    if (!isleAcceptsOrdinarySupplyMarket(session.snapshot, boardIsleId)) {
      finishNoOpDrag();
      return;
    }
    const payload = buildSetMarinerIsleMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      boardIsleId,
      expectedMarket: marketOnSnapshot(session.snapshot, boardIsleId),
      market: { present: true, rarity: null },
    });
    const ok = await run(async () => { await setMarinerIsleMarket(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, run, setMarinerIsleMarket]);

  const commitRelocateNestingBeastToIsle = useCallback(async (
    beast: MarinerBeastState,
    boardIsleId: MarinerBoardIsleId,
    snapshot: ReturnType<typeof captureOperabilityBoard>,
  ) => {
    if (beast.location.kind !== "board_isle" || boardIsleId === beast.location.boardIsleId) {
      finishNoOpDrag();
      return;
    }
    if (!isleAcceptsNest(snapshot, boardIsleId)) {
      finishNoOpDrag();
      return;
    }
    const expected = expectedForRelocateNestingBeastToIsle(snapshot, beast.denizenId, boardIsleId);
    const payload = buildRelocateMarinerNestingBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      denizenId: beast.denizenId,
      expectedBeast: expected.expectedBeast,
      destination: {
        kind: "board_isle",
        boardIsleId,
        expectedMarket: expected.expectedMarket,
        expectedRavageStormCount: expected.expectedRavageStormCount,
        expectedNestingBeastDenizenId: expected.expectedNestingBeastDenizenId,
      },
    });
    const ok = await run(async () => { await relocateMarinerNestingBeast(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, relocateMarinerNestingBeast, run]);

  const commitRelocateNestingBeastToSea = useCallback(async (
    beast: MarinerBeastState,
    destinationRegionId: MarinerSeaRegionId,
    snapshot: ReturnType<typeof captureOperabilityBoard>,
    dropClientX?: number,
    dropClientY?: number,
  ) => {
    if (predictedMovedBeastWouldRampage(snapshot, beast.denizenId, destinationRegionId)) {
      setPendingBeastRampage({
        action: "relocate",
        snapshot,
        beast,
        destinationRegionId,
        dropClientX,
        dropClientY,
      });
      cancelDrag();
      return;
    }
    const expected = expectedForRelocateNestingBeastToSea(snapshot, beast.denizenId, destinationRegionId);
    const payload = buildRelocateMarinerNestingBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      denizenId: beast.denizenId,
      expectedBeast: expected.expectedBeast,
      destination: {
        kind: "sea_region",
        regionId: destinationRegionId,
        expectedStormCounts: expected.expectedStormCounts,
        expectedRouteOccupancies: expected.expectedRouteOccupancies,
        expectedRelevantBeasts: expected.expectedRelevantBeasts,
        rampageResolution: null,
      },
    });
    const ok = await run(async () => { await relocateMarinerNestingBeast(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, relocateMarinerNestingBeast, run]);

  const commitTrayRareMarketDrop = useCallback(async (boardIsleId: MarinerBoardIsleId) => {
    const session = sessionRef.current;
    if (session?.kind !== "tray-rare-market") return;
    if (!isleAcceptsRareSupplyMarket(session.snapshot, boardIsleId)) {
      finishNoOpDrag();
      return;
    }
    const payload = buildSetMarinerIsleMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      boardIsleId,
      expectedMarket: marketOnSnapshot(session.snapshot, boardIsleId),
      market: createUndescribedRareMarinerMarket(),
    });
    const ok = await run(async () => { await setMarinerIsleMarket(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, run, setMarinerIsleMarket]);

  const commitBoardMarketDrop = useCallback(async (destinationBoardIsleId: MarinerBoardIsleId) => {
    const session = sessionRef.current;
    if (session?.kind !== "board-market" || session.sourceBoardIsleId === undefined || session.sourceMarket === undefined) {
      return;
    }
    if (destinationBoardIsleId === session.sourceBoardIsleId) {
      finishNoOpDrag();
      return;
    }
    if (!isleAcceptsExistingMarketMove(session.snapshot, session.sourceBoardIsleId, destinationBoardIsleId)) {
      finishNoOpDrag();
      return;
    }
    const payload = buildMoveMarinerMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      sourceBoardIsleId: session.sourceBoardIsleId,
      destinationBoardIsleId,
      ...expectedForMoveMarket(session.snapshot, session.sourceBoardIsleId, destinationBoardIsleId),
    });
    const ok = await run(async () => { await moveMarinerMarket(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, finishNoOpDrag, moveMarinerMarket, run]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (session === null || event.pointerId !== session.pointerId) return;
      const dx = event.clientX - session.startClientX;
      const dy = event.clientY - session.startClientY;
      if (!session.dragging && pointerMovementExceedsDragThreshold(dx, dy)) {
        sessionRef.current = { ...session, dragging: true };
        setDraggingActive(true);
        suppressClickRef.current = true;
        setContextMenu(null);
      }
      const active = sessionRef.current;
      if (active === null || !active.dragging) return;

      if (active.kind === "storm" || active.kind === "tray-storm") {
        const stormCount = active.kind === "storm"
          ? mariner.seaRegions.find((region) => region.regionId === active.sourceRegionId)?.stormCount ?? 0
          : 0;
        setDragVisual({
          kind: active.kind,
          clientX: event.clientX,
          clientY: event.clientY,
          typhoon: active.kind === "storm" && stormCount >= 2,
        });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        setHoveredSeaId(findSeaDropRegionId(target) as MarinerSeaRegionId | null);
        setHoveredRouteDropId(null);
        setHoveredIsleId(null);
        return;
      }

      if (active.kind === "beast") {
        setDragVisual({
          kind: active.kind,
          clientX: event.clientX,
          clientY: event.clientY,
          typhoon: false,
        });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        setHoveredSeaId(findSeaDropRegionId(target) as MarinerSeaRegionId | null);
        setHoveredIsleId(findIsleDropId(target) as MarinerBoardIsleId | null);
        setHoveredRouteDropId(null);
        return;
      }

      if (active.kind === "tray-market" || active.kind === "tray-rare-market" || active.kind === "board-market") {
        setDragVisual({
          kind: active.kind,
          clientX: event.clientX,
          clientY: event.clientY,
          typhoon: false,
        });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        setHoveredIsleId(findIsleDropId(target) as MarinerBoardIsleId | null);
        setHoveredSeaId(null);
        setHoveredRouteDropId(null);
        return;
      }

      if (active.kind === "route-piece" || active.kind === "tray-ship" || active.kind === "tray-raider") {
        setDragVisual({
          kind: active.kind,
          clientX: event.clientX,
          clientY: event.clientY,
          typhoon: false,
          occupancyKind: active.kind === "tray-raider" || active.sourceOccupancy?.kind === "raider" ? "raider" : "ship",
        });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        setHoveredRouteDropId(findRouteDropId(target));
        setHoveredSeaId(null);
        setHoveredIsleId(null);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (session === null || event.pointerId !== session.pointerId) return;

      if (!session.dragging) {
        sessionRef.current = null;
        setDragVisual(null);
        if (session.kind === "storm" && session.sourceRegionId !== undefined) {
          onSelectRegion(session.sourceRegionId);
        } else if (session.kind === "route-piece" && session.sourceRouteId !== undefined) {
          onSelectRoute(session.sourceRouteId);
        } else if (session.kind === "beast" && session.sourceBeast !== undefined) {
          onSelectBeast(session.sourceBeast.denizenId);
        } else if (session.kind === "board-market" && session.sourceBoardIsleId !== undefined) {
          onSelectIsle(session.sourceBoardIsleId);
        }
        return;
      }

      if (session.kind === "storm") {
        const dropSea = findSeaDropRegionId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropSea !== null) {
          void commitStormDrop(dropSea as MarinerSeaRegionId);
          return;
        }
      }
      if (session.kind === "tray-storm") {
        const dropSea = findSeaDropRegionId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropSea !== null) {
          void commitTrayStormDrop(dropSea as MarinerSeaRegionId);
          return;
        }
      }
      if (session.kind === "route-piece") {
        const dropRoute = findRouteDropId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropRoute !== null) {
          void commitRoutePieceDrop(dropRoute);
          return;
        }
      }
      if (session.kind === "tray-ship" || session.kind === "tray-raider") {
        const dropRoute = findRouteDropId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropRoute !== null) {
          void commitTrayRouteDrop(dropRoute, event.clientX, event.clientY);
          return;
        }
      }
      if (session.kind === "beast" && session.sourceBeast !== undefined) {
        const dropPoint = document.elementFromPoint(event.clientX, event.clientY);
        const dropIsle = findIsleDropId(dropPoint) as MarinerBoardIsleId | null;
        const dropSea = findSeaDropRegionId(dropPoint);
        if (session.sourceBeast.location.kind === "board_isle") {
          if (dropIsle !== null) {
            void commitRelocateNestingBeastToIsle(session.sourceBeast, dropIsle, session.snapshot);
            return;
          }
          if (dropSea !== null) {
            void commitRelocateNestingBeastToSea(
              session.sourceBeast,
              dropSea as MarinerSeaRegionId,
              session.snapshot,
              event.clientX,
              event.clientY,
            );
            return;
          }
        } else if (session.sourceRegionId !== undefined) {
          if (dropIsle !== null) {
            void commitBeastNest(session.sourceBeast, dropIsle, session.snapshot, session.sourceRegionId);
            return;
          }
          if (dropSea !== null) {
            void commitBeastMove(
              session.sourceBeast,
              session.sourceRegionId,
              dropSea as MarinerSeaRegionId,
              session.snapshot,
              event.clientX,
              event.clientY,
            );
            return;
          }
        }
      }
      if (session.kind === "tray-market") {
        const dropIsle = findIsleDropId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropIsle !== null) {
          void commitTrayMarketDrop(dropIsle as MarinerBoardIsleId);
          return;
        }
      }
      if (session.kind === "tray-rare-market") {
        const dropIsle = findIsleDropId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropIsle !== null) {
          void commitTrayRareMarketDrop(dropIsle as MarinerBoardIsleId);
          return;
        }
      }
      if (session.kind === "board-market") {
        const dropIsle = findIsleDropId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropIsle !== null) {
          void commitBoardMarketDrop(dropIsle as MarinerBoardIsleId);
          return;
        }
      }
      cancelDrag();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (sessionRef.current !== null) {
          cancelDrag();
          suppressClickRef.current = false;
        }
        if (contextMenuRef.current !== null) {
          setContextMenu(null);
        }
        return;
      }
      if (event.key === "r" || event.key === "R") {
        if (isEditableKeyboardTarget(event.target)) return;
        if (pendingRef.current || hasPendingDirectIntentRef.current || sessionRef.current !== null) return;
        const routeId = selectedRouteIdRef.current;
        if (routeId === null) return;
        const occupancy = marinerRef.current.routes.find((entry) => entry.routeId === routeId)?.occupancy;
        if (occupancy === undefined || occupancy.kind !== "raider") return;
        const toward = oppositeRouteEndpoint(routeId, occupancy.toward);
        if (toward === null) return;
        event.preventDefault();
        setContextMenu(null);
        const payload = buildSetMarinerRouteOccupancyPayload({
          commandId: newCommandId(),
          expectedCampaignId: campaignId,
          routeId,
          expectedOccupancy: occupancy,
          occupancy: { kind: "raider", toward },
        });
        void run(async () => { await setMarinerRouteOccupancy(payload); });
        return;
      }
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (isEditableKeyboardTarget(event.target)) return;
      if (pendingRef.current || hasPendingDirectIntentRef.current) return;
      const routeId = selectedRouteIdRef.current;
      if (routeId !== null) {
        const occupancy = marinerRef.current.routes.find((entry) => entry.routeId === routeId)?.occupancy
          ?? { kind: "empty" as const };
        if (occupancy.kind === "empty") return;
        event.preventDefault();
        setContextMenu(null);
        const payload = buildSetMarinerRouteOccupancyPayload({
          commandId: newCommandId(),
          expectedCampaignId: campaignId,
          routeId,
          expectedOccupancy: occupancy,
          occupancy: { kind: "empty" },
        });
        void run(async () => { await setMarinerRouteOccupancy(payload); });
        return;
      }
      const regionId = selectedRegionIdRef.current;
      if (regionId !== null) {
        const current = marinerRef.current.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
        if (current < 1) return;
        event.preventDefault();
        setContextMenu(null);
        const payload = buildSetMarinerSeaStormCountPayload({
          commandId: newCommandId(),
          expectedCampaignId: campaignId,
          regionId,
          expectedStormCount: current,
          stormCount: current - 1,
        });
        void run(async () => { await setMarinerSeaStormCount(payload); });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    campaignId,
    cancelDrag,
    commitBeastMove,
    commitBeastNest,
    commitRelocateNestingBeastToIsle,
    commitRelocateNestingBeastToSea,
    commitRoutePieceDrop,
    commitStormDrop,
    commitBoardMarketDrop,
    commitTrayMarketDrop,
    commitTrayRareMarketDrop,
    commitTrayRouteDrop,
    commitTrayStormDrop,
    mariner.seaRegions,
    onSelectBeast,
    onSelectIsle,
    onSelectRegion,
    onSelectRoute,
    run,
    setMarinerRouteOccupancy,
    setMarinerSeaStormCount,
  ]);

  useEffect(() => {
    if (contextMenu === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!isPrimaryPointerButton(event)) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-mariner-context-menu]")) return;
      setContextMenu(null);
    };
    const onContextMenu = (event: Event) => {
      if (event.defaultPrevented) return;
      setContextMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [contextMenu]);

  const beginStormPointer = useCallback((regionId: MarinerSeaRegionId, event: ReactPointerEvent) => {
    if (!isPrimaryPointerButton(event)) return;
    if (pending || hasPendingDirectIntent) return;
    const storms = mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
    if (storms < 1) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    setContextMenu(null);
    sessionRef.current = {
      kind: "storm",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      snapshot: captureOperabilityBoard(mariner),
      sourceRegionId: regionId,
    };
  }, [hasPendingDirectIntent, mariner, pending]);

  const beginRoutePiecePointer = useCallback((routeId: string, occupancy: MarinerRouteOccupancy, event: ReactPointerEvent) => {
    if (!isPrimaryPointerButton(event)) return;
    if (pending || hasPendingDirectIntent || occupancy.kind === "empty") return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    setContextMenu(null);
    sessionRef.current = {
      kind: "route-piece",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      snapshot: captureOperabilityBoard(mariner),
      sourceRouteId: routeId,
      sourceOccupancy: occupancy,
    };
  }, [hasPendingDirectIntent, mariner, pending]);

  const beginTrayPointer = useCallback((kind: "tray-ship" | "tray-raider" | "tray-storm" | "tray-market" | "tray-rare-market", event: ReactPointerEvent) => {
    if (!isPrimaryPointerButton(event)) return;
    if (pending || hasPendingDirectIntent) return;
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    setContextMenu(null);
    sessionRef.current = {
      kind,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      snapshot: captureOperabilityBoard(mariner),
    };
  }, [hasPendingDirectIntent, mariner, pending]);

  const beginTrayShipPointer = useCallback((event: ReactPointerEvent) => {
    beginTrayPointer("tray-ship", event);
  }, [beginTrayPointer]);

  const beginTrayRaiderPointer = useCallback((event: ReactPointerEvent) => {
    beginTrayPointer("tray-raider", event);
  }, [beginTrayPointer]);

  const beginTrayStormPointer = useCallback((event: ReactPointerEvent) => {
    beginTrayPointer("tray-storm", event);
  }, [beginTrayPointer]);

  const beginTrayMarketPointer = useCallback((event: ReactPointerEvent) => {
    beginTrayPointer("tray-market", event);
  }, [beginTrayPointer]);

  const beginTrayRareMarketPointer = useCallback((event: ReactPointerEvent) => {
    beginTrayPointer("tray-rare-market", event);
  }, [beginTrayPointer]);

  const beginBoardMarketPointer = useCallback((boardIsleId: MarinerBoardIsleId, event: ReactPointerEvent) => {
    if (!isPrimaryPointerButton(event)) return;
    if (pending || hasPendingDirectIntent) return;
    const market = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId)?.market;
    if (market === undefined || !market.present) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    setContextMenu(null);
    sessionRef.current = {
      kind: "board-market",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      snapshot: captureOperabilityBoard(mariner),
      sourceBoardIsleId: boardIsleId,
      sourceMarket: market,
    };
  }, [hasPendingDirectIntent, mariner, pending]);

  const beginBeastPointer = useCallback((beast: MarinerBeastState, event: ReactPointerEvent) => {
    if (!isPrimaryPointerButton(event)) return;
    if (pending || hasPendingDirectIntent) return;
    const distrustingSea = beast.condition === "distrusting" && beast.location.kind === "sea_region";
    const nestingIsle = beast.condition === "friendly_nesting" && beast.location.kind === "board_isle";
    if (!distrustingSea && !nestingIsle) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    setContextMenu(null);
    sessionRef.current = {
      kind: "beast",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      snapshot: captureOperabilityBoard(mariner),
      sourceRegionId: distrustingSea ? beast.location.regionId : undefined,
      sourceBoardIsleId: nestingIsle ? beast.location.boardIsleId : undefined,
      sourceBeast: snapshotBeast(beast),
    };
  }, [hasPendingDirectIntent, mariner, pending]);

  const openBeastContextMenu = useCallback((beast: MarinerBeastState, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isBusy()) return;
    setContextMenu({
      kind: "beast",
      beast: snapshotBeast(beast),
      clientX: event.clientX,
      clientY: event.clientY,
      snapshot: captureOperabilityBoard(mariner),
    });
  }, [isBusy, mariner]);

  const openIsleContextMenu = useCallback((boardIsleId: MarinerBoardIsleId, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isBusy()) return;
    const market = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId)?.market ?? { present: false as const };
    setContextMenu({
      kind: "isle",
      boardIsleId,
      market,
      clientX: event.clientX,
      clientY: event.clientY,
      snapshot: captureOperabilityBoard(mariner),
    });
  }, [isBusy, mariner]);

  const openRouteContextMenu = useCallback((routeId: string, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isBusy()) return;
    const occupancy = mariner.routes.find((entry) => entry.routeId === routeId)?.occupancy ?? { kind: "empty" as const };
    setContextMenu({
      kind: "route",
      routeId,
      occupancy,
      clientX: event.clientX,
      clientY: event.clientY,
      snapshot: captureOperabilityBoard(mariner),
    });
  }, [isBusy, mariner]);

  const openSeaContextMenu = useCallback((regionId: MarinerSeaRegionId, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isBusy()) return;
    const stormCount = mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
    setContextMenu({
      kind: "sea",
      regionId,
      stormCount,
      clientX: event.clientX,
      clientY: event.clientY,
      snapshot: captureOperabilityBoard(mariner),
    });
  }, [isBusy, mariner]);

  const contextAddShip = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "route") return;
    setContextMenu(null);
    await commitCreateShip(menu.routeId, null, menu.snapshot);
  }, [commitCreateShip, isBusy]);

  const contextAddRaider = useCallback(async (toward: MarinerRouteEndpoint) => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "route") return;
    setContextMenu(null);
    await commitCreateShip(menu.routeId, toward, menu.snapshot);
  }, [commitCreateShip, isBusy]);

  const contextReverseRaider = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "route" || menu.occupancy.kind !== "raider") return;
    const toward = oppositeRouteEndpoint(menu.routeId, menu.occupancy.toward);
    if (toward === null) return;
    setContextMenu(null);
    const payload = buildSetMarinerRouteOccupancyPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      routeId: menu.routeId,
      expectedOccupancy: menu.occupancy,
      occupancy: { kind: "raider", toward },
    });
    await run(async () => { await setMarinerRouteOccupancy(payload); });
  }, [campaignId, isBusy, run, setMarinerRouteOccupancy]);

  const contextChangeRaiderToShip = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "route" || menu.occupancy.kind !== "raider") return;
    setContextMenu(null);
    const payload = buildSetMarinerRouteOccupancyPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      routeId: menu.routeId,
      expectedOccupancy: menu.occupancy,
      occupancy: { kind: "ship" },
    });
    await run(async () => { await setMarinerRouteOccupancy(payload); });
  }, [campaignId, isBusy, run, setMarinerRouteOccupancy]);

  const contextChangeShipToRaider = useCallback(async (toward: MarinerRouteEndpoint) => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "route" || menu.occupancy.kind !== "ship") return;
    setContextMenu(null);
    const payload = buildSetMarinerRouteOccupancyPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      routeId: menu.routeId,
      expectedOccupancy: menu.occupancy,
      occupancy: { kind: "raider", toward },
    });
    await run(async () => { await setMarinerRouteOccupancy(payload); });
  }, [campaignId, isBusy, run, setMarinerRouteOccupancy]);

  const contextRemoveOccupancy = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "route" || menu.occupancy.kind === "empty") return;
    setContextMenu(null);
    const payload = buildSetMarinerRouteOccupancyPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      routeId: menu.routeId,
      expectedOccupancy: menu.occupancy,
      occupancy: { kind: "empty" },
    });
    await run(async () => { await setMarinerRouteOccupancy(payload); });
  }, [campaignId, isBusy, run, setMarinerRouteOccupancy]);

  const contextAddStorm = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "sea") return;
    setContextMenu(null);
    const payload = buildSetMarinerSeaStormCountPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      regionId: menu.regionId,
      expectedStormCount: menu.stormCount,
      stormCount: menu.stormCount + 1,
    });
    await run(async () => { await setMarinerSeaStormCount(payload); });
  }, [campaignId, isBusy, run, setMarinerSeaStormCount]);

  const contextRemoveStorm = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "sea" || menu.stormCount < 1) return;
    setContextMenu(null);
    const payload = buildSetMarinerSeaStormCountPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      regionId: menu.regionId,
      expectedStormCount: menu.stormCount,
      stormCount: menu.stormCount - 1,
    });
    await run(async () => { await setMarinerSeaStormCount(payload); });
  }, [campaignId, isBusy, run, setMarinerSeaStormCount]);

  const contextMoveBeast = useCallback(async (destinationRegionId: MarinerSeaRegionId) => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "beast" || menu.beast.location.kind !== "sea_region") return;
    const snapshot = menu.snapshot;
    const beast = menu.beast;
    const sourceRegionId = menu.beast.location.regionId;
    setContextMenu(null);
    await commitBeastMove(beast, sourceRegionId, destinationRegionId, snapshot, menu.clientX, menu.clientY);
  }, [commitBeastMove, isBusy]);

  const contextNestBeast = useCallback(async (boardIsleId: MarinerBoardIsleId) => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "beast" || menu.beast.location.kind !== "sea_region") return;
    const snapshot = menu.snapshot;
    const beast = menu.beast;
    const sourceRegionId = menu.beast.location.regionId;
    setContextMenu(null);
    await commitBeastNest(beast, boardIsleId, snapshot, sourceRegionId);
  }, [commitBeastNest, isBusy]);

  const contextBeginBeastElsewhere = useCallback((kind: PendingBeastElsewhereChooser["kind"]) => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "beast") return;
    const location = menu.beast.location;
    if (kind === "move" || kind === "nest") {
      if (location.kind !== "sea_region") return;
      setPendingBeastElsewhere({
        kind,
        snapshot: menu.snapshot,
        beast: menu.beast,
        sourceRegionId: location.regionId,
        clientX: menu.clientX,
        clientY: menu.clientY,
      });
      setContextMenu(null);
      return;
    }
    if (location.kind !== "board_isle") return;
    setPendingBeastElsewhere({
      kind,
      snapshot: menu.snapshot,
      beast: menu.beast,
      clientX: menu.clientX,
      clientY: menu.clientY,
    });
    setContextMenu(null);
  }, [isBusy]);

  const chooseBeastElsewhereSea = useCallback(async (destinationRegionId: MarinerSeaRegionId) => {
    if (pendingBeastElsewhere === null) return;
    const intent = pendingBeastElsewhere;
    if (intent.kind === "move") {
      setPendingBeastElsewhere(null);
      await commitBeastMove(
        intent.beast,
        intent.sourceRegionId,
        destinationRegionId,
        intent.snapshot,
        intent.clientX,
        intent.clientY,
      );
      return;
    }
    if (intent.kind !== "leave-nest") return;
    setPendingBeastElsewhere(null);
    await commitRelocateNestingBeastToSea(
      intent.beast,
      destinationRegionId,
      intent.snapshot,
      intent.clientX,
      intent.clientY,
    );
  }, [commitBeastMove, commitRelocateNestingBeastToSea, pendingBeastElsewhere]);

  const chooseBeastElsewhereIsle = useCallback(async (boardIsleId: MarinerBoardIsleId) => {
    if (pendingBeastElsewhere === null) return;
    const intent = pendingBeastElsewhere;
    if (intent.kind === "nest") {
      setPendingBeastElsewhere(null);
      await commitBeastNest(intent.beast, boardIsleId, intent.snapshot, intent.sourceRegionId);
      return;
    }
    if (intent.kind !== "relocate-nest") return;
    setPendingBeastElsewhere(null);
    await commitRelocateNestingBeastToIsle(intent.beast, boardIsleId, intent.snapshot);
  }, [commitBeastNest, commitRelocateNestingBeastToIsle, pendingBeastElsewhere]);

  const cancelPendingBeastElsewhere = useCallback(() => {
    setPendingBeastElsewhere(null);
  }, []);

  const contextBeginRemoveBeast = useCallback(() => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "beast") return;
    setPendingBeastRemove({
      snapshot: menu.snapshot,
      beast: menu.beast,
      clientX: menu.clientX,
      clientY: menu.clientY,
    });
    setContextMenu(null);
  }, [isBusy]);

  const confirmRemoveBeast = useCallback(async () => {
    if (pendingRef.current) return;
    const intent = pendingBeastRemove;
    if (intent === null) return;
    const payload = buildRemoveMarinerBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      denizenId: intent.beast.denizenId,
      expectedBeast: intent.beast,
    });
    const ok = await run(async () => { await removeMarinerBeast(payload); });
    if (ok) setPendingBeastRemove(null);
  }, [campaignId, pendingBeastRemove, removeMarinerBeast, run]);

  const cancelPendingBeastRemove = useCallback(() => {
    setPendingBeastRemove(null);
  }, []);

  const contextBeginAddBeast = useCallback(() => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind === "sea") {
      setPendingBeastAdd({
        snapshot: menu.snapshot,
        target: { kind: "sea", regionId: menu.regionId },
        clientX: menu.clientX,
        clientY: menu.clientY,
      });
      setContextMenu(null);
      return;
    }
    if (menu?.kind === "isle") {
      if (!isleAcceptsManualBeast(menu.snapshot, menu.boardIsleId)) {
        setContextMenu(null);
        return;
      }
      setPendingBeastAdd({
        snapshot: menu.snapshot,
        target: { kind: "isle", boardIsleId: menu.boardIsleId },
        clientX: menu.clientX,
        clientY: menu.clientY,
      });
      setContextMenu(null);
    }
  }, [isBusy]);

  const submitPendingBeastAdd = useCallback(async (beast: MarinerBeastState) => {
    if (pendingRef.current || pendingBeastAdd === null) return;
    const payload = buildAddMarinerBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      beast,
    });
    const ok = await run(async () => { await addMarinerBeast(payload); });
    if (ok) setPendingBeastAdd(null);
  }, [addMarinerBeast, campaignId, pendingBeastAdd, run]);

  const cancelPendingBeastAdd = useCallback(() => {
    setPendingBeastAdd(null);
  }, []);

  const contextAddMarket = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "isle") return;
    if (!isleAcceptsMarket(menu.snapshot, menu.boardIsleId)) {
      setContextMenu(null);
      return;
    }
    const payload = buildSetMarinerIsleMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      boardIsleId: menu.boardIsleId,
      expectedMarket: menu.market,
      market: { present: true, rarity: null },
    });
    setContextMenu(null);
    await run(async () => { await setMarinerIsleMarket(payload); });
  }, [campaignId, isBusy, run, setMarinerIsleMarket]);

  const contextRemoveMarket = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "isle" || !menu.market.present) return;
    const payload = buildSetMarinerIsleMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      boardIsleId: menu.boardIsleId,
      expectedMarket: menu.market,
      market: { present: false },
    });
    setContextMenu(null);
    await run(async () => { await setMarinerIsleMarket(payload); });
  }, [campaignId, isBusy, run, setMarinerIsleMarket]);

  const contextBeginRarityEditor = useCallback((mode: "add" | "edit" | "describe") => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "isle" || !menu.market.present) return;
    setPendingRarityEditor({
      snapshot: menu.snapshot,
      boardIsleId: menu.boardIsleId,
      expectedMarket: menu.market,
      mode,
      clientX: menu.clientX,
      clientY: menu.clientY,
    });
    setContextMenu(null);
  }, [isBusy]);

  const submitPendingRarity = useCallback(async (description: string) => {
    if (pendingRef.current || pendingRarityEditor === null) return;
    const trimmed = description.trim();
    if (trimmed === "" || isReservedMarinerRarityDescriptionInput(trimmed)) return;
    const payload = buildSetMarinerIsleMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      boardIsleId: pendingRarityEditor.boardIsleId,
      expectedMarket: pendingRarityEditor.expectedMarket,
      market: { present: true, rarity: trimmed },
    });
    const ok = await run(async () => { await setMarinerIsleMarket(payload); });
    if (ok) setPendingRarityEditor(null);
  }, [campaignId, pendingRarityEditor, run, setMarinerIsleMarket]);

  const cancelPendingRarityEditor = useCallback(() => {
    setPendingRarityEditor(null);
  }, []);

  const contextRemoveRarity = useCallback(async () => {
    if (isBusy()) {
      setContextMenu(null);
      return;
    }
    const menu = contextMenuRef.current;
    if (menu?.kind !== "isle" || !menu.market.present || menu.market.rarity === null) return;
    const payload = buildSetMarinerIsleMarketPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      boardIsleId: menu.boardIsleId,
      expectedMarket: menu.market,
      market: { present: true, rarity: null },
    });
    setContextMenu(null);
    await run(async () => { await setMarinerIsleMarket(payload); });
  }, [campaignId, isBusy, run, setMarinerIsleMarket]);

  const chooseRaiderDirection = useCallback(async (toward: MarinerRouteEndpoint) => {
    if (pendingRaiderDirection === null) return;
    const pendingChoice = pendingRaiderDirection;
    setPendingRaiderDirection(null);
    if (pendingChoice.action === "create") {
      await commitCreateShip(pendingChoice.destinationRouteId, toward, pendingChoice.snapshot);
      return;
    }
    if (pendingChoice.action === "replace") {
      const expected = routeOccupancyAt(pendingChoice.snapshot.routes, pendingChoice.destinationRouteId);
      if (expected.kind !== "ship") return;
      await commitReplaceRouteOccupancy(
        pendingChoice.destinationRouteId,
        expected,
        { kind: "raider", toward },
      );
      return;
    }
    await commitShipMove(
      pendingChoice.sourceRouteId,
      pendingChoice.destinationRouteId,
      toward,
      pendingChoice.snapshot,
    );
  }, [commitCreateShip, commitReplaceRouteOccupancy, commitShipMove, pendingRaiderDirection]);

  const consumeSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const routeDropHighlight = useCallback((routeId: string): "recommended" | "available" | "hover" | "blocked" | null => {
    if (!draggingActive) return null;
    const session = sessionRef.current;
    if (session === null) return null;
    if (session.kind !== "route-piece" && session.kind !== "tray-ship" && session.kind !== "tray-raider") return null;

    const snapshotRoutes = session.snapshot.routes;

    if (session.kind === "route-piece") {
      if (session.sourceRouteId !== undefined && routeId === session.sourceRouteId) return "blocked";
      if (!isEmptyRoute(snapshotRoutes, routeId)) return "blocked";
      if (hoveredRouteDropId === routeId) return "hover";
      if (session.sourceRouteId !== undefined) {
        return routesShareBoardIsleEndpoint(session.sourceRouteId, routeId) ? "recommended" : "available";
      }
      return "available";
    }

    if (session.kind === "tray-ship") {
      const destinationOccupancy = routeOccupancyAt(snapshotRoutes, routeId);
      if (destinationOccupancy.kind === "ship") return "blocked";
      if (hoveredRouteDropId === routeId) return "hover";
      return "available";
    }

    const destinationOccupancy = routeOccupancyAt(snapshotRoutes, routeId);
    if (destinationOccupancy.kind === "raider") return "blocked";
    if (hoveredRouteDropId === routeId) return "hover";
    return "available";
  }, [draggingActive, hoveredRouteDropId]);

  const seaDropHighlight = useCallback((regionId: MarinerSeaRegionId): "source" | "recommended" | "available" | "hover" | "blocked" | null => {
    if (beastDragActive) {
      if (beastDragSourceId !== null && regionId === beastDragSourceId) return "source";
      if (hoveredSeaId === regionId) return "hover";
      if (beastDragSourceId !== null && recommendedSeaIds.includes(regionId)) return "recommended";
      return "available";
    }
    if (stormDragSourceId === null && !trayStormDragActive) return null;
    if (stormDragSourceId !== null && regionId === stormDragSourceId) return "source";
    if (hoveredSeaId === regionId) return "hover";
    if (stormDragSourceId !== null && recommendedSeaIds.includes(regionId)) return "recommended";
    return "available";
  }, [beastDragActive, beastDragSourceId, hoveredSeaId, recommendedSeaIds, stormDragSourceId, trayStormDragActive]);

  const isleDropHighlight = useCallback((boardIsleId: MarinerBoardIsleId): "source" | "recommended" | "available" | "hover" | "blocked" | null => {
    if (!draggingActive) return null;
    const session = sessionRef.current;
    if (session === null) return null;
    if (session.kind === "beast" && session.sourceBeast?.location.kind === "board_isle") {
      if (boardIsleId === session.sourceBeast.location.boardIsleId) return "source";
      if (!isleAcceptsNest(session.snapshot, boardIsleId)) return "blocked";
      if (hoveredIsleId === boardIsleId) return "hover";
      return "available";
    }
    if (session.kind === "beast" && session.sourceRegionId !== undefined) {
      if (!isleAcceptsNest(session.snapshot, boardIsleId)) return "blocked";
      if (hoveredIsleId === boardIsleId) return "hover";
      return adjacentIsleIds(session.sourceRegionId).includes(boardIsleId) ? "recommended" : "available";
    }
    if (session.kind === "tray-market") {
      if (!isleAcceptsOrdinarySupplyMarket(session.snapshot, boardIsleId)) return "blocked";
      if (hoveredIsleId === boardIsleId) return "hover";
      return "available";
    }
    if (session.kind === "tray-rare-market") {
      if (!isleAcceptsRareSupplyMarket(session.snapshot, boardIsleId)) return "blocked";
      if (hoveredIsleId === boardIsleId) return "hover";
      return "available";
    }
    if (session.kind === "board-market" && session.sourceBoardIsleId !== undefined) {
      if (!isleAcceptsExistingMarketMove(session.snapshot, session.sourceBoardIsleId, boardIsleId)) return "blocked";
      if (hoveredIsleId === boardIsleId) return "hover";
      return "available";
    }
    return null;
  }, [draggingActive, hoveredIsleId]);

  const isleDropFamily = useCallback((boardIsleId: MarinerBoardIsleId): "nest" | "market" | null => {
    if (!draggingActive) return null;
    const session = sessionRef.current;
    if (session === null) return null;
    if (session.kind === "beast") return "nest";
    if (marketDragActive) return "market";
    void boardIsleId;
    return null;
  }, [draggingActive, marketDragActive]);

  const submitPendingShipRampage = useCallback(async (
    rampageResolutions: {
      denizenId: string;
      destinationSeatId: string;
      rampagingMethodEntryId: string | null;
    }[],
  ) => {
    if (pendingShipRampage === null) return;
    const intent = pendingShipRampage;
    const destinationToward = intent.occupancy.kind === "raider" ? intent.occupancy.toward : null;
    if (intent.action === "move") {
      const payload = buildMoveMarinerShipPayload({
        commandId: newCommandId(),
        expectedCampaignId: campaignId,
        sourceRouteId: intent.sourceRouteId,
        destinationRouteId: intent.destinationRouteId,
        destinationToward,
        ...expectedForMoveShip(intent.snapshot, intent.sourceRouteId, intent.destinationRouteId),
        rampageResolutions,
      });
      const ok = await run(async () => { await moveMarinerShip(payload); });
      if (ok) setPendingShipRampage(null);
      return;
    }
    const payload = buildCreateMarinerShipPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      targetRouteId: intent.targetRouteId,
      destinationToward,
      ...expectedForCreateShip(intent.snapshot, intent.targetRouteId),
      rampageResolutions,
    });
    const ok = await run(async () => { await createMarinerShip(payload); });
    if (ok) setPendingShipRampage(null);
  }, [campaignId, createMarinerShip, moveMarinerShip, pendingShipRampage, run]);

  const cancelPendingShipRampage = useCallback(() => {
    setPendingShipRampage(null);
  }, []);

  const submitPendingBeastRampage = useCallback(async (destinationSeatId: PactSeatId) => {
    if (pendingBeastRampage === null) return;
    const intent = pendingBeastRampage;
    const rampageResolution = {
      denizenId: intent.beast.denizenId,
      destinationSeatId,
      rampagingMethodEntryId: newMethodEntryId(),
    } as MarinerRampageResolution;
    if (intent.action === "relocate") {
      const expected = expectedForRelocateNestingBeastToSea(
        intent.snapshot,
        intent.beast.denizenId,
        intent.destinationRegionId,
      );
      const payload = buildRelocateMarinerNestingBeastPayload({
        commandId: newCommandId(),
        expectedCampaignId: campaignId,
        denizenId: intent.beast.denizenId,
        expectedBeast: expected.expectedBeast,
        destination: {
          kind: "sea_region",
          regionId: intent.destinationRegionId,
          expectedStormCounts: expected.expectedStormCounts,
          expectedRouteOccupancies: expected.expectedRouteOccupancies,
          expectedRelevantBeasts: expected.expectedRelevantBeasts,
          rampageResolution,
        },
      });
      const ok = await run(async () => { await relocateMarinerNestingBeast(payload); });
      if (ok) setPendingBeastRampage(null);
      return;
    }
    const payload = buildMoveMarinerBeastPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      denizenId: intent.beast.denizenId,
      sourceRegionId: intent.sourceRegionId,
      destinationRegionId: intent.destinationRegionId,
      ...expectedForMoveBeast(
        intent.snapshot,
        intent.beast.denizenId,
        intent.sourceRegionId,
        intent.destinationRegionId,
      ),
      rampageResolution,
    });
    const ok = await run(async () => { await moveMarinerBeast(payload); });
    if (ok) setPendingBeastRampage(null);
  }, [campaignId, moveMarinerBeast, pendingBeastRampage, relocateMarinerNestingBeast, run]);

  const cancelPendingBeastRampage = useCallback(() => {
    setPendingBeastRampage(null);
  }, []);

  return {
    dragVisual,
    stormDragSourceId,
    beastDragSourceId,
    beastDragSourceIsleId,
    beastDragDenizenId,
    routeDragSourceId,
    pendingRaiderDirection,
    setPendingRaiderDirection,
    pendingShipRampage,
    submitPendingShipRampage,
    cancelPendingShipRampage,
    pendingBeastRampage,
    submitPendingBeastRampage,
    cancelPendingBeastRampage,
    pendingBeastAdd,
    submitPendingBeastAdd,
    cancelPendingBeastAdd,
    pendingBeastRemove,
    confirmRemoveBeast,
    cancelPendingBeastRemove,
    pendingRarityEditor,
    submitPendingRarity,
    cancelPendingRarityEditor,
    pendingBeastElsewhere,
    chooseBeastElsewhereSea,
    chooseBeastElsewhereIsle,
    cancelPendingBeastElsewhere,
    contextMenu,
    openRouteContextMenu,
    openSeaContextMenu,
    openBeastContextMenu,
    openIsleContextMenu,
    closeContextMenu,
    contextAddShip,
    contextAddRaider,
    contextReverseRaider,
    contextChangeRaiderToShip,
    contextChangeShipToRaider,
    contextRemoveOccupancy,
    contextAddStorm,
    contextRemoveStorm,
    contextMoveBeast,
    contextNestBeast,
    contextBeginBeastElsewhere,
    contextBeginRemoveBeast,
    contextBeginAddBeast,
    contextAddMarket,
    contextRemoveMarket,
    contextBeginRarityEditor,
    contextRemoveRarity,
    beginStormPointer,
    beginBeastPointer,
    beginRoutePiecePointer,
    beginTrayShipPointer,
    beginTrayRaiderPointer,
    beginTrayStormPointer,
    beginTrayMarketPointer,
    beginTrayRareMarketPointer,
    beginBoardMarketPointer,
    chooseRaiderDirection,
    consumeSuppressClick,
    routeDropHighlight,
    seaDropHighlight,
    isleDropHighlight,
    isleDropFamily,
    cancelDrag,
  };
}

function isStormGhostKind(kind: DragKind): boolean {
  return kind === "storm" || kind === "tray-storm";
}

export function BoardDragGhost({ visual }: { visual: BoardDragVisual | null }) {
  if (visual === null) return null;
  return (
    <div
      data-drag-ghost
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-90"
      style={{ left: visual.clientX, top: visual.clientY }}
      aria-hidden="true"
    >
      {isStormGhostKind(visual.kind) ? (
        <svg width={visual.typhoon ? 36 : 28} height={visual.typhoon ? 36 : 28} viewBox="-16 -16 32 32">
          <path
            d={visual.typhoon
              ? "M-14 3 C-16 -8 -4 -16 6 -10 C14 -5 14 4 6 8 C16 7 16 -4 8 -12 C-2 -18 -16 -10 -14 3 Z"
              : "M-10 4 Q -4 -10 4 -6 Q 10 -2 8 6 Q 0 10 -10 4 Z"}
            fill={visual.typhoon ? "#1e293b" : "#475569"}
            stroke="#0f172a"
          />
        </svg>
      ) : visual.kind === "beast" ? (
        <svg width={24} height={28} viewBox="-12 -14 24 32">
          <polygon points="0,-12 10,-2 6,12 -6,12 -10,-2" fill="#14532d" stroke="#052e16" />
        </svg>
      ) : visual.kind === "tray-market" || visual.kind === "tray-rare-market" || visual.kind === "board-market" ? (
        <svg width={24} height={22} viewBox="-12 -16 24 28">
          <rect x={-8} y={-6} width={16} height={12} fill="#b45309" stroke="#78350f" />
          <path d="M -10 -6 L 0 -14 L 10 -6" fill="#f59e0b" stroke="#78350f" />
          {visual.kind === "tray-rare-market" && (
            <polygon points="10,-16 12,-11 17,-11 13,-8 15,-3 10,-6 5,-3 7,-8 3,-11 8,-11" fill="#f8fafc" stroke="#0f172a" />
          )}
        </svg>
      ) : (
        <svg width={28} height={20} viewBox="-8 -8 16 16">
          {visual.occupancyKind === "raider" ? (
            <polygon points="0,-8 7,0 0,8 -7,0" fill="#7c2d12" stroke="#431407" />
          ) : (
            <path d="M-4.2 2.1 L-2.3 -1.1 L3.2 -1.1 L5.1 2.1 Z" fill="#0f766e" stroke="#042f2e" />
          )}
        </svg>
      )}
    </div>
  );
}

const CONTEXT_MENU_BTN =
  "block w-full text-left rounded px-2 py-1 text-[11px] leading-tight cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 whitespace-nowrap";

function contextTarget(menu: BoardContextMenu): string {
  if (menu.kind === "route") return menu.routeId;
  if (menu.kind === "sea") return menu.regionId;
  if (menu.kind === "beast") return menu.beast.denizenId;
  return menu.boardIsleId;
}

export function MarinerBoardContextMenu({
  menu,
  mariner,
  world,
  onAddShip,
  onAddRaider,
  onReverseRaider,
  onChangeRaiderToShip,
  onChangeShipToRaider,
  onRemoveOccupancy,
  onAddStorm,
  onRemoveStorm,
  onMoveBeast,
  onNestBeast,
  onMoveBeastElsewhere,
  onNestBeastElsewhere,
  onRelocateNestElsewhere,
  onLeaveNestToSea,
  onRemoveBeast,
  onAddBeast,
  onAddMarket,
  onRemoveMarket,
  onAddRarity,
  onDescribeRarity,
  onEditRarity,
  onRemoveRarity,
}: {
  menu: BoardContextMenu | null;
  mariner: MarinerState;
  world: WorldReference;
  onAddShip: () => void;
  onAddRaider: (toward: MarinerRouteEndpoint) => void;
  onReverseRaider: () => void;
  onChangeRaiderToShip: () => void;
  onChangeShipToRaider: (toward: MarinerRouteEndpoint) => void;
  onRemoveOccupancy: () => void;
  onAddStorm: () => void;
  onRemoveStorm: () => void;
  onMoveBeast: (regionId: MarinerSeaRegionId) => void;
  onNestBeast: (boardIsleId: MarinerBoardIsleId) => void;
  onMoveBeastElsewhere: () => void;
  onNestBeastElsewhere: () => void;
  onRelocateNestElsewhere: () => void;
  onLeaveNestToSea: () => void;
  onRemoveBeast: () => void;
  onAddBeast: () => void;
  onAddMarket: () => void;
  onRemoveMarket: () => void;
  onAddRarity: () => void;
  onDescribeRarity: () => void;
  onEditRarity: () => void;
  onRemoveRarity: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu?.clientX ?? 0, top: menu?.clientY ?? 0 });

  useLayoutEffect(() => {
    if (menu === null) return;
    const el = ref.current;
    if (el === null) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = menu.clientX;
    let top = menu.clientY;
    if (left + rect.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - rect.width - pad);
    if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - rect.height - pad);
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    setPos({ left, top });
  }, [menu]);

  if (menu === null) return null;

  const routeDef = menu.kind === "route"
    ? MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === menu.routeId)
    : undefined;
  const endpoints = menu.kind === "route" ? representableRaiderEndpoints(menu.routeId) : [];

  return (
    <div
      ref={ref}
      data-mariner-context-menu
      data-context-menu-kind={menu.kind}
      data-context-target={contextTarget(menu)}
      data-pointer-x={menu.clientX}
      data-pointer-y={menu.clientY}
      className="fixed z-40 min-w-[11rem] rounded-md border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-md py-0.5"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
    >
      {menu.kind === "route" && menu.occupancy.kind === "empty" && (
        <>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="add-ship"
            aria-label={routeDef === undefined
              ? "Add Ship"
              : `Add Ship on route ${routeEndpointLabel(routeDef.endpointA, mariner, world.isles)} — ${routeEndpointLabel(routeDef.endpointB, mariner, world.isles)}`}
            onClick={(event) => {
              event.stopPropagation();
              onAddShip();
            }}
          >
            Add Ship
          </button>
          {endpoints.map((endpoint) => {
            const label = routeEndpointLabel(endpoint, mariner, world.isles);
            return (
              <button
                key={endpointKey(endpoint)}
                type="button"
                role="menuitem"
                className={CONTEXT_MENU_BTN}
                data-context-action="add-raider"
                data-raider-toward={endpointKey(endpoint)}
                aria-label={`Raider toward ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddRaider(endpoint);
                }}
              >
                {`Raider -> ${label}`}
              </button>
            );
          })}
        </>
      )}
      {menu.kind === "route" && menu.occupancy.kind === "ship" && (
        <>
          {endpoints.map((endpoint) => {
            const label = routeEndpointLabel(endpoint, mariner, world.isles);
            return (
              <button
                key={endpointKey(endpoint)}
                type="button"
                role="menuitem"
                className={CONTEXT_MENU_BTN}
                data-context-action="change-to-raider"
                data-raider-toward={endpointKey(endpoint)}
                aria-label={`Change to Raider toward ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChangeShipToRaider(endpoint);
                }}
              >
                {`Change to Raider -> ${label}`}
              </button>
            );
          })}
          <button
            type="button"
            role="menuitem"
            className={`${CONTEXT_MENU_BTN} text-red-700 dark:text-red-400`}
            data-context-action="remove-occupancy"
            aria-label="Remove Ship"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveOccupancy();
            }}
          >
            Remove Ship
          </button>
        </>
      )}
      {menu.kind === "route" && menu.occupancy.kind === "raider" && (
        <>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="reverse-raider"
            aria-label="Reverse direction"
            onClick={(event) => {
              event.stopPropagation();
              onReverseRaider();
            }}
          >
            Reverse direction
          </button>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="change-to-ship"
            aria-label="Change to Ship"
            onClick={(event) => {
              event.stopPropagation();
              onChangeRaiderToShip();
            }}
          >
            Change to Ship
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${CONTEXT_MENU_BTN} text-red-700 dark:text-red-400`}
            data-context-action="remove-occupancy"
            aria-label="Remove Raider"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveOccupancy();
            }}
          >
            Remove Raider
          </button>
        </>
      )}
      {menu.kind === "sea" && (
        <>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="add-storm"
            aria-label={`Add Storm to ${seaRegionDisplayName(menu.regionId)}`}
            onClick={(event) => {
              event.stopPropagation();
              onAddStorm();
            }}
          >
            Add Storm
          </button>
          {menu.stormCount > 0 && (
            <button
              type="button"
              role="menuitem"
              className={`${CONTEXT_MENU_BTN} text-red-700 dark:text-red-400`}
              data-context-action="remove-storm"
              aria-label={`Remove Storm from ${seaRegionDisplayName(menu.regionId)}`}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveStorm();
              }}
            >
              Remove Storm
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="add-beast"
            aria-label={`Add Beast to ${seaRegionDisplayName(menu.regionId)}`}
            onClick={(event) => {
              event.stopPropagation();
              onAddBeast();
            }}
          >
            Add Beast…
          </button>
        </>
      )}
      {menu.kind === "beast" && menu.beast.condition === "distrusting" && menu.beast.location.kind === "sea_region" && (
        <>
          <p data-context-section="recommended-move" className="px-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recommended Move
          </p>
          {adjacentSeaIds(menu.beast.location.regionId).map((regionId) => (
            <button
              key={`move-${regionId}`}
              type="button"
              role="menuitem"
              className={CONTEXT_MENU_BTN}
              data-context-action="move-beast"
              data-region-id={regionId}
              aria-label={`Move Beast to ${seaRegionDisplayName(regionId)}`}
              onClick={(event) => {
                event.stopPropagation();
                onMoveBeast(regionId);
              }}
            >
              {`Move -> ${seaRegionDisplayName(regionId)}`}
            </button>
          ))}
          <p data-context-section="recommended-nest" className="px-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recommended Nest
          </p>
          {adjacentIsleIds(menu.beast.location.regionId).map((boardIsleId) => {
            const reason = nestBlockReason(menu.snapshot, boardIsleId);
            const label = boardIsleWorldName(mariner, world.isles, boardIsleId);
            return (
              <button
                key={`nest-${boardIsleId}`}
                type="button"
                role="menuitem"
                className={reason === null ? CONTEXT_MENU_BTN : `${CONTEXT_MENU_BTN} opacity-60 cursor-not-allowed`}
                data-context-action="nest-beast"
                data-isle-id={boardIsleId}
                data-disabled-reason={reason ?? undefined}
                disabled={reason !== null}
                aria-label={reason === null ? `Nest Beast on ${label}` : `Nest Beast on ${label} unavailable: ${reason}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (reason !== null) return;
                  onNestBeast(boardIsleId);
                }}
              >
                {reason === null ? `Nest -> ${label}` : `Nest -> ${label} (${reason})`}
              </button>
            );
          })}
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="move-beast-elsewhere"
            aria-label="Move elsewhere"
            onClick={(event) => {
              event.stopPropagation();
              onMoveBeastElsewhere();
            }}
          >
            Move elsewhere…
          </button>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="nest-beast-elsewhere"
            aria-label="Nest elsewhere"
            onClick={(event) => {
              event.stopPropagation();
              onNestBeastElsewhere();
            }}
          >
            Nest elsewhere…
          </button>
        </>
      )}
      {menu.kind === "beast" && menu.beast.condition === "friendly_nesting" && menu.beast.location.kind === "board_isle" && (
        <>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="relocate-nest-elsewhere"
            aria-label="Move Nest elsewhere"
            onClick={(event) => {
              event.stopPropagation();
              onRelocateNestElsewhere();
            }}
          >
            Move Nest elsewhere…
          </button>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="leave-nest-to-sea"
            aria-label="Leave Nest to Sea"
            onClick={(event) => {
              event.stopPropagation();
              onLeaveNestToSea();
            }}
          >
            Leave Nest to Sea…
          </button>
        </>
      )}
      {menu.kind === "beast" && (
        <button
          type="button"
          role="menuitem"
          className={`${CONTEXT_MENU_BTN} text-red-700 dark:text-red-400`}
          data-context-action="remove-beast"
          aria-label="Remove Beast"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveBeast();
          }}
        >
          Remove Beast…
        </button>
      )}
      {menu.kind === "isle" && !menu.market.present && (
        <>
          {isleAcceptsMarket(menu.snapshot, menu.boardIsleId) ? (
            <button
              type="button"
              role="menuitem"
              className={CONTEXT_MENU_BTN}
              data-context-action="add-market"
              aria-label="Add Market"
              onClick={(event) => {
                event.stopPropagation();
                onAddMarket();
              }}
            >
              Add Market
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={`${CONTEXT_MENU_BTN} opacity-60 cursor-not-allowed`}
              data-context-action="add-market-blocked"
              disabled
              aria-label="Add Market unavailable because a Nesting Beast is present"
            >
              Add Market (Nesting Beast present)
            </button>
          )}
          {isleAcceptsManualBeast(menu.snapshot, menu.boardIsleId) && (
            <button
              type="button"
              role="menuitem"
              className={CONTEXT_MENU_BTN}
              data-context-action="add-beast"
              aria-label="Add Beast"
              onClick={(event) => {
                event.stopPropagation();
                onAddBeast();
              }}
            >
              Add Beast…
            </button>
          )}
        </>
      )}
      {menu.kind === "isle" && menu.market.present && menu.market.rarity === null && (
        <>
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="add-rarity"
            aria-label="Add Rarity"
            onClick={(event) => {
              event.stopPropagation();
              onAddRarity();
            }}
          >
            Add Rarity…
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${CONTEXT_MENU_BTN} text-red-700 dark:text-red-400`}
            data-context-action="remove-market"
            aria-label="Remove Market"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveMarket();
            }}
          >
            Remove Market
          </button>
        </>
      )}
      {menu.kind === "isle" && menu.market.present && menu.market.rarity !== null && (
        <>
          {marinerMarketHasUndescribedRarity(menu.market) ? (
            <button
              type="button"
              role="menuitem"
              className={CONTEXT_MENU_BTN}
              data-context-action="describe-rarity"
              aria-label="Describe Rarity"
              onClick={(event) => {
                event.stopPropagation();
                onDescribeRarity();
              }}
            >
              Describe Rarity…
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={CONTEXT_MENU_BTN}
              data-context-action="edit-rarity"
              aria-label="Edit Rarity"
              onClick={(event) => {
                event.stopPropagation();
                onEditRarity();
              }}
            >
              Edit Rarity…
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className={CONTEXT_MENU_BTN}
            data-context-action="remove-rarity"
            aria-label="Remove Rarity"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveRarity();
            }}
          >
            Remove Rarity
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${CONTEXT_MENU_BTN} text-red-700 dark:text-red-400`}
            data-context-action="remove-market"
            aria-label="Remove Market"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveMarket();
            }}
          >
            Remove Market
          </button>
        </>
      )}
    </div>
  );
}

function TrayPiece({
  kind,
  label,
  ariaLabel,
  className,
  onBegin,
  children,
}: {
  kind: string;
  label: string;
  ariaLabel: string;
  className: string;
  onBegin: (event: ReactPointerEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-tray-piece={kind}
      aria-label={ariaLabel}
      className={`flex h-8 min-w-8 cursor-grab flex-col items-center justify-center rounded border px-1 ${className}`}
      onPointerDown={onBegin}
    >
      {children}
      <span className="text-[8px] leading-none text-slate-600 dark:text-slate-300">{label}</span>
    </button>
  );
}

export function MarinerPieceSupplyTray({
  onBeginShip,
  onBeginRaider,
  onBeginStorm,
  onBeginMarket,
  onBeginRareMarket,
}: {
  onBeginShip: (event: ReactPointerEvent) => void;
  onBeginRaider: (event: ReactPointerEvent) => void;
  onBeginStorm: (event: ReactPointerEvent) => void;
  onBeginMarket: (event: ReactPointerEvent) => void;
  onBeginRareMarket: (event: ReactPointerEvent) => void;
}) {
  return (
    <div
      data-piece-tray
      className="flex items-center gap-2 rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-2 py-1"
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Supply</span>
      <TrayPiece kind="ship" label="Ship" ariaLabel="Place Ship" className="border-teal-700/40 bg-teal-50 dark:bg-teal-950" onBegin={onBeginShip}>
        <svg width={16} height={12} viewBox="-8 -8 16 16" aria-hidden="true">
          <path d="M-4.2 2.1 L-2.3 -1.1 L3.2 -1.1 L5.1 2.1 Z" fill="#0f766e" stroke="#042f2e" />
        </svg>
      </TrayPiece>
      <TrayPiece kind="raider" label="Raider" ariaLabel="Place Raider" className="border-red-800/40 bg-orange-50 dark:bg-orange-950" onBegin={onBeginRaider}>
        <svg width={16} height={12} viewBox="-8 -8 16 16" aria-hidden="true">
          <polygon points="-3.4,-2.7 -3.4,2.7 5.6,0" fill="#7c2d12" stroke="#431407" />
        </svg>
      </TrayPiece>
      <TrayPiece kind="storm" label="Storm" ariaLabel="Place Storm" className="border-slate-500/40 bg-slate-100 dark:bg-slate-800" onBegin={onBeginStorm}>
        <svg width={14} height={14} viewBox="-16 -16 32 32" aria-hidden="true">
          <path d="M-10 4 Q -4 -10 4 -6 Q 10 -2 8 6 Q 0 10 -10 4 Z" fill="#475569" stroke="#0f172a" />
        </svg>
      </TrayPiece>
      <TrayPiece kind="market" label="Market" ariaLabel="Place Market" className="border-amber-700/40 bg-amber-50 dark:bg-amber-950" onBegin={onBeginMarket}>
        <svg width={14} height={12} viewBox="-12 -16 24 28" aria-hidden="true">
          <rect x={-8} y={-6} width={16} height={12} fill="#b45309" stroke="#78350f" />
          <path d="M -10 -6 L 0 -14 L 10 -6" fill="#f59e0b" stroke="#78350f" />
        </svg>
      </TrayPiece>
      <TrayPiece kind="rare-market" label="Rare Market" ariaLabel="Place Rare Market" className="border-amber-700/40 bg-amber-50 dark:bg-amber-950" onBegin={onBeginRareMarket}>
        <svg width={14} height={12} viewBox="-12 -16 24 28" aria-hidden="true">
          <rect x={-8} y={-6} width={16} height={12} fill="#b45309" stroke="#78350f" />
          <path d="M -10 -6 L 0 -14 L 10 -6" fill="#f59e0b" stroke="#78350f" />
          <polygon data-rarity-cue="true" points="8,-16 9.2,-12.6 13,-12.6 10,-10.4 11.2,-7 8,-9.2 4.8,-7 6,-10.4 3,-12.6 6.8,-12.6" fill="#f8fafc" stroke="#0f172a" />
        </svg>
      </TrayPiece>
    </div>
  );
}

const LOCAL_FIELD =
  "text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 w-full";
const LOCAL_BTN =
  "text-xs font-medium rounded px-2 py-1 cursor-pointer bg-teal-800 dark:bg-teal-200 text-white dark:text-teal-950 disabled:opacity-50";
const LOCAL_GHOST =
  "text-xs font-medium rounded px-2 py-1 cursor-pointer border border-slate-200 dark:border-slate-700";

export function BeastRampageChooser({
  pendingIntent,
  world,
  pending,
  onCancel,
  onSubmit,
}: {
  pendingIntent: PendingBeastRampage;
  world: WorldReference;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (destinationSeatId: PactSeatId) => void;
}) {
  const [seatId, setSeatId] = useState("");
  const beastLabel = denizenName(world.denizens, pendingIntent.beast.denizenId);
  return (
    <div
      data-beast-rampage-chooser
      className="fixed z-20 rounded-lg border border-teal-200 dark:border-teal-800 bg-white/95 dark:bg-slate-900/95 p-2 space-y-2 shadow-md max-w-xs"
      style={{
        left: pendingIntent.dropClientX ?? 16,
        top: pendingIntent.dropClientY ?? 16,
      }}
    >
      <p className="text-xs text-slate-600 dark:text-slate-300">
        This Beast move causes a Rampage. Choose one destination Domain.
      </p>
      <label className="text-xs block">
        {`Rampage destination — ${beastLabel}`}
        <select
          aria-label={`Rampage destination for ${beastLabel}`}
          className={`${LOCAL_FIELD} mt-1`}
          value={seatId}
          onChange={(event) => setSeatId(event.target.value)}
        >
          <option value="">Select destination Domain…</option>
          {otherDomainSeatOptions().map((option) => (
            <option key={option} value={option}>{pactSeatDisplayName(option)}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className={LOCAL_BTN}
          disabled={pending || seatId === ""}
          onClick={() => onSubmit(seatId as PactSeatId)}
        >
          Confirm Rampage
        </button>
        <button type="button" className={LOCAL_GHOST} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function BeastAddChooser({
  pendingIntent,
  world,
  pending,
  onCancel,
  onSubmit,
}: {
  pendingIntent: PendingBeastAdd;
  world: WorldReference;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (beast: MarinerBeastState) => void;
}) {
  const unused = availableIndividualBeastDenizens(world.denizens, pendingIntent.snapshot.beasts);
  const [denizenId, setDenizenId] = useState("");
  const [element, setElement] = useState<ElementId>("air");
  const [definitionId, setDefinitionId] = useState("");
  const matching = definitionsMatchingElement(element);
  return (
    <div
      data-beast-add-chooser
      className="fixed z-20 rounded-lg border border-teal-200 dark:border-teal-800 bg-white/95 dark:bg-slate-900/95 p-2 space-y-2 shadow-md min-w-[14rem]"
      style={{ left: pendingIntent.clientX, top: pendingIntent.clientY }}
    >
      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Add Beast</p>
      {unused.length === 0 ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">No available Beast-profile World Denizens.</p>
      ) : (
        <>
          <label className="text-xs block">
            Denizen
            <select
              aria-label="Add Beast Denizen"
              className={`${LOCAL_FIELD} mt-1`}
              value={denizenId}
              onChange={(event) => setDenizenId(event.target.value)}
            >
              <option value="">Select Denizen with Beast profile…</option>
              {unused.map((denizen) => (
                <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs block">
            Element
            <select
              aria-label="Beast Element"
              className={`${LOCAL_FIELD} mt-1`}
              value={element}
              onChange={(event) => {
                const next = event.target.value as ElementId;
                setElement(next);
                if (definitionId !== "") setDefinitionId("");
              }}
            >
              {MARINER_ELEMENTS.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>
          <label className="text-xs block">
            Built-in definition
            <select
              aria-label="Beast definition"
              className={`${LOCAL_FIELD} mt-1`}
              value={definitionId}
              onChange={(event) => setDefinitionId(event.target.value)}
            >
              <option value="">Custom Beast</option>
              {matching.map((definition) => (
                <option key={definition.id} value={definition.id}>{definition.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={LOCAL_BTN}
            disabled={pending || denizenId === ""}
            onClick={() => {
              onSubmit({
                denizenId: denizenId as MarinerBeastState["denizenId"],
                element,
                definitionId: definitionId === "" ? null : definitionId as NonNullable<MarinerBeastState["definitionId"]>,
                condition: pendingIntent.target.kind === "sea" ? "distrusting" : "friendly_nesting",
                location: pendingIntent.target.kind === "sea"
                  ? { kind: "sea_region", regionId: pendingIntent.target.regionId }
                  : { kind: "board_isle", boardIsleId: pendingIntent.target.boardIsleId },
              });
            }}
          >
            Add Beast
          </button>
        </>
      )}
      <button type="button" className={LOCAL_GHOST} onClick={onCancel}>Cancel</button>
    </div>
  );
}

export function BeastRemoveConfirm({
  pendingIntent,
  world,
  pending,
  onCancel,
  onConfirm,
}: {
  pendingIntent: PendingBeastRemove;
  world: WorldReference;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = denizenName(world.denizens, pendingIntent.beast.denizenId);
  return (
    <div
      data-beast-remove-confirm
      className="fixed z-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-2 space-y-2 shadow-md"
      style={{ left: pendingIntent.clientX, top: pendingIntent.clientY }}
    >
      <p className="text-xs text-slate-700 dark:text-slate-200">{`Remove ${name}?`}</p>
      <div className="flex gap-2">
        <button type="button" className={LOCAL_BTN} disabled={pending} onClick={onConfirm}>Remove</button>
        <button type="button" className={LOCAL_GHOST} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function RarityEditor({
  pendingIntent,
  pending,
  onCancel,
  onSubmit,
}: {
  pendingIntent: PendingRarityEditor;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (description: string) => void;
}) {
  const initial = marinerRarityEditorPrefill(pendingIntent.expectedMarket);
  const [description, setDescription] = useState(initial);
  const [reservedError, setReservedError] = useState<string | null>(null);
  const describe = pendingIntent.mode === "describe";
  return (
    <div
      data-rarity-editor
      data-rarity-prompt={describe ? "true" : undefined}
      className="fixed z-20 rounded-lg border border-teal-200 dark:border-teal-800 bg-white/95 dark:bg-slate-900/95 p-2 space-y-2 shadow-md min-w-[14rem]"
      style={{ left: pendingIntent.clientX, top: pendingIntent.clientY }}
    >
      <label className="text-xs block">
        {describe ? "Describe Rarity" : "Rarity description"}
        <input
          aria-label="Rarity description"
          className={`${LOCAL_FIELD} mt-1`}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setReservedError(null);
          }}
        />
      </label>
      {reservedError !== null && (
        <p className="text-xs text-amber-800 dark:text-amber-200">{reservedError}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className={LOCAL_BTN}
          disabled={pending || description.trim() === ""}
          onClick={() => {
            if (isReservedMarinerRarityDescriptionInput(description)) {
              setReservedError("That text is reserved and cannot be used as a Rarity description.");
              return;
            }
            onSubmit(description);
          }}
        >
          Save Rarity
        </button>
        <button type="button" className={LOCAL_GHOST} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function BeastElsewhereChooser({
  pendingIntent,
  mariner,
  world,
  pending,
  onCancel,
  onChooseSea,
  onChooseIsle,
}: {
  pendingIntent: PendingBeastElsewhereChooser;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  onCancel: () => void;
  onChooseSea: (regionId: MarinerSeaRegionId) => void;
  onChooseIsle: (boardIsleId: MarinerBoardIsleId) => void;
}) {
  const sourceRegionId = pendingIntent.kind === "move" || pendingIntent.kind === "nest"
    ? pendingIntent.sourceRegionId
    : null;
  const sourceIsleId = pendingIntent.beast.location.kind === "board_isle"
    ? pendingIntent.beast.location.boardIsleId
    : null;
  const recommendedSeas = sourceRegionId === null ? new Set<MarinerSeaRegionId>() : new Set(adjacentSeaIds(sourceRegionId));
  const recommendedIsles = sourceRegionId === null ? new Set<MarinerBoardIsleId>() : new Set(adjacentIsleIds(sourceRegionId));
  const listingSeas = pendingIntent.kind === "move" || pendingIntent.kind === "leave-nest";
  const title = pendingIntent.kind === "move"
    ? "Move elsewhere"
    : pendingIntent.kind === "nest"
      ? "Nest elsewhere"
      : pendingIntent.kind === "relocate-nest"
        ? "Move Nest elsewhere"
        : "Leave Nest to Sea";
  return (
    <div
      data-beast-move-elsewhere-chooser={pendingIntent.kind === "move" ? "true" : undefined}
      data-beast-nest-elsewhere-chooser={pendingIntent.kind === "nest" ? "true" : undefined}
      data-beast-relocate-nest-chooser={pendingIntent.kind === "relocate-nest" ? "true" : undefined}
      data-beast-leave-nest-chooser={pendingIntent.kind === "leave-nest" ? "true" : undefined}
      className="fixed z-20 max-h-72 overflow-auto rounded-lg border border-teal-200 dark:border-teal-800 bg-white/95 dark:bg-slate-900/95 p-2 space-y-1 shadow-md min-w-[12rem]"
      style={{ left: pendingIntent.clientX, top: pendingIntent.clientY }}
    >
      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {listingSeas
        ? MARINER_SEA_REGION_CATALOG
          .filter((region) => (
            pendingIntent.kind === "leave-nest"
              ? true
              : region.regionId !== sourceRegionId && !recommendedSeas.has(region.regionId)
          ))
          .map((region) => (
            <button
              key={region.regionId}
              type="button"
              className={`${CONTEXT_MENU_BTN} disabled:opacity-50`}
              data-elsewhere-region-id={region.regionId}
              disabled={pending}
              onClick={() => onChooseSea(region.regionId)}
            >
              {seaRegionDisplayName(region.regionId)}
            </button>
          ))
        : MARINER_BOARD_ISLE_IDS
          .filter((boardIsleId) => (
            pendingIntent.kind === "relocate-nest"
              ? boardIsleId !== sourceIsleId
              : !recommendedIsles.has(boardIsleId)
          ))
          .map((boardIsleId) => {
            const reason = nestBlockReason(pendingIntent.snapshot, boardIsleId);
            const label = boardIsleWorldName(mariner, world.isles, boardIsleId);
            return (
              <button
                key={boardIsleId}
                type="button"
                className={reason === null ? CONTEXT_MENU_BTN : `${CONTEXT_MENU_BTN} opacity-60 cursor-not-allowed`}
                data-elsewhere-isle-id={boardIsleId}
                data-disabled-reason={reason ?? undefined}
                disabled={pending || reason !== null}
                onClick={() => onChooseIsle(boardIsleId)}
              >
                {reason === null ? label : `${label} (${reason})`}
              </button>
            );
          })}
      <button type="button" className={LOCAL_GHOST} onClick={onCancel}>Cancel</button>
    </div>
  );
}
