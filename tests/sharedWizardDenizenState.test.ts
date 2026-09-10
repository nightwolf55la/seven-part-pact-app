import { describe, it, expect } from "vitest";
import type {
  CampaignPowerfulDenizenTaxonomyId,
  CampaignStateV5,
  DenizenId,
  IsleId,
  PlaceId,
  PlayerId,
  PowerfulDenizenMethodEntryId,
  PowerfulDenizenProfile,
  PowerfulDenizenTruthId,
  TreasureId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_FAUSTIAN_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SAGE_STATE,
  EMPTY_SHARED_WORLD_STATE,
  PACT_SEAT_IDS,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyCreateDenizenV5Candidate,
  applyCreateWizard,
  applySetPactSeatWizard,
  initialCampaignState,
  initializePactFragmentOperationalState,
  validateCampaignState,
  validateCampaignStateV5Candidate,
} from "../shared/domain";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const ISL_1 = "isl_00000000-0000-0000-0000-000000000001" as IsleId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const TRS_1 = "trs_00000000-0000-0000-0000-000000000001" as TreasureId;
const TRS_2 = "trs_00000000-0000-0000-0000-000000000002" as TreasureId;
const TAX_1 = "pdtax_00000000-0000-0000-0000-000000000001" as CampaignPowerfulDenizenTaxonomyId;
const MTH_1 = "pdmth_00000000-0000-0000-0000-000000000001" as PowerfulDenizenMethodEntryId;
const MTH_2 = "pdmth_00000000-0000-0000-0000-000000000002" as PowerfulDenizenMethodEntryId;
const TRU_1 = "pdtru_00000000-0000-0000-0000-000000000001" as PowerfulDenizenTruthId;
const TRU_2 = "pdtru_00000000-0000-0000-0000-000000000002" as PowerfulDenizenTruthId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function wizard(wizardId: WizardId, name = "Wizard A") {
  return {
    wizardId,
    name,
    portrayedByPlayerId: PLR_A,
    character: { ...BLANK_WIZARD_CHARACTER_V5 },
    homeIsleId: null,
    sanctumPlaceId: null,
    mortalityState: "not_deceased" as const,
  };
}

function powerfulProfile(overrides?: Partial<PowerfulDenizenProfile>): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
    status: { kind: "standard", value: "reliable" },
    goal: "Bind the restless dead",
    methods: [],
    truths: [],
    ...overrides,
  };
}

function baseState(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as CampaignStateV5["calendar"]["monthOrdinal"] },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A)],
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
    ...overrides,
  };
}

function expectInvalid(state: unknown, pattern: RegExp): void {
  expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  try {
    validateCampaignStateV5Candidate(state);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as Error).message).toMatch(pattern);
  }
}

describe("M5.2D D1A shared wizard and denizen state", () => {
  it("initializes wizards with not_deceased", () => {
    let state = initialCampaignState();
    state = applyCreateWizard(state, WIZ_A, "Thalion", null, "necromancer").nextState;
    expect(state.wizards[0].mortalityState).toBe("not_deceased");
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("validates wizard mortality values and rejects unknown values", () => {
    const valid = baseState({
      wizards: [{ ...wizard(WIZ_A), mortalityState: "deceased" }],
    });
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();

    expectInvalid(
      { ...baseState(), wizards: [{ ...wizard(WIZ_A), mortalityState: "undead" }] },
      /mortalityState/,
    );
  });

  it("requires individual denizen mortality and initializes not_deceased", () => {
    const created = applyCreateDenizenV5Candidate(baseState(), {
      denizenId: DEN_1,
      name: "Mara",
      representation: "individual",
      description: null,
    }).nextState;
    expect(created.world.denizens[0].mortalityState).toBe("not_deceased");
    expect(created.world.denizens[0].powerfulProfile).toBeNull();
    expect(() => validateCampaignStateV5Candidate(created)).not.toThrow();

    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "Mara",
            representation: "individual",
            description: null,
            mortalityState: null,
            powerfulProfile: null,
          }],
        },
      },
      /mortalityState is required for individual/,
    );
  });

  it("requires collective denizen mortality to be null", () => {
    const created = applyCreateDenizenV5Candidate(baseState(), {
      denizenId: DEN_1,
      name: "The Host",
      representation: "collective",
      description: null,
    }).nextState;
    expect(created.world.denizens[0].mortalityState).toBeNull();
    expect(() => validateCampaignStateV5Candidate(created)).not.toThrow();

    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "The Host",
            representation: "collective",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: null,
          }],
        },
      },
      /must be null for collective/,
    );
  });

  it("supports multiple unique taxonomy refs on a powerful profile", () => {
    const state = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        campaignPowerfulDenizenTaxonomies: [{ taxonomyId: TAX_1, name: "Isle Spirit", description: null }],
        denizens: [{
          denizenId: DEN_1,
          name: "Ash-Caller",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile({
            taxonomies: [
              { kind: "builtin", taxonomyId: "ghoul_caller" },
              { kind: "builtin", taxonomyId: "prophet" },
              { kind: "campaign", taxonomyId: TAX_1 },
            ],
          }),
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();

    expectInvalid(
      {
        ...state,
        world: {
          ...state.world,
          denizens: [{
            ...state.world.denizens[0],
            powerfulProfile: powerfulProfile({
              taxonomies: [
                { kind: "builtin", taxonomyId: "cult" },
                { kind: "builtin", taxonomyId: "cult" },
              ],
            }),
          }],
        },
      },
      /duplicate taxonomy ref/,
    );
  });

  it("fails closed on an unknown builtin taxonomy", () => {
    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "Mara",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: powerfulProfile({
              taxonomies: [{ kind: "builtin", taxonomyId: "lich" as "beast" }],
            }),
          }],
        },
      },
      /not a known builtin taxonomy/,
    );
  });

  it("fails closed on an unknown campaign taxonomy ref", () => {
    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "Mara",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: powerfulProfile({
              taxonomies: [{ kind: "campaign", taxonomyId: TAX_1 }],
            }),
          }],
        },
      },
      /nonexistent campaign taxonomy/,
    );
  });

  it("requires at least one taxonomy on a powerful profile", () => {
    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).toEqual([
      "ghoul_caller",
      "prophet",
      "cult",
      "beast",
      "foe_of_death",
      "conspiracy",
      "occultist",
      "demon",
      "fairy",
      "druid",
      "angel",
    ]);
    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "Mara",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: powerfulProfile({ taxonomies: [] }),
          }],
        },
      },
      /at least one taxonomy/,
    );
  });

  it("validates standard and custom powerful-denizen status", () => {
    const standard = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "Mara",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile({ status: { kind: "standard", value: "malignant" } }),
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(standard)).not.toThrow();

    const custom = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "Mara",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile({ status: { kind: "other", label: "Wary ally" } }),
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(custom)).not.toThrow();

    expectInvalid(
      {
        ...custom,
        world: {
          ...custom.world,
          denizens: [{
            ...custom.world.denizens[0],
            powerfulProfile: powerfulProfile({ status: { kind: "other", label: "" } }),
          }],
        },
      },
      /label must be a non-empty string/,
    );
  });

  it("allows a null powerful-denizen goal", () => {
    const state = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "Mara",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile({ goal: null }),
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("requires stable unique method entry IDs", () => {
    const state = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "Mara",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile({
            methods: [
              { methodEntryId: MTH_1, definition: { kind: "standard", method: "conjuring" }, origin: "source" },
              { methodEntryId: MTH_2, definition: { kind: "named", name: "Tithe-taking", description: null }, origin: "campaign" },
            ],
          }),
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();

    expectInvalid(
      {
        ...state,
        world: {
          ...state.world,
          denizens: [{
            ...state.world.denizens[0],
            powerfulProfile: powerfulProfile({
              methods: [
                { methodEntryId: MTH_1, definition: { kind: "standard", method: "rampaging" }, origin: "source" },
                { methodEntryId: MTH_1, definition: { kind: "standard", method: "occupying" }, origin: "campaign" },
              ],
            }),
          }],
        },
      },
      /Duplicate powerful denizen methodEntryId/,
    );
  });

  it("requires stable unique truth entry IDs", () => {
    const state = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "Mara",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile({
            truths: [
              { truthId: TRU_1, text: "She never crosses running water.", origin: "source" },
              { truthId: TRU_2, text: "The isle remembers her true name.", origin: "campaign" },
            ],
          }),
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();

    expectInvalid(
      {
        ...state,
        world: {
          ...state.world,
          denizens: [
            state.world.denizens[0],
            {
              denizenId: DEN_2,
              name: "Orin",
              representation: "individual",
              description: null,
              mortalityState: "not_deceased",
              powerfulProfile: powerfulProfile({
                truths: [{ truthId: TRU_1, text: "A copied identity.", origin: "campaign" }],
              }),
            },
          ],
        },
      },
      /Duplicate powerful denizen truthId/,
    );
  });

  it("validates treasure subject custody for wizard and denizen references", () => {
    const valid = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "Mara",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: null,
        }],
        treasures: [
          {
            treasureId: TRS_1,
            name: "Ash Key",
            description: null,
            condition: "intact",
            custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } },
          },
          {
            treasureId: TRS_2,
            name: "Bone Cup",
            description: null,
            condition: "intact",
            custody: { kind: "subject", subject: { kind: "denizen", denizenId: DEN_1 } },
          },
        ],
      },
    });
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();

    expectInvalid(
      {
        ...valid,
        world: {
          ...valid.world,
          treasures: [{
            treasureId: TRS_1,
            name: "Ash Key",
            description: null,
            condition: "intact",
            custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_B } },
          }],
        },
      },
      /nonexistent wizard/,
    );
  });

  it("validates treasure place custody against PlaceId", () => {
    const valid = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        isles: [{ isleId: ISL_1, name: "Starfall", description: null }],
        places: [{ placeId: PLC_1, name: "The Sanctum", description: null, placement: { kind: "on_isle", isleId: ISL_1 } }],
        treasures: [{
          treasureId: TRS_1,
          name: "Ash Key",
          description: null,
          condition: "intact",
          custody: { kind: "place", placeId: PLC_1 },
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();

    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          treasures: [{
            treasureId: TRS_1,
            name: "Ash Key",
            description: null,
            condition: "intact",
            custody: { kind: "place", placeId: PLC_1 },
          }],
        },
      },
      /nonexistent place/,
    );
  });

  it("accepts intact treasure in Devil custody", () => {
    const valid = baseState({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        treasures: [{
          treasureId: TRS_1,
          name: "Devil Chalice",
          description: null,
          condition: "intact",
          custody: { kind: "devil" },
        }],
      },
    });
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();
  });

  it("rejects destroyed treasure with non-none custody", () => {
    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          treasures: [{
            treasureId: TRS_1,
            name: "Ash Key",
            description: null,
            condition: "destroyed",
            custody: { kind: "unlocated" },
          }],
        },
      },
      /must be none when the treasure is destroyed/,
    );
  });

  it("requires unique treasure IDs", () => {
    expectInvalid(
      {
        ...baseState(),
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          treasures: [
            { treasureId: TRS_1, name: "Ash Key", description: null, condition: "intact", custody: { kind: "none" } },
            { treasureId: TRS_1, name: "Bone Cup", description: null, condition: "intact", custody: { kind: "none" } },
          ],
        },
      },
      /Duplicate treasureId/,
    );
  });

  it("requires a complete pact-fragment map for all seven seats", () => {
    const state = initialCampaignState();
    expect(Object.keys(state.pactFragmentOperationalState)).toEqual([...PACT_SEAT_IDS]);
    expect(() => validateCampaignState(state)).not.toThrow();

    const incomplete = { ...EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE };
    delete (incomplete as { necromancer?: unknown }).necromancer;
    expectInvalid({ ...baseState(), pactFragmentOperationalState: incomplete }, /exactly 7 entries|Missing pact fragment/);
  });

  it("gives occupied-seat initialization intact custody to that wizard", () => {
    const pactSeats = {
      ...EMPTY_PACT_SEATS,
      necromancer: { status: "present" as const, wizardId: WIZ_A, watcherPlayerId: null },
    };
    const fragments = initializePactFragmentOperationalState(pactSeats);
    expect(fragments.necromancer).toEqual({
      condition: "intact",
      custody: { kind: "wizard", wizardId: WIZ_A },
    });
    for (const seatId of PACT_SEAT_IDS) {
      if (seatId === "necromancer") continue;
      expect(fragments[seatId]).toEqual({ condition: "intact", custody: { kind: "none" } });
    }
    expect(() => validateCampaignStateV5Candidate(baseState({ pactSeats, pactFragmentOperationalState: fragments }))).not.toThrow();
  });

  it("gives absent/unoccupied-seat initialization intact custody none", () => {
    const fragments = initializePactFragmentOperationalState(EMPTY_PACT_SEATS);
    expect(fragments).toEqual(EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE);
    for (const seatId of PACT_SEAT_IDS) {
      expect(fragments[seatId]).toEqual({ condition: "intact", custody: { kind: "none" } });
    }
  });

  it("rejects invalid fragment wizard custody", () => {
    expectInvalid(
      {
        ...baseState(),
        pactFragmentOperationalState: {
          ...EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
          necromancer: { condition: "intact", custody: { kind: "wizard", wizardId: WIZ_B } },
        },
      },
      /nonexistent wizard/,
    );
  });

  it("rejects destroyed fragment with any non-none custody", () => {
    expectInvalid(
      {
        ...baseState(),
        pactFragmentOperationalState: {
          ...EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
          necromancer: { condition: "destroyed", custody: { kind: "unlocated" } },
        },
      },
      /must be none when the fragment is destroyed/,
    );
    expectInvalid(
      {
        ...baseState(),
        pactFragmentOperationalState: {
          ...EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
          necromancer: { condition: "destroyed", custody: { kind: "wizard", wizardId: WIZ_A } },
        },
      },
      /must be none when the fragment is destroyed/,
    );
  });

  it("does not derive fragment custody from pact-seat assignment", () => {
    const occupiedSeats = {
      ...EMPTY_PACT_SEATS,
      necromancer: { status: "present" as const, wizardId: WIZ_A, watcherPlayerId: null },
    };
    const independent = baseState({
      pactSeats: occupiedSeats,
      pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    });
    expect(independent.pactSeats.necromancer.wizardId).toBe(WIZ_A);
    expect(independent.pactFragmentOperationalState.necromancer.custody).toEqual({ kind: "none" });
    expect(() => validateCampaignStateV5Candidate(independent)).not.toThrow();

    const created = applyCreateWizard(initialCampaignState(), WIZ_A, "Thalion", null, "necromancer").nextState;
    expect(created.pactSeats.necromancer.wizardId).toBe(WIZ_A);
    expect(created.pactFragmentOperationalState.necromancer.custody).toEqual({ kind: "none" });

    const unassigned = applySetPactSeatWizard(created, "necromancer", null).nextState;
    expect(unassigned.pactSeats.necromancer.wizardId).toBeNull();
    expect(unassigned.pactFragmentOperationalState).toEqual(created.pactFragmentOperationalState);

    const reassigned = applySetPactSeatWizard(unassigned, "hierophant", WIZ_A).nextState;
    expect(reassigned.pactSeats.hierophant.wizardId).toBe(WIZ_A);
    expect(reassigned.pactFragmentOperationalState).toEqual(created.pactFragmentOperationalState);
    expect(reassigned.pactFragmentOperationalState.hierophant.custody).toEqual({ kind: "none" });
  });

  it("rejects the pre-M5.2D V5 shape instead of silently defaulting", () => {
    const preM52d = {
      schemaVersion: 5,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
      configuration: { ageId: null, facilitatorPlayerId: null },
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [{
        wizardId: WIZ_A,
        name: "Wizard A",
        portrayedByPlayerId: PLR_A,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: null,
        sanctumPlaceId: null,
      }],
      pactSeats: EMPTY_PACT_SEATS,
      lifecycle: {
        kind: "setup",
        orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
      },
      wizardmootHistory: [],
      world: {
        denizens: [],
        isles: [],
        places: [],
        companionRelationships: [],
      },
      hierophant: { ...EMPTY_HIEROPHANT_STATE },
      mariner: { ...EMPTY_MARINER_STATE },
      necromancer: { ...EMPTY_NECROMANCER_STATE },
    faustian: { ...EMPTY_FAUSTIAN_STATE },
    sage: { ...EMPTY_SAGE_STATE },
    };

    expect(() => validateCampaignState(preM52d)).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(preM52d)).toThrow(DomainError);
    expect(() => validateCampaignState(preM52d)).toThrow(/mortalityState|pactFragmentOperationalState|campaignPowerfulDenizenTaxonomies|treasures/);
  });
});
