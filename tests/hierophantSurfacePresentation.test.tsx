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
      initializeHierophantSourceSetup: "m3Commands.initializeHierophantSourceSetup",
      createPlace: "m3Commands.createPlace",
      setSelectedFlameLaws: "m3Commands.setSelectedFlameLaws",
      adjustTempleResources: "m3Commands.adjustTempleResources",
      createTemple: "m3Commands.createTemple",
      updateTemple: "m3Commands.updateTemple",
      setTempleHoliday: "m3Commands.setTempleHoliday",
      createHierophantSupplicant: "m3Commands.createHierophantSupplicant",
      addSupplicant: "m3Commands.addSupplicant",
      updateSupplicant: "m3Commands.updateSupplicant",
      removeSupplicant: "m3Commands.removeSupplicant",
      addProphet: "m3Commands.addProphet",
      updateProphet: "m3Commands.updateProphet",
      removeProphet: "m3Commands.removeProphet",
      setPowerfulDenizenStatus: "m3Commands.setPowerfulDenizenStatus",
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
  function paint(next = hierophant) {
    flushSync(() => {
      root.render(createElement(HierophantSurface, { hierophant: next, world: WORLD, campaignId: CAMPAIGN_ID }));
    });
  }
  paint();
  return {
    container,
    root,
    rerender(next = hierophant) {
      paint(next);
    },
  };
}

function setControlledInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function templeSelectButton(container: HTMLElement, name: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((button) =>
    (button.getAttribute("aria-label") ?? "").includes(name),
  );
  if (found === undefined) throw new Error(`Missing Temple select: ${name}`);
  return found as HTMLButtonElement;
}

function receiveOfferButton(container: HTMLElement): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Receive Supplicant");
}

function receiveForm(container: HTMLElement): HTMLFormElement | null {
  return container.querySelector('[aria-label="Selected Temple"] form');
}

function receiveNameInput(container: HTMLElement): HTMLInputElement | null {
  return receiveForm(container)?.querySelector("input") ?? null;
}

describe("Hierophant surface setup", () => {
  it("shows a setup flow when temples are empty", () => {
    const { container, root } = renderSurface();
    expect(container.innerHTML).toContain("Initialize Hierophant");
    expect(container.innerHTML).toContain("five Temples, including Hestar");
    expect(container.innerHTML).toContain("Advanced / Correct Board");
    expect(container.innerHTML).toContain("Create Temple Place");
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
    expect(container.innerHTML).toContain("Temple Krolis");
    expect(container.innerHTML).toContain("Hestar");
    expect(container.innerHTML).toContain("Acolyte Ann");
    expect(container.innerHTML).not.toContain("Receive Supplicant");
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    expect(container.innerHTML).toContain("Receive Supplicant");
    expect(container.innerHTML).toContain("Advanced / Correct Board");
    expect(container.querySelector("[aria-label='Temples of the Hierophant']")).not.toBeNull();
    const hestarSelect = Array.from(container.querySelectorAll("button")).find((b) => (b.getAttribute("aria-label") ?? "").includes("Hestar"));
    expect(hestarSelect).toBeDefined();
    flushSync(() => { hestarSelect!.click(); });
    expect(container.innerHTML).toContain("No Doctrine");
    expect(container.innerHTML).not.toContain("Give Sermon");
    const advanced = Array.from(container.querySelectorAll("summary")).find((el) =>
      el.textContent?.includes("Advanced / Correct Board"),
    );
    expect(advanced).toBeDefined();
    flushSync(() => { (advanced as HTMLElement).click(); });
    const cultsTab = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Cults");
    flushSync(() => { cultsTab!.click(); });
    expect(container.innerHTML).toContain("Leader unresolved");
    expect(container.innerHTML).toContain("Dogmas and Conviction differ.");
    root.unmount();
    container.remove();
  });
});

describe("Hierophant Temple board interactions", () => {
  const temples = [
    {
      templeId: "krolis" as const,
      kind: "ordinary" as const,
      placeId: "plc_krolis" as never,
      hostSeatId: "hierophant" as const,
      status: "active" as const,
      abundance: 5,
      conviction: 4,
      doctrine: { kind: "doctrine" as const, doctrineId: "worth_proved_through_labor" as const },
    },
    {
      templeId: "notor" as const,
      kind: "ordinary" as const,
      placeId: "plc_krolis" as never,
      hostSeatId: "hierophant" as const,
      status: "active" as const,
      abundance: 3,
      conviction: 6,
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
    {
      templeId: "ushin" as const,
      kind: "ordinary" as const,
      placeId: "plc_krolis" as never,
      hostSeatId: "hierophant" as const,
      status: "collapsed" as const,
      abundance: 0,
      conviction: 0,
      doctrine: { kind: "blasphemy" as const, blasphemyId: "law_of_the_wolf" as const },
    },
    {
      templeId: "zephon" as const,
      kind: "ordinary" as const,
      placeId: "plc_krolis" as never,
      hostSeatId: "hierophant" as const,
      status: "active" as const,
      abundance: 1,
      conviction: 1,
      doctrine: { kind: "unset" as const },
    },
  ];

  const hierophant = {
    ...EMPTY_HIEROPHANT_STATE,
    temples,
    supplicants: [
      {
        denizenId: "den_ann" as never,
        classId: "peasant" as const,
        woe: 3,
        host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
      },
    ],
  };

  it("submits Receive Supplicant as one compound mutation and keeps the draft after error", async () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    const receive = receiveOfferButton(container);
    flushSync(() => { receive!.click(); });
    const name = receiveNameInput(container) as HTMLInputElement;
    flushSync(() => { setControlledInput(name, "New Acolyte"); });
    const form = receiveForm(container) as HTMLFormElement;
    flushSync(() => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.createHierophantSupplicant"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.addSupplicant"]).not.toHaveBeenCalled();
    const args = mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[0][0];
    expect(args.templeId).toBe("krolis");
    expect(args.classId).toBe("peasant");
    expect(args.commandId).toMatch(/^cmd_/);
    expect(args.denizenId).toMatch(/^den_/);
    root.unmount();
    container.remove();
  });

  it("does not open Receive Supplicant merely by selecting another Temple", () => {
    const { container, root } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Notor").click(); });
    expect(container.querySelector('[aria-label="Selected Temple"]')?.textContent).toContain("Temple Notor");
    expect(receiveForm(container)).toBeNull();
    expect(receiveNameInput(container)).toBeNull();
    expect(receiveOfferButton(container)).toBeDefined();
    root.unmount();
    container.remove();
  });

  it("keeps an entered Receive draft when inspecting another Temple and returning", () => {
    const { container, root } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    flushSync(() => { receiveOfferButton(container)!.click(); });
    flushSync(() => { setControlledInput(receiveNameInput(container) as HTMLInputElement, "Kept Acolyte"); });
    flushSync(() => { templeSelectButton(container, "Notor").click(); });
    expect(receiveForm(container)).toBeNull();
    flushSync(() => { templeSelectButton(container, "Krolis").click(); });
    expect(receiveNameInput(container)?.value).toBe("Kept Acolyte");
    root.unmount();
    container.remove();
  });

  it("does not silently replace an existing Receive draft when starting Receive at another Temple", () => {
    const { container, root } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    flushSync(() => { receiveOfferButton(container)!.click(); });
    flushSync(() => { setControlledInput(receiveNameInput(container) as HTMLInputElement, "First Intent"); });
    flushSync(() => { templeSelectButton(container, "Notor").click(); });
    flushSync(() => { receiveOfferButton(container)!.click(); });
    expect(container.textContent).toMatch(/unfinished/i);
    expect(container.textContent).toContain("Temple Krolis");
    expect(receiveForm(container)).toBeNull();
    flushSync(() => { templeSelectButton(container, "Krolis").click(); });
    expect(receiveNameInput(container)?.value).toBe("First Intent");
    root.unmount();
    container.remove();
  });

  it("clears the Receive draft only from explicit Cancel", () => {
    const { container, root } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    flushSync(() => { receiveOfferButton(container)!.click(); });
    flushSync(() => { setControlledInput(receiveNameInput(container) as HTMLInputElement, "Discarded Acolyte"); });
    const cancel = Array.from(container.querySelectorAll("button")).find((button) =>
      button.getAttribute("aria-label") === "Cancel Receive Supplicant",
    );
    expect(cancel).toBeDefined();
    flushSync(() => { cancel!.click(); });
    expect(receiveForm(container)).toBeNull();
    flushSync(() => { receiveOfferButton(container)!.click(); });
    expect(receiveNameInput(container)?.value).toBe("");
    root.unmount();
    container.remove();
  });

  it("retries a failed Receive with the same ids and captured expectedTempleStatus", async () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {
      throw new Error("stale temple status");
    });
    const { container, root, rerender } = renderSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    flushSync(() => { receiveOfferButton(container)!.click(); });
    flushSync(() => { setControlledInput(receiveNameInput(container) as HTMLInputElement, "Retry Acolyte"); });
    const form = receiveForm(container) as HTMLFormElement;
    flushSync(() => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await Promise.resolve();
    const firstArgs = mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[0]?.[0];
    expect(firstArgs.expectedTempleStatus).toBe("active");
    expect(firstArgs.commandId).toMatch(/^cmd_/);
    expect(firstArgs.denizenId).toMatch(/^den_/);
    rerender({
      ...hierophant,
      temples: hierophant.temples.map((temple) =>
        temple.templeId === "krolis" ? { ...temple, status: "collapsed" as const } : temple,
      ),
    } as typeof EMPTY_HIEROPHANT_STATE);
    expect(receiveNameInput(container)?.value).toBe("Retry Acolyte");
    flushSync(() => {
      receiveForm(container)!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await Promise.resolve();
    const secondArgs = mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[1]?.[0];
    expect(secondArgs.commandId).toBe(firstArgs.commandId);
    expect(secondArgs.denizenId).toBe(firstArgs.denizenId);
    expect(secondArgs.expectedTempleStatus).toBe("active");
    root.unmount();
    container.remove();
  });

  it("places the exact Temple Researcher and ignores other-Domain markers", () => {
    const { container, root } = renderSurface(
      hierophant as typeof EMPTY_HIEROPHANT_STATE,
    );
    // default render without presence should still show the board
    expect(container.innerHTML).not.toContain("No Researcher at this Temple");
    root.unmount();
    const container2 = document.createElement("div");
    document.body.appendChild(container2);
    const root2 = createRoot(container2);
    flushSync(() => {
      root2.render(createElement(HierophantSurface, {
        hierophant: hierophant as typeof EMPTY_HIEROPHANT_STATE,
        world: WORLD,
        campaignId: CAMPAIGN_ID,
        sorcererPresence: [
          {
            kind: "researcher",
            denizenId: "den_00000000-0000-0000-0000-0000000000aa" as never,
            name: "Lina the Seer",
            operationalThisMonth: false,
            positionId: "srp_temple_krolis",
            target: { kind: "hierophant_temple", templeId: "krolis" },
          },
          {
            kind: "researcher",
            denizenId: "den_00000000-0000-0000-0000-0000000000ab" as never,
            name: "Sea Scout",
            operationalThisMonth: true,
            positionId: "srp_sea_1",
            target: { kind: "mariner_sea_region", seaRegionId: "bay_of_ishana" },
          },
          {
            kind: "disruptive_arcanist",
            denizenId: "den_00000000-0000-0000-0000-0000000000ac" as never,
            name: "Vex",
            school: { kind: "source", schoolId: "invocation" },
            seatId: "necromancer",
          },
        ],
      }));
    });
    expect(container2.innerHTML).toContain("Lina the Seer");
    expect(container2.innerHTML).toContain("Unavailable this month");
    expect(container2.innerHTML).not.toContain("Sea Scout");
    expect(container2.innerHTML).not.toContain("Vex");
    root2.unmount();
    container2.remove();
  });
});

describe("Hierophant zero-click monthly board", () => {
  const monthlyWorld: WorldReference = {
    denizens: [
      { denizenId: "den_ann", name: "Acolyte Ann", representation: "individual", description: null },
      { denizenId: "den_gentry", name: "Lord Gareth", representation: "individual", description: null },
      { denizenId: "den_zephon", name: "Sister Zea", representation: "individual", description: null },
      { denizenId: "den_prophet", name: "Prophet Ilya", representation: "individual", description: null },
      { denizenId: "den_highwoe", name: "Weary Bran", representation: "individual", description: null },
    ],
    isles: [],
    places: [
      { placeId: "plc_krolis", name: "Krolis Grounds", description: null, placement: { kind: "unspecified" } },
    ],
  };

  const monthlyState = {
    ...EMPTY_HIEROPHANT_STATE,
    holidayTempleIds: ["krolis"] as const,
    prophets: [
      { denizenId: "den_prophet" as never, host: { kind: "temple" as const, templeId: "krolis" as const } },
    ],
    temples: [
      {
        templeId: "krolis" as const,
        kind: "ordinary" as const,
        placeId: "plc_krolis" as never,
        hostSeatId: "hierophant" as const,
        status: "active" as const,
        abundance: 5,
        conviction: 4,
        doctrine: { kind: "doctrine" as const, doctrineId: "worth_proved_through_labor" as const },
      },
      {
        templeId: "notor" as const,
        kind: "ordinary" as const,
        placeId: "plc_krolis" as never,
        hostSeatId: "hierophant" as const,
        status: "active" as const,
        abundance: 3,
        conviction: 6,
        doctrine: { kind: "doctrine" as const, doctrineId: "charity_measure_of_moral_worth" as const },
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
      {
        templeId: "ushin" as const,
        kind: "ordinary" as const,
        placeId: "plc_krolis" as never,
        hostSeatId: "hierophant" as const,
        status: "collapsed" as const,
        abundance: 0,
        conviction: 0,
        doctrine: { kind: "blasphemy" as const, blasphemyId: "law_of_the_wolf" as const },
      },
      {
        templeId: "zephon" as const,
        kind: "ordinary" as const,
        placeId: "plc_krolis" as never,
        hostSeatId: "hierophant" as const,
        status: "active" as const,
        abundance: 0,
        conviction: 5,
        doctrine: { kind: "doctrine" as const, doctrineId: "people_used_to_be_kinder" as const },
      },
    ],
    supplicants: [
      {
        denizenId: "den_ann" as never,
        classId: "peasant" as const,
        woe: 3,
        host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
      },
      {
        denizenId: "den_gentry" as never,
        classId: "gentry" as const,
        woe: 4,
        host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
      },
      {
        denizenId: "den_highwoe" as never,
        classId: "peasant" as const,
        woe: 7,
        host: { kind: "temple" as const, templeId: "krolis" as const, area: "agiary" as const },
      },
      {
        denizenId: "den_zephon" as never,
        classId: "peasant" as const,
        woe: 2,
        host: { kind: "temple" as const, templeId: "zephon" as const, area: "courtyard" as const },
      },
    ],
  };

  function renderMonthly() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(HierophantSurface, {
        hierophant: monthlyState as typeof EMPTY_HIEROPHANT_STATE,
        world: monthlyWorld,
        campaignId: CAMPAIGN_ID,
        sorcererPresence: [
          {
            kind: "researcher",
            denizenId: "den_00000000-0000-0000-0000-0000000000aa" as never,
            name: "Lina the Seer",
            operationalThisMonth: true,
            positionId: "srp_temple_krolis",
            target: { kind: "hierophant_temple", templeId: "krolis" },
          },
        ],
      }));
    });
    const board = container.querySelector('[aria-label="Temples of the Hierophant"]') as HTMLElement | null;
    return { container, root, board };
  }

  it("shows monthly board information without selecting a Temple", () => {
    const { container, root, board } = renderMonthly();
    expect(board).not.toBeNull();
    const krolis = board!.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    const zephon = board!.querySelector('[data-temple-id="zephon"]') as HTMLElement;
    const hestar = board!.querySelector('[data-temple-id="hestar"]') as HTMLElement;
    const ushin = board!.querySelector('[data-temple-id="ushin"]') as HTMLElement;
    const notor = board!.querySelector('[data-temple-id="notor"]') as HTMLElement;
    expect(krolis.textContent).toContain("Temple Krolis");
    expect(notor.textContent).toContain("Temple Notor");
    expect(hestar.textContent).toContain("Hestar");
    expect(ushin.textContent).toContain("Temple Ushin");
    expect(zephon.textContent).toContain("Temple Zephon");
    expect(krolis.querySelector('[aria-label="Abundance 5, this Visions phase -2 → 3"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Conviction 4"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Supports Artisan, Peasant");
    expect(hestar.textContent).toContain("Supports all Classes");
    expect(krolis.textContent).toContain("Acolyte Ann");
    expect(krolis.textContent).toContain("Peasant");
    expect(krolis.querySelector('[aria-label="Woe 3 → 2"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Supported");
    expect(krolis.textContent).toContain("-1 Abundance");
    expect(krolis.textContent).toContain("Woe 3 → 2");
    expect(krolis.querySelector('[aria-label="Woe 7 → 6"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Woe 7");
    expect(krolis.textContent).toContain("Unsupported");
    expect(krolis.textContent).toContain("Woe 4 → 5");
    expect(krolis.textContent).toContain("Cult resolution required");
    expect(krolis.querySelector('[aria-label="Holiday marked"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Prophet Ilya");
    expect(krolis.textContent).not.toContain("Reliable Prophet production resolution required");
    expect(krolis.textContent).toContain("Lina the Seer");
    expect(ushin.textContent).toContain("Collapsed");
    expect(ushin.textContent).toContain("Blasphemous");
    expect(zephon.textContent).toContain("May use Hestar's Abundance");
    const advanced = container.querySelector("summary");
    expect(advanced?.textContent).toContain("Advanced / Correct Board");
    root.unmount();
    container.remove();
  });

  it("keeps the five-Temple Hestar hierarchy and subordinate correction hatch", () => {
    const { container, root, board } = renderMonthly();
    const grid = board as HTMLElement;
    expect(grid.className).toContain("md:grid-cols-[1fr_1.15fr_1fr]");
    expect(container.querySelector('[data-temple-id="hestar"]')?.closest(".md\\:col-start-2")).not.toBeNull();
    const details = Array.from(container.querySelectorAll("details")).find((el) =>
      el.querySelector("summary")?.textContent?.includes("Advanced / Correct Board"),
    );
    expect(details).toBeDefined();
    expect(details?.open).toBeFalsy();
    root.unmount();
    container.remove();
  });

  it("shows Blasphemous pair support and Supported/Unsupported from the planner", () => {
    const blasphemousState = {
      ...monthlyState,
      temples: monthlyState.temples.map((temple) =>
        temple.templeId === "krolis"
          ? { ...temple, doctrine: { kind: "blasphemy" as const, blasphemyId: "old_land_demands_blood" as const } }
          : temple,
      ),
      prophets: [],
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 3,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
        {
          denizenId: "den_gentry" as never,
          classId: "gentry" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(HierophantSurface, {
        hierophant: blasphemousState as typeof EMPTY_HIEROPHANT_STATE,
        world: monthlyWorld,
        campaignId: CAMPAIGN_ID,
      }));
    });
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).toContain("Blasphemous");
    expect(krolis.textContent).toContain("Supports Artisan, Peasant");
    expect(krolis.textContent).toContain("Supported");
    expect(krolis.textContent).toContain("Unsupported");
    expect(krolis.textContent).toContain("-1 Abundance");
    expect(krolis.querySelector('[aria-label="Woe 3 → 2"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Abundance 5, this Visions phase -1 → 4"]')).not.toBeNull();
    expect(krolis.textContent).not.toContain("Hestar choice needed");
    root.unmount();
    container.remove();
  });

  it("shows a Reliable Prophet production warning only when Benefaction is projected", () => {
    const reliableWorld: WorldReference = {
      ...monthlyWorld,
      denizens: monthlyWorld.denizens.map((denizen) =>
        denizen.denizenId === "den_prophet"
          ? {
              ...denizen,
              powerfulProfile: {
                taxonomies: [{ kind: "builtin", taxonomyId: "prophet" }],
                status: { kind: "standard", value: "reliable" },
                goal: null,
                methods: [],
                truths: [],
              },
            }
          : denizen,
      ),
    };
    const producing = {
      ...monthlyState,
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 1,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(HierophantSurface, {
        hierophant: producing as typeof EMPTY_HIEROPHANT_STATE,
        world: reliableWorld,
        campaignId: CAMPAIGN_ID,
      }));
    });
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).toContain("Prophet affects this production · resolve at the table");
    expect(krolis.textContent).not.toContain("Reliable Prophet production resolution required");
    expect(krolis.textContent).toContain("Departs");
    root.unmount();
    container.remove();
  });

  it("treats empty Temples as empty board space instead of None-field rows", () => {
    const { container, root, board } = renderMonthly();
    const notor = board!.querySelector('[data-temple-id="notor"]') as HTMLElement;
    expect(notor.textContent).toContain("Temple Notor");
    expect(notor.textContent).toContain("Courtyard");
    expect(notor.textContent).toContain("Agiary");
    expect(notor.textContent).not.toMatch(/\bNone\b/);
    expect(notor.textContent).not.toContain("No Researcher");
    expect(notor.querySelector('[aria-label="Prophets"]')).toBeNull();
    const krolis = board!.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.querySelector('[aria-label="Courtyard"]')?.textContent).toContain("Acolyte Ann");
    expect(krolis.querySelector('[aria-label="Agiary"]')?.textContent).toContain("Weary Bran");
    expect(krolis.textContent).toContain("Prophet Ilya");
    expect(krolis.textContent).toContain("Lina the Seer");
    root.unmount();
    container.remove();
  });

  it("does not open a Temple inspector until the player selects a Temple", () => {
    const { container, root } = renderMonthly();
    expect(container.querySelector('[aria-label="Selected Temple"]')).toBeNull();
    expect(receiveOfferButton(container)).toBeUndefined();
    flushSync(() => { templeSelectButton(container, "Temple Zephon").click(); });
    const inspector = container.querySelector('[aria-label="Selected Temple"]');
    expect(inspector).not.toBeNull();
    expect(inspector?.textContent).toContain("Temple Zephon");
    expect(receiveOfferButton(container)).toBeDefined();
    root.unmount();
    container.remove();
  });

  it("names eligible Hestar donors in the zero-click warning", () => {
    const donorState = {
      ...monthlyState,
      temples: monthlyState.temples.map((temple) => {
        if (temple.templeId === "hestar") return { ...temple, abundance: 0 };
        if (temple.templeId === "zephon") return { ...temple, abundance: 4 };
        return temple;
      }),
      prophets: [],
      holidayTempleIds: [],
      supplicants: [
        {
          denizenId: "den_hestar" as never,
          classId: "peasant" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "hestar" as const, area: null },
        },
      ],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(HierophantSurface, {
        hierophant: donorState as typeof EMPTY_HIEROPHANT_STATE,
        world: { ...monthlyWorld, denizens: [...monthlyWorld.denizens, { denizenId: "den_hestar", name: "Hearth Mina", representation: "individual", description: null }] },
        campaignId: CAMPAIGN_ID,
      }));
    });
    const hestar = container.querySelector('[data-temple-id="hestar"]') as HTMLElement;
    expect(hestar.textContent).toMatch(/Hestar needs 1 Abundance · choose /);
    expect(hestar.textContent).toContain("Krolis");
    expect(hestar.textContent).not.toContain("Hestar donor choice needed");
    expect(container.querySelector('[aria-label="Selected Temple"]')).toBeNull();
    root.unmount();
    container.remove();
  });
});

function ordinaryBoardTemple(
  templeId: "krolis" | "notor" | "ushin" | "zephon",
  extras: {
    abundance?: number;
    conviction?: number;
    doctrine?: { kind: "doctrine"; doctrineId: string } | { kind: "blasphemy"; blasphemyId: string } | { kind: "unset" };
    status?: "active" | "collapsed";
  } = {},
) {
  return {
    templeId,
    kind: "ordinary" as const,
    placeId: "plc_krolis" as never,
    hostSeatId: "hierophant" as const,
    status: extras.status ?? ("active" as const),
    abundance: extras.abundance ?? 5,
    conviction: extras.conviction ?? 4,
    doctrine: extras.doctrine ?? { kind: "doctrine" as const, doctrineId: "worth_proved_through_labor" as const },
  };
}

function hestarBoardTemple(extras: { abundance?: number; conviction?: number } = {}) {
  return {
    templeId: "hestar" as const,
    kind: "hestar" as const,
    placeId: "plc_krolis" as never,
    hostSeatId: "hierophant" as const,
    status: "active" as const,
    abundance: extras.abundance ?? 4,
    conviction: extras.conviction ?? 5,
  };
}

function choiceWorld(extra: WorldReference["denizens"] = []): WorldReference {
  return {
    denizens: [
      { denizenId: "den_mira", name: "Mira", representation: "individual", description: null },
      { denizenId: "den_ann", name: "Acolyte Ann", representation: "individual", description: null },
      { denizenId: "den_aster", name: "Aster", representation: "individual", description: null },
      { denizenId: "den_bell", name: "Bell", representation: "individual", description: null },
      { denizenId: "den_mina", name: "Hearth Mina", representation: "individual", description: null },
      ...extra,
    ],
    isles: [],
    places: [
      { placeId: "plc_krolis", name: "Krolis Grounds", description: null, placement: { kind: "unspecified" } },
    ],
  };
}

function renderChoiceSurface(
  hierophant: typeof EMPTY_HIEROPHANT_STATE,
  world: WorldReference = choiceWorld(),
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  function paint(next = hierophant, nextWorld = world) {
    flushSync(() => {
      root.render(createElement(HierophantSurface, {
        hierophant: next,
        world: nextWorld,
        campaignId: CAMPAIGN_ID,
      }));
    });
  }
  paint();
  return {
    container,
    root,
    rerender(next = hierophant, nextWorld = world) {
      paint(next, nextWorld);
    },
  };
}

function buttonWithText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent === text);
}

function mutationCallCount(): number {
  return Object.values(mockMutations).reduce((sum, fn) => sum + (fn?.mock.calls.length ?? 0), 0);
}

describe("Hierophant Visions preview choices", () => {
  const fiveTemples = [
    ordinaryBoardTemple("krolis"),
    ordinaryBoardTemple("notor", {
      abundance: 3,
      conviction: 6,
      doctrine: { kind: "doctrine", doctrineId: "charity_measure_of_moral_worth" },
    }),
    hestarBoardTemple(),
    ordinaryBoardTemple("ushin", {
      doctrine: { kind: "doctrine", doctrineId: "wealthy_deserve_pleasures" },
    }),
    ordinaryBoardTemple("zephon", {
      abundance: 4,
      conviction: 5,
      doctrine: { kind: "doctrine", doctrineId: "people_used_to_be_kinder" },
    }),
  ];

  it("does not show choice controls in an easy month", () => {
    const hierophant = {
      ...EMPTY_HIEROPHANT_STATE,
      temples: fiveTemples,
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 3,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    };
    const { container, root } = renderChoiceSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    expect(container.textContent).not.toContain("Pay with:");
    expect(container.textContent).not.toContain("Use Hestar's Abundance?");
    expect(container.textContent).not.toContain("Take 1 Abundance from:");
    expect(container.textContent).not.toContain("Choose Visions order");
    expect(container.querySelector('[aria-label="Visions preview choices"]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("lets an ambiguous Artisan pay with one click and change the forecast", () => {
    const hierophant = {
      ...EMPTY_HIEROPHANT_STATE,
      temples: [
        ordinaryBoardTemple("krolis", { abundance: 3, conviction: 3 }),
        ordinaryBoardTemple("notor"),
        hestarBoardTemple(),
        ordinaryBoardTemple("ushin"),
        ordinaryBoardTemple("zephon"),
      ],
      supplicants: [
        {
          denizenId: "den_mira" as never,
          classId: "artisan" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    };
    const { container, root } = renderChoiceSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).toContain("Pay with:");
    const abundance = buttonWithText(krolis, "Abundance");
    const conviction = buttonWithText(krolis, "Conviction");
    expect(abundance).toBeDefined();
    expect(conviction).toBeDefined();
    expect(abundance?.getAttribute("aria-pressed")).toBe("false");
    expect(conviction?.getAttribute("aria-pressed")).toBe("false");
    expect(krolis.querySelector('[aria-label="Abundance 3"]')).not.toBeNull();
    const before = mutationCallCount();
    flushSync(() => { conviction!.click(); });
    expect(krolis.querySelector('[aria-label="Conviction 3, this Visions phase -1 → 2"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Abundance 3"]')).not.toBeNull();
    expect(buttonWithText(krolis, "Conviction")?.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("Mira pays Conviction");
    flushSync(() => { buttonWithText(krolis, "Abundance")!.click(); });
    expect(krolis.querySelector('[aria-label="Abundance 3, this Visions phase -1 → 2"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Conviction 3"]')).not.toBeNull();
    expect(container.textContent).toContain("Mira pays Abundance");
    expect(mutationCallCount()).toBe(before);
    root.unmount();
    container.remove();
  });

  it("surfaces optional Hestar use, preserves an explicit refusal, and never offers it to a Blasphemous Temple", () => {
    const ordinary = {
      ...EMPTY_HIEROPHANT_STATE,
      temples: [
        ordinaryBoardTemple("krolis", { abundance: 0, conviction: 4 }),
        ordinaryBoardTemple("notor"),
        hestarBoardTemple({ abundance: 5 }),
        ordinaryBoardTemple("ushin"),
        ordinaryBoardTemple("zephon"),
      ],
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    };
    const { container, root, rerender } = renderChoiceSurface(ordinary as typeof EMPTY_HIEROPHANT_STATE);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).toContain("Use Hestar's Abundance?");
    expect(buttonWithText(krolis, "Use Hestar")).toBeDefined();
    expect(buttonWithText(krolis, "Don't")).toBeDefined();
    expect(buttonWithText(krolis, "Use Hestar")?.getAttribute("aria-pressed")).toBe("false");
    flushSync(() => { buttonWithText(krolis, "Don't")!.click(); });
    expect(buttonWithText(krolis, "Don't")?.getAttribute("aria-pressed")).toBe("true");
    expect(krolis.textContent).toContain("Shortage · Collapse");
    expect(container.textContent).toContain("Krolis does not use Hestar Abundance");
    const blasphemous = {
      ...ordinary,
      temples: ordinary.temples.map((temple) =>
        temple.templeId === "krolis"
          ? {
              ...temple,
              doctrine: { kind: "blasphemy" as const, blasphemyId: "old_land_demands_blood" as const },
            }
          : temple,
      ),
    };
    rerender(blasphemous as typeof EMPTY_HIEROPHANT_STATE);
    const blasphemousKrolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(blasphemousKrolis.textContent).not.toContain("Use Hestar's Abundance?");
    expect(buttonWithText(blasphemousKrolis, "Use Hestar")).toBeUndefined();
    expect(blasphemousKrolis.textContent).toContain("Shortage · Collapse");
    root.unmount();
    container.remove();
  });

  it("lists eligible Hestar donors by name and updates the chosen Temple forecast", () => {
    const hierophant = {
      ...EMPTY_HIEROPHANT_STATE,
      temples: [
        ordinaryBoardTemple("krolis", { abundance: 5 }),
        ordinaryBoardTemple("notor", { abundance: 0 }),
        hestarBoardTemple({ abundance: 0 }),
        ordinaryBoardTemple("ushin", {
          abundance: 0,
          doctrine: { kind: "blasphemy", blasphemyId: "law_of_the_wolf" },
        }),
        ordinaryBoardTemple("zephon", { abundance: 4 }),
      ],
      supplicants: [
        {
          denizenId: "den_mina" as never,
          classId: "peasant" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "hestar" as const, area: null },
        },
      ],
    };
    const { container, root } = renderChoiceSurface(hierophant as typeof EMPTY_HIEROPHANT_STATE);
    const hestar = container.querySelector('[data-temple-id="hestar"]') as HTMLElement;
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(hestar.textContent).toContain("Take 1 Abundance from:");
    expect(buttonWithText(hestar, "Krolis")).toBeDefined();
    expect(buttonWithText(hestar, "Zephon")).toBeDefined();
    expect(buttonWithText(hestar, "Ushin")).toBeUndefined();
    expect(buttonWithText(hestar, "Notor")).toBeUndefined();
    flushSync(() => { buttonWithText(hestar, "Krolis")!.click(); });
    expect(buttonWithText(hestar, "Krolis")?.getAttribute("aria-pressed")).toBe("true");
    expect(krolis.querySelector('[aria-label="Abundance 5, this Visions phase -1 → 4"]')).not.toBeNull();
    expect(hestar.querySelector('[aria-label="Abundance 0"]')).not.toBeNull();
    expect(container.textContent).toContain("Hestar takes Abundance from Krolis");
    root.unmount();
    container.remove();
  });

  it("exposes order picking only for planner-declared ambiguity and never prefills it", () => {
    const temples = [
      ordinaryBoardTemple("krolis"),
      ordinaryBoardTemple("notor"),
      hestarBoardTemple({ abundance: 0, conviction: 0 }),
      ordinaryBoardTemple("ushin", {
        abundance: 5,
        conviction: 0,
        doctrine: { kind: "doctrine", doctrineId: "masters_of_own_destiny" },
      }),
      ordinaryBoardTemple("zephon"),
    ];
    const people = [
      {
        denizenId: "den_aster" as never,
        classId: "merchant" as const,
        woe: 2,
        host: { kind: "temple" as const, templeId: "ushin" as const, area: "courtyard" as const },
      },
      {
        denizenId: "den_bell" as never,
        classId: "peasant" as const,
        woe: 1,
        host: { kind: "temple" as const, templeId: "ushin" as const, area: "courtyard" as const },
      },
    ];
    const { container, root } = renderChoiceSurface({
      ...EMPTY_HIEROPHANT_STATE,
      temples,
      supplicants: people,
    } as typeof EMPTY_HIEROPHANT_STATE);
    const ushin = container.querySelector('[data-temple-id="ushin"]') as HTMLElement;
    expect(ushin.textContent).toContain("Choose Visions order");
    expect(container.querySelector('[aria-label="Visions order 1"]')).toBeNull();
    expect(container.querySelector('[aria-label="Visions order 2"]')).toBeNull();
    const addBell = Array.from(container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "") === "Add Bell to Visions order",
    );
    const addAster = Array.from(container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "") === "Add Aster to Visions order",
    );
    expect(addBell).toBeDefined();
    expect(addAster).toBeDefined();
    flushSync(() => { addBell!.click(); });
    expect(container.querySelector('[aria-label="Visions order 1"]')?.textContent).toContain("1");
    expect(container.querySelector('[aria-label="Visions order 2"]')).toBeNull();
    expect(ushin.querySelector('[aria-label="Abundance 5"]')).not.toBeNull();
    flushSync(() => { addAster!.click(); });
    expect(container.querySelector('[aria-label="Visions order 2"]')?.textContent).toContain("2");
    expect(ushin.querySelector('[aria-label="Abundance 5, this Visions phase -1 → 4"]')).not.toBeNull();
    expect(container.textContent).toContain("Order: Bell → Aster");
    const reset = Array.from(container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "") === "Reset Visions order",
    );
    flushSync(() => { reset!.click(); });
    expect(container.querySelector('[aria-label="Visions order 1"]')).toBeNull();
    expect(container.textContent).not.toContain("Order: Bell → Aster");
    expect(ushin.querySelector('[aria-label="Abundance 5"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not keep a stale Artisan choice after the payment becomes unambiguous", () => {
    const ambiguous = {
      ...EMPTY_HIEROPHANT_STATE,
      temples: [
        ordinaryBoardTemple("krolis", { abundance: 3, conviction: 3 }),
        ordinaryBoardTemple("notor"),
        hestarBoardTemple(),
        ordinaryBoardTemple("ushin"),
        ordinaryBoardTemple("zephon"),
      ],
      supplicants: [
        {
          denizenId: "den_mira" as never,
          classId: "artisan" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    };
    const { container, root, rerender } = renderChoiceSurface(ambiguous as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { buttonWithText(container, "Conviction")!.click(); });
    expect(container.querySelector('[data-temple-id="krolis"]')?.querySelector('[aria-label="Conviction 3, this Visions phase -1 → 2"]')).not.toBeNull();
    const unambiguous = {
      ...ambiguous,
      temples: ambiguous.temples.map((temple) =>
        temple.templeId === "krolis" ? { ...temple, abundance: 5, conviction: 2 } : temple,
      ),
    };
    rerender(unambiguous as typeof EMPTY_HIEROPHANT_STATE);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).not.toContain("Pay with:");
    expect(krolis.querySelector('[aria-label="Abundance 5, this Visions phase -1 → 4"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Conviction 2"]')).not.toBeNull();
    rerender(ambiguous as typeof EMPTY_HIEROPHANT_STATE);
    const restored = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(restored.textContent).toContain("Pay with:");
    expect(buttonWithText(restored, "Conviction")?.getAttribute("aria-pressed")).toBe("false");
    expect(restored.querySelector('[aria-label="Abundance 3"]')).not.toBeNull();
    expect(restored.querySelector('[aria-label="Conviction 3"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });
});

function supplyPiece(container: HTMLElement, classId: string): HTMLElement | null {
  return container.querySelector(`[data-supply-class="${classId}"]`);
}

function supplyDrop(container: HTMLElement, templeId: string, zone: string): HTMLElement | null {
  return container.querySelector(`[data-temple-id="${templeId}"] [data-supply-drop="${zone}"]`);
}

function dragSupplyTo(piece: HTMLElement, zone: HTMLElement): void {
  flushSync(() => { piece.dispatchEvent(new Event("dragstart", { bubbles: true })); });
  flushSync(() => {
    zone.dispatchEvent(new Event("dragenter", { bubbles: true }));
    zone.dispatchEvent(new Event("dragover", { bubbles: true }));
    zone.dispatchEvent(new Event("drop", { bubbles: true }));
  });
  flushSync(() => { piece.dispatchEvent(new Event("dragend", { bubbles: true })); });
}

describe("Hierophant Supplicant supply placement", () => {
  const supplyTemples = [
    ordinaryBoardTemple("krolis"),
    ordinaryBoardTemple("notor"),
    hestarBoardTemple(),
    ordinaryBoardTemple("ushin", {
      status: "collapsed",
      doctrine: { kind: "blasphemy", blasphemyId: "law_of_the_wolf" },
    }),
    ordinaryBoardTemple("zephon", {
      doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
    }),
  ];
  const supplyState = {
    ...EMPTY_HIEROPHANT_STATE,
    temples: supplyTemples,
  };

  it("renders five source Class pieces subordinate to the Temple board", () => {
    const { container, root } = renderChoiceSurface(supplyState as typeof EMPTY_HIEROPHANT_STATE);
    const board = container.querySelector('[aria-label="Temples of the Hierophant"]');
    const supply = container.querySelector('[aria-label="Supplicant supply"]');
    expect(supply).not.toBeNull();
    expect(board).not.toBeNull();
    expect(board!.compareDocumentPosition(supply!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...supply!.querySelectorAll("[data-supply-class]")].map((el) => el.getAttribute("data-supply-class"))).toEqual([
      "peasant",
      "artisan",
      "merchant",
      "gentry",
      "pariah",
    ]);
    expect(supplyPiece(container, "peasant")?.getAttribute("aria-label")).toBe("Peasant supply");
    root.unmount();
    container.remove();
  });

  it("opens Receive from a supply drop without mutating, and keeps the existing confirm path", async () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.addSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderChoiceSurface(supplyState as typeof EMPTY_HIEROPHANT_STATE);
    const before = mutationCallCount();
    dragSupplyTo(supplyPiece(container, "peasant")!, supplyDrop(container, "krolis", "courtyard")!);
    expect(mutationCallCount()).toBe(before);
    const form = receiveForm(container);
    expect(form).not.toBeNull();
    expect((form!.querySelector("select") as HTMLSelectElement).value).toBe("peasant");
    expect((form!.querySelectorAll("select")[1] as HTMLSelectElement).value).toBe("courtyard");
    const cancel = Array.from(container.querySelectorAll("button")).find((button) =>
      button.getAttribute("aria-label") === "Cancel Receive Supplicant",
    );
    flushSync(() => { cancel!.click(); });
    expect(receiveForm(container)).toBeNull();
    expect(mutationCallCount()).toBe(before);

    dragSupplyTo(supplyPiece(container, "artisan")!, supplyDrop(container, "krolis", "agiary")!);
    expect((receiveForm(container)!.querySelector("select") as HTMLSelectElement).value).toBe("artisan");
    expect((receiveForm(container)!.querySelectorAll("select")[1] as HTMLSelectElement).value).toBe("agiary");
    flushSync(() => { cancelReceiveIfOpen(container); });

    dragSupplyTo(supplyPiece(container, "merchant")!, supplyDrop(container, "hestar", "hestar")!);
    const hestarForm = receiveForm(container)!;
    expect((hestarForm.querySelector("select") as HTMLSelectElement).value).toBe("merchant");
    expect(hestarForm.querySelectorAll("select")).toHaveLength(1);
    expect(container.querySelector('[aria-label="Selected Temple"]')?.textContent).toContain("Hestar");
    flushSync(() => { setControlledInput(receiveNameInput(container) as HTMLInputElement, "Placed Merchant"); });
    flushSync(() => { hestarForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.createHierophantSupplicant"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.addSupplicant"]).not.toHaveBeenCalled();
    const args = mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[0][0];
    expect(args.classId).toBe("merchant");
    expect(args.templeId).toBe("hestar");
    expect(args.area).toBeNull();
    expect(args.name).toBe("Placed Merchant");
    root.unmount();
    container.remove();
  });

  it("blocks collapsed Temples, ignores off-board drops, and still allows Blasphemous receipt", () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderChoiceSurface(supplyState as typeof EMPTY_HIEROPHANT_STATE);
    const before = mutationCallCount();
    dragSupplyTo(supplyPiece(container, "gentry")!, supplyDrop(container, "ushin", "blocked")!);
    expect(receiveForm(container)).toBeNull();
    expect(container.textContent).toContain("Receive Supplicant is not available at a collapsed Temple");
    expect(mutationCallCount()).toBe(before);

    dragSupplyTo(supplyPiece(container, "pariah")!, container.querySelector("h2")!);
    expect(receiveForm(container)).toBeNull();
    expect(mutationCallCount()).toBe(before);

    dragSupplyTo(supplyPiece(container, "peasant")!, supplyDrop(container, "zephon", "courtyard")!);
    expect(receiveForm(container)).not.toBeNull();
    expect((receiveForm(container)!.querySelector("select") as HTMLSelectElement).value).toBe("peasant");
    expect(container.querySelector('[aria-label="Selected Temple"]')?.textContent).toContain("Temple Zephon");
    expect(container.querySelector('[data-temple-id="zephon"]')?.textContent).toContain("Blasphemous");
    expect(mutationCallCount()).toBe(before);
    root.unmount();
    container.remove();
  });

  it("keeps the non-drag Receive path and retries the same ids", async () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {
      throw new Error("stale temple status");
    });
    const { container, root } = renderChoiceSurface(supplyState as typeof EMPTY_HIEROPHANT_STATE);
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    flushSync(() => { receiveOfferButton(container)!.click(); });
    flushSync(() => { setControlledInput(receiveNameInput(container) as HTMLInputElement, "Button Path"); });
    flushSync(() => { receiveForm(container)!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await Promise.resolve();
    const first = mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[0][0];
    expect(first.name).toBe("Button Path");
    expect(first.classId).toBe("peasant");
    flushSync(() => { receiveForm(container)!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await Promise.resolve();
    const second = mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[1][0];
    expect(second.commandId).toBe(first.commandId);
    expect(second.denizenId).toBe(first.denizenId);
    expect(mockMutations["m3Commands.addSupplicant"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });
});

function cancelReceiveIfOpen(container: HTMLElement): void {
  const cancel = Array.from(container.querySelectorAll("button")).find((button) =>
    button.getAttribute("aria-label") === "Cancel Receive Supplicant",
  );
  cancel?.click();
}
