import marinerBoardUrl from "./assets/source-boards/mariner-board.svg?url";
import necromancerGatesBoardUrl from "./assets/source-boards/necromancer-gates-board.svg?url";

const MARINER_OVERLAY_CENTER = { x: 434.5, y: 410.5 } as const;
const MARINER_OVERLAY_SCALE = 0.894047619;
const MARINER_OVERLAY_ORIGIN = 500;

/**
 * Native PowerPoint SVG for the Archipelago of Isha layout.
 * Token anchors and Sea hit regions remain in the existing 1000×1000 overlay
 * space and are mapped onto the exported circular sea. Visible Isle/Route
 * overlays use generated exact-source symbols in this SVG's native space.
 */
export const MARINER_SOURCE_BOARD = {
  href: marinerBoardUrl,
  width: 957,
  height: 812,
  overlayTransform: `translate(${MARINER_OVERLAY_CENTER.x} ${MARINER_OVERLAY_CENTER.y}) scale(${MARINER_OVERLAY_SCALE}) translate(-${MARINER_OVERLAY_ORIGIN} -${MARINER_OVERLAY_ORIGIN})`,
} as const;

export function marinerOverlayPointToBoard(x: number, y: number): { readonly x: number; readonly y: number } {
  return {
    x: MARINER_OVERLAY_CENTER.x + MARINER_OVERLAY_SCALE * (x - MARINER_OVERLAY_ORIGIN),
    y: MARINER_OVERLAY_CENTER.y + MARINER_OVERLAY_SCALE * (y - MARINER_OVERLAY_ORIGIN),
  };
}

export function marinerOverlayLengthToBoard(length: number): number {
  return length * MARINER_OVERLAY_SCALE;
}

/**
 * Native PowerPoint SVG for the Gates of Death layout.
 * Hit/token anchors are authored in this SVG's display space (inner coords + translate(3,-20)).
 */
export const NECROMANCER_SOURCE_BOARD = {
  href: necromancerGatesBoardUrl,
  width: 1046,
  height: 783,
} as const;
