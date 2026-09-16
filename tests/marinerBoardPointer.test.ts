import { describe, expect, it } from "vitest";
import {
  MARINER_POINTER_DRAG_THRESHOLD_PX,
  pointerMovementExceedsDragThreshold,
  routesShareBoardIsleEndpoint,
} from "../src/mariner-board-pointer";
import { marinerRouteId } from "../shared/domain";

const ISHANA_SCUTTLE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);
const THYRAS_FAR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);

describe("mariner board pointer helpers", () => {
  it("uses a small movement threshold before treating interaction as drag", () => {
    expect(MARINER_POINTER_DRAG_THRESHOLD_PX).toBeGreaterThan(0);
    expect(pointerMovementExceedsDragThreshold(0, 0)).toBe(false);
    expect(pointerMovementExceedsDragThreshold(MARINER_POINTER_DRAG_THRESHOLD_PX, 0)).toBe(true);
  });

  it("detects shared board-Isle endpoints between routes", () => {
    expect(routesShareBoardIsleEndpoint(ISHANA_SCUTTLE, THYRAS_FAR)).toBe(false);
    expect(routesShareBoardIsleEndpoint(ISHANA_SCUTTLE, ISHANA_SCUTTLE)).toBe(true);
  });
});
