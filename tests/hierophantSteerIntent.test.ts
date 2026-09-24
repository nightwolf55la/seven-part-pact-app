import { describe, expect, it } from "vitest";
import {
  pendingSteerRowsForSupplicant,
  resolveSteerAllocationChoice,
  selectedSteerAllocation,
  steerDropArea,
  type HierophantSteerTimeRow,
} from "../src/hierophant-steer";
import type { HierophantTemple } from "../shared/domain";

function row(
  overrides: Partial<HierophantSteerTimeRow> & Pick<HierophantSteerTimeRow, "allocationId" | "denizenId" | "wizardId">,
): HierophantSteerTimeRow {
  return {
    wizardName: overrides.wizardName ?? overrides.wizardId,
    resolution: overrides.resolution ?? "pending",
    ...overrides,
  };
}

describe("Hierophant Steer allocation choice", () => {
  it("returns none when no pending week is scheduled on the Supplicant", () => {
    const rows = [
      row({ allocationId: "alc_1", denizenId: "den_ann", wizardId: "wiz_a", resolution: "spent" }),
      row({ allocationId: "alc_2", denizenId: "den_other", wizardId: "wiz_a" }),
    ];
    expect(pendingSteerRowsForSupplicant(rows, "den_ann")).toEqual([]);
    expect(resolveSteerAllocationChoice(rows, "den_ann")).toEqual({ kind: "none" });
    expect(selectedSteerAllocation(rows, "den_ann", null)).toBeNull();
  });

  it("uses the first pending week when one Wizard owns multiple equivalent weeks", () => {
    const rows = [
      row({ allocationId: "alc_1", denizenId: "den_ann", wizardId: "wiz_a", wizardName: "A" }),
      row({ allocationId: "alc_2", denizenId: "den_ann", wizardId: "wiz_a", wizardName: "A" }),
    ];
    expect(resolveSteerAllocationChoice(rows, "den_ann")).toEqual({
      kind: "single",
      row: rows[0],
    });
    expect(selectedSteerAllocation(rows, "den_ann", null)?.allocationId).toBe("alc_1");
  });

  it("requires an explicit choice when different Wizards scheduled Time on the same Supplicant", () => {
    const rows = [
      row({ allocationId: "alc_1", denizenId: "den_ann", wizardId: "wiz_a", wizardName: "A" }),
      row({ allocationId: "alc_2", denizenId: "den_ann", wizardId: "wiz_b", wizardName: "B" }),
    ];
    expect(resolveSteerAllocationChoice(rows, "den_ann")).toEqual({
      kind: "choose_wizard",
      rows,
    });
    expect(selectedSteerAllocation(rows, "den_ann", null)).toBeNull();
    expect(selectedSteerAllocation(rows, "den_ann", "alc_2")?.wizardId).toBe("wiz_b");
  });
});

describe("steerDropArea", () => {
  const courtyard = { kind: "ordinary", templeId: "krolis" } as HierophantTemple;
  const hestar = { kind: "hestar", templeId: "hestar" } as HierophantTemple;

  it("maps ordinary courtyard and agiary drops, and Hestar to null area", () => {
    expect(steerDropArea(courtyard, "courtyard")).toBe("courtyard");
    expect(steerDropArea(courtyard, "agiary")).toBe("agiary");
    expect(steerDropArea(courtyard, "people")).toBeNull();
    expect(steerDropArea(courtyard, "blocked")).toBeNull();
    expect(steerDropArea(hestar, "hestar")).toBeNull();
  });
});
