import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeNecromancerInput,
  MonthOrdinal,
  NecromancerCampaignGateId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  applyCreateNecromancerCampaignGate,
  applyInitializeNecromancer,
  applySetNecromancerGateStatus,
  applySetNecromancerSoulCount,
  applyTransformNecromancerSoulIntoAlly,
  canonicalizeTransformNecromancerSoulIntoAllyInput,
  isLogicalStateCommandType,
  transformNecromancerSoulIntoAllyFingerprint,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_5 = "den_00000000-0000-0000-0000-000000000005" as DenizenId;
const NEW_DEN = "den_00000000-0000-0000-0000-000000000064" as DenizenId;
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000ab" as NecromancerCampaignGateId;
const MISSING_GATE = "ngt_00000000-0000-0000-0000-0000000000ff" as NecromancerCampaignGateId;

const FOE_PROFILE = {
  taxonomies: [{ kind: "builtin" as const, taxonomyId: "foe_of_death" as const }],
  status: { kind: "standard" as const, value: "malignant" as const },
  goal: null,
  methods: [],
  truths: [],
};

function expectCode(run: () => unknown, code: DomainError["code"], pattern?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (pattern !== undefined) {
      expect((error as DomainError).message).toMatch(pattern);
    }
  }
}

function defaultWorld() {
  return {
    denizens: [
      { denizenId: DEN_1, name: "Deep Foe", representation: "individual" as const, description: null, mortalityState: "not_deceased" as const, powerfulProfile: FOE_PROFILE },
      { denizenId: DEN_2, name: "Terminus Foe", representation: "individual" as const, description: null, mortalityState: "not_deceased" as const, powerfulProfile: FOE_PROFILE },
      { denizenId: DEN_5, name: "Near Ally", representation: "individual" as const, description: null, mortalityState: "not_deceased" as const, powerfulProfile: null },
    ],
    isles: [],
    places: [],
    companionRelationships: [],
    campaignPowerfulDenizenTaxonomies: [],
    treasures: [],
  };
}

function baseV5(): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
      portrayedByPlayerId: PLR_A,
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
      mortalityState: "not_deceased",
    }],
    world: defaultWorld(),
  });
}

function quietInput(overrides?: Partial<InitializeNecromancerInput>): InitializeNecromancerInput {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
    arrangementGhoulCaller: null,
    ...overrides,
  };
}

function initialized(): CampaignStateV5 {
  return applyInitializeNecromancer(baseV5(), quietInput()).nextState;
}

function withSouls(state: CampaignStateV5, gateId: "ivory" | "amber" | typeof CAMPAIGN_GATE, count: number): CampaignStateV5 {
  const location = { kind: "gate" as const, gateId };
  return applySetNecromancerSoulCount(state, location, 0, count).nextState;
}

function transformInput(overrides: Partial<Parameters<typeof canonicalizeTransformNecromancerSoulIntoAllyInput>[0]> = {}) {
  return canonicalizeTransformNecromancerSoulIntoAllyInput({
    denizenId: NEW_DEN,
    name: "Bound Mira",
    gateId: "ivory",
    expectedSoulCount: 2,
    expectedGateStatus: "ordinary",
    ...overrides,
  });
}

function soulAt(state: CampaignStateV5, gateId: string): number {
  return state.necromancer.souls.find((soul) =>
    soul.location.kind === "gate" && soul.location.gateId === gateId,
  )?.count ?? 0;
}

function campaignOf(state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId: CAMPAIGN_A,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
  snapshot?: CampaignStateV5;
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

describe("transform_necromancer_soul_into_ally", () => {
  it("creates a named individual and Ally at the same ordinary Gate, leaving one Soul", () => {
    const before = withSouls(initialized(), "ivory", 2);
    const ivorySoulsBefore = soulAt(before, "ivory");
    const worldBefore = before.world.denizens.map((denizen) => denizen.denizenId);
    const hierophantBefore = before.hierophant;
    const otherSouls = before.necromancer.souls.filter((soul) =>
      !(soul.location.kind === "gate" && soul.location.gateId === "ivory"),
    );
    const result = applyTransformNecromancerSoulIntoAlly(before, transformInput());
    expect(result.nextState.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN && denizen.name === "Bound Mira" && denizen.representation === "individual")).toBe(true);
    expect(result.nextState.necromancer.allies).toEqual(expect.arrayContaining([{
      denizenId: NEW_DEN,
      location: { kind: "gate", gateId: "ivory" },
    }]));
    expect(soulAt(result.nextState, "ivory")).toBe(1);
    expect(ivorySoulsBefore).toBe(2);
    expect(result.events).toEqual([{
      type: "necromancer_soul_transformed_into_ally",
      version: 1,
      data: {
        denizenId: NEW_DEN,
        denizenName: "Bound Mira",
        gateId: "ivory",
        previousSoulCount: 2,
        newSoulCount: 1,
        expectedGateStatus: "ordinary",
      },
    }]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    expect(before.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(false);
    expect(result.nextState.world.denizens.map((denizen) => denizen.denizenId).slice(0, worldBefore.length)).toEqual(worldBefore);
    expect(result.nextState.hierophant).toEqual(hierophantBefore);
    expect(result.nextState.necromancer.souls.filter((soul) =>
      !(soul.location.kind === "gate" && soul.location.gateId === "ivory"),
    )).toEqual(otherSouls);
    expect(result.nextState.necromancer.foes).toEqual(before.necromancer.foes);
  });

  it("uses the sparse zero-count representation after transforming the last Soul", () => {
    const before = withSouls(initialized(), "ivory", 1);
    const result = applyTransformNecromancerSoulIntoAlly(before, transformInput({ expectedSoulCount: 1 }));
    expect(soulAt(result.nextState, "ivory")).toBe(0);
    expect(result.nextState.necromancer.souls.some((soul) =>
      soul.location.kind === "gate" && soul.location.gateId === "ivory",
    )).toBe(false);
    expect(result.nextState.necromancer.allies.some((ally) => ally.denizenId === NEW_DEN)).toBe(true);
  });

  it("rejects hostile, destroyed, missing, path, zero-soul, invalid name, duplicate, and stale conditions atomically", () => {
    const ordinary = withSouls(initialized(), "ivory", 2);
    const hostile = applySetNecromancerGateStatus(ordinary, "ivory", "ordinary", "hostile").nextState;
    const destroyed = applySetNecromancerGateStatus(ordinary, "ivory", "ordinary", "destroyed").nextState;
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(baseV5(), transformInput()),
      "INVALID_CAMPAIGN_STATE",
      /initialized/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(hostile, transformInput({ expectedGateStatus: "hostile" })),
      "INVALID_CAMPAIGN_STATE",
      /ordinary/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(hostile, transformInput({ expectedGateStatus: "ordinary" })),
      "STALE_COMMAND_PRECONDITION",
      /Gate status/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(destroyed, transformInput({ expectedGateStatus: "destroyed" })),
      "INVALID_CAMPAIGN_STATE",
      /ordinary/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(ordinary, transformInput({ gateId: MISSING_GATE })),
      "INVALID_CAMPAIGN_STATE",
      /Gate not found/,
    );
    expectCode(
      () => canonicalizeTransformNecromancerSoulIntoAllyInput(transformInput({ gateId: "edge_sage" as never })),
      "INVALID_CAMPAIGN_STATE",
      /Gate not found/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(initialized(), transformInput({ expectedSoulCount: 0 })),
      "INVALID_CAMPAIGN_STATE",
      /at least one Soul/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(ordinary, transformInput({ name: "   " })),
      "INVALID_CAMPAIGN_STATE",
      /blank/,
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(ordinary, transformInput({ denizenId: DEN_5 })),
      "INVALID_CAMPAIGN_STATE",
    );
    expectCode(
      () => applyTransformNecromancerSoulIntoAlly(ordinary, transformInput({ expectedSoulCount: 9 })),
      "STALE_COMMAND_PRECONDITION",
      /Soul count/,
    );
    expect(ordinary.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(false);
    expect(soulAt(ordinary, "ivory")).toBe(2);
  });

  it("works at a campaign-created Gate under the same typed contract", () => {
    const withGate = applyCreateNecromancerCampaignGate(initialized(), {
      gateId: CAMPAIGN_GATE,
      name: "Nightwell",
      band: "near",
    }).nextState;
    const before = withSouls(withGate, CAMPAIGN_GATE, 2);
    const result = applyTransformNecromancerSoulIntoAlly(before, transformInput({
      gateId: CAMPAIGN_GATE,
      expectedSoulCount: 2,
    }));
    expect(soulAt(result.nextState, CAMPAIGN_GATE)).toBe(1);
    expect(result.nextState.necromancer.allies).toEqual(expect.arrayContaining([{
      denizenId: NEW_DEN,
      location: { kind: "gate", gateId: CAMPAIGN_GATE },
    }]));
  });

  it("fingerprints bind campaign and semantic inputs", () => {
    const input = transformInput();
    const fp = transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, input);
    expect(fp).toMatch(/^transform_necromancer_soul_into_ally:v1:/);
    expect(transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, input)).toBe(fp);
    expect(transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_B, input)).not.toBe(fp);
    expect(transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, transformInput({ name: "Other" }))).not.toBe(fp);
    expect(transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, transformInput({ expectedSoulCount: 3 }))).not.toBe(fp);
    expect(transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, transformInput({ gateId: "amber" }))).not.toBe(fp);
    expect(isLogicalStateCommandType("transform_necromancer_soul_into_ally")).toBe(true);
  });

  it("ordinary-command harness accepts once, replays without double consumption, and rejects command-id payload mismatch", async () => {
    const before = withSouls(initialized(), "ivory", 2);
    const input = transformInput();
    const fingerprint = transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, input);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "transform_necromancer_soul_into_ally",
      commandFingerprint: fingerprint,
      apply: (current) => applyTransformNecromancerSoulIntoAlly(current, input),
    });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeOrdinaryLogicalCommand(first.io, { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A }, prepare);
    expect(receipt).toEqual({ revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events[0]?.type).toBe("necromancer_soul_transformed_into_ally");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 1)).not.toThrow();
    expect(soulAt(first.commits[0]!.nextState, "ivory")).toBe(1);
    expect(first.commits[0]?.nextState.world.denizens.filter((denizen) => denizen.denizenId === NEW_DEN)).toHaveLength(1);

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "transform_necromancer_soul_into_ally", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(replay.io, { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A }, prepare);
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
    expect(soulAt(first.commits[0]!.nextState, "ivory")).toBe(1);
    expect(first.commits[0]?.nextState.world.denizens.filter((denizen) => denizen.denizenId === NEW_DEN)).toHaveLength(1);

    const mismatched = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "transform_necromancer_soul_into_ally", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const other = transformInput({ name: "Revised Mira" });
    await expect(executeOrdinaryLogicalCommand(
      mismatched.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "transform_necromancer_soul_into_ally",
        commandFingerprint: transformNecromancerSoulIntoAllyFingerprint(CAMPAIGN_A, other),
        apply: (current) => applyTransformNecromancerSoulIntoAlly(current, other),
      }),
    )).rejects.toBeInstanceOf(DomainError);
    expect(mismatched.commits).toHaveLength(0);
  });
});
