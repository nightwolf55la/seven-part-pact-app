import {
  HIEROPHANT_BUILTIN_BLASPHEMY_IDS,
  HIEROPHANT_BUILTIN_CLASS_IDS,
  HIEROPHANT_BUILTIN_DOGMA_IDS,
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  hierophantStartingTempleDisplayName,
  MOVABLE_PLANET_IDS,
  type HierophantStartingTempleId,
} from "../shared/domain";
import { PACT_SEAT_IDS, type PactSeatId } from "../shared/domain/pact-seats";
import { getFixedAgeSetupSummary } from "./setup-view-model";

const DEMO_PLAYER_NAME = "Demo Player";
const DEMO_WIZARD_NAME = "Demo Hierophant";
const DEMO_DESCRIPTION = "Demo fixture data.";

export interface DemoCampaignFixture {
  readonly playerId: string;
  readonly wizardId: string;
  readonly templePlaceIds: Record<HierophantStartingTempleId, string>;
  readonly denizenSupplicantId: string;
  readonly denizenProphetId: string;
  readonly denizenCultLeaderId: string;
  readonly denizenCultId: string;
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
    placement: { kind: "unspecified" };
  }): Promise<{ revision: number }>;
  createDenizen(args: {
    commandId: string;
    expectedCampaignId: string;
    denizenId: string;
    name: string;
    representation: "individual" | "collective";
    description: string | null;
  }): Promise<{ revision: number }>;
  initializeHierophant(args: {
    commandId: string;
    expectedCampaignId: string;
    selectedFlameLawIds: string[];
    templePlaces: { templeId: string; placeId: string }[];
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
    disposition: "reliable" | "disruptive";
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
  return {
    playerId: prefixedId("plr", nextUuid),
    wizardId: prefixedId("wiz", nextUuid),
    templePlaceIds,
    denizenSupplicantId: prefixedId("den", nextUuid),
    denizenProphetId: prefixedId("den", nextUuid),
    denizenCultLeaderId: prefixedId("den", nextUuid),
    denizenCultId: prefixedId("den", nextUuid),
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

function pactSeatStatusForDemo(seatId: PactSeatId): "present" | "absent" {
  return seatId === "hierophant" ? "present" : "absent";
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

  let revision = 0;
  let campaignId = "";

  try {
    const start = await runStep("Start campaign", onProgress, () => mutations.startNewCampaign());
    campaignId = start.campaignId;
    revision = start.campaignRevision;

    const afterAddPlayer = await runStep("Add Demo Player", onProgress, () =>
      mutations.addPlayer({
        commandId: commandId(nextUuid),
        playerId: fixture.playerId,
        name: DEMO_PLAYER_NAME,
      }),
    );
    revision = afterAddPlayer.revision;

    const afterAge = await runStep("Set Age of Awakening", onProgress, () =>
      mutations.setCampaignAge({
        commandId: commandId(nextUuid),
        ageId: "awakening",
      }),
    );
    revision = afterAge.revision;

    const afterFacilitator = await runStep("Set Facilitator", onProgress, () =>
      mutations.setFacilitator({
        commandId: commandId(nextUuid),
        playerId: fixture.playerId,
      }),
    );
    revision = afterFacilitator.revision;

    const afterWizard = await runStep("Create Demo Hierophant", onProgress, () =>
      mutations.createWizard({
        commandId: commandId(nextUuid),
        wizardId: fixture.wizardId,
        name: DEMO_WIZARD_NAME,
        portrayedByPlayerId: fixture.playerId,
        seatId: "hierophant",
      }),
    );
    revision = afterWizard.revision;

    for (const seatId of PACT_SEAT_IDS) {
      const afterSeat = await runStep("Set Pact Seat Status", onProgress, () =>
        mutations.setPactSeatStatus({
          commandId: commandId(nextUuid),
          seatId,
          status: pactSeatStatusForDemo(seatId),
        }),
      );
      revision = afterSeat.revision;
    }

    for (const seatId of PACT_SEAT_IDS) {
      const afterWatcher = await runStep("Assign Watchers", onProgress, () =>
        mutations.setWatcher({
          commandId: commandId(nextUuid),
          seatId,
          playerId: fixture.playerId,
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

    for (const templeId of HIEROPHANT_STARTING_TEMPLE_IDS) {
      const afterPlace = await runStep("Create Temple Places", onProgress, () =>
        mutations.createPlace({
          commandId: commandId(nextUuid),
          expectedCampaignId: campaignId,
          placeId: fixture.templePlaceIds[templeId],
          name: hierophantStartingTempleDisplayName(templeId),
          description: DEMO_DESCRIPTION,
          placement: { kind: "unspecified" },
        }),
      );
      revision = afterPlace.revision;
    }

    const denizenSpecs = [
      { id: fixture.denizenSupplicantId, name: "Demo Supplicant", representation: "individual" as const },
      { id: fixture.denizenProphetId, name: "Demo Prophet", representation: "individual" as const },
      { id: fixture.denizenCultLeaderId, name: "Demo Cult Leader", representation: "individual" as const },
      { id: fixture.denizenCultId, name: "Demo Cult", representation: "collective" as const },
    ];
    for (const spec of denizenSpecs) {
      const afterDenizen = await runStep("Create Demo Denizens", onProgress, () =>
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

    const afterInit = await runStep("Initialize Hierophant", onProgress, () =>
      mutations.initializeHierophant({
        commandId: commandId(nextUuid),
        expectedCampaignId: campaignId,
        selectedFlameLawIds: [...fixture.selectedFlameLawIds],
        templePlaces: HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId) => ({
          templeId,
          placeId: fixture.templePlaceIds[templeId],
        })),
      }),
    );
    revision = afterInit.revision;

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
        disposition: "reliable",
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
