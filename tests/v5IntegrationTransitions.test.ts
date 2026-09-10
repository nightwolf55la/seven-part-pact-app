import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  CampaignWizardV5,
  MonthOrdinal,
  PlayerId,
  WizardId,
  DenizenId,
  IsleId,
  PlaceId,
  EngagementId,
  AllocationId,
  EngagementRecordV5,
  EngagementTargetV5,
  WizardCharacterDataV5,
  CampaignEvent,
  CampaignCommandType,
} from "../shared/domain";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  DomainError,
  BLANK_WIZARD_CHARACTER_V5,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SAGE_STATE,
  EMPTY_FAUSTIAN_STATE,
} from "../shared/domain";
import {
  applyUpdateWizardCharacterV5Candidate,
  applySetEngagementTargetV5Candidate,
  applyRescheduleEngagementV5Candidate,
} from "../shared/domain/v5-integration-transitions";
import type {
  WizardCharacterPatchV5,
  V5IntegrationTransitionResult,
} from "../shared/domain/v5-integration-transitions";
import {
  validateEventCoherenceForTest,
  type CanonicalCommitInput,
} from "../convex/canonicalCommit";

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const ISL_1 = "isl_00000000-0000-0000-0000-000000000001" as IsleId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const ENG_1 = "eng_00000000-0000-0000-0000-000000000001" as EngagementId;
const ENG_2 = "eng_00000000-0000-0000-0000-000000000002" as EngagementId;
const ALLOC_1 = "alloc_00000000-0000-0000-0000-000000000001" as AllocationId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function blankV5Wizard(overrides?: Partial<CampaignWizardV5>): CampaignWizardV5 {
  return {
    wizardId: WIZ_A,
    name: "Wizard A",
    portrayedByPlayerId: PLR_A,
    character: { ...BLANK_WIZARD_CHARACTER_V5 },
    homeIsleId: null,
    sanctumPlaceId: null,
    mortalityState: "not_deceased",
    ...overrides,
  };
}

function baseV5Setup(wizards?: CampaignWizardV5[]): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 5 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: wizards ?? [blankV5Wizard()],
    pactSeats: EMPTY_PACT_SEATS,
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: { ...EMPTY_SHARED_WORLD_STATE },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
    faustian: { ...EMPTY_FAUSTIAN_STATE },
    sage: { ...EMPTY_SAGE_STATE },
  };
}

function baseV5Play(
  phase: "planning" | "story",
  overrides?: {
    wizards?: CampaignWizardV5[];
    engagements?: EngagementRecordV5[];
    denizens?: readonly import("../shared/domain").Denizen[];
  },
): CampaignStateV5 {
  const setup = baseV5Setup(overrides?.wizards);
  return {
    ...setup,
    lifecycle: {
      kind: "play",
      phase,
      orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as any,
      currentMonth: {
        timeParticipants: [],
        engagements: overrides?.engagements ?? [],
        wizardmootAttendance: null,
      },
    },
    world: {
      ...setup.world,
      denizens: overrides?.denizens ?? [],
    },
  };
}

function pendingEngagement(
  engagementId: EngagementId,
  actingWizardId: WizardId,
  target: EngagementTargetV5 | null,
  linkedAllocationId: AllocationId | null = null,
): EngagementRecordV5 {
  return {
    engagementId,
    actingWizardId,
    target,
    resolution: "pending",
    linkedTimeAllocationId: linkedAllocationId,
  };
}

// =========================================================================
// 1. V5 Wizard character patch — updates, normalizes, preserves associations
// =========================================================================

describe("applyUpdateWizardCharacterV5Candidate", () => {
  it("updates scalar/list fields, normalizes, preserves homeIsleId/sanctumPlaceId", () => {
    const state = baseV5Setup([
      blankV5Wizard({ homeIsleId: ISL_1, sanctumPlaceId: PLC_1 }),
    ]);

    const result = applyUpdateWizardCharacterV5Candidate(state, WIZ_A, {
      pactFragmentPersonalForm: "  A shard of fire  ",
      familiarDescription: "  ",
      ageYears: 42,
      publicChangesOfMagic: ["  First change  ", "Second change"],
      importantNotes: "  Keeps a journal  ",
    });

    const wiz = result.nextState.wizards.find((w) => w.wizardId === WIZ_A)!;
    expect(wiz.character.pactFragmentPersonalForm).toBe("A shard of fire");
    expect(wiz.character.familiarDescription).toBeNull();
    expect(wiz.character.ageYears).toBe(42);
    expect(wiz.character.publicChangesOfMagic).toEqual(["First change", "Second change"]);
    expect(wiz.character.importantNotes).toBe("Keeps a journal");
    expect(wiz.homeIsleId).toBe(ISL_1);
    expect(wiz.sanctumPlaceId).toBe(PLC_1);
  });
});

// =========================================================================
// 2. V5 patch contract — empty patch and invalid field rejected
// =========================================================================

describe("V5 patch contract rejections", () => {
  it("rejects an empty patch", () => {
    const state = baseV5Setup();
    try {
      applyUpdateWizardCharacterV5Candidate(state, WIZ_A, {});
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects a negative ageYears", () => {
    const state = baseV5Setup();
    try {
      applyUpdateWizardCharacterV5Candidate(state, WIZ_A, { ageYears: -1 });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});

// =========================================================================
// 3. V5 Wizard-character update emits WizardCharacterUpdatedEventV2
// =========================================================================

describe("V5 wizard character event", () => {
  it("emits v2 event with complete previous/new V5 character objects", () => {
    const state = baseV5Setup();

    const result = applyUpdateWizardCharacterV5Candidate(state, WIZ_A, {
      familiarDescription: "An owl",
    });

    expect(result.events).toHaveLength(1);
    const evt = result.events[0];
    expect(evt.type).toBe("wizard_character_updated");
    expect(evt.version).toBe(2);
    const data = evt.data as any;
    expect(data.previousCharacter).toEqual(BLANK_WIZARD_CHARACTER_V5);
    expect(data.newCharacter.familiarDescription).toBe("An owl");
    // V5 character must NOT have companionDescriptions
    expect(data.newCharacter.companionDescriptions).toBeUndefined();
  });
});

// =========================================================================
// 4. Planning Engagement — Denizen target succeeds, named_character retained
// =========================================================================

describe("applySetEngagementTargetV5Candidate — planning", () => {
  it("accepts a Denizen target and emits v2 event", () => {
    const state = baseV5Play("planning", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
    });

    const result = applySetEngagementTargetV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    const eng = result.nextState.lifecycle.kind === "play"
      ? result.nextState.lifecycle.currentMonth.engagements.find((e) => e.engagementId === ENG_1)!
      : null!;
    expect(eng.target).toEqual({ kind: "denizen", denizenId: DEN_1 });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("engagement_target_changed");
    expect(result.events[0].version).toBe(2);
  });

  it("retains named_character as a freeform target", () => {
    const state = baseV5Play("planning", {
      wizards: [blankV5Wizard()],
      engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
    });

    const result = applySetEngagementTargetV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "named_character", name: "The Stranger" },
    });

    const eng = result.nextState.lifecycle.kind === "play"
      ? result.nextState.lifecycle.currentMonth.engagements.find((e) => e.engagementId === ENG_1)!
      : null!;
    expect(eng.target).toEqual({ kind: "named_character", name: "The Stranger" });
  });
});

// =========================================================================
// 5. Denizen target with missing Denizen is rejected
// =========================================================================

describe("applySetEngagementTargetV5Candidate — missing Denizen", () => {
  it("rejects a Denizen target when no Denizen exists", () => {
    const state = baseV5Play("planning", {
      wizards: [blankV5Wizard()],
      engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
    });

    try {
      applySetEngagementTargetV5Candidate(state, {
        expectedMonthOrdinal: 5 as MonthOrdinal,
        engagementId: ENG_1,
        target: { kind: "denizen", denizenId: DEN_1 },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});

// =========================================================================
// 6. Planning operation preserves linkedTimeAllocationId and unrelated state
// =========================================================================

describe("applySetEngagementTargetV5Candidate — preservation", () => {
  it("preserves linkedTimeAllocationId and other engagements", () => {
    const state = baseV5Play("planning", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [
        pendingEngagement(ENG_1, WIZ_A, null, ALLOC_1),
        pendingEngagement(ENG_2, WIZ_A, { kind: "self" }),
      ],
    });

    const result = applySetEngagementTargetV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    const engs = result.nextState.lifecycle.kind === "play"
      ? result.nextState.lifecycle.currentMonth.engagements
      : null!;
    const eng1 = engs.find((e) => e.engagementId === ENG_1)!;
    const eng2 = engs.find((e) => e.engagementId === ENG_2)!;
    expect(eng1.linkedTimeAllocationId).toBe(ALLOC_1);
    expect(eng1.actingWizardId).toBe(WIZ_A);
    expect(eng2.target).toEqual({ kind: "self" });
  });
});

// =========================================================================
// 7. Story reschedule accepts a Denizen target and emits v2 event
// =========================================================================

describe("applyRescheduleEngagementV5Candidate — story", () => {
  it("accepts a Denizen target and emits EngagementRescheduledEventV2", () => {
    const state = baseV5Play("story", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [pendingEngagement(ENG_1, WIZ_A, { kind: "self" })],
    });

    const result = applyRescheduleEngagementV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    const eng = result.nextState.lifecycle.kind === "play"
      ? result.nextState.lifecycle.currentMonth.engagements.find((e) => e.engagementId === ENG_1)!
      : null!;
    expect(eng.target).toEqual({ kind: "denizen", denizenId: DEN_1 });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("engagement_rescheduled");
    expect(result.events[0].version).toBe(2);
  });
});

// =========================================================================
// 8. M4 phase/pending/month restrictions still enforced
// =========================================================================

describe("V5 candidate operations enforce M4 restrictions", () => {
  const cases = [
    {
      label: "set target during story phase",
      act: () => {
        const state = baseV5Play("story", {
          wizards: [blankV5Wizard()],
          engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
        });
        return applySetEngagementTargetV5Candidate(state, {
          expectedMonthOrdinal: 5 as MonthOrdinal,
          engagementId: ENG_1,
          target: null,
        });
      },
    },
    {
      label: "reschedule during planning phase",
      act: () => {
        const state = baseV5Play("planning", {
          wizards: [blankV5Wizard()],
          engagements: [pendingEngagement(ENG_1, WIZ_A, { kind: "self" })],
        });
        return applyRescheduleEngagementV5Candidate(state, {
          expectedMonthOrdinal: 5 as MonthOrdinal,
          engagementId: ENG_1,
          target: { kind: "self" },
        });
      },
    },
    {
      label: "set target with wrong month",
      act: () => {
        const state = baseV5Play("planning", {
          wizards: [blankV5Wizard()],
          engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
        });
        return applySetEngagementTargetV5Candidate(state, {
          expectedMonthOrdinal: 99 as MonthOrdinal,
          engagementId: ENG_1,
          target: null,
        });
      },
    },
    {
      label: "set target on resolved engagement",
      act: () => {
        const state = baseV5Play("planning", {
          wizards: [blankV5Wizard()],
          engagements: [
            {
              engagementId: ENG_1,
              actingWizardId: WIZ_A,
              target: null,
              resolution: "resolved",
              linkedTimeAllocationId: null,
            },
          ],
        });
        return applySetEngagementTargetV5Candidate(state, {
          expectedMonthOrdinal: 5 as MonthOrdinal,
          engagementId: ENG_1,
          target: null,
        });
      },
    },
  ] as const;

  for (const { label, act } of cases) {
    it(label, () => {
      try {
        act();
        expect.unreachable("should have thrown");
      } catch (e: any) {
        expect(e).toBeInstanceOf(DomainError);
        expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
      }
    });
  }
});

// =========================================================================
// 9. Element no-op detection — same values in a new object instance
// =========================================================================

describe("V5 Element no-op detection", () => {
  it("rejects a patch supplying a new Element object with identical scores", () => {
    const elements = { air: 1, fire: 2, earth: 3, water: 4 };
    const state = baseV5Setup([
      blankV5Wizard({ character: { ...BLANK_WIZARD_CHARACTER_V5, elements } }),
    ]);

    try {
      applyUpdateWizardCharacterV5Candidate(state, WIZ_A, {
        elements: { air: 1, fire: 2, earth: 3, water: 4 },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }

    // Input state must be unchanged
    const wiz = state.wizards.find((w) => w.wizardId === WIZ_A)!;
    expect(wiz.character.elements).toBe(elements);
  });
});

// =========================================================================
// 10. REAL PRODUCER -> REAL COHERENCE GATE
// =========================================================================

function makeCoherenceInput(
  commandType: CampaignCommandType,
  commandFingerprint: string,
  currentState: CampaignStateV5,
  nextState: CampaignStateV5,
  events: readonly CampaignEvent[],
): CanonicalCommitInput {
  return {
    campaignDocId: "camp-doc-1" as any,
    campaignId: "camp-test-1",
    currentRevision: 42,
    currentState,
    commandId: "cmd-test-1",
    commandType,
    commandFingerprint,
    nextState,
    events,
    historyControlUpdate: { kind: "logical_state_append" },
  };
}

describe("Real V5 transition -> real coherence gate", () => {
  it("update_wizard_character: real v2 event passes validateEventCoherenceForTest", () => {
    const state = baseV5Setup([blankV5Wizard()]);
    const result = applyUpdateWizardCharacterV5Candidate(state, WIZ_A, {
      familiarDescription: "An owl",
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("wizard_character_updated");
    expect(result.events[0].version).toBe(2);

    const input = makeCoherenceInput(
      "update_wizard_character",
      "update_wizard_character:v1:test",
      state,
      result.nextState,
      result.events as readonly CampaignEvent[],
    );
    expect(() => validateEventCoherenceForTest(input, 43)).not.toThrow();
  });

  it("set_engagement_target: real v2 event passes validateEventCoherenceForTest", () => {
    const state = baseV5Play("planning", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
    });
    const result = applySetEngagementTargetV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("engagement_target_changed");
    expect(result.events[0].version).toBe(2);

    const input = makeCoherenceInput(
      "set_engagement_target",
      "set_engagement_target:v1:test",
      state,
      result.nextState,
      result.events as readonly CampaignEvent[],
    );
    expect(() => validateEventCoherenceForTest(input, 43)).not.toThrow();
  });

  it("reschedule_engagement: real v2 event passes validateEventCoherenceForTest", () => {
    const state = baseV5Play("story", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [pendingEngagement(ENG_1, WIZ_A, { kind: "self" })],
    });
    const result = applyRescheduleEngagementV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("engagement_rescheduled");
    expect(result.events[0].version).toBe(2);

    const input = makeCoherenceInput(
      "reschedule_engagement",
      "reschedule_engagement:v1:test",
      state,
      result.nextState,
      result.events as readonly CampaignEvent[],
    );
    expect(() => validateEventCoherenceForTest(input, 43)).not.toThrow();
  });
});

// =========================================================================
// 11. WRONG CURRENT VERSION MUST FAIL — v1 rejected for current V5 commands
// =========================================================================

describe("Current V5 commands require v2 (v1 rejected)", () => {
  it("update_wizard_character + wizard_character_updated v1 -> INVALID_CAMPAIGN_STATE", () => {
    const state = baseV5Setup([blankV5Wizard()]);
    const result = applyUpdateWizardCharacterV5Candidate(state, WIZ_A, {
      familiarDescription: "An owl",
    });

    const downgradedEvent = { ...result.events[0], version: 1 } as CampaignEvent;
    const input = makeCoherenceInput(
      "update_wizard_character",
      "update_wizard_character:v1:test",
      state,
      result.nextState,
      [downgradedEvent],
    );
    try {
      validateEventCoherenceForTest(input, 43);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("set_engagement_target + engagement_target_changed v1 -> INVALID_CAMPAIGN_STATE", () => {
    const state = baseV5Play("planning", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [pendingEngagement(ENG_1, WIZ_A, null)],
    });
    const result = applySetEngagementTargetV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    const downgradedEvent = { ...result.events[0], version: 1 } as CampaignEvent;
    const input = makeCoherenceInput(
      "set_engagement_target",
      "set_engagement_target:v1:test",
      state,
      result.nextState,
      [downgradedEvent],
    );
    try {
      validateEventCoherenceForTest(input, 43);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("reschedule_engagement + engagement_rescheduled v1 -> INVALID_CAMPAIGN_STATE", () => {
    const state = baseV5Play("story", {
      wizards: [blankV5Wizard()],
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null }],
      engagements: [pendingEngagement(ENG_1, WIZ_A, { kind: "self" })],
    });
    const result = applyRescheduleEngagementV5Candidate(state, {
      expectedMonthOrdinal: 5 as MonthOrdinal,
      engagementId: ENG_1,
      target: { kind: "denizen", denizenId: DEN_1 },
    });

    const downgradedEvent = { ...result.events[0], version: 1 } as CampaignEvent;
    const input = makeCoherenceInput(
      "reschedule_engagement",
      "reschedule_engagement:v1:test",
      state,
      result.nextState,
      [downgradedEvent],
    );
    try {
      validateEventCoherenceForTest(input, 43);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});

// =========================================================================
// 12. UNRELATED UNSUPPORTED v2 STILL FAILS
// =========================================================================

describe("Unrelated v2 event remains rejected (no generic v2 escape hatch)", () => {
  it("player_added v2 -> INVALID_CAMPAIGN_STATE", () => {
    const v2Event: CampaignEvent = {
      type: "player_added",
      version: 2,
      data: { playerId: PLR_A, name: "Alice" },
    } as unknown as CampaignEvent;
    const input = makeCoherenceInput(
      "add_player",
      "add_player:v1:test",
      baseV5Setup(),
      baseV5Setup(),
      [v2Event],
    );
    try {
      validateEventCoherenceForTest(input, 43);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});
