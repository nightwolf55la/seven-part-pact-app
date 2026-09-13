import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeNecromancerSourceSetupInput,
  MonthOrdinal,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  applyAddNecromancerFoe,
  applyCreateDenizenV5Candidate,
  applyCreatePowerfulDenizenProfile,
  applyInitializeNecromancerSourceSetup,
  applySetPowerfulDenizenTaxonomies,
  applyUpdateNecromancerFoe,
  canonicalizeInitializeNecromancerSourceSetupInput,
  formatStalePreconditionValue,
  initializeNecromancerSourceSetupFingerprint,
  isLogicalStateCommandType,
  stalePreconditionMessage,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
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
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_3 = "den_00000000-0000-0000-0000-000000000003" as DenizenId;
const DEN_4 = "den_00000000-0000-0000-0000-000000000004" as DenizenId;
const DEN_5 = "den_00000000-0000-0000-0000-000000000005" as DenizenId;
const DEN_6 = "den_00000000-0000-0000-0000-000000000006" as DenizenId;
const DEN_EXISTING = "den_00000000-0000-0000-0000-0000000000aa" as DenizenId;
const DEN_COLLECTIVE = "den_00000000-0000-0000-0000-0000000000cc" as DenizenId;

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

const BEAST_PROFILE = {
  taxonomies: [{ kind: "builtin" as const, taxonomyId: "beast" as const }],
  status: { kind: "standard" as const, value: "reliable" as const },
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

function emptyWorld() {
  return {
    denizens: [] as CampaignStateV5["world"]["denizens"],
    isles: [],
    places: [],
    companionRelationships: [],
    campaignPowerfulDenizenTaxonomies: [],
    treasures: [],
  };
}

function baseV5(world = emptyWorld()): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A, "Wizard A")],
    pactSeats: {
      ...EMPTY_PACT_SEATS,
      necromancer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    world,
  });
}

function quietSourceInput(
  overrides: Partial<InitializeNecromancerSourceSetupInput> = {},
): InitializeNecromancerSourceSetupInput {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, name: "Deep Foe", gateId: "deep" },
      { denizenId: DEN_2, name: "Terminus Foe", gateId: "terminus" },
    ],
    arrangementAlly: { denizenId: DEN_5, name: "Near Ally", gateId: "amber" },
    arrangementGhoulCaller: null,
    ...overrides,
  };
}

function dynamicSourceInput(): InitializeNecromancerSourceSetupInput {
  return {
    arrangementId: "dynamic",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, name: "Deep Foe", gateId: "deep" },
      { denizenId: DEN_2, name: "Terminus Foe", gateId: "terminus" },
      { denizenId: DEN_3, name: "Far Foe", gateId: "howling" },
    ],
    arrangementAlly: { denizenId: DEN_5, name: "Near Ally", gateId: "ivory" },
    arrangementGhoulCaller: null,
  };
}

function explosiveSourceInput(): InitializeNecromancerSourceSetupInput {
  return {
    arrangementId: "explosive",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, name: "Deep Foe", gateId: "deep" },
      { denizenId: DEN_2, name: "Terminus Foe", gateId: "terminus" },
      { denizenId: DEN_3, name: "Far Foe One", gateId: "howling" },
      { denizenId: DEN_4, name: "Far Foe Two", gateId: "weeping" },
    ],
    arrangementAlly: { denizenId: DEN_5, name: "Near Ally", gateId: "lead" },
    arrangementGhoulCaller: {
      denizenId: DEN_6,
      name: "Disruptive Ghoul-Caller",
      pathSpaceId: "edge_sage",
      primaryElement: "fire",
      aesthetic: "ash-stained funeral silks",
      strangeQuirk: "counts backwards from thirteen",
      ageYears: 47,
    },
  };
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

describe("location-sensitive Denizen Foe invariant", () => {
  it("validates an ordinary in-Death Denizen Foe without a Powerful profile or foe_of_death", () => {
    const result = applyInitializeNecromancerSourceSetup(baseV5(), quietSourceInput());
    const deep = result.nextState.world.denizens.find((denizen) => denizen.denizenId === DEN_1);
    expect(deep?.powerfulProfile).toBeNull();
    expect(result.nextState.necromancer.foes).toHaveLength(2);
    expect(validateCampaignStateV5Candidate(result.nextState)).toBe(result.nextState);
  });

  it("retains an already-Powerful in-Death Foe profile", () => {
    const withProfile = applyCreateDenizenV5Candidate(baseV5(), {
      denizenId: DEN_EXISTING,
      name: "Already Powerful",
      representation: "individual",
      description: null,
    }).nextState;
    const profiled = applyCreatePowerfulDenizenProfile(withProfile, {
      denizenId: DEN_EXISTING,
      taxonomies: FOE_PROFILE.taxonomies,
      status: FOE_PROFILE.status,
      goal: null,
    }).nextState;
    const result = applyInitializeNecromancerSourceSetup(profiled, quietSourceInput({
      arrangementFoes: [
        { denizenId: DEN_EXISTING, name: "Ignored create name", gateId: "deep" },
        { denizenId: DEN_2, name: "Terminus Foe", gateId: "terminus" },
      ],
    }));
    const reused = result.nextState.world.denizens.find((denizen) => denizen.denizenId === DEN_EXISTING);
    expect(reused?.name).toBe("Already Powerful");
    expect(reused?.powerfulProfile?.taxonomies).toEqual(FOE_PROFILE.taxonomies);
    expect(result.nextState.necromancer.foes.some((foe) =>
      foe.subject.kind === "denizen" && foe.subject.denizenId === DEN_EXISTING,
    )).toBe(true);
  });

  it("rejects an escaped Denizen Foe that lacks Powerful foe_of_death representation", () => {
    const initialized = applyInitializeNecromancerSourceSetup(baseV5(), quietSourceInput()).nextState;
    const extra = applyCreateDenizenV5Candidate(initialized, {
      denizenId: DEN_3,
      name: "Escaped Ordinary",
      representation: "individual",
      description: null,
    }).nextState;
    expectCode(() => applyAddNecromancerFoe(extra, {
      subject: { kind: "denizen", denizenId: DEN_3 },
      location: { kind: "escaped", seatId: "sage", abominationKind: "occult" },
    }), "INVALID_CAMPAIGN_STATE");
  });

  it("accepts a legitimate escaped Denizen Foe that already has the stricter representation", () => {
    const initialized = applyInitializeNecromancerSourceSetup(baseV5(), quietSourceInput()).nextState;
    const created = applyCreateDenizenV5Candidate(initialized, {
      denizenId: DEN_3,
      name: "Emerged Abomination",
      representation: "individual",
      description: null,
    }).nextState;
    const profiled = applyCreatePowerfulDenizenProfile(created, {
      denizenId: DEN_3,
      taxonomies: FOE_PROFILE.taxonomies,
      status: FOE_PROFILE.status,
      goal: null,
    }).nextState;
    const added = applyAddNecromancerFoe(profiled, {
      subject: { kind: "denizen", denizenId: DEN_3 },
      location: { kind: "escaped", seatId: "sage", abominationKind: "occult" },
    });
    expect(added.nextState.necromancer.foes.find((foe) =>
      foe.subject.kind === "denizen" && foe.subject.denizenId === DEN_3,
    )?.location).toEqual({
      kind: "escaped",
      seatId: "sage",
      abominationKind: "occult",
    });
    expect(validateCampaignStateV5Candidate(added.nextState)).toBe(added.nextState);
  });

  it("rejects generic correction that moves an in-Death Denizen Foe directly to escaped", () => {
    const initialized = applyInitializeNecromancerSourceSetup(baseV5(), quietSourceInput()).nextState;
    expect(() => applyUpdateNecromancerFoe(initialized, { kind: "denizen", denizenId: DEN_1 }, {
      location: {
        expected: { kind: "gate", gateId: "deep" },
        value: { kind: "escaped", seatId: "sage", abominationKind: "occult" },
      },
    })).toThrow(/emergence cannot be recorded by generic location correction/i);
  });
});

describe("source-shaped Necromancer arrangement", () => {
  it("creates backing individual Denizens and places Quiet Foes and Ally atomically", () => {
    const result = applyInitializeNecromancerSourceSetup(baseV5(), quietSourceInput());
    expect(result.nextState.world.denizens.map((denizen) => denizen.name).sort()).toEqual([
      "Deep Foe",
      "Near Ally",
      "Terminus Foe",
    ]);
    expect(result.nextState.necromancer.foes.map((foe) => foe.location)).toEqual([
      { kind: "gate", gateId: "deep" },
      { kind: "gate", gateId: "terminus" },
    ]);
    expect(result.nextState.necromancer.allies).toEqual([
      { denizenId: DEN_5, location: { kind: "gate", gateId: "amber" } },
    ]);
    expect(result.events).toEqual([
      expect.objectContaining({ type: "necromancer_initialized" }),
    ]);
    expect(result.nextState.world.denizens.every((denizen) =>
      denizen.denizenId === DEN_6 ? true : denizen.powerfulProfile === null,
    )).toBe(true);
  });

  it("places Dynamic and Explosive Foes at the chosen Far Gates and creates Explosive Ghoul-Caller profile atomically", () => {
    const dynamic = applyInitializeNecromancerSourceSetup(baseV5(), dynamicSourceInput()).nextState;
    expect(dynamic.necromancer.foes).toHaveLength(3);
    expect(dynamic.necromancer.foes[2]?.location).toEqual({ kind: "gate", gateId: "howling" });
    expect(dynamic.necromancer.ghoulCallers).toEqual([]);

    const explosive = applyInitializeNecromancerSourceSetup(baseV5(), explosiveSourceInput()).nextState;
    expect(explosive.necromancer.foes).toHaveLength(4);
    const ghoul = explosive.world.denizens.find((denizen) => denizen.denizenId === DEN_6);
    expect(ghoul?.powerfulProfile?.taxonomies).toEqual([{ kind: "builtin", taxonomyId: "ghoul_caller" }]);
    expect(ghoul?.powerfulProfile?.status).toEqual({ kind: "standard", value: "disruptive" });
    expect(explosive.necromancer.ghoulCallers[0]).toEqual(expect.objectContaining({
      denizenId: DEN_6,
      location: { kind: "path", pathSpaceId: "edge_sage" },
      pettyDeadCount: 0,
    }));
  });

  it("reuses proposed Denizen IDs and does not name-match a decoy", () => {
    const decoy = applyCreateDenizenV5Candidate(baseV5(), {
      denizenId: DEN_EXISTING,
      name: "Deep Foe",
      representation: "individual",
      description: null,
    }).nextState;
    const result = applyInitializeNecromancerSourceSetup(decoy, quietSourceInput());
    const namedDeep = result.nextState.world.denizens.filter((denizen) => denizen.name === "Deep Foe");
    expect(namedDeep).toHaveLength(2);
    expect(result.nextState.necromancer.foes[0]?.subject).toEqual({ kind: "denizen", denizenId: DEN_1 });
    expect(namedDeep.some((denizen) => denizen.denizenId === DEN_EXISTING)).toBe(true);
    expect(namedDeep.some((denizen) => denizen.denizenId === DEN_1)).toBe(true);
  });

  it("fails closed on a contradictory existing proposed Denizen", () => {
    const collective = applyCreateDenizenV5Candidate(baseV5(), {
      denizenId: DEN_COLLECTIVE,
      name: "A Host",
      representation: "collective",
      description: null,
    }).nextState;
    expect(() => applyInitializeNecromancerSourceSetup(collective, quietSourceInput({
      arrangementFoes: [
        { denizenId: DEN_COLLECTIVE, name: "Deep Foe", gateId: "deep" },
        { denizenId: DEN_2, name: "Terminus Foe", gateId: "terminus" },
      ],
    }))).toThrow(/contradictory/i);
  });

  it("does not persist a partial starting Denizen when later arrangement validation fails", () => {
    expect(() => applyInitializeNecromancerSourceSetup(baseV5(), quietSourceInput({
      arrangementAlly: { denizenId: DEN_1, name: "Near Ally", gateId: "amber" },
    }))).toThrow(DomainError);
  });

  it("retries of the same accepted command remain idempotent", async () => {
    const input = canonicalizeInitializeNecromancerSourceSetupInput(quietSourceInput());
    const fingerprint = initializeNecromancerSourceSetupFingerprint(CAMPAIGN_A, input);
    const prepare = () => ({
      commandType: "initialize_necromancer_source_setup" as const,
      commandFingerprint: fingerprint,
      apply: (current: CampaignStateV5) => applyInitializeNecromancerSourceSetup(current, input),
    });
    const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, baseV5()) });
    const receipt = await executeOrdinaryLogicalCommand(io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
    }, prepare);
    expect(receipt).toEqual({ revision: 5 });
    expect(commits).toHaveLength(1);
    validateEventCoherenceForTest(commits[0]!, 1);

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, commits[0]!.nextState as CampaignStateV5, 5),
      accepted: { commandType: "initialize_necromancer_source_setup", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
    }, prepare);
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("registers the source-setup command as a logical-state command", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("initialize_necromancer_source_setup");
    expect(isLogicalStateCommandType("initialize_necromancer_source_setup")).toBe(true);
    expect(initializeNecromancerSourceSetupFingerprint(CAMPAIGN_A, quietSourceInput()))
      .toMatch(/^initialize_necromancer_source_setup:v1:/);
  });
});

describe("stale taxonomy presentation", () => {
  it("rejects stale taxonomy writes with readable labels instead of [object Object]", () => {
    const created = applyCreateDenizenV5Candidate(baseV5(), {
      denizenId: DEN_1,
      name: "Profiled",
      representation: "individual",
      description: null,
    }).nextState;
    const profiled = applyCreatePowerfulDenizenProfile(created, {
      denizenId: DEN_1,
      taxonomies: [
        { kind: "builtin", taxonomyId: "foe_of_death" },
        { kind: "builtin", taxonomyId: "beast" },
      ],
      status: { kind: "standard", value: "malignant" },
      goal: null,
    }).nextState;
    try {
      applySetPowerfulDenizenTaxonomies(profiled, DEN_1, {
        expected: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        value: [{ kind: "builtin", taxonomyId: "beast" }],
      });
      throw new Error("expected stale rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("STALE_COMMAND_PRECONDITION");
      expect((error as DomainError).message).not.toMatch(/\[object Object\]/);
      expect((error as DomainError).message).toBe(
        "taxonomies: expected \"ghoul_caller\" but current is \"foe_of_death, beast\"",
      );
    }
  });

  it("formats structured stale values without object coercion", () => {
    expect(formatStalePreconditionValue([{ kind: "builtin", taxonomyId: "foe_of_death" }])).toBe("foe_of_death");
    expect(stalePreconditionMessage("taxonomies", BEAST_PROFILE.taxonomies, FOE_PROFILE.taxonomies))
      .toBe('taxonomies: expected "beast" but current is "foe_of_death"');
  });
});
