import { describe, it, expect } from "vitest";
import {
  selectParticipant,
  destinationLabel,
  engagementTargetLabel,
  formatPlanningWarning,
  buildTimeDestination,
  buildEngagementTarget,
} from "../src/planning-view-model";
import type { PlanningWorkspaceData, PlanningWarning } from "../src/planning-view-model";

function makeParticipant(wizardId: string, wizardName: string, allocations: any[] = []) {
  return {
    wizardId,
    wizardName,
    effectiveBudget: 4,
    rescheduleAllowance: 1,
    reschedulesUsed: 0,
    allocations: allocations.map((a, i) => ({
      allocationId: a.allocationId ?? `alc_${i}`,
      destination: a.destination ?? null,
      note: a.note ?? null,
      resolution: a.resolution ?? "pending",
    })),
  };
}

function makeEngagement(engagementId: string, actingWizardId: string, overrides: Partial<any> = {}) {
  return {
    engagementId,
    actingWizardId,
    target: overrides.target ?? null,
    resolution: overrides.resolution ?? "pending",
    linkedTimeAllocationId: overrides.linkedTimeAllocationId ?? null,
  };
}

const baseData: PlanningWorkspaceData = {
  monthOrdinal: 5,
  timeParticipants: [
    makeParticipant("wiz_1", "Merlin", [
      { allocationId: "alc_a", destination: { kind: "meeting" } },
      { allocationId: "alc_b", destination: null },
    ]),
    makeParticipant("wiz_2", "Morgana", [
      { allocationId: "alc_c", destination: { kind: "orrery" } },
    ]),
  ],
  engagements: [
    makeEngagement("eng_1", "wiz_1"),
    makeEngagement("eng_2", "wiz_2", { target: { kind: "self" } }),
  ],
  modeledWizards: [
    { wizardId: "wiz_1", name: "Merlin" },
    { wizardId: "wiz_2", name: "Morgana" },
    { wizardId: "wiz_3", name: "Viviane" },
  ],
};

describe("selectParticipant", () => {
  it("retains a valid selected wizard", () => {
    const r = selectParticipant(baseData, "wiz_2");
    expect(r).not.toBeNull();
    expect(r!.wizardId).toBe("wiz_2");
  });

  it("falls back to first participant when selection is missing", () => {
    const r = selectParticipant(baseData, "wiz_999");
    expect(r).not.toBeNull();
    expect(r!.wizardId).toBe("wiz_1");
  });

  it("returns null when there are no participants", () => {
    const empty: PlanningWorkspaceData = {
      ...baseData,
      timeParticipants: [],
    };
    const r = selectParticipant(empty, "wiz_1");
    expect(r).toBeNull();
  });
});

describe("destinationLabel", () => {
  it("labels unscheduled", () => {
    expect(destinationLabel(null)).toBe("Unscheduled");
  });

  it("labels companion", () => {
    expect(destinationLabel({ kind: "companion", element: "fire" })).toBe("Companion: fire");
  });

  it("labels map/isle/sanctum", () => {
    expect(destinationLabel({ kind: "map_isle_sanctum" })).toBe("Map / Isle / Sanctum");
  });

  it("labels familiar", () => {
    expect(destinationLabel({ kind: "familiar" })).toBe("Familiar");
  });

  it("labels orrery", () => {
    expect(destinationLabel({ kind: "orrery" })).toBe("Orrery");
  });

  it("labels meeting", () => {
    expect(destinationLabel({ kind: "meeting" })).toBe("Wizardmoot / Meeting");
  });

  it("labels domain", () => {
    expect(destinationLabel({ kind: "domain" })).toBe("Domain");
  });

  it("labels engagement with resolved name", () => {
    const data: PlanningWorkspaceData = {
      ...baseData,
      engagements: [
        makeEngagement("eng_1", "wiz_1"),
      ],
    };
    expect(destinationLabel({ kind: "engagement", engagementId: "eng_1" }, data)).toBe(
      "Engagement: Merlin's Engagement",
    );
  });

  it("labels engagement with unresolved id fallback", () => {
    expect(destinationLabel({ kind: "engagement", engagementId: "eng_unknown" }, baseData)).toBe(
      "Engagement: eng_unknown",
    );
  });

  it("labels special use", () => {
    expect(destinationLabel({ kind: "special_use", description: "scrying pool" })).toBe(
      "Special Use: scrying pool",
    );
  });
});

describe("engagementTargetLabel", () => {
  it("labels not targeted", () => {
    expect(engagementTargetLabel(null)).toBe("Not targeted");
  });

  it("labels wizard target with name", () => {
    expect(engagementTargetLabel({ kind: "wizard", wizardId: "wiz_3" as any }, baseData)).toBe(
      "Wizard: Viviane",
    );
  });

  it("labels wizard target with unresolved id fallback", () => {
    expect(engagementTargetLabel({ kind: "wizard", wizardId: "wiz_unknown" as any }, baseData)).toBe(
      "Wizard: wiz_unknown",
    );
  });

  it("labels self", () => {
    expect(engagementTargetLabel({ kind: "self" })).toBe("Self");
  });

  it("labels familiar", () => {
    expect(engagementTargetLabel({ kind: "familiar" })).toBe("Familiar");
  });

  it("labels named character", () => {
    expect(engagementTargetLabel({ kind: "named_character", name: "Old Gerda" })).toBe(
      "Named character: Old Gerda",
    );
  });
});

describe("formatPlanningWarning", () => {
  it("resolves unscheduled_time to wizard name and allocation", () => {
    const w: PlanningWarning = { key: "unscheduled_time:alc_b", kind: "unscheduled_time", resourceId: "alc_b" };
    expect(formatPlanningWarning(w, baseData)).toBe("Merlin has an unscheduled Time allocation.");
  });

  it("resolves untargeted_engagement to acting wizard name", () => {
    const w: PlanningWarning = { key: "untargeted_engagement:eng_1", kind: "untargeted_engagement", resourceId: "eng_1" };
    expect(formatPlanningWarning(w, baseData)).toBe("Merlin's Engagement has no target.");
  });

  it("falls back to server kind/resourceId when resource cannot be resolved", () => {
    const w: PlanningWarning = { key: "unscheduled_time:alc_unknown", kind: "unscheduled_time", resourceId: "alc_unknown" };
    expect(formatPlanningWarning(w, baseData)).toBe("unscheduled_time: alc_unknown");
  });
});

describe("buildTimeDestination", () => {
  it("builds unscheduled (null)", () => {
    expect(buildTimeDestination("unscheduled", "", "")).toBeNull();
  });

  it("builds companion", () => {
    expect(buildTimeDestination("companion", "fire", "")).toEqual({ kind: "companion", element: "fire" });
  });

  it("rejects companion with empty element", () => {
    expect(buildTimeDestination("companion", "  ", "")).toBeNull();
  });

  it("builds special_use", () => {
    expect(buildTimeDestination("special_use", "", "scrying pool")).toEqual({
      kind: "special_use",
      description: "scrying pool",
    });
  });

  it("rejects special_use with empty description", () => {
    expect(buildTimeDestination("special_use", "", "  ")).toBeNull();
  });

  it("builds engagement", () => {
    expect(buildTimeDestination("engagement", "", "", "eng_1")).toEqual({
      kind: "engagement",
      engagementId: "eng_1",
    });
  });

  it("builds simple kinds", () => {
    expect(buildTimeDestination("map_isle_sanctum", "", "")).toEqual({ kind: "map_isle_sanctum" });
    expect(buildTimeDestination("familiar", "", "")).toEqual({ kind: "familiar" });
    expect(buildTimeDestination("orrery", "", "")).toEqual({ kind: "orrery" });
    expect(buildTimeDestination("meeting", "", "")).toEqual({ kind: "meeting" });
    expect(buildTimeDestination("domain", "", "")).toEqual({ kind: "domain" });
  });
});

describe("buildEngagementTarget", () => {
  it("builds not targeted (null)", () => {
    expect(buildEngagementTarget("not_targeted", "")).toBeNull();
  });

  it("builds self", () => {
    expect(buildEngagementTarget("self", "")).toEqual({ kind: "self" });
  });

  it("builds familiar", () => {
    expect(buildEngagementTarget("familiar", "")).toEqual({ kind: "familiar" });
  });

  it("builds wizard", () => {
    expect(buildEngagementTarget("wizard", "wiz_3" as any)).toEqual({ kind: "wizard", wizardId: "wiz_3" });
  });

  it("builds named character", () => {
    expect(buildEngagementTarget("named_character", "Old Gerda")).toEqual({
      kind: "named_character",
      name: "Old Gerda",
    });
  });

  it("rejects named character with empty text", () => {
    expect(buildEngagementTarget("named_character", "  ")).toBeNull();
  });
});
