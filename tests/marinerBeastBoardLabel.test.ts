import { describe, expect, it } from "vitest";
import type { DenizenId, MarinerBeastState } from "../shared/domain";
import { marinerBeastBoardMarkerLabel } from "../src/mariner-beast-board-label";

function beast(overrides: Partial<MarinerBeastState> & Pick<MarinerBeastState, "denizenId">): MarinerBeastState {
  return {
    element: "water",
    definitionId: "kraken",
    condition: "distrusting",
    location: { kind: "sea_region", regionId: "sunken_fleet" },
    ...overrides,
  };
}

describe("marinerBeastBoardMarkerLabel", () => {
  it("distinguishes builtin Beasts with compact deterministic labels", () => {
    const kraken = beast({ denizenId: "den_a" as DenizenId, definitionId: "kraken" });
    const griffin = beast({ denizenId: "den_b" as DenizenId, definitionId: "griffin" });
    expect(marinerBeastBoardMarkerLabel(kraken, "Kraken-kin")).toBe("Krak");
    expect(marinerBeastBoardMarkerLabel(griffin, "Sky Hunter")).toBe("Grif");
    expect(marinerBeastBoardMarkerLabel(kraken, "Kraken-kin")).not.toBe(
      marinerBeastBoardMarkerLabel(griffin, "Sky Hunter"),
    );
  });

  it("falls back to denizen-based shorthand for custom Beasts", () => {
    const custom = beast({ denizenId: "den_c" as DenizenId, definitionId: null });
    expect(marinerBeastBoardMarkerLabel(custom, "Spare Leviathan")).toBe("SL");
  });
});
