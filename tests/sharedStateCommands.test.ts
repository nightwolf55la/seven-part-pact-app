import { describe, it, expect } from "vitest";
import type {
  CampaignPowerfulDenizenTaxonomyId,
  CampaignStateV5,
  DenizenId,
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
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SHARED_WORLD_STATE,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyAddPowerfulDenizenMethod,
  applyAddPowerfulDenizenTruth,
  applyCreateCampaignPowerfulDenizenTaxonomy,
  applyCreatePowerfulDenizenProfile,
  applyCreateTreasure,
  applyCreateWizard,
  applyRemoveCampaignPowerfulDenizenTaxonomy,
  applyRemovePowerfulDenizenMethod,
  applyRemovePowerfulDenizenProfile,
  applyRemovePowerfulDenizenTruth,
  applySetDenizenMortalityState,
  applySetPactSeatWizard,
  applySetPowerfulDenizenGoal,
  applySetPowerfulDenizenStatus,
  applySetPowerfulDenizenTaxonomies,
  applySetWizardMortalityState,
  applyUpdateCampaignPowerfulDenizenTaxonomy,
  applyUpdatePactFragmentOperationalState,
  applyUpdatePowerfulDenizenMethod,
  applyUpdatePowerfulDenizenTruth,
  applyUpdateTreasureDetails,
  applyUpdateTreasureState,
  applyCreateDenizenV5Candidate,
  createTreasureFingerprint,
  setWizardMortalityStateFingerprint,
  updatePactFragmentOperationalStateFingerprint,
  validateCampaignState,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput, CanonicalCommitReceipt } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type OrdinaryLogicalCommandIo,
  type CanonicalCampaign,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const COMMAND_2 = "cmd_00000000-0000-0000-0000-000000000002";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const TRS_1 = "trs_00000000-0000-0000-0000-000000000001" as TreasureId;
const TAX_1 = "pdtax_00000000-0000-0000-0000-000000000001" as CampaignPowerfulDenizenTaxonomyId;
const MTH_1 = "pdmth_00000000-0000-0000-0000-000000000001" as PowerfulDenizenMethodEntryId;
const TRU_1 = "pdtru_00000000-0000-0000-0000-000000000001" as PowerfulDenizenTruthId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function expectDomain(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error(`Expected DomainError(${code})`);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

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
    world: {
      ...EMPTY_SHARED_WORLD_STATE,
      places: [{ placeId: PLC_1, name: "Ash Tower", description: null, placement: { kind: "unspecified" } }],
    },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
    ...overrides,
  };
}

function withDenizen(representation: "individual" | "collective" = "individual"): CampaignStateV5 {
  return applyCreateDenizenV5Candidate(baseState(), {
    denizenId: DEN_1,
    name: "Mara",
    representation,
    description: null,
  }).nextState;
}

function profile(overrides?: Partial<PowerfulDenizenProfile>): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
    status: { kind: "standard", value: "reliable" },
    goal: "Bind the restless dead",
    methods: [],
    truths: [],
    ...overrides,
  };
}

describe("M5.2D D1B wizard mortality", () => {
  it("changes not_deceased to deceased and back without mutating seat or fragment", () => {
    const seated = applyCreateWizard(baseState({ wizards: [] }), WIZ_A, "Thalion", null, "necromancer").nextState;
    const deceased = applySetWizardMortalityState(seated, WIZ_A, {
      expected: "not_deceased",
      value: "deceased",
    });
    expect(deceased.nextState.wizards[0].mortalityState).toBe("deceased");
    expect(deceased.nextState.pactSeats).toEqual(seated.pactSeats);
    expect(deceased.nextState.pactFragmentOperationalState).toEqual(seated.pactFragmentOperationalState);
    expect(deceased.events[0].type).toBe("wizard_mortality_state_changed");

    const restored = applySetWizardMortalityState(deceased.nextState, WIZ_A, {
      expected: "deceased",
      value: "not_deceased",
    });
    expect(restored.nextState.wizards[0].mortalityState).toBe("not_deceased");
    expect(restored.nextState.pactSeats).toEqual(seated.pactSeats);
  });

  it("rejects stale expected mortality and unknown wizards", () => {
    expectDomain(
      () => applySetWizardMortalityState(baseState(), WIZ_A, { expected: "deceased", value: "not_deceased" }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectDomain(
      () => applySetWizardMortalityState(baseState({ wizards: [] }), WIZ_A, { expected: "not_deceased", value: "deceased" }),
      "INVALID_CAMPAIGN_STATE",
    );
  });
});

describe("M5.2D D1B denizen mortality", () => {
  it("changes individual mortality and retains DenizenId", () => {
    const created = withDenizen("individual");
    const next = applySetDenizenMortalityState(created, DEN_1, {
      expected: "not_deceased",
      value: "deceased",
    });
    expect(next.nextState.world.denizens[0].denizenId).toBe(DEN_1);
    expect(next.nextState.world.denizens[0].mortalityState).toBe("deceased");
    expect(next.nextState.world.denizens[0].name).toBe("Mara");
  });

  it("rejects collective mortality mutation", () => {
    const collective = withDenizen("collective");
    expectDomain(
      () => applySetDenizenMortalityState(collective, DEN_1, { expected: "not_deceased", value: "deceased" }),
      "INVALID_CAMPAIGN_STATE",
    );
  });
});

describe("M5.2D D1B powerful profile", () => {
  it("creates a valid profile and rejects zero taxonomies", () => {
    const created = applyCreatePowerfulDenizenProfile(withDenizen(), {
      denizenId: DEN_1,
      taxonomies: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
      status: { kind: "standard", value: "reliable" },
      goal: "Seek the gate",
    });
    expect(created.nextState.world.denizens[0].powerfulProfile?.taxonomies).toEqual([
      { kind: "builtin", taxonomyId: "ghoul_caller" },
    ]);
    expectDomain(
      () => applyCreatePowerfulDenizenProfile(withDenizen(), {
        denizenId: DEN_1,
        taxonomies: [],
        status: { kind: "standard", value: "reliable" },
        goal: null,
      }),
      "INVALID_CAMPAIGN_STATE",
    );
  });

  it("removes a profile, validates taxonomy refs/duplicates, and updates status/goal", () => {
    let state = applyCreatePowerfulDenizenProfile(withDenizen(), {
      denizenId: DEN_1,
      taxonomies: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
      status: { kind: "standard", value: "reliable" },
      goal: "Seek the gate",
    }).nextState;
    state = applySetPowerfulDenizenTaxonomies(state, DEN_1, {
      expected: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
      value: [{ kind: "builtin", taxonomyId: "beast" }, { kind: "builtin", taxonomyId: "cult" }],
    }).nextState;
    expect(state.world.denizens[0].powerfulProfile?.taxonomies).toHaveLength(2);
    expectDomain(
      () => applySetPowerfulDenizenTaxonomies(state, DEN_1, {
        expected: state.world.denizens[0].powerfulProfile!.taxonomies,
        value: [{ kind: "builtin", taxonomyId: "beast" }, { kind: "builtin", taxonomyId: "beast" }],
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectDomain(
      () => applySetPowerfulDenizenTaxonomies(state, DEN_1, {
        expected: state.world.denizens[0].powerfulProfile!.taxonomies,
        value: [{ kind: "campaign", taxonomyId: TAX_1 }],
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    state = applySetPowerfulDenizenStatus(state, DEN_1, {
      expected: { kind: "standard", value: "reliable" },
      value: { kind: "other", label: "Oathbound" },
    }).nextState;
    state = applySetPowerfulDenizenGoal(state, DEN_1, { expected: "Seek the gate", value: null }).nextState;
    expect(state.world.denizens[0].powerfulProfile?.goal).toBeNull();
    const removed = applyRemovePowerfulDenizenProfile(state, DEN_1, state.world.denizens[0].powerfulProfile!);
    expect(removed.nextState.world.denizens[0].powerfulProfile).toBeNull();
  });

  it("adds, edits, and removes methods and truths with stable IDs", () => {
    let state = applyCreatePowerfulDenizenProfile(withDenizen(), {
      denizenId: DEN_1,
      taxonomies: [{ kind: "builtin", taxonomyId: "prophet" }],
      status: { kind: "standard", value: "companion" },
      goal: null,
    }).nextState;
    state = applyAddPowerfulDenizenMethod(state, {
      denizenId: DEN_1,
      methodEntryId: MTH_1,
      definition: { kind: "named", name: "Whispering", description: "Soft lies" },
    }).nextState;
    const afterEdit = applyUpdatePowerfulDenizenMethod(state, DEN_1, MTH_1, {
      expected: { kind: "named", name: "Whispering", description: "Soft lies" },
      value: { kind: "named", name: "Whispering", description: "Louder lies" },
    });
    expect(afterEdit.nextState.world.denizens[0].powerfulProfile?.methods[0].methodEntryId).toBe(MTH_1);
    state = applyAddPowerfulDenizenTruth(afterEdit.nextState, {
      denizenId: DEN_1,
      truthId: TRU_1,
      text: "The moon remembers",
    }).nextState;
    const truthEdited = applyUpdatePowerfulDenizenTruth(state, DEN_1, TRU_1, {
      expected: "The moon remembers",
      value: "The moon forgets",
    });
    expect(truthEdited.nextState.world.denizens[0].powerfulProfile?.truths[0].truthId).toBe(TRU_1);
    state = applyRemovePowerfulDenizenMethod(
      truthEdited.nextState,
      DEN_1,
      MTH_1,
      truthEdited.nextState.world.denizens[0].powerfulProfile!.methods[0],
    ).nextState;
    state = applyRemovePowerfulDenizenTruth(
      state,
      DEN_1,
      TRU_1,
      state.world.denizens[0].powerfulProfile!.truths[0],
    ).nextState;
    expect(state.world.denizens[0].powerfulProfile?.methods).toEqual([]);
    expect(state.world.denizens[0].powerfulProfile?.truths).toEqual([]);
  });

  it("rejects stale profile edits", () => {
    const state = applyCreatePowerfulDenizenProfile(withDenizen(), {
      denizenId: DEN_1,
      taxonomies: [{ kind: "builtin", taxonomyId: "cult" }],
      status: { kind: "standard", value: "malignant" },
      goal: "Rise",
    }).nextState;
    expectDomain(
      () => applySetPowerfulDenizenGoal(state, DEN_1, { expected: "Wrong", value: "New" }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectDomain(
      () => applyRemovePowerfulDenizenProfile(state, DEN_1, profile({ goal: "Wrong" })),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("M5.2D D1B campaign taxonomies", () => {
  it("creates and edits while retaining ID, and rejects referenced removal", () => {
    let state = applyCreateCampaignPowerfulDenizenTaxonomy(baseState(), {
      taxonomyId: TAX_1,
      name: "Tide-Kin",
      description: null,
    }).nextState;
    state = applyUpdateCampaignPowerfulDenizenTaxonomy(state, TAX_1, {
      name: { expected: "Tide-Kin", value: "Tide Kin" },
    }).nextState;
    expect(state.world.campaignPowerfulDenizenTaxonomies[0].taxonomyId).toBe(TAX_1);
    expect(state.world.campaignPowerfulDenizenTaxonomies[0].name).toBe("Tide Kin");

    const withProfile = applyCreatePowerfulDenizenProfile(applyCreateDenizenV5Candidate(state, {
      denizenId: DEN_1,
      name: "Mara",
      representation: "individual",
      description: null,
    }).nextState, {
      denizenId: DEN_1,
      taxonomies: [{ kind: "campaign", taxonomyId: TAX_1 }],
      status: { kind: "standard", value: "reliable" },
      goal: null,
    }).nextState;
    expectDomain(
      () => applyRemoveCampaignPowerfulDenizenTaxonomy(
        withProfile,
        TAX_1,
        withProfile.world.campaignPowerfulDenizenTaxonomies[0],
      ),
      "INVALID_CAMPAIGN_STATE",
    );

    const unreferenced = applyRemoveCampaignPowerfulDenizenTaxonomy(
      state,
      TAX_1,
      state.world.campaignPowerfulDenizenTaxonomies[0],
    );
    expect(unreferenced.nextState.world.campaignPowerfulDenizenTaxonomies).toEqual([]);
  });
});

describe("M5.2D D1B treasures", () => {
  it("creates and transfers Wizard -> Denizen -> Place, then unlocated, then destroys", () => {
    let state = withDenizen();
    state = applyCreateTreasure(state, {
      treasureId: TRS_1,
      name: "Black Chalice",
      description: "A cup of night",
      condition: "intact",
      custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } },
    }).nextState;
    state = applyUpdateTreasureState(
      state,
      TRS_1,
      { condition: "intact", custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } } },
      { condition: "intact", custody: { kind: "subject", subject: { kind: "denizen", denizenId: DEN_1 } } },
    ).nextState;
    state = applyUpdateTreasureState(
      state,
      TRS_1,
      { condition: "intact", custody: { kind: "subject", subject: { kind: "denizen", denizenId: DEN_1 } } },
      { condition: "intact", custody: { kind: "place", placeId: PLC_1 } },
    ).nextState;
    state = applyUpdateTreasureState(
      state,
      TRS_1,
      { condition: "intact", custody: { kind: "place", placeId: PLC_1 } },
      { condition: "intact", custody: { kind: "unlocated" } },
    ).nextState;
    const destroyed = applyUpdateTreasureState(
      state,
      TRS_1,
      { condition: "intact", custody: { kind: "unlocated" } },
      { condition: "destroyed", custody: { kind: "none" } },
    );
    expect(destroyed.nextState.world.treasures[0].treasureId).toBe(TRS_1);
    expect(destroyed.nextState.world.treasures[0].custody).toEqual({ kind: "none" });
  });

  it("rejects destroyed+held, bad refs, and stale state", () => {
    const state = applyCreateTreasure(withDenizen(), {
      treasureId: TRS_1,
      name: "Black Chalice",
      description: null,
      condition: "intact",
      custody: { kind: "unlocated" },
    }).nextState;
    expectDomain(
      () => applyUpdateTreasureState(
        state,
        TRS_1,
        { condition: "intact", custody: { kind: "unlocated" } },
        { condition: "destroyed", custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } } },
      ),
      "INVALID_CAMPAIGN_STATE",
    );
    expectDomain(
      () => applyUpdateTreasureState(
        state,
        TRS_1,
        { condition: "intact", custody: { kind: "unlocated" } },
        { condition: "intact", custody: { kind: "subject", subject: { kind: "denizen", denizenId: DEN_2 } } },
      ),
      "INVALID_CAMPAIGN_STATE",
    );
    expectDomain(
      () => applyUpdateTreasureState(
        state,
        TRS_1,
        { condition: "destroyed", custody: { kind: "none" } },
        { condition: "intact", custody: { kind: "none" } },
      ),
      "STALE_COMMAND_PRECONDITION",
    );
    const renamed = applyUpdateTreasureDetails(state, TRS_1, {
      name: { expected: "Black Chalice", value: "Night Cup" },
    });
    expect(renamed.nextState.world.treasures[0].treasureId).toBe(TRS_1);
  });
});

describe("M5.2D D1B pact fragment", () => {
  it("represents intact/damaged wizard, devil, unlocated, and destroyed+none", () => {
    const seated = applyCreateWizard(baseState({ wizards: [] }), WIZ_A, "Thalion", null, "necromancer").nextState;
    let state = applyUpdatePactFragmentOperationalState(
      seated,
      "necromancer",
      seated.pactFragmentOperationalState.necromancer,
      { condition: "intact", custody: { kind: "wizard", wizardId: WIZ_A } },
    ).nextState;
    state = applyUpdatePactFragmentOperationalState(
      state,
      "necromancer",
      state.pactFragmentOperationalState.necromancer,
      { condition: "damaged", custody: { kind: "wizard", wizardId: WIZ_A } },
    ).nextState;
    expect(state.pactFragmentOperationalState.necromancer.condition).toBe("damaged");
    state = applyUpdatePactFragmentOperationalState(
      state,
      "necromancer",
      state.pactFragmentOperationalState.necromancer,
      { condition: "intact", custody: { kind: "devil" } },
    ).nextState;
    state = applyUpdatePactFragmentOperationalState(
      state,
      "necromancer",
      state.pactFragmentOperationalState.necromancer,
      { condition: "intact", custody: { kind: "unlocated" } },
    ).nextState;
    state = applyUpdatePactFragmentOperationalState(
      state,
      "necromancer",
      state.pactFragmentOperationalState.necromancer,
      { condition: "destroyed", custody: { kind: "none" } },
    ).nextState;
    expect(state.pactFragmentOperationalState.necromancer).toEqual({ condition: "destroyed", custody: { kind: "none" } });
    expectDomain(
      () => applyUpdatePactFragmentOperationalState(
        state,
        "necromancer",
        state.pactFragmentOperationalState.necromancer,
        { condition: "destroyed", custody: { kind: "wizard", wizardId: WIZ_A } },
      ),
      "INVALID_CAMPAIGN_STATE",
    );
  });

  it("keeps fragment independent from seat reassignment and rejects stale edits", () => {
    let state = applyCreateWizard(baseState({ wizards: [] }), WIZ_A, "Thalion", null, "necromancer").nextState;
    state = applyUpdatePactFragmentOperationalState(
      state,
      "necromancer",
      state.pactFragmentOperationalState.necromancer,
      { condition: "intact", custody: { kind: "wizard", wizardId: WIZ_A } },
    ).nextState;
    const fragment = state.pactFragmentOperationalState;
    const unassigned = applySetPactSeatWizard(state, "necromancer", null).nextState;
    expect(unassigned.pactFragmentOperationalState).toEqual(fragment);
    expectDomain(
      () => applyUpdatePactFragmentOperationalState(
        state,
        "necromancer",
        { condition: "destroyed", custody: { kind: "none" } },
        { condition: "intact", custody: { kind: "devil" } },
      ),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("M5.2D D1B command contract", () => {
  function campaignOf(state: CampaignStateV5): CanonicalCampaign {
    return {
      docId: "dummy" as CanonicalCommitInput["campaignDocId"],
      campaignId: CAMPAIGN_A,
      currentRevision: 4,
      currentState: state,
    };
  }

  function recordingIo(accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null) {
    const commits: CanonicalCommitInput[] = [];
    const io: OrdinaryLogicalCommandIo = {
      async assertNotDeleting() {},
      async loadCanonicalCampaign() {
        return campaignOf(baseState());
      },
      async findAcceptedCommand() {
        return accepted === undefined ? null : accepted;
      },
      async loadCommittedSnapshot() {
        return baseState();
      },
      async commit(input) {
        commits.push(input);
        const receipt: CanonicalCommitReceipt = {
          newRevision: 5,
          state: input.nextState,
          alreadyApplied: false,
        };
        return receipt;
      },
    };
    return { io, commits };
  }

  it("replays the same commandId + fingerprint and rejects a materially different command", async () => {
    const change = { expected: "not_deceased" as const, value: "deceased" as const };
    const fingerprint = setWizardMortalityStateFingerprint(CAMPAIGN_A, WIZ_A, change);
    const { io } = recordingIo({
      commandType: "set_wizard_mortality_state",
      commandFingerprint: fingerprint,
      campaignRevision: 3,
    });
    const replay = await executeOrdinaryLogicalCommand(
      io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "set_wizard_mortality_state",
        commandFingerprint: fingerprint,
        apply: (state) => applySetWizardMortalityState(state, WIZ_A, change),
      }),
    );
    expect(replay.revision).toBe(3);

    const { io: conflictIo } = recordingIo({
      commandType: "set_wizard_mortality_state",
      commandFingerprint: fingerprint,
      campaignRevision: 3,
    });
    await expect(
      executeOrdinaryLogicalCommand(
        conflictIo,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => ({
          commandType: "set_wizard_mortality_state",
          commandFingerprint: setWizardMortalityStateFingerprint(CAMPAIGN_A, WIZ_A, {
            expected: "not_deceased",
            value: "not_deceased",
          }),
          apply: (state) => applySetWizardMortalityState(state, WIZ_A, change),
        }),
      ),
    ).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
  });

  it("fingerprints include meaningful values and accepted ops are event-coherent", async () => {
    const input = {
      treasureId: TRS_1,
      name: "Black Chalice",
      description: null,
      condition: "intact" as const,
      custody: { kind: "unlocated" as const },
    };
    const fpA = createTreasureFingerprint(CAMPAIGN_A, input);
    const fpB = createTreasureFingerprint(CAMPAIGN_A, { ...input, name: "White Chalice" });
    expect(fpA).not.toBe(fpB);
    expect(updatePactFragmentOperationalStateFingerprint(
      CAMPAIGN_A,
      "necromancer",
      { condition: "intact", custody: { kind: "none" } },
      { condition: "intact", custody: { kind: "devil" } },
    )).toContain("devil");

    const { io, commits } = recordingIo();
    await executeOrdinaryLogicalCommand(
      io,
      { commandId: COMMAND_2, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "create_treasure",
        commandFingerprint: fpA,
        apply: (state) => applyCreateTreasure(state, input),
      }),
    );
    expect(commits[0].nextState.world.treasures[0].name).toBe("Black Chalice");
    expect(commits[0].events[0].type).toBe("treasure_created");
    expect(() => validateEventCoherenceForTest(commits[0], 5)).not.toThrow();
    expect(() => validateCampaignState(commits[0].nextState)).not.toThrow();
  });
});
