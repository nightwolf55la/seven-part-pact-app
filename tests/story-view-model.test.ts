import { describe, it, expect } from "vitest";
import {
  selectStoryParticipant,
  classifyAllocationActions,
  formatStoryWarning,
  candidateAllocationsForEngagement,
  type StoryWorkspaceData,
  type StoryWarning,
} from "../src/story-view-model";

function makeParticipant(
  wizardId: string,
  wizardName: string,
  allocations: Array<{
    allocationId: string;
    destination: any;
    note?: string | null;
    resolution?: string;
  }>,
  reschedulesUsed = 0,
  rescheduleAllowance = 1,
) {
  return {
    wizardId,
    wizardName,
    effectiveBudget: 4,
    rescheduleAllowance,
    reschedulesUsed,
    allocations: allocations.map((a) => ({
      allocationId: a.allocationId,
      destination: a.destination,
      note: a.note ?? null,
      resolution: (a.resolution ?? "pending") as "pending" | "spent" | "wasted",
    })),
  };
}

function makeEngagement(
  engagementId: string,
  actingWizardId: string,
  overrides: Partial<any> = {},
) {
  return {
    engagementId,
    actingWizardId,
    target: overrides.target ?? null,
    resolution: overrides.resolution ?? "pending",
    linkedTimeAllocationId: overrides.linkedTimeAllocationId ?? null,
  };
}

const baseData: StoryWorkspaceData = {
  monthOrdinal: 5,
  timeParticipants: [
    makeParticipant("wiz_1", "Merlin", [
      { allocationId: "alc_a", destination: { kind: "companion", element: "fire" } },
      { allocationId: "alc_b", destination: { kind: "orrery" } },
      { allocationId: "alc_c", destination: { kind: "meeting" } },
      { allocationId: "alc_d", destination: { kind: "engagement", engagementId: "eng_1" } },
      { allocationId: "alc_e", destination: null },
      { allocationId: "alc_f", destination: { kind: "domain" }, resolution: "spent" },
    ]),
    makeParticipant("wiz_2", "Morgana", [
      { allocationId: "alc_g", destination: { kind: "familiar" } },
    ]),
  ],
  engagements: [
    makeEngagement("eng_1", "wiz_1", { linkedTimeAllocationId: "alc_d" }),
    makeEngagement("eng_2", "wiz_2", { target: { kind: "self" } }),
  ],
  modeledWizards: [
    { wizardId: "wiz_1", name: "Merlin" },
    { wizardId: "wiz_2", name: "Morgana" },
    { wizardId: "wiz_3", name: "Viviane" },
  ],
  orreryPositions: {
    saturn: 500,
    jupiter: 0,
    mars: 0,
    venus: 0,
    mercury: 0,
  },
};

describe("selectStoryParticipant", () => {
  it("retains a valid selected wizard", () => {
    const r = selectStoryParticipant(baseData, "wiz_2");
    expect(r).not.toBeNull();
    expect(r!.wizardId).toBe("wiz_2");
  });

  it("falls back to first participant when selection is missing", () => {
    const r = selectStoryParticipant(baseData, "wiz_999");
    expect(r).not.toBeNull();
    expect(r!.wizardId).toBe("wiz_1");
  });

  it("returns null when there are no participants", () => {
    const empty: StoryWorkspaceData = { ...baseData, timeParticipants: [] };
    const r = selectStoryParticipant(empty, "wiz_1");
    expect(r).toBeNull();
  });
});

describe("classifyAllocationActions", () => {
  it("companion shows markSpent, waste, reschedule", () => {
    const actions = classifyAllocationActions(baseData, "wiz_1", "alc_a");
    expect(actions.markSpent).toBe(true);
    expect(actions.waste).toBe(true);
    expect(actions.reschedule).toBe(true);
    expect(actions.resolveOrrery).toBe(false);
  });

  it("orrery shows resolveOrrery, waste, reschedule but not markSpent", () => {
    const actions = classifyAllocationActions(baseData, "wiz_1", "alc_b");
    expect(actions.markSpent).toBe(false);
    expect(actions.resolveOrrery).toBe(true);
    expect(actions.waste).toBe(true);
    expect(actions.reschedule).toBe(true);
  });

  it("meeting does not show markSpent or waste, but shows reschedule", () => {
    const actions = classifyAllocationActions(baseData, "wiz_1", "alc_c");
    expect(actions.markSpent).toBe(false);
    expect(actions.waste).toBe(false);
    expect(actions.reschedule).toBe(true);
  });

  it("engagement does not show markSpent, but shows waste and reschedule", () => {
    const actions = classifyAllocationActions(baseData, "wiz_1", "alc_d");
    expect(actions.markSpent).toBe(false);
    expect(actions.waste).toBe(true);
    expect(actions.reschedule).toBe(true);
  });

  it("unscheduled does not show markSpent, but shows waste and reschedule", () => {
    const actions = classifyAllocationActions(baseData, "wiz_1", "alc_e");
    expect(actions.markSpent).toBe(false);
    expect(actions.waste).toBe(true);
    expect(actions.reschedule).toBe(true);
  });

  it("non-pending allocation has no actions", () => {
    const actions = classifyAllocationActions(baseData, "wiz_1", "alc_f");
    expect(actions.markSpent).toBe(false);
    expect(actions.waste).toBe(false);
    expect(actions.reschedule).toBe(false);
    expect(actions.resolveOrrery).toBe(false);
  });

  it("reschedule is false when allowance exhausted", () => {
    const data: StoryWorkspaceData = {
      ...baseData,
      timeParticipants: [
        makeParticipant("wiz_1", "Merlin", [
          { allocationId: "alc_a", destination: { kind: "domain" } },
        ], 1, 1),
      ],
    };
    const actions = classifyAllocationActions(data, "wiz_1", "alc_a");
    expect(actions.reschedule).toBe(false);
  });
});

describe("formatStoryWarning", () => {
  it("resolves unresolved_time to wizard name and destination", () => {
    const w: StoryWarning = { key: "unresolved_time:alc_a", kind: "unresolved_time", resourceId: "alc_a" };
    expect(formatStoryWarning(w, baseData)).toBe("Merlin still has unresolved Time: Companion: fire.");
  });

  it("resolves unresolved_engagement to acting wizard name", () => {
    const w: StoryWarning = { key: "unresolved_engagement:eng_1", kind: "unresolved_engagement", resourceId: "eng_1" };
    expect(formatStoryWarning(w, baseData)).toBe("Merlin's Engagement is still unresolved.");
  });

  it("falls back to kind/resourceId when resource cannot be resolved", () => {
    const w: StoryWarning = { key: "unresolved_time:alc_unknown", kind: "unresolved_time", resourceId: "alc_unknown" };
    expect(formatStoryWarning(w, baseData)).toBe("unresolved_time: alc_unknown");
  });
});

describe("candidateAllocationsForEngagement", () => {
  it("returns same-wizard pending allocations only", () => {
    const candidates = candidateAllocationsForEngagement(baseData, "eng_2");
    expect(candidates.length).toBe(1);
    expect(candidates[0].allocationId).toBe("alc_g");
  });

  it("returns empty for an already-linked engagement", () => {
    const candidates = candidateAllocationsForEngagement(baseData, "eng_1");
    expect(candidates).toEqual([]);
  });

  it("returns empty when no pending allocations exist for the acting wizard", () => {
    const data: StoryWorkspaceData = {
      ...baseData,
      timeParticipants: [
        makeParticipant("wiz_2", "Morgana", [
          { allocationId: "alc_g", destination: { kind: "familiar" }, resolution: "spent" },
        ]),
      ],
    };
    const candidates = candidateAllocationsForEngagement(data, "eng_2");
    expect(candidates).toEqual([]);
  });
});
