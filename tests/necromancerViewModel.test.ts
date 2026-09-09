import { describe, it, expect } from "vitest";
import {
  EMPTY_NECROMANCER_STATE,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_DEFAULT_INTERNAL_STEPS,
  NECROMANCER_DEFAULT_TERMINAL_EXITS,
  buildInitializedDefaultNecromancerState,
  type DenizenId,
  type NecromancerCampaignGateId,
  type NecromancerCampaignPathSpaceId,
  type NecromancerState,
  type WizardId,
} from "../shared/domain";
import type { DenizenRef } from "../src/WorldSurface";
import {
  NECROMANCER_BUILTIN_GATE_MAP_POINTS,
  NECROMANCER_BUILTIN_PATH_MAP_POINTS,
  NECROMANCER_FAR_BUILTIN_GATE_IDS,
  NECROMANCER_NEAR_BUILTIN_GATE_IDS,
  NECROMANCER_PRIMARY_ELEMENT_OPTIONS,
  NECROMANCER_STATIC_TERMINAL_PRESENTATIONS,
  NECROMANCER_TERMINAL_MAP_POINTS,
  arrangementSetupSlots,
  buildBindCurrentNecromancerAtDepthZeroPayload,
  buildInitializeNecromancerPayload,
  buildAddNecromancerGhoulCallerPayload,
  buildUpdateNecromancerGhoulCallerPayload,
  buildRemoveNecromancerGhoulCallerPayload,
  buildMoveNecromancerSoulsPayload,
  buildRemoveNecromancerAllyPayload,
  buildRemoveNecromancerStepPayload,
  buildSetNecromancerDepthPayload,
  buildSetNecromancerGateStatusPayload,
  buildSetNecromancerSoulCountPayload,
  buildUpdateNecromancerCampaignGatePayload,
  buildUpdateNecromancerFoePayload,
  builtinInternalStepPresentation,
  campaignStructureInspectTargets,
  denizenName,
  duplicateStartingSetupDenizenIds,
  emptyNecromancerSetupDraft,
  escapedFoesGroupedBySeat,
  ghoulCallerProfileLines,
  foesAtSpace,
  hasFixedBoardPresentationPoint,
  isNecromancerInitialized,
  necromancerSetupReady,
  newCommandId,
  occupiableRefKey,
  ordinaryLawReadView,
  pathSpaceDisplayName,
  piecesAtSpace,
  presentationPointForOccupiable,
  resolveOccupiableSelection,
  soulCountAt,
  withSetupArrangement,
  type NecromancerSetupDraft,
} from "../src/necromancer-view-model";

const denizens: readonly DenizenRef[] = [
  { denizenId: "den_deep", name: "Deep Foe", representation: "individual", description: null },
  { denizenId: "den_terminus", name: "Terminus Foe", representation: "collective", description: null },
  { denizenId: "den_far_1", name: "Far Foe One", representation: "individual", description: null },
  { denizenId: "den_far_2", name: "Far Foe Two", representation: "collective", description: null },
  { denizenId: "den_ally", name: "Bound Ally", representation: "collective", description: null },
  { denizenId: "den_ghoul", name: "Ghoul Caller", representation: "individual", description: null },
  { denizenId: "den_collective_ghoul", name: "Crowd", representation: "collective", description: null },
];

function quietDraft(overrides: Partial<NecromancerSetupDraft> = {}): NecromancerSetupDraft {
  return {
    ...withSetupArrangement(emptyNecromancerSetupDraft(), "quiet"),
    selectedLawIds: ["first", "second"],
    deepFoeDenizenId: "den_deep",
    terminusFoeDenizenId: "den_terminus",
    allyDenizenId: "den_ally",
    allyGateId: "amber",
    ...overrides,
  };
}

function dynamicDraft(overrides: Partial<NecromancerSetupDraft> = {}): NecromancerSetupDraft {
  return {
    ...withSetupArrangement(emptyNecromancerSetupDraft(), "dynamic"),
    selectedLawIds: ["third", "fourth"],
    deepFoeDenizenId: "den_deep",
    terminusFoeDenizenId: "den_terminus",
    farFoes: [{ denizenId: "den_far_1", gateId: "howling" }],
    allyDenizenId: "den_ally",
    allyGateId: "ivory",
    ...overrides,
  };
}

function explosiveDraft(overrides: Partial<NecromancerSetupDraft> = {}): NecromancerSetupDraft {
  return {
    ...withSetupArrangement(emptyNecromancerSetupDraft(), "explosive"),
    selectedLawIds: ["fifth", "sixth"],
    deepFoeDenizenId: "den_deep",
    terminusFoeDenizenId: "den_terminus",
    farFoes: [
      { denizenId: "den_far_1", gateId: "marching" },
      { denizenId: "den_far_2", gateId: "weeping" },
    ],
    allyDenizenId: "den_ally",
    allyGateId: "lead",
    ghoulCallerDenizenId: "den_ghoul",
    ghoulCallerPathSpaceId: "edge_sage",
    ghoulCallerPrimaryElement: "fire",
    ghoulCallerAesthetic: "ash-stained funeral silks",
    ghoulCallerStrangeQuirk: "counts backwards from thirteen",
    ghoulCallerAgeYears: "47",
    ...overrides,
  };
}

describe("setup slots", () => {
  it("Quiet requires Deep Foe, Terminus Foe, and Ally", () => {
    const slots = arrangementSetupSlots("quiet");
    expect(slots.map((slot) => slot.kind)).toEqual(["deep_foe", "terminus_foe", "ally"]);
  });

  it("Dynamic requires Deep, Terminus, one Far-Gate Foe, and Ally", () => {
    const slots = arrangementSetupSlots("dynamic");
    expect(slots.map((slot) => slot.kind)).toEqual(["deep_foe", "terminus_foe", "far_foe", "ally"]);
  });

  it("Explosive requires Deep, Terminus, two Far Foes, Ally, and Ghoul-Caller", () => {
    const slots = arrangementSetupSlots("explosive");
    expect(slots.map((slot) => slot.kind)).toEqual([
      "deep_foe",
      "terminus_foe",
      "far_foe",
      "far_foe",
      "ally",
      "ghoul_caller",
    ]);
  });
});

describe("setup readiness", () => {
  it("requires exactly two setup Laws", () => {
    expect(necromancerSetupReady(quietDraft(), denizens)).toBe(true);
    expect(necromancerSetupReady(quietDraft({ selectedLawIds: ["first"] }), denizens)).toBe(false);
    expect(necromancerSetupReady(quietDraft({ selectedLawIds: ["first", "first"] }), denizens)).toBe(false);
    expect(necromancerSetupReady(quietDraft({ selectedLawIds: ["first", "second", "third"] }), denizens)).toBe(false);
  });

  it("Explosive requires one individual Ghoul-Caller", () => {
    expect(necromancerSetupReady(explosiveDraft(), denizens)).toBe(true);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerDenizenId: "" }), denizens)).toBe(false);
    expect(
      necromancerSetupReady(explosiveDraft({ ghoulCallerDenizenId: "den_collective_ghoul" }), denizens),
    ).toBe(false);
  });

  it("Explosive setup readiness requires each durable Ghoul-Caller profile field", () => {
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerPrimaryElement: "" }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerPrimaryElement: "void" }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerAesthetic: "   " }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerStrangeQuirk: "" }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerAgeYears: "" }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerAgeYears: "-1" }), denizens)).toBe(false);
    expect(NECROMANCER_PRIMARY_ELEMENT_OPTIONS).toEqual(["air", "fire", "earth", "water"]);
  });

  it("treats Explosive Ghoul-Caller aesthetic and strange quirk as unready when they cannot be canonicalized", () => {
    const overLimit = "x".repeat(8001);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerAesthetic: overLimit }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({ ghoulCallerStrangeQuirk: overLimit }), denizens)).toBe(false);
    expect(necromancerSetupReady(explosiveDraft({
      ghoulCallerAesthetic: "x".repeat(8000),
      ghoulCallerStrangeQuirk: "y".repeat(8000),
    }), denizens)).toBe(true);
  });

  it("returns null instead of throwing when initialize payload canonicalization fails", () => {
    const overLimit = "x".repeat(8001);
    expect(() => buildInitializeNecromancerPayload({
      commandId: "cmd_over_limit",
      expectedCampaignId: "camp_1",
      draft: explosiveDraft({ ghoulCallerAesthetic: overLimit }),
      denizens,
    })).not.toThrow();
    expect(buildInitializeNecromancerPayload({
      commandId: "cmd_over_limit",
      expectedCampaignId: "camp_1",
      draft: explosiveDraft({ ghoulCallerAesthetic: overLimit }),
      denizens,
    })).toBeNull();
    expect(buildInitializeNecromancerPayload({
      commandId: "cmd_over_limit",
      expectedCampaignId: "camp_1",
      draft: explosiveDraft({ ghoulCallerStrangeQuirk: overLimit }),
      denizens,
    })).toBeNull();
    const accepted = buildInitializeNecromancerPayload({
      commandId: "cmd_limit",
      expectedCampaignId: "camp_1",
      draft: explosiveDraft({
        ghoulCallerAesthetic: "x".repeat(8000),
        ghoulCallerStrangeQuirk: "y".repeat(8000),
      }),
      denizens,
    });
    expect(accepted?.arrangementGhoulCaller?.aesthetic).toBe("x".repeat(8000));
    expect(accepted?.arrangementGhoulCaller?.strangeQuirk).toBe("y".repeat(8000));
  });

  it("duplicate starting Denizen binding makes setup unready", () => {
    expect(duplicateStartingSetupDenizenIds(quietDraft({ allyDenizenId: "den_deep" }))).toEqual(["den_deep"]);
    expect(necromancerSetupReady(quietDraft({ allyDenizenId: "den_deep" }), denizens)).toBe(false);
    expect(
      necromancerSetupReady(
        explosiveDraft({
          farFoes: [
            { denizenId: "den_far_1", gateId: "marching" },
            { denizenId: "den_far_1", gateId: "weeping" },
          ],
        }),
        denizens,
      ),
    ).toBe(false);
  });

  it("initialize payload matches Phase-2B mutation shape", () => {
    const payload = buildInitializeNecromancerPayload({
      commandId: newCommandId("00000000-0000-0000-0000-000000000001"),
      expectedCampaignId: "camp_1",
      draft: explosiveDraft(),
      denizens,
    });
    expect(payload).toEqual({
      commandId: "cmd_00000000-0000-0000-0000-000000000001",
      expectedCampaignId: "camp_1",
      arrangementId: "explosive",
      selectedLawIds: ["fifth", "sixth"],
      arrangementFoes: [
        { denizenId: "den_deep", gateId: "deep" },
        { denizenId: "den_terminus", gateId: "terminus" },
        { denizenId: "den_far_1", gateId: "marching" },
        { denizenId: "den_far_2", gateId: "weeping" },
      ],
      arrangementAlly: { denizenId: "den_ally", gateId: "lead" },
      arrangementGhoulCaller: {
        denizenId: "den_ghoul",
        pathSpaceId: "edge_sage",
        primaryElement: "fire",
        aesthetic: "ash-stained funeral silks",
        strangeQuirk: "counts backwards from thirteen",
        ageYears: 47,
      },
    });
    expect(buildInitializeNecromancerPayload({
      commandId: "cmd_x",
      expectedCampaignId: "camp_1",
      draft: dynamicDraft(),
      denizens,
    })?.arrangementGhoulCaller).toBeNull();
  });

  it("canonicalizes Explosive Ghoul-Caller profile text in the initialize payload", () => {
    const payload = buildInitializeNecromancerPayload({
      commandId: "cmd_y",
      expectedCampaignId: "camp_1",
      draft: explosiveDraft({
        ghoulCallerAesthetic: "  ash-stained funeral silks  ",
        ghoulCallerStrangeQuirk: "  counts backwards from thirteen  ",
      }),
      denizens,
    });
    expect(payload?.arrangementGhoulCaller?.aesthetic).toBe("ash-stained funeral silks");
    expect(payload?.arrangementGhoulCaller?.strangeQuirk).toBe("counts backwards from thirteen");
  });
});

describe("board presentation", () => {
  it("gives all 11 built-in Gates fixed points", () => {
    expect(NECROMANCER_BUILTIN_GATE_IDS).toHaveLength(11);
    for (const gateId of NECROMANCER_BUILTIN_GATE_IDS) {
      expect(NECROMANCER_BUILTIN_GATE_MAP_POINTS[gateId]).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    }
  });

  it("gives all 15 built-in path spaces fixed points", () => {
    expect(NECROMANCER_BUILTIN_PATH_SPACE_IDS).toHaveLength(15);
    for (const pathSpaceId of NECROMANCER_BUILTIN_PATH_SPACE_IDS) {
      expect(NECROMANCER_BUILTIN_PATH_MAP_POINTS[pathSpaceId]).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    }
  });

  it("represents static terminal labels/exits separately from mutable steps", () => {
    expect(NECROMANCER_STATIC_TERMINAL_PRESENTATIONS.map((entry) => ({
      from: entry.from,
      terminalId: entry.terminalId,
      label: entry.label,
    }))).toEqual([
      { from: { kind: "gate", gateId: "howling" }, terminalId: "void_beyond", label: "Void Beyond" },
      { from: { kind: "gate", gateId: "terminus" }, terminalId: "final_death", label: "Final Death" },
    ]);
    expect(NECROMANCER_TERMINAL_MAP_POINTS.void_beyond).toBeDefined();
    expect(NECROMANCER_TERMINAL_MAP_POINTS.final_death).toBeDefined();
    expect(NECROMANCER_DEFAULT_TERMINAL_EXITS).toHaveLength(2);
    for (const step of NECROMANCER_DEFAULT_INTERNAL_STEPS) {
      expect(step.to.kind === "gate" || step.to.kind === "path").toBe(true);
    }
  });

  it("renders built-in internal steps with presentation coordinates", () => {
    const path = builtinInternalStepPresentation({
      from: { kind: "path", pathSpaceId: "edge_sage" },
      to: { kind: "gate", gateId: "amber" },
    });
    expect(path).toEqual({
      a: NECROMANCER_BUILTIN_PATH_MAP_POINTS.edge_sage,
      b: NECROMANCER_BUILTIN_GATE_MAP_POINTS.amber,
    });
  });

  it("does not assign persisted presentation coordinates to custom nodes", () => {
    const customGate = { kind: "gate" as const, gateId: "ngt_00000000-0000-0000-0000-000000000099" as NecromancerCampaignGateId };
    const customPath = { kind: "path" as const, pathSpaceId: "nps_00000000-0000-0000-0000-000000000098" as NecromancerCampaignPathSpaceId };
    expect(presentationPointForOccupiable(customGate)).toBeNull();
    expect(presentationPointForOccupiable(customPath)).toBeNull();
    expect(hasFixedBoardPresentationPoint(customGate)).toBe(false);
    expect(builtinInternalStepPresentation({
      from: { kind: "gate", gateId: "amber" },
      to: customPath,
    })).toBeNull();
  });
});

describe("labels and pieces", () => {
  const state: NecromancerState = buildInitializedDefaultNecromancerState({
    souls: [
      { location: { kind: "gate", gateId: "amber" }, count: 3 },
      { location: { kind: "path", pathSpaceId: "edge_sage" }, count: 1 },
    ],
    foes: [
      { denizenId: "den_deep" as DenizenId, location: { kind: "gate", gateId: "deep" } },
      {
        denizenId: "den_far_1" as DenizenId,
        location: { kind: "escaped", seatId: "hierophant", abominationKind: "occult" },
      },
      {
        denizenId: "den_far_2" as DenizenId,
        location: { kind: "escaped", seatId: "mariner", abominationKind: "brutal" },
      },
    ],
    allies: [{ denizenId: "den_ally" as DenizenId, location: { kind: "gate", gateId: "amber" } }],
    ghoulCallers: [{
      denizenId: "den_ghoul" as DenizenId,
      disposition: "disruptive",
      location: { kind: "path", pathSpaceId: "edge_sage" },
      pettyDeadCount: 2,
      primaryElement: "fire",
      aesthetic: "ash-stained funeral silks",
      strangeQuirk: "counts backwards from thirteen",
      ageYears: 47,
    }],
  });

  it("looks up Soul counts, including absent rows as zero", () => {
    expect(soulCountAt(state.souls, { kind: "gate", gateId: "amber" })).toBe(3);
    expect(soulCountAt(state.souls, { kind: "gate", gateId: "lead" })).toBe(0);
  });

  it("looks up Foe, Ally, and Ghoul-Caller pieces by space", () => {
    const amber = piecesAtSpace(state, { kind: "gate", gateId: "amber" });
    expect(amber.souls).toBe(3);
    expect(amber.allies.map((ally) => ally.denizenId)).toEqual(["den_ally"]);
    expect(foesAtSpace(state.foes, { kind: "gate", gateId: "deep" }).map((foe) => foe.denizenId)).toEqual(["den_deep"]);
    const edge = piecesAtSpace(state, { kind: "path", pathSpaceId: "edge_sage" });
    expect(edge.ghoulCallers.map((ghoul) => ghoul.denizenId)).toEqual(["den_ghoul"]);
  });

  it("resolves Denizen names", () => {
    expect(denizenName(denizens, "den_deep")).toBe("Deep Foe");
    expect(denizenName(denizens, "den_missing")).toBe("Unknown Denizen");
  });

  it("labels escaped Foes by destination Pact Domain", () => {
    const groups = escapedFoesGroupedBySeat(state.foes);
    expect(groups.map((group) => group.domainLabel)).toEqual(["Hierophant", "Mariner"]);
    expect(groups[0]?.foes[0]?.denizenId).toBe("den_far_1");
  });
});

describe("hidden Laws", () => {
  it("ordinary hidden display does not contain Law ID, name, or text", () => {
    const view = ordinaryLawReadView({ lawId: "first", visibility: "hidden" });
    expect(view).toEqual({ kind: "hidden" });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("first");
    expect(serialized).not.toContain("First Law");
    expect(serialized).not.toContain("food of the dead");
  });

  it("revealed Law includes name and text", () => {
    const view = ordinaryLawReadView({ lawId: "first", visibility: "revealed" });
    expect(view.kind).toBe("revealed");
    if (view.kind !== "revealed") return;
    expect(view.lawId).toBe("first");
    expect(view.applicationLabel).toBe("First Law of Death");
    expect(view.text).toContain("food of the dead");
  });
});

describe("Depth payloads", () => {
  it("matched-owner edit sends the exact current Depth as expectedDepth", () => {
    const payload = buildSetNecromancerDepthPayload({
      commandId: "cmd_d",
      expectedCampaignId: "camp_1",
      expectedDepth: { wizardId: "wiz_n" as WizardId, value: 2 },
      depth: { wizardId: "wiz_n" as WizardId, value: 7 },
    });
    expect(payload.expectedDepth).toEqual({ wizardId: "wiz_n", value: 2 });
    expect(payload.depth).toEqual({ wizardId: "wiz_n", value: 7 });
  });

  it("successor or mismatched owner produces an explicit reset-to-zero payload", () => {
    const payload = buildBindCurrentNecromancerAtDepthZeroPayload({
      commandId: "cmd_d",
      expectedCampaignId: "camp_1",
      expectedDepth: { wizardId: "wiz_old" as WizardId, value: 3 },
      currentWizardId: "wiz_new",
    });
    expect(payload.expectedDepth).toEqual({ wizardId: "wiz_old", value: 3 });
    expect(payload.depth).toEqual({ wizardId: "wiz_new", value: 0 });
  });

  it("Depth greater than 3 remains valid client input", () => {
    const payload = buildSetNecromancerDepthPayload({
      commandId: "cmd_d",
      expectedCampaignId: "camp_1",
      expectedDepth: { wizardId: "wiz_n" as WizardId, value: 0 },
      depth: { wizardId: "wiz_n" as WizardId, value: 11 },
    });
    expect(payload.depth?.value).toBe(11);
  });
});

describe("expected-current payloads", () => {
  it("Gate status uses the current status as expectedStatus", () => {
    expect(buildSetNecromancerGateStatusPayload({
      commandId: "cmd_g",
      expectedCampaignId: "camp_1",
      gateId: "amber",
      expectedStatus: "ordinary",
      status: "hostile",
    })).toEqual({
      commandId: "cmd_g",
      expectedCampaignId: "camp_1",
      gateId: "amber",
      expectedStatus: "ordinary",
      status: "hostile",
    });
    expect(buildSetNecromancerGateStatusPayload({
      commandId: "cmd_g",
      expectedCampaignId: "camp_1",
      gateId: "amber",
      expectedStatus: "destroyed",
      status: "ordinary",
    })).toBeNull();
  });

  it("Soul count uses the current count as expectedCount", () => {
    expect(buildSetNecromancerSoulCountPayload({
      commandId: "cmd_s",
      expectedCampaignId: "camp_1",
      location: { kind: "gate", gateId: "amber" },
      expectedCount: 3,
      count: 0,
    })).toMatchObject({ expectedCount: 3, count: 0 });
  });

  it("Soul move uses current from/to counts", () => {
    expect(buildMoveNecromancerSoulsPayload({
      commandId: "cmd_m",
      expectedCampaignId: "camp_1",
      from: { kind: "gate", gateId: "amber" },
      to: { kind: "path", pathSpaceId: "far_amber" },
      amount: 2,
      expectedFromCount: 3,
      expectedToCount: 1,
    })).toMatchObject({ amount: 2, expectedFromCount: 3, expectedToCount: 1 });
  });

  it("role update and remove send expected-current records", () => {
    const expectedAlly = { denizenId: "den_ally" as DenizenId, location: { kind: "gate" as const, gateId: "amber" as const } };
    expect(buildRemoveNecromancerAllyPayload({
      commandId: "cmd_r",
      expectedCampaignId: "camp_1",
      expectedAlly,
    })).toEqual({
      commandId: "cmd_r",
      expectedCampaignId: "camp_1",
      denizenId: "den_ally",
      expectedAlly,
    });
    expect(buildUpdateNecromancerFoePayload({
      commandId: "cmd_fu",
      expectedCampaignId: "camp_1",
      denizenId: "den_deep",
      expectedLocation: { kind: "gate", gateId: "deep" },
      location: { kind: "escaped", seatId: "hierophant", abominationKind: "occult" },
    })).toEqual({
      commandId: "cmd_fu",
      expectedCampaignId: "camp_1",
      denizenId: "den_deep",
      fields: {
        location: {
          expected: { kind: "gate", gateId: "deep" },
          value: { kind: "escaped", seatId: "hierophant", abominationKind: "occult" },
        },
      },
    });
  });

  it("campaign Gate update and step removal use expected-current values", () => {
    const expected = {
      origin: "campaign" as const,
      gateId: "ngt_00000000-0000-0000-0000-000000000010" as NecromancerCampaignGateId,
      name: "Old Name",
      band: "far" as const,
      status: "ordinary" as const,
    };
    expect(buildUpdateNecromancerCampaignGatePayload({
      commandId: "cmd_u",
      expectedCampaignId: "camp_1",
      expected,
      name: "New Name",
      band: "far",
    })).toEqual({
      commandId: "cmd_u",
      expectedCampaignId: "camp_1",
      gateId: expected.gateId,
      fields: { name: { expected: "Old Name", value: "New Name" } },
    });
    const expectedStep = {
      from: { kind: "gate" as const, gateId: "amber" as const },
      to: { kind: "path" as const, pathSpaceId: "far_amber" as const },
    };
    expect(buildRemoveNecromancerStepPayload({
      commandId: "cmd_rs",
      expectedCampaignId: "camp_1",
      expectedStep,
    })).toEqual({
      commandId: "cmd_rs",
      expectedCampaignId: "camp_1",
      expectedStep,
    });
  });
});

describe("initialization detection", () => {
  it("empty state is uninitialized", () => {
    expect(isNecromancerInitialized(EMPTY_NECROMANCER_STATE)).toBe(false);
    expect(isNecromancerInitialized(buildInitializedDefaultNecromancerState())).toBe(true);
  });
});

describe("catalog option helpers used by setup", () => {
  it("Near and Far built-in Gate lists match the source bands", () => {
    expect(NECROMANCER_NEAR_BUILTIN_GATE_IDS).toEqual(["amber", "bronze", "lead", "ivory", "antimony"]);
    expect(NECROMANCER_FAR_BUILTIN_GATE_IDS).toEqual(["marching", "churning", "weeping", "howling"]);
  });
});

const CAMPAIGN_GATE_ID = "ngt_00000000-0000-0000-0000-000000000010" as NecromancerCampaignGateId;
const CAMPAIGN_PATH_A = "nps_00000000-0000-0000-0000-000000000098" as NecromancerCampaignPathSpaceId;
const CAMPAIGN_PATH_B = "nps_00000000-0000-0000-0000-000000000099" as NecromancerCampaignPathSpaceId;

function stateWithCampaignStructure(): NecromancerState {
  return buildInitializedDefaultNecromancerState({
    campaignGates: [{
      origin: "campaign",
      gateId: CAMPAIGN_GATE_ID,
      name: "Nightwell",
      band: "near",
      status: "ordinary",
    }],
    campaignPathSpaces: [
      { origin: "campaign", pathSpaceId: CAMPAIGN_PATH_A, region: "edge_of_life" },
      { origin: "campaign", pathSpaceId: CAMPAIGN_PATH_B, region: "edge_of_life" },
    ],
  });
}

describe("campaign path labels", () => {
  it("keeps built-in path labels unchanged", () => {
    expect(pathSpaceDisplayName({ origin: "builtin", pathSpaceId: "edge_sage" })).toBe("Sage Edge of Life");
    expect(pathSpaceDisplayName({ origin: "builtin", pathSpaceId: "far_amber" })).toBe("Amber Far Lands");
  });

  it("gives two campaign path spaces in the same region distinct human-readable labels", () => {
    const a = pathSpaceDisplayName({ origin: "campaign", pathSpaceId: CAMPAIGN_PATH_A, region: "edge_of_life" });
    const b = pathSpaceDisplayName({ origin: "campaign", pathSpaceId: CAMPAIGN_PATH_B, region: "edge_of_life" });
    expect(a).toContain("Edge of Life");
    expect(b).toContain("Edge of Life");
    expect(a).toContain(CAMPAIGN_PATH_A);
    expect(b).toContain(CAMPAIGN_PATH_B);
    expect(a).not.toBe(b);
  });
});

describe("campaign structure inspector selection", () => {
  it("exposes campaign Gates as the same occupiable Gate refs used by built-in nodes", () => {
    const state = stateWithCampaignStructure();
    const gateTarget = campaignStructureInspectTargets(state).find((target) => target.kind === "gate");
    expect(gateTarget?.selection).toEqual({ kind: "gate", gateId: CAMPAIGN_GATE_ID });
    expect(occupiableRefKey(gateTarget!.selection)).toBe(`gate:${CAMPAIGN_GATE_ID}`);
    expect(hasFixedBoardPresentationPoint(gateTarget!.selection)).toBe(false);
  });

  it("exposes campaign path spaces as the same occupiable path refs used by built-in nodes", () => {
    const state = stateWithCampaignStructure();
    const pathTargets = campaignStructureInspectTargets(state).filter((target) => target.kind === "path");
    expect(pathTargets.map((target) => target.selection)).toEqual([
      { kind: "path", pathSpaceId: CAMPAIGN_PATH_A },
      { kind: "path", pathSpaceId: CAMPAIGN_PATH_B },
    ]);
    expect(occupiableRefKey(pathTargets[0]!.selection)).toBe(`path:${CAMPAIGN_PATH_A}`);
    expect(pathTargets[0]!.label).not.toBe(pathTargets[1]!.label);
  });

  it("clears occupiable selection when the referenced campaign path no longer exists", () => {
    const state = stateWithCampaignStructure();
    const pathRef = { kind: "path" as const, pathSpaceId: CAMPAIGN_PATH_A };
    expect(resolveOccupiableSelection(pathRef, state)).toEqual(pathRef);
    const withoutPath = {
      ...state,
      pathSpaces: state.pathSpaces.filter((path) => path.pathSpaceId !== CAMPAIGN_PATH_A),
    };
    expect(resolveOccupiableSelection(pathRef, withoutPath)).toBeNull();
    expect(resolveOccupiableSelection({ kind: "gate", gateId: "amber" }, withoutPath)).toEqual({
      kind: "gate",
      gateId: "amber",
    });
  });
});

describe("Ghoul-Caller profile payloads and presentation", () => {
  const ghoul = {
    denizenId: "den_ghoul" as DenizenId,
    disposition: "disruptive" as const,
    location: { kind: "path" as const, pathSpaceId: "edge_sage" as const },
    pettyDeadCount: 0,
    primaryElement: "fire" as const,
    aesthetic: "ash-stained funeral silks",
    strangeQuirk: "counts backwards from thirteen",
    ageYears: 47,
  };

  it("add payload includes the canonical durable profile", () => {
    const payload = buildAddNecromancerGhoulCallerPayload({
      commandId: "cmd_1",
      expectedCampaignId: "camp_1",
      ghoulCaller: { ...ghoul, aesthetic: "  ash-stained funeral silks  " },
    });
    expect(payload?.ghoulCaller).toEqual(ghoul);
  });

  it("update payload carries expected/value pairs for profile edits", () => {
    const payload = buildUpdateNecromancerGhoulCallerPayload({
      commandId: "cmd_1",
      expectedCampaignId: "camp_1",
      denizenId: ghoul.denizenId,
      expected: ghoul,
      location: ghoul.location,
      disposition: ghoul.disposition,
      pettyDeadCount: ghoul.pettyDeadCount,
      primaryElement: "water",
      aesthetic: "  river silt  ",
      strangeQuirk: ghoul.strangeQuirk,
      ageYears: 48,
    });
    expect(payload?.fields).toEqual({
      primaryElement: { expected: "fire", value: "water" },
      aesthetic: { expected: "ash-stained funeral silks", value: "river silt" },
      ageYears: { expected: 47, value: 48 },
    });
  });

  it("remove payload carries the full current profile-bearing Ghoul record", () => {
    expect(buildRemoveNecromancerGhoulCallerPayload({
      commandId: "cmd_1",
      expectedCampaignId: "camp_1",
      expectedGhoulCaller: ghoul,
    }).expectedGhoulCaller).toEqual(ghoul);
  });

  it("ordinary presentation includes Primary Element, Aesthetic, Strange Quirk, and Age", () => {
    expect(ghoulCallerProfileLines(ghoul)).toEqual([
      "Primary Element Fire",
      "Aesthetic ash-stained funeral silks",
      "Strange Quirk counts backwards from thirteen",
      "Age 47",
    ]);
  });
});
