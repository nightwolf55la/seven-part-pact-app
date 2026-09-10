import { describe, it, expect } from "vitest";
import {
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  hierophantStartingTempleDisplayName,
} from "../shared/domain";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import { getFixedAgeSetupSummary } from "../src/setup-view-model";
import {
  buildDemoCampaignFixture,
  formatDemoSetupFailure,
  runDemoCampaignSetup,
  type DemoCampaignMutations,
} from "../src/demo-campaign";

const UUIDS = [
  "11111111-1111-1111-1111-000000000001",
  "11111111-1111-1111-1111-000000000002",
  "11111111-1111-1111-1111-000000000003",
  "11111111-1111-1111-1111-000000000004",
  "11111111-1111-1111-1111-000000000005",
  "11111111-1111-1111-1111-000000000006",
  "11111111-1111-1111-1111-000000000007",
  "11111111-1111-1111-1111-000000000008",
  "11111111-1111-1111-1111-000000000009",
  "11111111-1111-1111-1111-000000000010",
  "11111111-1111-1111-1111-000000000011",
  "11111111-1111-1111-1111-000000000012",
  "11111111-1111-1111-1111-000000000013",
  "11111111-1111-1111-1111-000000000014",
  "11111111-1111-1111-1111-000000000015",
  "11111111-1111-1111-1111-000000000016",
  "11111111-1111-1111-1111-000000000017",
  "11111111-1111-1111-1111-000000000018",
  "11111111-1111-1111-1111-000000000019",
  "11111111-1111-1111-1111-000000000020",
  "11111111-1111-1111-1111-000000000021",
  "11111111-1111-1111-1111-000000000022",
  "11111111-1111-1111-1111-000000000023",
  "11111111-1111-1111-1111-000000000024",
  "11111111-1111-1111-1111-000000000025",
  "11111111-1111-1111-1111-000000000026",
  "11111111-1111-1111-1111-000000000027",
  "11111111-1111-1111-1111-000000000028",
  "11111111-1111-1111-1111-000000000029",
  "11111111-1111-1111-1111-000000000030",
  "11111111-1111-1111-1111-000000000031",
  "11111111-1111-1111-1111-000000000032",
  "11111111-1111-1111-1111-000000000033",
  "11111111-1111-1111-1111-000000000034",
  "11111111-1111-1111-1111-000000000035",
  "11111111-1111-1111-1111-000000000036",
  "11111111-1111-1111-1111-000000000037",
  "11111111-1111-1111-1111-000000000038",
  "11111111-1111-1111-1111-000000000039",
  "11111111-1111-1111-1111-000000000040",
];

function uuidFactory(): () => string {
  let i = 0;
  return () => UUIDS[i++] ?? `99999999-9999-9999-9999-${String(i).padStart(12, "0")}`;
}

function createMutationSpy(): DemoCampaignMutations & { calls: string[] } {
  let revision = 0;
  const calls: string[] = [];
  const bump = async (label: string) => {
    calls.push(label);
    revision += 1;
    return { revision };
  };
  return {
    calls,
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
    initializeHierophant: () => bump("initializeHierophant"),
    addSupplicant: () => bump("addSupplicant"),
    addProphet: () => bump("addProphet"),
    establishCult: () => bump("establishCult"),
    addCultDogma: () => bump("addCultDogma"),
    beginPlay: () => bump("beginPlay"),
  };
}

describe("buildDemoCampaignFixture", () => {
  it("uses approved ID prefixes and five distinct Temple Places", () => {
    const fixture = buildDemoCampaignFixture(uuidFactory());
    expect(fixture.playerId.startsWith("plr_")).toBe(true);
    expect(fixture.wizardId.startsWith("wiz_")).toBe(true);
    expect(fixture.denizenSupplicantId.startsWith("den_")).toBe(true);
    expect(fixture.denizenProphetId.startsWith("den_")).toBe(true);
    expect(fixture.denizenCultLeaderId.startsWith("den_")).toBe(true);
    expect(fixture.denizenCultId.startsWith("den_")).toBe(true);
    expect(fixture.dogmaEntryIds.every((id) => id.startsWith("hdg_"))).toBe(true);
    expect(HIEROPHANT_STARTING_TEMPLE_IDS.every((id) => fixture.templePlaceIds[id].startsWith("plc_"))).toBe(true);
    expect(new Set(Object.values(fixture.templePlaceIds)).size).toBe(5);
    expect(fixture.selectedFlameLawIds).toEqual([
      HIEROPHANT_FLAME_LAW_IDS[0],
      HIEROPHANT_FLAME_LAW_IDS[1],
    ]);
  });
});

describe("runDemoCampaignSetup", () => {
  it("executes setup through beginPlay using Awakening fixed preset values", async () => {
    const mutations = createMutationSpy();
    const awakening = getFixedAgeSetupSummary("awakening");
    const result = await runDemoCampaignSetup(mutations, uuidFactory());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.campaignId).toBe("cmp_demo");
    expect(mutations.calls[0]).toBe("startNewCampaign");
    expect(mutations.calls[mutations.calls.length - 1]).toBe("beginPlay");
    expect(mutations.calls).toContain("initializeHierophant");
    expect(mutations.calls.filter((c) => c === "createPlace")).toHaveLength(5);
    expect(mutations.calls.filter((c) => c === "createDenizen")).toHaveLength(4);
    expect(mutations.calls.filter((c) => c === "addCultDogma")).toHaveLength(2);

    expect(mutations.calls.filter((c) => c === "setPactSeatStatus")).toHaveLength(PACT_SEAT_IDS.length);
    expect(mutations.calls.filter((c) => c === "setWatcher")).toHaveLength(PACT_SEAT_IDS.length);
    expect(mutations.calls.filter((c) => c === "setSetupOrreryPosition")).toHaveLength(5);

    const fixture = buildDemoCampaignFixture(uuidFactory());
    for (const templeId of HIEROPHANT_STARTING_TEMPLE_IDS) {
      expect(hierophantStartingTempleDisplayName(templeId)).toContain("Temple");
    }
    expect(awakening.requiredMonthOrdinal).toBeGreaterThanOrEqual(0);
    expect(fixture.selectedFlameLawIds).toHaveLength(2);
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
    expect(result.failedStep).toBe("Create Temple Places");
    expect(result.error).toContain("place failed");
    expect(mutations.calls).not.toContain("initializeHierophant");
    expect(mutations.calls).not.toContain("beginPlay");
  });

  it("formats persistent failure messages with the failed step", () => {
    expect(formatDemoSetupFailure("Create Temple Places", new Error("place failed"))).toBe(
      'Demo setup stopped at "Create Temple Places": place failed',
    );
  });
});
