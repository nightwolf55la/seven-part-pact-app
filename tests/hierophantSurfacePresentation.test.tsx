// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { EMPTY_HIEROPHANT_STATE } from "../shared/domain";
import HierophantSurface from "../src/HierophantSurface";
import type { WorldReference } from "../src/WorldSurface";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";

const WORLD: WorldReference = {
  denizens: [
    { denizenId: "den_ann", name: "Acolyte Ann", representation: "individual", description: null },
    { denizenId: "den_choir", name: "The Choir", representation: "collective", description: null },
  ],
  isles: [],
  places: [
    { placeId: "plc_krolis", name: "Krolis Grounds", description: null, placement: { kind: "unspecified" } },
  ],
};

const mockMutations: Record<string, ReturnType<typeof vi.fn>> = {};

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (!mockMutations[ref]) mockMutations[ref] = vi.fn(async () => {});
    return mockMutations[ref];
  },
}));

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Commands: {
      initializeHierophant: "m3Commands.initializeHierophant",
      createPlace: "m3Commands.createPlace",
      setSelectedFlameLaws: "m3Commands.setSelectedFlameLaws",
      adjustTempleResources: "m3Commands.adjustTempleResources",
      createTemple: "m3Commands.createTemple",
      updateTemple: "m3Commands.updateTemple",
      setTempleHoliday: "m3Commands.setTempleHoliday",
      addSupplicant: "m3Commands.addSupplicant",
      updateSupplicant: "m3Commands.updateSupplicant",
      removeSupplicant: "m3Commands.removeSupplicant",
      addProphet: "m3Commands.addProphet",
      updateProphet: "m3Commands.updateProphet",
      removeProphet: "m3Commands.removeProphet",
      establishCult: "m3Commands.establishCult",
      updateCult: "m3Commands.updateCult",
      removeCult: "m3Commands.removeCult",
      addCultDogma: "m3Commands.addCultDogma",
      updateCultDogma: "m3Commands.updateCultDogma",
      removeCultDogma: "m3Commands.removeCultDogma",
      createCampaignClass: "m3Commands.createCampaignClass",
      updateCampaignClass: "m3Commands.updateCampaignClass",
      createCampaignDoctrine: "m3Commands.createCampaignDoctrine",
      updateCampaignDoctrine: "m3Commands.updateCampaignDoctrine",
    },
  },
}));

function renderSurface(hierophant = EMPTY_HIEROPHANT_STATE) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(HierophantSurface, { hierophant, world: WORLD, campaignId: CAMPAIGN_ID }));
  });
  return { container, root };
}

describe("Hierophant surface setup", () => {
  it("shows a setup flow when temples are empty", () => {
    const { container, root } = renderSurface();
    expect(container.innerHTML).toContain("Initialize Hierophant");
    expect(container.innerHTML).toContain("Temple Krolis");
    expect(container.innerHTML).toContain("Temple Hestar");
    expect(container.innerHTML).toContain("Create Temple Place");
    expect(container.innerHTML).toContain("Unresolved Places");
    const init = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Initialize Hierophant");
    expect(init).toBeDefined();
    expect((init as HTMLButtonElement).disabled).toBe(true);
    root.unmount();
    container.remove();
  });

  it("shows initialized Temples including Hestar distinction and hosted-role labels", () => {
    const hierophant = {
      ...EMPTY_HIEROPHANT_STATE,
      selectedFlameLawIds: ["first", "second"] as const,
      temples: [
        {
          templeId: "krolis" as const,
          kind: "ordinary" as const,
          placeId: "plc_krolis" as never,
          hostSeatId: "hierophant" as const,
          status: "active" as const,
          abundance: 5,
          conviction: 4,
          doctrine: { kind: "unset" as const },
        },
        {
          templeId: "hestar" as const,
          kind: "hestar" as const,
          placeId: "plc_krolis" as never,
          hostSeatId: "hierophant" as const,
          status: "active" as const,
          abundance: 4,
          conviction: 5,
        },
      ],
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 0,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
      cults: [
        {
          cultDenizenId: "den_choir" as never,
          hostSeatId: "warlock" as const,
          anchorPlaceId: null,
          leaderDenizenId: null,
          blasphemyId: "law_of_the_wolf" as const,
          abundance: 1,
          conviction: 2,
          dogmas: [],
        },
      ],
    };
    const { container, root } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    expect(container.innerHTML).toContain("Selected Laws of the Flame");
    const templesTab = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Temples");
    flushSync(() => { templesTab!.click(); });
    expect(container.innerHTML).toContain("Temple Krolis");
    expect(container.innerHTML).toContain("Hestar");
    expect(container.innerHTML).toContain("Acolyte Ann");
    const cultsTab = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Cults");
    flushSync(() => { cultsTab!.click(); });
    expect(container.innerHTML).toContain("Leader unresolved");
    expect(container.innerHTML).toContain("Dogmas and Conviction differ.");
    root.unmount();
    container.remove();
  });
});
