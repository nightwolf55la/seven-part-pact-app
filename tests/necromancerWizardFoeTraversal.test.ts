import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeNecromancerInput,
  MonthOrdinal,
  NecromancerCampaignPathSpaceId,
  NecromancerWizardFoeState,
  PlayerId,
  PowerfulDenizenTruthId,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_FAUSTIAN_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  addNecromancerFoeFingerprint,
  applyAddNecromancerFoe,
  applyAddNecromancerWizardFoeTruth,
  applyAddNecromancerWizardTraversal,
  applyAddPowerfulDenizenTruth,
  applyCreateNecromancerCampaignPathSpace,
  applyEscapeNecromancerWizardFoe,
  applyInitializeNecromancer,
  applyRemoveNecromancerCampaignPathSpace,
  applyRemoveNecromancerWizardFoeTruth,
  applyRemoveNecromancerWizardTraversal,
  applyRemovePowerfulDenizenProfile,
  applySetPowerfulDenizenTaxonomies,
  applySetWizardMortalityState,
  applyUpdateNecromancerFoe,
  applyUpdateNecromancerWizardFoeTruth,
  applyUpdateNecromancerWizardTraversal,
  escapeNecromancerWizardFoeFingerprint,
  isNecromancerDenizenFoe,
  isNecromancerWizardFoe,
  necromancerFoeSubjectKey,
  updateNecromancerFoeFingerprint,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const WIZ_MISSING = "wiz_00000000-0000-0000-0000-0000000000ff" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_5 = "den_00000000-0000-0000-0000-000000000005" as DenizenId;
const DEN_MISSING = "den_00000000-0000-0000-0000-999999999999" as DenizenId;
const CAMPAIGN_PATH = "nps_00000000-0000-0000-0000-0000000000d2" as NecromancerCampaignPathSpaceId;
const TRUTH_1 = "pdtru_00000000-0000-0000-0000-0000000000d2" as PowerfulDenizenTruthId;
const TRUTH_2 = "pdtru_00000000-0000-0000-0000-0000000000d3" as PowerfulDenizenTruthId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

const FOE_PROFILE = {
  taxonomies: [{ kind: "builtin" as const, taxonomyId: "foe_of_death" as const }],
  status: { kind: "standard" as const, value: "malignant" as const },
  goal: null,
  methods: [],
  truths: [],
};

function wizard(wizardId: WizardId, name: string) {
  return {
    wizardId,
    name,
    portrayedByPlayerId: wizardId === WIZ_A ? PLR_A : null,
    character: {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    },
    homeIsleId: null,
    sanctumPlaceId: null,
    mortalityState: "not_deceased" as const,
  };
}

function baseV5(): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A, "Wizard A"), wizard(WIZ_B, "Wizard B")],
    pactSeats: {
      ...EMPTY_PACT_SEATS,
      necromancer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: {
      denizens: [
        { denizenId: DEN_1, name: "Deep Foe", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: FOE_PROFILE },
        { denizenId: DEN_2, name: "Terminus Foe", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: FOE_PROFILE },
        { denizenId: DEN_5, name: "Near Ally", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null },
      ],
      isles: [],
      places: [],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: EMPTY_NECROMANCER_STATE,
    faustian: EMPTY_FAUSTIAN_STATE,
  };
}

function quietInput(): InitializeNecromancerInput {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
    arrangementGhoulCaller: null,
  };
}

function initialized(): CampaignStateV5 {
  return applyInitializeNecromancer(baseV5(), quietInput()).nextState;
}

function expectCode(fn: () => unknown, code: DomainError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

function requireWizardFoe(state: CampaignStateV5, wizardId: WizardId): NecromancerWizardFoeState {
  const foe = state.necromancer.foes.find((candidate) => candidate.subject.kind === "wizard" && candidate.subject.wizardId === wizardId);
  if (foe === undefined || !isNecromancerWizardFoe(foe)) {
    throw new Error(`missing Wizard Foe ${wizardId}`);
  }
  return foe;
}

function campaignOf(campaignId: string, state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCampaign["docId"],
    campaignId,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null;
  snapshot?: unknown | null;
}) {
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {},
    async loadCanonicalCampaign() {
      return options.campaign;
    },
    async findAcceptedCommand() {
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

describe("D2A Wizard traversal", () => {
  it("accepts living_katabasis for a living Wizard and deceased_peaceful for a deceased Wizard", () => {
    const living = applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    });
    expect(living.nextState.necromancer.wizardTraversals).toEqual([{
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    }]);
    expect(living.events[0]?.type).toBe("necromancer_wizard_traversal_added");

    const deceased = applySetWizardMortalityState(initialized(), WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    const peaceful = applyAddNecromancerWizardTraversal(deceased, {
      wizardId: WIZ_B,
      kind: "deceased_peaceful",
      location: { kind: "path", pathSpaceId: "edge_sage" },
    });
    expect(peaceful.nextState.necromancer.wizardTraversals[0]?.kind).toBe("deceased_peaceful");
  });

  it("rejects mismatched mortality, duplicates, and unresolved Wizard or location", () => {
    expectCode(() => applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "deceased_peaceful",
      location: { kind: "gate", gateId: "amber" },
    }), "INVALID_CAMPAIGN_STATE");

    const deceased = applySetWizardMortalityState(initialized(), WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    expectCode(() => applyAddNecromancerWizardTraversal(deceased, {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    }), "INVALID_CAMPAIGN_STATE");

    const once = applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    }).nextState;
    expectCode(() => applyAddNecromancerWizardTraversal(once, {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "bronze" },
    }), "INVALID_CAMPAIGN_STATE");

    expectCode(() => applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_MISSING,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "not-a-gate" as never },
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "terminal", terminalId: "void_beyond" } as never,
    }), "INVALID_CAMPAIGN_STATE");
  });

  it("fails closed when a campaign path space is still referenced by Wizard traversal", () => {
    const withPath = applyCreateNecromancerCampaignPathSpace(initialized(), {
      pathSpaceId: CAMPAIGN_PATH,
      region: "abyss",
    }).nextState;
    const withTraversal = applyAddNecromancerWizardTraversal(withPath, {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "path", pathSpaceId: CAMPAIGN_PATH },
    }).nextState;
    expectCode(() => applyRemoveNecromancerCampaignPathSpace(withTraversal, CAMPAIGN_PATH, {
      origin: "campaign",
      pathSpaceId: CAMPAIGN_PATH,
      region: "abyss",
    }), "INVALID_CAMPAIGN_STATE");
  });

  it("protects Wizard traversal add/update/remove with stale expected-current records", () => {
    const added = applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    });
    expectCode(() => applyUpdateNecromancerWizardTraversal(added.nextState, WIZ_B, {
      location: { expected: { kind: "gate", gateId: "bronze" }, value: { kind: "gate", gateId: "lead" } },
    }), "STALE_COMMAND_PRECONDITION");
    const updated = applyUpdateNecromancerWizardTraversal(added.nextState, WIZ_B, {
      location: { expected: { kind: "gate", gateId: "amber" }, value: { kind: "gate", gateId: "bronze" } },
    });
    expect(updated.nextState.necromancer.wizardTraversals[0]?.location).toEqual({ kind: "gate", gateId: "bronze" });
    expectCode(() => applyRemoveNecromancerWizardTraversal(updated.nextState, WIZ_B, {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    }), "STALE_COMMAND_PRECONDITION");
    const removed = applyRemoveNecromancerWizardTraversal(updated.nextState, WIZ_B, {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "bronze" },
    });
    expect(removed.nextState.necromancer.wizardTraversals).toEqual([]);
  });
});

describe("D2A mixed-subject Foes", () => {
  it("keeps existing Denizen Foe behavior on the subject union and allows a distinct Wizard Foe", () => {
    const state = initialized();
    const denizenFoe = state.necromancer.foes.find((foe) => foe.subject.kind === "denizen" && foe.subject.denizenId === DEN_1);
    expect(denizenFoe).toEqual({
      subject: { kind: "denizen", denizenId: DEN_1 },
      location: { kind: "gate", gateId: "deep" },
    });
    expect(isNecromancerDenizenFoe(denizenFoe!)).toBe(true);
    expect("truths" in denizenFoe!).toBe(false);

    const deceased = applySetWizardMortalityState(state, WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    const withWizard = applyAddNecromancerFoe(deceased, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }).nextState;
    expect(withWizard.necromancer.foes).toHaveLength(3);
    expect(necromancerFoeSubjectKey({ kind: "wizard", wizardId: WIZ_B }))
      .not.toBe(necromancerFoeSubjectKey({ kind: "denizen", denizenId: DEN_1 }));
    expect(withWizard.wizards.find((candidate) => candidate.wizardId === WIZ_B)?.wizardId).toBe(WIZ_B);
  });

  it("rejects duplicate same-subject Foes and unresolved subjects", () => {
    const state = initialized();
    expectCode(() => applyAddNecromancerFoe(state, {
      subject: { kind: "denizen", denizenId: DEN_1 },
      location: { kind: "gate", gateId: "bronze" },
    }), "INVALID_CAMPAIGN_STATE");
    const deceased = applySetWizardMortalityState(state, WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    const withWizard = applyAddNecromancerFoe(deceased, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }).nextState;
    expectCode(() => applyAddNecromancerFoe(withWizard, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "lead" },
      truths: [],
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyAddNecromancerFoe(state, {
      subject: { kind: "denizen", denizenId: DEN_MISSING },
      location: { kind: "gate", gateId: "bronze" },
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyAddNecromancerFoe(state, {
      subject: { kind: "wizard", wizardId: WIZ_MISSING },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }), "INVALID_CAMPAIGN_STATE");
  });
});

describe("D2A Denizen Foe Powerful profile", () => {
  it("requires a Powerful profile with foe_of_death and does not store a duplicate Truth list", () => {
    const withoutProfile = {
      ...baseV5(),
      world: {
        ...baseV5().world,
        denizens: baseV5().world.denizens.map((denizen) =>
          denizen.denizenId === DEN_1 ? { ...denizen, powerfulProfile: null } : denizen,
        ),
      },
    };
    expectCode(() => applyInitializeNecromancer(withoutProfile, quietInput()), "INVALID_CAMPAIGN_STATE");

    const wrongTaxonomy = {
      ...baseV5(),
      world: {
        ...baseV5().world,
        denizens: baseV5().world.denizens.map((denizen) =>
          denizen.denizenId === DEN_1
            ? {
                ...denizen,
                powerfulProfile: {
                  ...FOE_PROFILE,
                  taxonomies: [{ kind: "builtin" as const, taxonomyId: "ghoul_caller" as const }],
                },
              }
            : denizen,
        ),
      },
    };
    expectCode(() => applyInitializeNecromancer(wrongTaxonomy, quietInput()), "INVALID_CAMPAIGN_STATE");

    const state = initialized();
    const denizenFoe = state.necromancer.foes.find((foe) => foe.subject.kind === "denizen" && foe.subject.denizenId === DEN_1);
    expect(denizenFoe && "truths" in denizenFoe).toBe(false);
    const profiled = applyAddPowerfulDenizenTruth(state, {
      denizenId: DEN_1,
      truthId: TRUTH_1,
      text: "He bargained at the Deep Gate",
    }).nextState;
    expect(profiled.world.denizens.find((denizen) => denizen.denizenId === DEN_1)?.powerfulProfile?.truths).toEqual([{
      truthId: TRUTH_1,
      text: "He bargained at the Deep Gate",
      origin: "campaign",
    }]);
    const stillDenizenFoe = profiled.necromancer.foes.find((foe) => foe.subject.kind === "denizen" && foe.subject.denizenId === DEN_1);
    expect(stillDenizenFoe && "truths" in stillDenizenFoe).toBe(false);

    const denizen = profiled.world.denizens.find((candidate) => candidate.denizenId === DEN_1);
    expectCode(() => applyRemovePowerfulDenizenProfile(profiled, DEN_1, denizen!.powerfulProfile!), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applySetPowerfulDenizenTaxonomies(profiled, DEN_1, {
      expected: denizen!.powerfulProfile!.taxonomies,
      value: [{ kind: "builtin", taxonomyId: "beast" }],
    }), "INVALID_CAMPAIGN_STATE");
  });
});

describe("D2A Wizard Foe mortality", () => {
  it("requires deceased inside Death, not_deceased occult when escaped, and forbids traversal overlap", () => {
    const livingAdd = () => applyAddNecromancerFoe(initialized(), {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    });
    expectCode(livingAdd, "INVALID_CAMPAIGN_STATE");

    const deceased = applySetWizardMortalityState(initialized(), WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    const inside = applyAddNecromancerFoe(deceased, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }).nextState;
    expect(inside.wizards.find((candidate) => candidate.wizardId === WIZ_B)?.mortalityState).toBe("deceased");
    expectCode(() => applyUpdateNecromancerFoe(inside, { kind: "wizard", wizardId: WIZ_B }, {
      location: {
        expected: { kind: "gate", gateId: "bronze" },
        value: { kind: "escaped", seatId: "sage", abominationKind: "occult" },
      },
    }), "INVALID_CAMPAIGN_STATE");

    const withTraversal = applyAddNecromancerWizardTraversal(initialized(), {
      wizardId: WIZ_B,
      kind: "living_katabasis",
      location: { kind: "gate", gateId: "amber" },
    }).nextState;
    expectCode(() => applySetWizardMortalityState(withTraversal, WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyAddNecromancerWizardTraversal(inside, {
      wizardId: WIZ_B,
      kind: "deceased_peaceful",
      location: { kind: "gate", gateId: "amber" },
    }), "INVALID_CAMPAIGN_STATE");

    const invalidEscaped: CampaignStateV5 = {
      ...inside,
      necromancer: {
        ...inside.necromancer,
        foes: inside.necromancer.foes.map((foe) =>
          foe.subject.kind === "wizard" && foe.subject.wizardId === WIZ_B
            ? {
                ...foe,
                location: { kind: "escaped" as const, seatId: "sage" as const, abominationKind: "brutal" as const },
              }
            : foe,
        ),
      },
    };
    expect(() => validateCampaignStateV5Candidate(invalidEscaped)).toThrow(DomainError);
  });
});

describe("D2A Wizard Foe Truths", () => {
  function wizardFoeState(): CampaignStateV5 {
    const deceased = applySetWizardMortalityState(initialized(), WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    return applyAddNecromancerFoe(deceased, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }).nextState;
  }

  it("adds, updates while preserving TruthId, and removes Wizard-Foe Truths", () => {
    const added = applyAddNecromancerWizardFoeTruth(wizardFoeState(), {
      wizardId: WIZ_B,
      truthId: TRUTH_1,
      text: "  He kept his own name  ",
    });
    const foe = requireWizardFoe(added.nextState, WIZ_B);
    expect(foe.truths).toEqual([{
      truthId: TRUTH_1,
      text: "He kept his own name",
      origin: "campaign",
    }]);
    const updated = applyUpdateNecromancerWizardFoeTruth(added.nextState, WIZ_B, TRUTH_1, {
      expected: "He kept his own name",
      value: "He still kept his own name",
    });
    expect(requireWizardFoe(updated.nextState, WIZ_B).truths[0]?.truthId).toBe(TRUTH_1);
    const removed = applyRemoveNecromancerWizardFoeTruth(
      updated.nextState,
      WIZ_B,
      TRUTH_1,
      requireWizardFoe(updated.nextState, WIZ_B).truths[0]!,
    );
    expect(requireWizardFoe(removed.nextState, WIZ_B).truths).toEqual([]);
  });

  it("rejects Wizard-Foe Truth operations on a Denizen Foe, duplicates, and stale text", () => {
    const state = wizardFoeState();
    expectCode(() => applyAddNecromancerWizardFoeTruth(initialized(), {
      wizardId: WIZ_A,
      truthId: TRUTH_1,
      text: "No Wizard Foe here",
    }), "INVALID_CAMPAIGN_STATE");

    const withTruth = applyAddNecromancerWizardFoeTruth(state, {
      wizardId: WIZ_B,
      truthId: TRUTH_1,
      text: "Named in Death",
    }).nextState;
    expectCode(() => applyAddNecromancerWizardFoeTruth(withTruth, {
      wizardId: WIZ_B,
      truthId: TRUTH_1,
      text: "Named twice",
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyUpdateNecromancerWizardFoeTruth(withTruth, WIZ_B, TRUTH_1, {
      expected: "stale",
      value: "Named in Life",
    }), "STALE_COMMAND_PRECONDITION");

    const withProfileTruth = applyAddPowerfulDenizenTruth(withTruth, {
      denizenId: DEN_1,
      truthId: TRUTH_2,
      text: "Denizen authority",
    }).nextState;
    expectCode(() => applyAddNecromancerWizardFoeTruth(withProfileTruth, {
      wizardId: WIZ_B,
      truthId: TRUTH_2,
      text: "Colliding id",
    }), "INVALID_CAMPAIGN_STATE");
  });
});

describe("D2A atomic Wizard escape", () => {
  function deceasedWizardFoe(): CampaignStateV5 {
    const deceased = applySetWizardMortalityState(initialized(), WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    const withFoe = applyAddNecromancerFoe(deceased, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }).nextState;
    return applyAddNecromancerWizardFoeTruth(withFoe, {
      wizardId: WIZ_B,
      truthId: TRUTH_1,
      text: "The Edge knew him",
    }).nextState;
  }

  it("atomically returns the same WizardId to life as an escaped occult Abomination", () => {
    const start = deceasedWizardFoe();
    const beforeSeats = structuredClone(start.pactSeats);
    const beforeFragments = structuredClone(start.pactFragmentOperationalState);
    const beforeTreasures = structuredClone(start.world.treasures);
    const expectedFoe = requireWizardFoe(start, WIZ_B);
    const escaped = applyEscapeNecromancerWizardFoe(start, WIZ_B, "deceased", expectedFoe, "sage");
    const wizard = escaped.nextState.wizards.find((candidate) => candidate.wizardId === WIZ_B);
    const foe = requireWizardFoe(escaped.nextState, WIZ_B);
    expect(wizard?.mortalityState).toBe("not_deceased");
    expect(wizard?.wizardId).toBe(WIZ_B);
    expect(foe.location).toEqual({ kind: "escaped", seatId: "sage", abominationKind: "occult" });
    expect(foe.truths.map((truth) => truth.truthId)).toEqual([TRUTH_1]);
    expect(escaped.nextState.pactSeats).toEqual(beforeSeats);
    expect(escaped.nextState.pactFragmentOperationalState).toEqual(beforeFragments);
    expect(escaped.nextState.world.treasures).toEqual(beforeTreasures);
    expect(escaped.events.map((event) => event.type)).toEqual(["necromancer_wizard_foe_escaped"]);
  });

  it("rejects stale mortality, stale expected Foe, and Denizen Foe escape", () => {
    const start = deceasedWizardFoe();
    const expectedFoe = requireWizardFoe(start, WIZ_B);
    expectCode(
      () => applyEscapeNecromancerWizardFoe(start, WIZ_B, "deceased", {
        ...expectedFoe,
        location: { kind: "gate", gateId: "deep" },
      }, "sage"),
      "STALE_COMMAND_PRECONDITION",
    );
    const living = {
      ...start,
      wizards: start.wizards.map((candidate) =>
        candidate.wizardId === WIZ_B ? { ...candidate, mortalityState: "not_deceased" as const } : candidate,
      ),
    };
    expectCode(() => applyEscapeNecromancerWizardFoe(living, WIZ_B, "deceased", expectedFoe, "sage"), "STALE_COMMAND_PRECONDITION");
    const necromancerDeceased = applySetWizardMortalityState(start, WIZ_A, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    expectCode(() => applyEscapeNecromancerWizardFoe(necromancerDeceased, WIZ_A, "deceased", expectedFoe, "sage"), "INVALID_CAMPAIGN_STATE");
  });
});

describe("D2A pre-activation and command/event contracts", () => {
  it("fails closed when wizardTraversals is missing from a V5 fixture", () => {
    const { wizardTraversals: _ignored, ...rest } = EMPTY_NECROMANCER_STATE;
    expect(() => validateCampaignStateV5Candidate({
      ...baseV5(),
      necromancer: rest as typeof EMPTY_NECROMANCER_STATE,
    })).toThrow(DomainError);
  });

  it("includes the subject discriminant in Foe fingerprints", () => {
    const fields = {
      location: { expected: { kind: "gate" as const, gateId: "deep" as const }, value: { kind: "gate" as const, gateId: "amber" as const } },
    };
    expect(updateNecromancerFoeFingerprint(CAMPAIGN_A, { kind: "denizen", denizenId: DEN_1 }, fields))
      .not.toBe(updateNecromancerFoeFingerprint(CAMPAIGN_A, { kind: "wizard", wizardId: WIZ_B }, fields));
    expect(addNecromancerFoeFingerprint(CAMPAIGN_A, {
      subject: { kind: "denizen", denizenId: DEN_1 },
      location: { kind: "gate", gateId: "bronze" },
    })).toContain("\"kind\":\"denizen\"");
  });

  it("replays escape idempotently and rejects a changed payload under the same commandId", async () => {
    const start = applySetWizardMortalityState(initialized(), WIZ_B, {
      expected: "not_deceased",
      value: "deceased",
    }).nextState;
    const withFoe = applyAddNecromancerFoe(start, {
      subject: { kind: "wizard", wizardId: WIZ_B },
      location: { kind: "gate", gateId: "bronze" },
      truths: [],
    }).nextState;
    const expectedFoe = requireWizardFoe(withFoe, WIZ_B);
    const fingerprint = escapeNecromancerWizardFoeFingerprint(
      CAMPAIGN_A,
      WIZ_B,
      "deceased",
      expectedFoe,
      "sage",
    );
    const prepare = () => ({
      commandType: "escape_necromancer_wizard_foe" as const,
      commandFingerprint: fingerprint,
      apply: (current: CampaignStateV5) => applyEscapeNecromancerWizardFoe(current, WIZ_B, "deceased", expectedFoe, "sage"),
    });
    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, withFoe, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]?.type).toBe("necromancer_wizard_foe_escaped");
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "escape_necromancer_wizard_foe", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const conflict = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, withFoe),
      accepted: { commandType: "escape_necromancer_wizard_foe", commandFingerprint: fingerprint, campaignRevision: 5 },
    });
    await expect(executeOrdinaryLogicalCommand(
      conflict.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "escape_necromancer_wizard_foe",
        commandFingerprint: escapeNecromancerWizardFoeFingerprint(
          CAMPAIGN_A,
          WIZ_B,
          "deceased",
          expectedFoe,
          "hierophant",
        ),
        apply: (current) => applyEscapeNecromancerWizardFoe(current, WIZ_B, "deceased", expectedFoe, "hierophant"),
      }),
    )).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
  });
});
