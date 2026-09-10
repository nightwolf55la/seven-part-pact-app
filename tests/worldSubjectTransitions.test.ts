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
  Denizen,
  Isle,
  WorldPlace,
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
  applyCreateDenizenV5Candidate,
  applyUpdateDenizenV5Candidate,
  applyCreateIsleV5Candidate,
  applyUpdateIsleV5Candidate,
  applyCreatePlaceV5Candidate,
  applyUpdatePlaceV5Candidate,
} from "../shared/domain/world-subject-transitions";
import type {
  ExpectedFieldChange,
  WorldSubjectTransitionResult,
} from "../shared/domain/world-subject-transitions";

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

function baseV5(): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [blankV5Wizard()],
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

function withDenizen(state: CampaignStateV5, d: Omit<Denizen, "mortalityState" | "powerfulProfile"> & Partial<Pick<Denizen, "mortalityState" | "powerfulProfile">>): CampaignStateV5 {
  const denizen: Denizen = {
    ...d,
    mortalityState: d.mortalityState ?? (d.representation === "individual" ? "not_deceased" : null),
    powerfulProfile: d.powerfulProfile ?? null,
  };
  return { ...state, world: { ...state.world, denizens: [...state.world.denizens, denizen] } };
}

function withIsle(state: CampaignStateV5, isle: Isle): CampaignStateV5 {
  return { ...state, world: { ...state.world, isles: [...state.world.isles, isle] } };
}

function withPlace(state: CampaignStateV5, place: WorldPlace): CampaignStateV5 {
  return { ...state, world: { ...state.world, places: [...state.world.places, place] } };
}

// =========================================================================
// 1. Create Denizen — normalization and event
// =========================================================================

describe("applyCreateDenizenV5Candidate", () => {
  it("trims name, normalizes blank description to null, emits created event", () => {
    const state = baseV5();
    const result = applyCreateDenizenV5Candidate(state, {
      denizenId: DEN_1,
      name: "  Mara  ",
      representation: "individual",
      description: "   ",
    });

    const created = result.nextState.world.denizens.find((d) => d.denizenId === DEN_1)!;
    expect(created.name).toBe("Mara");
    expect(created.description).toBeNull();
    expect(created.representation).toBe("individual");

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("denizen_created");
    expect(result.events[0].version).toBe(1);
    expect((result.events[0].data as any).denizen.name).toBe("Mara");
  });
});

// =========================================================================
// 2. Duplicate subject ID rejected (table-driven across all three types)
// =========================================================================

describe("duplicate subject ID rejection", () => {
  const cases = [
    {
      label: "Denizen",
      setup: (s: CampaignStateV5) =>
        withDenizen(s, { denizenId: DEN_1, name: "Existing", representation: "individual", description: null }),
      act: (s: CampaignStateV5) =>
        applyCreateDenizenV5Candidate(s, { denizenId: DEN_1, name: "New", representation: "individual", description: null }),
    },
    {
      label: "Isle",
      setup: (s: CampaignStateV5) =>
        withIsle(s, { isleId: ISL_1, name: "Existing Isle", description: null }),
      act: (s: CampaignStateV5) =>
        applyCreateIsleV5Candidate(s, { isleId: ISL_1, name: "New Isle", description: null }),
    },
    {
      label: "Place",
      setup: (s: CampaignStateV5) =>
        withPlace(s, { placeId: PLC_1, name: "Existing Place", description: null, placement: { kind: "unspecified" } }),
      act: (s: CampaignStateV5) =>
        applyCreatePlaceV5Candidate(s, { placeId: PLC_1, name: "New Place", description: null, placement: { kind: "unspecified" } }),
    },
  ] as const;

  for (const { label, setup, act } of cases) {
    it(`rejects duplicate ${label} ID`, () => {
      const state = setup(baseV5());
      try {
        act(state);
        expect.unreachable("should have thrown");
      } catch (e: any) {
        expect(e).toBeInstanceOf(DomainError);
        expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
      }
    });
  }
});

// =========================================================================
// 3. Denizen rename succeeds when name precondition matches, preserves
//    unrelated concurrent description change
// =========================================================================

describe("applyUpdateDenizenV5Candidate — rename with unrelated change", () => {
  it("succeeds and preserves current description", () => {
    const state = withDenizen(baseV5(), {
      denizenId: DEN_1,
      name: "Mara",
      representation: "individual",
      description: "New description written by another client",
    });

    const result = applyUpdateDenizenV5Candidate(state, DEN_1, {
      name: { expected: "Mara", value: "Mara of Ishana" },
    });

    const updated = result.nextState.world.denizens.find((d) => d.denizenId === DEN_1)!;
    expect(updated.name).toBe("Mara of Ishana");
    expect(updated.description).toBe("New description written by another client");
  });
});

// =========================================================================
// 4. Stale Denizen name precondition
// =========================================================================

describe("applyUpdateDenizenV5Candidate — stale precondition", () => {
  it("throws STALE_COMMAND_PRECONDITION and does not mutate state", () => {
    const state = withDenizen(baseV5(), {
      denizenId: DEN_1,
      name: "Mara the Red",
      representation: "individual",
      description: null,
    });

    try {
      applyUpdateDenizenV5Candidate(state, DEN_1, {
        name: { expected: "Mara", value: "Mara of Ishana" },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("STALE_COMMAND_PRECONDITION");
    }
    // Original state unmodified
    expect(state.world.denizens[0].name).toBe("Mara the Red");
  });
});

// =========================================================================
// 5. Multi-field Denizen update with normalization and event records
// =========================================================================

describe("applyUpdateDenizenV5Candidate — multi-field update", () => {
  it("normalizes values and emits previous/new in event", () => {
    const state = withDenizen(baseV5(), {
      denizenId: DEN_1,
      name: "Mara",
      representation: "individual",
      description: "Old desc",
    });

    const result = applyUpdateDenizenV5Candidate(state, DEN_1, {
      name: { expected: "Mara", value: "  Mara of Ishana  " },
      representation: { expected: "individual" as const, value: "collective" as const },
      description: { expected: "Old desc", value: "  New desc  " },
    });

    const updated = result.nextState.world.denizens.find((d) => d.denizenId === DEN_1)!;
    expect(updated.name).toBe("Mara of Ishana");
    expect(updated.representation).toBe("collective");
    expect(updated.description).toBe("New desc");

    expect(result.events).toHaveLength(1);
    const evt = result.events[0];
    expect(evt.type).toBe("denizen_updated");
    expect((evt.data as any).previous.name).toBe("Mara");
    expect((evt.data as any).updated.name).toBe("Mara of Ishana");
  });
});

// =========================================================================
// 6. No-field and normalized-no-op updates rejected
// =========================================================================

describe("no-op update rejection", () => {
  it("rejects an update with no fields supplied", () => {
    const state = withIsle(baseV5(), { isleId: ISL_1, name: "Atoll", description: null });
    expect(() => applyUpdateIsleV5Candidate(state, ISL_1, {})).toThrow(DomainError);
  });

  it("rejects when all supplied fields normalize to the same value", () => {
    const state = withIsle(baseV5(), { isleId: ISL_1, name: "Atoll", description: null });
    try {
      applyUpdateIsleV5Candidate(state, ISL_1, {
        name: { expected: "Atoll", value: "  Atoll  " },
      });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});

// =========================================================================
// 7. Place placement rejects nonexistent Isle reference
// =========================================================================

describe("Place placement Isle reference validation", () => {
  it("rejects on_isle placement referencing nonexistent Isle on create", () => {
    const state = baseV5();
    expect(() =>
      applyCreatePlaceV5Candidate(state, {
        placeId: PLC_1,
        name: "Tower",
        description: null,
        placement: { kind: "on_isle", isleId: ISL_1 },
      }),
    ).toThrow(DomainError);
  });

  it("rejects updated mobile placement referencing nonexistent Isle", () => {
    const isleState = withIsle(baseV5(), { isleId: ISL_1, name: "Atoll", description: null });
    const state = withPlace(isleState, {
      placeId: PLC_1,
      name: "Tower",
      description: null,
      placement: { kind: "on_isle", isleId: ISL_1 },
    });

    const FAKE_ISLE = "isl_00000000-0000-0000-0000-ffffffffffff" as IsleId;
    expect(() =>
      applyUpdatePlaceV5Candidate(state, PLC_1, {
        placement: {
          expected: { kind: "on_isle", isleId: ISL_1 },
          value: { kind: "mobile", associatedIsleId: FAKE_ISLE },
        },
      }),
    ).toThrow(DomainError);
  });
});

// =========================================================================
// 8. Valid placement change preserves unrelated Place fields
// =========================================================================

describe("Place placement change preserves other fields", () => {
  it("preserves name and description when only placement changes", () => {
    const isleState = withIsle(
      withIsle(baseV5(), { isleId: ISL_1, name: "Atoll", description: null }),
      { isleId: ISL_2, name: "Crag", description: null },
    );
    const state = withPlace(isleState, {
      placeId: PLC_1,
      name: "Tower",
      description: "A tall tower",
      placement: { kind: "on_isle", isleId: ISL_1 },
    });

    const result = applyUpdatePlaceV5Candidate(state, PLC_1, {
      placement: {
        expected: { kind: "on_isle", isleId: ISL_1 },
        value: { kind: "on_isle", isleId: ISL_2 },
      },
    });

    const updated = result.nextState.world.places.find((p) => p.placeId === PLC_1)!;
    expect(updated.name).toBe("Tower");
    expect(updated.description).toBe("A tall tower");
    expect(updated.placement).toEqual({ kind: "on_isle", isleId: ISL_2 });
  });
});

// =========================================================================
// 9. Identity-reference preservation: renaming subjects leaves ID refs
// =========================================================================

describe("identity-reference preservation", () => {
  it("renaming Denizen/Isle/Place leaves all ID-based references unchanged", () => {
    let state = baseV5();

    // Add Isle, Place (on that Isle), Denizen
    state = withIsle(state, { isleId: ISL_1, name: "Atoll", description: null });
    state = withPlace(state, {
      placeId: PLC_1,
      name: "Tower",
      description: null,
      placement: { kind: "on_isle", isleId: ISL_1 },
    });
    state = withDenizen(state, {
      denizenId: DEN_1,
      name: "Mara",
      representation: "individual",
      description: null,
    });

    // Set wizard refs: homeIsleId -> ISL_1, sanctumPlaceId -> PLC_1
    state = {
      ...state,
      wizards: [blankV5Wizard({ homeIsleId: ISL_1, sanctumPlaceId: PLC_1 })],
      world: {
        ...state.world,
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
    };

    // Rename all three
    const r1 = applyUpdateDenizenV5Candidate(state, DEN_1, {
      name: { expected: "Mara", value: "Mara Renamed" },
    });
    const r2 = applyUpdateIsleV5Candidate(r1.nextState, ISL_1, {
      name: { expected: "Atoll", value: "Atoll Renamed" },
    });
    const r3 = applyUpdatePlaceV5Candidate(r2.nextState, PLC_1, {
      name: { expected: "Tower", value: "Tower Renamed" },
    });

    const final = r3.nextState;

    // Companion relationship still references DEN_1 by ID
    expect(final.world.companionRelationships[0].denizenId).toBe(DEN_1);
    // Place placement still references ISL_1 by ID
    expect(final.world.places[0].placement).toEqual({ kind: "on_isle", isleId: ISL_1 });
    // Wizard still references ISL_1 and PLC_1 by ID
    expect(final.wizards[0].homeIsleId).toBe(ISL_1);
    expect(final.wizards[0].sanctumPlaceId).toBe(PLC_1);

    // But display names have changed
    expect(final.world.denizens[0].name).toBe("Mara Renamed");
    expect(final.world.isles[0].name).toBe("Atoll Renamed");
    expect(final.world.places[0].name).toBe("Tower Renamed");
  });
});

// =========================================================================
// 10. Length-bound failure for name / description
// =========================================================================

describe("length-bound validation", () => {
  it("rejects a name longer than 200 characters", () => {
    expect(() =>
      applyCreateDenizenV5Candidate(baseV5(), {
        denizenId: DEN_1,
        name: "A".repeat(201),
        representation: "individual",
        description: null,
      }),
    ).toThrow(DomainError);
  });

  it("rejects a description longer than 8000 characters", () => {
    expect(() =>
      applyCreateIsleV5Candidate(baseV5(), {
        isleId: ISL_1,
        name: "Good Name",
        description: "A".repeat(8001),
      }),
    ).toThrow(DomainError);
  });
});
