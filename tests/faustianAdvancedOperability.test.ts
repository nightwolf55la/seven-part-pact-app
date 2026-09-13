import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
  applyCorrectFaustianAntagonist,
  applyCorrectFaustianCard,
  applyCorrectFaustianDemon,
  applyCorrectFaustianDevilProfile,
  applyCorrectFaustianDomainSeizure,
  applyCorrectFaustianPersistentEffect,
  applyFulfillFaustianDueMonthObligation,
  applyRecordFaustianDueMonthObligation,
  applyRecordFaustianMachinationOutcome,
  describeActivityEntry,
  eligibleFaustianMachinationCleanupCardIds,
  faustianCardId,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { campaignEventValidator } from "../convex/validators";
import { makeTestCampaignStateV5 } from "./test-state";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const ARIES = "aries" as FaustianCommunityId;
const HK = faustianCardId("hearts", "king");
const SK = faustianCardId("spades", "king");
const HQ = faustianCardId("hearts", "queen");
const H8 = faustianCardId("hearts", "8");
const H7 = faustianCardId("hearts", "7");
const H5 = faustianCardId("hearts", "5");
const TWIST = faustianCardId("spades", "ace");
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

function antagonistDenizen(denizenId: DenizenId, name: string) {
  return {
    denizenId,
    name,
    representation: "individual" as const,
    description: null,
    mortalityState: "not_deceased" as const,
    powerfulProfile: {
      taxonomies: [{ kind: "builtin" as const, taxonomyId: "beast" as const }],
      status: { kind: "standard" as const, value: "malignant" as const },
      goal: "Subjugation",
      methods: [],
      truths: [],
    },
  };
}

function demonDenizen(denizenId: DenizenId, name: string) {
  return {
    denizenId,
    name,
    representation: "individual" as const,
    description: null,
    mortalityState: "not_deceased" as const,
    powerfulProfile: {
      taxonomies: [{ kind: "builtin" as const, taxonomyId: "demon" as const }],
      status: { kind: "standard" as const, value: "malignant" as const },
      goal: "Calamity",
      methods: [],
      truths: [],
    },
  };
}

function playState(faustian: FaustianState, denizens: CampaignStateV5["world"]["denizens"] = []): CampaignStateV5 {
  const state = makeTestCampaignStateV5({
    calendar: { monthOrdinal: 3 as MonthOrdinal },
    configuration: { ageId: "dominion", facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A, "A"), wizard(WIZ_B, "B")],
    faustian,
  });
  return {
    ...state,
    world: { ...state.world, denizens },
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

function tableFaustian(extra: Partial<FaustianState> = {}): FaustianState {
  const used = [
    ...(extra.machinations?.map((card) => card.cardId) ?? []),
    ...(extra.defeatedSchemes ?? []),
    ...(extra.devilDeck ?? []),
    ...(extra.setAsideHand ?? []),
    ...(extra.activeTwistCardIds ?? []),
    ...(extra.beneathAntagonists?.map((card) => card.cardId) ?? []),
    ...(extra.communities?.flatMap((community) => [
      ...community.schemes.map((scheme) => scheme.cardId),
      ...community.accompliceCardIds,
    ]) ?? []),
  ];
  return { ...take(EMPTY_FAUSTIAN_STATE, used), ...extra };
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

function pendingOnePair(state: CampaignStateV5) {
  return applyRecordFaustianMachinationOutcome(state, {
    scoringHandCardIds: [HK, SK, HQ, H8, H7],
    result: { kind: "one_pair" },
    expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(state.faustian),
    outcomeDependentTwistCardIds: [TWIST],
  });
}

describe("Body D card correction", () => {
  it("corrects Scheme facing without moving the card", () => {
    const start = playState(tableFaustian({
      communities: EMPTY_FAUSTIAN_STATE.communities.map((community) => (
        community.communityId === ARIES
          ? { ...community, schemes: [{ cardId: HK, facing: "face_down" }] }
          : community
      )),
    }));
    const result = applyCorrectFaustianCard(start, { kind: "facing", cardId: HK, facing: "face_up" });
    expect(result.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.schemes).toEqual([
      { cardId: HK, facing: "face_up" },
    ]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("moves a visible card to a closed destination and keeps the 52-card partition", () => {
    const start = playState(tableFaustian({
      communities: EMPTY_FAUSTIAN_STATE.communities.map((community) => (
        community.communityId === ARIES
          ? { ...community, schemes: [{ cardId: HK, facing: "face_up" }] }
          : community
      )),
    }));
    const result = applyCorrectFaustianCard(start, {
      kind: "placement",
      cardId: HK,
      destination: { kind: "defeated_schemes" },
    });
    expect(result.nextState.faustian.defeatedSchemes).toContain(HK);
    expect(result.nextState.faustian.communities.find((community) => community.communityId === ARIES)?.schemes).toEqual([]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("reorders a deck only by exact permutation", () => {
    const start = playState(EMPTY_FAUSTIAN_STATE);
    const reversed = [...start.faustian.faustianDeck].reverse();
    const result = applyCorrectFaustianCard(start, { kind: "deck_order", deck: "faustian", cardIds: reversed });
    expect(result.nextState.faustian.faustianDeck).toEqual(reversed);
    expectCode(
      () => applyCorrectFaustianCard(start, { kind: "deck_order", deck: "faustian", cardIds: reversed.slice(1) }),
      "INVALID_CAMPAIGN_STATE",
    );
  });

  it("rejects independent movement of a reserved Twist or pending holding", () => {
    const created = pendingOnePair(playState(tableFaustian({
      machinations: [
        { cardId: HK, facing: "face_up" },
        { cardId: SK, facing: "face_up" },
        { cardId: HQ, facing: "face_up" },
        { cardId: H8, facing: "face_up" },
        { cardId: H7, facing: "face_up" },
        { cardId: TWIST, facing: "face_down" },
        { cardId: C4, facing: "face_up" },
      ],
      activeTwistCardIds: [TWIST],
    })));
    expectCode(
      () => applyCorrectFaustianCard(created.nextState, {
        kind: "placement",
        cardId: TWIST,
        destination: { kind: "defeated_schemes" },
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectCode(
      () => applyCorrectFaustianCard(created.nextState, {
        kind: "placement",
        cardId: HK,
        destination: { kind: "defeated_schemes" },
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expect(created.nextState.faustian.setAsideHand).toEqual(expect.arrayContaining([HK]));
  });
});

describe("Body D Antagonist / Demon / seizure / profile", () => {
  it("attaches an existing Denizen as Antagonist without creating a Conspiracy or rewriting the Powerful profile", () => {
    const denizen = antagonistDenizen(DEN_1, "Lord Ash");
    const start = playState(EMPTY_FAUSTIAN_STATE, [denizen]);
    const before = structuredClone(start.world.denizens[0]!.powerfulProfile);
    const result = applyCorrectFaustianAntagonist(start, {
      kind: "attach",
      denizenId: DEN_1,
      seatId: "hierophant",
      chipCount: 2,
    });
    expect(result.nextState.faustian.conspiracies).toEqual([]);
    expect(result.nextState.world.denizens).toHaveLength(1);
    expect(result.nextState.world.denizens[0]?.powerfulProfile).toEqual(before);
    expect(result.nextState.faustian.antagonists).toEqual([
      { denizenId: DEN_1, seatId: "hierophant", chipCount: 2 },
    ]);
  });

  it("requires explicit destinations for cards beneath a removed Antagonist and does not delete the Denizen", () => {
    const start = playState(tableFaustian({
      antagonists: [{ denizenId: DEN_1, seatId: "hierophant", chipCount: 1 }],
      beneathAntagonists: [{ cardId: H5, denizenId: DEN_1 }],
    }), [antagonistDenizen(DEN_1, "Lord Ash")]);
    expectCode(
      () => applyCorrectFaustianAntagonist(start, { kind: "remove", denizenId: DEN_1, beneathDestinations: [] }),
      "INVALID_CAMPAIGN_STATE",
    );
    const result = applyCorrectFaustianAntagonist(start, {
      kind: "remove",
      denizenId: DEN_1,
      beneathDestinations: [{ cardId: H5, destination: { kind: "defeated_schemes" } }],
    });
    expect(result.nextState.faustian.antagonists).toEqual([]);
    expect(result.nextState.faustian.beneathAntagonists).toEqual([]);
    expect(result.nextState.faustian.defeatedSchemes).toContain(H5);
    expect(result.nextState.world.denizens).toHaveLength(1);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("records and removes a Demon without inventing a new entity system", () => {
    const start = playState(EMPTY_FAUSTIAN_STATE, [demonDenizen(DEN_2, "Ashmaw")]);
    const recorded = applyCorrectFaustianDemon(start, {
      kind: "record",
      denizenId: DEN_2,
      binding: { kind: "bound" },
      form: "black goat",
      hellOfOrigin: "source draft",
      magicalSymbol: "source draft",
      occupancy: { kind: "isha" },
      monthsInCurrentDomain: 0,
      condition: "active",
    });
    expect(recorded.nextState.faustian.demons).toHaveLength(1);
    expect(recorded.nextState.world.denizens).toHaveLength(1);
    const removed = applyCorrectFaustianDemon(recorded.nextState, { kind: "remove", denizenId: DEN_2 });
    expect(removed.nextState.faustian.demons).toEqual([]);
    expect(removed.nextState.world.denizens).toHaveLength(1);
  });

  it("sets and clears a Domain seizure against another Domain", () => {
    const start = playState(EMPTY_FAUSTIAN_STATE, [antagonistDenizen(DEN_1, "Conduit")]);
    const set = applyCorrectFaustianDomainSeizure(start, {
      kind: "set",
      seatId: "hierophant",
      conduitDenizenId: DEN_1,
    });
    expect(set.nextState.faustian.domainSeizures).toEqual([{ seatId: "hierophant", conduitDenizenId: DEN_1 }]);
    expectCode(
      () => applyCorrectFaustianDomainSeizure(start, { kind: "set", seatId: "faustian", conduitDenizenId: DEN_1 }),
      "INVALID_CAMPAIGN_STATE",
    );
    const cleared = applyCorrectFaustianDomainSeizure(set.nextState, { kind: "clear", seatId: "hierophant" });
    expect(cleared.nextState.faustian.domainSeizures).toEqual([]);
  });

  it("corrects Laws, Forms, and origin-claim status", () => {
    const start = playState(EMPTY_FAUSTIAN_STATE);
    const laws = applyCorrectFaustianDevilProfile(start, {
      kind: "laws",
      selectedDevilLawIds: ["cannot_refuse_a_bet", "never_break_a_promise"],
    });
    expect(laws.nextState.faustian.selectedDevilLawIds).toEqual(["cannot_refuse_a_bet", "never_break_a_promise"]);
    const origin = applyCorrectFaustianDevilProfile(laws.nextState, {
      kind: "origin_claim",
      claimId: "betrayed_innocent_wizard",
      status: "disproven",
    });
    expect(origin.nextState.faustian.originClaims.find((claim) => claim.claimId === "betrayed_innocent_wizard")?.status).toBe("disproven");
  });
});

describe("Body D obligations and persistent consequences", () => {
  it("accumulates and fulfills due-month weeks without spending shared Time", () => {
    const start = playState(EMPTY_FAUSTIAN_STATE);
    const first = applyRecordFaustianDueMonthObligation(start, {
      wizardId: WIZ_A,
      dueMonthOrdinal: 4 as MonthOrdinal,
      weeks: 1,
    });
    const second = applyRecordFaustianDueMonthObligation(first.nextState, {
      wizardId: WIZ_A,
      dueMonthOrdinal: 4 as MonthOrdinal,
      weeks: 2,
    });
    expect(second.nextState.faustian.devilObligations).toEqual([
      { kind: "wizard_owes_week_due_month", wizardId: WIZ_A, dueMonthOrdinal: 4, weeks: 3 },
    ]);
    expect(second.nextState.lifecycle).toEqual(start.lifecycle);
    const fulfilled = applyFulfillFaustianDueMonthObligation(second.nextState, {
      wizardId: WIZ_A,
      dueMonthOrdinal: 4 as MonthOrdinal,
      weeks: 3,
    });
    expect(fulfilled.nextState.faustian.devilObligations).toEqual([]);
    expect(fulfilled.nextState.lifecycle).toEqual(start.lifecycle);
  });

  it("records and removes represented Flush / Full House consequences", () => {
    const start = playState(EMPTY_FAUSTIAN_STATE);
    const flush = applyCorrectFaustianPersistentEffect(start, {
      kind: "add",
      effect: { kind: "flush", suit: "hearts" },
    });
    expect(flush.nextState.faustian.persistentMachinationEffects).toEqual([{ kind: "flush", suit: "hearts" }]);
    expect(flush.nextState.faustian.resolvedFlushSuits).toContain("hearts");
    const removed = applyCorrectFaustianPersistentEffect(flush.nextState, {
      kind: "remove",
      effect: { kind: "flush", suit: "hearts" },
    });
    expect(removed.nextState.faustian.persistentMachinationEffects).toEqual([]);
  });
});

describe("Body D event registration", () => {
  it("registers Advanced commands and persisted events without leaking hidden card identity", () => {
    for (const commandType of [
      "correct_faustian_card",
      "correct_faustian_antagonist",
      "correct_faustian_demon",
      "correct_faustian_domain_seizure",
      "correct_faustian_devil_profile",
      "record_faustian_due_month_obligation",
      "fulfill_faustian_due_month_obligation",
      "correct_faustian_persistent_effect",
    ]) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
      expect(isLogicalStateCommandType(commandType as typeof CAMPAIGN_COMMAND_TYPES[number])).toBe(true);
    }
    for (const type of [
      "faustian_card_corrected",
      "faustian_antagonist_corrected",
      "faustian_demon_corrected",
      "faustian_domain_seizure_corrected",
      "faustian_devil_profile_corrected",
      "faustian_due_month_obligation_recorded",
      "faustian_due_month_obligation_fulfilled",
      "faustian_persistent_effect_corrected",
    ]) {
      expect(findValidatorMembers(campaignEventValidator as never, type, 1).length).toBe(1);
    }
    const events: CampaignEvent[] = [
      { type: "faustian_card_corrected", version: 1, data: { correctionKind: "placement", cardId: HK, deck: null } },
      { type: "faustian_antagonist_corrected", version: 1, data: { correctionKind: "attach", denizenId: DEN_1 } },
      { type: "faustian_demon_corrected", version: 1, data: { correctionKind: "record", denizenId: DEN_2 } },
      { type: "faustian_domain_seizure_corrected", version: 1, data: { correctionKind: "set", seatId: "hierophant" } },
      { type: "faustian_devil_profile_corrected", version: 1, data: { correctionKind: "laws" } },
      { type: "faustian_due_month_obligation_recorded", version: 1, data: { wizardId: WIZ_A, dueMonthOrdinal: 4 as MonthOrdinal, weeks: 1 } },
      { type: "faustian_due_month_obligation_fulfilled", version: 1, data: { wizardId: WIZ_A, dueMonthOrdinal: 4 as MonthOrdinal, weeks: 1 } },
      { type: "faustian_persistent_effect_corrected", version: 1, data: { correctionKind: "add", effectKind: "flush" } },
    ];
    for (const event of events) {
      const text = activityText(event);
      expect(text).not.toMatch(/hearts_king|spades_ace|King of Hearts|hearts_5/i);
    }
    const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");
    for (const name of [
      "correctFaustianCard",
      "correctFaustianAntagonist",
      "correctFaustianDemon",
      "correctFaustianDomainSeizure",
      "correctFaustianDevilProfile",
      "recordFaustianDueMonthObligation",
      "fulfillFaustianDueMonthObligation",
      "correctFaustianPersistentEffect",
    ]) {
      expect(source).toContain(`export const ${name} = mutation({`);
    }
    void CAMPAIGN_A;
  });
});
