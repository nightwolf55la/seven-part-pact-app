import { describe, it, expect } from "vitest";
import type {
  AllocationId,
  CampaignStateV4,
  CampaignStateV5,
  CompanionRelationshipId,
  CurrentCampaignState,
  DenizenId,
  EngagementId,
  FaustianCardId,
  FaustianState,
  MonthOrdinal,
  MovablePlanetId,
  PlayerId,
  TimeAllocation,
  TimeDestination,
  TimeParticipant,
  WizardId,
  WizardInitIds,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V4,
  DomainError,
  EMPTY_FAUSTIAN_STATE,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SHARED_WORLD_STATE,
  FAUSTIAN_DEVIL_FORM_IDS,
  FAUSTIAN_DEVIL_LAW_IDS,
  MOVABLE_PLANET_IDS,
  PACT_SEAT_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyAdvancePhase,
  applyBeginPlay,
  applyCommitTimeToEngagement,
  applyCreateWizard,
  applyAddPlayer,
  applyScheduleTime,
  applySetCampaignAge,
  applySetFacilitator,
  applySetPactSeatStatus,
  applySetPactSeatWizard,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applySetWatcher,
  applySpendOrreryTime,
  asCentidegreePosition,
  buildInitializedDefaultFaustianState,
  faustianCardId,
  initialCampaignState,
  validateCampaignState,
  validateCampaignStateV4Candidate,
  validateCampaignStateV5Candidate,
  validateFaustianStructure,
  wizardIdOfParticipant,
} from "../shared/domain";
import {
  campaignStateV4Validator,
  campaignStateV5Validator,
} from "../convex/validators";
import type { PactSeatId } from "../shared/domain/pact-seats";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const CMPREL_1 = "cmprel_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId;
const DEVIL_ALLOC = "alc_00000000-0000-0000-0000-00000000d001" as AllocationId;
const TWIST = faustianCardId("spades", "ace");
const HEARTS_KING = faustianCardId("hearts", "king");
const CLUBS_2 = faustianCardId("clubs", "2");
const DIAMONDS_3 = faustianCardId("diamonds", "3");

const P1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const P2 = "plr_00000000-0000-0000-0000-000000000002" as PlayerId;
const P3 = "plr_00000000-0000-0000-0000-000000000003" as PlayerId;
const P4 = "plr_00000000-0000-0000-0000-000000000004" as PlayerId;
const P5 = "plr_00000000-0000-0000-0000-000000000005" as PlayerId;
const P6 = "plr_00000000-0000-0000-0000-000000000006" as PlayerId;
const P7 = "plr_00000000-0000-0000-0000-000000000007" as PlayerId;

function wizId(n: number): WizardId {
  return `wiz_00000000-0000-0000-0000-00000000000${n}` as WizardId;
}

function makeAllocationId(n: number): AllocationId {
  return `alc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as AllocationId;
}

function makeEngagementId(n: number): EngagementId {
  return `eng_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as EngagementId;
}

function makeWizardInits(wizardIds: WizardId[]): WizardInitIds[] {
  let counter = 1;
  return wizardIds.map((wizardId) => {
    const base = counter;
    counter += 5;
    return {
      wizardId,
      allocationIds: [
        makeAllocationId(base),
        makeAllocationId(base + 1),
        makeAllocationId(base + 2),
        makeAllocationId(base + 3),
      ] as [AllocationId, AllocationId, AllocationId, AllocationId],
      engagementId: makeEngagementId(base + 4),
    };
  });
}

const AWAKENING_INDICES: Record<MovablePlanetId, number> = {
  saturn: 16, jupiter: 1, mars: 18, venus: 14, mercury: 17,
};

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

function takeFromDeck(faustian: FaustianState, cardId: FaustianCardId): FaustianState {
  if (!faustian.faustianDeck.includes(cardId)) {
    throw new Error(`card ${cardId} is not in the Faustian Deck`);
  }
  return {
    ...faustian,
    faustianDeck: faustian.faustianDeck.filter((id) => id !== cardId),
  };
}

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
    case "any":
      return true;
    case "union":
      return (validator.members as Array<{ kind?: string }>).some((member) => matchesValidator(member, value));
    case "array":
      return Array.isArray(value) && value.every((item) => matchesValidator(validator.element as { kind?: string }, item));
    case "optional":
      return value === undefined || matchesValidator(validator.inner as { kind?: string }, value);
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const obj = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(validator.fields ?? {})) {
        const fieldValidator = field as { kind?: string; inner?: unknown };
        const optional = fieldValidator.kind === "optional";
        const inner = optional ? fieldValidator.inner as { kind?: string } : fieldValidator;
        if (!(key in obj) || obj[key] === undefined) {
          if (optional) continue;
          return false;
        }
        if (!matchesValidator(inner, obj[key])) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
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

function pendingAlloc(allocationId: AllocationId, destination: TimeDestination | null = null): TimeAllocation {
  return { allocationId, destination, note: null, resolution: "pending" };
}

function devilParticipant(allocations: readonly TimeAllocation[]): TimeParticipant {
  return {
    participant: { kind: "devil" },
    effectiveBudget: allocations.length,
    rescheduleAllowance: 0,
    reschedulesUsed: 0,
    allocations,
  };
}

function buildReadyState(): CurrentCampaignState {
  let state = initialCampaignState();
  const players = [P1, P2, P3, P4, P5, P6, P7];
  for (let i = 0; i < players.length; i++) {
    state = applyAddPlayer(state, players[i], `Player ${i + 1}`).nextState;
  }
  state = applySetCampaignAge(state, "awakening").nextState;
  state = applySetFacilitator(state, P1).nextState;
  state = applySetSetupMonth(state, 11 as MonthOrdinal).nextState;
  for (const planetId of MOVABLE_PLANET_IDS) {
    state = applySetSetupOrreryPosition(state, planetId, AWAKENING_INDICES[planetId]).nextState;
  }
  const seats: PactSeatId[] = [...PACT_SEAT_IDS];
  for (let i = 0; i < seats.length; i++) {
    state = applyCreateWizard(state, wizId(i + 1), `Wizard ${i + 1}`, players[i], seats[i]).nextState;
    state = applySetPactSeatWizard(state, seats[i], wizId(i + 1)).nextState;
    state = applySetPactSeatStatus(state, seats[i], i < 6 ? "present" : "silent").nextState;
    state = applySetWatcher(state, seats[i], P1).nextState;
  }
  return state;
}

const MONTH = 12 as MonthOrdinal;
const PRESENT_WIZARD_IDS: WizardId[] = Array.from({ length: 6 }, (_, i) => wizId(i + 1));

function forceAdvancePhase(
  state: CurrentCampaignState,
  expectedPhase: "new_moon" | "visions" | "planning" | "story",
): CurrentCampaignState {
  const r = applyAdvancePhase(state, { expectedMonthOrdinal: MONTH, expectedPhase });
  if (r.outcome === "applied") return r.nextState;
  const ackKeys = r.warnings.map((w) => w.key);
  const r2 = applyAdvancePhase(state, {
    expectedMonthOrdinal: MONTH,
    expectedPhase,
    acknowledgedWarningKeys: ackKeys,
  });
  if (r2.outcome === "applied") return r2.nextState;
  throw new Error("Unexpected warnings after acknowledgement");
}

function buildPlayState(): CurrentCampaignState {
  const setup = buildReadyState();
  return applyBeginPlay(setup, { wizardInits: makeWizardInits(PRESENT_WIZARD_IDS) }).nextState;
}

function buildVisionsState(): CurrentCampaignState {
  return forceAdvancePhase(buildPlayState(), "new_moon");
}

function buildPlanningState(): CurrentCampaignState {
  return forceAdvancePhase(buildVisionsState(), "visions");
}

function withPlayFaustian(state: CurrentCampaignState, faustian: FaustianState, world = state.world): CurrentCampaignState {
  return { ...state, faustian, world };
}

function withDevilTime(
  state: CurrentCampaignState,
  allocations: readonly TimeAllocation[] = [pendingAlloc(DEVIL_ALLOC)],
): CurrentCampaignState {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      currentMonth: {
        ...state.lifecycle.currentMonth,
        timeParticipants: [
          ...state.lifecycle.currentMonth.timeParticipants,
          devilParticipant(allocations),
        ],
      },
    },
  };
}

function firstWizardAllocId(state: CurrentCampaignState, wizardId: WizardId): AllocationId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const tp = state.lifecycle.currentMonth.timeParticipants.find(
    (t) => wizardIdOfParticipant(t.participant) === wizardId,
  );
  if (!tp) throw new Error(`no time participant for ${wizardId}`);
  return tp.allocations[0].allocationId;
}

function firstEngagementId(state: CurrentCampaignState, wizardId: WizardId): EngagementId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const eng = state.lifecycle.currentMonth.engagements.find((e) => e.actingWizardId === wizardId);
  if (!eng) throw new Error(`no engagement for ${wizardId}`);
  return eng.engagementId;
}

function worldWithCompanionAndDenizen() {
  return {
    ...EMPTY_SHARED_WORLD_STATE,
    denizens: [
      {
        denizenId: DEN_1,
        name: "Companion Soul",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
      {
        denizenId: DEN_2,
        name: "Unbound Townsfolk",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
    ],
    companionRelationships: [{
      companionRelationshipId: CMPREL_1,
      wizardId: wizId(1),
      element: "fire" as const,
      denizenId: DEN_1,
      description: null,
      status: "current" as const,
    }],
  };
}

function faustianWithSchemeAndSeizure(): FaustianState {
  const moved = takeFromDeck(takeFromDeck(initializedFaustian(), CLUBS_2), DIAMONDS_3);
  return {
    ...moved,
    communities: moved.communities.map((community) =>
      community.communityId === "aries"
        ? { ...community, schemes: [{ cardId: CLUBS_2, facing: "face_up" as const }] }
        : community,
    ),
    domainSeizures: [{ seatId: "hierophant", conduitDenizenId: DEN_2 }],
    devilDeck: [...moved.devilDeck, DIAMONDS_3],
  };
}

function minimalV4Play(timeParticipants: TimeParticipant[]): CampaignStateV4 {
  return {
    schemaVersion: 4,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 3 as MonthOrdinal },
    configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
      portrayedByPlayerId: PLR_A,
      character: { ...BLANK_WIZARD_CHARACTER_V4 },
    }],
    pactSeats: {
      ...EMPTY_PACT_SEATS,
      faustian: { status: "present", wizardId: WIZ_A, watcherPlayerId: PLR_A },
    },
    lifecycle: {
      kind: "play",
      phase: "planning",
      orrery: {
        saturn: asCentidegreePosition(0),
        jupiter: asCentidegreePosition(0),
        mars: asCentidegreePosition(0),
        venus: asCentidegreePosition(0),
        mercury: asCentidegreePosition(0),
      },
      currentMonth: {
        timeParticipants: timeParticipants as CampaignStateV4["lifecycle"] extends { kind: "play" }
          ? CampaignStateV4["lifecycle"]["currentMonth"]["timeParticipants"]
          : never,
        engagements: [],
        wizardmootAttendance: null,
      },
    },
    wizardmootHistory: [],
  };
}

describe("M5.2E Faustian Time participant representability", () => {
  it("V5 accepts Wizard and Devil TimeParticipants together", () => {
    const state = withDevilTime(buildVisionsState());
    expect(() => validateCampaignState(state)).not.toThrow();
    if (state.lifecycle.kind !== "play") throw new Error("not play");
    const kinds = state.lifecycle.currentMonth.timeParticipants.map((tp) => tp.participant.kind);
    expect(kinds).toContain("wizard");
    expect(kinds).toContain("devil");
    expect(kinds.filter((kind) => kind === "devil")).toHaveLength(1);
  });

  it("malformed and duplicate Devil participants fail closed", () => {
    const visions = buildVisionsState();
    if (visions.lifecycle.kind !== "play") throw new Error("not play");
    const duplicate = {
      ...visions,
      lifecycle: {
        ...visions.lifecycle,
        currentMonth: {
          ...visions.lifecycle.currentMonth,
          timeParticipants: [
            ...visions.lifecycle.currentMonth.timeParticipants,
            devilParticipant([pendingAlloc(DEVIL_ALLOC)]),
            devilParticipant([pendingAlloc("alc_00000000-0000-0000-0000-00000000d002" as AllocationId)]),
          ],
        },
      },
    };
    expectInvalid(duplicate, /devil/i);

    const malformed = {
      ...visions,
      lifecycle: {
        ...visions.lifecycle,
        currentMonth: {
          ...visions.lifecycle.currentMonth,
          timeParticipants: [
            ...visions.lifecycle.currentMonth.timeParticipants,
            {
              participant: { kind: "devil", wizardId: wizId(1) },
              effectiveBudget: 1,
              rescheduleAllowance: 0,
              reschedulesUsed: 0,
              allocations: [pendingAlloc(DEVIL_ALLOC)],
            },
          ],
        },
      },
    };
    expectInvalid(malformed, /devil/i);
  });

  it("legacy V4 remains Wizard-only", () => {
    const wizardOnly = minimalV4Play([{
      participant: { kind: "wizard", wizardId: WIZ_A },
      effectiveBudget: 4,
      rescheduleAllowance: 1,
      reschedulesUsed: 0,
      allocations: [pendingAlloc("alc_00000000-0000-0000-0000-0000000000aa" as AllocationId)],
    }]);
    expect(() => validateCampaignStateV4Candidate(wizardOnly)).not.toThrow();
    expect(matchesValidator(campaignStateV4Validator, wizardOnly)).toBe(true);

    const withDevil = minimalV4Play([
      {
        participant: { kind: "wizard", wizardId: WIZ_A },
        effectiveBudget: 4,
        rescheduleAllowance: 1,
        reschedulesUsed: 0,
        allocations: [pendingAlloc("alc_00000000-0000-0000-0000-0000000000aa" as AllocationId)],
      },
      devilParticipant([pendingAlloc(DEVIL_ALLOC)]),
    ]);
    expect(() => validateCampaignStateV4Candidate(withDevil)).toThrow(DomainError);
    expect(() => validateCampaignStateV4Candidate(withDevil)).toThrow(/wizard/i);
    expect(matchesValidator(campaignStateV4Validator, withDevil)).toBe(false);

    const devilDest: TimeParticipant = {
      participant: { kind: "wizard", wizardId: WIZ_A },
      effectiveBudget: 1,
      rescheduleAllowance: 0,
      reschedulesUsed: 0,
      allocations: [pendingAlloc(DEVIL_ALLOC, { kind: "devil_grimoire" })],
    };
    const v4DevilDest = minimalV4Play([devilDest]);
    expect(() => validateCampaignStateV4Candidate(v4DevilDest)).toThrow(/destination|kind/i);
    expect(matchesValidator(campaignStateV4Validator, v4DevilDest)).toBe(false);
  });

  it("Devil TimeParticipant survives current V5 validation and Convex serialization shape", () => {
    const state = withDevilTime(buildVisionsState(), [
      pendingAlloc(DEVIL_ALLOC, { kind: "devil_grimoire" }),
    ]);
    expect(() => validateCampaignState(state)).not.toThrow();
    const roundTripped = JSON.parse(JSON.stringify(state)) as CampaignStateV5;
    expect(() => validateCampaignState(roundTripped)).not.toThrow();
    expect(matchesValidator(campaignStateV5Validator, state)).toBe(true);
    if (roundTripped.lifecycle.kind !== "play") throw new Error("not play");
    expect(roundTripped.lifecycle.currentMonth.timeParticipants.some((tp) => tp.participant.kind === "devil")).toBe(true);
  });
});

describe("M5.2E Wizard-only Time assumptions", () => {
  it("Wizardmoot initialization ignores Devil participants", () => {
    const planning = withDevilTime(buildPlanningState(), [
      pendingAlloc(DEVIL_ALLOC, { kind: "devil_grimoire" }),
    ]);
    const story = forceAdvancePhase(planning, "planning");
    const meeting = forceAdvancePhase(story, "story");
    if (meeting.lifecycle.kind !== "play") throw new Error("not play");
    const attendance = meeting.lifecycle.currentMonth.wizardmootAttendance;
    expect(attendance).not.toBeNull();
    expect(attendance!.every((row) => PRESENT_WIZARD_IDS.includes(row.wizardId))).toBe(true);
    expect(attendance).toHaveLength(PRESENT_WIZARD_IDS.length);
    expect(() => validateCampaignState(meeting)).not.toThrow();
  });

  it("Engagement linking rejects a Devil allocation while Wizard behavior remains unchanged", () => {
    const planning = withDevilTime(buildPlanningState());
    const wizardAlloc = firstWizardAllocId(planning, wizId(1));
    const wizardEng = firstEngagementId(planning, wizId(1));
    const wizardLinked = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: wizardAlloc,
      destination: { kind: "engagement", engagementId: wizardEng },
      note: null,
    });
    expect(wizardLinked.nextState.lifecycle.kind).toBe("play");
    if (wizardLinked.nextState.lifecycle.kind !== "play") throw new Error("not play");
    expect(
      wizardLinked.nextState.lifecycle.currentMonth.engagements.find((e) => e.engagementId === wizardEng)?.linkedTimeAllocationId,
    ).toBe(wizardAlloc);

    const visions = withDevilTime(buildVisionsState());
    expect(() => applyScheduleTime(visions, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      destination: { kind: "engagement", engagementId: firstEngagementId(visions, wizId(1)) },
      note: null,
    })).toThrow(/devil|engagement|wizard/i);

    const story = forceAdvancePhase(withDevilTime(buildPlanningState()), "planning");
    expect(() => applyCommitTimeToEngagement(story, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      engagementId: firstEngagementId(story, wizId(1)),
    })).toThrow(/devil|wizard|engagement/i);
  });

  it("Wizard Orrery spending does not apply to a Devil Orrery allocation", () => {
    const story = forceAdvancePhase(withDevilTime(buildPlanningState(), [
      pendingAlloc(DEVIL_ALLOC, { kind: "orrery" }),
    ]), "planning");
    expect(() => applySpendOrreryTime(story, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      planetId: "mars",
      direction: "forward",
    })).toThrow(/wizard|devil/i);
  });
});

describe("M5.2E Devil destinations and Visions scheduling", () => {
  it("Wizard scheduling remains Planning-only even when a Devil participant is present", () => {
    const visions = withDevilTime(buildVisionsState());
    const wizardAlloc = firstWizardAllocId(visions, wizId(1));
    expect(() => applyScheduleTime(visions, {
      expectedMonthOrdinal: MONTH,
      allocationId: wizardAlloc,
      destination: { kind: "orrery" },
      note: null,
    })).toThrow(/planning/i);

    const planning = withDevilTime(buildPlanningState());
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: firstWizardAllocId(planning, wizId(1)),
      destination: { kind: "orrery" },
      note: null,
    });
    expect(scheduled.nextState.lifecycle.kind).toBe("play");
  });

  it("Devil scheduling works during Visions and Wizard scheduling does not", () => {
    const visions = withPlayFaustian(
      withDevilTime(buildVisionsState()),
      faustianWithSchemeAndSeizure(),
      worldWithCompanionAndDenizen(),
    );
    const scheduled = applyScheduleTime(visions, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      destination: { kind: "devil_grimoire" },
      note: "grimoire week",
    });
    if (scheduled.nextState.lifecycle.kind !== "play") throw new Error("not play");
    const devil = scheduled.nextState.lifecycle.currentMonth.timeParticipants.find((tp) => tp.participant.kind === "devil");
    expect(devil?.allocations[0].destination).toEqual({ kind: "devil_grimoire" });

    expect(() => applyScheduleTime(visions, {
      expectedMonthOrdinal: MONTH,
      allocationId: firstWizardAllocId(visions, wizId(1)),
      destination: { kind: "domain" },
      note: null,
    })).toThrow(/planning/i);

    const planning = withDevilTime(buildPlanningState());
    expect(() => applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      destination: { kind: "devil_grimoire" },
      note: null,
    })).toThrow(/visions/i);
  });

  it("representative typed Devil targets round-trip and invalid refs fail closed", () => {
    const visions = withPlayFaustian(
      withDevilTime(buildVisionsState()),
      {
        ...faustianWithSchemeAndSeizure(),
        persistentMachinationEffects: [{ kind: "flush", suit: "diamonds" }],
      },
      worldWithCompanionAndDenizen(),
    );

    const dests: TimeDestination[] = [
      { kind: "devil_community", communityId: "aries" },
      { kind: "devil_schemes", cardIds: [CLUBS_2] },
      { kind: "devil_companion", companionRelationshipId: CMPREL_1 },
      { kind: "devil_grimoire" },
      { kind: "devil_wizard", wizardId: wizId(1) },
      { kind: "devil_denizen", denizenId: DEN_2 },
      { kind: "devil_seized_domain", seatId: "hierophant" },
      { kind: "orrery" },
    ];

    for (const destination of dests) {
      const scheduled = applyScheduleTime(visions, {
        expectedMonthOrdinal: MONTH,
        allocationId: DEVIL_ALLOC,
        destination,
        note: null,
      });
      expect(() => validateCampaignState(scheduled.nextState)).not.toThrow();
      const roundTripped = JSON.parse(JSON.stringify(scheduled.nextState)) as CampaignStateV5;
      expect(() => validateCampaignState(roundTripped)).not.toThrow();
    }

    expect(() => applyScheduleTime(visions, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      destination: { kind: "devil_community", communityId: "not-a-community" as never },
      note: null,
    })).toThrow(/community/i);

    expect(() => applyScheduleTime(visions, {
      expectedMonthOrdinal: MONTH,
      allocationId: firstWizardAllocId(visions, wizId(1)),
      destination: { kind: "devil_grimoire" },
      note: null,
    })).toThrow(/planning|devil/i);

    const planning = withDevilTime(buildPlanningState());
    expect(() => applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: firstWizardAllocId(planning, wizId(1)),
      destination: { kind: "devil_grimoire" },
      note: null,
    })).toThrow(/devil/i);

    const spentSchemesMoved: CurrentCampaignState = withPlayFaustian(
      withDevilTime(buildVisionsState(), [pendingAlloc(DEVIL_ALLOC, {
        kind: "devil_schemes",
        cardIds: [CLUBS_2],
      })]),
      {
        ...initializedFaustian(),
        faustianDeck: initializedFaustian().faustianDeck.filter((id) => id !== CLUBS_2),
        devilDeck: [CLUBS_2],
      },
    );
    if (spentSchemesMoved.lifecycle.kind === "play") {
      const devil = spentSchemesMoved.lifecycle.currentMonth.timeParticipants.find((tp) => tp.participant.kind === "devil")!;
      const spent = {
        ...spentSchemesMoved,
        lifecycle: {
          ...spentSchemesMoved.lifecycle,
          currentMonth: {
            ...spentSchemesMoved.lifecycle.currentMonth,
            timeParticipants: spentSchemesMoved.lifecycle.currentMonth.timeParticipants.map((tp) =>
              tp.participant.kind === "devil"
                ? {
                    ...devil,
                    allocations: devil.allocations.map((alloc) => ({ ...alloc, resolution: "spent" as const })),
                  }
                : tp,
            ),
          },
        },
      };
      expect(() => validateCampaignState(spent)).not.toThrow();
    }
  });

  it("Devil Companion scheduling accepts a current relationship and rejects an ended one", () => {
    const destination = { kind: "devil_companion" as const, companionRelationshipId: CMPREL_1 };
    const currentWorld = worldWithCompanionAndDenizen();
    const currentVisions = withPlayFaustian(
      withDevilTime(buildVisionsState()),
      faustianWithSchemeAndSeizure(),
      currentWorld,
    );
    const scheduled = applyScheduleTime(currentVisions, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      destination,
      note: null,
    });
    if (scheduled.nextState.lifecycle.kind !== "play") throw new Error("not play");
    const devil = scheduled.nextState.lifecycle.currentMonth.timeParticipants.find((tp) => tp.participant.kind === "devil");
    expect(devil?.allocations[0].destination).toEqual(destination);

    const endedVisions = withPlayFaustian(
      withDevilTime(buildVisionsState()),
      faustianWithSchemeAndSeizure(),
      {
        ...currentWorld,
        companionRelationships: currentWorld.companionRelationships.map((rel) => ({
          ...rel,
          status: "ended" as const,
        })),
      },
    );
    expect(() => applyScheduleTime(endedVisions, {
      expectedMonthOrdinal: MONTH,
      allocationId: DEVIL_ALLOC,
      destination,
      note: null,
    })).toThrow(/current|ended|companion/i);
  });
});

describe("M5.2E Faustian durable structural state", () => {
  it("EMPTY and normal initialization include empty Flush history and Machination effects", () => {
    expect(EMPTY_FAUSTIAN_STATE.resolvedFlushSuits).toEqual([]);
    expect(EMPTY_FAUSTIAN_STATE.persistentMachinationEffects).toEqual([]);
    expect(initializedFaustian().resolvedFlushSuits).toEqual([]);
    expect(initializedFaustian().persistentMachinationEffects).toEqual([]);
    expect(() => validateFaustianStructure(EMPTY_FAUSTIAN_STATE)).not.toThrow();
    expect(() => validateFaustianStructure(initializedFaustian())).not.toThrow();
  });

  it("permanent Devil Time from a Wizard round-trips and validates quantity/ref", () => {
    const faustian: FaustianState = {
      ...initializedFaustian(),
      devilObligations: [{
        kind: "permanent_devil_time_from_wizard",
        wizardId: WIZ_A,
        weeks: 2,
      }],
    };
    const state: CampaignStateV5 = {
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
      faustian,
    };
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(matchesValidator(campaignStateV5Validator, state)).toBe(true);
    const roundTripped = JSON.parse(JSON.stringify(state)) as CampaignStateV5;
    expect(roundTripped.faustian.devilObligations).toEqual([{
      kind: "permanent_devil_time_from_wizard",
      wizardId: WIZ_A,
      weeks: 2,
    }]);

    expectInvalid({
      ...state,
      faustian: {
        ...faustian,
        devilObligations: [{ kind: "permanent_devil_time_from_wizard", wizardId: WIZ_A, weeks: 0 }],
      },
    }, /weeks/i);

    expectInvalid({
      ...state,
      faustian: {
        ...faustian,
        devilObligations: [{
          kind: "permanent_devil_time_from_wizard",
          wizardId: "wiz_00000000-0000-0000-0000-00000000dead" as WizardId,
          weeks: 1,
        }],
      },
    }, /wizardId/i);
  });

  it("Flush history and persistent Flush/Full-House effects remain after Machination cards move", () => {
    const moved = takeFromDeck(takeFromDeck(initializedFaustian(), HEARTS_KING), CLUBS_2);
    const faustian: FaustianState = {
      ...moved,
      machinations: [],
      activeTwistCardIds: [],
      defeatedSchemes: [HEARTS_KING, TWIST],
      devilDeck: [CLUBS_2],
      resolvedFlushSuits: ["hearts", "diamonds"],
      persistentMachinationEffects: [
        { kind: "flush", suit: "hearts" },
        { kind: "full_house", rank: "king" },
        { kind: "full_house", rank: "king" },
      ],
    };
    const state: CampaignStateV5 = {
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
      faustian,
    };
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(state.faustian.resolvedFlushSuits).toEqual(["hearts", "diamonds"]);
    expect(state.faustian.persistentMachinationEffects).toEqual([
      { kind: "flush", suit: "hearts" },
      { kind: "full_house", rank: "king" },
      { kind: "full_house", rank: "king" },
    ]);
  });

  it("7/8 are not modeled as persistent Full-House effects and malformed values fail closed", () => {
    const base: FaustianState = {
      ...initializedFaustian(),
      resolvedFlushSuits: ["spades"],
      persistentMachinationEffects: [{ kind: "full_house", rank: "9" }],
    };
    expect(() => validateFaustianStructure(base)).not.toThrow();

    expect(() => validateFaustianStructure({
      ...base,
      persistentMachinationEffects: [{ kind: "full_house", rank: "7" }],
    })).toThrow(/full_house|rank|7/i);

    expect(() => validateFaustianStructure({
      ...base,
      persistentMachinationEffects: [{ kind: "full_house", rank: "8" }],
    })).toThrow(/full_house|rank|8/i);

    expect(() => validateFaustianStructure({
      ...base,
      persistentMachinationEffects: [{ kind: "full_house", rank: "ace" }],
    })).toThrow(/full_house|rank|ace/i);

    expect(() => validateFaustianStructure({
      ...base,
      resolvedFlushSuits: ["hearts", "hearts"],
    })).toThrow(/duplicate|flush/i);

    expect(() => validateFaustianStructure({
      ...base,
      persistentMachinationEffects: [{ kind: "straight_flush", suit: "hearts" }],
    })).toThrow(/kind|effect/i);
  });
});
