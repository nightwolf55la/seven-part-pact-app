import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  CampaignEvent,
  CampaignStateV5,
  FaustianCardId,
  FaustianCommunityId,
  FaustianState,
  MonthOrdinal,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_FAUSTIAN_STATE,
  applyAdvancePhase,
  applyCompleteFaustianMachinationResponse,
  applyDiscloseFaustianTwist,
  applyFinalizeFaustianMachinationChallenge,
  applyRecordFaustianMachinationOutcome,
  applyRecordFaustianSchemeOccurred,
  applyRecordFaustianTwistOccurred,
  eligibleFaustianMachinationCleanupCardIds,
  faustianCardId,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  describeActivityEntry,
  previewFaustianSchemeOccurrence,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { campaignEventValidator } from "../convex/validators";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
} from "../convex/ordinaryLogicalCommand";
import { makeTestCampaignStateV5 } from "./test-state";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const WIZ_C = "wiz_00000000-0000-0000-0000-00000000000c" as WizardId;
const ARIES = "aries" as FaustianCommunityId;
const LEO = "leo" as FaustianCommunityId;
const SCHEME = faustianCardId("hearts", "king");
const ACE_HEARTS = faustianCardId("hearts", "ace");
const H5 = faustianCardId("hearts", "5");
const H3 = faustianCardId("hearts", "3");
const H2 = faustianCardId("hearts", "2");
const S5 = faustianCardId("spades", "5");
const D3 = faustianCardId("diamonds", "3");
const TWIST = faustianCardId("spades", "ace");
const OTHER_TWIST = faustianCardId("clubs", "ace");
const HK = faustianCardId("hearts", "king");
const SK = faustianCardId("spades", "king");
const HQ = faustianCardId("hearts", "queen");
const SQ = faustianCardId("spades", "queen");
const H9 = faustianCardId("hearts", "9");
const S9 = faustianCardId("spades", "9");
const C9 = faustianCardId("clubs", "9");
const D9 = faustianCardId("diamonds", "9");
const H8 = faustianCardId("hearts", "8");
const S8 = faustianCardId("spades", "8");
const C8 = faustianCardId("clubs", "8");
const D8 = faustianCardId("diamonds", "8");
const H7 = faustianCardId("hearts", "7");
const S7 = faustianCardId("spades", "7");
const C4 = faustianCardId("clubs", "4");

function expectCode(run: () => unknown, code: DomainError["code"]): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
  }
}

function take(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  return { ...faustian, faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)) };
}

function wizard(wizardId: WizardId, name: string) {
  return {
    wizardId,
    name,
    portrayedByPlayerId: PLR_A,
    character: {
      elements: { air: 1, fire: 1, earth: 1, water: 1 },
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: 40,
      publicChangesOfMagic: [],
      importantNotes: null,
    },
    homeIsleId: null,
    sanctumPlaceId: null,
    mortalityState: "not_deceased" as const,
  };
}

function playState(faustian: FaustianState): CampaignStateV5 {
  const state = makeTestCampaignStateV5({
    calendar: { monthOrdinal: 3 as MonthOrdinal },
    configuration: { ageId: "dominion", facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A, "A"), wizard(WIZ_B, "B"), wizard(WIZ_C, "C")],
    faustian,
  });
  return {
    ...state,
    pactSeats: {
      ...state.pactSeats,
      faustian: { ...state.pactSeats.faustian, wizardId: WIZ_A },
    },
    lifecycle: {
      kind: "play",
      phase: "story",
      orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as never,
      currentMonth: { timeParticipants: [], engagements: [], wizardmootAttendance: null },
    },
  };
}

function campaignOf(state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCampaign["docId"],
    campaignId: CAMPAIGN_A,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null;
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
      return options.campaign.currentState;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

function findValidatorMembers(
  validator: { kind?: string; members?: unknown[]; fields?: Record<string, { kind?: string; value?: unknown }> },
  type: string,
  version: number,
): unknown[] {
  if (validator.kind === "union") {
    return (validator.members as Array<{ kind?: string }>).flatMap((member) =>
      findValidatorMembers(member as never, type, version),
    );
  }
  if (validator.kind === "object") {
    const typeField = validator.fields?.type;
    const versionField = validator.fields?.version;
    if (typeField?.value === type && versionField?.value === version) return [validator];
  }
  return [];
}

function activityText(event: CampaignEvent): string {
  return describeActivityEntry(mapEventToActivityEntry("evt_1", 9, event));
}

function communityFaustian(patch: {
  readonly ariesSchemes?: FaustianState["communities"][number]["schemes"];
  readonly ariesAccomplices?: readonly FaustianCardId[];
  readonly leoAccomplices?: readonly FaustianCardId[];
  readonly extra?: Partial<FaustianState>;
}): FaustianState {
  const used = [
    ...(patch.ariesSchemes?.map((scheme) => scheme.cardId) ?? []),
    ...(patch.ariesAccomplices ?? []),
    ...(patch.leoAccomplices ?? []),
    ...(patch.extra?.machinations?.map((card) => card.cardId) ?? []),
    ...(patch.extra?.defeatedSchemes ?? []),
    ...(patch.extra?.devilDeck ?? []),
    ...(patch.extra?.setAsideHand ?? []),
    ...(patch.extra?.activeTwistCardIds ?? []),
  ];
  return {
    ...take(EMPTY_FAUSTIAN_STATE, used),
    communities: EMPTY_FAUSTIAN_STATE.communities.map((community) => {
      if (community.communityId === ARIES) {
        return {
          ...community,
          schemes: patch.ariesSchemes ?? [],
          accompliceCardIds: patch.ariesAccomplices ?? [],
        };
      }
      if (community.communityId === LEO) {
        return { ...community, accompliceCardIds: patch.leoAccomplices ?? [] };
      }
      return community;
    }),
    ...patch.extra,
  };
}

describe("Body C Scheme occurrence", () => {
  it("leaves zero local Accomplices without a direct fall", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
    }));
    const result = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [],
      expectedLocalAccompliceCardIds: [],
    });
    expect(result.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.schemes).toEqual([]);
    expect(result.nextState.faustian.machinations).toEqual([{ cardId: SCHEME, facing: "face_up" }]);
    expect(result.nextState.faustian.devilDeck).toEqual([]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("auto-falls the single local Accomplice and replaces it with a Pawn", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
      ariesAccomplices: [H5],
    }));
    const result = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [],
      expectedLocalAccompliceCardIds: [H5],
    });
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES)!;
    expect(aries.accompliceCardIds).toEqual([]);
    expect(aries.pawnCount).toBe(1);
    expect(result.nextState.faustian.devilDeck).toEqual([H5]);
  });

  it("requires an explicit direct set when multiple locals exist", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
      ariesAccomplices: [H5, S5],
    }));
    const none = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [],
      expectedLocalAccompliceCardIds: [H5, S5],
    });
    expect(none.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.accompliceCardIds).toEqual([H5, S5]);
    const onlyHearts = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [H5],
      expectedLocalAccompliceCardIds: [H5, S5],
    });
    expect(onlyHearts.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.accompliceCardIds).toEqual([S5]);
  });

  it("cascades globally to lower same-suit ordinary Accomplices and deduplicates", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
      ariesAccomplices: [H5, H3],
      leoAccomplices: [H2, D3],
    }));
    const result = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [H5],
      expectedLocalAccompliceCardIds: [H5, H3],
    });
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES)!;
    const leo = result.nextState.faustian.communities.find((community) => community.communityId === LEO)!;
    expect(aries.accompliceCardIds).toEqual([]);
    expect(aries.pawnCount).toBe(2);
    expect(leo.accompliceCardIds).toEqual([D3]);
    expect(leo.pawnCount).toBe(1);
    expect(new Set(result.nextState.faustian.devilDeck)).toEqual(new Set([H5, H3, H2]));
    expect(result.nextState.faustian.devilDeck).toHaveLength(3);
  });

  it("lets a directly affected Ace fall without cascading, and does not cascade onto another Ace", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
      ariesAccomplices: [ACE_HEARTS],
      leoAccomplices: [H2],
    }));
    const aceDirect = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [ACE_HEARTS],
      expectedLocalAccompliceCardIds: [ACE_HEARTS],
    });
    expect(aceDirect.nextState.faustian.devilDeck).toEqual([ACE_HEARTS]);
    expect(aceDirect.nextState.faustian.communities.find((community) => community.communityId === LEO)?.accompliceCardIds).toEqual([H2]);

    const kingStart = playState(communityFaustian({
      ariesSchemes: [{ cardId: SK, facing: "face_up" }],
      ariesAccomplices: [HK],
      leoAccomplices: [ACE_HEARTS, H2],
    }));
    const king = applyRecordFaustianSchemeOccurred(kingStart, {
      communityId: ARIES,
      schemeCardId: SK,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [HK],
      expectedLocalAccompliceCardIds: [HK],
    });
    expect(king.nextState.faustian.communities.find((community) => community.communityId === LEO)?.accompliceCardIds).toEqual([ACE_HEARTS]);
    expect(new Set(king.nextState.faustian.devilDeck)).toEqual(new Set([HK, H2]));
  });

  it("supports possession and Domain destinations and rejects invalid holders atomically", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
    }));
    const before = structuredClone(start);
    expectCode(() => applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "possession", wizardId: "wiz_00000000-0000-0000-0000-00000000dead" as WizardId, represented: { kind: "none" } },
      directAccompliceCardIds: [],
      expectedLocalAccompliceCardIds: [],
    }), "INVALID_CAMPAIGN_STATE");
    expect(start.faustian).toEqual(before.faustian);

    const possession = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "possession", wizardId: WIZ_A, represented: { kind: "none" } },
      directAccompliceCardIds: [],
      expectedLocalAccompliceCardIds: [],
    });
    expect(possession.nextState.faustian.possessions).toEqual([{
      cardId: SCHEME,
      wizardId: WIZ_A,
      represented: { kind: "none" },
    }]);

    const domain = applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: SCHEME,
      destination: { kind: "domain_placement", seatId: "hierophant", represented: { kind: "none" } },
      directAccompliceCardIds: [],
      expectedLocalAccompliceCardIds: [],
    });
    expect(domain.nextState.faustian.domainPlacements).toEqual([{
      cardId: SCHEME,
      seatId: "hierophant",
      represented: { kind: "none" },
    }]);
  });

  it("rejects a stale selected Scheme with zero partial changes", () => {
    const start = playState(communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
      ariesAccomplices: [H5],
    }));
    const before = structuredClone(start);
    expectCode(() => applyRecordFaustianSchemeOccurred(start, {
      communityId: ARIES,
      schemeCardId: H3,
      destination: { kind: "ordinary_machinations" },
      directAccompliceCardIds: [H5],
      expectedLocalAccompliceCardIds: [H5],
    }), "INVALID_CAMPAIGN_STATE");
    expect(start).toEqual(before);
  });

  it("previews cascade from the captured table without inventing hidden identities", () => {
    const faustian = communityFaustian({
      ariesSchemes: [{ cardId: SCHEME, facing: "face_up" }],
      ariesAccomplices: [H5],
      leoAccomplices: [H2],
    });
    const preview = previewFaustianSchemeOccurrence(faustian, ARIES, SCHEME, [H5]);
    expect(preview.directAccompliceCardIds).toEqual([H5]);
    expect(preview.cascadedAccompliceCardIds).toEqual([H2]);
    expect(preview.fallenAccompliceCardIds).toEqual([H5, H2]);
  });
});

describe("Body C Twist lifecycle", () => {
  function twistTable(deck: readonly FaustianCardId[] = [H7]): FaustianState {
    return {
      ...take(EMPTY_FAUSTIAN_STATE, [TWIST, OTHER_TWIST, ...deck, SK]),
      machinations: [
        { cardId: TWIST, facing: "face_down" },
        { cardId: OTHER_TWIST, facing: "face_down" },
      ],
      activeTwistCardIds: [TWIST, OTHER_TWIST],
      devilDeck: [SK],
      faustianDeck: [...take(EMPTY_FAUSTIAN_STATE, [TWIST, OTHER_TWIST, SK, ...deck]).faustianDeck, ...deck],
    };
  }

  it("discloses a Twist with a server-chosen replacement and keeps other active Twists", () => {
    const start = playState(twistTable([H7]));
    const result = applyDiscloseFaustianTwist(start, { twistCardId: TWIST });
    expect(result.nextState.faustian.machinations.find((card) => card.cardId === TWIST)?.facing).toBe("face_up");
    expect(result.nextState.faustian.activeTwistCardIds).not.toContain(TWIST);
    expect(result.nextState.faustian.activeTwistCardIds).toContain(OTHER_TWIST);
    expect(result.nextState.faustian.activeTwistCardIds).toHaveLength(2);
    expect(result.nextState.faustian.machinations).toHaveLength(3);
    expect(result.events[0]).toMatchObject({ type: "faustian_twist_disclosed", version: 1 });
  });

  it("replays an accepted Twist disclosure without rerolling", async () => {
    const start = playState(twistTable([H7, S7]));
    const fingerprint = `disclose_faustian_twist:v1:test`;
    const first = recordingIo({ campaign: campaignOf(start, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "disclose_faustian_twist",
        commandFingerprint: fingerprint,
        apply: (current) => applyDiscloseFaustianTwist(current, { twistCardId: TWIST }),
      }),
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 5)).not.toThrow();
    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "disclose_faustian_twist", commandFingerprint: fingerprint, campaignRevision: 5 },
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "disclose_faustian_twist",
        commandFingerprint: fingerprint,
        apply: () => {
          throw new Error("must not reroll");
        },
      }),
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("rejects an empty replacement supply with no mutation", () => {
    const empty = playState({
      ...take(EMPTY_FAUSTIAN_STATE, [TWIST]),
      faustianDeck: [],
      machinations: [{ cardId: TWIST, facing: "face_down" }],
      activeTwistCardIds: [TWIST],
    });
    const before = structuredClone(empty);
    expectCode(() => applyDiscloseFaustianTwist(empty, { twistCardId: TWIST }), "INVALID_CAMPAIGN_STATE");
    expect(empty).toEqual(before);
  });

  it("rejects independently disclosing a reserved Twist", () => {
    const reserved = applyRecordFaustianMachinationOutcome(
      playState(machinationTable([HK, SK, HQ, H8, H7])),
      {
        scoringHandCardIds: [HK, SK, HQ, H8, H7],
        result: { kind: "one_pair" },
        expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(machinationTable([HK, SK, HQ, H8, H7])),
        outcomeDependentTwistCardIds: [TWIST],
      },
    );
    const before = structuredClone(reserved.nextState);
    expectCode(() => applyDiscloseFaustianTwist(reserved.nextState, { twistCardId: TWIST }), "INVALID_CAMPAIGN_STATE");
    expect(reserved.nextState).toEqual(before);
  });

  it("records Twist occurrence by moving Devil's Deck into Machinations without choosing a Machination result", () => {
    const start = playState(twistTable());
    const result = applyRecordFaustianTwistOccurred(start, { twistCardId: TWIST });
    expect(result.nextState.faustian.devilDeck).toEqual([]);
    expect(result.nextState.faustian.machinations.map((card) => card.cardId)).toEqual([TWIST, OTHER_TWIST, SK]);
    expect(result.nextState.faustian.activeTwistCardIds).toEqual([TWIST, OTHER_TWIST]);
    expect(result.nextState.faustian.pendingMachinationChallenges).toEqual([]);
  });
});

function machinationTable(cardIds: readonly FaustianCardId[], twists: readonly FaustianCardId[] = [TWIST]): FaustianState {
  const used = [...cardIds, ...twists];
  return {
    ...take(EMPTY_FAUSTIAN_STATE, used),
    machinations: [
      ...twists.map((cardId) => ({ cardId, facing: "face_down" as const })),
      ...cardIds.map((cardId) => ({ cardId, facing: "face_up" as const })),
    ],
    activeTwistCardIds: [...twists],
  };
}

describe("Body C delayed Machination challenges", () => {
  it("creates One Pair with source/due ordinals, set-aside holdings, and reserved Twist metadata", () => {
    const start = playState(machinationTable([HK, SK, HQ, H8, H7], [TWIST, OTHER_TWIST]));
    const result = applyRecordFaustianMachinationOutcome(start, {
      scoringHandCardIds: [HK, SK, HQ, H8, H7],
      result: { kind: "one_pair" },
      expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(start.faustian),
      outcomeDependentTwistCardIds: [TWIST],
    });
    const challenge = result.nextState.faustian.pendingMachinationChallenges[0]!;
    expect(challenge.kind).toBe("one_pair");
    expect(challenge.sourceMonthOrdinal).toBe(3);
    expect(challenge.dueMonthOrdinal).toBe(4);
    expect(challenge.challengeId).toMatch(/^fpmc_/);
    expect(challenge.groups[0]!.groupId).toMatch(/^fpmg_/);
    expect(challenge.groups[0]!.responsibleWizardId).toBeNull();
    expect(challenge.groups[0]!.originalCardIds).toEqual([HK, SK, HQ, H8, H7]);
    expect(result.nextState.faustian.setAsideHand).toEqual([HK, SK, HQ, H8, H7]);
    expect(result.nextState.faustian.machinations.map((card) => card.cardId)).toEqual([TWIST, OTHER_TWIST]);
    expect(challenge.outcomeDependentTwistCardIds).toEqual([TWIST]);
    expect(result.nextState.faustian.activeTwistCardIds).toEqual([TWIST, OTHER_TWIST]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("creates Two Pair and Three of a Kind with distinct Wizards and entrusted holdings", () => {
    const twoStart = playState(machinationTable([HK, SK, HQ, SQ, H8]));
    const two = applyRecordFaustianMachinationOutcome(twoStart, {
      scoringHandCardIds: [HK, SK, HQ, SQ, H8],
      result: {
        kind: "two_pair",
        groups: [
          { cardIds: [HK, SK], responsibleWizardId: WIZ_A },
          { cardIds: [HQ, SQ], responsibleWizardId: WIZ_B },
        ],
      },
      expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(twoStart.faustian),
      outcomeDependentTwistCardIds: [],
    });
    expect(two.nextState.faustian.pendingMachinationChallenges[0]!.groups).toHaveLength(2);
    expect(two.nextState.faustian.entrustedCards).toEqual([
      { cardId: HK, wizardId: WIZ_A },
      { cardId: SK, wizardId: WIZ_A },
      { cardId: HQ, wizardId: WIZ_B },
      { cardId: SQ, wizardId: WIZ_B },
    ]);
    expect(two.nextState.faustian.faustianDeck).toContain(H8);

    const threeStart = playState(machinationTable([H9, S9, C9, H8, S7]));
    const three = applyRecordFaustianMachinationOutcome(threeStart, {
      scoringHandCardIds: [H9, S9, C9, H8, S7],
      result: {
        kind: "three_of_a_kind",
        groups: [
          { cardId: H9, responsibleWizardId: WIZ_A },
          { cardId: S9, responsibleWizardId: WIZ_B },
          { cardId: C9, responsibleWizardId: WIZ_C },
        ],
      },
      expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(threeStart.faustian),
      outcomeDependentTwistCardIds: [TWIST],
    });
    expect(three.nextState.faustian.pendingMachinationChallenges[0]!.groups).toHaveLength(3);
    expect(three.nextState.faustian.entrustedCards.map((card) => card.cardId)).toEqual([H9, S9, C9]);
    expect(three.nextState.faustian.pendingMachinationChallenges[0]!.outcomeDependentTwistCardIds).toEqual([TWIST]);
  });

  it("records a Flush immediately with explicit Twist disposition and cleanup", () => {
    const start = playState(machinationTable([H9, H8, H7, HQ, HK]));
    const result = applyRecordFaustianMachinationOutcome(start, {
      scoringHandCardIds: [H9, H8, H7, HQ, HK],
      result: {
        kind: "flush",
        suit: "hearts",
        twistDispositions: [{ cardId: TWIST, destination: "remain_face_up_in_machinations" }],
      },
      expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(start.faustian),
      outcomeDependentTwistCardIds: [TWIST],
    });
    expect(result.nextState.faustian.pendingMachinationChallenges).toEqual([]);
    expect(result.nextState.faustian.resolvedFlushSuits).toEqual(["hearts"]);
    expect(result.nextState.faustian.persistentMachinationEffects).toEqual([{ kind: "flush", suit: "hearts" }]);
    expect(result.nextState.faustian.activeTwistCardIds).not.toContain(TWIST);
    expect(result.nextState.faustian.machinations.find((card) => card.cardId === TWIST)?.facing).toBe("face_up");
  });

  it("rejects a stale cleanup basis without sweeping later cards", () => {
    const start = playState({
      ...machinationTable([HK, SK, HQ, H8, H7]),
      defeatedSchemes: [C4],
      faustianDeck: take(EMPTY_FAUSTIAN_STATE, [TWIST, HK, SK, HQ, H8, H7, C4]).faustianDeck,
    });
    const captured = eligibleFaustianMachinationCleanupCardIds({
      ...start.faustian,
      defeatedSchemes: [],
    });
    const before = structuredClone(start);
    expectCode(() => applyRecordFaustianMachinationOutcome(start, {
      scoringHandCardIds: [HK, SK, HQ, H8, H7],
      result: { kind: "one_pair" },
      expectedCleanupCardIds: captured,
      outcomeDependentTwistCardIds: [],
    }), "STALE_COMMAND_PRECONDITION");
    expect(start).toEqual(before);
    expect(start.faustian.defeatedSchemes).toEqual([C4]);
  });

  it("rejects reserving an already reserved Twist", () => {
    const first = applyRecordFaustianMachinationOutcome(
      playState(machinationTable([HK, SK, HQ, H8, H7])),
      {
        scoringHandCardIds: [HK, SK, HQ, H8, H7],
        result: { kind: "one_pair" },
        expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(machinationTable([HK, SK, HQ, H8, H7])),
        outcomeDependentTwistCardIds: [TWIST],
      },
    );
    const secondTable: FaustianState = {
      ...first.nextState.faustian,
      machinations: [
        ...first.nextState.faustian.machinations,
        { cardId: H7, facing: "face_up" },
        { cardId: S7, facing: "face_up" },
        { cardId: C8, facing: "face_up" },
        { cardId: D8, facing: "face_up" },
        { cardId: H2, facing: "face_up" },
      ],
      faustianDeck: first.nextState.faustian.faustianDeck.filter((id) => ![H7, S7, C8, D8, H2].includes(id)),
    };
    expectCode(() => applyRecordFaustianMachinationOutcome(playState(secondTable), {
      scoringHandCardIds: [H7, S7, C8, D8, H2],
      result: { kind: "one_pair" },
      expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(secondTable),
      outcomeDependentTwistCardIds: [TWIST],
    }), "INVALID_CAMPAIGN_STATE");
  });
});

describe("Body C response, month, and finalization", () => {
  function onePairState() {
    return applyRecordFaustianMachinationOutcome(
      playState(machinationTable([HK, SK, HQ, H8, H7])),
      {
        scoringHandCardIds: [HK, SK, HQ, H8, H7],
        result: { kind: "one_pair" },
        expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(machinationTable([HK, SK, HQ, H8, H7])),
        outcomeDependentTwistCardIds: [TWIST],
      },
    );
  }

  it("completes a response, keeps Twist reserved, and leaves historical metadata", () => {
    const created = onePairState();
    const challenge = created.nextState.faustian.pendingMachinationChallenges[0]!;
    const completed = applyCompleteFaustianMachinationResponse(created.nextState, {
      challengeId: challenge.challengeId,
      groupId: challenge.groups[0]!.groupId,
      completedByWizardId: WIZ_B,
    });
    const after = completed.nextState.faustian.pendingMachinationChallenges[0]!;
    expect(after.groups[0]!.status).toBe("completed");
    expect(after.groups[0]!.completedByWizardId).toBe(WIZ_B);
    expect(after.groups[0]!.originalCardIds).toEqual([HK, SK, HQ, H8, H7]);
    expect(completed.nextState.faustian.setAsideHand).toEqual([]);
    expect(completed.nextState.faustian.faustianDeck).toEqual(expect.arrayContaining([HK, SK, HQ, H8, H7]));
    expect(after.outcomeDependentTwistCardIds).toEqual([TWIST]);
    expect(completed.nextState.faustian.machinations.map((card) => card.cardId)).toContain(TWIST);
    expect(completed.nextState.faustian.pendingMachinationChallenges).toHaveLength(1);
  });

  it("keeps another Two Pair group pending and allows a released card to move later", () => {
    const created = applyRecordFaustianMachinationOutcome(
      playState(machinationTable([HK, SK, HQ, SQ, H8])),
      {
        scoringHandCardIds: [HK, SK, HQ, SQ, H8],
        result: {
          kind: "two_pair",
          groups: [
            { cardIds: [HK, SK], responsibleWizardId: WIZ_A },
            { cardIds: [HQ, SQ], responsibleWizardId: WIZ_B },
          ],
        },
        expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(machinationTable([HK, SK, HQ, SQ, H8])),
        outcomeDependentTwistCardIds: [],
      },
    );
    const challenge = created.nextState.faustian.pendingMachinationChallenges[0]!;
    const completed = applyCompleteFaustianMachinationResponse(created.nextState, {
      challengeId: challenge.challengeId,
      groupId: challenge.groups[0]!.groupId,
      completedByWizardId: WIZ_A,
    });
    expect(completed.nextState.faustian.pendingMachinationChallenges[0]!.groups[0]!.status).toBe("completed");
    expect(completed.nextState.faustian.pendingMachinationChallenges[0]!.groups[1]!.status).toBe("pending");
    expect(completed.nextState.faustian.entrustedCards.map((card) => card.cardId)).toEqual([HQ, SQ]);
    const released = completed.nextState.faustian;
    const moved: FaustianState = {
      ...released,
      faustianDeck: released.faustianDeck.filter((id) => id !== HK),
      defeatedSchemes: [...released.defeatedSchemes, HK],
    };
    expect(() => validateCampaignStateV5Candidate(playState(moved))).not.toThrow();
  });

  it("does not resolve a challenge when the month/phase advances", () => {
    const created = onePairState();
    const advanced = applyAdvancePhase(created.nextState, {
      expectedMonthOrdinal: 3 as MonthOrdinal,
      expectedPhase: "story",
      acknowledgedWarningKeys: [],
    });
    if (advanced.outcome !== "applied") throw new Error("expected phase advance");
    expect(advanced.nextState.faustian.pendingMachinationChallenges).toEqual(created.nextState.faustian.pendingMachinationChallenges);
    expect(advanced.nextState.faustian.setAsideHand).toEqual(created.nextState.faustian.setAsideHand);
  });

  it("keeps an all-complete challenge until explicit finalize releases reservations", () => {
    const created = onePairState();
    const challenge = created.nextState.faustian.pendingMachinationChallenges[0]!;
    const completed = applyCompleteFaustianMachinationResponse(created.nextState, {
      challengeId: challenge.challengeId,
      groupId: challenge.groups[0]!.groupId,
      completedByWizardId: WIZ_A,
    });
    expect(completed.nextState.faustian.pendingMachinationChallenges).toHaveLength(1);
    const finalized = applyFinalizeFaustianMachinationChallenge(completed.nextState, {
      challengeId: challenge.challengeId,
      pendingHoldingDisposition: "shuffle_into_faustian_deck",
      twistDispositions: [{ cardId: TWIST, destination: "remain_face_up_in_machinations" }],
    });
    expect(finalized.nextState.faustian.pendingMachinationChallenges).toEqual([]);
    expect(finalized.nextState.faustian.activeTwistCardIds).not.toContain(TWIST);
    expect(finalized.nextState.faustian.machinations.find((card) => card.cardId === TWIST)?.facing).toBe("face_up");
    expect(() => validateCampaignStateV5Candidate(finalized.nextState)).not.toThrow();
  });

  it("identifies an unresolved group at finalize and routes remaining holdings", () => {
    const created = applyRecordFaustianMachinationOutcome(
      playState(machinationTable([H9, S9, C9, H8, S7])),
      {
        scoringHandCardIds: [H9, S9, C9, H8, S7],
        result: {
          kind: "three_of_a_kind",
          groups: [
            { cardId: H9, responsibleWizardId: WIZ_A },
            { cardId: S9, responsibleWizardId: WIZ_B },
            { cardId: C9, responsibleWizardId: WIZ_C },
          ],
        },
        expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(machinationTable([H9, S9, C9, H8, S7])),
        outcomeDependentTwistCardIds: [TWIST],
      },
    );
    const challenge = created.nextState.faustian.pendingMachinationChallenges[0]!;
    expect(challenge.groups.filter((group) => group.status === "pending")).toHaveLength(3);
    const finalized = applyFinalizeFaustianMachinationChallenge(created.nextState, {
      challengeId: challenge.challengeId,
      pendingHoldingDisposition: "shuffle_into_devil_deck",
      twistDispositions: [{ cardId: TWIST, destination: "move_to_defeated_schemes" }],
    });
    expect(finalized.nextState.faustian.pendingMachinationChallenges).toEqual([]);
    expect(new Set(finalized.nextState.faustian.devilDeck)).toEqual(new Set([H9, S9, C9]));
    expect(finalized.nextState.faustian.defeatedSchemes).toContain(TWIST);
  });

  it("keeps the exact 52-card partition after a representative lifecycle", () => {
    const created = onePairState();
    const challenge = created.nextState.faustian.pendingMachinationChallenges[0]!;
    const completed = applyCompleteFaustianMachinationResponse(created.nextState, {
      challengeId: challenge.challengeId,
      groupId: challenge.groups[0]!.groupId,
      completedByWizardId: WIZ_A,
    });
    const finalized = applyFinalizeFaustianMachinationChallenge(completed.nextState, {
      challengeId: challenge.challengeId,
      pendingHoldingDisposition: "shuffle_into_faustian_deck",
      twistDispositions: [{ cardId: TWIST, destination: "recycle_into_faustian_deck" }],
    });
    expect(() => validateCampaignStateV5Candidate(finalized.nextState)).not.toThrow();
  });
});

describe("Body C event registration", () => {
  it("registers lifecycle commands and persisted events without leaking hidden card identity", () => {
    for (const commandType of [
      "record_faustian_scheme_occurred",
      "disclose_faustian_twist",
      "record_faustian_twist_occurred",
      "record_faustian_machination_outcome",
      "complete_faustian_machination_response",
      "finalize_faustian_machination_challenge",
    ]) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
      expect(isLogicalStateCommandType(commandType as typeof CAMPAIGN_COMMAND_TYPES[number])).toBe(true);
    }
    for (const [type] of [
      ["faustian_scheme_occurred"],
      ["faustian_twist_disclosed"],
      ["faustian_twist_occurred"],
      ["faustian_machination_outcome_recorded"],
      ["faustian_machination_response_completed"],
      ["faustian_machination_challenge_finalized"],
    ] as const) {
      expect(findValidatorMembers(campaignEventValidator as never, type, 1).length).toBe(1);
    }
    const events: CampaignEvent[] = [
      { type: "faustian_scheme_occurred", version: 1, data: { communityId: ARIES, schemeCardId: SCHEME, destination: { kind: "ordinary_machinations" }, directAccompliceCardIds: [H5], cascadedAccompliceCardIds: [H2], fallenAccompliceCardIds: [H5, H2], pawnCommunityIds: [ARIES, LEO] } },
      { type: "faustian_twist_disclosed", version: 1, data: { disclosedTwistCardId: TWIST, replacementTwistCardId: H7 } },
      { type: "faustian_twist_occurred", version: 1, data: { twistCardId: TWIST, movedDevilDeckCardIds: [SK] } },
      { type: "faustian_machination_outcome_recorded", version: 1, data: { resultKind: "one_pair", scoringHandCardIds: [HK, SK, HQ, H8, H7], challengeId: "fpmc_00000000-0000-0000-0000-000000000001", recycledCardIds: [C4], outcomeDependentTwistCardIds: [TWIST], persistentEffect: null } },
      { type: "faustian_machination_response_completed", version: 1, data: { challengeId: "fpmc_00000000-0000-0000-0000-000000000001", groupId: "fpmg_00000000-0000-0000-0000-000000000001", completedByWizardId: WIZ_A, completedMonthOrdinal: 3 as MonthOrdinal, recycledCardIds: [HK] } },
      { type: "faustian_machination_challenge_finalized", version: 1, data: { challengeId: "fpmc_00000000-0000-0000-0000-000000000001", pendingHoldingDisposition: "shuffle_into_faustian_deck", routedCardIds: [], twistDispositions: [{ cardId: TWIST, destination: "remain_face_up_in_machinations" }] } },
    ];
    for (const event of events) {
      const text = activityText(event);
      expect(text).not.toMatch(/hearts_king|spades_ace|Five of Hearts|King of Hearts|hearts_5/i);
    }
    const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");
    for (const name of [
      "recordFaustianSchemeOccurred",
      "discloseFaustianTwist",
      "recordFaustianTwistOccurred",
      "recordFaustianMachinationOutcome",
      "completeFaustianMachinationResponse",
      "finalizeFaustianMachinationChallenge",
    ]) {
      expect(source).toContain(`export const ${name} = mutation({`);
    }
  });
});
