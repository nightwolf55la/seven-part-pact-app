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
  CompanionRelationshipId,
  CompanionRelationship,
  SharedWorldState,
} from "../shared/domain";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  DomainError,
  BLANK_WIZARD_CHARACTER_V5,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_HIEROPHANT_STATE,
} from "../shared/domain";
import {
  applySetWizardHomeIsleV5Candidate,
  applySetWizardSanctumV5Candidate,
  applySetWizardCompanionV5Candidate,
  applyUpdateCompanionDescriptionV5Candidate,
} from "../shared/domain/world-relationship-transitions";

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const ISL_1 = "isl_00000000-0000-0000-0000-000000000001" as IsleId;
const ISL_2 = "isl_00000000-0000-0000-0000-000000000002" as IsleId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const PLC_2 = "plc_00000000-0000-0000-0000-000000000002" as PlaceId;
const CMPREL_1 = "cmprel_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId;
const CMPREL_2 = "cmprel_00000000-0000-0000-0000-000000000002" as CompanionRelationshipId;
const CMPREL_3 = "cmprel_00000000-0000-0000-0000-000000000003" as CompanionRelationshipId;

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
    ...overrides,
  };
}

function baseV5(wizards?: CampaignWizardV5[], world?: Partial<SharedWorldState>): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: wizards ?? [blankV5Wizard()],
    pactSeats: EMPTY_PACT_SEATS,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: { ...EMPTY_SHARED_WORLD_STATE, ...world },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
  };
}

function withRelationship(state: CampaignStateV5, cr: CompanionRelationship): CampaignStateV5 {
  return {
    ...state,
    world: {
      ...state.world,
      companionRelationships: [...state.world.companionRelationships, cr],
    },
  };
}

// =========================================================================
// 1. Home-Isle association: valid change preserves unrelated wizard fields
// =========================================================================

describe("applySetWizardHomeIsleV5Candidate", () => {
  it("changes home isle and preserves unrelated wizard fields", () => {
    const state = baseV5(
      [blankV5Wizard({ sanctumPlaceId: PLC_1 })],
      {
        isles: [{ isleId: ISL_1, name: "Atoll", description: null }],
        places: [{ placeId: PLC_1, name: "Tower", description: null, placement: { kind: "unspecified" } }],
      },
    );

    const result = applySetWizardHomeIsleV5Candidate(state, WIZ_A, {
      expected: null,
      value: ISL_1,
    });

    const wiz = result.nextState.wizards.find((w) => w.wizardId === WIZ_A)!;
    expect(wiz.homeIsleId).toBe(ISL_1);
    expect(wiz.sanctumPlaceId).toBe(PLC_1);
    expect(wiz.name).toBe("Wizard A");
    expect(wiz.character).toEqual(BLANK_WIZARD_CHARACTER_V5);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("wizard_home_isle_changed");
  });
});

// =========================================================================
// 2. Sanctum change: both old and new Place records preserved
// =========================================================================

describe("applySetWizardSanctumV5Candidate", () => {
  it("changes sanctum and preserves both Place records", () => {
    const state = baseV5(
      [blankV5Wizard({ sanctumPlaceId: PLC_1 })],
      {
        places: [
          { placeId: PLC_1, name: "Tower", description: "Old sanctum", placement: { kind: "unspecified" } },
          { placeId: PLC_2, name: "Cave", description: "New sanctum", placement: { kind: "unspecified" } },
        ],
      },
    );

    const result = applySetWizardSanctumV5Candidate(state, WIZ_A, {
      expected: PLC_1,
      value: PLC_2,
    });

    const wiz = result.nextState.wizards.find((w) => w.wizardId === WIZ_A)!;
    expect(wiz.sanctumPlaceId).toBe(PLC_2);

    expect(result.nextState.world.places).toHaveLength(2);
    expect(result.nextState.world.places.find((p) => p.placeId === PLC_1)).toBeDefined();
    expect(result.nextState.world.places.find((p) => p.placeId === PLC_2)).toBeDefined();

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("wizard_sanctum_changed");
  });
});

// =========================================================================
// 3. Association failures: stale precondition & nonexistent target
// =========================================================================

describe("home/sanctum association failures", () => {
  const cases = [
    {
      label: "stale home isle precondition",
      act: () => {
        const state = baseV5(
          [blankV5Wizard({ homeIsleId: ISL_1 })],
          { isles: [{ isleId: ISL_1, name: "Atoll", description: null }] },
        );
        return applySetWizardHomeIsleV5Candidate(state, WIZ_A, {
          expected: null,
          value: ISL_1,
        });
      },
      code: "STALE_COMMAND_PRECONDITION",
    },
    {
      label: "nonexistent home isle target",
      act: () => {
        const state = baseV5();
        return applySetWizardHomeIsleV5Candidate(state, WIZ_A, {
          expected: null,
          value: ISL_1,
        });
      },
      code: "INVALID_CAMPAIGN_STATE",
    },
    {
      label: "stale sanctum precondition",
      act: () => {
        const state = baseV5(
          [blankV5Wizard({ sanctumPlaceId: PLC_1 })],
          { places: [{ placeId: PLC_1, name: "Tower", description: null, placement: { kind: "unspecified" } }] },
        );
        return applySetWizardSanctumV5Candidate(state, WIZ_A, {
          expected: null,
          value: PLC_1,
        });
      },
      code: "STALE_COMMAND_PRECONDITION",
    },
    {
      label: "nonexistent sanctum target",
      act: () => {
        const state = baseV5();
        return applySetWizardSanctumV5Candidate(state, WIZ_A, {
          expected: null,
          value: PLC_1,
        });
      },
      code: "INVALID_CAMPAIGN_STATE",
    },
    {
      label: "no-op home isle (same value)",
      act: () => {
        const state = baseV5(
          [blankV5Wizard({ homeIsleId: ISL_1 })],
          { isles: [{ isleId: ISL_1, name: "Atoll", description: null }] },
        );
        return applySetWizardHomeIsleV5Candidate(state, WIZ_A, {
          expected: ISL_1,
          value: ISL_1,
        });
      },
      code: "INVALID_CAMPAIGN_STATE",
    },
  ] as const;

  for (const { label, act, code } of cases) {
    it(label, () => {
      try {
        act();
        expect.unreachable("should have thrown");
      } catch (e: any) {
        expect(e).toBeInstanceOf(DomainError);
        expect(e.code).toBe(code);
      }
    });
  }
});

// =========================================================================
// 4. Assign Companion into empty slot
// =========================================================================

describe("applySetWizardCompanionV5Candidate — assign into empty", () => {
  it("creates a current relationship and emits correct event", () => {
    const state = baseV5(undefined, {
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
    });

    const result = applySetWizardCompanionV5Candidate(state, {
      wizardId: WIZ_A,
      element: "water",
      expectedCurrentRelationshipId: null,
      newRelationship: {
        companionRelationshipId: CMPREL_1,
        denizenId: DEN_1,
        description: "  A loyal friend  ",
      },
    });

    const rels = result.nextState.world.companionRelationships;
    expect(rels).toHaveLength(1);
    expect(rels[0].companionRelationshipId).toBe(CMPREL_1);
    expect(rels[0].wizardId).toBe(WIZ_A);
    expect(rels[0].element).toBe("water");
    expect(rels[0].denizenId).toBe(DEN_1);
    expect(rels[0].status).toBe("current");
    expect(rels[0].description).toBe("A loyal friend");

    expect(result.events).toHaveLength(1);
    const evt = result.events[0];
    expect(evt.type).toBe("wizard_companion_changed");
    expect((evt.data as any).previousCurrentRelationship).toBeNull();
    expect((evt.data as any).newCurrentRelationship).toBeDefined();
    expect((evt.data as any).newCurrentRelationship.status).toBe("current");
  });
});

// =========================================================================
// 5. Replace Companion: old becomes ended, new is current, Denizen untouched
// =========================================================================

describe("applySetWizardCompanionV5Candidate — replace", () => {
  it("ends old relationship, creates new current, preserves Denizen records", () => {
    const state = baseV5(undefined, {
      denizens: [
        { denizenId: DEN_1, name: "Mara", representation: "individual", description: null },
        { denizenId: DEN_2, name: "Orin", representation: "individual", description: null },
      ],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "fire",
          denizenId: DEN_1,
          description: "Old companion",
          status: "current",
        },
      ],
    });

    const result = applySetWizardCompanionV5Candidate(state, {
      wizardId: WIZ_A,
      element: "fire",
      expectedCurrentRelationshipId: CMPREL_1,
      newRelationship: {
        companionRelationshipId: CMPREL_2,
        denizenId: DEN_2,
        description: null,
      },
    });

    const rels = result.nextState.world.companionRelationships;
    const old = rels.find((r) => r.companionRelationshipId === CMPREL_1)!;
    const fresh = rels.find((r) => r.companionRelationshipId === CMPREL_2)!;

    expect(old.status).toBe("ended");
    expect(old.denizenId).toBe(DEN_1);
    expect(old.description).toBe("Old companion");

    expect(fresh.status).toBe("current");
    expect(fresh.denizenId).toBe(DEN_2);

    // Denizens untouched
    expect(result.nextState.world.denizens).toHaveLength(2);
    expect(result.nextState.world.denizens.find((d) => d.denizenId === DEN_1)!.name).toBe("Mara");

    // Event
    const evt = result.events[0];
    expect(evt.type).toBe("wizard_companion_changed");
    expect((evt.data as any).previousCurrentRelationship!.status).toBe("current");
    expect((evt.data as any).newCurrentRelationship!.status).toBe("current");
  });
});

// =========================================================================
// 6. End Companion without replacement
// =========================================================================

describe("applySetWizardCompanionV5Candidate — end", () => {
  it("marks relationship ended, leaves no current for slot", () => {
    const state = baseV5(undefined, {
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "earth",
          denizenId: DEN_1,
          description: null,
          status: "current",
        },
      ],
    });

    const result = applySetWizardCompanionV5Candidate(state, {
      wizardId: WIZ_A,
      element: "earth",
      expectedCurrentRelationshipId: CMPREL_1,
      newRelationship: null,
    });

    const rels = result.nextState.world.companionRelationships;
    expect(rels).toHaveLength(1);
    expect(rels[0].status).toBe("ended");

    const currentForSlot = rels.filter(
      (r) => r.wizardId === WIZ_A && r.element === "earth" && r.status === "current",
    );
    expect(currentForSlot).toHaveLength(0);
  });
});

// =========================================================================
// 7. Stale slot precondition
// =========================================================================

describe("applySetWizardCompanionV5Candidate — stale precondition", () => {
  it("rejects wrong expectedCurrentRelationshipId and leaves state unchanged", () => {
    const state = baseV5(undefined, {
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "air",
          denizenId: DEN_1,
          description: null,
          status: "current",
        },
      ],
    });

    try {
      applySetWizardCompanionV5Candidate(state, {
        wizardId: WIZ_A,
        element: "air",
        expectedCurrentRelationshipId: null,
        newRelationship: {
          companionRelationshipId: CMPREL_2,
          denizenId: DEN_1,
          description: null,
        },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("STALE_COMMAND_PRECONDITION");
    }

    // State unchanged
    expect(state.world.companionRelationships[0].status).toBe("current");
  });
});

// =========================================================================
// 8. Same Denizen reused across different slots
// =========================================================================

describe("applySetWizardCompanionV5Candidate — Denizen reuse", () => {
  it("same Denizen may be Companion to different Wizards/Elements", () => {
    const state = baseV5(
      [blankV5Wizard(), blankV5Wizard({ wizardId: WIZ_B, name: "Wizard B" })],
      {
        denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
        companionRelationships: [
          {
            companionRelationshipId: CMPREL_1,
            wizardId: WIZ_A,
            element: "air",
            denizenId: DEN_1,
            description: null,
            status: "current",
          },
        ],
      },
    );

    // Same Denizen, different Wizard
    const result = applySetWizardCompanionV5Candidate(state, {
      wizardId: WIZ_B,
      element: "water",
      expectedCurrentRelationshipId: null,
      newRelationship: {
        companionRelationshipId: CMPREL_2,
        denizenId: DEN_1,
        description: null,
      },
    });

    const rels = result.nextState.world.companionRelationships;
    expect(rels.filter((r) => r.denizenId === DEN_1 && r.status === "current")).toHaveLength(2);

    // Only one Denizen record
    expect(result.nextState.world.denizens.filter((d) => d.denizenId === DEN_1)).toHaveLength(1);
  });
});

// =========================================================================
// 9. Description edit: normalizes, preserves identity fields
// =========================================================================

describe("applyUpdateCompanionDescriptionV5Candidate", () => {
  it("normalizes description and preserves all other relationship fields", () => {
    const state = baseV5(undefined, {
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "fire",
          denizenId: DEN_1,
          description: "Old desc",
          status: "current",
        },
      ],
    });

    const result = applyUpdateCompanionDescriptionV5Candidate(state, {
      companionRelationshipId: CMPREL_1,
      expectedStatus: "current",
      description: { expected: "Old desc", value: "  New desc  " },
    });

    const rel = result.nextState.world.companionRelationships.find(
      (r) => r.companionRelationshipId === CMPREL_1,
    )!;
    expect(rel.description).toBe("New desc");
    expect(rel.wizardId).toBe(WIZ_A);
    expect(rel.element).toBe("fire");
    expect(rel.denizenId).toBe(DEN_1);
    expect(rel.status).toBe("current");

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("companion_description_changed");
  });
});

// =========================================================================
// 10. Replacement-vs-description race: edit on old relationship after
//     replacement expecting "current" status fails stale
// =========================================================================

describe("description edit after replacement — stale status", () => {
  it("rejects edit expecting 'current' on a now-ended relationship", () => {
    let state = baseV5(undefined, {
      denizens: [
        { denizenId: DEN_1, name: "Mara", representation: "individual", description: null },
        { denizenId: DEN_2, name: "Orin", representation: "individual", description: null },
      ],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "water",
          denizenId: DEN_1,
          description: "Loyal",
          status: "current",
        },
      ],
    });

    // Replace companion
    const replaced = applySetWizardCompanionV5Candidate(state, {
      wizardId: WIZ_A,
      element: "water",
      expectedCurrentRelationshipId: CMPREL_1,
      newRelationship: {
        companionRelationshipId: CMPREL_2,
        denizenId: DEN_2,
        description: null,
      },
    });

    // Client A tries to edit the old relationship, still thinking it's current
    try {
      applyUpdateCompanionDescriptionV5Candidate(replaced.nextState, {
        companionRelationshipId: CMPREL_1,
        expectedStatus: "current",
        description: { expected: "Loyal", value: "Very loyal" },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("STALE_COMMAND_PRECONDITION");
    }
  });
});

// =========================================================================
// 11. Ended relationship description edit succeeds with correct expectation
// =========================================================================

describe("ended relationship description edit", () => {
  it("succeeds when expectedStatus is 'ended'", () => {
    let state = baseV5(undefined, {
      denizens: [
        { denizenId: DEN_1, name: "Mara", representation: "individual", description: null },
        { denizenId: DEN_2, name: "Orin", representation: "individual", description: null },
      ],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "water",
          denizenId: DEN_1,
          description: "Loyal",
          status: "current",
        },
      ],
    });

    // Replace companion first
    const replaced = applySetWizardCompanionV5Candidate(state, {
      wizardId: WIZ_A,
      element: "water",
      expectedCurrentRelationshipId: CMPREL_1,
      newRelationship: {
        companionRelationshipId: CMPREL_2,
        denizenId: DEN_2,
        description: null,
      },
    });

    // Now explicitly edit the ended relationship
    const result = applyUpdateCompanionDescriptionV5Candidate(replaced.nextState, {
      companionRelationshipId: CMPREL_1,
      expectedStatus: "ended",
      description: { expected: "Loyal", value: "Was loyal until the end" },
    });

    const rel = result.nextState.world.companionRelationships.find(
      (r) => r.companionRelationshipId === CMPREL_1,
    )!;
    expect(rel.description).toBe("Was loyal until the end");
    expect(rel.status).toBe("ended");
  });
});

// =========================================================================
// 12. Duplicate relationship ID / dangling Denizen rejection
// =========================================================================

describe("companion assignment rejections", () => {
  it("rejects duplicate relationship ID", () => {
    const state = baseV5(undefined, {
      denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
      companionRelationships: [
        {
          companionRelationshipId: CMPREL_1,
          wizardId: WIZ_A,
          element: "air",
          denizenId: DEN_1,
          description: null,
          status: "ended",
        },
      ],
    });

    try {
      applySetWizardCompanionV5Candidate(state, {
        wizardId: WIZ_A,
        element: "fire",
        expectedCurrentRelationshipId: null,
        newRelationship: {
          companionRelationshipId: CMPREL_1,
          denizenId: DEN_1,
          description: null,
        },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects dangling Denizen reference", () => {
    const state = baseV5();
    try {
      applySetWizardCompanionV5Candidate(state, {
        wizardId: WIZ_A,
        element: "fire",
        expectedCurrentRelationshipId: null,
        newRelationship: {
          companionRelationshipId: CMPREL_1,
          denizenId: DEN_1,
          description: null,
        },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});
