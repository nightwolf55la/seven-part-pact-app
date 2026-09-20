import {
  EMPTY_FAUSTIAN_STATE,
  HIEROPHANT_BUILTIN_BLASPHEMY_IDS,
  HIEROPHANT_BUILTIN_CLASS_IDS,
  HIEROPHANT_BUILTIN_DOGMA_IDS,
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  MARINER_BOARD_ISLE_IDS,
  MARINER_LAW_OF_SEA_IDS,
  MOVABLE_PLANET_IDS,
  faustianCardId,
  type CorrectFaustianCardInput,
  type FaustianState,
  type HierophantStartingTempleId,
  type IsleId,
  type MarinerBoardIsleId,
  type PactSeatId,
  type WorldPlacePlacement,
} from "../shared/domain";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import { getFixedAgeSetupSummary } from "./setup-view-model";
import {
  buildFaustianReviewPlayState,
  faustianReviewCardPlacements,
} from "./faustian-review-fixture";

const DEMO_DESCRIPTION = "Review campaign fixture.";

/** One portraying player per Present Pact seat — setup readiness forbids sharing. */
export const REVIEW_CAMPAIGN_PLAYER_NAMES = [
  "Alex",
  "Bea",
  "Cora",
  "Drew",
  "Eden",
  "Flynn",
  "Gale",
] as const;

const WIZARD_NAMES: Record<PactSeatId, string> = {
  necromancer: "Vesper",
  hierophant: "Solenne",
  warlock: "Hex",
  mariner: "Tide",
  faustian: "Ash",
  sage: "Quill",
  sorcerer: "Mira",
};

export interface DemoCampaignFixture {
  readonly playerIds: readonly string[];
  readonly wizardIds: Record<PactSeatId, string>;
  readonly templePlaceIds: Record<HierophantStartingTempleId, string>;
  readonly isleIds: Record<MarinerBoardIsleId, string>;
  readonly shipPlaceId: string;
  readonly towerPlaceId: string;
  readonly universityPlaceId: string;
  readonly necromancerDeepFoeId: string;
  readonly necromancerTerminusFoeId: string;
  readonly necromancerAllyId: string;
  readonly denizenSupplicantId: string;
  readonly denizenProphetId: string;
  readonly denizenCultLeaderId: string;
  readonly denizenCultId: string;
  readonly sorcererStaffIds: readonly string[];
  readonly dogmaEntryIds: readonly [string, string];
  readonly selectedFlameLawIds: readonly [string, string];
}

export interface DemoCampaignMutations {
  startNewCampaign(): Promise<{ campaignId: string; campaignRevision: number }>;
  addPlayer(args: {
    commandId: string;
    playerId: string;
    name: string;
  }): Promise<{ revision: number }>;
  setCampaignAge(args: {
    commandId: string;
    ageId: string | null;
  }): Promise<{ revision: number }>;
  setFacilitator(args: {
    commandId: string;
    playerId: string | null;
  }): Promise<{ revision: number }>;
  createWizard(args: {
    commandId: string;
    wizardId: string;
    name: string;
    portrayedByPlayerId: string | null;
    seatId: string;
  }): Promise<{ revision: number }>;
  setPactSeatStatus(args: {
    commandId: string;
    seatId: string;
    status: "present" | "silent" | "absent" | null;
  }): Promise<{ revision: number }>;
  setWatcher(args: {
    commandId: string;
    seatId: string;
    playerId: string | null;
  }): Promise<{ revision: number }>;
  setSetupMonth(args: {
    commandId: string;
    monthOrdinal: number | null;
  }): Promise<{ revision: number }>;
  setSetupOrreryPosition(args: {
    commandId: string;
    planetId: string;
    positionIndex: number | null;
  }): Promise<{ revision: number }>;
  createPlace(args: {
    commandId: string;
    expectedCampaignId: string;
    placeId: string;
    name: string;
    description: string | null;
    placement: WorldPlacePlacement;
  }): Promise<{ revision: number }>;
  createDenizen(args: {
    commandId: string;
    expectedCampaignId: string;
    denizenId: string;
    name: string;
    representation: "individual" | "collective";
    description: string | null;
  }): Promise<{ revision: number }>;
  createPowerfulDenizenProfile(args: {
    commandId: string;
    expectedCampaignId: string;
    denizenId: string;
    taxonomies: Array<{ kind: "builtin"; taxonomyId: "prophet" | "cult" }>;
    status: { kind: "standard"; value: "reliable" | "disruptive" | "companion" | "malignant" };
    goal: string | null;
  }): Promise<{ revision: number }>;
  initializeHierophantSourceSetup(args: {
    commandId: string;
    expectedCampaignId: string;
    selectedFlameLawIds: string[];
    proposedTemplePlaceIds: { templeId: string; placeId: string }[];
  }): Promise<{ revision: number }>;
  initializeMarinerSourceSetup(args: {
    commandId: string;
    expectedCampaignId: string;
    arrangementId: "quiet" | "dynamic" | "explosive";
    proposedShipPlaceId: string;
    selectedLawOfSeaIds: string[];
    proposedIsleIds: { boardIsleId: string; worldIsleId: string }[];
    arrangementBeasts: never[];
    rarityDescriptions: never[];
  }): Promise<{ revision: number }>;
  initializeNecromancerSourceSetup(args: {
    commandId: string;
    expectedCampaignId: string;
    arrangementId: "quiet" | "dynamic" | "explosive";
    selectedLawIds: string[];
    arrangementFoes: { denizenId: string; name: string; gateId: string }[];
    arrangementAlly: { denizenId: string; name: string; gateId: string };
    arrangementGhoulCaller: null;
  }): Promise<{ revision: number }>;
  setWizardSanctum(args: {
    commandId: string;
    expectedCampaignId: string;
    wizardId: string;
    change: { expected: string | null; value: string | null };
  }): Promise<{ revision: number }>;
  initializeSorcerer(args: {
    commandId: string;
    expectedCampaignId: string;
    arrangementId: "quiet" | "dynamic" | "explosive";
    spyrholmIsleId: string;
    towerPlaceId: string;
    universityPlaceId: string;
    activeLawIds: string[];
    unrevealedLawId: string | null;
    orreryHouses: number[];
    ideologyIds: string[];
    seaRegionIds: string[];
    researchers: { denizenId: string; positionId: string }[];
    studentDenizenIds: string[];
    professorDenizenId: string;
    alchemistDenizenId: string;
    librarian: null;
    towerArcanists: never[];
    calamityDisruptiveArcanist: null;
  }): Promise<{ revision: number }>;
  arrangeFaustianTable(args: {
    commandId: string;
    expectedCampaignId: string;
    arrangementId: "quiet" | "dynamic" | "explosive";
    favoriteCommunityId: string;
    pawnCommunityId: string | null;
    reservedTwistCardId: string | null;
    expectedFaustian: typeof EMPTY_FAUSTIAN_STATE;
    expectedAgeId: string;
    expectedAgeYears: number | null;
    expectedElements: null;
    calamityAntagonist: null;
  }): Promise<{ revision: number }>;
  readFaustian(): Promise<{ faustian: FaustianState }>;
  correctFaustianCard(args: {
    commandId: string;
    expectedCampaignId: string;
    input: CorrectFaustianCardInput;
  }): Promise<{ revision: number }>;
  addFaustianPawn(args: {
    commandId: string;
    expectedCampaignId: string;
    communityId: string;
    expectedPawnCount: number;
    expectedFaustian: FaustianState;
  }): Promise<{ revision: number }>;
  establishFaustianConspiracy(args: {
    commandId: string;
    expectedCampaignId: string;
    communityId: string;
    expectedFaustian: FaustianState;
    subjectKind: "existing" | "create";
    denizenId: string;
    createName: string | null;
    seatId: string;
    chipCount: 1 | 2 | 3;
    goal: string;
  }): Promise<{ revision: number }>;
  recordFaustianDueMonthObligation(args: {
    commandId: string;
    expectedCampaignId: string;
    wizardId: string;
    dueMonthOrdinal: number;
    weeks: number;
  }): Promise<{ revision: number }>;
  addSupplicant(args: {
    commandId: string;
    expectedCampaignId: string;
    denizenId: string;
    classId: string;
    woe: number;
    host: {
      kind: "temple";
      templeId: string;
      area: "courtyard" | "agiary" | null;
    };
  }): Promise<{ revision: number }>;
  addProphet(args: {
    commandId: string;
    expectedCampaignId: string;
    denizenId: string;
    host: { kind: "temple"; templeId: string };
  }): Promise<{ revision: number }>;
  establishCult(args: {
    commandId: string;
    expectedCampaignId: string;
    cultDenizenId: string;
    hostSeatId: string;
    anchorPlaceId: string | null;
    leaderDenizenId: string | null;
    blasphemyId: string;
    abundance: number;
    conviction: number;
  }): Promise<{ revision: number }>;
  addCultDogma(args: {
    commandId: string;
    expectedCampaignId: string;
    cultDenizenId: string;
    dogma: {
      dogmaEntryId: string;
      kind: "builtin";
      dogmaId: string;
    };
  }): Promise<{ revision: number }>;
  beginPlay(args: {
    commandId: string;
    expectedRevision: number;
  }): Promise<{ revision: number }>;
}

export type DemoCampaignSetupResult =
  | { readonly ok: true; readonly campaignId: string; readonly revision: number }
  | { readonly ok: false; readonly failedStep: string; readonly error: string };

function prefixedId(prefix: string, nextUuid: () => string): string {
  return `${prefix}_${nextUuid()}`;
}

function commandId(nextUuid: () => string): string {
  return prefixedId("cmd", nextUuid);
}

export function buildDemoCampaignFixture(nextUuid: () => string = () => crypto.randomUUID()): DemoCampaignFixture {
  const templePlaceIds = {} as Record<HierophantStartingTempleId, string>;
  for (const templeId of HIEROPHANT_STARTING_TEMPLE_IDS) {
    templePlaceIds[templeId] = prefixedId("plc", nextUuid);
  }
  const isleIds = {} as Record<MarinerBoardIsleId, string>;
  for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
    isleIds[boardIsleId] = prefixedId("isl", nextUuid);
  }
  const wizardIds = {} as Record<PactSeatId, string>;
  for (const seatId of PACT_SEAT_IDS) {
    wizardIds[seatId] = prefixedId("wiz", nextUuid);
  }
  return {
    playerIds: REVIEW_CAMPAIGN_PLAYER_NAMES.map(() => prefixedId("plr", nextUuid)),
    wizardIds,
    templePlaceIds,
    isleIds,
    shipPlaceId: prefixedId("plc", nextUuid),
    towerPlaceId: prefixedId("plc", nextUuid),
    universityPlaceId: prefixedId("plc", nextUuid),
    necromancerDeepFoeId: prefixedId("den", nextUuid),
    necromancerTerminusFoeId: prefixedId("den", nextUuid),
    necromancerAllyId: prefixedId("den", nextUuid),
    denizenSupplicantId: prefixedId("den", nextUuid),
    denizenProphetId: prefixedId("den", nextUuid),
    denizenCultLeaderId: prefixedId("den", nextUuid),
    denizenCultId: prefixedId("den", nextUuid),
    sorcererStaffIds: Array.from({ length: 8 }, () => prefixedId("den", nextUuid)),
    dogmaEntryIds: [prefixedId("hdg", nextUuid), prefixedId("hdg", nextUuid)],
    selectedFlameLawIds: [HIEROPHANT_FLAME_LAW_IDS[0], HIEROPHANT_FLAME_LAW_IDS[1]],
  };
}

export function formatDemoSetupFailure(step: string, cause: unknown): string {
  const message =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : "Unknown error";
  return `Demo setup stopped at "${step}": ${message}`;
}

async function runStep<T>(
  step: string,
  onProgress: ((step: string) => void) | undefined,
  action: () => Promise<T>,
): Promise<T> {
  onProgress?.(step);
  try {
    return await action();
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : "Unknown error";
    return Promise.reject({ failedStep: step, error: message });
  }
}

export async function runDemoCampaignSetup(
  mutations: DemoCampaignMutations,
  nextUuid: () => string = () => crypto.randomUUID(),
  onProgress?: (step: string) => void,
): Promise<DemoCampaignSetupResult> {
  const fixture = buildDemoCampaignFixture(nextUuid);
  const awakening = getFixedAgeSetupSummary("awakening");
  const firstTempleId = HIEROPHANT_STARTING_TEMPLE_IDS[0];
  const anchorPlaceId = fixture.templePlaceIds[firstTempleId];
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

  let revision = 0;
  let campaignId = "";

  try {
    const start = await runStep("Start campaign", onProgress, () => mutations.startNewCampaign());
    campaignId = start.campaignId;
    revision = start.campaignRevision;

    for (let i = 0; i < REVIEW_CAMPAIGN_PLAYER_NAMES.length; i += 1) {
      const afterPlayer = await runStep("Add Players", onProgress, () =>
        mutations.addPlayer({
          commandId: commandId(nextUuid),
          playerId: fixture.playerIds[i]!,
          name: REVIEW_CAMPAIGN_PLAYER_NAMES[i]!,
        }),
      );
      revision = afterPlayer.revision;
    }

    const afterAge = await runStep("Set Age of Awakening", onProgress, () =>
      mutations.setCampaignAge({ commandId: commandId(nextUuid), ageId: "awakening" }),
    );
    revision = afterAge.revision;

    const afterFacilitator = await runStep("Set Facilitator", onProgress, () =>
      mutations.setFacilitator({ commandId: commandId(nextUuid), playerId: fixture.playerIds[0] }),
    );
    revision = afterFacilitator.revision;

    for (let i = 0; i < PACT_SEAT_IDS.length; i += 1) {
      const seatId = PACT_SEAT_IDS[i]!;
      const afterWizard = await runStep("Create Pact Wizards", onProgress, () =>
        mutations.createWizard({
          commandId: commandId(nextUuid),
          wizardId: fixture.wizardIds[seatId],
          name: WIZARD_NAMES[seatId],
          portrayedByPlayerId: fixture.playerIds[i]!,
          seatId,
        }),
      );
      revision = afterWizard.revision;
    }

    for (const seatId of PACT_SEAT_IDS) {
      const afterSeat = await runStep("Set Pact Seat Status", onProgress, () =>
        mutations.setPactSeatStatus({
          commandId: commandId(nextUuid),
          seatId,
          status: "present",
        }),
      );
      revision = afterSeat.revision;
    }

    for (const seatId of PACT_SEAT_IDS) {
      const afterWatcher = await runStep("Assign Watchers", onProgress, () =>
        mutations.setWatcher({
          commandId: commandId(nextUuid),
          seatId,
          playerId: fixture.playerIds[0],
        }),
      );
      revision = afterWatcher.revision;
    }

    const afterMonth = await runStep("Set Awakening Month", onProgress, () =>
      mutations.setSetupMonth({
        commandId: commandId(nextUuid),
        monthOrdinal: awakening.requiredMonthOrdinal,
      }),
    );
    revision = afterMonth.revision;

    for (const planetId of MOVABLE_PLANET_IDS) {
      const afterPlanet = await runStep("Set Awakening Orrery Positions", onProgress, () =>
        mutations.setSetupOrreryPosition({
          commandId: commandId(nextUuid),
          planetId,
          positionIndex: awakening.presetIndices[planetId],
        }),
      );
      revision = afterPlanet.revision;
    }

    const afterHierophant = await runStep("Initialize Hierophant", onProgress, () =>
      mutations.initializeHierophantSourceSetup({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        selectedFlameLawIds: [...fixture.selectedFlameLawIds],
        proposedTemplePlaceIds: HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId) => ({
          templeId,
          placeId: fixture.templePlaceIds[templeId],
        })),
      }),
    );
    revision = afterHierophant.revision;

    const afterMariner = await runStep("Initialize Mariner", onProgress, () =>
      mutations.initializeMarinerSourceSetup({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        arrangementId: "quiet",
        proposedShipPlaceId: fixture.shipPlaceId,
        selectedLawOfSeaIds: [MARINER_LAW_OF_SEA_IDS[0], MARINER_LAW_OF_SEA_IDS[6]],
        proposedIsleIds: MARINER_BOARD_ISLE_IDS.map((boardIsleId) => ({
          boardIsleId,
          worldIsleId: fixture.isleIds[boardIsleId],
        })),
        arrangementBeasts: [],
        rarityDescriptions: [],
      }),
    );
    revision = afterMariner.revision;

    const afterNecromancer = await runStep("Initialize Necromancer", onProgress, () =>
      mutations.initializeNecromancerSourceSetup({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        arrangementId: "quiet",
        selectedLawIds: ["first", "second"],
        arrangementFoes: [
          { denizenId: fixture.necromancerDeepFoeId, name: "The Hollow King", gateId: "deep" },
          { denizenId: fixture.necromancerTerminusFoeId, name: "The Last Witness", gateId: "terminus" },
        ],
        arrangementAlly: { denizenId: fixture.necromancerAllyId, name: "Bound Lantern", gateId: "amber" },
        arrangementGhoulCaller: null,
      }),
    );
    revision = afterNecromancer.revision;

    const afterTower = await runStep("Create Sorcerer Tower", onProgress, () =>
      mutations.createPlace({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        placeId: fixture.towerPlaceId,
        name: "The Working Tower",
        description: DEMO_DESCRIPTION,
        placement: { kind: "on_isle", isleId: fixture.isleIds.spyrholm as IsleId },
      }),
    );
    revision = afterTower.revision;

    const afterUniversity = await runStep("Create University", onProgress, () =>
      mutations.createPlace({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        placeId: fixture.universityPlaceId,
        name: "Spyrholm University",
        description: DEMO_DESCRIPTION,
        placement: { kind: "on_isle", isleId: fixture.isleIds.spyrholm as IsleId },
      }),
    );
    revision = afterUniversity.revision;

    const afterSanctum = await runStep("Set Sorcerer Sanctum", onProgress, () =>
      mutations.setWizardSanctum({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        wizardId: fixture.wizardIds.sorcerer,
        change: { expected: null, value: fixture.towerPlaceId },
      }),
    );
    revision = afterSanctum.revision;

    for (let i = 0; i < fixture.sorcererStaffIds.length; i += 1) {
      const afterStaff = await runStep("Create Sorcerer Staff", onProgress, () =>
        mutations.createDenizen({
          commandId: commandId(nextUuid),
          expectedCampaignId: campaignId,
          denizenId: fixture.sorcererStaffIds[i]!,
          name: staffNames[i]!,
          representation: "individual",
          description: DEMO_DESCRIPTION,
        }),
      );
      revision = afterStaff.revision;
    }

    const afterSorcerer = await runStep("Initialize Sorcerer", onProgress, () =>
      mutations.initializeSorcerer({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        arrangementId: "quiet",
        spyrholmIsleId: fixture.isleIds.spyrholm,
        towerPlaceId: fixture.towerPlaceId,
        universityPlaceId: fixture.universityPlaceId,
        activeLawIds: ["first", "second"],
        unrevealedLawId: "third",
        orreryHouses: [0, 4, 8],
        ideologyIds: ["aristocracy", "mercantilism"],
        seaRegionIds: ["bay_of_ishana", "wizard_strait"],
        researchers: [
          { denizenId: fixture.sorcererStaffIds[0]!, positionId: "srp_orrery_1" },
          { denizenId: fixture.sorcererStaffIds[1]!, positionId: "srp_temple_krolis" },
          { denizenId: fixture.sorcererStaffIds[2]!, positionId: "srp_court_1" },
        ],
        studentDenizenIds: [
          fixture.sorcererStaffIds[3]!,
          fixture.sorcererStaffIds[4]!,
          fixture.sorcererStaffIds[5]!,
        ],
        professorDenizenId: fixture.sorcererStaffIds[6]!,
        alchemistDenizenId: fixture.sorcererStaffIds[7]!,
        librarian: null,
        towerArcanists: [],
        calamityDisruptiveArcanist: null,
      }),
    );
    revision = afterSorcerer.revision;

    const afterFaustian = await runStep("Arrange Faustian Table", onProgress, () =>
      mutations.arrangeFaustianTable({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        arrangementId: "quiet",
        favoriteCommunityId: "aries",
        pawnCommunityId: null,
        reservedTwistCardId: faustianCardId("hearts", "2"),
        expectedFaustian: EMPTY_FAUSTIAN_STATE,
        expectedAgeId: "awakening",
        expectedAgeYears: null,
        expectedElements: null,
        calamityAntagonist: null,
      }),
    );
    revision = afterFaustian.revision;

    const denizenSpecs = [
      { id: fixture.denizenSupplicantId, name: "Review Supplicant", representation: "individual" as const },
      { id: fixture.denizenProphetId, name: "Review Prophet", representation: "individual" as const },
      { id: fixture.denizenCultLeaderId, name: "Review Cult Leader", representation: "individual" as const },
      { id: fixture.denizenCultId, name: "Review Cult", representation: "collective" as const },
    ];
    for (const spec of denizenSpecs) {
      const afterDenizen = await runStep("Create Hierophant Pieces", onProgress, () =>
        mutations.createDenizen({
          commandId: commandId(nextUuid),
          expectedCampaignId: campaignId,
          denizenId: spec.id,
          name: spec.name,
          representation: spec.representation,
          description: DEMO_DESCRIPTION,
        }),
      );
      revision = afterDenizen.revision;
    }

    const afterProphetProfile = await runStep("Create Demo Prophet profile", onProgress, () =>
      mutations.createPowerfulDenizenProfile({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        denizenId: fixture.denizenProphetId,
        taxonomies: [{ kind: "builtin", taxonomyId: "prophet" }],
        status: { kind: "standard", value: "reliable" },
        goal: null,
      }),
    );
    revision = afterProphetProfile.revision;

    const afterCultProfile = await runStep("Create Demo Cult profile", onProgress, () =>
      mutations.createPowerfulDenizenProfile({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        denizenId: fixture.denizenCultId,
        taxonomies: [{ kind: "builtin", taxonomyId: "cult" }],
        status: { kind: "standard", value: "reliable" },
        goal: null,
      }),
    );
    revision = afterCultProfile.revision;

    const afterSupplicant = await runStep("Add Demo Supplicant", onProgress, () =>
      mutations.addSupplicant({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        denizenId: fixture.denizenSupplicantId,
        classId: HIEROPHANT_BUILTIN_CLASS_IDS[0],
        woe: 1,
        host: { kind: "temple", templeId: firstTempleId, area: "courtyard" },
      }),
    );
    revision = afterSupplicant.revision;

    const afterProphet = await runStep("Add Demo Prophet", onProgress, () =>
      mutations.addProphet({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        denizenId: fixture.denizenProphetId,
        host: { kind: "temple", templeId: HIEROPHANT_STARTING_TEMPLE_IDS[1] },
      }),
    );
    revision = afterProphet.revision;

    const afterCult = await runStep("Establish Demo Cult", onProgress, () =>
      mutations.establishCult({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        cultDenizenId: fixture.denizenCultId,
        hostSeatId: "hierophant",
        anchorPlaceId,
        leaderDenizenId: fixture.denizenCultLeaderId,
        blasphemyId: HIEROPHANT_BUILTIN_BLASPHEMY_IDS[0],
        abundance: 1,
        conviction: 2,
      }),
    );
    revision = afterCult.revision;

    const dogmaIds = [HIEROPHANT_BUILTIN_DOGMA_IDS[0], HIEROPHANT_BUILTIN_DOGMA_IDS[1]];
    for (let i = 0; i < dogmaIds.length; i += 1) {
      const afterDogma = await runStep("Add Cult Dogmas", onProgress, () =>
        mutations.addCultDogma({
          commandId: commandId(nextUuid),
          expectedCampaignId: campaignId,
          cultDenizenId: fixture.denizenCultId,
          dogma: {
            dogmaEntryId: fixture.dogmaEntryIds[i],
            kind: "builtin",
            dogmaId: dogmaIds[i],
          },
        }),
      );
      revision = afterDogma.revision;
    }

    const afterPlay = await runStep("Begin Play", onProgress, () =>
      mutations.beginPlay({
        commandId: commandId(nextUuid),
        expectedRevision: revision,
      }),
    );
    revision = afterPlay.revision;

    const reviewFaustian = buildFaustianReviewPlayState({
      conspiracyDenizenId: prefixedId("den", nextUuid),
      obligationWizardId: fixture.wizardIds.faustian,
      currentMonthOrdinal: awakening.requiredMonthOrdinal,
    });
    for (const input of faustianReviewCardPlacements(reviewFaustian)) {
      const afterCard = await runStep("Arrange Faustian review table", onProgress, () =>
        mutations.correctFaustianCard({
          commandId: commandId(nextUuid),
          expectedCampaignId: campaignId,
          input,
        }),
      );
      revision = afterCard.revision;
    }

    const afterCards = await runStep("Read Faustian review table", onProgress, () => mutations.readFaustian());
    const aries = afterCards.faustian.communities.find((community) => community.communityId === "aries");
    const afterPawn = await runStep("Add Faustian review Pawn", onProgress, () =>
      mutations.addFaustianPawn({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        communityId: "aries",
        expectedPawnCount: aries?.pawnCount ?? 0,
        expectedFaustian: afterCards.faustian,
      }),
    );
    revision = afterPawn.revision;

    const afterPawnState = await runStep("Read Faustian review table", onProgress, () => mutations.readFaustian());
    const afterConspiracy = await runStep("Establish Faustian review Conspiracy", onProgress, () =>
      mutations.establishFaustianConspiracy({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        communityId: "leo",
        expectedFaustian: afterPawnState.faustian,
        subjectKind: "create",
        denizenId: reviewFaustian.conspiracies[0]?.denizenId ?? prefixedId("den", nextUuid),
        createName: "Review Conspiracy",
        seatId: "warlock",
        chipCount: 1,
        goal: "Subjugation",
      }),
    );
    revision = afterConspiracy.revision;

    const afterObligation = await runStep("Record Faustian review obligation", onProgress, () =>
      mutations.recordFaustianDueMonthObligation({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        wizardId: fixture.wizardIds.faustian,
        dueMonthOrdinal: awakening.requiredMonthOrdinal,
        weeks: 1,
      }),
    );
    revision = afterObligation.revision;

    return { ok: true, campaignId, revision };
  } catch (failure) {
    if (
      typeof failure === "object" &&
      failure !== null &&
      "failedStep" in failure &&
      "error" in failure
    ) {
      return {
        ok: false,
        failedStep: String((failure as { failedStep: string }).failedStep),
        error: String((failure as { error: string }).error),
      };
    }
    throw failure;
  }
}
