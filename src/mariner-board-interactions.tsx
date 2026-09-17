import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  MarinerRouteEndpoint,
  MarinerRouteOccupancy,
  MarinerSeaRegionId,
  MarinerState,
} from "../shared/domain";
import {
  buildCreateMarinerShipPayload,
  buildMoveMarinerShipPayload,
  buildMoveMarinerStormPayload,
  buildSetMarinerRouteOccupancyPayload,
  buildSetMarinerSeaStormCountPayload,
  captureOperabilityBoard,
  expectedForCreateShip,
  expectedForMoveShip,
  expectedForMoveStorm,
  newCommandId,
  predictedNewlyTrappedBeastIdsAfterShipPlacement,
  routeEndpointLabel,
  seaRegionDisplayName,
  MARINER_ROUTE_CATALOG,
} from "./mariner-view-model";
import type { WorldReference } from "./WorldSurface";
import { marinerSeaOperationalView } from "./mariner-operational-view";
import {
  endpointKey,
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

type DragKind = "storm" | "route-piece" | "tray-ship" | "tray-raider" | "tray-storm";

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
    };

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
  readonly onSelectRegion: (regionId: MarinerSeaRegionId) => void;
  readonly onSelectRoute: (routeId: string) => void;
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
    onSelectRegion,
    onSelectRoute,
  } = args;

  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingActive, setDraggingActive] = useState(false);
  const [dragVisual, setDragVisual] = useState<BoardDragVisual | null>(null);
  const [hoveredSeaId, setHoveredSeaId] = useState<MarinerSeaRegionId | null>(null);
  const [hoveredRouteDropId, setHoveredRouteDropId] = useState<string | null>(null);
  const hoveredSeaRef = useRef<MarinerSeaRegionId | null>(null);
  const hoveredRouteRef = useRef<string | null>(null);
  hoveredSeaRef.current = hoveredSeaId;
  hoveredRouteRef.current = hoveredRouteDropId;
  const [pendingRaiderDirection, setPendingRaiderDirection] = useState<PendingRaiderDirection | null>(null);
  const [pendingShipRampage, setPendingShipRampage] = useState<PendingShipRampage | null>(null);
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
  const hasPendingDirectIntent = pendingRaiderDirection !== null || pendingShipRampage !== null;
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

  const recommendedSeaIds = stormDragSourceId === null
    ? []
    : marinerSeaOperationalView(mariner, stormDragSourceId).adjacentRegionIds;

  const cancelDrag = useCallback(() => {
    sessionRef.current = null;
    setDraggingActive(false);
    setDragVisual(null);
    setHoveredSeaId(null);
    setHoveredRouteDropId(null);
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
    commitRoutePieceDrop,
    commitStormDrop,
    commitTrayRouteDrop,
    commitTrayStormDrop,
    mariner.seaRegions,
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

  const beginTrayPointer = useCallback((kind: "tray-ship" | "tray-raider" | "tray-storm", event: ReactPointerEvent) => {
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
    if (routeDragSourceId === null && !trayRouteDragActive) return null;
    if (routeDragSourceId !== null && routeId === routeDragSourceId) return "blocked";
    if (!isEmptyRoute(mariner.routes, routeId)) return "blocked";
    if (hoveredRouteDropId === routeId) return "hover";
    if (routeDragSourceId !== null) {
      return routesShareBoardIsleEndpoint(routeDragSourceId, routeId) ? "recommended" : "available";
    }
    return "available";
  }, [hoveredRouteDropId, mariner.routes, routeDragSourceId, trayRouteDragActive]);

  const seaDropHighlight = useCallback((regionId: MarinerSeaRegionId): "source" | "recommended" | "available" | "hover" | null => {
    if (stormDragSourceId === null && !trayStormDragActive) return null;
    if (stormDragSourceId !== null && regionId === stormDragSourceId) return "source";
    if (hoveredSeaId === regionId) return "hover";
    if (stormDragSourceId !== null && recommendedSeaIds.includes(regionId)) return "recommended";
    return "available";
  }, [hoveredSeaId, recommendedSeaIds, stormDragSourceId, trayStormDragActive]);

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

  return {
    dragVisual,
    stormDragSourceId,
    routeDragSourceId,
    pendingRaiderDirection,
    setPendingRaiderDirection,
    pendingShipRampage,
    submitPendingShipRampage,
    cancelPendingShipRampage,
    contextMenu,
    openRouteContextMenu,
    openSeaContextMenu,
    closeContextMenu,
    contextAddShip,
    contextAddRaider,
    contextReverseRaider,
    contextChangeRaiderToShip,
    contextChangeShipToRaider,
    contextRemoveOccupancy,
    contextAddStorm,
    contextRemoveStorm,
    beginStormPointer,
    beginRoutePiecePointer,
    beginTrayShipPointer,
    beginTrayRaiderPointer,
    beginTrayStormPointer,
    chooseRaiderDirection,
    consumeSuppressClick,
    routeDropHighlight,
    seaDropHighlight,
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
      data-context-target={menu.kind === "route" ? menu.routeId : menu.regionId}
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
        </>
      )}
    </div>
  );
}

export function MarinerPieceSupplyTray({
  onBeginShip,
  onBeginRaider,
  onBeginStorm,
}: {
  onBeginShip: (event: ReactPointerEvent) => void;
  onBeginRaider: (event: ReactPointerEvent) => void;
  onBeginStorm: (event: ReactPointerEvent) => void;
}) {
  return (
    <div
      data-piece-tray
      className="flex items-center gap-2 rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-2 py-1"
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Supply</span>
      <button
        type="button"
        data-tray-piece="ship"
        aria-label="Place Ship"
        className="flex h-8 w-8 cursor-grab items-center justify-center rounded border border-teal-700/40 bg-teal-50 dark:bg-teal-950"
        onPointerDown={onBeginShip}
      >
        <svg width={18} height={14} viewBox="-8 -8 16 16" aria-hidden="true">
          <path d="M-4.2 2.1 L-2.3 -1.1 L3.2 -1.1 L5.1 2.1 Z" fill="#0f766e" stroke="#042f2e" />
        </svg>
      </button>
      <button
        type="button"
        data-tray-piece="raider"
        aria-label="Place Raider"
        className="flex h-8 w-8 cursor-grab items-center justify-center rounded border border-red-800/40 bg-orange-50 dark:bg-orange-950"
        onPointerDown={onBeginRaider}
      >
        <svg width={18} height={14} viewBox="-8 -8 16 16" aria-hidden="true">
          <polygon points="-3.4,-2.7 -3.4,2.7 5.6,0" fill="#7c2d12" stroke="#431407" />
        </svg>
      </button>
      <button
        type="button"
        data-tray-piece="storm"
        aria-label="Place Storm"
        className="flex h-8 w-8 cursor-grab items-center justify-center rounded border border-slate-500/40 bg-slate-100 dark:bg-slate-800"
        onPointerDown={onBeginStorm}
      >
        <svg width={18} height={18} viewBox="-16 -16 32 32" aria-hidden="true">
          <path d="M-10 4 Q -4 -10 4 -6 Q 10 -2 8 6 Q 0 10 -10 4 Z" fill="#475569" stroke="#0f172a" />
        </svg>
      </button>
    </div>
  );
}
