// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  EMPTY_MARINER_STATE,
  MARINER_BOARD_ISLE_IDS,
  buildInitializedDefaultMarinerState,
  marinerRouteId,
  type DenizenId,
  type IsleId,
  type MarinerBeastState,
  type MarinerBoardIsleId,
  type MarinerState,
  type PlaceId,
  type PowerfulDenizenMethodEntryId,
} from "../shared/domain";
import type { SorcererExternalPresence } from "../shared/domain";
import MarinerSurface from "../src/MarinerSurface";
import type { WorldReference } from "../src/WorldSurface";
import { MARINER_MAP_MIN_WIDTH_PX } from "../src/mariner-map-geometry";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const SHIP = "plc_00000000-0000-0000-0000-0000000000aa";
const OTHER_SHIP = "plc_00000000-0000-0000-0000-0000000000bb";
const THIRD_SHIP = "plc_00000000-0000-0000-0000-0000000000dd";
const FIXED = "plc_00000000-0000-0000-0000-0000000000cc";
const DEN_A = "den_00000000-0000-0000-0000-000000000001";
const DEN_B = "den_00000000-0000-0000-0000-000000000002";

function isleId(n: number): IsleId {
  return `isl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as IsleId;
}

function worldIsleIds(): Record<MarinerBoardIsleId, IsleId> {
  const bindings = {} as Record<MarinerBoardIsleId, IsleId>;
  MARINER_BOARD_ISLE_IDS.forEach((id, index) => {
    bindings[id] = isleId(index + 1);
  });
  return bindings;
}

const BEAST_PROFILE = {
  taxonomies: [{ kind: "builtin" as const, taxonomyId: "beast" as const }],
  status: { kind: "standard" as const, value: "malignant" as const },
  goal: null,
  methods: [{
    methodEntryId: "pdmth_00000000-0000-0000-0000-0000000000b1" as PowerfulDenizenMethodEntryId,
    definition: { kind: "standard" as const, method: "rampaging" as const },
    origin: "source" as const,
  }],
  truths: [],
};

const WORLD: WorldReference = {
  denizens: [
    { denizenId: DEN_A, name: "Kraken-kin", representation: "individual", description: null, powerfulProfile: BEAST_PROFILE },
    { denizenId: DEN_B, name: "Spare Leviathan", representation: "individual", description: null, powerfulProfile: BEAST_PROFILE },
    { denizenId: "den_00000000-0000-0000-0000-00000000000c", name: "The Choir", representation: "collective", description: null },
  ],
  isles: MARINER_BOARD_ISLE_IDS.map((id, index) => ({
    isleId: isleId(index + 1),
    name: id === "sage_atoll" ? "Moonlit Atoll" : `World ${id.split("_").join(" ")}`,
    description: null,
  })),
  places: [
    { placeId: SHIP, name: "The Wave", description: null, placement: { kind: "mobile", associatedIsleId: null } },
    { placeId: OTHER_SHIP, name: "Second Hull", description: null, placement: { kind: "mobile", associatedIsleId: null } },
    { placeId: THIRD_SHIP, name: "Third Hull", description: null, placement: { kind: "mobile", associatedIsleId: null } },
    { placeId: FIXED, name: "Stone Hall", description: null, placement: { kind: "on_isle", isleId: isleId(1) } },
  ],
};

const RAID_ROUTE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);
const SHIP_ROUTE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);

function initializedMariner() {
  return buildInitializedDefaultMarinerState({
    shipPlaceId: SHIP as PlaceId,
    worldIsleIds: worldIsleIds(),
    selectedLawOfSeaIds: ["first", "second"],
    boardIsleOverrides: {
      scuttleport: { market: { present: true, rarity: "amber glass" } },
      ishana: { market: { present: true, rarity: null } },
      druntyr: { ravageStormCount: 3 },
    },
    routeOccupancy: {
      [RAID_ROUTE]: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      [SHIP_ROUTE]: { kind: "ship" },
    },
    seaStormCounts: { sidereal_sea: 2, bay_of_ishana: 1 },
    beasts: [{
      denizenId: DEN_A as DenizenId,
      element: "water",
      definitionId: "kraken",
      condition: "distrusting",
      location: { kind: "sea_region", regionId: "sunken_fleet" },
    }],
  });
}

const WIZARD = {
  wizardId: "wiz_00000000-0000-0000-0000-00000000000a",
  name: "Neris",
  homeIsleId: isleId(1) as string,
  sanctumPlaceId: OTHER_SHIP,
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
      initializeMariner: "m3Commands.initializeMariner",
      setMarinerShip: "m3Commands.setMarinerShip",
      setSelectedSeaLaws: "m3Commands.setSelectedSeaLaws",
      setMarinerRouteOccupancy: "m3Commands.setMarinerRouteOccupancy",
      setMarinerSeaStormCount: "m3Commands.setMarinerSeaStormCount",
      setMarinerIsleMarket: "m3Commands.setMarinerIsleMarket",
      setMarinerIsleRavage: "m3Commands.setMarinerIsleRavage",
      addMarinerBeast: "m3Commands.addMarinerBeast",
      updateMarinerBeast: "m3Commands.updateMarinerBeast",
      removeMarinerBeast: "m3Commands.removeMarinerBeast",
    },
  },
}));

function renderSurface(
  mariner = EMPTY_MARINER_STATE,
  wizard: typeof WIZARD | null = null,
  sorcererPresence: readonly SorcererExternalPresence[] = [],
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(MarinerSurface, {
      mariner,
      world: WORLD,
      campaignId: CAMPAIGN_ID,
      marinerWizard: wizard,
      sorcererPresence,
    }));
  });
  return { container, root };
}

function button(container: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === text);
  if (found === undefined) throw new Error(`Missing button: ${text}`);
  return found as HTMLButtonElement;
}

function select(container: HTMLElement, label: string): HTMLSelectElement {
  const found = container.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement | null;
  if (found === null) throw new Error(`Missing select: ${label}`);
  return found;
}

function setSelect(el: HTMLSelectElement, value: string): void {
  flushSync(() => {
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function rerenderSurface(
  root: ReturnType<typeof createRoot>,
  mariner: MarinerState,
  wizard: typeof WIZARD | null = WIZARD,
): void {
  flushSync(() => {
    root.render(createElement(MarinerSurface, {
      mariner,
      world: WORLD,
      campaignId: CAMPAIGN_ID,
      marinerWizard: wizard,
    }));
  });
}

function lawCheckbox(container: HTMLElement, title: string): HTMLInputElement {
  const found = Array.from(container.querySelectorAll("label")).find((label) =>
    (label.textContent ?? "").includes(title),
  );
  const input = found?.querySelector("input[type=\"checkbox\"]") as HTMLInputElement | null;
  if (input === null) throw new Error(`Missing law checkbox: ${title}`);
  return input;
}

function withStormCount(mariner: MarinerState, stormCount: number): MarinerState {
  return {
    ...mariner,
    seaRegions: mariner.seaRegions.map((region) =>
      region.regionId === "sidereal_sea" ? { ...region, stormCount } : region,
    ),
  };
}

function withBeast(mariner: MarinerState, beast: MarinerBeastState): MarinerState {
  return {
    ...mariner,
    beasts: mariner.beasts.map((existing) => existing.denizenId === beast.denizenId ? beast : existing),
  };
}

function baselineBeast(mariner: MarinerState): MarinerBeastState {
  return mariner.beasts[0];
}

beforeEach(() => {
  for (const key of Object.keys(mockMutations)) delete mockMutations[key];
});

describe("Mariner surface setup", () => {
  it("shows Initialize Mariner, arrangement, 15 bindings, and only mobile ship Places", () => {
    const { container, root } = renderSurface();
    expect(container.innerHTML).toContain("Initialize Mariner");
    expect(select(container, "Arrangement")).toBeDefined();
    expect(container.querySelectorAll('select[aria-label^="Bind "]')).toHaveLength(15);
    const ship = select(container, "Ship Place");
    const optionTexts = Array.from(ship.options).map((o) => o.textContent);
    expect(optionTexts).toContain("The Wave");
    expect(optionTexts).toContain("Second Hull");
    expect(optionTexts).not.toContain("Stone Hall");
    expect(button(container, "Initialize Mariner").disabled).toBe(true);
    expect(container.innerHTML).not.toContain("Starting Beast");
    expect(container.innerHTML).not.toContain("Scuttleport Rarity");
    root.unmount();
    container.remove();
  });

  it("exposes starting Beast for Dynamic and Rarity for Explosive", () => {
    const { container, root } = renderSurface();
    setSelect(select(container, "Arrangement"), "dynamic");
    expect(container.innerHTML).toContain("Starting Beast");
    expect(container.innerHTML).toContain("The Sunken Fleet");
    expect(container.innerHTML).not.toContain("Scuttleport Rarity");
    setSelect(select(container, "Arrangement"), "explosive");
    expect(container.innerHTML).toContain("Starting Beast");
    expect(container.innerHTML).toContain("Scuttleport Rarity");
    root.unmount();
    container.remove();
  });
});

describe("Mariner initialized map", () => {
  it("renders map state, World names, Typhoon, Ship/Raider, and distinct ship/Sanctum", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const map = container.querySelector('[aria-label="Interactive Archipelago of Isha map"]');
    expect(map).not.toBeNull();
    expect(map?.getAttribute("role")).toBe("group");
    expect(container.querySelector('[role="img"][aria-label*="Archipelago of Isha"]')).toBeNull();
    expect(map?.querySelector('[role="button"][data-map-layer="isle"]')).not.toBeNull();
    expect(map?.querySelector('[role="button"][data-map-layer="sea-hit"]')).not.toBeNull();
    expect(map?.querySelector('[role="button"][data-map-layer="route-hit"]')).not.toBeNull();
    expect(container.innerHTML).toContain("Moonlit Atoll");
    expect(container.innerHTML).toContain("World ishana");
    expect(container.innerHTML).toContain("Typhoon");
    expect(container.innerHTML).toContain("Ship");
    expect(container.innerHTML).toContain("Raider");
    expect(container.querySelector('[aria-label*="Raider toward"]')).not.toBeNull();
    expect(container.innerHTML).toContain("The Wave");
    expect(container.innerHTML).toContain("Neris");
    expect(container.innerHTML).toContain("Second Hull");
    expect(container.innerHTML).toContain("Ship and Sanctum differ");
    expect(container.querySelector('[aria-label^="Isle Moonlit Atoll"]')).not.toBeNull();
    expect(container.querySelector('[aria-label^="Sea The Sidereal Sea"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });
});

describe("Mariner representative mutations", () => {
  it("submits Route occupancy with expected current occupancy", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const route = container.querySelector(`[aria-label*="Route"][aria-label*="Ship"]`) as SVGElement;
    flushSync(() => { route.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    setSelect(select(container, "Route occupancy"), "empty");
    flushSync(() => { button(container, "Set Route occupancy").click(); });
    const fn = mockMutations["m3Commands.setMarinerRouteOccupancy"];
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toMatchObject({
      expectedCampaignId: CAMPAIGN_ID,
      expectedOccupancy: { kind: "ship" },
      occupancy: { kind: "empty" },
    });
    root.unmount();
    container.remove();
  });

  it("submits Sea Storm count with expected current count", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const region = container.querySelector('[aria-label^="Sea The Sidereal Sea"]') as SVGElement;
    flushSync(() => { region.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const input = container.querySelector('input[aria-label="Storm count"]') as HTMLInputElement;
    flushSync(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      nativeInputValueSetter.call(input, "3");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    flushSync(() => { button(container, "Set Storm count").click(); });
    const fn = mockMutations["m3Commands.setMarinerSeaStormCount"];
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toMatchObject({
      regionId: "sidereal_sea",
      expectedStormCount: 2,
      stormCount: 3,
    });
    root.unmount();
    container.remove();
  });

  it("submits Isle Market from the inspector", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const isle = container.querySelector('[aria-label^="Isle World scuttleport"]') as SVGElement;
    flushSync(() => { isle.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    flushSync(() => { button(container, "Set Market").click(); });
    const fn = mockMutations["m3Commands.setMarinerIsleMarket"];
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toMatchObject({
      boardIsleId: "scuttleport",
      expectedMarket: { present: true, rarity: "amber glass" },
      market: { present: true, rarity: "amber glass" },
    });
    root.unmount();
    container.remove();
  });

  it("submits an atomic Beast condition+location update", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    flushSync(() => { button(container, "Edit Beast").click(); });
    setSelect(select(container, "Beast condition"), "rampaging");
    setSelect(select(container, "Beast location kind"), "other_domain");
    flushSync(() => { button(container, "Save Beast").click(); });
    const fn = mockMutations["m3Commands.updateMarinerBeast"];
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].fields).toEqual({
      condition: { expected: "distrusting", value: "rampaging" },
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "other_domain", seatId: "necromancer" },
      },
    });
    expect(fn.mock.calls[0][0].fields.element).toBeUndefined();
    root.unmount();
    container.remove();
  });

  it("changes ship without submitting a Wizard Sanctum mutation", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    setSelect(select(container, "Change Mariner ship"), OTHER_SHIP);
    flushSync(() => { button(container, "Set ship").click(); });
    expect(mockMutations["m3Commands.setMarinerShip"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setMarinerShip"].mock.calls[0][0]).toMatchObject({
      expectedShipPlaceId: SHIP,
      shipPlaceId: OTHER_SHIP,
    });
    expect(Object.keys(mockMutations).some((key) => key.toLowerCase().includes("sanctum"))).toBe(false);
    expect(mockMutations["m3Commands.setMarinerShip"].mock.calls[0][0].sanctumPlaceId).toBeUndefined();
    root.unmount();
    container.remove();
  });
});

describe("Mariner realtime draft synchronization", () => {
  it("hydrates ship and Laws when the same instance goes from empty to initialized", () => {
    const { container, root } = renderSurface(EMPTY_MARINER_STATE, WIZARD);
    expect(container.innerHTML).toContain("Initialize Mariner");
    rerenderSurface(root, initializedMariner());
    expect(container.querySelector('[aria-label="Interactive Archipelago of Isha map"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Interactive Archipelago of Isha map"]')?.getAttribute("role")).toBe("group");
    expect(select(container, "Change Mariner ship").value).toBe(SHIP);
    expect(lawCheckbox(container, "First Law of the Sea").checked).toBe(true);
    expect(lawCheckbox(container, "Second Law of the Sea").checked).toBe(true);
    expect(lawCheckbox(container, "Third Law of the Sea").checked).toBe(false);
    expect(lawCheckbox(container, "Seventh Law of the Sea").checked).toBe(false);
    root.unmount();
    container.remove();
  });

  it("keeps local Ship and Law drafts across unrelated updates and refreshes them on authoritative change", () => {
    const initial = initializedMariner();
    const { container, root } = renderSurface(initial, WIZARD);
    setSelect(select(container, "Change Mariner ship"), OTHER_SHIP);
    flushSync(() => { lawCheckbox(container, "Second Law of the Sea").click(); });
    flushSync(() => { lawCheckbox(container, "Third Law of the Sea").click(); });
    expect(select(container, "Change Mariner ship").value).toBe(OTHER_SHIP);
    expect(lawCheckbox(container, "First Law of the Sea").checked).toBe(true);
    expect(lawCheckbox(container, "Second Law of the Sea").checked).toBe(false);
    expect(lawCheckbox(container, "Third Law of the Sea").checked).toBe(true);

    rerenderSurface(root, withStormCount(initial, 9));
    expect(select(container, "Change Mariner ship").value).toBe(OTHER_SHIP);
    expect(lawCheckbox(container, "First Law of the Sea").checked).toBe(true);
    expect(lawCheckbox(container, "Second Law of the Sea").checked).toBe(false);
    expect(lawCheckbox(container, "Third Law of the Sea").checked).toBe(true);

    rerenderSurface(root, {
      ...withStormCount(initial, 9),
      shipPlaceId: THIRD_SHIP as PlaceId,
      selectedLawOfSeaIds: ["seventh", "first"],
    });
    expect(select(container, "Change Mariner ship").value).toBe(THIRD_SHIP);
    expect(lawCheckbox(container, "Seventh Law of the Sea").checked).toBe(true);
    expect(lawCheckbox(container, "First Law of the Sea").checked).toBe(true);
    expect(lawCheckbox(container, "Second Law of the Sea").checked).toBe(false);
    expect(lawCheckbox(container, "Third Law of the Sea").checked).toBe(false);
    flushSync(() => { button(container, "Save Laws").click(); });
    expect(mockMutations["m3Commands.setSelectedSeaLaws"].mock.calls[0][0].selectedLawOfSeaIds).toEqual([
      "seventh",
      "first",
    ]);
    root.unmount();
    container.remove();
  });
});

describe("Mariner Beast baseline concurrency", () => {
  it("builds an edit against the captured baseline and omits an untouched concurrent field", () => {
    const initial = initializedMariner();
    const a = baselineBeast(initial);
    const { container, root } = renderSurface(initial, WIZARD);
    flushSync(() => { button(container, "Edit Beast").click(); });
    rerenderSurface(root, withBeast(initial, { ...a, element: "air" }));
    setSelect(select(container, "Beast condition"), "rampaging");
    flushSync(() => { button(container, "Save Beast").click(); });
    const fields = mockMutations["m3Commands.updateMarinerBeast"].mock.calls[0][0].fields;
    expect(fields).toEqual({
      condition: { expected: "distrusting", value: "rampaging" },
    });
    expect(fields.element).toBeUndefined();
    root.unmount();
    container.remove();
  });

  it("keeps the captured expected value when the user edits a concurrently changed field", () => {
    const initial = initializedMariner();
    const a = baselineBeast(initial);
    const { container, root } = renderSurface(initial, WIZARD);
    flushSync(() => { button(container, "Edit Beast").click(); });
    rerenderSurface(root, withBeast(initial, { ...a, condition: "friendly_nesting" }));
    setSelect(select(container, "Beast condition"), "rampaging");
    flushSync(() => { button(container, "Save Beast").click(); });
    expect(mockMutations["m3Commands.updateMarinerBeast"].mock.calls[0][0].fields).toEqual({
      condition: { expected: "distrusting", value: "rampaging" },
    });
    root.unmount();
    container.remove();
  });

  it("submits the Beast snapshot captured when remove confirmation began", () => {
    const initial = initializedMariner();
    const a = baselineBeast(initial);
    const { container, root } = renderSurface(initial, WIZARD);
    flushSync(() => { button(container, "Remove Beast").click(); });
    rerenderSurface(root, withBeast(initial, { ...a, element: "air", condition: "rampaging" }));
    flushSync(() => { button(container, "Confirm remove").click(); });
    expect(mockMutations["m3Commands.removeMarinerBeast"].mock.calls[0][0].expectedBeast).toEqual(a);
    root.unmount();
    container.remove();
  });

  it("closes the Beast editor after a successful update", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    flushSync(() => { button(container, "Edit Beast").click(); });
    expect(container.innerHTML).toContain("Save Beast");
    setSelect(select(container, "Beast condition"), "rampaging");
    await act(async () => {
      button(container, "Save Beast").click();
    });
    expect(container.innerHTML).not.toContain("Save Beast");
    expect(button(container, "Edit Beast")).toBeDefined();
    root.unmount();
    container.remove();
  });
});

describe("Mariner source-map piece presentation", () => {
  it("renders Storms as physical tokens, with Typhoon cluster and accessible exact count", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector('[data-piece="storm"][data-region-id="sidereal_sea"]')?.getAttribute("data-typhoon")).toBe("true");
    expect(container.querySelector('[data-piece="storm"][data-region-id="sidereal_sea"]')?.getAttribute("aria-label")).toContain("Storms 2");
    expect(container.querySelector('[data-piece="storm"][data-region-id="bay_of_ishana"]')?.getAttribute("data-typhoon")).toBe("false");
    expect(container.querySelector('[data-piece="storm"][data-region-id="sunken_fleet"]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("renders Ship, directional Raider, Beast, Market, and Ravage pieces", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector('[data-piece="ship"][aria-label="Ship"]')).not.toBeNull();
    const raider = container.querySelector('[data-piece="raider"]');
    expect(raider?.getAttribute("aria-label")).toContain("Raider toward");
    expect(raider?.getAttribute("data-raider-toward")).toBe("ishana");
    expect(container.querySelector('[data-piece="beast"]')?.textContent).toContain("Beast");
    expect(container.querySelector('[data-piece="market"][data-isle-id="scuttleport"]')).not.toBeNull();
    expect(container.querySelector('[data-piece="ravage"][data-isle-id="druntyr"]')?.getAttribute("aria-label")).toBe("Ravage 3");
    root.unmount();
    container.remove();
  });

  it("shows a Market Rarity cue only when a Rarity is present", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const withRarity = container.querySelector('[data-piece="market"][data-isle-id="scuttleport"]');
    const withoutRarity = container.querySelector('[data-piece="market"][data-isle-id="ishana"]');
    expect(withRarity).not.toBeNull();
    expect(withoutRarity).not.toBeNull();
    expect(withRarity?.getAttribute("data-rarity")).toBe("true");
    expect(withRarity?.getAttribute("aria-label")).toBe("Market with a Rarity");
    expect(withRarity?.querySelector('[data-rarity-cue="true"]')).not.toBeNull();
    expect(withRarity?.textContent).toContain("Rarity");
    expect(withoutRarity?.getAttribute("data-rarity")).toBe("false");
    expect(withoutRarity?.getAttribute("aria-label")).toBe("Market");
    expect(withoutRarity?.querySelector('[data-rarity-cue="true"]')).toBeNull();
    expect(withoutRarity?.textContent).toBe("Market");
    root.unmount();
    container.remove();
  });
});

describe("Mariner Sorcerer presence on the map", () => {
  const presence: readonly SorcererExternalPresence[] = [
    {
      kind: "researcher",
      denizenId: "den_00000000-0000-0000-0000-0000000000aa" as never,
      name: "Tide Reader",
      operationalThisMonth: true,
      positionId: "srp_sea_1",
      target: { kind: "mariner_sea_region", seaRegionId: "sunken_fleet" },
    },
    {
      kind: "researcher",
      denizenId: "den_00000000-0000-0000-0000-0000000000ab" as never,
      name: "Idle Cartographer",
      operationalThisMonth: false,
      positionId: "srp_sea_2",
      target: { kind: "mariner_sea_region", seaRegionId: "sidereal_sea" },
    },
    {
      kind: "researcher",
      denizenId: "den_00000000-0000-0000-0000-0000000000ac" as never,
      name: "Temple Seer",
      operationalThisMonth: true,
      positionId: "srp_temple_krolis",
      target: { kind: "hierophant_temple", templeId: "krolis" },
    },
    {
      kind: "disruptive_arcanist",
      denizenId: "den_00000000-0000-0000-0000-0000000000ad" as never,
      name: "Salt Vex",
      school: { kind: "source", schoolId: "invocation" },
      seatId: "mariner",
    },
  ];

  it("places Mariner-targeted Researchers on the exact Sea and distinguishes Working from Unavailable without color alone", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD, presence);
    const working = container.querySelector('[data-researcher-target="sunken_fleet"]');
    const unavailable = container.querySelector('[data-researcher-target="sidereal_sea"]');
    expect(working?.textContent).toContain("Tide Reader");
    expect(working?.textContent).toContain("Working this month");
    expect(working?.getAttribute("data-researcher-status")).toBe("working");
    expect(unavailable?.textContent).toContain("Idle Cartographer");
    expect(unavailable?.textContent).toContain("Unavailable this month");
    expect(unavailable?.getAttribute("data-researcher-status")).toBe("unavailable");
    expect(unavailable?.querySelector("line")).not.toBeNull();
    expect(container.textContent).not.toContain("Temple Seer");
    expect(container.querySelector('[data-domain-presence="disruptive-arcanist"]')?.textContent).toContain("Salt Vex");
    root.unmount();
    container.remove();
  });
});

describe("Mariner map interaction and narrow treatment", () => {
  it("keeps Sea hit regions under Route hits and decorative labels non-interactive", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const sea = container.querySelector('[data-map-layer="sea-hit"]');
    const route = container.querySelector('[data-map-layer="route-hit"]');
    const labels = container.querySelector('[data-map-layer="labels"]');
    expect(sea).not.toBeNull();
    expect(route).not.toBeNull();
    expect(sea!.compareDocumentPosition(route!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(labels?.getAttribute("pointer-events")).toBe("none");
    expect(container.querySelector('[data-map-layer="frame"]')?.getAttribute("pointer-events")).toBe("none");
    root.unmount();
    container.remove();
  });

  it("selects the Route when a Ship piece is activated instead of an underlying Sea", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const ship = container.querySelector('[data-piece="ship"]') as SVGElement;
    flushSync(() => { ship.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.innerHTML).toContain("Route inspector");
    expect(container.querySelector('[aria-label="Route occupancy"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("makes Isle, Sea, and Route keyboard reachable with visible selected state", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const isle = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]') as SVGElement;
    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="sunken_fleet"]') as SVGElement;
    const route = container.querySelector('[data-map-layer="route-hit"]') as SVGElement;
    expect(isle.tabIndex).toBe(0);
    expect(sea.tabIndex).toBe(0);
    expect(route.tabIndex).toBe(0);
    flushSync(() => {
      isle.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(isle.getAttribute("aria-pressed")).toBe("true");
    expect(isle.getAttribute("aria-selected")).toBeNull();
    expect(sea.getAttribute("aria-pressed")).toBe("false");
    expect(route.getAttribute("aria-pressed")).toBe("false");
    expect(container.innerHTML).toContain("Isle inspector");
    root.unmount();
    container.remove();
  });

  it("keeps an intentional minimum map width inside a horizontal scroll container", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const scroller = container.querySelector("[data-mariner-board-scroll]");
    const board = container.querySelector("[data-mariner-board]");
    expect(scroller?.className).toContain("overflow-x-auto");
    expect(board?.getAttribute("data-min-width")).toBe(String(MARINER_MAP_MIN_WIDTH_PX));
    expect((board as SVGSVGElement | null)?.viewBox.baseVal.width).toBe(1000);
    expect((board as SVGSVGElement | null)?.viewBox.baseVal.height).toBe(1000);
    root.unmount();
    container.remove();
  });
});
