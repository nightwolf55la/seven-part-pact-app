// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act, createElement } from "react";
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
      resolveHierophantVisions: "m3Commands.resolveHierophantVisions",
      transferHierophantHestarResource: "m3Commands.transferHierophantHestarResource",
      steerHierophantSupplicant: "m3Commands.steerHierophantSupplicant",
      departHierophantSupplicantWithBenefaction: "m3Commands.departHierophantSupplicantWithBenefaction",
      addSupplicant: "m3Commands.addSupplicant",
      updateSupplicant: "m3Commands.updateSupplicant",
      updateDenizen: "m3Commands.updateDenizen",
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
      root.render(createElement(HierophantSurface, { hierophant: next, world: WORLD, campaignId: CAMPAIGN_ID, campaignRevision: 4 }));
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
        campaignRevision: 4,
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
        campaignRevision: 4,
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
    expect(krolis.querySelector('[aria-label="Abundance 5, Next Visions -2 → 3"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Conviction 4"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Supports Artisan, Peasant"]')).not.toBeNull();
    expect(krolis.querySelector('[data-class-badge="artisan"]')?.textContent).toBe("Artisan");
    expect(krolis.querySelector('[data-class-badge="peasant"]')?.textContent).toBe("Peasant");
    expect(hestar.textContent).toContain("Supports all");
    expect(krolis.textContent).toContain("Acolyte Ann");
    expect(krolis.textContent).toContain("Peasant");
    expect(krolis.querySelector('[aria-label="Current Woe 3"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Supported");
    expect(krolis.querySelector('[data-supplicant-piece="den_ann"] [data-supplicant-cost-value]')?.textContent).toBe("1 Abundance");
    expect(krolis.querySelector('[aria-label="Current Woe 7"]')).not.toBeNull();
    expect(krolis.querySelector('[data-supplicant-piece] [data-woe-overflow]')?.textContent).toBe("7");
    expect(krolis.textContent).toContain("Unsupported");
    expect(Array.from(krolis.querySelectorAll("[data-supplicant-piece]")).every(
      (piece) => !piece.textContent?.includes("Next Visions"),
    )).toBe(true);
    expect(krolis.textContent).toContain("Cult departure due");
    expect(krolis.textContent).not.toContain("Cult resolution required");
    expect(krolis.textContent).not.toContain("Unnamed");
    expect(krolis.querySelector('[aria-label="Holiday marked"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Prophet Ilya");
    expect(krolis.textContent).not.toContain("Reliable Prophet production resolution required");
    expect(krolis.textContent).toContain("Lina the Seer");
    expect(buttonWithText(container, "Resolve Visions")).toBeUndefined();
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
        campaignRevision: 4,
      }));
    });
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).toContain("Blasphemous");
    expect(krolis.querySelector('[aria-label="Supports Artisan, Peasant"]')).not.toBeNull();
    expect(krolis.textContent).toContain("Supported");
    expect(krolis.textContent).toContain("Unsupported");
    expect(krolis.querySelector('[data-supplicant-cost-value]')?.textContent).toBe("1 Abundance");
    expect(krolis.querySelector('[aria-label="Current Woe 3"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Abundance 5, Next Visions -1 → 4"]')).not.toBeNull();
    expect(krolis.querySelector("[data-woe-forecast]")).toBeNull();
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
        campaignRevision: 4,
      }));
    });
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).not.toContain("Prophet affects this production · resolve at the table");
    expect(krolis.textContent).not.toContain("Reliable Prophet production resolution required");
    expect(Array.from(krolis.querySelectorAll("[data-supplicant-piece]")).every(
      (piece) => !piece.textContent?.includes("Next Visions"),
    )).toBe(true);
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
        campaignRevision: 4,
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
  extras: {
    sorcererPresence?: Parameters<typeof HierophantSurface>[0]["sorcererPresence"];
    steerTime?: Parameters<typeof HierophantSurface>[0]["steerTime"];
  } = {},
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
        campaignRevision: 4,
        sorcererPresence: extras.sorcererPresence,
        steerTime: extras.steerTime,
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

async function settleQueuedMutation(resolveFn?: () => void): Promise<void> {
  resolveFn?.();
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
    flushSync(() => {});
  }
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
    expect(krolis.querySelector('[aria-label="Conviction 3, Next Visions -1 → 2"]')).not.toBeNull();
    expect(krolis.querySelector('[aria-label="Abundance 3"]')).not.toBeNull();
    expect(buttonWithText(krolis, "Conviction")?.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("Mira pays Conviction");
    flushSync(() => { buttonWithText(krolis, "Abundance")!.click(); });
    expect(krolis.querySelector('[aria-label="Abundance 3, Next Visions -1 → 2"]')).not.toBeNull();
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
    expect(krolis.querySelector('[aria-label="Abundance 5, Next Visions -1 → 4"]')).not.toBeNull();
    expect(hestar.querySelector('[aria-label="Abundance 0"]')).not.toBeNull();
    expect(container.textContent).toContain("Hestar takes Abundance from Krolis");
    root.unmount();
    container.remove();
  });

  it("exposes order picking only for planner-declared ambiguity and never prefills it", () => {
    const temples = [
      ordinaryBoardTemple("krolis", { abundance: 1, conviction: 4 }),
      ordinaryBoardTemple("notor"),
      hestarBoardTemple({ abundance: 0, conviction: 0 }),
      ordinaryBoardTemple("ushin"),
      ordinaryBoardTemple("zephon"),
    ];
    const people = [
      {
        denizenId: "den_aster" as never,
        classId: "peasant" as const,
        woe: 3,
        host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
      },
      {
        denizenId: "den_bell" as never,
        classId: "peasant" as const,
        woe: 2,
        host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
      },
    ];
    const { container, root } = renderChoiceSurface({
      ...EMPTY_HIEROPHANT_STATE,
      temples,
      supplicants: people,
    } as typeof EMPTY_HIEROPHANT_STATE);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).toContain("Choose Visions order");
    expect(container.querySelector('[aria-label="Visions order 1"]')).toBeNull();
    expect(container.querySelector('[aria-label="Visions order 2"]')).toBeNull();
    const addBell = Array.from(container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "").includes("Add Peasant Bell to Visions order"),
    );
    const addAster = Array.from(container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "").includes("Add Peasant Aster to Visions order"),
    );
    expect(addBell).toBeDefined();
    expect(addAster).toBeDefined();
    flushSync(() => { addBell!.click(); });
    expect(container.querySelector('[aria-label="Visions order 1"]')?.textContent).toContain("1");
    expect(container.querySelector('[aria-label="Visions order 2"]')).toBeNull();
    expect(krolis.querySelector('[aria-label="Abundance 1"]')).not.toBeNull();
    flushSync(() => { addAster!.click(); });
    expect(container.querySelector('[aria-label="Visions order 2"]')?.textContent).toContain("2");
    expect(krolis.textContent).toContain("Shortage · Collapse");
    expect(container.textContent).toContain("Order: Bell → Aster");
    const reset = Array.from(container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "") === "Reset Visions order",
    );
    flushSync(() => { reset!.click(); });
    expect(container.querySelector('[aria-label="Visions order 1"]')).toBeNull();
    expect(container.textContent).not.toContain("Order: Bell → Aster");
    expect(krolis.querySelector('[aria-label="Abundance 1"]')).not.toBeNull();
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
    expect(container.querySelector('[data-temple-id="krolis"]')?.querySelector('[aria-label="Conviction 3, Next Visions -1 → 2"]')).not.toBeNull();
    const unambiguous = {
      ...ambiguous,
      temples: ambiguous.temples.map((temple) =>
        temple.templeId === "krolis" ? { ...temple, abundance: 5, conviction: 2 } : temple,
      ),
    };
    rerender(unambiguous as typeof EMPTY_HIEROPHANT_STATE);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.textContent).not.toContain("Pay with:");
    expect(krolis.querySelector('[aria-label="Abundance 5, Next Visions -1 → 4"]')).not.toBeNull();
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

  it("allows a native-order supply drop before React re-renders the pressed Class", () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderChoiceSurface(supplyState as typeof EMPTY_HIEROPHANT_STATE);
    const piece = supplyPiece(container, "peasant")!;
    const zone = supplyDrop(container, "krolis", "courtyard")!;
    piece.dispatchEvent(new Event("dragstart", { bubbles: true }));
    const over = new Event("dragover", { bubbles: true, cancelable: true });
    zone.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    zone.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));
    piece.dispatchEvent(new Event("dragend", { bubbles: true }));
    flushSync(() => {});
    const form = receiveForm(container);
    expect(form).not.toBeNull();
    expect((form!.querySelector("select") as HTMLSelectElement).value).toBe("peasant");
    expect((form!.querySelectorAll("select")[1] as HTMLSelectElement).value).toBe("courtyard");
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

const pieceWorld: WorldReference = {
  denizens: [
    { denizenId: "den_ann", name: "Acolyte Ann", representation: "individual", description: null },
    { denizenId: "den_blank", name: "Peasant", representation: "individual", description: null },
    { denizenId: "den_ready", name: "Mercy", representation: "individual", description: null },
    { denizenId: "den_high", name: "Weary Bran", representation: "individual", description: null },
    { denizenId: "den_prophet", name: "Prophet Ilya", representation: "individual", description: null },
  ],
  isles: [],
  places: [
    { placeId: "plc_krolis", name: "Krolis Grounds", description: null, placement: { kind: "unspecified" } },
  ],
};

const pieceState = {
  ...EMPTY_HIEROPHANT_STATE,
  temples: [
    ordinaryBoardTemple("krolis"),
    ordinaryBoardTemple("notor"),
    hestarBoardTemple(),
    ordinaryBoardTemple("ushin"),
    ordinaryBoardTemple("zephon"),
  ],
  prophets: [
    { denizenId: "den_prophet" as never, host: { kind: "temple" as const, templeId: "krolis" as const } },
  ],
  supplicants: [
    {
      denizenId: "den_ann" as never,
      classId: "peasant" as const,
      woe: 1,
      host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
    },
    {
      denizenId: "den_blank" as never,
      classId: "peasant" as const,
      woe: 5,
      host: { kind: "temple" as const, templeId: "krolis" as const, area: "agiary" as const },
    },
    {
      denizenId: "den_ready" as never,
      classId: "artisan" as const,
      woe: 0,
      host: { kind: "temple" as const, templeId: "notor" as const, area: "courtyard" as const },
    },
    {
      denizenId: "den_high" as never,
      classId: "gentry" as const,
      woe: 7,
      host: { kind: "temple" as const, templeId: "notor" as const, area: "agiary" as const },
    },
  ],
};

function renderPieces() {
  return renderChoiceSurface(pieceState as typeof EMPTY_HIEROPHANT_STATE, pieceWorld, {
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
  });
}

describe("Hierophant physical piece controls", () => {
  function woeTarget(piece: HTMLElement, value: number): HTMLButtonElement {
    return piece.querySelector(`[data-woe-target="${value}"]`) as HTMLButtonElement;
  }

  function woeDecrement(piece: HTMLElement): HTMLButtonElement {
    return piece.querySelector('[data-woe-pips] [data-woe-step="decrement"]') as HTMLButtonElement;
  }

  function woeIncrement(piece: HTMLElement): HTMLButtonElement {
    return piece.querySelector('[data-woe-pips] [data-woe-step="increment"]') as HTMLButtonElement;
  }

  it("shows compact unnamed and named person-piece headers without duplicated Class text", () => {
    const { container, root } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    const unnamed = container.querySelector('[data-supplicant-piece="den_blank"]') as HTMLElement;
    expect(named.querySelector("[data-piece-name]")?.textContent).toBe("Acolyte Ann");
    expect(named.querySelector("[data-piece-type]")?.textContent).toBe("Supplicant");
    expect(unnamed.querySelector("[data-piece-name]")).toBeNull();
    expect(unnamed.textContent).not.toContain("Unnamed");
    const unnamedBadge = unnamed.querySelector('[data-class-badge="peasant"]') as HTMLElement;
    expect(unnamedBadge?.textContent).toBe("Peasant");
    expect(unnamed.textContent?.replace(unnamedBadge.textContent ?? "", "")).not.toMatch(/\bPeasant\b/);
    const namedBadge = named.querySelector('[data-class-badge="peasant"]') as HTMLElement;
    expect(named.textContent?.replace(namedBadge.textContent ?? "", "")).not.toMatch(/\bPeasant\b/);
    const identity = named.querySelector("[data-supplicant-identity]") as HTMLElement;
    expect(identity.querySelector('[data-class-badge="peasant"]')).not.toBeNull();
    expect(identity.querySelector('[data-support-badge="supported"]')?.textContent).toBe("Supported");
    expect(named.querySelector("[data-supplicant-woe-row] [data-woe-pips]")).not.toBeNull();
    expect(unnamed.querySelector('[data-support-badge="supported"]')?.textContent).toBe("Supported");
    const prophet = container.querySelector('[data-prophet-piece="den_prophet"]') as HTMLElement;
    expect(prophet.querySelector("[data-piece-type]")?.textContent).toBe("Prophet");
    expect(prophet.querySelector("[data-piece-name]")?.textContent).toBe("Prophet Ilya");
    const researcher = container.querySelector('[data-researcher-piece]') as HTMLElement;
    expect(researcher.querySelector("[data-piece-type]")?.textContent).toBe("Researcher");
    expect(researcher.querySelector("[data-piece-name]")?.textContent).toBe("Lina the Seer");
    expect(container.querySelector('[aria-label="Supplicant supply"] [data-class-badge="gentry"]')).not.toBeNull();
    expect(container.querySelector('[data-temple-id="krolis"] [aria-label="Supports Artisan, Peasant"] [data-class-badge="artisan"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("shows authoritative threshold cues without resting Next Visions on the card", () => {
    const { container, root } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    const unnamed = container.querySelector('[data-supplicant-piece="den_blank"]') as HTMLElement;
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const high = container.querySelector('[data-supplicant-piece="den_high"]') as HTMLElement;
    expect(named.querySelector("[data-woe-label]")?.textContent).toBe("Woe");
    expect(named.querySelector('[aria-label="Current Woe 1"]')).not.toBeNull();
    expect(named.querySelector("[data-woe-forecast]")).toBeNull();
    expect(named.textContent).not.toContain("Next Visions");
    expect(ready.querySelector('[data-woe-threshold="benefaction"]')?.textContent).toBe("Ready for Benefaction");
    expect(unnamed.querySelector('[data-woe-threshold="cult"]')?.textContent).toBe("Cult departure due");
    expect(high.querySelector('[aria-label="Current Woe 7"]')).not.toBeNull();
    expect(high.querySelector("[data-woe-overflow]")?.textContent).toBe("7");
    expect(ready.querySelector('[data-woe-target="0"]')).toBeNull();
    expect(ready.querySelectorAll('[data-woe-filled="true"]')).toHaveLength(0);
    expect(high.querySelector('[data-woe-overflow]')?.textContent).toBe("7");
    expect(high.querySelectorAll('[data-woe-filled="true"]')).toHaveLength(4);
    const readyBenefaction = ready.querySelector('[data-piece-benefaction] button') as HTMLButtonElement;
    expect(readyBenefaction.getAttribute("aria-label")).toBe("Benefaction & Depart Mercy");
    expect(readyBenefaction.textContent).toBe("Benefaction & Depart");
    expect(named.querySelector('[data-piece-benefaction]')).toBeNull();
    expect(unnamed.querySelector('[data-piece-benefaction]')).toBeNull();
    expect(container.querySelector('[aria-label="Depart for Cult"]')).toBeNull();
    expect(
      container.querySelector('[data-temple-resource="krolis"][data-resource-counter="abundance"]')
        ?.getAttribute("data-resource-controls"),
    ).toBe("hidden");
    expect(container.querySelector('[data-supplicant-piece="den_ann"]')?.getAttribute("draggable")).toBe("true");
    expect(container.querySelector('[data-supplicant-piece="den_ready"]')?.getAttribute("draggable")).toBe("true");
    expect(container.querySelector('[data-supplicant-piece="den_ann"]')?.getAttribute("data-host-draggable")).toBe("true");
    const advanced = Array.from(container.querySelectorAll("summary")).find((el) =>
      el.textContent?.includes("Advanced / Correct Board"),
    );
    expect(advanced).toBeDefined();
    root.unmount();
    container.remove();
  });

  it("direct-sets Woe through updateSupplicant without threshold mutations", async () => {
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.removeSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.establishCult"] = vi.fn(async () => {});
    mockMutations["m3Commands.adjustTempleResources"] = vi.fn(async () => {});
    const { container, root, rerender } = renderPieces();
    function withWoe(denizenId: string, woe: number) {
      rerender({
        ...pieceState,
        supplicants: pieceState.supplicants.map((person) =>
          person.denizenId === denizenId ? { ...person, woe } : person,
        ),
      } as typeof EMPTY_HIEROPHANT_STATE);
    }
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const high = container.querySelector('[data-supplicant-piece="den_high"]') as HTMLElement;
    const unnamed = container.querySelector('[data-supplicant-piece="den_blank"]') as HTMLElement;
    expect(named.querySelector('[data-woe-target="0"]')).toBeNull();
    expect(woeTarget(named, 3).getAttribute("aria-label")).toBe("Set Acolyte Ann Woe to 3");
    flushSync(() => { woeDecrement(named).click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[0][0].fields).toEqual({ woe: { expected: 1, value: 0 } });
    withWoe("den_ann", 0);
    flushSync(() => { woeTarget(container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement, 1).click(); });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls.some((call) => (
      call[0].fields.woe.expected === 0 && call[0].fields.woe.value === 1
    ))).toBe(true);
    withWoe("den_ann", 1);
    flushSync(() => { woeTarget(container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement, 3).click(); });
    await Promise.resolve();
    const afterThree = mockMutations["m3Commands.updateSupplicant"].mock.calls.slice(-1)[0][0];
    expect(afterThree.fields).toEqual({ woe: { expected: 1, value: 3 } });
    withWoe("den_ann", 3);
    flushSync(() => { woeTarget(ready, 5).click(); });
    await Promise.resolve();
    const afterFive = mockMutations["m3Commands.updateSupplicant"].mock.calls.slice(-1)[0][0];
    expect(afterFive.fields).toEqual({ woe: { expected: 0, value: 5 } });
    withWoe("den_ready", 5);
    flushSync(() => { woeTarget(high, 5).click(); });
    await Promise.resolve();
    const afterHigh = mockMutations["m3Commands.updateSupplicant"].mock.calls.slice(-1)[0][0];
    expect(afterHigh).toMatchObject({
      denizenId: "den_high",
      fields: { woe: { expected: 7, value: 5 } },
    });
    expect(woeTarget(unnamed, 5).tagName).toBe("BUTTON");
    expect(mockMutations["m3Commands.removeSupplicant"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.establishCult"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.adjustTempleResources"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("records host-only placement on ordinary drag without Time or Steer", async () => {
    mockMutations["m3Commands.steerHierophantSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    const zone = supplyDrop(container, "notor", "courtyard")!;
    expect(named.getAttribute("data-steer-time")).toBe("none");
    expect(named.getAttribute("data-host-draggable")).toBe("true");
    flushSync(() => { named.dispatchEvent(new Event("dragstart", { bubbles: true })); });
    flushSync(() => {
      zone.dispatchEvent(new Event("dragenter", { bubbles: true }));
      zone.dispatchEvent(new Event("dragover", { bubbles: true }));
      zone.dispatchEvent(new Event("drop", { bubbles: true }));
    });
    flushSync(() => { named.dispatchEvent(new Event("dragend", { bubbles: true })); });
    await Promise.resolve();
    expect(container.querySelector("[data-host-notice]")).toBeNull();
    expect(mockMutations["m3Commands.steerHierophantSupplicant"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateSupplicant"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[0][0]).toMatchObject({
      denizenId: "den_ann",
      fields: {
        host: {
          expected: { kind: "temple", templeId: "krolis", area: "courtyard" },
          value: { kind: "temple", templeId: "notor", area: "courtyard" },
        },
      },
    });
    root.unmount();
    container.remove();
  });

  it("records Courtyard to Agiary, ordinary Temple to Hestar, and Woe 0 host moves without Steer", async () => {
    mockMutations["m3Commands.steerHierophantSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const agiary = supplyDrop(container, "krolis", "agiary")!;
    flushSync(() => { named.dispatchEvent(new Event("dragstart", { bubbles: true })); });
    flushSync(() => { agiary.dispatchEvent(new Event("drop", { bubbles: true })); });
    flushSync(() => { named.dispatchEvent(new Event("dragend", { bubbles: true })); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[0][0].fields.host.value).toEqual({
      kind: "temple",
      templeId: "krolis",
      area: "agiary",
    });
    const hestar = supplyDrop(container, "hestar", "hestar")!;
    flushSync(() => { ready.dispatchEvent(new Event("dragstart", { bubbles: true })); });
    flushSync(() => { hestar.dispatchEvent(new Event("drop", { bubbles: true })); });
    flushSync(() => { ready.dispatchEvent(new Event("dragend", { bubbles: true })); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[1][0]).toMatchObject({
      denizenId: "den_ready",
      fields: {
        host: {
          expected: { kind: "temple", templeId: "notor", area: "courtyard" },
          value: { kind: "temple", templeId: "hestar", area: null },
        },
      },
    });
    expect(mockMutations["m3Commands.steerHierophantSupplicant"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"]).not.toHaveBeenCalled();
    const hostFields = mockMutations["m3Commands.updateSupplicant"].mock.calls.map((call) => call[0].fields);
    expect(hostFields.every((fields) => fields.woe === undefined)).toBe(true);
    root.unmount();
    container.remove();
  });

  it("keeps explicit Steer as the named helper that spends Time", async () => {
    mockMutations["m3Commands.steerHierophantSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderChoiceSurface(pieceState as typeof EMPTY_HIEROPHANT_STATE, pieceWorld, {
      steerTime: [{
        allocationId: "alc_00000000-0000-0000-0000-000000000001",
        denizenId: "den_ann",
        wizardId: "wiz_a",
        wizardName: "Wizard A",
        resolution: "pending",
      }],
    });
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    expect(named.getAttribute("data-steer-time")).toBe("pending");
    expect(named.querySelector("[data-steer-time-badge]")?.textContent).toBe("Time");
    expect(named.querySelector('[aria-label="Time scheduled on Acolyte Ann"]')).not.toBeNull();
    flushSync(() => { templeSelectButton(container, "Temple Krolis").click(); });
    flushSync(() => { (named.querySelector("button") as HTMLButtonElement).click(); });
    const corrections = container.querySelector("[data-inspector-corrections]") as HTMLDetailsElement;
    flushSync(() => { corrections.open = true; });
    const steer = Array.from(corrections.querySelectorAll("button")).find((button) => button.textContent === "Steer");
    expect(steer).toBeDefined();
    flushSync(() => { steer!.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.steerHierophantSupplicant"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.steerHierophantSupplicant"].mock.calls[0][0]).toMatchObject({
      allocationId: "alc_00000000-0000-0000-0000-000000000001",
      denizenId: "den_ann",
    });
    root.unmount();
    container.remove();
  });

  it("offers piece-attached Benefaction & Depart on a Woe 0 Temple-hosted Supplicant", async () => {
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(async () => {});
    mockMutations["m3Commands.steerHierophantSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const depart = ready.querySelector('[data-piece-benefaction] button') as HTMLButtonElement;
    expect(depart).not.toBeNull();
    expect(depart.getAttribute("aria-label")).toBe("Benefaction & Depart Mercy");
    expect(depart.textContent).toBe("Benefaction & Depart");
    flushSync(() => { depart.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"].mock.calls[0][0]).toMatchObject({
      denizenId: "den_ready",
      expectedRevision: 4,
    });
    expect(mockMutations["m3Commands.steerHierophantSupplicant"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateSupplicant"]).not.toHaveBeenCalled();
    expect(container.querySelector('[data-supplicant-piece="den_ready"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not offer piece Benefaction from Next Visions projection alone", () => {
    const { container, root } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    expect(named.textContent).not.toContain("Next Visions");
    expect(named.querySelector('[data-piece-benefaction]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("keeps piece Benefaction off the drag path and selection/Woe side effects", async () => {
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const depart = ready.querySelector('[data-piece-benefaction] button') as HTMLButtonElement;
    expect(depart.getAttribute("aria-label")).toBe("Benefaction & Depart Mercy");
    let dragStarted = false;
    ready.addEventListener("dragstart", () => {
      dragStarted = true;
    });
    flushSync(() => {
      depart.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      depart.click();
    });
    await Promise.resolve();
    expect(dragStarted).toBe(false);
    expect(mockMutations["m3Commands.updateSupplicant"]).not.toHaveBeenCalled();
    expect(ready.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed")).not.toBe("true");
    root.unmount();
    container.remove();
  });

  it("supports keyboard activation and scoped pending feedback for piece Benefaction", async () => {
    let release: (() => void) | undefined;
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const { container, root } = renderPieces();
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const depart = ready.querySelector('[data-piece-benefaction] button') as HTMLButtonElement;
    expect(depart.getAttribute("aria-label")).toBe("Benefaction & Depart Mercy");
    const namedWoe = woeDecrement(container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement);
    flushSync(() => { depart.focus(); });
    flushSync(() => {
      depart.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"]).toHaveBeenCalledTimes(1);
    expect(depart.getAttribute("aria-busy")).toBe("true");
    expect(depart.disabled).toBe(true);
    expect(depart.textContent).toBe("Benefaction & Depart…");
    expect(namedWoe.disabled).toBe(false);
    flushSync(() => { depart.click(); });
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"]).toHaveBeenCalledTimes(1);
    await act(async () => {
      release?.();
      await Promise.resolve();
    });
    flushSync(() => {});
    const departAfter = container.querySelector(
      '[data-supplicant-piece="den_ready"] [data-piece-benefaction] button',
    ) as HTMLButtonElement;
    expect(departAfter.getAttribute("aria-label")).toBe("Benefaction & Depart Mercy");
    expect(departAfter.getAttribute("aria-busy")).toBe("false");
    expect(container.querySelector('[data-supplicant-piece="den_ready"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("shows stable Class cost and Benefaction as separate labeled facts on the piece", () => {
    const { container, root } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    const unnamed = container.querySelector('[data-supplicant-piece="den_blank"]') as HTMLElement;
    expect(named.querySelector("[data-supplicant-cost]")?.textContent).toContain("Cost");
    expect(named.querySelector("[data-supplicant-cost-value]")?.textContent).toBe("1 Abundance");
    expect(named.querySelector("[data-supplicant-benefaction]")?.textContent).toContain("Benefaction");
    expect(named.querySelector("[data-supplicant-benefaction-value]")?.textContent).toBe("+1 Conviction");
    const mechanics = named.querySelector("[data-supplicant-stable]") as HTMLElement;
    expect(mechanics.querySelector("[data-supplicant-cost]")).not.toBeNull();
    expect(mechanics.querySelector("[data-supplicant-woe-row]")).not.toBeNull();
    expect(mechanics.querySelector("[data-woe-label]")?.textContent).toBe("Woe");
    expect(mechanics.querySelector("[data-supplicant-benefaction]")).not.toBeNull();
    expect(mechanics.textContent?.indexOf("Cost") ?? -1).toBeLessThan(mechanics.textContent?.indexOf("Woe") ?? -1);
    expect(mechanics.textContent?.indexOf("Woe") ?? -1).toBeLessThan(mechanics.textContent?.indexOf("Benefaction") ?? -1);
    expect(ready.querySelector("[data-supplicant-cost-value]")?.textContent).toBe("1 Abundance or Conviction");
    expect(ready.querySelector("[data-supplicant-benefaction-value]")?.textContent).toBe("+1 Abundance");
    expect(unnamed.querySelector("[data-supplicant-cost-value]")?.textContent).toBe("1 Abundance");
    expect(named.textContent).not.toContain("Next Visions");
  });

  it("shows pending Woe intent immediately without authoritative threshold drift", async () => {
    let release: (() => void) | undefined;
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const { container, root, rerender } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    flushSync(() => { woeTarget(named, 4).click(); });
    expect(named.querySelector('[data-woe-pips]')?.getAttribute("data-woe-pending")).toBe("true");
    expect(named.querySelector('[aria-label="Woe 1, pending request 4"]')).not.toBeNull();
    expect(named.querySelectorAll('[data-woe-filled="true"]')).toHaveLength(4);
    expect(named.querySelector('[data-piece-benefaction]')).toBeNull();
    expect(named.querySelector('[data-woe-threshold]')).toBeNull();
    expect(woeTarget(named, 3).disabled).toBe(false);
    expect(named.className).not.toMatch(/opacity-50|pointer-events-none/);
    await act(async () => {
      release?.();
      await Promise.resolve();
    });
    await act(async () => {
      rerender({
        ...pieceState,
        supplicants: pieceState.supplicants.map((person) =>
          person.denizenId === "den_ann" ? { ...person, woe: 4 } : person,
        ),
      } as typeof EMPTY_HIEROPHANT_STATE);
      await Promise.resolve();
    });
    const settled = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    expect(settled.querySelector('[data-woe-pips]')?.getAttribute("data-woe-pending")).toBe("false");
    expect(settled.querySelector('[aria-label="Current Woe 4"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("clears stale Woe intent when authoritative state diverges from the expected baseline", async () => {
    let release: (() => void) | undefined;
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const { container, root, rerender } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    flushSync(() => { woeTarget(named, 4).click(); });
    expect(named.querySelector('[data-woe-pips]')?.getAttribute("data-woe-pending")).toBe("true");
    await act(async () => {
      rerender({
        ...pieceState,
        supplicants: pieceState.supplicants.map((person) =>
          person.denizenId === "den_ann" ? { ...person, woe: 5 } : person,
        ),
      } as typeof EMPTY_HIEROPHANT_STATE);
      await Promise.resolve();
    });
    const diverged = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    expect(diverged.querySelector('[data-woe-pips]')?.getAttribute("data-woe-pending")).toBe("false");
    expect(diverged.querySelector('[aria-label="Current Woe 5"]')).not.toBeNull();
    expect(diverged.querySelector('[data-woe-threshold="cult"]')?.textContent).toBe("Cult departure due");
    expect(diverged.querySelector('[data-piece-benefaction]')).toBeNull();
    expect(woeTarget(diverged, 3).disabled).toBe(false);
    await act(async () => {
      release?.();
      await Promise.resolve();
    });
    root.unmount();
    container.remove();
  });

  it("lets repeated + advance pending Woe and keeps threshold cues authoritative", async () => {
    const gates: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(() => new Promise<void>((resolve, reject) => {
      gates.push({ resolve, reject });
    }));
    mockMutations["m3Commands.establishCult"] = vi.fn(async () => {});
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(async () => {});
    const { container, root, rerender } = renderPieces();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    flushSync(() => {
      woeIncrement(named).click();
      woeIncrement(named).click();
      woeIncrement(named).click();
    });
    expect(named.querySelector('[aria-label="Woe 1, pending request 4"]')).not.toBeNull();
    expect(named.querySelector('[data-woe-pips]')?.getAttribute("data-woe-pending")).toBe("true");
    expect(named.querySelector('[data-woe-threshold]')).toBeNull();
    expect(named.querySelector("[data-piece-benefaction]")).toBeNull();
    expect(woeIncrement(named).disabled).toBe(false);
    expect(mockMutations["m3Commands.updateSupplicant"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[0][0].fields).toEqual({
      woe: { expected: 1, value: 2 },
    });
    flushSync(() => { woeTarget(named, 5).click(); });
    expect(named.querySelector('[aria-label="Woe 1, pending request 5"]')).not.toBeNull();
    await settleQueuedMutation(() => gates[0]!.resolve());
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[1][0].fields).toEqual({
      woe: { expected: 2, value: 5 },
    });
    await settleQueuedMutation(() => gates[1]!.resolve());
    rerender({
      ...pieceState,
      supplicants: pieceState.supplicants.map((person) =>
        person.denizenId === "den_ann" ? { ...person, woe: 5 } : person,
      ),
    } as typeof EMPTY_HIEROPHANT_STATE);
    const settled = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    expect(settled.querySelector('[data-woe-pips]')?.getAttribute("data-woe-pending")).toBe("false");
    expect(settled.querySelector('[data-woe-threshold="cult"]')?.textContent).toBe("Cult departure due");
    expect(mockMutations["m3Commands.establishCult"]).not.toHaveBeenCalled();
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    flushSync(() => { woeTarget(ready, 1).click(); });
    expect(ready.querySelector("[data-piece-benefaction]")).not.toBeNull();
    expect(ready.querySelector('[data-woe-threshold="benefaction"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("restores authoritative Woe after a rejected write and hides step controls at rest", async () => {
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {
      throw new Error("stale woe");
    });
    const { container, root } = renderPieces();
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    expect(ready.querySelector('[data-woe-steps]')?.className).toMatch(/invisible/);
    flushSync(() => { woeIncrement(ready).click(); });
    await act(async () => {
      await Promise.resolve();
    });
    expect(ready.querySelector('[aria-label="Current Woe 0"]')).not.toBeNull();
    expect(container.textContent).toMatch(/stale woe/i);
    root.unmount();
    container.remove();
  });

  it("adjusts Woe with +/- controls without threshold side effects", async () => {
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.removeSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.establishCult"] = vi.fn(async () => {});
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(async () => {});
    const { container, root, rerender } = renderPieces();
    const ready = container.querySelector('[data-supplicant-piece="den_ready"]') as HTMLElement;
    flushSync(() => { ready.querySelector("[data-woe-pips]")?.dispatchEvent(new Event("mouseenter", { bubbles: true })); });
    expect(woeDecrement(ready).disabled).toBe(true);
    const unnamed = container.querySelector('[data-supplicant-piece="den_blank"]') as HTMLElement;
    flushSync(() => { woeIncrement(unnamed).click(); });
    await Promise.resolve();
    rerender({
      ...pieceState,
      supplicants: pieceState.supplicants.map((person) =>
        person.denizenId === "den_blank" ? { ...person, woe: 6 } : person,
      ),
    } as typeof EMPTY_HIEROPHANT_STATE);
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls[0][0].fields).toEqual({
      woe: { expected: 5, value: 6 },
    });
    expect(mockMutations["m3Commands.establishCult"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"]).not.toHaveBeenCalled();
    const named = container.querySelector('[data-supplicant-piece="den_ann"]') as HTMLElement;
    let dragStarted = false;
    named.addEventListener("dragstart", () => {
      dragStarted = true;
    });
    flushSync(() => {
      woeIncrement(named).dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      woeIncrement(named).click();
    });
    await Promise.resolve();
    expect(dragStarted).toBe(false);
    flushSync(() => { woeIncrement(named).focus(); });
    flushSync(() => {
      woeIncrement(named).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(mockMutations["m3Commands.updateSupplicant"].mock.calls.length).toBeGreaterThan(1);
    root.unmount();
    container.remove();
  });

  it("reuses the same Benefaction operation from inspector fallback controls", async () => {
    mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    flushSync(() => { templeSelectButton(container, "Temple Notor").click(); });
    flushSync(() => {
      (container.querySelector('[data-supplicant-piece="den_ready"] button') as HTMLButtonElement).click();
    });
    const corrections = container.querySelector("[data-inspector-corrections]") as HTMLDetailsElement;
    expect(corrections).not.toBeNull();
    flushSync(() => { corrections.open = true; });
    const depart = Array.from(corrections.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Benefaction & Depart"),
    );
    expect(depart).toBeDefined();
    flushSync(() => { depart!.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.departHierophantSupplicantWithBenefaction"].mock.calls[0][0]).toMatchObject({
      denizenId: "den_ready",
    });
    root.unmount();
    container.remove();
  });

  it("reveals keyboard-accessible resource +/-1 controls without collapsing the Temple", async () => {
    mockMutations["m3Commands.adjustTempleResources"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateTemple"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const decrease = container.querySelector('[aria-label="Decrease Temple Krolis Abundance"]') as HTMLButtonElement;
    const increase = container.querySelector('[aria-label="Increase Temple Krolis Abundance"]') as HTMLButtonElement;
    expect(decrease).not.toBeNull();
    expect(increase).not.toBeNull();
    flushSync(() => { increase.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.adjustTempleResources"]).toHaveBeenCalledTimes(1);
    const args = mockMutations["m3Commands.adjustTempleResources"].mock.calls[0][0];
    expect(args.templeId).toBe("krolis");
    expect(args.fields).toEqual({ abundance: { expected: 5, value: 6 } });
    expect(mockMutations["m3Commands.updateTemple"]).not.toHaveBeenCalled();
    const counter = container.querySelector('[data-temple-resource="krolis"][data-resource-counter="abundance"]') as HTMLElement;
    expect(counter.getAttribute("data-resource-controls")).toBe("hidden");
    flushSync(() => { increase.focus(); });
    expect(counter.getAttribute("data-resource-controls")).toBe("revealed");
    flushSync(() => { increase.blur(); });
    expect(counter.getAttribute("data-resource-controls")).toBe("hidden");
    root.unmount();
    container.remove();
  });

  it("shows resource +/- immediately and serializes rapid intents", async () => {
    const gates: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    mockMutations["m3Commands.adjustTempleResources"] = vi.fn(() => new Promise<void>((resolve, reject) => {
      gates.push({ resolve, reject });
    }));
    mockMutations["m3Commands.updateTemple"] = vi.fn(async () => {});
    const { container, root, rerender } = renderPieces();
    const counter = container.querySelector('[data-temple-resource="krolis"][data-resource-counter="abundance"]') as HTMLElement;
    const increase = container.querySelector('[aria-label="Increase Temple Krolis Abundance"]') as HTMLButtonElement;
    const decrease = container.querySelector('[aria-label="Decrease Temple Krolis Abundance"]') as HTMLButtonElement;
    expect(counter.getAttribute("data-resource-pending")).toBe("false");
    flushSync(() => { increase.click(); increase.click(); decrease.click(); });
    expect(counter.querySelector("[data-resource-value]")?.textContent).toBe("6");
    expect(counter.getAttribute("data-resource-pending")).toBe("true");
    expect(counter.getAttribute("aria-busy")).toBe("true");
    expect(mockMutations["m3Commands.adjustTempleResources"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.adjustTempleResources"].mock.calls[0][0].fields).toEqual({
      abundance: { expected: 5, value: 6 },
    });
    await settleQueuedMutation(() => gates[0]!.resolve());
    expect(mockMutations["m3Commands.adjustTempleResources"]).toHaveBeenCalledTimes(2);
    expect(mockMutations["m3Commands.adjustTempleResources"].mock.calls[1][0].fields).toEqual({
      abundance: { expected: 6, value: 7 },
    });
    await settleQueuedMutation(() => gates[1]!.resolve());
    expect(mockMutations["m3Commands.adjustTempleResources"]).toHaveBeenCalledTimes(3);
    expect(mockMutations["m3Commands.adjustTempleResources"].mock.calls[2][0].fields).toEqual({
      abundance: { expected: 7, value: 6 },
    });
    await settleQueuedMutation(() => gates[2]!.resolve());
    expect(
      container.querySelector('[data-temple-resource="krolis"][data-resource-counter="abundance"]')?.getAttribute("data-resource-pending"),
    ).toBe("false");
    expect(mockMutations["m3Commands.updateTemple"]).not.toHaveBeenCalled();
    const staleGates: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    mockMutations["m3Commands.adjustTempleResources"].mockImplementation(() => new Promise<void>((resolve, reject) => {
      staleGates.push({ resolve, reject });
    }));
    flushSync(() => { increase.click(); increase.click(); });
    expect(counter.querySelector("[data-resource-value]")?.textContent).toBe("8");
    await settleQueuedMutation(() => staleGates[0]!.reject(new Error("stale abundance")));
    expect(counter.querySelector("[data-resource-value]")?.textContent).toBe("5");
    expect(counter.getAttribute("data-resource-pending")).toBe("false");
    expect(counter.querySelector("[data-resource-error]")?.textContent).toMatch(/stale/i);
    expect(mockMutations["m3Commands.adjustTempleResources"]).toHaveBeenCalledTimes(4);
    flushSync(() => { increase.click(); increase.click(); });
    expect(counter.querySelector("[data-resource-value]")?.textContent).toBe("7");
    rerender({
      ...pieceState,
      temples: pieceState.temples.map((temple) =>
        temple.templeId === "krolis" ? { ...temple, abundance: 9 } : temple,
      ),
    } as typeof EMPTY_HIEROPHANT_STATE);
    const afterExternal = container.querySelector('[data-temple-resource="krolis"][data-resource-counter="abundance"]') as HTMLElement;
    expect(afterExternal.querySelector("[data-resource-value]")?.textContent).toBe("9");
    expect(afterExternal.getAttribute("data-resource-pending")).toBe("false");
    expect(afterExternal.querySelector("[data-resource-error]")?.textContent).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not mutate on resource hover and still receives unnamed supply pieces", async () => {
    mockMutations["m3Commands.createHierophantSupplicant"] = vi.fn(async () => {});
    mockMutations["m3Commands.adjustTempleResources"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const counter = container.querySelector('[data-resource-counter="abundance"]') as HTMLElement;
    flushSync(() => { counter.dispatchEvent(new Event("mouseenter", { bubbles: true })); });
    expect(mockMutations["m3Commands.adjustTempleResources"]).not.toHaveBeenCalled();
    dragSupplyTo(supplyPiece(container, "pariah")!, supplyDrop(container, "krolis", "courtyard")!);
    const form = receiveForm(container)!;
    expect((form.querySelector("select") as HTMLSelectElement).value).toBe("pariah");
    flushSync(() => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.createHierophantSupplicant"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.createHierophantSupplicant"].mock.calls[0][0].name).toBe("Pariah");
    root.unmount();
    container.remove();
  });
});

describe("Resolve Visions action", () => {
  const readyWorld: WorldReference = {
    denizens: [
      { denizenId: "den_ann", name: "Acolyte Ann", representation: "individual", description: null },
      { denizenId: "den_art", name: "Cora", representation: "individual", description: null },
    ],
    isles: [],
    places: [
      { placeId: "plc_krolis", name: "Krolis Grounds", description: null, placement: { kind: "unspecified" } },
    ],
  };

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

  function readyState(overrides: Record<string, unknown> = {}) {
    return {
      ...EMPTY_HIEROPHANT_STATE,
      temples: fiveTemples,
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 1,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
      ...overrides,
    } as typeof EMPTY_HIEROPHANT_STATE;
  }

  function renderReady(hierophant = readyState() as typeof EMPTY_HIEROPHANT_STATE) {
    return renderChoiceSurface(hierophant, readyWorld);
  }

  it("exposes one board-level Resolve Visions action when the preview is ready", () => {
    const { container, root } = renderReady();
    const actions = Array.from(container.querySelectorAll('[aria-label="Resolve Visions"]'));
    expect(actions).toHaveLength(1);
    const button = buttonWithText(container, "Resolve Visions");
    expect(button).toBeDefined();
    expect(button?.disabled).toBe(false);
    const advanced = Array.from(container.querySelectorAll("details")).find((el) =>
      el.textContent?.includes("Advanced / Correct Board"),
    );
    expect(advanced?.contains(actions[0]!)).toBe(false);
    expect(container.querySelectorAll('[data-temple-id] [aria-label="Resolve Visions"]')).toHaveLength(0);
    expect(container.querySelector('[aria-label="Benefaction & Depart"]')).toBeNull();
    expect(container.querySelector('[aria-label="Depart for Cult"]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not permit Resolve while a genuine choice is still required", () => {
    const { container, root } = renderReady(readyState({
      temples: fiveTemples.map((temple) => (
        temple.templeId === "krolis" ? { ...temple, abundance: 3, conviction: 3 } : temple
      )),
      supplicants: [
        {
          denizenId: "den_art" as never,
          classId: "artisan" as const,
          woe: 2,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    }) as typeof EMPTY_HIEROPHANT_STATE);
    expect(container.textContent).toContain("Pay with:");
    expect(buttonWithText(container, "Resolve Visions")).toBeUndefined();
    root.unmount();
    container.remove();
  });

  it("does not permit Resolve when the month is manually blocked", () => {
    const { container, root } = renderReady(readyState({
      temples: fiveTemples.map((temple) => {
        if (temple.templeId === "krolis") return { ...temple, abundance: 0, conviction: 4 };
        if (temple.templeId === "hestar") return { ...temple, abundance: 0, conviction: 5 };
        return temple;
      }),
    }) as typeof EMPTY_HIEROPHANT_STATE);
    expect(buttonWithText(container, "Resolve Visions")).toBeUndefined();
    expect(container.textContent).toContain("Visions cannot be resolved automatically. Use the board cues.");
    expect(container.querySelector('[aria-label="Benefaction & Depart"]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("sends semantic choices and the previewed revision once, not resulting state", async () => {
    mockMutations["m3Commands.resolveHierophantVisions"] = vi.fn(async () => ({ kind: "accepted", revision: 5 }));
    const { container, root } = renderReady();
    flushSync(() => { buttonWithText(container, "Resolve Visions")!.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.resolveHierophantVisions"]).toHaveBeenCalledTimes(1);
    const args = mockMutations["m3Commands.resolveHierophantVisions"].mock.calls[0][0];
    expect(args).toEqual({
      commandId: expect.stringMatching(/^cmd_/),
      expectedCampaignId: CAMPAIGN_ID,
      expectedRevision: 4,
      choices: {},
    });
    expect(args).not.toHaveProperty("resultingState");
    expect(args).not.toHaveProperty("hierophant");
    expect(args).not.toHaveProperty("woeChanges");
    expect(args).not.toHaveProperty("resourceDeltas");
    root.unmount();
    container.remove();
  });

  it("does not submit twice while the mutation is in flight", async () => {
    let release: (() => void) | undefined;
    mockMutations["m3Commands.resolveHierophantVisions"] = vi.fn(() => new Promise((resolve) => {
      release = () => resolve({ kind: "accepted", revision: 5 });
    }));
    const { container, root } = renderReady();
    const button = buttonWithText(container, "Resolve Visions")!;
    flushSync(() => { button.click(); button.click(); });
    expect(mockMutations["m3Commands.resolveHierophantVisions"]).toHaveBeenCalledTimes(1);
    await settleQueuedMutation(() => release?.());
    expect(mockMutations["m3Commands.resolveHierophantVisions"]).toHaveBeenCalledTimes(1);
    root.unmount();
    container.remove();
  });

  it("waits for authoritative state after success instead of client-patching Woe", async () => {
    mockMutations["m3Commands.resolveHierophantVisions"] = vi.fn(async () => ({ kind: "accepted", revision: 5 }));
    const { container, root, rerender } = renderReady();
    flushSync(() => { buttonWithText(container, "Resolve Visions")!.click(); });
    await settleQueuedMutation();
    expect(container.querySelector('[data-supplicant-piece="den_ann"] [aria-label="Current Woe 1"]')).not.toBeNull();
    expect(container.querySelector('[data-woe-threshold="benefaction"]')).toBeNull();
    rerender(readyState({
      temples: fiveTemples.map((temple) => (
        temple.templeId === "krolis" ? { ...temple, abundance: 4 } : temple
      )),
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "peasant" as const,
          woe: 0,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    }) as typeof EMPTY_HIEROPHANT_STATE);
    expect(container.querySelector('[data-supplicant-piece="den_ann"] [aria-label="Current Woe 0"]')).not.toBeNull();
    expect(container.querySelector('[data-woe-threshold="benefaction"]')?.textContent).toBe("Ready for Benefaction");
    const annBenefaction = container.querySelector(
      '[data-supplicant-piece="den_ann"] [data-piece-benefaction] button',
    ) as HTMLButtonElement;
    expect(annBenefaction.getAttribute("aria-label")).toBe("Benefaction & Depart Acolyte Ann");
    expect(annBenefaction.textContent).toBe("Benefaction & Depart");
    root.unmount();
    container.remove();
  });

  it("surfaces a stale-precondition failure without silently replaying", async () => {
    mockMutations["m3Commands.resolveHierophantVisions"] = vi.fn(() => {
      throw new Error("Visions preview is out of date. Review the current board and try again.");
    });
    const { container, root } = renderReady();
    await act(async () => {
      buttonWithText(container, "Resolve Visions")!.click();
    });
    expect(mockMutations["m3Commands.resolveHierophantVisions"]).toHaveBeenCalledTimes(1);
    expect(container.textContent).toMatch(/out of date/i);
    expect(container.querySelector('[data-supplicant-piece="den_ann"] [aria-label="Current Woe 1"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not treat a structured server blocker as success", async () => {
    mockMutations["m3Commands.resolveHierophantVisions"] = vi.fn(() => ({
      kind: "manual_resolution_required",
      requiredChoices: [],
      blockers: [{ kind: "resource_shortage_collapse", templeId: "krolis" }],
    }));
    const { container, root } = renderReady();
    await act(async () => {
      buttonWithText(container, "Resolve Visions")!.click();
    });
    expect(mockMutations["m3Commands.resolveHierophantVisions"]).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Visions cannot be resolved automatically. Use the board cues.");
    expect(container.textContent).not.toContain("Resolved Hierophant Visions");
    expect(container.querySelector('[data-supplicant-piece="den_ann"] [aria-label="Current Woe 1"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("keeps Cult departure due after an authoritative Woe 5 update", () => {
    const { container, root } = renderReady(readyState({
      supplicants: [
        {
          denizenId: "den_ann" as never,
          classId: "gentry" as const,
          woe: 5,
          host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
        },
      ],
    }) as typeof EMPTY_HIEROPHANT_STATE);
    expect(container.querySelector('[data-supplicant-piece="den_ann"] [aria-label="Current Woe 5"]')).not.toBeNull();
    expect(container.querySelector('[data-woe-threshold="cult"]')?.textContent).toBe("Cult departure due");
    expect(container.querySelector('[aria-label="Depart for Cult"]')).toBeNull();
    expect(container.querySelector('[aria-label="Benefaction & Depart"]')).toBeNull();
    root.unmount();
    container.remove();
  });
});

describe("Hierophant primary board Body A controls", () => {
  function prophetWorld(): WorldReference {
    return {
      ...pieceWorld,
      denizens: pieceWorld.denizens.map((denizen) =>
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
  }

  it("removes Hestar transfer chrome and keeps compact queued resource counters", async () => {
    mockMutations["m3Commands.adjustTempleResources"] = vi.fn(async () => {});
    mockMutations["m3Commands.transferHierophantHestarResource"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    expect(buttonWithText(container, "To Hestar")).toBeUndefined();
    expect(buttonWithText(container, "From Hestar")).toBeUndefined();
    expect(buttonWithText(container, "Send to...")).toBeUndefined();
    expect(buttonWithText(container, "Take from...")).toBeUndefined();
    expect(container.querySelector("[data-hestar-share]")).toBeNull();
    expect(container.querySelector("[data-hestar-share-chooser]")).toBeNull();
    expect(container.textContent).not.toContain("Cannot share with Hestar while Blasphemous");
    const counter = container.querySelector('[data-temple-resource="krolis"][data-resource-counter="abundance"]') as HTMLElement;
    expect(counter.className).toContain("min-w-[3.75rem]");
    expect(counter.className).not.toMatch(/min-h-\[1\.1rem\]/);
    const increase = container.querySelector('[aria-label="Increase Temple Krolis Abundance"]') as HTMLButtonElement;
    flushSync(() => { increase.click(); increase.click(); });
    expect(counter.querySelector("[data-resource-value]")?.textContent).toBe("7");
    expect(mockMutations["m3Commands.transferHierophantHestarResource"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.adjustTempleResources"]).toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("records Doctrine and paired Blasphemy through updateTemple only", async () => {
    mockMutations["m3Commands.updateTemple"] = vi.fn(async () => {});
    mockMutations["m3Commands.setPowerfulDenizenStatus"] = vi.fn(async () => {});
    mockMutations["m3Commands.establishCult"] = vi.fn(async () => {});
    mockMutations["m3Commands.adjustTempleResources"] = vi.fn(async () => {});
    const { container, root } = renderChoiceSurface(pieceState as typeof EMPTY_HIEROPHANT_STATE, prophetWorld());
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.querySelector("[data-doctrine-current]")?.textContent).toContain("worth");
    expect(krolis.querySelector('[aria-label="Supports Artisan, Peasant"]')).not.toBeNull();
    expect(krolis.querySelector("[data-doctrine-pair]")?.textContent).toMatch(/Paired Blasphemy/);
    flushSync(() => { (krolis.querySelector("[data-doctrine-pair-action]") as HTMLButtonElement).click(); });
    await settleQueuedMutation();
    expect(mockMutations["m3Commands.updateTemple"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.updateTemple"].mock.calls[0][0].fields.doctrine.value).toEqual({
      kind: "blasphemy",
      blasphemyId: "old_land_demands_blood",
    });
    expect(mockMutations["m3Commands.updateTemple"].mock.calls[0][0].fields.status).toBeUndefined();
    expect(mockMutations["m3Commands.setPowerfulDenizenStatus"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.establishCult"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.adjustTempleResources"]).not.toHaveBeenCalled();
    const choice = krolis.querySelector('[data-doctrine-choice="charity_measure_of_moral_worth"]') as HTMLButtonElement;
    expect(choice).not.toBeNull();
    expect(choice.disabled).toBe(false);
    flushSync(() => { choice.click(); });
    await settleQueuedMutation();
    expect(mockMutations["m3Commands.updateTemple"].mock.calls[1][0]).toMatchObject({
      templeId: "krolis",
      fields: {
        doctrine: {
          expected: { kind: "doctrine", doctrineId: "worth_proved_through_labor" },
          value: { kind: "doctrine", doctrineId: "charity_measure_of_moral_worth" },
        },
      },
    });
    root.unmount();
    container.remove();
  });

  it("does not guess a pair for custom unpaired Doctrine", () => {
    const custom = {
      ...pieceState,
      temples: pieceState.temples.map((temple) =>
        temple.templeId === "krolis"
          ? { ...temple, doctrine: { kind: "doctrine" as const, doctrineId: "hdc_custom" as never } }
          : temple,
      ),
      campaignDoctrines: [{
        doctrineId: "hdc_custom" as never,
        orthodoxText: "A custom table Doctrine",
        blasphemy: null,
        supportedClassIds: ["peasant"],
      }],
    };
    const { container, root } = renderChoiceSurface(custom as typeof EMPTY_HIEROPHANT_STATE, pieceWorld);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.querySelector("[data-doctrine-current]")?.textContent).toContain("A custom table Doctrine");
    expect(krolis.querySelector("[data-doctrine-pair]")).toBeNull();
    expect(krolis.querySelector("[data-doctrine-pair-action]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("records Active and Collapsed as Temple status only", async () => {
    mockMutations["m3Commands.updateTemple"] = vi.fn(async () => {});
    mockMutations["m3Commands.establishCult"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateSupplicant"] = vi.fn(async () => {});
    const { container, root } = renderPieces();
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    const status = krolis.querySelector("[data-temple-status]") as HTMLButtonElement;
    expect(status.getAttribute("data-temple-status")).toBe("active");
    expect(status.textContent).toBe("Active");
    expect(krolis.querySelector("[data-doctrine-current]")?.textContent).not.toMatch(/^Blasphemous/);
    flushSync(() => { status.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.updateTemple"].mock.calls[0][0]).toMatchObject({
      templeId: "krolis",
      fields: { status: { expected: "active", value: "collapsed" } },
    });
    expect(mockMutations["m3Commands.updateTemple"].mock.calls[0][0].fields.doctrine).toBeUndefined();
    expect(mockMutations["m3Commands.establishCult"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateSupplicant"]).not.toHaveBeenCalled();
    const ushin = {
      ...pieceState,
      temples: pieceState.temples.map((temple) =>
        temple.templeId === "ushin"
          ? { ...temple, doctrine: { kind: "blasphemy" as const, blasphemyId: "law_of_the_wolf" as const } }
          : temple,
      ),
    };
    const second = renderChoiceSurface(ushin as typeof EMPTY_HIEROPHANT_STATE, pieceWorld);
    const ushinBoard = second.container.querySelector('[data-temple-id="ushin"]') as HTMLElement;
    expect(ushinBoard.querySelector("[data-temple-status]")?.getAttribute("data-temple-status")).toBe("active");
    expect(ushinBoard.querySelector("[data-doctrine-current]")?.textContent).toMatch(/Blasphemous/);
    second.root.unmount();
    second.container.remove();
    root.unmount();
    container.remove();
  });

  it("records Reliable and Disruptive from the Prophet piece", async () => {
    mockMutations["m3Commands.setPowerfulDenizenStatus"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateTemple"] = vi.fn(async () => {});
    mockMutations["m3Commands.establishCult"] = vi.fn(async () => {});
    mockMutations["m3Commands.updateProphet"] = vi.fn(async () => {});
    const { container, root } = renderChoiceSurface(pieceState as typeof EMPTY_HIEROPHANT_STATE, prophetWorld());
    const prophet = container.querySelector('[data-prophet-piece="den_prophet"]') as HTMLElement;
    const chip = prophet.querySelector("[data-prophet-status]") as HTMLButtonElement;
    expect(chip.getAttribute("data-prophet-status")).toBe("reliable");
    flushSync(() => { chip.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.setPowerfulDenizenStatus"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setPowerfulDenizenStatus"].mock.calls[0][0]).toMatchObject({
      denizenId: "den_prophet",
      change: {
        expected: { kind: "standard", value: "reliable" },
        value: { kind: "standard", value: "disruptive" },
      },
    });
    expect(mockMutations["m3Commands.updateTemple"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.establishCult"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateProphet"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("keeps the persisted Holiday marker distinct and editable without calendar mutation", async () => {
    mockMutations["m3Commands.setTempleHoliday"] = vi.fn(async () => {});
    const marked = {
      ...pieceState,
      holidayTempleIds: ["krolis"],
    };
    const { container, root } = renderChoiceSurface(marked as typeof EMPTY_HIEROPHANT_STATE, pieceWorld);
    const krolis = container.querySelector('[data-temple-id="krolis"]') as HTMLElement;
    expect(krolis.querySelector('[aria-label="Holiday marked"]')).not.toBeNull();
    expect(krolis.querySelector('[data-holiday-marker="persisted"]')?.textContent).toBe("Holiday");
    expect(krolis.textContent).not.toMatch(/calendar says/i);
    const toggle = krolis.querySelector("[data-holiday-toggle]") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-label")).toBe("Clear Holiday marker");
    flushSync(() => { toggle.click(); });
    await Promise.resolve();
    expect(mockMutations["m3Commands.setTempleHoliday"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setTempleHoliday"].mock.calls[0][0]).toMatchObject({
      templeId: "krolis",
      marked: false,
    });
    root.unmount();
    container.remove();
  });
});

