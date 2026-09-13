import { describe, expect, it } from "vitest";
import type {
  AllocationId,
  CampaignStateV5,
  DenizenId,
  EngagementId,
  IsleId,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  EMPTY_FAUSTIAN_STATE,
  HIEROPHANT_BUILTIN_BLASPHEMY_IDS,
  HIEROPHANT_BUILTIN_CLASS_IDS,
  HIEROPHANT_BUILTIN_DOGMA_IDS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  MARINER_BOARD_ISLE_IDS,
  MARINER_LAW_OF_SEA_IDS,
  MOVABLE_PLANET_IDS,
  PACT_SEAT_IDS,
  applyAddCultDogma,
  applyAddPlayer,
  applyAddProphet,
  applyAddSupplicant,
  applyArrangeFaustianTable,
  applyBeginPlay,
  applyCreateDenizenV5Candidate,
  applyCreatePlaceV5Candidate,
  applyCreatePowerfulDenizenProfile,
  applyCreateWizard,
  applyEstablishCult,
  applyInitializeHierophantSourceSetup,
  applyInitializeMarinerSourceSetup,
  applyInitializeNecromancerSourceSetup,
  applyInitializeSorcerer,
  applySetCampaignAge,
  applySetFacilitator,
  applySetPactSeatStatus,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applySetWatcher,
  applySetWizardSanctumV5Candidate,
  evaluateSetupReadiness,
  faustianCardId,
  generateAllocationId,
  generateEngagementId,
  initialCampaignState,
  readLoreCompendiumReference,
  readSorcererEstablishmentReadiness,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { getFixedAgeSetupSummary } from "../src/setup-view-model";
import {
  REVIEW_CAMPAIGN_PLAYER_NAMES,
  buildDemoCampaignFixture,
} from "../src/demo-campaign";

function uuidFactory(): () => string {
  let i = 0;
  return () => `22222222-2222-2222-2222-${String(i++).padStart(12, "0")}`;
}

function applyReviewCampaignSemantics(nextUuid: () => string = uuidFactory()): {
  readonly state: CampaignStateV5;
  readonly fixture: ReturnType<typeof buildDemoCampaignFixture>;
} {
  const fixture = buildDemoCampaignFixture(nextUuid);
  const awakening = getFixedAgeSetupSummary("awakening");
  let state: CampaignStateV5 = initialCampaignState();

  for (let i = 0; i < REVIEW_CAMPAIGN_PLAYER_NAMES.length; i += 1) {
    state = applyAddPlayer(
      state,
      fixture.playerIds[i]! as PlayerId,
      REVIEW_CAMPAIGN_PLAYER_NAMES[i]!,
    ).nextState;
  }
  state = applySetCampaignAge(state, "awakening").nextState;
  state = applySetFacilitator(state, fixture.playerIds[0]! as PlayerId).nextState;

  for (let i = 0; i < PACT_SEAT_IDS.length; i += 1) {
    const seatId = PACT_SEAT_IDS[i]!;
    state = applyCreateWizard(
      state,
      fixture.wizardIds[seatId] as WizardId,
      ["Vesper", "Solenne", "Hex", "Tide", "Ash", "Quill", "Mira"][i]!,
      fixture.playerIds[i]! as PlayerId,
      seatId,
    ).nextState;
  }
  for (const seatId of PACT_SEAT_IDS) {
    state = applySetPactSeatStatus(state, seatId, "present").nextState;
    state = applySetWatcher(state, seatId, fixture.playerIds[0]! as PlayerId).nextState;
  }
  state = applySetSetupMonth(state, awakening.requiredMonthOrdinal).nextState;
  for (const planetId of MOVABLE_PLANET_IDS) {
    state = applySetSetupOrreryPosition(state, planetId, awakening.presetIndices[planetId]).nextState;
  }

  state = applyInitializeHierophantSourceSetup(state, {
    selectedFlameLawIds: ["first", "second"],
    proposedTemplePlaceIds: HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId) => ({
      templeId,
      placeId: fixture.templePlaceIds[templeId] as PlaceId,
    })),
  }).nextState;

  state = applyInitializeMarinerSourceSetup(state, {
    arrangementId: "quiet",
    proposedShipPlaceId: fixture.shipPlaceId as PlaceId,
    selectedLawOfSeaIds: [MARINER_LAW_OF_SEA_IDS[0], MARINER_LAW_OF_SEA_IDS[6]],
    proposedIsleIds: MARINER_BOARD_ISLE_IDS.map((boardIsleId) => ({
      boardIsleId,
      worldIsleId: fixture.isleIds[boardIsleId] as IsleId,
    })),
    arrangementBeasts: [],
    rarityDescriptions: [],
  }).nextState;

  state = applyInitializeNecromancerSourceSetup(state, {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: fixture.necromancerDeepFoeId as DenizenId, name: "The Hollow King", gateId: "deep" },
      { denizenId: fixture.necromancerTerminusFoeId as DenizenId, name: "The Last Witness", gateId: "terminus" },
    ],
    arrangementAlly: {
      denizenId: fixture.necromancerAllyId as DenizenId,
      name: "Bound Lantern",
      gateId: "amber",
    },
    arrangementGhoulCaller: null,
  }).nextState;

  state = applyCreatePlaceV5Candidate(state, {
    placeId: fixture.towerPlaceId as PlaceId,
    name: "The Working Tower",
    description: "Review campaign fixture.",
    placement: { kind: "on_isle", isleId: fixture.isleIds.spyrholm as IsleId },
  }).nextState;
  state = applyCreatePlaceV5Candidate(state, {
    placeId: fixture.universityPlaceId as PlaceId,
    name: "Spyrholm University",
    description: "Review campaign fixture.",
    placement: { kind: "on_isle", isleId: fixture.isleIds.spyrholm as IsleId },
  }).nextState;
  state = applySetWizardSanctumV5Candidate(state, fixture.wizardIds.sorcerer as WizardId, {
    expected: null,
    value: fixture.towerPlaceId as PlaceId,
  }).nextState;

  const staffNames = [
    "Reviewer One",
    "Reviewer Two",
    "Reviewer Three",
    "Student One",
    "Student Two",
    "Student Three",
    "Professor Wren",
    "Alchemist Pike",
  ];
  for (let i = 0; i < fixture.sorcererStaffIds.length; i += 1) {
    state = applyCreateDenizenV5Candidate(state, {
      denizenId: fixture.sorcererStaffIds[i]! as DenizenId,
      name: staffNames[i]!,
      representation: "individual",
      description: "Review campaign fixture.",
    }).nextState;
  }

  state = applyInitializeSorcerer(state, {
    arrangementId: "quiet",
    spyrholmIsleId: fixture.isleIds.spyrholm as IsleId,
    towerPlaceId: fixture.towerPlaceId as PlaceId,
    universityPlaceId: fixture.universityPlaceId as PlaceId,
    activeLawIds: ["first", "second"],
    unrevealedLawId: "third",
    orreryHouses: [0, 4, 8],
    ideologyIds: ["aristocracy", "mercantilism"],
    seaRegionIds: ["bay_of_ishana", "wizard_strait"],
    researchers: [
      { denizenId: fixture.sorcererStaffIds[0]! as DenizenId, positionId: "srp_orrery_1" },
      { denizenId: fixture.sorcererStaffIds[1]! as DenizenId, positionId: "srp_temple_krolis" },
      { denizenId: fixture.sorcererStaffIds[2]! as DenizenId, positionId: "srp_court_1" },
    ],
    studentDenizenIds: [
      fixture.sorcererStaffIds[3]! as DenizenId,
      fixture.sorcererStaffIds[4]! as DenizenId,
      fixture.sorcererStaffIds[5]! as DenizenId,
    ],
    professorDenizenId: fixture.sorcererStaffIds[6]! as DenizenId,
    alchemistDenizenId: fixture.sorcererStaffIds[7]! as DenizenId,
    librarian: null,
    towerArcanists: [],
    calamityDisruptiveArcanist: null,
  }).nextState;

  state = applyArrangeFaustianTable(state, {
    arrangementId: "quiet",
    favoriteCommunityId: "aries",
    pawnCommunityId: null,
    reservedTwistCardId: faustianCardId("hearts", "2"),
    expectedFaustian: EMPTY_FAUSTIAN_STATE,
    expectedAgeId: "awakening",
    expectedAgeYears: null,
    expectedElements: null,
    calamityAntagonist: null,
  }).nextState;

  const firstTempleId = HIEROPHANT_STARTING_TEMPLE_IDS[0];
  const denizenSpecs = [
    { id: fixture.denizenSupplicantId, name: "Review Supplicant", representation: "individual" as const },
    { id: fixture.denizenProphetId, name: "Review Prophet", representation: "individual" as const },
    { id: fixture.denizenCultLeaderId, name: "Review Cult Leader", representation: "individual" as const },
    { id: fixture.denizenCultId, name: "Review Cult", representation: "collective" as const },
  ];
  for (const spec of denizenSpecs) {
    state = applyCreateDenizenV5Candidate(state, {
      denizenId: spec.id as DenizenId,
      name: spec.name,
      representation: spec.representation,
      description: "Review campaign fixture.",
    }).nextState;
  }
  state = applyCreatePowerfulDenizenProfile(state, {
    denizenId: fixture.denizenProphetId as DenizenId,
    taxonomies: [{ kind: "builtin", taxonomyId: "prophet" }],
    status: { kind: "standard", value: "reliable" },
    goal: null,
  }).nextState;
  state = applyCreatePowerfulDenizenProfile(state, {
    denizenId: fixture.denizenCultId as DenizenId,
    taxonomies: [{ kind: "builtin", taxonomyId: "cult" }],
    status: { kind: "standard", value: "reliable" },
    goal: null,
  }).nextState;
  state = applyAddSupplicant(state, {
    denizenId: fixture.denizenSupplicantId as DenizenId,
    classId: HIEROPHANT_BUILTIN_CLASS_IDS[0],
    woe: 1,
    host: { kind: "temple", templeId: firstTempleId, area: "courtyard" },
  }).nextState;
  state = applyAddProphet(state, {
    denizenId: fixture.denizenProphetId as DenizenId,
    host: { kind: "temple", templeId: HIEROPHANT_STARTING_TEMPLE_IDS[1] },
  }).nextState;
  state = applyEstablishCult(state, {
    cultDenizenId: fixture.denizenCultId as DenizenId,
    hostSeatId: "hierophant",
    anchorPlaceId: fixture.templePlaceIds[firstTempleId] as PlaceId,
    leaderDenizenId: fixture.denizenCultLeaderId as DenizenId,
    blasphemyId: HIEROPHANT_BUILTIN_BLASPHEMY_IDS[0],
    abundance: 1,
    conviction: 2,
    dogmas: [],
  }).nextState;
  state = applyAddCultDogma(state, fixture.denizenCultId as DenizenId, {
    dogmaEntryId: fixture.dogmaEntryIds[0] as never,
    kind: "builtin",
    dogmaId: HIEROPHANT_BUILTIN_DOGMA_IDS[0],
  }).nextState;
  state = applyAddCultDogma(state, fixture.denizenCultId as DenizenId, {
    dogmaEntryId: fixture.dogmaEntryIds[1] as never,
    kind: "builtin",
    dogmaId: HIEROPHANT_BUILTIN_DOGMA_IDS[1],
  }).nextState;

  const readiness = evaluateSetupReadiness(state);
  expect(readiness.ready).toBe(true);

  return {
    fixture,
    state: applyBeginPlay(state, {
      wizardInits: PACT_SEAT_IDS.map((seatId) => ({
        wizardId: fixture.wizardIds[seatId] as WizardId,
        allocationIds: [
          generateAllocationId(),
          generateAllocationId(),
          generateAllocationId(),
          generateAllocationId(),
        ] as [AllocationId, AllocationId, AllocationId, AllocationId],
        engagementId: generateEngagementId() as EngagementId,
      })),
    }).nextState,
  };
}

describe("representative review campaign semantics", () => {
  it("uses existing commands to produce a playable seven-seat review campaign", () => {
    const { state, fixture } = applyReviewCampaignSemantics();

    expect(state.lifecycle.kind).toBe("play");
    expect(state.players).toHaveLength(7);
    expect(state.wizards).toHaveLength(7);
    expect(PACT_SEAT_IDS.every((seatId) => state.pactSeats[seatId].status === "present")).toBe(true);
    expect(state.hierophant.temples.length).toBeGreaterThan(0);
    expect(state.mariner.boardIsles).toHaveLength(15);
    expect(state.necromancer.foes.length).toBeGreaterThan(0);
    expect(state.sorcerer.initialized).toBe(true);
    expect(state.faustian.devilDeck).toHaveLength(6);
    expect(state.faustian.activeTwistCardIds).toHaveLength(1);
    expect(state.world.isles).toHaveLength(15);
    expect(HIEROPHANT_STARTING_TEMPLE_IDS.every((templeId) => (
      state.hierophant.temples.some((temple) => temple.templeId === templeId && temple.placeId !== null)
    ))).toBe(true);

    const mariner = state.wizards.find((wizard) => wizard.wizardId === fixture.wizardIds.mariner);
    expect(mariner?.sanctumPlaceId).toBe(state.mariner.shipPlaceId);
    expect(state.necromancer.foes.every((foe) => (
      foe.subject.kind !== "denizen" || state.world.denizens.some((denizen) => (
        denizen.denizenId === (foe.subject.kind === "denizen" ? foe.subject.denizenId : "") &&
        denizen.powerfulProfile === null
      ))
    ))).toBe(true);
    expect(readSorcererEstablishmentReadiness(state)).toEqual({
      initialized: true,
      missingPrerequisites: [],
      requiredSetupChoices: [],
    });
    for (const seatId of PACT_SEAT_IDS) {
      expect(state.pactFragmentOperationalState[seatId]).toEqual({
        condition: "intact",
        custody: { kind: "wizard", wizardId: fixture.wizardIds[seatId] },
      });
    }
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("presents bound source Isles as one Compendium subject rather than a disconnected catalog duplicate", () => {
    const { state, fixture } = applyReviewCampaignSemantics();
    const lore = readLoreCompendiumReference(state);
    expect(lore.ok).toBe(true);
    if (!lore.ok) return;

    const farReachWorldId = fixture.isleIds.far_reach;
    const isleSubjects = lore.subjects.filter((subject) => subject.shelf.id === "isles");
    const farReach = isleSubjects.filter((subject) => subject.subjectLabel === "Far Reach");
    expect(farReach).toHaveLength(1);
    expect(farReach[0]?.subject).toEqual({ kind: "isle", isleId: farReachWorldId });
    expect(isleSubjects.filter((subject) => (
      subject.subjectLabel === "Far Reach" && subject.subject === null
    ))).toHaveLength(0);

    const worldIsleIds = new Set(state.world.isles.map((isle) => isle.isleId));
    const boundIsleSubjects = isleSubjects.filter((subject) => (
      subject.subject?.kind === "isle" && worldIsleIds.has(subject.subject.isleId)
    ));
    expect(boundIsleSubjects).toHaveLength(15);
  });
});
