import { describe, it, expect } from "vitest";
import {
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  MARINER_BOARD_ISLE_IDS,
} from "../shared/domain";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import { getFixedAgeSetupSummary } from "../src/setup-view-model";
import {
  REVIEW_CAMPAIGN_PLAYER_NAMES,
  buildDemoCampaignFixture,
  formatDemoSetupFailure,
  runDemoCampaignSetup,
  type DemoCampaignMutations,
} from "../src/demo-campaign";

function uuidFactory(): () => string {
  let i = 0;
  return () => `11111111-1111-1111-1111-${String(i++).padStart(12, "0")}`;
}

function createMutationSpy(): DemoCampaignMutations & {
  calls: string[];
  initializeSorcererArgs: Parameters<DemoCampaignMutations["initializeSorcerer"]>[0] | null;
} {
  let revision = 0;
  const calls: string[] = [];
  let initializeSorcererArgs: Parameters<DemoCampaignMutations["initializeSorcerer"]>[0] | null = null;
  const bump = async (label: string) => {
    calls.push(label);
    revision += 1;
    return { revision };
  };
  return {
    calls,
    get initializeSorcererArgs() {
      return initializeSorcererArgs;
    },
    startNewCampaign: async () => {
      calls.push("startNewCampaign");
      return { campaignId: "cmp_demo", campaignRevision: 0 };
    },
    addPlayer: () => bump("addPlayer"),
    setCampaignAge: () => bump("setCampaignAge"),
    setFacilitator: () => bump("setFacilitator"),
    createWizard: () => bump("createWizard"),
    setPactSeatStatus: () => bump("setPactSeatStatus"),
    setWatcher: () => bump("setWatcher"),
    setSetupMonth: () => bump("setSetupMonth"),
    setSetupOrreryPosition: () => bump("setSetupOrreryPosition"),
    createPlace: () => bump("createPlace"),
    createDenizen: () => bump("createDenizen"),
    createPowerfulDenizenProfile: () => bump("createPowerfulDenizenProfile"),
    initializeHierophantSourceSetup: () => bump("initializeHierophantSourceSetup"),
    initializeMarinerSourceSetup: () => bump("initializeMarinerSourceSetup"),
    initializeNecromancerSourceSetup: () => bump("initializeNecromancerSourceSetup"),
    setWizardSanctum: () => bump("setWizardSanctum"),
    initializeSorcerer: async (args) => {
      initializeSorcererArgs = args;
      return bump("initializeSorcerer");
    },
    arrangeFaustianTable: () => bump("arrangeFaustianTable"),
    addSupplicant: () => bump("addSupplicant"),
    addProphet: () => bump("addProphet"),
    establishCult: () => bump("establishCult"),
    addCultDogma: () => bump("addCultDogma"),
    beginPlay: () => bump("beginPlay"),
  };
}

describe("buildDemoCampaignFixture", () => {
  it("proposes IDs for seven seats, canonical geography, and Sorcerer staff", () => {
    const fixture = buildDemoCampaignFixture(uuidFactory());
    expect(fixture.playerIds).toHaveLength(REVIEW_CAMPAIGN_PLAYER_NAMES.length);
    expect(fixture.playerIds.every((id) => id.startsWith("plr_"))).toBe(true);
    expect(PACT_SEAT_IDS.every((seatId) => fixture.wizardIds[seatId].startsWith("wiz_"))).toBe(true);
    expect(HIEROPHANT_STARTING_TEMPLE_IDS.every((id) => fixture.templePlaceIds[id].startsWith("plc_"))).toBe(true);
    expect(MARINER_BOARD_ISLE_IDS.every((id) => fixture.isleIds[id].startsWith("isl_"))).toBe(true);
    expect(new Set(Object.values(fixture.templePlaceIds)).size).toBe(5);
    expect(new Set(Object.values(fixture.isleIds)).size).toBe(15);
    expect(fixture.sorcererStaffIds).toHaveLength(8);
    expect(fixture.selectedFlameLawIds).toEqual([
      HIEROPHANT_FLAME_LAW_IDS[0],
      HIEROPHANT_FLAME_LAW_IDS[1],
    ]);
  });
});

describe("runDemoCampaignSetup", () => {
  it("creates a new review campaign through beginPlay using source-shaped Domain setup", async () => {
    const mutations = createMutationSpy();
    const awakening = getFixedAgeSetupSummary("awakening");
    const result = await runDemoCampaignSetup(mutations, uuidFactory());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.campaignId).toBe("cmp_demo");
    expect(mutations.calls[0]).toBe("startNewCampaign");
    expect(mutations.calls[mutations.calls.length - 1]).toBe("beginPlay");
    expect(mutations.calls.filter((c) => c === "addPlayer")).toHaveLength(REVIEW_CAMPAIGN_PLAYER_NAMES.length);
    expect(mutations.calls.filter((c) => c === "createWizard")).toHaveLength(PACT_SEAT_IDS.length);
    expect(mutations.calls).toContain("initializeHierophantSourceSetup");
    expect(mutations.calls).toContain("initializeMarinerSourceSetup");
    expect(mutations.calls).toContain("initializeNecromancerSourceSetup");
    expect(mutations.calls).toContain("initializeSorcerer");
    expect(mutations.initializeSorcererArgs).toMatchObject({
      arrangementId: "quiet",
      activeLawIds: ["first", "second"],
      unrevealedLawId: "third",
      orreryHouses: [0, 4, 8],
      ideologyIds: ["aristocracy", "mercantilism"],
      seaRegionIds: ["bay_of_ishana", "wizard_strait"],
      researchers: [
        { positionId: "srp_orrery_1" },
        { positionId: "srp_temple_krolis" },
        { positionId: "srp_court_1" },
      ],
    });
    expect(mutations.initializeSorcererArgs?.studentDenizenIds).toHaveLength(3);
    expect(mutations.initializeSorcererArgs?.professorDenizenId).toBeTruthy();
    expect(mutations.initializeSorcererArgs?.alchemistDenizenId).toBeTruthy();
    expect(mutations.calls).toContain("arrangeFaustianTable");
    expect(mutations.calls).not.toContain("initializeHierophant");
    expect(mutations.calls.filter((c) => c === "createPlace")).toHaveLength(2);
    expect(mutations.calls.filter((c) => c === "createDenizen")).toHaveLength(12);
    expect(mutations.calls.filter((c) => c === "addCultDogma")).toHaveLength(2);
    expect(mutations.calls.filter((c) => c === "setPactSeatStatus")).toHaveLength(PACT_SEAT_IDS.length);
    expect(mutations.calls.filter((c) => c === "setWatcher")).toHaveLength(PACT_SEAT_IDS.length);
    expect(mutations.calls.filter((c) => c === "setSetupOrreryPosition")).toHaveLength(5);
    expect(awakening.requiredMonthOrdinal).toBeGreaterThanOrEqual(0);
  });

  it("stops at the failed step without invoking later mutations", async () => {
    const mutations = createMutationSpy();
    mutations.createPlace = async () => {
      mutations.calls.push("createPlace");
      throw new Error("place failed");
    };
    const result = await runDemoCampaignSetup(mutations, uuidFactory());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedStep).toBe("Create Sorcerer Tower");
    expect(result.error).toContain("place failed");
    expect(mutations.calls).not.toContain("initializeSorcerer");
    expect(mutations.calls).not.toContain("beginPlay");
  });

  it("formats persistent failure messages with the failed step", () => {
    expect(formatDemoSetupFailure("Create Sorcerer Tower", new Error("place failed"))).toBe(
      'Demo setup stopped at "Create Sorcerer Tower": place failed',
    );
  });
});
