import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  captureOperabilityBoard,
  expectedForCreateShip,
  expectedForMoveShip,
  expectedForMoveStorm,
  newCommandId,
  predictedNewlyTrappedBeastIdsAfterShipPlacement,
  routeEndpointLabel,
  MARINER_ROUTE_CATALOG,
} from "./mariner-view-model";
import type { WorldReference } from "./WorldSurface";
import { marinerSeaOperationalView } from "./mariner-operational-view";
import { marinerRouteGeometry } from "./mariner-map-geometry";
import { marinerOverlayPointToBoard } from "./source-board-assets";
import {
  endpointKey,
  findRouteDropId,
  findSeaDropRegionId,
  isEmptyRoute,
  pointerMovementExceedsDragThreshold,
  raiderTowardAppliesOnRoute,
  representableRaiderEndpoints,
  routesShareBoardIsleEndpoint,
} from "./mariner-board-pointer";

type DragKind = "storm" | "route-piece";

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
  readonly sourceRouteId: string;
  readonly destinationRouteId: string;
  readonly choices: readonly MarinerRouteEndpoint[];
};

export type BoardDragVisual = {
  readonly kind: DragKind;
  readonly clientX: number;
  readonly clientY: number;
  readonly typhoon: boolean;
  readonly occupancyKind?: "ship" | "raider";
};

export function useMarinerBoardInteractions(args: {
  readonly mariner: MarinerState;
  readonly world: WorldReference;
  readonly campaignId: string;
  readonly pending: boolean;
  readonly run: (action: () => Promise<void>) => Promise<boolean>;
  readonly moveMarinerStorm: (payload: ReturnType<typeof buildMoveMarinerStormPayload>) => Promise<unknown>;
  readonly moveMarinerShip: (payload: ReturnType<typeof buildMoveMarinerShipPayload>) => Promise<unknown>;
  readonly createMarinerShip: (payload: ReturnType<typeof buildCreateMarinerShipPayload>) => Promise<unknown>;
  readonly setMarinerRouteOccupancy: (payload: ReturnType<typeof buildSetMarinerRouteOccupancyPayload>) => Promise<unknown>;
  readonly onSelectRegion: (regionId: MarinerSeaRegionId) => void;
  readonly onSelectRoute: (routeId: string) => void;
}) {
  const {
    mariner,
    world,
    campaignId,
    pending,
    run,
    moveMarinerStorm,
    moveMarinerShip,
    createMarinerShip,
    setMarinerRouteOccupancy,
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
  const [focusedRouteId, setFocusedRouteId] = useState<string | null>(null);
  const [pendingRaiderDirection, setPendingRaiderDirection] = useState<PendingRaiderDirection | null>(null);
  const [pendingShipRampage, setPendingShipRampage] = useState<{
    targetRouteId: string;
    sourceRouteId?: string;
    occupancy: MarinerRouteOccupancy;
  } | null>(null);

  const stormDragSourceId = draggingActive && sessionRef.current?.kind === "storm"
    ? sessionRef.current.sourceRegionId ?? null
    : null;

  const recommendedSeaIds = stormDragSourceId === null
    ? []
    : marinerSeaOperationalView(mariner, stormDragSourceId).adjacentRegionIds;

  const routeDragSourceId = draggingActive && sessionRef.current?.kind === "route-piece"
    ? sessionRef.current.sourceRouteId ?? null
    : null;

  const cancelDrag = useCallback(() => {
    sessionRef.current = null;
    setDraggingActive(false);
    setDragVisual(null);
    setHoveredSeaId(null);
    setHoveredRouteDropId(null);
  }, []);

  const commitStormDrop = useCallback(async (destinationRegionId: MarinerSeaRegionId) => {
    const session = sessionRef.current;
    if (session?.kind !== "storm" || session.sourceRegionId === undefined) return;
    if (destinationRegionId === session.sourceRegionId) return;
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
  }, [campaignId, cancelDrag, moveMarinerStorm, run]);

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
        targetRouteId: destinationRouteId,
        sourceRouteId,
        occupancy: destinationToward === null ? { kind: "ship" } : { kind: "raider", toward: destinationToward },
      });
      cancelDrag();
      return;
    }
    const ok = await run(async () => { await moveMarinerShip(payload); });
    cancelDrag();
    if (!ok) suppressClickRef.current = false;
  }, [campaignId, cancelDrag, moveMarinerShip, run]);

  const commitRoutePieceDrop = useCallback(async (destinationRouteId: string) => {
    const session = sessionRef.current;
    if (session?.kind !== "route-piece" || session.sourceRouteId === undefined || session.sourceOccupancy === undefined) {
      return;
    }
    if (destinationRouteId === session.sourceRouteId) return;
    if (!isEmptyRoute(session.snapshot.routes, destinationRouteId)) return;

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
        sourceRouteId: session.sourceRouteId,
        destinationRouteId,
        choices,
      });
      cancelDrag();
    }
  }, [cancelDrag, commitShipMove]);

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
      }
      const active = sessionRef.current;
      if (active === null || !active.dragging) return;

      if (active.kind === "storm") {
        const stormCount = mariner.seaRegions.find((region) => region.regionId === active.sourceRegionId)?.stormCount ?? 0;
        setDragVisual({
          kind: "storm",
          clientX: event.clientX,
          clientY: event.clientY,
          typhoon: stormCount >= 2,
        });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        setHoveredSeaId(findSeaDropRegionId(target) as MarinerSeaRegionId | null);
        setHoveredRouteDropId(null);
        return;
      }

      if (active.kind === "route-piece") {
        setDragVisual({
          kind: "route-piece",
          clientX: event.clientX,
          clientY: event.clientY,
          typhoon: false,
          occupancyKind: active.sourceOccupancy?.kind === "raider" ? "raider" : "ship",
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
      if (session.kind === "route-piece") {
        const dropRoute = findRouteDropId(document.elementFromPoint(event.clientX, event.clientY));
        if (dropRoute !== null) {
          void commitRoutePieceDrop(dropRoute);
          return;
        }
      }
      cancelDrag();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sessionRef.current !== null) {
        cancelDrag();
        suppressClickRef.current = false;
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
    cancelDrag,
    commitRoutePieceDrop,
    commitStormDrop,
    mariner.seaRegions,
    onSelectRegion,
    onSelectRoute,
  ]);

  const beginStormPointer = useCallback((regionId: MarinerSeaRegionId, event: ReactPointerEvent) => {
    if (pending) return;
    const storms = mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
    if (storms < 1) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    sessionRef.current = {
      kind: "storm",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      snapshot: captureOperabilityBoard(mariner),
      sourceRegionId: regionId,
    };
  }, [mariner, pending]);

  const beginRoutePiecePointer = useCallback((routeId: string, occupancy: MarinerRouteOccupancy, event: ReactPointerEvent) => {
    if (pending || occupancy.kind === "empty") return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
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
  }, [mariner, pending]);

  const addShipToRoute = useCallback(async (routeId: string) => {
    if (pending || !isEmptyRoute(mariner.routes, routeId)) return;
    const snapshot = captureOperabilityBoard(mariner);
    const predicted = predictedNewlyTrappedBeastIdsAfterShipPlacement(snapshot, routeId, { kind: "ship" });
    if (predicted.length > 0) {
      setPendingShipRampage({ targetRouteId: routeId, occupancy: { kind: "ship" } });
      return;
    }
    const payload = buildCreateMarinerShipPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      targetRouteId: routeId,
      destinationToward: null,
      ...expectedForCreateShip(snapshot, routeId),
      rampageResolutions: [],
    });
    await run(async () => { await createMarinerShip(payload); });
  }, [campaignId, createMarinerShip, mariner, pending, run]);

  const addRaiderToRoute = useCallback(async (routeId: string, toward: MarinerRouteEndpoint) => {
    if (pending || !isEmptyRoute(mariner.routes, routeId)) return;
    const snapshot = captureOperabilityBoard(mariner);
    const occupancy = { kind: "raider" as const, toward };
    const predicted = predictedNewlyTrappedBeastIdsAfterShipPlacement(snapshot, routeId, occupancy);
    if (predicted.length > 0) {
      setPendingShipRampage({ targetRouteId: routeId, occupancy });
      return;
    }
    const payload = buildCreateMarinerShipPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      targetRouteId: routeId,
      destinationToward: toward,
      ...expectedForCreateShip(snapshot, routeId),
      rampageResolutions: [],
    });
    await run(async () => { await createMarinerShip(payload); });
  }, [campaignId, createMarinerShip, mariner, pending, run]);

  const removeRouteOccupancy = useCallback(async (routeId: string) => {
    if (pending) return;
    const route = mariner.routes.find((entry) => entry.routeId === routeId);
    if (route === undefined || route.occupancy.kind === "empty") return;
    const payload = buildSetMarinerRouteOccupancyPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      routeId,
      expectedOccupancy: route.occupancy,
      occupancy: { kind: "empty" },
    });
    await run(async () => { await setMarinerRouteOccupancy(payload); });
  }, [campaignId, mariner.routes, pending, run, setMarinerRouteOccupancy]);

  const chooseRaiderDirection = useCallback(async (toward: MarinerRouteEndpoint) => {
    if (pendingRaiderDirection === null) return;
    const snapshot = captureOperabilityBoard(mariner);
    await commitShipMove(
      pendingRaiderDirection.sourceRouteId,
      pendingRaiderDirection.destinationRouteId,
      toward,
      snapshot,
    );
    setPendingRaiderDirection(null);
  }, [commitShipMove, mariner, pendingRaiderDirection, pending]);

  const consumeSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const routeDropHighlight = useCallback((routeId: string): "recommended" | "available" | "hover" | "blocked" | null => {
    if (routeDragSourceId === null) return null;
    if (routeId === routeDragSourceId) return "blocked";
    if (!isEmptyRoute(mariner.routes, routeId)) return "blocked";
    if (hoveredRouteDropId === routeId) return "hover";
    return routesShareBoardIsleEndpoint(routeDragSourceId, routeId) ? "recommended" : "available";
  }, [hoveredRouteDropId, mariner.routes, routeDragSourceId]);

  const seaDropHighlight = useCallback((regionId: MarinerSeaRegionId): "source" | "recommended" | "available" | "hover" | null => {
    if (stormDragSourceId === null) return null;
    if (regionId === stormDragSourceId) return "source";
    if (hoveredSeaId === regionId) return "hover";
    if (recommendedSeaIds.includes(regionId)) return "recommended";
    return "available";
  }, [hoveredSeaId, recommendedSeaIds, stormDragSourceId]);

  return {
    dragVisual,
    stormDragSourceId,
    routeDragSourceId,
    focusedRouteId,
    setFocusedRouteId,
    pendingRaiderDirection,
    setPendingRaiderDirection,
    pendingShipRampage,
    setPendingShipRampage,
    beginStormPointer,
    beginRoutePiecePointer,
    addShipToRoute,
    addRaiderToRoute,
    removeRouteOccupancy,
    chooseRaiderDirection,
    consumeSuppressClick,
    routeDropHighlight,
    seaDropHighlight,
    cancelDrag,
  };
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
      {visual.kind === "storm" ? (
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

export function RouteQuickActions({
  routeId,
  mariner,
  world,
  visible,
  onAddShip,
  onAddRaider,
  onRemove,
  occupied,
}: {
  routeId: string;
  mariner: MarinerState;
  world: WorldReference;
  visible: boolean;
  onAddShip: () => void;
  onAddRaider: (toward: MarinerRouteEndpoint) => void;
  onRemove: () => void;
  occupied: MarinerRouteOccupancy;
}) {
  const geometry = marinerRouteGeometry(routeId);
  if (!visible || geometry === null) return null;
  const anchor = marinerOverlayPointToBoard(geometry.pieceAnchor.x, geometry.pieceAnchor.y);
  const endpoints = representableRaiderEndpoints(routeId);
  const routeDef = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === routeId);
  const routeLabel = routeDef === undefined
    ? routeId
    : `${routeEndpointLabel(routeDef.endpointA, mariner, world.isles)} — ${routeEndpointLabel(routeDef.endpointB, mariner, world.isles)}`;

  if (occupied.kind === "empty") {
    return (
      <g
        data-route-quick-actions
        data-route-id={routeId}
        transform={`translate(${anchor.x} ${anchor.y})`}
        pointerEvents="all"
      >
        <circle r={22} fill="#ffffff" fillOpacity={0.92} stroke="#0f766e" strokeWidth={1} />
        <g transform="translate(-18 -4)">
          <circle
            r={7}
            cx={18}
            cy={0}
            fill="#0f766e"
            data-quick-action="add-ship"
            role="button"
            aria-label={`Add Ship on route ${routeLabel}`}
            onClick={(event) => {
              event.stopPropagation();
              onAddShip();
            }}
          >
            <title>Add Ship</title>
          </circle>
          <text x={18} y={2} textAnchor="middle" fontSize={9} fill="#fff" pointerEvents="none">+S</text>
        </g>
        {endpoints.map((endpoint, index) => {
          const x = index === 0 ? -10 : 46;
          const label = routeEndpointLabel(endpoint, mariner, world.isles);
          return (
            <g key={endpointKey(endpoint)} transform={`translate(${x} -4)`}>
              <circle
                r={7}
                cx={0}
                cy={0}
                fill="#7c2d12"
                data-quick-action="add-raider"
                data-raider-toward={endpointKey(endpoint)}
                role="button"
                aria-label={`Add Raider toward ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddRaider(endpoint);
                }}
              >
                <title>{`Add Raider toward ${label}`}</title>
              </circle>
              <text x={0} y={2} textAnchor="middle" fontSize={7} fill="#fff" pointerEvents="none">+R</text>
            </g>
          );
        })}
      </g>
    );
  }

  const removeLabel = occupied.kind === "ship"
    ? `Remove Ship from route ${routeId}`
    : `Remove Raider from route ${routeId}`;

  return (
    <g
      data-route-quick-actions
      data-route-id={routeId}
      transform={`translate(${anchor.x + 14} ${anchor.y - 14})`}
      pointerEvents="all"
    >
      <circle
        r={8}
        fill="#fef2f2"
        stroke="#b91c1c"
        strokeWidth={1}
        data-quick-action="remove"
        role="button"
        aria-label={removeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <title>Remove</title>
      </circle>
      <text x={0} y={2} textAnchor="middle" fontSize={8} fill="#b91c1c" pointerEvents="none">×</text>
    </g>
  );
}
