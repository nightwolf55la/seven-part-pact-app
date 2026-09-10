import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  FaustianCardId,
  FaustianCommunityId,
  FaustianSchemePlacement,
  FaustianState,
  MonthOrdinal,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SHARED_WORLD_STATE,
  FAUSTIAN_DEVIL_FORM_IDS,
  FAUSTIAN_DEVIL_LAW_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyBlackmailFaustianCommunity,
  applyDirectFaustianAccomplice,
  applyDisruptFaustianPawn,
  applyInvestigateFaustianCommunity,
  blackmailFaustianCommunityFingerprint,
  buildInitializedDefaultFaustianState,
  directFaustianAccompliceFingerprint,
  disruptFaustianPawnFingerprint,
  faustianCardId,
  investigateFaustianCommunityFingerprint,
  isLogicalStateCommandType,
  validateCampaignStateV5Candidate,
  validateFaustianStructure,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const TWIST = faustianCardId("spades", "ace");
const ARIES = "aries" as FaustianCommunityId;
const LEO = "leo" as FaustianCommunityId;
const FACE_DOWN_SCHEME = faustianCardId("hearts", "2");
const FACE_UP_SCHEME = faustianCardId("hearts", "3");
const OTHER_COMMUNITY_SCHEME = faustianCardId("clubs", "4");

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function defaultInitForms() {
  return {
    casual: FAUSTIAN_DEVIL_FORM_IDS.slice(0, 3),
    special: FAUSTIAN_DEVIL_FORM_IDS.slice(3, 5),
    duress: FAUSTIAN_DEVIL_FORM_IDS.slice(5, 6),
  };
}

function initializedFaustian(): FaustianState {
  return buildInitializedDefaultFaustianState({
    selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1]],
    activeTwistCardId: TWIST,
    selectedDevilForms: defaultInitForms(),
  });
}

function takeFromDeck(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  for (const cardId of cardIds) {
    if (!faustian.faustianDeck.includes(cardId)) {
      throw new Error(`card ${cardId} is not in the Faustian Deck`);
    }
  }
  return {
    ...faustian,
    faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)),
  };
}

function withCommunitySchemes(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
  schemes: readonly FaustianSchemePlacement[],
): FaustianState {
  const next = takeFromDeck(faustian, schemes.map((scheme) => scheme.cardId));
  return {
    ...next,
    communities: next.communities.map((community) =>
      community.communityId === communityId ? { ...community, schemes } : community
    ),
  };
}

function withCommunityAccomplice(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
  cardId: FaustianCardId,
): FaustianState {
  const next = takeFromDeck(faustian, [cardId]);
  return {
    ...next,
    communities: next.communities.map((community) =>
      community.communityId === communityId
        ? { ...community, accompliceCardIds: [...community.accompliceCardIds, cardId] }
        : community
    ),
  };
}

function withDevilDeckBottom(faustian: FaustianState, cardId: FaustianCardId): FaustianState {
  const next = takeFromDeck(faustian, [cardId]);
  return { ...next, devilDeck: [...next.devilDeck, cardId] };
}

function withPawnCount(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
  pawnCount: number,
): FaustianState {
  return {
    ...faustian,
    communities: faustian.communities.map((community) =>
      community.communityId === communityId ? { ...community, pawnCount } : community
    ),
  };
}

function baseV5(faustian: FaustianState = initializedFaustian()): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
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
    pactSeats: { ...EMPTY_PACT_SEATS },
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
    faustian,
  };
}

function investigableState(): CampaignStateV5 {
  const faustian = withCommunitySchemes(
    withCommunitySchemes(initializedFaustian(), ARIES, [
      { cardId: FACE_DOWN_SCHEME, facing: "face_down" },
      { cardId: FACE_UP_SCHEME, facing: "face_up" },
    ]),
    LEO,
    [{ cardId: OTHER_COMMUNITY_SCHEME, facing: "face_down" }],
  );
  return baseV5(faustian);
}

function expectCode(run: () => unknown, code: DomainError["code"]): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
  }
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

describe("investigate_faustian_community", () => {
  it("is a registered logical command with a client-intent fingerprint", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("investigate_faustian_community");
    expect(isLogicalStateCommandType("investigate_faustian_community")).toBe(true);
    const fingerprint = investigateFaustianCommunityFingerprint(CAMPAIGN_A, ARIES, FACE_DOWN_SCHEME);
    expect(fingerprint).toContain("investigate_faustian_community:v1:");
    expect(fingerprint).toContain(ARIES);
    expect(fingerprint).toContain(FACE_DOWN_SCHEME);
    expect(fingerprint).toBe(investigateFaustianCommunityFingerprint(CAMPAIGN_A, ARIES, FACE_DOWN_SCHEME));
    expect(fingerprint).not.toBe(investigateFaustianCommunityFingerprint(CAMPAIGN_A, ARIES, FACE_UP_SCHEME));
  });

  it("reveals remaining facedown Schemes, foils exactly the selected Scheme, and preserves the 52-card exact-once invariant", () => {
    const start = investigableState();
    const result = applyInvestigateFaustianCommunity(start, ARIES, FACE_DOWN_SCHEME);
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    const leo = result.nextState.faustian.communities.find((community) => community.communityId === LEO);

    expect(result.events).toEqual([{
      type: "faustian_community_investigated",
      version: 1,
      data: {
        communityId: ARIES,
        schemeCardId: FACE_DOWN_SCHEME,
        revealedSchemeCardIds: [FACE_DOWN_SCHEME],
      },
    }]);
    expect(aries?.schemes).toEqual([{ cardId: FACE_UP_SCHEME, facing: "face_up" }]);
    expect(result.nextState.faustian.defeatedSchemes).toEqual([FACE_DOWN_SCHEME]);
    expect(leo?.schemes).toEqual([{ cardId: OTHER_COMMUNITY_SCHEME, facing: "face_down" }]);
    expect(() => validateFaustianStructure(result.nextState.faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("can foil a Scheme that was facedown before reveal, leaving the other revealed Schemes in the Community", () => {
    const start = baseV5(withCommunitySchemes(initializedFaustian(), ARIES, [
      { cardId: FACE_DOWN_SCHEME, facing: "face_down" },
      { cardId: FACE_UP_SCHEME, facing: "face_down" },
    ]));
    const result = applyInvestigateFaustianCommunity(start, ARIES, FACE_DOWN_SCHEME);
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    expect(aries?.schemes).toEqual([{ cardId: FACE_UP_SCHEME, facing: "face_up" }]);
    expect(result.nextState.faustian.defeatedSchemes).toEqual([FACE_DOWN_SCHEME]);
    expect(result.events[0]).toMatchObject({
      type: "faustian_community_investigated",
      data: {
        communityId: ARIES,
        schemeCardId: FACE_DOWN_SCHEME,
        revealedSchemeCardIds: [FACE_DOWN_SCHEME, FACE_UP_SCHEME],
      },
    });
  });

  it("rejects a Community/selected Scheme combination that is not currently valid", () => {
    const start = investigableState();
    expectCode(() => applyInvestigateFaustianCommunity(start, ARIES, OTHER_COMMUNITY_SCHEME), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyInvestigateFaustianCommunity(start, LEO, FACE_DOWN_SCHEME), "INVALID_CAMPAIGN_STATE");
    expectCode(
      () => applyInvestigateFaustianCommunity(start, "not_a_community" as FaustianCommunityId, FACE_DOWN_SCHEME),
      "INVALID_CAMPAIGN_STATE",
    );
    expectCode(
      () => applyInvestigateFaustianCommunity(baseV5(initializedFaustian()), ARIES, FACE_DOWN_SCHEME),
      "INVALID_CAMPAIGN_STATE",
    );
  });
});

describe("blackmail_faustian_community", () => {
  it("is a registered logical command whose fingerprint is community intent only", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("blackmail_faustian_community");
    expect(isLogicalStateCommandType("blackmail_faustian_community")).toBe(true);
    const fingerprint = blackmailFaustianCommunityFingerprint(CAMPAIGN_A, ARIES);
    expect(fingerprint).toContain("blackmail_faustian_community:v1:");
    expect(fingerprint).toContain(ARIES);
    expect(fingerprint).not.toMatch(/spades_|clubs_|diamonds_|hearts_/);
    expect(fingerprint).toBe(blackmailFaustianCommunityFingerprint(CAMPAIGN_A, ARIES));
    expect(fingerprint).not.toBe(blackmailFaustianCommunityFingerprint(CAMPAIGN_A, LEO));
  });

  it("draws the authoritative top Faustian Deck card into the Community as an Accomplice", () => {
    const start = baseV5(initializedFaustian());
    const topCard = start.faustian.faustianDeck[0];
    const secondCard = start.faustian.faustianDeck[1];
    expect(topCard).toBeDefined();
    expect(secondCard).toBeDefined();

    const result = applyBlackmailFaustianCommunity(start, ARIES);
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES);

    expect(result.events).toEqual([{
      type: "faustian_community_blackmailed",
      version: 1,
      data: {
        communityId: ARIES,
        drawnCardId: topCard,
      },
    }]);
    expect(aries?.accompliceCardIds).toEqual([topCard]);
    expect(result.nextState.faustian.faustianDeck[0]).toBe(secondCard);
    expect(result.nextState.faustian.faustianDeck).not.toContain(topCard);
    expect(result.nextState.faustian.faustianDeck).toHaveLength(start.faustian.faustianDeck.length - 1);
    expect(() => validateFaustianStructure(result.nextState.faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("rejects an empty Faustian Deck without inventing Machination resolution", () => {
    const emptied: FaustianState = {
      ...initializedFaustian(),
      devilDeck: initializedFaustian().faustianDeck,
      faustianDeck: [],
    };
    expect(() => validateFaustianStructure(emptied)).not.toThrow();
    expectCode(() => applyBlackmailFaustianCommunity(baseV5(emptied), ARIES), "INVALID_CAMPAIGN_STATE");
    expect(() => applyBlackmailFaustianCommunity(baseV5(emptied), ARIES)).toThrow(/faustian deck/i);
  });
});

describe("Faustian ordinary command path", () => {
  it("commits investigate through the ordinary executor with events and idempotency", async () => {
    const state = investigableState();
    const fingerprint = investigateFaustianCommunityFingerprint(CAMPAIGN_A, ARIES, FACE_DOWN_SCHEME);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "investigate_faustian_community",
      commandFingerprint: fingerprint,
      apply: (current) => applyInvestigateFaustianCommunity(current, ARIES, FACE_DOWN_SCHEME),
    });

    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]?.type).toBe("faustian_community_investigated");
    expect(accepted.commits[0]?.nextState.faustian.defeatedSchemes).toEqual([FACE_DOWN_SCHEME]);
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "investigate_faustian_community", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("commits blackmail using the server-drawn card in the audit event, not client intent", async () => {
    const state = baseV5(initializedFaustian());
    const topCard = state.faustian.faustianDeck[0];
    const fingerprint = blackmailFaustianCommunityFingerprint(CAMPAIGN_A, ARIES);
    expect(fingerprint).not.toContain(topCard);

    const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 8) });
    const receipt = await executeOrdinaryLogicalCommand(
      io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "blackmail_faustian_community",
        commandFingerprint: fingerprint,
        apply: (current) => applyBlackmailFaustianCommunity(current, ARIES),
      }),
    );
    expect(receipt).toEqual({ revision: 9 });
    expect(commits[0]?.commandFingerprint).toBe(fingerprint);
    expect(commits[0]?.events[0]).toEqual({
      type: "faustian_community_blackmailed",
      version: 1,
      data: { communityId: ARIES, drawnCardId: topCard },
    });
    expect(commits[0]?.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.accompliceCardIds)
      .toEqual([topCard]);
    expect(() => validateEventCoherenceForTest(commits[0]!, 9)).not.toThrow();
  });
});

describe("Faustian mutation arg path", () => {
  const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");

  it("registers investigate and blackmail mutations on the ordinary executor", () => {
    for (const name of ["investigateFaustianCommunity", "blackmailFaustianCommunity"] as const) {
      const exportIdx = source.indexOf(`export const ${name} = mutation({`);
      expect(exportIdx, `${name} mutation not found`).toBeGreaterThan(-1);
      const argsStart = source.indexOf("args: {", exportIdx);
      const handlerIdx = source.indexOf("handler: async (ctx, args) => {", exportIdx);
      const argsBlock = source.slice(argsStart, handlerIdx);
      expect(argsBlock).toContain("commandId: v.string()");
      expect(argsBlock).toContain("expectedCampaignId: v.string()");
      expect(argsBlock).toContain("communityId: v.string()");
      const handlerEnd = source.indexOf("\n  },\n});", handlerIdx);
      const handler = source.slice(handlerIdx, handlerEnd);
      expect(handler).toContain("executeConvexOrdinaryLogicalCommand");
    }

    const blackmailIdx = source.indexOf("export const blackmailFaustianCommunity = mutation({");
    const blackmailArgs = source.slice(blackmailIdx, source.indexOf("handler: async (ctx, args) => {", blackmailIdx));
    expect(blackmailArgs).not.toContain("cardId");
    expect(blackmailArgs).not.toContain("schemeCardId");
    expect(blackmailArgs).not.toContain("drawnCardId");
  });
});

const SEVEN = faustianCardId("clubs", "7");
const LOWER = faustianCardId("hearts", "5");
const EQUAL = faustianCardId("hearts", "7");
const HIGHER = faustianCardId("hearts", "9");
const ACE = faustianCardId("hearts", "ace");
const ACE_SCHEME = faustianCardId("clubs", "ace");
const KING = faustianCardId("diamonds", "king");
const TWO = faustianCardId("diamonds", "2");
const DEVIL_BOTTOM = faustianCardId("spades", "king");

function ordinaryDirectState(): CampaignStateV5 {
  return baseV5(withCommunitySchemes(
    withCommunitySchemes(
      withCommunityAccomplice(
        withDevilDeckBottom(initializedFaustian(), DEVIL_BOTTOM),
        ARIES,
        SEVEN,
      ),
      LEO,
      [
        { cardId: LOWER, facing: "face_down" },
        { cardId: EQUAL, facing: "face_up" },
        { cardId: HIGHER, facing: "face_down" },
      ],
    ),
    "virgo",
    [{ cardId: OTHER_COMMUNITY_SCHEME, facing: "face_down" }],
  ));
}

describe("direct_faustian_accomplice", () => {
  it("is a registered logical command whose fingerprint is client intent only", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("direct_faustian_accomplice");
    expect(isLogicalStateCommandType("direct_faustian_accomplice")).toBe(true);
    const fingerprint = directFaustianAccompliceFingerprint(CAMPAIGN_A, SEVEN, LEO);
    expect(fingerprint).toContain("direct_faustian_accomplice:v1:");
    expect(fingerprint).toContain(SEVEN);
    expect(fingerprint).toContain(LEO);
    expect(fingerprint).not.toContain(ARIES);
    expect(fingerprint).not.toContain("revealedSchemeCardIds");
    expect(fingerprint).not.toContain("returnedSchemeCardIds");
    expect(fingerprint).not.toContain(LOWER);
    expect(fingerprint).toBe(directFaustianAccompliceFingerprint(CAMPAIGN_A, SEVEN, LEO));
    expect(fingerprint).not.toBe(directFaustianAccompliceFingerprint(CAMPAIGN_A, SEVEN, ARIES));
  });

  it("moves an ordinary Accomplice, reveals destination Schemes, and returns equal-or-lower cards in scheme order", () => {
    const start = ordinaryDirectState();
    const result = applyDirectFaustianAccomplice(start, SEVEN, LEO);
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    const leo = result.nextState.faustian.communities.find((community) => community.communityId === LEO);
    const virgo = result.nextState.faustian.communities.find((community) => community.communityId === "virgo");

    expect(aries?.accompliceCardIds).toEqual([]);
    expect(leo?.accompliceCardIds).toEqual([SEVEN]);
    expect(leo?.schemes).toEqual([{ cardId: HIGHER, facing: "face_up" }]);
    expect(virgo?.schemes).toEqual([{ cardId: OTHER_COMMUNITY_SCHEME, facing: "face_down" }]);
    expect(result.nextState.faustian.devilDeck).toEqual([DEVIL_BOTTOM, LOWER, EQUAL]);
    expect(result.events).toEqual([{
      type: "faustian_accomplice_directed",
      version: 1,
      data: {
        accompliceCardId: SEVEN,
        sourceCommunityId: ARIES,
        destinationCommunityId: LEO,
        revealedSchemeCardIds: [LOWER, HIGHER],
        returnedSchemeCardIds: [LOWER, EQUAL],
      },
    }]);
    expect(() => validateFaustianStructure(result.nextState.faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it.each([
    { accomplice: SEVEN, scheme: LOWER, defeated: true, label: "ordinary lower" },
    { accomplice: SEVEN, scheme: EQUAL, defeated: true, label: "ordinary equal" },
    { accomplice: SEVEN, scheme: HIGHER, defeated: false, label: "ordinary higher" },
    { accomplice: SEVEN, scheme: KING, defeated: false, label: "ordinary king" },
    { accomplice: ACE, scheme: KING, defeated: true, label: "ace defeats king" },
    { accomplice: ACE, scheme: ACE_SCHEME, defeated: true, label: "ace defeats ace" },
    { accomplice: ACE, scheme: TWO, defeated: false, label: "ace does not defeat 2" },
  ] as const)("rank rule: $label", ({ accomplice, scheme, defeated }) => {
    const start = baseV5(withCommunitySchemes(
      withCommunityAccomplice(initializedFaustian(), ARIES, accomplice),
      LEO,
      [{ cardId: scheme, facing: "face_down" }],
    ));
    const result = applyDirectFaustianAccomplice(start, accomplice, LEO);
    const leo = result.nextState.faustian.communities.find((community) => community.communityId === LEO);
    if (defeated) {
      expect(leo?.schemes).toEqual([]);
      expect(result.nextState.faustian.devilDeck).toEqual([scheme]);
    } else {
      expect(leo?.schemes).toEqual([{ cardId: scheme, facing: "face_up" }]);
      expect(result.nextState.faustian.devilDeck).toEqual([]);
    }
  });

  it("an Ace Accomplice defeats representative high cards but not a 2, returning defeated cards in scheme order", () => {
    const start = baseV5(withCommunitySchemes(
      withCommunityAccomplice(initializedFaustian(), ARIES, ACE),
      LEO,
      [
        { cardId: KING, facing: "face_down" },
        { cardId: TWO, facing: "face_up" },
        { cardId: HIGHER, facing: "face_down" },
      ],
    ));
    const result = applyDirectFaustianAccomplice(start, ACE, LEO);
    const leo = result.nextState.faustian.communities.find((community) => community.communityId === LEO);
    expect(leo?.schemes).toEqual([{ cardId: TWO, facing: "face_up" }]);
    expect(result.nextState.faustian.devilDeck).toEqual([KING, HIGHER]);
    expect(result.events[0]).toMatchObject({
      type: "faustian_accomplice_directed",
      data: {
        accompliceCardId: ACE,
        sourceCommunityId: ARIES,
        destinationCommunityId: LEO,
        revealedSchemeCardIds: [KING, HIGHER],
        returnedSchemeCardIds: [KING, HIGHER],
      },
    });
  });

  it("rejects a card that is not a current Accomplice, and a same-Community destination", () => {
    const start = ordinaryDirectState();
    expectCode(() => applyDirectFaustianAccomplice(start, LOWER, LEO), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyDirectFaustianAccomplice(start, HIGHER, ARIES), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyDirectFaustianAccomplice(start, SEVEN, ARIES), "INVALID_CAMPAIGN_STATE");
  });
});

describe("direct_faustian_accomplice ordinary command path", () => {
  it("commits through the ordinary executor with authoritative event data and idempotency", async () => {
    const state = ordinaryDirectState();
    const fingerprint = directFaustianAccompliceFingerprint(CAMPAIGN_A, SEVEN, LEO);
    expect(fingerprint).not.toContain(LOWER);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "direct_faustian_accomplice",
      commandFingerprint: fingerprint,
      apply: (current) => applyDirectFaustianAccomplice(current, SEVEN, LEO),
    });

    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]).toEqual({
      type: "faustian_accomplice_directed",
      version: 1,
      data: {
        accompliceCardId: SEVEN,
        sourceCommunityId: ARIES,
        destinationCommunityId: LEO,
        revealedSchemeCardIds: [LOWER, HIGHER],
        returnedSchemeCardIds: [LOWER, EQUAL],
      },
    });
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "direct_faustian_accomplice", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });
});

describe("directFaustianAccomplice mutation arg path", () => {
  const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");

  it("registers the mutation on the ordinary executor without result-card client args", () => {
    const exportIdx = source.indexOf("export const directFaustianAccomplice = mutation({");
    expect(exportIdx).toBeGreaterThan(-1);
    const argsStart = source.indexOf("args: {", exportIdx);
    const handlerIdx = source.indexOf("handler: async (ctx, args) => {", exportIdx);
    const argsBlock = source.slice(argsStart, handlerIdx);
    expect(argsBlock).toContain("commandId: v.string()");
    expect(argsBlock).toContain("expectedCampaignId: v.string()");
    expect(argsBlock).toContain("accompliceCardId: v.string()");
    expect(argsBlock).toContain("destinationCommunityId: v.string()");
    expect(argsBlock).not.toContain("sourceCommunityId");
    expect(argsBlock).not.toContain("revealedSchemeCardIds");
    expect(argsBlock).not.toContain("returnedSchemeCardIds");
    const handlerEnd = source.indexOf("\n  },\n});", handlerIdx);
    expect(source.slice(handlerIdx, handlerEnd)).toContain("executeConvexOrdinaryLogicalCommand");
  });
});

function disruptibleState(pawnCount = 2): CampaignStateV5 {
  return baseV5(withCommunityAccomplice(
    withCommunityAccomplice(
      withPawnCount(
        withCommunitySchemes(initializedFaustian(), LEO, [{ cardId: OTHER_COMMUNITY_SCHEME, facing: "face_down" }]),
        ARIES,
        pawnCount,
      ),
      ARIES,
      SEVEN,
    ),
    ARIES,
    EQUAL,
  ));
}

describe("disrupt_faustian_pawn", () => {
  it("is a registered logical command with a client-intent fingerprint", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("disrupt_faustian_pawn");
    expect(isLogicalStateCommandType("disrupt_faustian_pawn")).toBe(true);
    const fingerprint = disruptFaustianPawnFingerprint(CAMPAIGN_A, ARIES, SEVEN);
    expect(fingerprint).toContain("disrupt_faustian_pawn:v1:");
    expect(fingerprint).toContain(ARIES);
    expect(fingerprint).toContain(SEVEN);
    expect(fingerprint).toBe(disruptFaustianPawnFingerprint(CAMPAIGN_A, ARIES, SEVEN));
    expect(fingerprint).not.toBe(disruptFaustianPawnFingerprint(CAMPAIGN_A, LEO, SEVEN));
  });

  it("destroys one Pawn and returns the selected Accomplice to the bottom of the Faustian Deck", () => {
    const start = disruptibleState();
    const deckTop = start.faustian.faustianDeck[0];
    const result = applyDisruptFaustianPawn(start, ARIES, SEVEN);
    const aries = result.nextState.faustian.communities.find((community) => community.communityId === ARIES);
    const leo = result.nextState.faustian.communities.find((community) => community.communityId === LEO);

    expect(aries?.pawnCount).toBe(1);
    expect(aries?.accompliceCardIds).toEqual([EQUAL]);
    expect(result.nextState.faustian.faustianDeck[0]).toBe(deckTop);
    expect(result.nextState.faustian.faustianDeck[result.nextState.faustian.faustianDeck.length - 1]).toBe(SEVEN);
    expect(result.nextState.faustian.faustianDeck).toHaveLength(start.faustian.faustianDeck.length + 1);
    expect(leo?.schemes).toEqual([{ cardId: OTHER_COMMUNITY_SCHEME, facing: "face_down" }]);
    expect(leo?.pawnCount).toBe(0);
    expect(result.events).toEqual([{
      type: "faustian_pawn_disrupted",
      version: 1,
      data: { communityId: ARIES, accompliceCardId: SEVEN },
    }]);
    expect(() => validateFaustianStructure(result.nextState.faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("rejects a Community with no Pawn, and a card that is not an Accomplice in that Community", () => {
    expectCode(() => applyDisruptFaustianPawn(disruptibleState(0), ARIES, SEVEN), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyDisruptFaustianPawn(disruptibleState(), ARIES, OTHER_COMMUNITY_SCHEME), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyDisruptFaustianPawn(disruptibleState(), LEO, SEVEN), "INVALID_CAMPAIGN_STATE");
  });

  it("commits through the ordinary executor with events and idempotency", async () => {
    const state = disruptibleState();
    const fingerprint = disruptFaustianPawnFingerprint(CAMPAIGN_A, ARIES, SEVEN);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "disrupt_faustian_pawn",
      commandFingerprint: fingerprint,
      apply: (current) => applyDisruptFaustianPawn(current, ARIES, SEVEN),
    });

    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]?.type).toBe("faustian_pawn_disrupted");
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "disrupt_faustian_pawn", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });
});

describe("disruptFaustianPawn mutation arg path", () => {
  const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");

  it("registers the mutation on the ordinary executor with community and Accomplice intent", () => {
    const exportIdx = source.indexOf("export const disruptFaustianPawn = mutation({");
    expect(exportIdx).toBeGreaterThan(-1);
    const argsStart = source.indexOf("args: {", exportIdx);
    const handlerIdx = source.indexOf("handler: async (ctx, args) => {", exportIdx);
    const argsBlock = source.slice(argsStart, handlerIdx);
    expect(argsBlock).toContain("commandId: v.string()");
    expect(argsBlock).toContain("expectedCampaignId: v.string()");
    expect(argsBlock).toContain("communityId: v.string()");
    expect(argsBlock).toContain("accompliceCardId: v.string()");
    expect(argsBlock).not.toContain("pawnId");
    const handlerEnd = source.indexOf("\n  },\n});", handlerIdx);
    expect(source.slice(handlerIdx, handlerEnd)).toContain("executeConvexOrdinaryLogicalCommand");
  });
});
