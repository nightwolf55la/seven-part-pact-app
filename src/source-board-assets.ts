import marinerBoardUrl from "./assets/source-boards/mariner-board.svg?url";
import necromancerGatesBoardUrl from "./assets/source-boards/necromancer-gates-board.svg?url";

/**
 * Native PowerPoint SVG for the Archipelago of Isha layout.
 * Overlay geometry stays in the existing 1000×1000 hit space and is mapped
 * onto the exported circular sea (center 434.5,410.5 r=375.5 vs frame 500,500 r=420).
 */
export const MARINER_SOURCE_BOARD = {
  href: marinerBoardUrl,
  width: 957,
  height: 812,
  overlayTransform: "translate(434.5 410.5) scale(0.894047619) translate(-500 -500)",
} as const;

/**
 * Native PowerPoint SVG for the Gates of Death layout.
 * Hit/token anchors are authored in this SVG's display space (inner coords + translate(3,-20)).
 */
export const NECROMANCER_SOURCE_BOARD = {
  href: necromancerGatesBoardUrl,
  width: 1046,
  height: 783,
} as const;
