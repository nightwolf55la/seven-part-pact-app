import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  FaustianCardId,
  FaustianPendingMachinationChallenge,
  FaustianPendingMachinationGroup,
  FaustianPendingMachinationGroupId,
  FaustianState,
  MonthOrdinal,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CURRENT_CHECKPOINT_VERSION,
  DomainError,
  EMPTY_FAUSTIAN_STATE,
  accumulateFaustianDueMonthObligation,
  deriveRedoTransition,
  deriveUndoTransition,
  faustianCardId,
  fulfillFaustianDueMonthObligation,
  followingFaustianChallengeDueMonth,
  parseFaustianPendingMachinationChallengeId,
  parseFaustianPendingMachinationGroupId,
  statesDeepEqual,
  validateBackupState,
  validateCampaignStateV5Candidate,
  validateFaustianStructure,
  verifyCheckpoint,
  verifyMigrationInvariants,
} from "../shared/domain";
import { campaignStateV5Validator } from "../convex/validators";
import { makeTestCampaignStateV5 } from "./test-state";

const CAMPAIGN = "cmp_00000000-0000-0000-0000-000000000001";
const CHK = "chk_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const WIZ_C = "wiz_00000000-0000-0000-0000-00000000000c" as WizardId;
const CH_1 = parseFaustianPendingMachinationChallengeId("fpmc_00000000-0000-0000-0000-000000000001");
const CH_2 = parseFaustianPendingMachinationChallengeId("fpmc_00000000-0000-0000-0000-000000000002");
const GRP_1 = parseFaustianPendingMachinationGroupId("fpmg_00000000-0000-0000-0000-000000000001");
const GRP_2 = parseFaustianPendingMachinationGroupId("fpmg_00000000-0000-0000-0000-000000000002");
const GRP_3 = parseFaustianPendingMachinationGroupId("fpmg_00000000-0000-0000-0000-000000000003");
const GRP_4 = parseFaustianPendingMachinationGroupId("fpmg_00000000-0000-0000-0000-000000000004");
const TWIST = faustianCardId("spades", "ace");
const HK = faustianCardId("hearts", "king");
const SK = faustianCardId("spades", "king");
const HQ = faustianCardId("hearts", "queen");
const SQ = faustianCardId("spades", "queen");
const H2 = faustianCardId("hearts", "2");
const H3 = faustianCardId("hearts", "3");
const H4 = faustianCardId("hearts", "4");
const H9 = faustianCardId("hearts", "9");
const S9 = faustianCardId("spades", "9");
const C9 = faustianCardId("clubs", "9");

function matchesValidator(
  validator: { kind?: string; value?: unknown; members?: unknown[]; element?: unknown; fields?: Record<string, unknown>; inner?: unknown },
  value: unknown,
): boolean {
  switch (validator.kind) {
    case "string":
      return typeof value === "string";
    case "number":
    case "float64":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "literal":
      return value === validator.value;
    case "union":
      return (validator.members as Array<{ kind?: string }>).some((member) => matchesValidator(member, value));
    case "array":
      return Array.isArray(value) && value.every((item) => matchesValidator(validator.element as { kind?: string }, item));
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(validator.fields ?? {})) {
        if (!(key in obj) || obj[key] === undefined) return false;
        if (!matchesValidator(field as { kind?: string }, obj[key])) return false;
      }
      return true;
    }
    default:
      return false;
  }
}

function take(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  return { ...faustian, faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)) };
}

function expectInvalid(state: CampaignStateV5, pattern: RegExp): void {
  expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  try {
    validateCampaignStateV5Candidate(state);
  } catch (error) {
    expect((error as Error).message).toMatch(pattern);
  }
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

function campaign(faustian: FaustianState): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 3 as MonthOrdinal },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A, "A"), wizard(WIZ_B, "B"), wizard(WIZ_C, "C")],
    faustian,
  });
}

function pendingGroup(
  groupId: FaustianPendingMachinationGroupId,
  originalCardIds: readonly FaustianCardId[],
  responsibleWizardId: WizardId | null,
): FaustianPendingMachinationGroup {
  return {
    groupId,
    responsibleWizardId,
    originalCardIds,
    status: "pending",
    completedByWizardId: null,
    completedMonthOrdinal: null,
  };
}

function onePairChallenge(overrides?: Partial<FaustianPendingMachinationChallenge>): FaustianPendingMachinationChallenge {
  return {
    challengeId: CH_1,
    kind: "one_pair",
    sourceMonthOrdinal: 3 as MonthOrdinal,
    dueMonthOrdinal: followingFaustianChallengeDueMonth(3 as MonthOrdinal),
    scoringHandCardIds: [HK, SK, H2, H3, TWIST],
    groups: [pendingGroup(GRP_1, [HK, SK, H2, H3, TWIST], null)],
    outcomeDependentTwistCardIds: [TWIST],
    ...overrides,
  };
}

function onePairFaustian(): FaustianState {
  return {
    ...take(EMPTY_FAUSTIAN_STATE, [HK, SK, H2, H3, TWIST]),
    setAsideHand: [HK, SK, H2, H3],
    machinations: [{ cardId: TWIST, facing: "face_down" }],
    activeTwistCardIds: [TWIST],
    pendingMachinationChallenges: [onePairChallenge()],
  };
}

describe("Faustian pending Machination V5 foundation", () => {
  it("accepts an empty valid pending-challenge collection on current V5", () => {
    expect(EMPTY_FAUSTIAN_STATE.pendingMachinationChallenges).toEqual([]);
    expect(() => validateFaustianStructure(EMPTY_FAUSTIAN_STATE)).not.toThrow();
    const state = campaign(EMPTY_FAUSTIAN_STATE);
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(matchesValidator(campaignStateV5Validator as never, state)).toBe(true);
  });

  it("validates One Pair pending physical correspondence", () => {
    const state = campaign(onePairFaustian());
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(state.faustian.setAsideHand).toEqual([HK, SK, H2, H3]);
    expect(state.faustian.activeTwistCardIds).toEqual([TWIST]);
    expect(state.faustian.machinations[0]?.cardId).toBe(TWIST);
  });

  it("validates Two Pair groups, distinct Wizards, and entrusted holdings", () => {
    const faustian: FaustianState = {
      ...take(EMPTY_FAUSTIAN_STATE, [HK, SK, HQ, SQ, H3, TWIST]),
      entrustedCards: [
        { cardId: HK, wizardId: WIZ_A },
        { cardId: SK, wizardId: WIZ_A },
        { cardId: HQ, wizardId: WIZ_B },
        { cardId: SQ, wizardId: WIZ_B },
      ],
      machinations: [{ cardId: TWIST, facing: "face_up" }],
      activeTwistCardIds: [TWIST],
      faustianDeck: take(EMPTY_FAUSTIAN_STATE, [HK, SK, HQ, SQ, H3, TWIST]).faustianDeck.concat([H3]),
      pendingMachinationChallenges: [{
        challengeId: CH_1,
        kind: "two_pair",
        sourceMonthOrdinal: 3 as MonthOrdinal,
        dueMonthOrdinal: 4 as MonthOrdinal,
        scoringHandCardIds: [HK, SK, HQ, SQ, H3],
        groups: [
          pendingGroup(GRP_1, [HK, SK], WIZ_A),
          pendingGroup(GRP_2, [HQ, SQ], WIZ_B),
        ],
        outcomeDependentTwistCardIds: [TWIST],
      }],
    };
    expect(() => validateCampaignStateV5Candidate(campaign(faustian))).not.toThrow();
  });

  it("validates Three of a Kind groups, three Wizards, and correct holdings", () => {
    const faustian: FaustianState = {
      ...take(EMPTY_FAUSTIAN_STATE, [H9, S9, C9, H2, H3]),
      entrustedCards: [
        { cardId: H9, wizardId: WIZ_A },
        { cardId: S9, wizardId: WIZ_B },
        { cardId: C9, wizardId: WIZ_C },
      ],
      faustianDeck: take(EMPTY_FAUSTIAN_STATE, [H9, S9, C9, H2, H3]).faustianDeck.concat([H2, H3]),
      pendingMachinationChallenges: [{
        challengeId: CH_1,
        kind: "three_of_a_kind",
        sourceMonthOrdinal: 1 as MonthOrdinal,
        dueMonthOrdinal: 2 as MonthOrdinal,
        scoringHandCardIds: [H9, S9, C9, H2, H3],
        groups: [
          pendingGroup(GRP_1, [H9], WIZ_A),
          pendingGroup(GRP_2, [S9], WIZ_B),
          pendingGroup(GRP_3, [C9], WIZ_C),
        ],
        outcomeDependentTwistCardIds: [],
      }],
    };
    expect(() => validateCampaignStateV5Candidate(campaign(faustian))).not.toThrow();
  });

  it("keeps completed originalCardIds as metadata after the released card moves", () => {
    const faustian: FaustianState = {
      ...take(EMPTY_FAUSTIAN_STATE, [HK, SK, H2, H3, TWIST]),
      defeatedSchemes: [HK],
      setAsideHand: [SK, H2, H3],
      machinations: [{ cardId: TWIST, facing: "face_down" }],
      activeTwistCardIds: [TWIST],
      pendingMachinationChallenges: [onePairChallenge({
        groups: [{
          groupId: GRP_1,
          responsibleWizardId: null,
          originalCardIds: [HK, SK, H2, H3, TWIST],
          status: "completed",
          completedByWizardId: WIZ_B,
          completedMonthOrdinal: 4 as MonthOrdinal,
        }],
      })],
    };
    expect(() => validateCampaignStateV5Candidate(campaign(faustian))).not.toThrow();
  });

  it("allows a completed historical card to participate in a later challenge", () => {
    const faustian: FaustianState = {
      ...take(EMPTY_FAUSTIAN_STATE, [HK, SK, HQ, SQ, H2, H3, H4, TWIST]),
      setAsideHand: [HQ, SQ, H2, H3, H4],
      machinations: [{ cardId: TWIST, facing: "face_down" }],
      activeTwistCardIds: [TWIST],
      faustianDeck: take(EMPTY_FAUSTIAN_STATE, [HK, SK, HQ, SQ, H2, H3, H4, TWIST]).faustianDeck.concat([HK, SK]),
      pendingMachinationChallenges: [
        {
          challengeId: CH_1,
          kind: "one_pair",
          sourceMonthOrdinal: 1 as MonthOrdinal,
          dueMonthOrdinal: 2 as MonthOrdinal,
          scoringHandCardIds: [HK, SK, H2, H3, H4],
          groups: [{
            groupId: GRP_1,
            responsibleWizardId: null,
            originalCardIds: [HK, SK, H2, H3, H4],
            status: "completed",
            completedByWizardId: WIZ_A,
            completedMonthOrdinal: 2 as MonthOrdinal,
          }],
          outcomeDependentTwistCardIds: [],
        },
        onePairChallenge({
          challengeId: CH_2,
          scoringHandCardIds: [HQ, SQ, H2, H3, H4],
          groups: [pendingGroup(GRP_4, [HQ, SQ, H2, H3, H4], null)],
          outcomeDependentTwistCardIds: [TWIST],
        }),
      ],
    };
    expect(() => validateCampaignStateV5Candidate(campaign(faustian))).not.toThrow();
  });

  it("fails closed when a pending card is reserved by two groups", () => {
    const faustian: FaustianState = {
      ...take(EMPTY_FAUSTIAN_STATE, [HK, SK, HQ, SQ, H3]),
      entrustedCards: [
        { cardId: HK, wizardId: WIZ_A },
        { cardId: SK, wizardId: WIZ_A },
        { cardId: HQ, wizardId: WIZ_B },
        { cardId: SQ, wizardId: WIZ_B },
      ],
      faustianDeck: take(EMPTY_FAUSTIAN_STATE, [HK, SK, HQ, SQ, H3]).faustianDeck.concat([H3]),
      pendingMachinationChallenges: [{
        challengeId: CH_1,
        kind: "two_pair",
        sourceMonthOrdinal: 3 as MonthOrdinal,
        dueMonthOrdinal: 4 as MonthOrdinal,
        scoringHandCardIds: [HK, SK, HQ, SQ, H3],
        groups: [
          pendingGroup(GRP_1, [HK, SK], WIZ_A),
          pendingGroup(GRP_2, [HK, HQ], WIZ_B),
        ],
        outcomeDependentTwistCardIds: [],
      }],
    };
    expectInvalid(campaign(faustian), /unique within the challenge|reserved by more than one pending/i);
  });

  it("fails closed when one active Twist is reserved by two challenges", () => {
    const extra = onePairChallenge({
      challengeId: CH_2,
      scoringHandCardIds: [HQ, SQ, H2, H3, H4],
      groups: [pendingGroup(GRP_2, [HQ, SQ, H2, H3, H4], null)],
    });
    const faustian: FaustianState = {
      ...take(EMPTY_FAUSTIAN_STATE, [HK, SK, H2, H3, HQ, SQ, H4, TWIST]),
      setAsideHand: [HK, SK, H2, H3, HQ, SQ, H4],
      machinations: [{ cardId: TWIST, facing: "face_down" }],
      activeTwistCardIds: [TWIST],
      pendingMachinationChallenges: [onePairChallenge(), extra],
    };
    expectInvalid(campaign(faustian), /reserved by more than one unresolved challenge/i);
  });

  it("fails closed when a reserved Twist is physically outside Machinations", () => {
    const faustian: FaustianState = {
      ...onePairFaustian(),
      machinations: [],
      activeTwistCardIds: [TWIST],
      defeatedSchemes: [TWIST],
    };
    expectInvalid(campaign(faustian), /Machinations|active Twist/i);
  });

  it("keeps the exact 52 physical cards once with challenge metadata present", () => {
    expect(() => validateFaustianStructure(onePairFaustian())).not.toThrow();
    const located = [
      ...onePairFaustian().faustianDeck,
      ...onePairFaustian().setAsideHand,
      ...onePairFaustian().machinations.map((card) => card.cardId),
    ];
    expect(new Set(located).size).toBe(52);
    expect(located).toHaveLength(52);
  });

  it("accumulates due-month Wizard-week obligations for the same Wizard and MonthOrdinal", () => {
    const first = accumulateFaustianDueMonthObligation([], WIZ_A, 4 as MonthOrdinal, 1);
    const second = accumulateFaustianDueMonthObligation(first, WIZ_A, 4 as MonthOrdinal, 2);
    expect(second).toEqual([{
      kind: "wizard_owes_week_due_month",
      wizardId: WIZ_A,
      dueMonthOrdinal: 4,
      weeks: 3,
    }]);
    const state = campaign({ ...EMPTY_FAUSTIAN_STATE, devilObligations: second });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("explicitly decrements and removes a due-month obligation without spending Time", () => {
    const start = accumulateFaustianDueMonthObligation([], WIZ_A, 4 as MonthOrdinal, 2);
    const decremented = fulfillFaustianDueMonthObligation(start, WIZ_A, 4 as MonthOrdinal, 1);
    expect(decremented).toEqual([{
      kind: "wizard_owes_week_due_month",
      wizardId: WIZ_A,
      dueMonthOrdinal: 4,
      weeks: 1,
    }]);
    expect(fulfillFaustianDueMonthObligation(decremented, WIZ_A, 4 as MonthOrdinal, 1)).toEqual([]);
  });

  it("rejects malformed old current-V5 state lacking mandatory fields with no silent normalization", () => {
    const { pendingMachinationChallenges: _removed, ...missing } = EMPTY_FAUSTIAN_STATE;
    expect(() => validateFaustianStructure(missing)).toThrow(/pendingMachinationChallenges/);
    expect(() => validateFaustianStructure({
      ...EMPTY_FAUSTIAN_STATE,
      devilObligations: [{ kind: "wizard_owes_week_next_month", wizardId: WIZ_A }],
    })).toThrow(/kind is invalid/);
    expect("pendingMachinationChallenges" in EMPTY_FAUSTIAN_STATE).toBe(true);
  });

  it("round-trips pending challenge state through a complete snapshot", () => {
    const state = campaign(onePairFaustian());
    const snapshot = JSON.parse(JSON.stringify(state)) as CampaignStateV5;
    expect(snapshot.faustian.pendingMachinationChallenges).toEqual(state.faustian.pendingMachinationChallenges);
    expect(() => validateCampaignStateV5Candidate(snapshot)).not.toThrow();
    expect(statesDeepEqual(snapshot, state)).toBe(true);
  });

  it("includes pending challenge state in whole-state Undo/Redo", () => {
    const before = campaign(EMPTY_FAUSTIAN_STATE);
    const after = campaign(onePairFaustian());
    const undone = deriveUndoTransition({
      control: {
        historyControlVersion: 1,
        campaignId: CAMPAIGN,
        undoStack: [0, 1],
        redoStack: [],
      },
      campaignRevision: 1,
      campaignState: after,
      targetSnapshotState: before,
      currentLogicalSnapshotState: after,
      targetRevisionCommandType: "arrange_faustian_table",
    }, CAMPAIGN);
    expect(undone.nextState.faustian.pendingMachinationChallenges).toEqual([]);
    const redone = deriveRedoTransition({
      control: {
        historyControlVersion: 1,
        campaignId: CAMPAIGN,
        undoStack: undone.nextUndoStack,
        redoStack: undone.nextRedoStack,
      },
      campaignRevision: 1,
      campaignState: undone.nextState,
      targetSnapshotState: after,
      currentLogicalSnapshotState: undone.nextState,
      targetRevisionCommandType: "arrange_faustian_table",
    }, CAMPAIGN);
    expect(redone.nextState.faustian.pendingMachinationChallenges).toEqual(after.faustian.pendingMachinationChallenges);
  });

  it("includes pending challenge state in checkpoint restore verification", () => {
    const state = campaign(onePairFaustian());
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: CURRENT_CHECKPOINT_VERSION,
        checkpointId: CHK,
        campaignId: CAMPAIGN,
        label: "Before Ritual",
        sourceRevision: 1,
        createdAtMs: 1_000_000,
      },
      campaignId: CAMPAIGN,
      campaignRevision: 1,
      snapshotExists: true,
      snapshotState: state,
      revisionCommandType: "arrange_faustian_table",
    });
    expect(errors).toEqual([]);
  });

  it("includes pending challenge state in portable backup/import validation", () => {
    const state = campaign(onePairFaustian());
    expect(validateBackupState(state)).toBeNull();
  });

  it("includes pending challenge state in campaign-health verification", () => {
    const state = campaign(onePairFaustian());
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    const health = verifyMigrationInvariants({
      campaignRevision: 1,
      revisions: [{
        campaignRevision: 1,
        commandType: "arrange_faustian_table",
        commandFingerprint: "arrange_faustian_table:v1:test",
      }],
      events: [{
        campaignRevision: 1,
        eventIndex: 0,
        event: { type: "faustian_table_arranged", version: 1, data: {} },
      }],
      snapshots: [
        { campaignRevision: 0, state: campaign(EMPTY_FAUSTIAN_STATE) },
        { campaignRevision: 1, state },
      ],
      campaignDocuments: [{
        campaignKey: "default",
        campaignId: CAMPAIGN,
        campaignRevision: 1,
        state,
      }],
    });
    expect(health.valid).toBe(true);
    expect(health.errors).toEqual([]);
  });
});
