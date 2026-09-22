import { useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { MarinerBoardIsleId, MarinerExternalLandId, MarinerRouteEndpoint } from "../shared/domain";
import { MARINER_BOARD_ISLE_IDS, MARINER_EXTERNAL_LAND_IDS } from "../shared/domain";
import { endpointKey } from "./mariner-board-pointer";
import { MARINER_ROUTE_CATALOG } from "./mariner-view-model";
import type { NecromancerBuiltinGateId, NecromancerBuiltinPathSpaceId } from "../shared/domain";
import marinerInteractionGeometryRaw from "./assets/source-boards/mariner-interaction-geometry.svg?raw";
import necromancerInteractionGeometryRaw from "./assets/source-boards/necromancer-interaction-geometry.svg?raw";
import { mapEndpointPoint } from "./mariner-map-geometry";
import { raiderHeadingTowardRouteEndpoint } from "./mariner-marker-orientation";
import { marinerOverlayPointToBoard } from "./source-board-assets";
import { MarinerBoardPendingRing, marinerBoardPendingPresentation } from "./mariner-board-pending-presentation";

/** Generated PowerPoint-native interaction sprites. Referenced by application IDs; never parsed for identity. */
export const MARINER_INTERACTION_GEOMETRY_RAW = marinerInteractionGeometryRaw;
export const NECROMANCER_INTERACTION_GEOMETRY_RAW = necromancerInteractionGeometryRaw;

export function marinerIsleSymbolId(boardIsleId: MarinerBoardIsleId): string {
  return `mariner-isle-${boardIsleId}`;
}

export function marinerRouteSymbolId(routeId: string): string {
  return `mariner-route-${routeId}`;
}

export function necromancerGateSymbolId(gateId: NecromancerBuiltinGateId): string {
  return `necromancer-gate-${gateId}`;
}

export function necromancerPathSymbolId(pathSpaceId: NecromancerBuiltinPathSpaceId): string {
  return `necromancer-path-${pathSpaceId}`;
}

export function SourceGeometrySprite({ raw, label }: { raw: string; label: string }) {
  const hostRef = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    while (host.firstChild !== null) {
      host.removeChild(host.firstChild);
    }
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    if (doc.querySelector("parsererror") !== null) return;
    for (const symbol of Array.from(doc.querySelectorAll("symbol"))) {
      host.appendChild(document.importNode(symbol, true));
    }
  }, [raw]);
  return <g ref={hostRef} data-source-geometry-sprite={label} aria-hidden="true" />;
}

/** Clone generated symbol children so SVG filters can composite the exact source group. */
export function SourceSymbolClone({ href, fill, stroke }: { href: string; fill: string; stroke: string }) {
  const hostRef = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    while (host.firstChild !== null) {
      host.removeChild(host.firstChild);
    }
    const id = href.startsWith("#") ? href.slice(1) : href;
    const symbol = document.getElementById(id);
    if (symbol === null) return;
    for (const child of Array.from(symbol.childNodes)) {
      host.appendChild(child.cloneNode(true));
    }
  }, [href]);
  return <g ref={hostRef} fill={fill} stroke={stroke} />;
}

export interface SourceRouteMarkerPose {
  readonly x: number;
  readonly y: number;
  readonly tangentDeg: number;
}

type MapPt = { readonly x: number; readonly y: number };

function parseSvgNumbers(value: string): number[] {
  return (value.match(/-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}

function parseSvgTransform(value: string | null): (point: MapPt) => MapPt {
  if (value === null || value.trim() === "") return (point) => point;
  const matrix = value.match(/matrix\(\s*([^)]+)\)/i);
  if (matrix !== null) {
    const [a, b, c, d, e, f] = parseSvgNumbers(matrix[1] ?? "");
    return (point) => ({
      x: (a ?? 1) * point.x + (c ?? 0) * point.y + (e ?? 0),
      y: (b ?? 0) * point.x + (d ?? 1) * point.y + (f ?? 0),
    });
  }
  const translate = value.match(/translate\(\s*([^)]+)\)/i);
  if (translate !== null) {
    const [dx, dy] = parseSvgNumbers(translate[1] ?? "");
    return (point) => ({ x: point.x + (dx ?? 0), y: point.y + (dy ?? 0) });
  }
  return (point) => point;
}

function cubicPoint(p0: MapPt, p1: MapPt, p2: MapPt, p3: MapPt, t: number): MapPt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function appendSamples(samples: MapPt[], from: MapPt, to: MapPt, steps: number): void {
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    samples.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
}

function samplePathLocalPoints(d: string): MapPt[] {
  const samples: MapPt[] = [];
  const tokens = d.match(/[MLCZ]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi) ?? [];
  let i = 0;
  let current: MapPt = { x: 0, y: 0 };
  let start: MapPt = { x: 0, y: 0 };
  const nextNumber = (): number => {
    const value = Number(tokens[i] ?? "0");
    i += 1;
    return value;
  };
  const isCommand = (token: string | undefined): boolean => token !== undefined && /[MLCZ]/i.test(token) && Number.isNaN(Number(token));
  while (i < tokens.length) {
    const raw = tokens[i] ?? "";
    if (!isCommand(raw)) break;
    const cmd = raw.toUpperCase();
    i += 1;
    if (cmd === "M") {
      current = { x: nextNumber(), y: nextNumber() };
      start = current;
      samples.push(current);
      while (i < tokens.length && !isCommand(tokens[i])) {
        const next = { x: nextNumber(), y: nextNumber() };
        appendSamples(samples, current, next, 8);
        current = next;
      }
      continue;
    }
    if (cmd === "L") {
      while (i < tokens.length && !isCommand(tokens[i])) {
        const next = { x: nextNumber(), y: nextNumber() };
        appendSamples(samples, current, next, 8);
        current = next;
      }
      continue;
    }
    if (cmd === "C") {
      while (i < tokens.length && !isCommand(tokens[i])) {
        const c1 = { x: nextNumber(), y: nextNumber() };
        const c2 = { x: nextNumber(), y: nextNumber() };
        const next = { x: nextNumber(), y: nextNumber() };
        const from = current;
        for (let step = 1; step <= 12; step += 1) {
          samples.push(cubicPoint(from, c1, c2, next, step / 12));
        }
        current = next;
      }
      continue;
    }
    if (cmd === "Z") {
      appendSamples(samples, current, start, 8);
      current = start;
    }
  }
  return samples;
}

function poseFromSamples(samples: MapPt[], normalOffset: number): SourceRouteMarkerPose | null {
  if (samples.length < 2) return null;
  const distances = [0];
  let total = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1]!;
    const point = samples[i]!;
    total += Math.hypot(point.x - prev.x, point.y - prev.y);
    distances.push(total);
  }
  if (total <= 0) return samples[0] === undefined ? null : { x: samples[0].x, y: samples[0].y, tangentDeg: 0 };
  const target = total * 0.5;
  let index = 1;
  while (index < distances.length && distances[index]! < target) index += 1;
  const prev = samples[index - 1]!;
  const next = samples[Math.min(index, samples.length - 1)]!;
  const span = (distances[index] ?? total) - (distances[index - 1] ?? 0);
  const t = span <= 0 ? 0 : (target - (distances[index - 1] ?? 0)) / span;
  const mid = { x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t };
  const tangent = { x: next.x - prev.x, y: next.y - prev.y };
  const tangentLen = Math.hypot(tangent.x, tangent.y) || 1;
  const nx = -tangent.y / tangentLen;
  const ny = tangent.x / tangentLen;
  return {
    x: mid.x + nx * normalOffset,
    y: mid.y + ny * normalOffset,
    tangentDeg: Math.atan2(tangent.y, tangent.x) * (180 / Math.PI),
  };
}

function sourceRouteBoardGeometry(symbolId: string): {
  readonly toBoard: (point: MapPt) => MapPt;
  readonly localSamples: MapPt[];
} | null {
  const symbol = document.getElementById(symbolId);
  const path = symbol?.querySelector("path");
  if (symbol === null || path === null || path === undefined) return null;
  const pathTransform = parseSvgTransform(path.getAttribute("transform"));
  const parentTransform = parseSvgTransform(path.parentElement?.getAttribute("transform") ?? null);
  const toBoard = (point: MapPt): MapPt => parentTransform(pathTransform(point));
  const localSamples = samplePathLocalPoints(path.getAttribute("d") ?? "");
  if (localSamples.length < 2) return null;
  return { toBoard, localSamples };
}

function pathEndsFromBoardSamples(samples: MapPt[]): { readonly start: MapPt; readonly end: MapPt } | null {
  if (samples.length === 0) return null;
  if (samples.length === 1) return { start: samples[0]!, end: samples[0]! };
  let bestI = 0;
  let bestJ = 1;
  let bestDist = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const a = samples[i]!;
    for (let j = i + 1; j < samples.length; j += 1) {
      const b = samples[j]!;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist > bestDist) {
        bestDist = dist;
        bestI = i;
        bestJ = j;
      }
    }
  }
  return bestI <= bestJ
    ? { start: samples[bestI]!, end: samples[bestJ]! }
    : { start: samples[bestJ]!, end: samples[bestI]! };
}

/** Physical ends of an exact source Route path in board coordinates (farthest-apart samples). */
export function sourceRoutePathBoardEnds(symbolId: string): { readonly start: MapPt; readonly end: MapPt } | null {
  const geometry = sourceRouteBoardGeometry(symbolId);
  if (geometry === null) return null;
  const boardSamples = geometry.localSamples.map((point) => geometry.toBoard(point));
  return pathEndsFromBoardSamples(boardSamples);
}

/** Midpoint/tangent of an exact source Route symbol, offset along the local normal. */
export function sourceRouteMarkerPose(symbolId: string, normalOffset = 6): SourceRouteMarkerPose | null {
  const geometry = sourceRouteBoardGeometry(symbolId);
  if (geometry === null) return null;
  const local = poseFromSamples(geometry.localSamples, 0);
  if (local === null) return null;
  const mid = geometry.toBoard({ x: local.x, y: local.y });
  const tangentRad = (local.tangentDeg * Math.PI) / 180;
  const tangent = geometry.toBoard({ x: local.x + Math.cos(tangentRad), y: local.y + Math.sin(tangentRad) });
  const dx = tangent.x - mid.x;
  const dy = tangent.y - mid.y;
  const tangentLen = Math.hypot(dx, dy) || 1;
  const nx = -dy / tangentLen;
  const ny = dx / tangentLen;
  return {
    x: mid.x + nx * normalOffset,
    y: mid.y + ny * normalOffset,
    tangentDeg: Math.atan2(dy, dx) * (180 / Math.PI),
  };
}

/** Convert overlay hit-geometry endpoints into native source-board coordinates before associating path ends. */
function mapEndpointPointOnBoard(endpoint: MarinerRouteEndpoint): MapPt {
  const overlay = mapEndpointPoint(endpoint);
  return marinerOverlayPointToBoard(overlay.x, overlay.y);
}

function towardEndpointFromString(toward: string | undefined): MarinerRouteEndpoint | null {
  if (toward === undefined) return null;
  if ((MARINER_BOARD_ISLE_IDS as readonly string[]).includes(toward)) {
    return { kind: "board_isle", boardIsleId: toward as MarinerBoardIsleId };
  }
  if ((MARINER_EXTERNAL_LAND_IDS as readonly string[]).includes(toward)) {
    return { kind: "external_land", externalLandId: toward as MarinerExternalLandId };
  }
  return null;
}

export function resolveRaiderMarkerHeading(
  symbolId: string,
  routeId: string,
  toward: MarinerRouteEndpoint,
  normalOffset = 6,
): { readonly pose: SourceRouteMarkerPose; readonly headingDeg: number; readonly reversed: boolean } | null {
  const routeDef = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === routeId);
  const ends = sourceRoutePathBoardEnds(symbolId);
  const pose = sourceRouteMarkerPose(symbolId, normalOffset);
  if (routeDef === undefined || ends === null || pose === null) return null;
  const towardMatchesEndpointA = endpointKey(toward) === endpointKey(routeDef.endpointA);
  const aligned = raiderHeadingTowardRouteEndpoint(
    pose,
    ends.start,
    ends.end,
    mapEndpointPointOnBoard(routeDef.endpointA),
    mapEndpointPointOnBoard(routeDef.endpointB),
    towardMatchesEndpointA,
  );
  return { pose, headingDeg: aligned.headingDeg, reversed: aligned.reversed };
}

export function SourceRouteOccupancyMarker({
  href,
  kind,
  routeId,
  label,
  toward,
  color,
  threatened,
  actionPending,
  onSelect,
  onPointerDown,
  onContextMenu,
}: {
  href: string;
  kind: "ship" | "raider";
  routeId: string;
  label: string;
  toward?: string;
  color: string;
  threatened?: boolean;
  actionPending?: boolean;
  onSelect: () => void;
  onPointerDown?: (event: ReactPointerEvent) => void;
  onContextMenu?: (event: ReactMouseEvent<SVGGElement>) => void;
}) {
  const hostRef = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const id = href.startsWith("#") ? href.slice(1) : href;
    const pose = sourceRouteMarkerPose(id, 6);
    if (pose === null) {
      host.removeAttribute("transform");
      host.setAttribute("data-marker-from", "unresolved");
      host.removeAttribute("data-raider-aligned");
      host.removeAttribute("data-tangent-reversed");
      return;
    }
    let headingDeg = pose.tangentDeg;
    if (kind === "raider") {
      const towardEndpoint = towardEndpointFromString(toward);
      const routeDef = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === routeId);
      const ends = sourceRoutePathBoardEnds(id);
      if (towardEndpoint !== null && routeDef !== undefined && ends !== null) {
        const towardMatchesEndpointA = endpointKey(towardEndpoint) === endpointKey(routeDef.endpointA);
        const aligned = raiderHeadingTowardRouteEndpoint(
          pose,
          ends.start,
          ends.end,
          mapEndpointPointOnBoard(routeDef.endpointA),
          mapEndpointPointOnBoard(routeDef.endpointB),
          towardMatchesEndpointA,
        );
        headingDeg = aligned.headingDeg;
        host.setAttribute("data-raider-aligned", "toward-destination");
        host.setAttribute("data-tangent-reversed", aligned.reversed ? "true" : "false");
      }
    }
    host.setAttribute("transform", `translate(${pose.x} ${pose.y}) rotate(${headingDeg})`);
    host.setAttribute("data-marker-from", "exact-source-path");
  }, [href, kind, toward]);
  const pendingPresentation = marinerBoardPendingPresentation(actionPending === true);
  return (
    <g
      ref={hostRef}
      data-piece={kind}
      data-route-id={routeId}
      data-route-occupancy-marker={kind}
      data-raider-toward={toward}
      data-route-threatened={threatened ? "true" : undefined}
      data-board-action-pending={pendingPresentation["data-board-action-pending"]}
      data-draggable-route-piece="true"
      className={pendingPresentation.className}
      aria-busy={pendingPresentation["aria-busy"]}
      aria-label={label}
      style={{ cursor: onPointerDown === undefined ? undefined : "grab" }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {actionPending === true && <MarinerBoardPendingRing radius={11} />}
      {kind === "ship" ? (
        <g data-ship-pictogram="hull-mast-sail">
          <path
            data-ship-part="hull"
            d="M-4.2 2.1 L-2.3 -1.1 L3.2 -1.1 L5.1 2.1 Z"
            fill={color}
            stroke="#042f2e"
            strokeWidth={0.85}
          />
          <line
            data-ship-part="mast"
            x1="0.5"
            y1="-1.1"
            x2="0.5"
            y2="-5.3"
            stroke="#042f2e"
            strokeWidth={0.9}
            strokeLinecap="round"
          />
          <path
            data-ship-part="sail"
            data-ship-sail-side="aft"
            d="M0.4 -5.2 L-3.3 -3.3 L0.4 -1.5 Z"
            fill={color}
            stroke="#042f2e"
            strokeWidth={0.7}
          />
        </g>
      ) : (
        <polygon
          data-raider-pictogram="directional"
          points="-3.4,-2.7 -3.4,2.7 5.6,0"
          fill={color}
          stroke="#450a0a"
          strokeWidth={0.85}
        />
      )}
    </g>
  );
}
