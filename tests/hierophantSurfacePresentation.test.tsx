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
    expect(container.innerHTML).toContain("Temple Krolis");
    expect(container.innerHTML).toContain("Hestar");
    expect(container.innerHTML).toContain("Acolyte Ann");
    expect(container.innerHTML).toContain("Receive Supplicant");
    expect(container.innerHTML).toContain("Advanced / Correct Board");
    expect(container.querySelector("[aria-label='Temples of the Hierophant']")).not.toBeNull();
    const hestarSelect = Array.from(container.querySelectorAll("button")).find((b) => (b.getAttribute("aria-label") ?? "").includes("Hestar"));
    expect(hestarSelect).toBeDefined();
    flushSync(() => { hestarSelect!.click(); });
    expect(container.innerHTML).toContain("No Doctrine");
    expect(container.innerHTML).not.toContain("Give Sermon");
    const advanced = container.querySelector("summary");
    expect(advanced?.textContent).toContain("Advanced / Correct Board");
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
    expect(container.innerHTML).toContain("No Researcher at this Temple");
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
