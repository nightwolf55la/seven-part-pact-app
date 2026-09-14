import { useLayoutEffect, useRef } from "react";
import type { MarinerBoardIsleId } from "../shared/domain";
import type { NecromancerBuiltinGateId, NecromancerBuiltinPathSpaceId } from "../shared/domain";
import marinerInteractionGeometryRaw from "./assets/source-boards/mariner-interaction-geometry.svg?raw";
import necromancerInteractionGeometryRaw from "./assets/source-boards/necromancer-interaction-geometry.svg?raw";

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
