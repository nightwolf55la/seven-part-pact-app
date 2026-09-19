// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  MARINER_POINTER_DRAG_THRESHOLD_PX,
  findIsleDropId,
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

  it("finds an Isle drop target from the Isle map layer or data-isle-id", () => {
    const isle = document.createElement("div");
    isle.setAttribute("data-map-layer", "isle");
    isle.setAttribute("data-isle-id", "orrery");
    const child = document.createElement("span");
    isle.appendChild(child);
    expect(findIsleDropId(child)).toBe("orrery");

    const market = document.createElement("div");
    market.setAttribute("data-piece", "market");
    market.setAttribute("data-isle-id", "scuttleport");
    expect(findIsleDropId(market)).toBe("scuttleport");

    expect(findIsleDropId(document.createElement("div"))).toBeNull();
    expect(findIsleDropId(null)).toBeNull();
  });
});
