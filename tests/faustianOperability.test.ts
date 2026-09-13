import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import type {
  CampaignEvent,
  CampaignStateV5,
  DenizenId,
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
  FAUSTIAN_DEVIL_FORM_IDS,
  FAUSTIAN_DEVIL_LAW_IDS,
  applyArrangeFaustianTable,
  applyBlackmailFaustianCommunity,
  applyChangeFaustianPawnCount,
  applyCompleteFaustianStructuralPlaceholder,
  applyEstablishFaustianConspiracy,
  applyFoilFaustianCommunityScheme,
  applyPlaceFaustianSchemes,
  applyRevealFaustianCommunitySchemes,
  arrangeFaustianTableFingerprint,
  blackmailFaustianCommunityFingerprint,
  buildInitializedDefaultFaustianState,
  completedTwentyYearScores,
  faustianCardId,
  foilFaustianCommunitySchemeFingerprint,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  describeActivityEntry,
  placeFaustianSchemesFingerprint,
  revealFaustianCommunitySchemesFingerprint,
  validateCampaignStateV5Candidate,
  validateFaustianStructure,
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
const COMMAND_2 = "cmd_00000000-0000-0000-0000-000000000002";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const ARIES = "aries" as FaustianCommunityId;
const LEO = "leo" as FaustianCommunityId;
const SCHEME_A = faustianCardId("hearts", "king");
const SCHEME_B = faustianCardId("hearts", "3");
const SCHEME_C = faustianCardId("clubs", "4");
const EXISTING_ACCOMPLICE = faustianCardId("clubs", "7");
const TWO_HEARTS = faustianCardId("hearts", "2");
const LOW = ["ace", "2", "3", "4"] as const;
const MID = ["5", "6", "7", "8"] as const;

function defaultInitForms() {
  return {
    casual: FAUSTIAN_DEVIL_FORM_IDS.slice(0, 3),
    special: FAUSTIAN_DEVIL_FORM_IDS.slice(3, 5),
    duress: FAUSTIAN_DEVIL_FORM_IDS.slice(5, 6),
  };
}

function helperFaustian(): FaustianState {
  return buildInitializedDefaultFaustianState({
    selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1]],
    activeTwistCardId: faustianCardId("spades", "ace"),
    selectedDevilForms: defaultInitForms(),
  });
}

function take(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  return { ...faustian, faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)) };
}

function rankOf(cardId: FaustianCardId): string {
  return cardId.slice(cardId.indexOf("_") + 1);
}

function suitOf(cardId: FaustianCardId): string {
  return cardId.slice(0, cardId.indexOf("_"));
}

function expectCode(run: () => unknown, code: DomainError["code"]): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
  }
}

function baseSetup(faustian: FaustianState = EMPTY_FAUSTIAN_STATE): CampaignStateV5 {
  const state = makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: "awakening", facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
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
      mortalityState: "not_deceased",
    }],
    faustian,
  });
  return {
    ...state,
    pactSeats: {
      ...state.pactSeats,
      faustian: { ...state.pactSeats.faustian, wizardId: WIZ_A },
    },
  };
}

function playState(faustian: FaustianState): CampaignStateV5 {
  const setup = baseSetup(faustian);
  return {
    ...setup,
    lifecycle: {
      kind: "play",
      phase: "story",
      orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as never,
      currentMonth: {
        timeParticipants: [],
        engagements: [],
        wizardmootAttendance: null,
      },
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
    if (typeField?.kind === "literal" && typeField.value === type && versionField?.kind === "literal" && versionField.value === version) {
      return [validator];
    }
  }
  return [];
}

function activityText(event: CampaignEvent): string {
  return describeActivityEntry(mapEventToActivityEntry("evt_1", 9, event));
}

function quietInput(state: CampaignStateV5) {
  return {
    arrangementId: "quiet" as const,
    favoriteCommunityId: ARIES,
    pawnCommunityId: null,
    reservedTwistCardId: TWO_HEARTS,
    expectedFaustian: state.faustian,
    expectedAgeId: "awakening" as const,
    expectedAgeYears: null,
    expectedElements: null,
    calamityAntagonist: null,
  };
}

describe("Faustian investigation stages", () => {
  it("Stage 1 eligible set includes already face-up A and newly revealed B; Stage 2 foils only A after later C arrives", () => {
    let faustian = take(EMPTY_FAUSTIAN_STATE, [SCHEME_A, SCHEME_B]);
    faustian = {
      ...faustian,
      communities: faustian.communities.map((community) =>
        community.communityId === ARIES
          ? {
            ...community,
            schemes: [
              { cardId: SCHEME_A, facing: "face_up" },
              { cardId: SCHEME_B, facing: "face_down" },
            ],
          }
          : community
      ),
    };
    const start = baseSetup(faustian);
    const revealed = applyRevealFaustianCommunitySchemes(start, ARIES, start.faustian);
    expect(revealed.events[0]).toMatchObject({
      type: "faustian_community_schemes_revealed",
      version: 1,
      data: {
        communityId: ARIES,
        revealedSchemeCardIds: [SCHEME_B],
        eligibleSchemeCardIds: [SCHEME_A, SCHEME_B],
      },
    });
    const ariesAfterReveal = revealed.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    expect(ariesAfterReveal?.schemes).toEqual([
      { cardId: SCHEME_A, facing: "face_up" },
      { cardId: SCHEME_B, facing: "face_up" },
    ]);

    const withLaterC: FaustianState = {
      ...take(revealed.nextState.faustian, [SCHEME_C]),
      communities: revealed.nextState.faustian.communities.map((community) =>
        community.communityId === ARIES
          ? { ...community, schemes: [...community.schemes, { cardId: SCHEME_C, facing: "face_down" }] }
          : community
      ),
    };
    const afterC = { ...revealed.nextState, faustian: withLaterC };
    expectCode(
      () => applyFoilFaustianCommunityScheme(afterC, ARIES, SCHEME_A, revealed.nextState.faustian),
      "STALE_COMMAND_PRECONDITION",
    );

    const foil = applyFoilFaustianCommunityScheme(afterC, ARIES, SCHEME_A, withLaterC);
    const ariesAfterFoil = foil.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    expect(foil.nextState.faustian.defeatedSchemes).toEqual([SCHEME_A]);
    expect(ariesAfterFoil?.schemes).toEqual([
      { cardId: SCHEME_B, facing: "face_up" },
      { cardId: SCHEME_C, facing: "face_down" },
    ]);
    expect(foil.events[0]?.type).toBe("faustian_community_scheme_foiled");
    expect(() => validateFaustianStructure(foil.nextState.faustian)).not.toThrow();
  });

  it("rejects Stage 2 when the chosen card moved elsewhere and moves nothing else", () => {
    let faustian = take(EMPTY_FAUSTIAN_STATE, [SCHEME_A, SCHEME_B]);
    faustian = {
      ...faustian,
      communities: faustian.communities.map((community) =>
        community.communityId === ARIES
          ? { ...community, schemes: [{ cardId: SCHEME_A, facing: "face_up" }, { cardId: SCHEME_B, facing: "face_up" }] }
          : community
      ),
    };
    const start = baseSetup(faustian);
    const moved: FaustianState = {
      ...faustian,
      communities: faustian.communities.map((community) => {
        if (community.communityId === ARIES) {
          return { ...community, schemes: [{ cardId: SCHEME_B, facing: "face_up" }] };
        }
        if (community.communityId === LEO) {
          return { ...community, schemes: [{ cardId: SCHEME_A, facing: "face_up" }] };
        }
        return community;
      }),
    };
    const afterMove = { ...start, faustian: moved };
    expectCode(() => applyFoilFaustianCommunityScheme(afterMove, ARIES, SCHEME_A, moved), "INVALID_CAMPAIGN_STATE");
    expect(afterMove.faustian.defeatedSchemes).toEqual([]);
    expect(afterMove.faustian.communities.find((community) => community.communityId === LEO)?.schemes).toEqual([
      { cardId: SCHEME_A, facing: "face_up" },
    ]);
  });

  it("does not auto-foil after an accepted reveal when the player cancels", () => {
    let faustian = take(EMPTY_FAUSTIAN_STATE, [SCHEME_B]);
    faustian = {
      ...faustian,
      communities: faustian.communities.map((community) =>
        community.communityId === ARIES
          ? { ...community, schemes: [{ cardId: SCHEME_B, facing: "face_down" }] }
          : community
      ),
    };
    const start = baseSetup(faustian);
    const revealed = applyRevealFaustianCommunitySchemes(start, ARIES, start.faustian);
    expect(revealed.nextState.faustian.defeatedSchemes).toEqual([]);
    expect(revealed.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.schemes).toEqual([
      { cardId: SCHEME_B, facing: "face_up" },
    ]);
  });
});

describe("Faustian Blackmail V2 protection", () => {
  it("recruits the top Faustian card, uses all local Accomplices, and appends prevented Schemes in Community order without shuffling", () => {
    const top = faustianCardId("spades", "8");
    let faustian = take(EMPTY_FAUSTIAN_STATE, [top, EXISTING_ACCOMPLICE, SCHEME_A, SCHEME_B, SCHEME_C, faustianCardId("diamonds", "king")]);
    faustian = {
      ...faustian,
      faustianDeck: [top, ...faustian.faustianDeck],
      devilDeck: [faustianCardId("diamonds", "king")],
      communities: faustian.communities.map((community) =>
        community.communityId === ARIES
          ? {
            ...community,
            accompliceCardIds: [EXISTING_ACCOMPLICE],
            schemes: [
              { cardId: SCHEME_A, facing: "face_up" },
              { cardId: SCHEME_B, facing: "face_down" },
              { cardId: SCHEME_C, facing: "face_down" },
            ],
          }
          : community
      ),
    };
    const start = baseSetup(faustian);
    const beforeDevil = [...start.faustian.devilDeck];
    const result = applyBlackmailFaustianCommunity(start, ARIES, start.faustian);
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    expect(aries?.accompliceCardIds).toEqual([EXISTING_ACCOMPLICE, top]);
    expect(result.events[0]).toMatchObject({
      type: "faustian_community_blackmailed",
      version: 2,
      data: { communityId: ARIES, drawnCardId: top },
    });
    const blackmailEvent = result.events[0];
    expect(blackmailEvent?.type).toBe("faustian_community_blackmailed");
    const prevented = blackmailEvent?.type === "faustian_community_blackmailed" && blackmailEvent.version === 2
      ? blackmailEvent.data.preventedSchemeCardIds
      : [];
    expect(prevented).toEqual([SCHEME_B, SCHEME_C]);
    expect(aries?.schemes).toEqual([{ cardId: SCHEME_A, facing: "face_up" }]);
    expect(result.nextState.faustian.devilDeck).toEqual([...beforeDevil, ...prevented]);
    expect(result.nextState.faustian.devilDeck.slice(0, beforeDevil.length)).toEqual(beforeDevil);
    expect(() => validateFaustianStructure(result.nextState.faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });
});

describe("Faustian Arrange Table", () => {
  it("Quiet partitions to Devil 6, Twist 1, Accomplice 1, Faustian 44 with low/mid recipe ranks", () => {
    const start = baseSetup(EMPTY_FAUSTIAN_STATE);
    const result = applyArrangeFaustianTable(start, quietInput(start));
    const next = result.nextState.faustian;
    expect(next.devilDeck).toHaveLength(6);
    expect(next.activeTwistCardIds).toEqual([TWO_HEARTS]);
    expect(next.machinations).toEqual([{ cardId: TWO_HEARTS, facing: "face_down" }]);
    const aries = next.communities.find((community) => community.communityId === ARIES);
    expect(aries?.accompliceCardIds).toHaveLength(1);
    expect(next.faustianDeck).toHaveLength(44);
    expect(next.communities.every((community) => community.pawnCount === 0)).toBe(true);
    const devilRanks = next.devilDeck.map(rankOf);
    expect(devilRanks.filter((rank) => (LOW as readonly string[]).includes(rank))).toHaveLength(4);
    expect(devilRanks.filter((rank) => (MID as readonly string[]).includes(rank))).toHaveLength(2);
    expect(next.devilDeck).not.toContain(TWO_HEARTS);
    expect(aries?.accompliceCardIds).not.toContain(TWO_HEARTS);
    expect(next.faustianDeck).not.toContain(TWO_HEARTS);
    expect(() => validateFaustianStructure(next)).not.toThrow();
  });

  it("Dynamic uses completed twenty-year scores and rejects impossible capacity atomically", () => {
    expect(completedTwentyYearScores(40)).toBe(2);
    const start = baseSetup(EMPTY_FAUSTIAN_STATE);
    const dynamicStart = {
      ...start,
      configuration: { ...start.configuration, ageId: "dominion" as const },
    };
    const result = applyArrangeFaustianTable(dynamicStart, {
      arrangementId: "dynamic",
      favoriteCommunityId: ARIES,
      pawnCommunityId: LEO,
      reservedTwistCardId: null,
      expectedFaustian: dynamicStart.faustian,
      expectedAgeId: "dominion",
      expectedAgeYears: 40,
      expectedElements: dynamicStart.wizards[0]!.character.elements,
      calamityAntagonist: null,
    });
    expect(result.nextState.faustian.devilDeck).toHaveLength(3 + 2 * 2);
    expect(result.nextState.faustian.communities.find((community) => community.communityId === LEO)?.pawnCount).toBe(1);
    expect(result.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.pawnCount).toBe(0);

    const aged = {
      ...dynamicStart,
      wizards: dynamicStart.wizards.map((wizard) => ({
        ...wizard,
        character: { ...wizard.character, ageYears: 10_000 },
      })),
    };
    const before = structuredClone(aged);
    expectCode(() => applyArrangeFaustianTable(aged, {
      arrangementId: "dynamic",
      favoriteCommunityId: ARIES,
      pawnCommunityId: LEO,
      reservedTwistCardId: null,
      expectedFaustian: aged.faustian,
      expectedAgeId: "dominion",
      expectedAgeYears: 10_000,
      expectedElements: aged.wizards[0]!.character.elements,
      calamityAntagonist: null,
    }), "INVALID_CAMPAIGN_STATE");
    expect(aged.faustian).toEqual(before.faustian);
  });

  it("Explosive selects per-suit counts, places both Pawns in one other Community, and rejects over-capacity atomically", () => {
    const start = {
      ...baseSetup(EMPTY_FAUSTIAN_STATE),
      configuration: { ageId: "dominion" as const, facilitatorPlayerId: null },
    };
    const elements = { air: 1, fire: 0, earth: 0, water: 1 };
    const withElements = {
      ...start,
      wizards: start.wizards.map((wizard) => ({
        ...wizard,
        character: { ...wizard.character, elements },
      })),
    };
    const result = applyArrangeFaustianTable(withElements, {
      arrangementId: "explosive",
      favoriteCommunityId: ARIES,
      pawnCommunityId: LEO,
      reservedTwistCardId: null,
      expectedFaustian: withElements.faustian,
      expectedAgeId: "dominion",
      expectedAgeYears: 40,
      expectedElements: elements,
      calamityAntagonist: null,
    });
    const devilSuits = result.nextState.faustian.devilDeck.map(suitOf);
    expect(devilSuits.filter((suit) => suit === "spades")).toHaveLength(2);
    expect(devilSuits.filter((suit) => suit === "hearts")).toHaveLength(2);
    expect(devilSuits.filter((suit) => suit === "clubs")).toHaveLength(0);
    expect(result.nextState.faustian.communities.find((community) => community.communityId === LEO)?.pawnCount).toBe(2);
    expect(result.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.accompliceCardIds).toHaveLength(1);
    expect(result.nextState.faustian.activeTwistCardIds).toHaveLength(1);
    expect(result.nextState.faustian.faustianDeck).toHaveLength(52 - 4 - 1 - 1);

    const over = {
      ...withElements,
      wizards: withElements.wizards.map((wizard) => ({
        ...wizard,
        character: { ...wizard.character, elements: { air: 20, fire: 0, earth: 0, water: 0 } },
      })),
    };
    const before = structuredClone(over);
    expectCode(() => applyArrangeFaustianTable(over, {
      arrangementId: "explosive",
      favoriteCommunityId: ARIES,
      pawnCommunityId: LEO,
      reservedTwistCardId: null,
      expectedFaustian: over.faustian,
      expectedAgeId: "dominion",
      expectedAgeYears: 40,
      expectedElements: { air: 20, fire: 0, earth: 0, water: 0 },
      calamityAntagonist: null,
    }), "INVALID_CAMPAIGN_STATE");
    expect(over.faustian).toEqual(before.faustian);
    expect(over.world).toEqual(before.world);
  });

  it("does not reset an in-play campaign merely because zones appear empty", () => {
    const inPlay = playState(EMPTY_FAUSTIAN_STATE);
    expectCode(() => applyArrangeFaustianTable(inPlay, quietInput(inPlay)), "INVALID_CAMPAIGN_STATE");
  });

  it("converts the exact structural helper only during setup", () => {
    const helper = baseSetup(helperFaustian());
    const laws = helper.faustian.selectedDevilLawIds;
    const forms = helper.faustian.selectedDevilForms;
    const result = applyCompleteFaustianStructuralPlaceholder(helper, helper.faustian);
    expect(result.nextState.faustian.faustianDeck).toHaveLength(52);
    expect(result.nextState.faustian.activeTwistCardIds).toEqual([]);
    expect(result.nextState.faustian.machinations).toEqual([]);
    expect(result.nextState.faustian.selectedDevilLawIds).toEqual(laws);
    expect(result.nextState.faustian.selectedDevilForms).toEqual(forms);
    expectCode(
      () => applyCompleteFaustianStructuralPlaceholder(playState(helperFaustian()), helperFaustian()),
      "INVALID_CAMPAIGN_STATE",
    );
  });

  it("same accepted Arrange command ID returns the original result and does not reroll", async () => {
    const start = baseSetup(EMPTY_FAUSTIAN_STATE);
    const input = quietInput(start);
    const fingerprint = arrangeFaustianTableFingerprint(CAMPAIGN_A, input);
    const first = recordingIo({ campaign: campaignOf(start, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "arrange_faustian_table",
        commandFingerprint: fingerprint,
        apply: (current) => applyArrangeFaustianTable(current, input),
      }),
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 5)).not.toThrow();
    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "arrange_faustian_table", commandFingerprint: fingerprint, campaignRevision: 5 },
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "arrange_faustian_table",
        commandFingerprint: fingerprint,
        apply: () => {
          throw new Error("must not reroll");
        },
      }),
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });
});

describe("Place Faustian Schemes", () => {
  it("moves zero cards when requested quantity exceeds Devil Deck supply", () => {
    let faustian = take(EMPTY_FAUSTIAN_STATE, [SCHEME_B]);
    faustian = { ...faustian, devilDeck: [SCHEME_B] };
    const start = baseSetup(faustian);
    const before = structuredClone(start);
    expectCode(() => applyPlaceFaustianSchemes(start, ARIES, 2, start.faustian), "INVALID_CAMPAIGN_STATE");
    expect(start.faustian).toEqual(before.faustian);
  });

  it("places and protects in one accepted result", async () => {
    let faustian = take(EMPTY_FAUSTIAN_STATE, [EXISTING_ACCOMPLICE, SCHEME_B]);
    faustian = {
      ...faustian,
      devilDeck: [SCHEME_B],
      communities: faustian.communities.map((community) =>
        community.communityId === ARIES
          ? { ...community, accompliceCardIds: [EXISTING_ACCOMPLICE] }
          : community
      ),
    };
    const start = baseSetup(faustian);
    const { io, commits } = recordingIo({ campaign: campaignOf(start, 4) });
    const fingerprint = placeFaustianSchemesFingerprint(CAMPAIGN_A, ARIES, 1, start.faustian);
    await executeOrdinaryLogicalCommand(
      io,
      { commandId: COMMAND_2, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "place_faustian_schemes",
        commandFingerprint: fingerprint,
        apply: (current) => applyPlaceFaustianSchemes(current, ARIES, 1, start.faustian),
      }),
    );
    expect(commits).toHaveLength(1);
    expect(commits[0]?.events[0]?.type).toBe("faustian_schemes_placed");
    expect(commits[0]?.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.schemes).toEqual([]);
    expect(commits[0]?.nextState.faustian.devilDeck[commits[0]!.nextState.faustian.devilDeck.length - 1]).toBe(SCHEME_B);
    expect(() => validateEventCoherenceForTest(commits[0]!, 5)).not.toThrow();
  });
});

describe("Faustian Conspiracy atomicity", () => {
  it("persists zero partial world or card changes when a compound create is stale", () => {
    const start = baseSetup(EMPTY_FAUSTIAN_STATE);
    const beforeWorld = structuredClone(start.world);
    const beforeFaustian = structuredClone(start.faustian);
    expectCode(() => applyEstablishFaustianConspiracy(start, {
      communityId: ARIES,
      expectedFaustian: helperFaustian(),
      subject: { kind: "create", denizenId: DEN_1, name: "The Ring" },
      seatId: "faustian",
      chipCount: 1,
      goal: "Subjugation",
    }), "STALE_COMMAND_PRECONDITION");
    expect(start.world).toEqual(beforeWorld);
    expect(start.faustian).toEqual(beforeFaustian);

    const withPerson = {
      ...start,
      world: {
        ...start.world,
        denizens: [{
          denizenId: DEN_1,
          name: "A Person",
          representation: "individual" as const,
          description: null,
          mortalityState: null,
          powerfulProfile: null,
        }],
      },
    };
    const before = structuredClone(withPerson);
    expectCode(() => applyEstablishFaustianConspiracy(withPerson, {
      communityId: ARIES,
      expectedFaustian: withPerson.faustian,
      subject: { kind: "existing", denizenId: DEN_1 },
      seatId: "faustian",
      chipCount: 1,
      goal: "Subjugation",
    }), "INVALID_CAMPAIGN_STATE");
    expect(withPerson.world).toEqual(before.world);
    expect(withPerson.faustian).toEqual(before.faustian);
  });
});

describe("Body B concealment and event registration", () => {
  it("new activity labels do not leak hidden card identity", () => {
    const events: CampaignEvent[] = [
      { type: "faustian_table_arranged", version: 1, data: { arrangementId: "quiet", favoriteCommunityId: ARIES, pawnCommunityId: null, devilDeckCardIds: [SCHEME_B], twistCardId: TWO_HEARTS, accompliceCardId: EXISTING_ACCOMPLICE, reservedTwistCardId: TWO_HEARTS } },
      { type: "faustian_structural_placeholder_completed", version: 1, data: { previousTwistCardId: TWO_HEARTS } },
      { type: "faustian_community_schemes_revealed", version: 1, data: { communityId: ARIES, revealedSchemeCardIds: [SCHEME_B], eligibleSchemeCardIds: [SCHEME_A, SCHEME_B] } },
      { type: "faustian_community_scheme_foiled", version: 1, data: { communityId: ARIES, schemeCardId: SCHEME_A } },
      { type: "faustian_community_blackmailed", version: 2, data: { communityId: ARIES, drawnCardId: EXISTING_ACCOMPLICE, revealedSchemeCardIds: [SCHEME_B], preventedSchemeCardIds: [SCHEME_B] } },
      { type: "faustian_schemes_placed", version: 1, data: { communityId: ARIES, requestedQuantity: 1, placedCardIds: [SCHEME_B], revealedSchemeCardIds: [SCHEME_B], preventedSchemeCardIds: [SCHEME_B], insufficient: false } },
      { type: "faustian_pawn_count_changed", version: 1, data: { communityId: ARIES, previousCount: 0, nextCount: 1 } },
      { type: "faustian_conspiracy_established", version: 1, data: { communityId: ARIES, denizenId: DEN_1, createdDenizen: true, seatId: "faustian", chipCount: 1 } },
    ];
    for (const event of events) {
      const text = activityText(event);
      expect(text).not.toMatch(/hearts_3|hearts_2|clubs_7|spades_8|Three of Hearts|Two of Hearts/i);
    }
  });

  it("registers new and versioned persisted events for decode, coherence, validator, and activity", () => {
    for (const commandType of [
      "arrange_faustian_table",
      "complete_faustian_structural_placeholder",
      "reveal_faustian_community_schemes",
      "foil_faustian_community_scheme",
      "place_faustian_schemes",
      "add_faustian_pawn",
      "remove_faustian_pawn",
      "establish_faustian_conspiracy",
      "blackmail_faustian_community",
    ]) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
      expect(isLogicalStateCommandType(commandType as typeof CAMPAIGN_COMMAND_TYPES[number])).toBe(true);
    }
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_community_blackmailed", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_community_blackmailed", 2).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_table_arranged", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_structural_placeholder_completed", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_community_schemes_revealed", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_community_scheme_foiled", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_schemes_placed", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_pawn_count_changed", 1).length).toBe(1);
    expect(findValidatorMembers(campaignEventValidator as never, "faustian_conspiracy_established", 1).length).toBe(1);

    const v1Blackmail: CampaignEvent = {
      type: "faustian_community_blackmailed",
      version: 1,
      data: { communityId: ARIES, drawnCardId: EXISTING_ACCOMPLICE },
    };
    expect(activityText(v1Blackmail)).toBe("Revision 9 — Blackmailed Faustian Community");

    const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");
    for (const name of [
      "arrangeFaustianTable",
      "completeFaustianStructuralPlaceholder",
      "revealFaustianCommunitySchemes",
      "foilFaustianCommunityScheme",
      "placeFaustianSchemes",
      "addFaustianPawn",
      "removeFaustianPawn",
      "establishFaustianConspiracy",
    ]) {
      expect(source).toContain(`export const ${name} = mutation({`);
    }
    expect(blackmailFaustianCommunityFingerprint(CAMPAIGN_A, ARIES)).toContain(":v1:");
    expect(revealFaustianCommunitySchemesFingerprint(CAMPAIGN_A, ARIES, EMPTY_FAUSTIAN_STATE)).toContain("reveal_faustian_community_schemes:v1:");
    expect(foilFaustianCommunitySchemeFingerprint(CAMPAIGN_A, ARIES, SCHEME_A, EMPTY_FAUSTIAN_STATE)).toContain("foil_faustian_community_scheme:v1:");
  });
});

describe("ordinary pawn recording", () => {
  it("adds and removes a count-based Pawn with stale-safe validation", () => {
    const start = baseSetup(EMPTY_FAUSTIAN_STATE);
    const added = applyChangeFaustianPawnCount(start, ARIES, 0, 1, start.faustian);
    expect(added.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.pawnCount).toBe(1);
    expectCode(() => applyChangeFaustianPawnCount(added.nextState, ARIES, 0, 1, added.nextState.faustian), "STALE_COMMAND_PRECONDITION");
    const removed = applyChangeFaustianPawnCount(added.nextState, ARIES, 1, -1, added.nextState.faustian);
    expect(removed.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.pawnCount).toBe(0);
  });
});
