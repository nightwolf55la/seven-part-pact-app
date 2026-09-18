// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  type PactSeatId,
  type PactSeatStatus,
  MARINER_SEA_REGION_DEFINITIONS,
  createUndescribedRareMarinerMarket,
  isReservedMarinerRarityDescriptionInput,
  MARINER_UNDESCRIBED_RARITY_SENTINEL,
} from "../shared/domain";
import type { SorcererExternalPresence } from "../shared/domain";
import MarinerSurface from "../src/MarinerSurface";
import {
  MARINER_ISLE_SELECTION_GLOW,
  mapEndpointPoint,
  marinerIsleGeometry,
  marinerRouteGeometry,
} from "../src/mariner-map-geometry";
import type { WorldReference } from "../src/WorldSurface";
import type { LoreCompendiumUiState } from "../src/lore-view-model";
import {
  CREATE_BEAST_LABEL,
  MOVE_BEAST_LABEL,
  GUIDE_STORM_LABEL,
  NEST_BEAST_LABEL,
  NO_LORE_CONTEXT_COPY,
  RAVAGE_INCOMPLETE_COPY,
  RAVAGE_LOCATION_FOLLOW_THROUGH,
  RAVAGE_LORE_FOLLOW_THROUGH,
  RAVAGE_MARKET_ABSORBED_COPY,
  RAVAGE_RESULT_LABEL,
  MARINER_ROUTE_CATALOG,
  captureOperabilityBoard,
  expectedForCreateShip,
  expectedForMoveBeast,
  expectedForMoveMarket,
  expectedForMoveShip,
  expectedForNestBeast,
  expectedForRelocateNestingBeastToIsle,
} from "../src/mariner-view-model";
import { endpointKey } from "../src/mariner-board-pointer";
import { associatePathEndsWithRouteEndpoints } from "../src/mariner-marker-orientation";
import { marinerRouteSymbolId, sourceRoutePathBoardEnds } from "../src/source-interaction-geometry";
import { marinerOverlayPointToBoard } from "../src/source-board-assets";

const ADD_SHIP_LABEL = "Add Ship";
const MOVE_RAIDER_LABEL = "Move Raider";

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
const SUNKEN_ORRERY_FAR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "orrery" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const SUNKEN_CARAVESSE_FAR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const SUNKEN_CARAVESSE_ORRERY = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "orrery" },
);
const ISHANA_DRUNTYR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "druntyr" },
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
      initializeMarinerSourceSetup: "m3Commands.initializeMarinerSourceSetup",
      setMarinerShip: "m3Commands.setMarinerShip",
      setSelectedSeaLaws: "m3Commands.setSelectedSeaLaws",
      setMarinerRouteOccupancy: "m3Commands.setMarinerRouteOccupancy",
      setMarinerSeaStormCount: "m3Commands.setMarinerSeaStormCount",
      setMarinerIsleMarket: "m3Commands.setMarinerIsleMarket",
      moveMarinerMarket: "m3Commands.moveMarinerMarket",
      setMarinerIsleRavage: "m3Commands.setMarinerIsleRavage",
      addMarinerBeast: "m3Commands.addMarinerBeast",
      updateMarinerBeast: "m3Commands.updateMarinerBeast",
      removeMarinerBeast: "m3Commands.removeMarinerBeast",
      createMarinerBeast: "m3Commands.createMarinerBeast",
      moveMarinerStorm: "m3Commands.moveMarinerStorm",
      moveMarinerShip: "m3Commands.moveMarinerShip",
      createMarinerShip: "m3Commands.createMarinerShip",
      moveMarinerBeast: "m3Commands.moveMarinerBeast",
      nestMarinerBeast: "m3Commands.nestMarinerBeast",
      relocateMarinerNestingBeast: "m3Commands.relocateMarinerNestingBeast",
      recordMarinerRavageResult: "m3Commands.recordMarinerRavageResult",
      addLoreEntry: "m3Commands.addLoreEntry",
      reviseLoreEntry: "m3Commands.reviseLoreEntry",
    },
  },
}));

function renderSurface(
  mariner = EMPTY_MARINER_STATE,
  wizard: typeof WIZARD | null = null,
  sorcererPresence: readonly SorcererExternalPresence[] = [],
  extras: {
    loreCompendium?: LoreCompendiumUiState;
    pactSeatStatuses?: Partial<Record<PactSeatId, PactSeatStatus | null>>;
    pending?: boolean;
  } = {},
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
      loreCompendium: extras.loreCompendium,
      pactSeatStatuses: extras.pactSeatStatuses,
      pending: extras.pending,
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
  extras: {
    loreCompendium?: LoreCompendiumUiState;
    pactSeatStatuses?: Partial<Record<PactSeatId, PactSeatStatus | null>>;
    pending?: boolean;
  } = {},
): void {
  flushSync(() => {
    root.render(createElement(MarinerSurface, {
      mariner,
      world: WORLD,
      campaignId: CAMPAIGN_ID,
      marinerWizard: wizard,
      loreCompendium: extras.loreCompendium,
      pactSeatStatuses: extras.pactSeatStatuses,
      pending: extras.pending,
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

const ORRERY_SPYRHOLM = marinerRouteId(
  { kind: "board_isle", boardIsleId: "orrery" },
  { kind: "board_isle", boardIsleId: "spyrholm" },
);

/** Occupy a relevant but non-trapping Route so expected occupancy drifts without changing Rampage. */
function withRealtimeOccupancyDrift(mariner: MarinerState): MarinerState {
  return {
    ...mariner,
    routes: mariner.routes.map((route) =>
      route.routeId === ORRERY_SPYRHOLM ? { ...route, occupancy: { kind: "ship" as const } } : route
    ),
  };
}

/** Occupy the other Sunken Fleet bounding Routes so placing on Orrery–Far Reach newly traps DEN_A. */
function withSunkenFleetTrapReady(mariner: MarinerState): MarinerState {
  return {
    ...mariner,
    routes: mariner.routes.map((route) => (
      route.routeId === SUNKEN_CARAVESSE_FAR || route.routeId === SUNKEN_CARAVESSE_ORRERY
        ? { ...route, occupancy: { kind: "ship" as const } }
        : route
    )),
  };
}

function focusRoute(container: HTMLElement, routeId: string): SVGElement {
  const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${routeId}"]`) as SVGElement;
  flushSync(() => { route.focus(); });
  return route;
}

async function dragStormPiece(
  container: HTMLElement,
  sourceRegionId: string,
  dropTarget: Element,
  pointerId = 41,
): Promise<void> {
  const storm = container.querySelector(`[data-draggable-storm="true"][data-region-id="${sourceRegionId}"]`) as Element;
  (storm as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dropTarget });
  await act(async () => {
    storm.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId, isPrimary: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

async function dragRoutePiece(
  container: HTMLElement,
  sourceRouteId: string,
  destRouteId: string,
  pointerId = 21,
): Promise<void> {
  const piece = container.querySelector(`[data-draggable-route-piece="true"][data-route-id="${sourceRouteId}"]`) as Element;
  const dest = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${destRouteId}"]`) as Element;
  (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dest });
  await act(async () => {
    piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId, isPrimary: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

function openContextOn(target: Element, clientX = 80, clientY = 40): void {
  flushSync(() => {
    target.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 2,
    }));
  });
}

function openRouteContext(container: HTMLElement, routeId: string, clientX = 80, clientY = 40): HTMLElement {
  const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${routeId}"]`) as Element;
  openContextOn(route, clientX, clientY);
  const menu = container.querySelector("[data-mariner-context-menu]") as HTMLElement | null;
  if (menu === null) throw new Error("Missing route context menu");
  return menu;
}

function openOccupiedRouteContext(container: HTMLElement, routeId: string, clientX = 80, clientY = 40): HTMLElement {
  const marker = container.querySelector(`[data-route-occupancy-marker][data-route-id="${routeId}"]`) as Element;
  (marker as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  openContextOn(marker, clientX, clientY);
  const menu = container.querySelector("[data-mariner-context-menu]") as HTMLElement | null;
  if (menu === null) throw new Error("Missing occupied-route context menu");
  return menu;
}

function openSeaContext(container: HTMLElement, regionId: string, clientX = 90, clientY = 50): HTMLElement {
  const sea = container.querySelector(`[data-map-layer="sea-hit"][data-region-id="${regionId}"]`) as Element;
  openContextOn(sea, clientX, clientY);
  const menu = container.querySelector("[data-mariner-context-menu]") as HTMLElement | null;
  if (menu === null) throw new Error("Missing sea context menu");
  return menu;
}

function contextAction(container: HTMLElement, action: string, toward?: string): HTMLButtonElement {
  const selector = toward === undefined
    ? `[data-mariner-context-menu] [data-context-action="${action}"]`
    : `[data-mariner-context-menu] [data-context-action="${action}"][data-raider-toward="${toward}"]`;
  const found = container.querySelector(selector) as HTMLButtonElement | null;
  if (found === null) throw new Error(`Missing context action ${action}`);
  return found;
}

async function hoverTrayDragOverRoute(
  container: HTMLElement,
  piece: "ship" | "raider",
  hoverRouteId: string,
  pointerId = 61,
): Promise<void> {
  const tray = container.querySelector(`[data-tray-piece="${piece}"]`) as Element;
  const dest = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${hoverRouteId}"]`) as Element;
  (tray as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => dest,
  });
  await act(async () => {
    tray.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      pointerId,
      isPrimary: true,
      button: 0,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

async function hoverRoutePieceDragOverRoute(
  container: HTMLElement,
  sourceRouteId: string,
  hoverRouteId: string,
  pointerId = 21,
): Promise<void> {
  const piece = container.querySelector(`[data-draggable-route-piece="true"][data-route-id="${sourceRouteId}"]`) as Element;
  const dest = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${hoverRouteId}"]`) as Element;
  (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => dest,
  });
  await act(async () => {
    piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId, isPrimary: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

function routeDropState(container: HTMLElement, routeId: string): string | null {
  return container.querySelector(`[data-map-layer="route-hit"][data-route-id="${routeId}"]`)?.getAttribute("data-route-drop") ?? null;
}

async function dragTrayPiece(
  container: HTMLElement,
  piece: "ship" | "raider" | "storm" | "market" | "rare-market",
  dropTarget: Element | null,
  pointerId = 61,
): Promise<void> {
  const tray = container.querySelector(`[data-tray-piece="${piece}"]`) as Element;
  (tray as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => dropTarget,
  });
  await act(async () => {
    tray.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      pointerId,
      isPrimary: true,
      button: 0,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

async function confirmRampageDestination(container: HTMLElement, seatId = "hierophant"): Promise<void> {
  const chooser = container.querySelector("[data-ship-rampage-chooser]") as HTMLElement | null;
  if (chooser === null) throw new Error("Missing Rampage chooser");
  const dest = chooser.querySelector('select[aria-label="Rampage destination"]') as HTMLSelectElement | null
    ?? chooser.querySelector('select[aria-label^="Rampage destination for"]') as HTMLSelectElement | null;
  if (dest === null) throw new Error("Missing Rampage destination select");
  setSelect(dest, seatId);
  await act(async () => { button(chooser, "Confirm Rampage").click(); });
}

async function flushScheduledClickSuppressionReset(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });
  });
}

function withTwoSunkenFleetBeastsTrapReady(mariner: MarinerState): MarinerState {
  const withSecondBeast: MarinerState = {
    ...mariner,
    beasts: [
      ...mariner.beasts,
      {
        denizenId: DEN_B as DenizenId,
        element: "water",
        definitionId: "kraken",
        condition: "distrusting",
        location: { kind: "sea_region", regionId: "sunken_fleet" },
      },
    ],
  };
  return withSunkenFleetTrapReady(withSecondBeast);
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
  it("shows source-shaped Initialize Mariner without ordinary World Isle or Ship Place binding work", () => {
    const { container, root } = renderSurface();
    expect(container.innerHTML).toContain("Initialize Mariner");
    expect(container.innerHTML).toContain("Isles of Isha");
    expect(container.innerHTML).toContain("starting Ship");
    expect(select(container, "Arrangement")).toBeDefined();
    const advanced = container.querySelector("details");
    expect(advanced?.textContent).toContain("Advanced / Correct Board");
    expect(advanced?.querySelectorAll('select[aria-label^="Bind "]')).toHaveLength(15);
    expect(advanced?.querySelector('[aria-label="Ship Place"]')).not.toBeNull();
    expect(button(container, "Initialize Mariner").disabled).toBe(true);
    expect(container.innerHTML).toContain("Advanced / Correct Board");
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
    expect(container.querySelector('[data-piece="storm"][data-region-id="sidereal_sea"]')?.getAttribute("aria-label")).toMatch(/2 Storms|Typhoon/i);
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
    expect(withRarity?.textContent).toContain("Rare Market");
    expect(withoutRarity?.getAttribute("data-rarity")).toBe("false");
    expect(withoutRarity?.getAttribute("aria-label")).toBe("Market");
    expect(withoutRarity?.querySelector('[data-rarity-cue="true"]')).toBeNull();
    expect(withoutRarity?.textContent).toBe("Market");
    root.unmount();
    container.remove();
  });

  it("does not keep a Visions forecast shell", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-mariner-visions-forecast]")).toBeNull();
    expect(container.innerHTML).not.toContain("Visions forecast");
    expect(container.querySelector("[data-mariner-prevailing-wind]")).toBeNull();
    expect(container.querySelector("[data-isle-stability]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("keeps Market, Ravage, Beast, and Storm pieces visible without selection", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    expect(container.querySelector('[data-piece="market"][data-isle-id="scuttleport"]')).not.toBeNull();
    expect(container.querySelector('[data-piece="ravage"][data-isle-id="druntyr"]')).not.toBeNull();
    expect(container.querySelector('[data-piece="beast"]')).not.toBeNull();
    expect(container.querySelector('[data-piece="storm"][data-region-id="sidereal_sea"][data-typhoon="true"]')).not.toBeNull();
    expect(container.querySelector('[data-storm-piece="typhoon"]')).not.toBeNull();
    expect(container.querySelector('[data-storm-piece="storm"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not keep a global hover/focus context strip", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-mariner-context-detail]")).toBeNull();
    expect(container.querySelector('[aria-label^="Isle World scuttleport"]')).not.toBeNull();
    expect(container.querySelector('[aria-label^="Sea The Sidereal Sea"]')).not.toBeNull();
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
  it("keeps Sea hit regions under Route hits and the source SVG decorative layer non-interactive", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const sea = container.querySelector('[data-map-layer="sea-hit"]');
    const route = container.querySelector('[data-map-layer="route-hit"]');
    const source = container.querySelector("[data-mariner-source-board]");
    expect(sea).not.toBeNull();
    expect(route).not.toBeNull();
    expect(source?.getAttribute("aria-hidden")).toBe("true");
    expect(sea!.compareDocumentPosition(route!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('[data-map-layer="labels"]')).toBeNull();
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

  it("keeps normal Ship create and move controls off the Isle inspector", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World orrery");
    expect(container.innerHTML).toContain("Isle inspector");
    expect(container.innerHTML).not.toContain(ADD_SHIP_LABEL);
    expect(container.innerHTML).not.toContain("Move Ship");
    expect(container.innerHTML).not.toContain(MOVE_RAIDER_LABEL);
    root.unmount();
    container.remove();
  });

  it("owns Ship create and move actions on the Route inspector", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickRoute(container, SUNKEN_ORRERY_FAR);
    expect(container.innerHTML).toContain("Route inspector");
    expect(button(container, ADD_SHIP_LABEL)).toBeDefined();
    root.unmount();
    container.remove();
    const occupied = renderSurface(initializedMariner(), WIZARD);
    clickRoute(occupied.container, SHIP_ROUTE);
    expect(button(occupied.container, "Move Ship")).toBeDefined();
    occupied.root.unmount();
    occupied.container.remove();
  });

  it("keeps the Sea inspector weather-centric without Ship CRUD", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sidereal Sea");
    expect(container.innerHTML).toContain("Sea inspector");
    expect(button(container, GUIDE_STORM_LABEL)).toBeDefined();
    expect(container.innerHTML).toMatch(/Storms 2/);
    expect(container.innerHTML).toMatch(/Typhoon/);
    expect(container.innerHTML).not.toContain(ADD_SHIP_LABEL);
    expect(container.innerHTML).not.toContain("Move Ship");
    expect(container.innerHTML).not.toContain(MOVE_RAIDER_LABEL);
    root.unmount();
    container.remove();
  });

  it("fits the map in the desktop board without a horizontal-scroll container or fixed min width", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const scroller = container.querySelector("[data-mariner-board-scroll]");
    const stage = container.querySelector("[data-mariner-board-stage]");
    const board = container.querySelector("[data-mariner-board]") as SVGSVGElement | null;
    expect(scroller).toBeNull();
    expect(stage).not.toBeNull();
    expect(stage?.className).not.toContain("overflow-x-auto");
    expect(board?.getAttribute("data-min-width")).toBeNull();
    expect(board?.style.minWidth).toBe("");
    expect(board?.viewBox.baseVal.width).toBe(957);
    expect(board?.viewBox.baseVal.height).toBe(812);
    expect(board?.querySelector("[data-mariner-source-board]")).not.toBeNull();
    root.unmount();
    container.remove();
  });
});

describe("Mariner desktop board hierarchy and overlay inspector", () => {
  it("does not reserve a permanent inspector column beside the map", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    expect(container.innerHTML).not.toContain("xl:grid-cols-5");
    expect(container.querySelector("[data-mariner-board-stage]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("opens a dismissible overlay inspector and closes it from the close button", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World scuttleport");
    const overlay = container.querySelector("[data-board-overlay-inspector]");
    expect(overlay).not.toBeNull();
    expect(container.innerHTML).toContain("Isle inspector");
    const close = container.querySelector('[aria-label="Close inspector"]') as HTMLButtonElement | null;
    expect(close).not.toBeNull();
    flushSync(() => { close!.click(); });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    expect(container.innerHTML).not.toContain("Isle inspector");
    root.unmount();
    container.remove();
  });

  it("closes the overlay inspector with Escape", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World scuttleport");
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("keeps Ship/Sanctum compact and game-facing in the normal header", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const summary = container.querySelector("[data-mariner-ship-sanctum]");
    expect(summary?.textContent).toContain("The Wave");
    expect(summary?.textContent).toContain("Second Hull");
    expect(summary?.textContent).toContain("Ship and Sanctum differ");
    expect(summary?.textContent).toContain("World ishana");
    expect(summary?.textContent).not.toContain("Mariner personal Ship Place");
    expect(summary?.textContent).not.toContain("Create another mobile Place");
    expect(summary?.textContent).not.toContain("mobile Place");
    expect(container.querySelector('[aria-label="Change Mariner ship"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("renders source-shaped sea/field structure and exact Isle geometry instead of replacing an Isle", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-mariner-map-field]")).not.toBeNull();
    expect(container.querySelector("[data-mariner-map-sea]")).not.toBeNull();
    const isle = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]') as SVGElement;
    flushSync(() => { isle.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.querySelector("[data-selection-halo][data-isle-id=\"ishana\"]")).not.toBeNull();
    expect(isle.querySelector('[data-source-geometry="mariner-isle-ishana"]')).not.toBeNull();
    expect(Array.from(isle.querySelectorAll("ellipse")).filter((el) => isVisiblyStrokedOrFilled(el))).toHaveLength(0);
    root.unmount();
    container.remove();
  });

  it("renders a decorative PowerPoint-native source SVG under live hit regions", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const board = container.querySelector("[data-mariner-board]") as SVGSVGElement | null;
    expect(board).not.toBeNull();
    expect(board?.tagName.toLowerCase()).toBe("svg");
    const source = container.querySelector("[data-mariner-source-board]");
    expect(source).not.toBeNull();
    expect(source?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("[data-mariner-map-field]")).not.toBeNull();
    expect(container.querySelector("[data-mariner-chart-title]")).toBeNull();
    expect(container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]')).not.toBeNull();
    expect(container.querySelector('[data-map-layer="route-hit"]')).not.toBeNull();
    expect(container.querySelector('[data-map-layer="sea-hit"]')).not.toBeNull();
    expect(container.querySelector("[data-map-layer=\"labels\"]")).toBeNull();
    expect(container.querySelector('[data-route-occupancy="empty"]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not resize the board when the overlay inspector opens", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const board = container.querySelector("[data-mariner-board]") as SVGSVGElement;
    const before = {
      width: board.viewBox.baseVal.width,
      height: board.viewBox.baseVal.height,
    };
    clickIsle(container, "World scuttleport");
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    expect(board.viewBox.baseVal.width).toBe(before.width);
    expect(board.viewBox.baseVal.height).toBe(before.height);
    expect(container.querySelector("[data-mariner-board-scroll]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("selects Ishana with exact source landform geometry instead of a visible ellipse halo", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World ishana");
    const isle = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]') as SVGElement;
    expect(isle).not.toBeNull();
    const source = isle.querySelector('[data-source-geometry="mariner-isle-ishana"]');
    expect(source).not.toBeNull();
    expect(useHref(source)).toBe("#mariner-isle-ishana");
    expect(isle.querySelector("[data-selection-halo] ellipse, ellipse[data-selection-halo]")).toBeNull();
    const visibleHalo = Array.from(isle.querySelectorAll("ellipse")).filter((el) => isVisiblyStrokedOrFilled(el));
    expect(visibleHalo).toHaveLength(0);
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    expect(container.innerHTML).toContain("Isle inspector");
    root.unmount();
    container.remove();
  });

  it("keeps a generous invisible hit on a small Isle without making that approximation visible", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const izor = container.querySelector('[data-map-layer="isle"][data-isle-id="izor"]') as SVGElement;
    expect(izor).not.toBeNull();
    const convenienceHit = izor.querySelector("[data-isle-convenience-hit]");
    expect(convenienceHit).not.toBeNull();
    expect(isVisiblyStrokedOrFilled(convenienceHit!)).toBe(false);
    flushSync(() => { izor.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(izor.querySelector('[data-source-geometry="mariner-isle-izor"]')).not.toBeNull();
    expect(useHref(izor.querySelector('[data-source-geometry="mariner-isle-izor"]'))).toBe("#mariner-isle-izor");
    expect(Array.from(izor.querySelectorAll("ellipse")).filter((el) => isVisiblyStrokedOrFilled(el))).toHaveLength(0);
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("reuses the same exact source Route geometry for Ship occupancy, selection, and hit", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const oldPath = marinerRouteGeometry(SHIP_ROUTE)?.pathD;
    expect(oldPath && oldPath.length > 0).toBe(true);
    const visible = container.querySelector(`[data-route-visible="${SHIP_ROUTE}"]`);
    const hit = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`);
    expect(visible).not.toBeNull();
    expect(hit).not.toBeNull();
    expect(visible?.getAttribute("data-route-occupancy")).toBe("ship");
    const visibleGeom = visible!.querySelector("[data-source-geometry]") ?? visible;
    const hitGeom = hit!.querySelector("[data-source-geometry]") ?? hit!.querySelector("use");
    expect(useHref(visibleGeom)).toBe(`#mariner-route-${SHIP_ROUTE}`);
    expect(useHref(hitGeom)).toBe(`#mariner-route-${SHIP_ROUTE}`);
    expect(visibleGeom?.getAttribute("d")).not.toBe(oldPath);
    expect(hit?.querySelector(`path[d="${cssEscape(oldPath!)}"]`)).toBeNull();
    const routeHit = hit as SVGElement;
    flushSync(() => { routeHit.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const selected = routeHit.querySelector("[data-selection-halo], [data-source-geometry]");
    expect(useHref(routeHit.querySelector("[data-selection-halo]") ?? selected)).toBe(`#mariner-route-${SHIP_ROUTE}`);
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    expect(container.innerHTML).toContain("Route inspector");
    root.unmount();
    container.remove();
  });

  it("thickens occupied selected Route halo while remaining secondary to the occupancy stroke", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const occupied = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as SVGElement;
    flushSync(() => { occupied.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const halo = occupied.querySelector("[data-selection-halo]") as SVGElement | null;
    expect(halo).not.toBeNull();
    expect(halo?.getAttribute("stroke-width") ?? halo?.getAttribute("strokeWidth")).toBe("6.5");
    expect(halo?.getAttribute("opacity")).toBe("0.28");
    const occupancyStroke = container.querySelector(`[data-route-visible="${SHIP_ROUTE}"]`);
    expect(Number(occupancyStroke?.getAttribute("stroke-width") ?? occupancyStroke?.getAttribute("strokeWidth"))).toBeLessThan(6.5);
    root.unmount();
    container.remove();
  });

  it("reuses the same exact source Route geometry for Raider occupancy instead of old pathD", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const oldPath = marinerRouteGeometry(RAID_ROUTE)?.pathD;
    expect(oldPath && oldPath.length > 0).toBe(true);
    const visible = container.querySelector(`[data-route-visible="${RAID_ROUTE}"]`);
    expect(visible?.getAttribute("data-route-occupancy")).toBe("raider");
    const visibleGeom = visible!.querySelector("[data-source-geometry]") ?? visible;
    expect(useHref(visibleGeom)).toBe(`#mariner-route-${RAID_ROUTE}`);
    expect(visibleGeom?.getAttribute("d")).not.toBe(oldPath);
    const hit = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${RAID_ROUTE}"]`);
    expect(useHref(hit!.querySelector("[data-source-geometry]") ?? hit!.querySelector("use"))).toBe(
      `#mariner-route-${RAID_ROUTE}`,
    );
    root.unmount();
    container.remove();
  });

  it("does not paint approximate Isle ellipse geometry as a visible selected-Isle halo", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const approx = marinerIsleGeometry("ishana")!;
    clickIsle(container, "World ishana");
    const painted = Array.from(
      container.querySelectorAll('[data-map-layer="isle"][data-isle-id="ishana"] ellipse'),
    ).filter((el) => isVisiblyStrokedOrFilled(el));
    expect(painted.some((el) => {
      const rx = Number(el.getAttribute("rx"));
      const ry = Number(el.getAttribute("ry"));
      return Math.abs(rx - (approx.hit.rx + 10)) < 0.5 || Math.abs(ry - (approx.hit.ry + 10)) < 0.5;
    })).toBe(false);
    root.unmount();
    container.remove();
  });

  it("strokes occupied Ship Routes with fill none instead of filling connector wedges", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const visible = container.querySelector(`[data-route-visible="${SHIP_ROUTE}"]`);
    expect(visible).not.toBeNull();
    expect(visible?.getAttribute("data-route-occupancy")).toBe("ship");
    expect(useHref(visible)).toBe(`#mariner-route-${SHIP_ROUTE}`);
    expect(visible?.getAttribute("fill")).toBe("none");
    expect(visible?.getAttribute("stroke")).not.toBe("none");
    expect(visible?.getAttribute("stroke")).not.toBe("transparent");
    root.unmount();
    container.remove();
  });

  it("strokes occupied Raider Routes with fill none instead of filling connector wedges", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const visible = container.querySelector(`[data-route-visible="${RAID_ROUTE}"]`);
    expect(visible).not.toBeNull();
    expect(visible?.getAttribute("data-route-occupancy")).toBe("raider");
    expect(useHref(visible)).toBe(`#mariner-route-${RAID_ROUTE}`);
    expect(visible?.getAttribute("fill")).toBe("none");
    expect(visible?.getAttribute("stroke")).not.toBe("none");
    expect(visible?.getAttribute("stroke")).not.toBe("transparent");
    root.unmount();
    container.remove();
  });

  it("selects an Isle with a composited silhouette edge on exact source geometry", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World ishana");
    const isle = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]') as SVGElement;
    const halo = isle.querySelector("[data-selection-halo]") as SVGElement | null;
    expect(halo).not.toBeNull();
    expect(halo?.getAttribute("data-isle-shore-glow")).not.toBeNull();
    expect(halo?.getAttribute("filter") ?? halo?.closest("[filter]")?.getAttribute("filter") ?? "").toContain("mariner-isle-shore-glow");
    const source = isle.querySelector('[data-source-geometry="mariner-isle-ishana"]');
    expect(useHref(source)).toBe("#mariner-isle-ishana");
    const translucentFills = Array.from(isle.querySelectorAll("[data-selection-halo], [data-selection-halo] use, [data-source-geometry]")).filter((el) => {
      const fill = el.getAttribute("fill") ?? "";
      return fill.includes("rgba") || fill.includes("0.38");
    });
    expect(translucentFills).toHaveLength(0);
    expect(isle.querySelector("[data-selection-halo] ellipse, ellipse[data-selection-halo]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not render a duplicate application-generated Archipelago chart title", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-mariner-chart-title]")).toBeNull();
    expect(container.querySelector("[data-mariner-source-board]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not render the old large Ship silhouette on an occupied Route", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const ship = container.querySelector(`[data-piece="ship"][data-route-id="${SHIP_ROUTE}"]`);
    expect(ship).not.toBeNull();
    expect(ship?.innerHTML).not.toContain("M -14 4 L -8 -6 L 10 -6 L 16 4 Z");
    expect(Array.from(ship?.querySelectorAll("text") ?? []).some((el) => el.textContent === "Ship")).toBe(false);
    root.unmount();
    container.remove();
  });

  it("does not render the old large Raider silhouette on an occupied Route", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const raider = container.querySelector(`[data-piece="raider"][data-route-id="${RAID_ROUTE}"]`);
    expect(raider).not.toBeNull();
    expect(raider?.innerHTML).not.toContain("M -12 5 L -6 -5 L 8 -5 L 14 5 Z");
    expect(raider?.querySelector('polygon[points="16,0 28,-7 28,7"]')).toBeNull();
    expect(Array.from(raider?.querySelectorAll("text") ?? []).some((el) => (el.textContent ?? "").startsWith("Raider"))).toBe(false);
    root.unmount();
    container.remove();
  });

  it("marks occupied Ship Routes with a compact non-color semantic marker on exact source geometry", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const visible = container.querySelector(`[data-route-visible="${SHIP_ROUTE}"]`);
    const marker = container.querySelector(`[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`);
    expect(useHref(visible)).toBe(`#mariner-route-${SHIP_ROUTE}`);
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute("data-marker-from")).toBe("exact-source-path");
    expect(marker?.querySelector("path, polygon, line")).not.toBeNull();
    const oldAnchor = marinerRouteGeometry(SHIP_ROUTE)!.pieceAnchor;
    expect(marker?.getAttribute("transform") ?? "").not.toContain(`translate(${oldAnchor.x} ${oldAnchor.y})`);
    root.unmount();
    container.remove();
  });

  it("marks occupied Raider Routes with a distinct compact semantic marker on exact source geometry", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const visible = container.querySelector(`[data-route-visible="${RAID_ROUTE}"]`);
    const marker = container.querySelector(`[data-route-occupancy-marker="raider"][data-route-id="${RAID_ROUTE}"]`);
    const shipMarker = container.querySelector(`[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`);
    expect(useHref(visible)).toBe(`#mariner-route-${RAID_ROUTE}`);
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute("data-marker-from")).toBe("exact-source-path");
    expect(marker?.querySelector("path, polygon, line")).not.toBeNull();
    expect(marker?.innerHTML).not.toBe(shipMarker?.innerHTML);
    const oldAnchor = marinerRouteGeometry(RAID_ROUTE)!.pieceAnchor;
    expect(marker?.getAttribute("transform") ?? "").not.toContain(`translate(${oldAnchor.x} ${oldAnchor.y})`);
    root.unmount();
    container.remove();
  });

  it("places the Ship sail on the aft side of the mast relative to the bow", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const marker = container.querySelector(`[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`);
    const sail = marker?.querySelector('[data-ship-part="sail"]');
    expect(marker?.querySelector('[data-ship-pictogram="hull-mast-sail"]')).not.toBeNull();
    expect(sail?.getAttribute("data-ship-sail-side")).toBe("aft");
    expect(sail?.getAttribute("d") ?? "").not.toContain("L4.3");
    expect(sail?.getAttribute("d") ?? "").toMatch(/L-?\d/);
    root.unmount();
    container.remove();
  });

  it("points the Raider marker toward the authoritative raided endpoint, reversing path tangent when needed", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const marker = container.querySelector(`[data-route-occupancy-marker="raider"][data-route-id="${RAID_ROUTE}"]`);
    expect(marker?.getAttribute("data-raider-aligned")).toBe("toward-destination");
    expect(marker?.getAttribute("data-raider-toward")).toBe("ishana");
    const transform = marker?.getAttribute("transform") ?? "";
    const parsed = transform.match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/);
    expect(parsed).not.toBeNull();
    const originX = Number(parsed?.[1]);
    const originY = Number(parsed?.[2]);
    const headingDeg = Number(parsed?.[3]);
    const routeDef = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === RAID_ROUTE);
    expect(routeDef).toBeDefined();
    const ends = sourceRoutePathBoardEnds(marinerRouteSymbolId(RAID_ROUTE));
    expect(ends).not.toBeNull();
    const associated = associatePathEndsWithRouteEndpoints(
      ends!.start,
      ends!.end,
      marinerOverlayPointToBoard(mapEndpointPoint(routeDef!.endpointA).x, mapEndpointPoint(routeDef!.endpointA).y),
      marinerOverlayPointToBoard(mapEndpointPoint(routeDef!.endpointB).x, mapEndpointPoint(routeDef!.endpointB).y),
    );
    const towardEndpoint = { kind: "board_isle" as const, boardIsleId: "ishana" as const };
    const target = endpointKey(towardEndpoint) === endpointKey(routeDef!.endpointA)
      ? associated.endpointA
      : associated.endpointB;
    const rad = (headingDeg * Math.PI) / 180;
    const towardDot = Math.cos(rad) * (target.x - originX) + Math.sin(rad) * (target.y - originY);
    expect(towardDot).toBeGreaterThan(0);
    root.unmount();
    container.remove();
  });

  it("renders a compact Ship pictogram with hull, mast, and sail instead of the hull-only marker", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const marker = container.querySelector(`[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`);
    expect(marker).not.toBeNull();
    expect(marker?.innerHTML).not.toContain("M-4.5 1.7 L-2.4 -1.5 L3.6 -1.5 L5.6 1.7 Z");
    expect(marker?.querySelector('[data-ship-pictogram="hull-mast-sail"]')).not.toBeNull();
    expect(marker?.querySelector('[data-ship-part="hull"]')).not.toBeNull();
    expect(marker?.querySelector('[data-ship-part="mast"]')).not.toBeNull();
    expect(marker?.querySelector('[data-ship-part="sail"]')).not.toBeNull();
    expect(marker?.getAttribute("data-marker-from")).toBe("exact-source-path");
    const oldAnchor = marinerRouteGeometry(SHIP_ROUTE)!.pieceAnchor;
    expect(marker?.getAttribute("transform") ?? "").not.toContain(`translate(${oldAnchor.x} ${oldAnchor.y})`);
    root.unmount();
    container.remove();
  });

  it("renders a directional compact Raider marker instead of the ambiguous diamond", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const marker = container.querySelector(`[data-route-occupancy-marker="raider"][data-route-id="${RAID_ROUTE}"]`);
    const shipMarker = container.querySelector(`[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`);
    expect(marker).not.toBeNull();
    expect(marker?.innerHTML).not.toContain("0,-4.2 3.4,0 0,3.2 -2.2,0");
    expect(marker?.querySelector('[data-raider-pictogram="directional"]')).not.toBeNull();
    expect(marker?.getAttribute("data-raider-toward")).toBe("ishana");
    expect(marker?.getAttribute("aria-label") ?? "").toContain("Raider toward");
    expect(marker?.innerHTML).not.toBe(shipMarker?.innerHTML);
    expect(marker?.getAttribute("data-marker-from")).toBe("exact-source-path");
    const oldAnchor = marinerRouteGeometry(RAID_ROUTE)!.pieceAnchor;
    expect(marker?.getAttribute("transform") ?? "").not.toContain(`translate(${oldAnchor.x} ${oldAnchor.y})`);
    root.unmount();
    container.remove();
  });

  it("selects an Isle with a soft shoreline glow on exact source geometry", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World ishana");
    const isle = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]') as SVGElement;
    const halo = isle.querySelector("[data-selection-halo]") as SVGElement | null;
    expect(halo).not.toBeNull();
    expect(halo?.getAttribute("data-isle-silhouette-edge")).toBeNull();
    expect(halo?.getAttribute("data-isle-shore-glow")).not.toBeNull();
    expect(halo?.getAttribute("filter") ?? "").toContain("mariner-isle-shore-glow");
    expect(useHref(isle.querySelector('[data-source-geometry="mariner-isle-ishana"]'))).toBe("#mariner-isle-ishana");
    const translucentFills = Array.from(isle.querySelectorAll("[data-selection-halo], [data-selection-halo] use, [data-source-geometry]")).filter((el) => {
      const fill = el.getAttribute("fill") ?? "";
      return fill.includes("rgba") || fill.includes("0.38");
    });
    expect(translucentFills).toHaveLength(0);
    root.unmount();
    container.remove();
  });

  it("sources selected-Isle shoreline color from the Isle-local glow mapping, not a generic dark edge", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World ishana");
    const halo = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"] [data-isle-shore-glow]') as SVGElement | null;
    expect(halo).not.toBeNull();
    expect(halo?.getAttribute("data-isle-shore-glow")).not.toBeNull();
    expect(halo?.getAttribute("filter") ?? "").toContain("mariner-isle-shore-glow");
    expect(halo?.getAttribute("color")).toBe(MARINER_ISLE_SELECTION_GLOW.ishana);
    expect(halo?.getAttribute("color")).not.toBe("#0f172a");
    expect(halo?.getAttribute("color")).not.toBe("#042f2e");
    expect(halo?.getAttribute("color")).not.toBe("#c45c28");
    root.unmount();
    container.remove();
  });

  it("expands the Isle glow filter region so dilation and blur are not clipped", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const filter = container.querySelector("#mariner-isle-shore-glow") as SVGFilterElement | null;
    expect(filter).not.toBeNull();
    expect(filter?.querySelector("feGaussianBlur")).not.toBeNull();
    const x = Number(filter?.getAttribute("x"));
    const y = Number(filter?.getAttribute("y"));
    const width = Number(filter?.getAttribute("width"));
    const height = Number(filter?.getAttribute("height"));
    expect(x).toBeLessThan(0);
    expect(y).toBeLessThan(0);
    expect(width).toBeGreaterThan(957);
    expect(height).toBeGreaterThan(812);
    root.unmount();
    container.remove();
  });

  it("keeps Mariner Isle, Route, and Sea keyboard-focusable without a rectangular focus outline class", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const isle = container.querySelector('[data-map-layer="isle"][data-isle-id="ishana"]') as SVGElement;
    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="sunken_fleet"]') as SVGElement;
    const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as SVGElement;
    expect(isle.tabIndex).toBe(0);
    expect(sea.tabIndex).toBe(0);
    expect(route.tabIndex).toBe(0);
    for (const el of [isle, sea, route]) {
      const className = el.getAttribute("class") ?? "";
      expect(className).toContain("outline-none");
      expect(className).not.toMatch(/focus-visible:outline(?!-none)/);
    }
    expect(isle.querySelector("[data-focus-ring]")).not.toBeNull();
    expect(route.querySelector("[data-focus-ring]")).not.toBeNull();
    expect(useHref(route.querySelector("[data-focus-ring]"))).toBe(`#mariner-route-${SHIP_ROUTE}`);
    expect(sea.querySelector("[data-focus-ring]")).not.toBeNull();
    root.unmount();
    container.remove();
  });
});

describe("M5.4 UX register continuation", () => {
  it("records UX-024 Storm pieces and direct manipulation in the register", async () => {
    const { readFileSync } = await import("node:fs");
    const register = readFileSync("docs/m5-4-table-readiness-ux.md", "utf8");
    expect(register).toMatch(/### UX-024/);
    expect(register).toMatch(/Storms should read as spatial Sea pieces/);
    const section = register.slice(register.indexOf("### UX-024"), register.indexOf("### UX-025"));
    expect(section).toMatch(/\*\*Current status:\*\* FIXED — NEEDS HUMAN RETEST/);
    expect(register).toMatch(/### UX-025/);
    expect(register).toMatch(/### UX-026/);
  });
});

function setInput(el: HTMLInputElement, value: string): void {
  flushSync(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clickSea(container: HTMLElement, name: string): void {
  const region = container.querySelector(`[aria-label^="Sea ${name}"]`) as SVGElement | null;
  if (region === null) throw new Error(`Missing sea: ${name}`);
  flushSync(() => { region.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

function clickRoute(container: HTMLElement, routeId: string): void {
  const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${routeId}"]`) as SVGElement | null;
  if (route === null) throw new Error(`Missing route: ${routeId}`);
  flushSync(() => { route.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

function clickSeaHit(container: HTMLElement, regionId: string): void {
  const region = container.querySelector(`[data-map-layer="sea-hit"][data-region-id="${regionId}"]`) as SVGElement | null;
  if (region === null) throw new Error(`Missing sea hit: ${regionId}`);
  flushSync(() => { region.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

function clickIsle(container: HTMLElement, name: string): void {
  const isle = container.querySelector(`[aria-label^="Isle ${name}"]`) as SVGElement | null;
  if (isle === null) throw new Error(`Missing isle: ${name}`);
  flushSync(() => { isle.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

function useHref(el: Element | null): string | null {
  if (el === null) return null;
  return el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? el.getAttribute("xlinkHref");
}

function isVisiblyStrokedOrFilled(el: Element): boolean {
  const fill = el.getAttribute("fill") ?? "";
  const stroke = el.getAttribute("stroke") ?? "";
  const fillOpacity = Number(el.getAttribute("fill-opacity") ?? el.getAttribute("fillOpacity") ?? "1");
  const strokeWidth = Number(el.getAttribute("stroke-width") ?? el.getAttribute("strokeWidth") ?? (stroke && stroke !== "none" && stroke !== "transparent" ? "1" : "0"));
  const visibleFill = fill !== "" && fill !== "none" && fill !== "transparent" && fillOpacity > 0;
  const visibleStroke = stroke !== "" && stroke !== "none" && stroke !== "transparent" && strokeWidth > 0;
  return visibleFill || visibleStroke;
}

function cssEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function surroundRegion(mariner: MarinerState, regionId: string): MarinerState {
  const definition = MARINER_SEA_REGION_DEFINITIONS.find((region) => region.regionId === regionId);
  if (definition === undefined) throw new Error(`Unknown region ${regionId}`);
  return {
    ...mariner,
    seaRegions: mariner.seaRegions.map((region) =>
      region.regionId === regionId ? { ...region, stormCount: 0 } : region,
    ),
    routes: mariner.routes.map((route) =>
      definition.boundingRouteIds.includes(route.routeId as never)
        ? { ...route, occupancy: { kind: "ship" as const } }
        : route,
    ),
  };
}

function isleLoreReady(isleId: IsleId, ownerLabel: string, delegatedLabel: string): LoreCompendiumUiState {
  const write = {
    writable: true as const,
    add: { operation: "add_lore_entry" as const, targetForm: "new_campaign" as const, subject: { kind: "isle" as const, isleId } },
  };
  return {
    status: "ready",
    presentation: {
      ok: true,
      subjects: [{
        presentationKey: `isle:${isleId}`,
        subject: { kind: "isle", isleId },
        subjectLabel: ownerLabel,
        shelf: { id: "isles", label: "Isles" },
        hasEffectiveLore: true,
        eligibleToReceiveLore: true,
        compendiumPresence: "has_lore",
        ordinaryFirstAdd: null,
        advancedParallelCampaignLore: null,
        contexts: [
          {
            kind: "source",
            sourceCollectionId: "faustian.home.scuttleport",
            contextLabel: ownerLabel,
            headingLabel: ownerLabel,
            attribution: { work: "Test", pages: "1", anchor: "owner" },
            readable: true,
            entries: [{ provenance: "printed", provenanceLabel: "Printed wording", sourceEntryId: "e1", text: "Owner Scuttleport lore.", revise: null }],
            write,
            mariner: null,
            ordinaryAddPath: true,
          },
          {
            kind: "source",
            sourceCollectionId: "mariner.delegated.scuttleport",
            contextLabel: delegatedLabel,
            headingLabel: delegatedLabel,
            attribution: { work: "Test", pages: "2", anchor: "delegated" },
            readable: true,
            entries: [{ provenance: "printed", provenanceLabel: "Printed wording", sourceEntryId: "e2", text: "Delegated Scuttleport lore.", revise: null }],
            write,
            mariner: null,
            ordinaryAddPath: true,
          },
        ],
      }],
      marinerIsleSelections: [],
    },
  };
}

const SCUTTLE_WORLD_ISLE = isleId(2);

describe("Mariner semantic operability actions", () => {
  it("reaches Create Beast, Guided Storm, and Nest from a selected Sea", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sunken Fleet");
    expect(button(container, CREATE_BEAST_LABEL)).toBeDefined();
    expect(button(container, GUIDE_STORM_LABEL)).toBeDefined();
    expect(button(container, NEST_BEAST_LABEL)).toBeDefined();
    root.unmount();
    container.remove();
  });

  it("reaches Ravage Result and contextual Lore from a selected Isle", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD, [], {
      loreCompendium: isleLoreReady(SCUTTLE_WORLD_ISLE, "Owner Scuttleport lore context", "Delegated Scuttleport lore context"),
      pactSeatStatuses: { faustian: "present" },
    });
    clickIsle(container, "World scuttleport");
    expect(button(container, RAVAGE_RESULT_LABEL)).toBeDefined();
    expect(container.querySelector('[aria-label="Lore context panel"]')).not.toBeNull();
    expect(container.innerHTML).toContain("Owner Scuttleport lore context");
    expect(container.innerHTML).not.toContain("Delegated Scuttleport lore context");
    root.unmount();
    container.remove();
  });

  it("captures Create Beast expected storms at action start and keeps them after a realtime rerender", () => {
    const initial = initializedMariner();
    const { container, root } = renderSurface(initial, WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, CREATE_BEAST_LABEL).click(); });
    setInput(container.querySelector('input[aria-label="Beast name"]') as HTMLInputElement, "New Kraken");
    setSelect(select(container, "Powerful status"), "malignant");
    setSelect(select(container, "Beast element"), "water");
    rerenderSurface(root, withStormCount(initial, 9));
    expect((container.querySelector('input[aria-label="Beast name"]') as HTMLInputElement).value).toBe("New Kraken");
    flushSync(() => { button(container, CREATE_BEAST_LABEL).click(); });
    const payload = mockMutations["m3Commands.createMarinerBeast"].mock.calls[0][0];
    expect(payload.expectedStormCounts.find((entry: { regionId: string }) => entry.regionId === "sidereal_sea")?.stormCount).toBe(2);
    expect(payload.status).toEqual({ kind: "standard", value: "malignant" });
    expect(payload.denizenId).toMatch(/^den_/);
    expect(mockMutations["m3Commands.addMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.createDenizen"]).toBeUndefined();
    root.unmount();
    container.remove();
  });

  it("keeps Create Beast input and captured expected values after a server error", async () => {
    const initial = initializedMariner();
    const { container, root } = renderSurface(initial, WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, CREATE_BEAST_LABEL).click(); });
    setInput(container.querySelector('input[aria-label="Beast name"]') as HTMLInputElement, "Kept Kraken");
    setSelect(select(container, "Powerful status"), "disruptive");
    setSelect(select(container, "Beast element"), "water");
    mockMutations["m3Commands.createMarinerBeast"].mockRejectedValueOnce(new Error("stale storm count"));
    await act(async () => {
      button(container, CREATE_BEAST_LABEL).click();
    });
    rerenderSurface(root, withStormCount(initial, 9));
    expect((container.querySelector('input[aria-label="Beast name"]') as HTMLInputElement).value).toBe("Kept Kraken");
    expect((container.querySelector('select[aria-label="Powerful status"]') as HTMLSelectElement).value).toBe("disruptive");
    await act(async () => {
      button(container, CREATE_BEAST_LABEL).click();
    });
    const second = mockMutations["m3Commands.createMarinerBeast"].mock.calls[1][0];
    expect(second.expectedStormCounts.find((entry: { regionId: string }) => entry.regionId === "sidereal_sea")?.stormCount).toBe(2);
    expect(second.status).toEqual({ kind: "standard", value: "disruptive" });
    root.unmount();
    container.remove();
  });

  it("does not require Wind confirmation for a Guided Storm move", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, GUIDE_STORM_LABEL).click(); });
    expect(container.querySelector("[data-storm-guide-mode]")).not.toBeNull();
    expect(container.innerHTML).not.toMatch(/Wind confirmation|prevailing Wind/i);
    expect(container.querySelector('input[aria-label="Wind confirmation"]')).toBeNull();
    await act(async () => {
      clickSeaHit(container, "wizard_strait");
    });
    const payload = mockMutations["m3Commands.moveMarinerStorm"].mock.calls[0][0];
    expect(payload).toMatchObject({
      sourceRegionId: "sidereal_sea",
      destinationRegionId: "wizard_strait",
    });
    expect(payload).not.toHaveProperty("confirmedNotAgainstPrevailingWind");
    root.unmount();
    container.remove();
  });

  it("shows Raider toward only for a Raider ship move", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickRoute(container, RAID_ROUTE);
    flushSync(() => { button(container, MOVE_RAIDER_LABEL).click(); });
    expect(container.querySelector('[aria-label="Ship Raider toward"]')).not.toBeNull();
    root.unmount();
    container.remove();
    const again = renderSurface(initializedMariner(), WIZARD);
    clickRoute(again.container, SHIP_ROUTE);
    flushSync(() => { button(again.container, "Move Ship").click(); });
    expect(again.container.querySelector('[aria-label="Ship Raider toward"]')).toBeNull();
    again.root.unmount();
    again.container.remove();
  });

  it("shows Rampage destination when Create Beast would be surrounded", () => {
    const surrounded = surroundRegion(initializedMariner(), "bay_of_ishana");
    const { container, root } = renderSurface(surrounded, WIZARD);
    clickSea(container, "Bay of Ishana");
    flushSync(() => { button(container, CREATE_BEAST_LABEL).click(); });
    expect(container.querySelector('[aria-label="Rampage destination"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("does not show Rampage destination for an ordinary Create Beast", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, CREATE_BEAST_LABEL).click(); });
    expect(container.querySelector('[aria-label="Rampage destination"]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("records a Market-absorbed Ravage without claiming Lore follow-through", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World scuttleport");
    flushSync(() => { button(container, RAVAGE_RESULT_LABEL).click(); });
    await act(async () => {
      button(container, RAVAGE_RESULT_LABEL).click();
    });
    expect(mockMutations["m3Commands.recordMarinerRavageResult"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "scuttleport",
      expectedMarket: { present: true, rarity: "amber glass" },
      expectedRavageStormCount: 0,
    });
    expect(container.innerHTML).toContain(RAVAGE_MARKET_ABSORBED_COPY);
    expect(container.innerHTML).not.toContain(RAVAGE_INCOMPLETE_COPY);
    expect(container.innerHTML).not.toContain(RAVAGE_LORE_FOLLOW_THROUGH);
    root.unmount();
    container.remove();
  });

  it("says an actual Ravage board result is not the complete source procedure and surfaces follow-through", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickIsle(container, "World orrery");
    flushSync(() => { button(container, RAVAGE_RESULT_LABEL).click(); });
    await act(async () => {
      button(container, RAVAGE_RESULT_LABEL).click();
    });
    expect(mockMutations["m3Commands.recordMarinerRavageResult"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: false },
      expectedRavageStormCount: 0,
    });
    expect(container.innerHTML).toContain(RAVAGE_INCOMPLETE_COPY);
    expect(container.innerHTML).toContain(RAVAGE_LORE_FOLLOW_THROUGH);
    expect(container.innerHTML).toContain(RAVAGE_LOCATION_FOLLOW_THROUGH);
    root.unmount();
    container.remove();
  });

  it("reaches Add Ship and Move Distrusting Beast and submits their semantic payloads", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickRoute(container, SUNKEN_ORRERY_FAR);
    expect(button(container, ADD_SHIP_LABEL)).toBeDefined();
    await act(async () => { button(container, ADD_SHIP_LABEL).click(); });
    expect(mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0]).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: null,
      rampageResolutions: [],
    });
    expect(mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0]).not.toHaveProperty("sourceIsleId");
    root.unmount();
    container.remove();

    const again = renderSurface(initializedMariner(), WIZARD);
    clickSea(again.container, "The Sunken Fleet");
    expect(button(again.container, MOVE_BEAST_LABEL)).toBeDefined();
    flushSync(() => { button(again.container, MOVE_BEAST_LABEL).click(); });
    setSelect(select(again.container, "Beast destination"), "thyrian_sea");
    flushSync(() => { button(again.container, MOVE_BEAST_LABEL).click(); });
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "thyrian_sea",
      rampageResolution: null,
    });
    again.root.unmount();
    again.container.remove();
  });

  it("submits predicted Move Ship Rampage resolutions instead of an empty placeholder", () => {
    const almost = {
      ...initializedMariner(),
      routes: initializedMariner().routes.map((route) => (
        route.routeId === SUNKEN_ORRERY_FAR || route.routeId === SUNKEN_CARAVESSE_FAR
          ? { ...route, occupancy: { kind: "ship" as const } }
          : route
      )),
    };
    const { container, root } = renderSurface(almost, WIZARD);
    clickRoute(container, SHIP_ROUTE);
    flushSync(() => { button(container, "Move Ship").click(); });
    setSelect(select(container, "Ship destination Route"), SUNKEN_CARAVESSE_ORRERY);
    expect(container.querySelector('[aria-label^="Rampage destination"]')).not.toBeNull();
    setSelect(select(container, "Rampage destination"), "hierophant");
    flushSync(() => { button(container, "Move Ship").click(); });
    const payload = mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0];
    expect(payload.destinationRouteId).toBe(SUNKEN_CARAVESSE_ORRERY);
    expect(payload.rampageResolutions).toEqual([expect.objectContaining({
      denizenId: DEN_A,
      destinationSeatId: "hierophant",
    })]);
    expect(payload.rampageResolutions[0].rampagingMethodEntryId).toMatch(/^pdmth_/);
    root.unmount();
    container.remove();
  });

  it("keeps an open Help Beast Nest draft after a realtime change makes the captured Beast stale", () => {
    const initial = initializedMariner();
    const { container, root } = renderSurface(initial, WIZARD);
    clickSea(container, "The Sunken Fleet");
    flushSync(() => { button(container, NEST_BEAST_LABEL).click(); });
    expect(container.querySelector('[aria-label="Nest target Isle"]')).not.toBeNull();
    rerenderSurface(root, withBeast(initial, {
      ...baselineBeast(initial),
      location: { kind: "sea_region", regionId: "thyrian_sea" },
    }));
    expect(container.querySelector('[aria-label="Nest target Isle"]')).not.toBeNull();
    setSelect(select(container, "Nest target Isle"), "orrery");
    flushSync(() => { button(container, NEST_BEAST_LABEL).click(); });
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "orrery",
      expectedBeastLocation: { kind: "sea_region", regionId: "sunken_fleet" },
      expectedBeastCondition: "distrusting",
    });
    root.unmount();
    container.remove();
  });

  it("does not substitute another Lore context when status is null", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD, [], {
      loreCompendium: isleLoreReady(SCUTTLE_WORLD_ISLE, "Owner Scuttleport lore context", "Delegated Scuttleport lore context"),
      pactSeatStatuses: { faustian: null },
    });
    clickIsle(container, "World scuttleport");
    expect(container.innerHTML).toContain(NO_LORE_CONTEXT_COPY);
    expect(container.querySelector('[aria-label="Lore context panel"]')).toBeNull();
    expect(container.innerHTML).not.toContain("Owner Scuttleport lore context");
    expect(container.innerHTML).not.toContain("Delegated Scuttleport lore context");
    root.unmount();
    container.remove();
  });
});

describe("Mariner click-to-guide Storm", () => {
  it("recommends adjacent Seas and still allows a non-adjacent destination", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, GUIDE_STORM_LABEL).click(); });
    const recommended = container.querySelectorAll('[data-map-layer="sea-hit"][data-storm-guide-dest="recommended"]');
    const recommendedIds = [...recommended].map((node) => node.getAttribute("data-region-id"));
    expect(recommendedIds).toEqual(expect.arrayContaining(["wizard_strait", "kings_gulf", "wainways", "southwest_horizon"]));
    expect(recommendedIds).not.toContain("thyrian_sea");
    expect(recommendedIds).not.toContain("sidereal_sea");
    const other = container.querySelector('[data-map-layer="sea-hit"][data-region-id="thyrian_sea"]');
    expect(other?.getAttribute("data-storm-guide-dest")).toBe("available");
    expect(other?.getAttribute("tabindex")).not.toBe("-1");
    expect(other?.getAttribute("aria-disabled")).toBeNull();
    expect(container.innerHTML).not.toMatch(/illegal/i);
    await act(async () => {
      clickSeaHit(container, "thyrian_sea");
    });
    expect(mockMutations["m3Commands.moveMarinerStorm"].mock.calls[0][0]).toMatchObject({
      sourceRegionId: "sidereal_sea",
      destinationRegionId: "thyrian_sea",
    });
    expect(mockMutations["m3Commands.moveMarinerStorm"].mock.calls[0][0]).not.toHaveProperty("confirmedNotAgainstPrevailingWind");
    expect(container.querySelector("[data-sea-polygon]")).toBeNull();
    const hitPath = container.querySelector('[data-map-layer="sea-hit"][data-region-id="wizard_strait"] path')?.getAttribute("d") ?? "";
    expect(hitPath).toContain(" A ");
    root.unmount();
    container.remove();
  });

  it("cancels Guide Storm with Escape without writing", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, GUIDE_STORM_LABEL).click(); });
    expect(container.querySelector("[data-storm-guide-mode]")).not.toBeNull();
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("[data-storm-guide-mode]")).toBeNull();
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("uses the existing moveMarinerStorm command as soon as a destination Sea is clicked", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickSea(container, "The Sidereal Sea");
    flushSync(() => { button(container, GUIDE_STORM_LABEL).click(); });
    await act(async () => {
      clickSeaHit(container, "wizard_strait");
    });
    expect(mockMutations["m3Commands.moveMarinerStorm"].mock.calls[0][0]).toMatchObject({
      sourceRegionId: "sidereal_sea",
      destinationRegionId: "wizard_strait",
    });
    expect(mockMutations["m3Commands.moveMarinerStorm"].mock.calls[0][0]).not.toHaveProperty("confirmedNotAgainstPrevailingWind");
    expect(container.querySelector("[data-storm-guide-mode]")).toBeNull();
    expect(container.querySelector("h4")?.textContent).not.toBe("Record Guided Storm Move");
    root.unmount();
    container.remove();
  });
});

describe("M5.4 table-authoritative Mariner board actions", () => {
  it("submits Add Ship from an empty Route without sourceIsleId or an extra form", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickRoute(container, SUNKEN_ORRERY_FAR);
    expect(container.querySelector("select[aria-label='Create Ship target Route']")).toBeNull();
    await act(async () => { button(container, ADD_SHIP_LABEL).click(); });
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload.targetRouteId).toBe(SUNKEN_ORRERY_FAR);
    expect(payload.destinationToward).toBeNull();
    expect(payload).not.toHaveProperty("sourceIsleId");
    expect(container.querySelector("h4")?.textContent).not.toBe(ADD_SHIP_LABEL);
    root.unmount();
    container.remove();
  });

  it("omits sourceIsleId from Move Ship and does not offer occupied destinations", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickRoute(container, SHIP_ROUTE);
    flushSync(() => { button(container, "Move Ship").click(); });
    const dest = select(container, "Ship destination Route");
    const values = [...dest.options].map((option) => option.value).filter((value) => value !== "");
    expect(values).not.toContain(SHIP_ROUTE);
    expect(values).not.toContain(RAID_ROUTE);
    expect(values).toContain(SUNKEN_ORRERY_FAR);
    setSelect(dest, SUNKEN_ORRERY_FAR);
    flushSync(() => { button(container, "Move Ship").click(); });
    const payload = mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      sourceRouteId: SHIP_ROUTE,
      destinationRouteId: SUNKEN_ORRERY_FAR,
    });
    expect(payload).not.toHaveProperty("sourceIsleId");
    root.unmount();
    container.remove();
  });

  it("keeps generic Route occupancy and Storm-count editors under Advanced / Correct", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    clickRoute(container, SUNKEN_ORRERY_FAR);
    const routeAdvanced = [...container.querySelectorAll("details")].find((node) =>
      (node.querySelector("summary")?.textContent ?? "").includes("Advanced / Correct — Route"),
    );
    expect(routeAdvanced).toBeDefined();
    expect(routeAdvanced?.hasAttribute("open")).toBe(false);
    expect(routeAdvanced?.querySelector('select[aria-label="Route occupancy"]')).not.toBeNull();
    expect(button(routeAdvanced as HTMLElement, "Set Route occupancy")).toBeDefined();
    expect(button(container, ADD_SHIP_LABEL).closest("details")).toBeNull();
    root.unmount();
    container.remove();

    const sea = renderSurface(initializedMariner(), WIZARD);
    clickSea(sea.container, "The Sidereal Sea");
    const weatherAdvanced = [...sea.container.querySelectorAll("details")].find((node) =>
      (node.querySelector("summary")?.textContent ?? "").includes("Advanced / Correct — Weather"),
    );
    expect(weatherAdvanced).toBeDefined();
    expect(weatherAdvanced?.hasAttribute("open")).toBe(false);
    expect(weatherAdvanced?.querySelector('input[aria-label="Storm count"]')).not.toBeNull();
    expect(button(weatherAdvanced as HTMLElement, "Set Storm count")).toBeDefined();
    expect(button(sea.container, GUIDE_STORM_LABEL).closest("details")).toBeNull();
    sea.root.unmount();
    sea.container.remove();
  });

  it("records UX-025 as partially addressed pending Stability and Wind", () => {
    const docs = readFileSync(resolve("docs/m5-4-table-readiness-ux.md"), "utf8");
    const ux025 = docs.slice(docs.indexOf("### UX-025"), docs.indexOf("### UX-026"));
    expect(ux025).toContain("PARTIALLY ADDRESSED — NEEDS HUMAN RETEST");
    expect(ux025).toMatch(/Stability/);
    expect(ux025).not.toContain("FIXED — NEEDS HUMAN RETEST");
  });
});

describe("M5.4 Mariner direct board manipulation", () => {
  it("marks Storm pieces as draggable with move-one-Storm labeling", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const storm = container.querySelector('[data-draggable-storm="true"][data-region-id="sidereal_sea"]');
    expect(storm).not.toBeNull();
    expect(storm?.getAttribute("aria-label")).toMatch(/Move one Storm from/i);
    root.unmount();
    container.remove();
  });

  it("cleans up after a Storm is dragged and released back on its source Sea", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const storm = container.querySelector('[data-draggable-storm="true"][data-region-id="sidereal_sea"]') as Element;
    const sourceSea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="sidereal_sea"]') as Element;
    await dragStormPiece(container, "sidereal_sea", sourceSea, 40);
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(container.querySelector('[data-map-layer="route-hit"][data-route-drop]')).toBeNull();
    await flushScheduledClickSuppressionReset();
    flushSync(() => { sourceSea.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("cleans up after a Ship is dragged and released back on its source Route", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const sourceRoute = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as Element;
    await dragRoutePiece(container, SHIP_ROUTE, SHIP_ROUTE, 42);
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(container.querySelector('[data-map-layer="route-hit"][data-route-drop]')).toBeNull();
    await flushScheduledClickSuppressionReset();
    flushSync(() => { sourceRoute.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("cleans up after a Ship is dropped onto a Route occupied at drag start", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await dragRoutePiece(container, SHIP_ROUTE, RAID_ROUTE, 43);
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(container.querySelector('[data-map-layer="route-hit"][data-route-drop]')).toBeNull();
    root.unmount();
    container.remove();
  });

  it("invokes moveMarinerStorm when a Storm is dragged to another Sea", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const storm = container.querySelector('[data-draggable-storm="true"][data-region-id="sidereal_sea"]') as Element;
    const dest = container.querySelector('[data-map-layer="sea-hit"][data-region-id="wizard_strait"]') as Element;
    const rect = (el: Element) => ({
      left: 10, top: 10, width: 20, height: 20, right: 30, bottom: 30, x: 10, y: 10, toJSON: () => ({}),
    });
    vi.spyOn(storm, "getBoundingClientRect").mockReturnValue(rect(storm) as DOMRect);
    vi.spyOn(dest, "getBoundingClientRect").mockReturnValue({ left: 200, top: 200, width: 40, height: 40, right: 240, bottom: 240, x: 200, y: 200, toJSON: () => ({}) } as DOMRect);
    storm.setPointerCapture = vi.fn();
    const fromPoint = vi.fn(() => dest);
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: fromPoint });
    await act(async () => {
      storm.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 1, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId: 1 }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId: 1 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId: 1 }));
    });
    const payload = mockMutations["m3Commands.moveMarinerStorm"].mock.calls[0]?.[0];
    expect(payload).toMatchObject({ sourceRegionId: "sidereal_sea", destinationRegionId: "wizard_strait" });
    expect(payload).not.toHaveProperty("confirmedNotAgainstPrevailingWind");
    root.unmount();
    container.remove();
  });

  it("selects the Sea on Storm click without crossing the drag threshold", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const storm = container.querySelector('[data-draggable-storm="true"][data-region-id="sidereal_sea"]') as Element;
    flushSync(() => {
      storm.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 2, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 16, clientY: 16, pointerId: 2 }));
    });
    expect(container.querySelector('[data-board-overlay-inspector]')).not.toBeNull();
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("does not render hover command menus on Route, Sea, or Storm hover or focus", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as SVGElement;
    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="wizard_strait"]') as SVGGElement;
    const storm = container.querySelector('[data-draggable-storm="true"][data-region-id="sidereal_sea"]') as SVGGElement;
    const marker = container.querySelector(
      `[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`,
    ) as SVGGElement;
    flushSync(() => { route.focus(); });
    await act(async () => {
      route.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }));
      sea.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }));
      storm.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }));
      marker.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }));
    });
    expect(container.querySelector("[data-route-quick-actions]")).toBeNull();
    expect(container.querySelector("[data-sea-quick-actions]")).toBeNull();
    expect(container.querySelector("[data-storm-piece-quick-actions]")).toBeNull();
    expect(container.querySelector("[data-route-occupancy-remove]")).toBeNull();
    expect(container.querySelector('[data-board-instruction]')?.textContent).toMatch(/Drag from the tray to place or replace/);
    expect(container.querySelector('[data-board-instruction]')?.textContent).toMatch(/R reverses a selected Raider/);
    expect(container.querySelector("[data-piece-tray]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("opens an empty Route context menu at the pointer and Add Ship creates without sourceIsleId", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const menu = openRouteContext(container, SUNKEN_ORRERY_FAR, 88, 44);
    expect(menu.getAttribute("data-pointer-x")).toBe("88");
    expect(menu.getAttribute("data-pointer-y")).toBe("44");
    expect(menu.textContent).toContain("Add Ship");
    expect(menu.textContent).toMatch(/Raider -> World orrery/);
    expect(menu.textContent).toMatch(/Raider -> World far reach/);
    expect(menu.textContent).not.toMatch(/\+R/);
    expect(menu.textContent).not.toMatch(/\+S/);
    const addShip = contextAction(container, "add-ship");
    expect(addShip.getAttribute("aria-label")).toMatch(/Add Ship/i);
    await act(async () => { addShip.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload.targetRouteId).toBe(SUNKEN_ORRERY_FAR);
    expect(payload.destinationToward).toBeNull();
    expect(payload).not.toHaveProperty("sourceIsleId");
    root.unmount();
    container.remove();
  });

  it("Add Raider from context menu submits semantic createMarinerShip with destinationToward", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    const addOrrery = contextAction(container, "add-raider", "board:orrery");
    expect(addOrrery.textContent).toMatch(/Raider -> World orrery/);
    await act(async () => { addOrrery.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0]).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: { kind: "board_isle", boardIsleId: "orrery" },
    });
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    const addFar = contextAction(container, "add-raider", "board:far_reach");
    await act(async () => { addFar.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(mockMutations["m3Commands.createMarinerShip"].mock.calls[1][0].destinationToward).toEqual({
      kind: "board_isle",
      boardIsleId: "far_reach",
    });
    root.unmount();
    container.remove();
  });

  it("context-menu Add Ship keeps the menu-open snapshot after realtime occupancy drift", async () => {
    const start = initializedMariner();
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    rerenderSurface(root, withRealtimeOccupancyDrift(start));
    await act(async () => { contextAction(container, "add-ship").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: null,
      expectedTargetOccupancy: expected.expectedTargetOccupancy,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
    });
    expect(payload.expectedRouteOccupancies).not.toEqual(
      expectedForCreateShip(captureOperabilityBoard(withRealtimeOccupancyDrift(start)), SUNKEN_ORRERY_FAR)
        .expectedRouteOccupancies,
    );
    root.unmount();
    container.remove();
  });

  it("defers context-menu Add Ship that traps a Beast until Rampage destinations are chosen", async () => {
    const start = withSunkenFleetTrapReady(initializedMariner());
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    await act(async () => { contextAction(container, "add-ship").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    await confirmRampageDestination(container);
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      expectedCampaignId: CAMPAIGN_ID,
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: null,
      expectedTargetOccupancy: expected.expectedTargetOccupancy,
      expectedStormCounts: expected.expectedStormCounts,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
    });
    expect(payload.rampageResolutions).toEqual([
      expect.objectContaining({ denizenId: DEN_A, destinationSeatId: "hierophant" }),
    ]);
    expect(payload.rampageResolutions[0].rampagingMethodEntryId).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty("sourceIsleId");
    expect(container.querySelector("[data-ship-rampage-chooser]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("defers quick +Raider that traps a Beast and keeps destinationToward on semantic create", async () => {
    const start = withSunkenFleetTrapReady(initializedMariner());
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    await act(async () => {
      contextAction(container, "add-raider", "board:orrery").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    await confirmRampageDestination(container);
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: { kind: "board_isle", boardIsleId: "orrery" },
      expectedTargetOccupancy: expected.expectedTargetOccupancy,
      expectedStormCounts: expected.expectedStormCounts,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
    });
    expect(payload.rampageResolutions).toEqual([
      expect.objectContaining({ denizenId: DEN_A, destinationSeatId: "hierophant" }),
    ]);
    expect(payload).not.toHaveProperty("sourceIsleId");
    root.unmount();
    container.remove();
  });

  it("defers a dragged Ship that traps a Beast and moves with the drag-start snapshot", async () => {
    const start = withSunkenFleetTrapReady(initializedMariner());
    const expected = expectedForMoveShip(captureOperabilityBoard(start), SHIP_ROUTE, SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    await dragRoutePiece(container, SHIP_ROUTE, SUNKEN_ORRERY_FAR, 31);
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    await confirmRampageDestination(container);
    const payload = mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      sourceRouteId: SHIP_ROUTE,
      destinationRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: null,
      expectedSourceOccupancy: expected.expectedSourceOccupancy,
      expectedDestinationOccupancy: expected.expectedDestinationOccupancy,
      expectedStormCounts: expected.expectedStormCounts,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
    });
    expect(payload.rampageResolutions).toEqual([
      expect.objectContaining({ denizenId: DEN_A, destinationSeatId: "hierophant" }),
    ]);
    root.unmount();
    container.remove();
  });

  it("keeps the action-start snapshot after realtime Mariner state changes in the Rampage chooser", async () => {
    const start = withSunkenFleetTrapReady(initializedMariner());
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    await act(async () => { contextAction(container, "add-ship").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    rerenderSurface(root, withRealtimeOccupancyDrift(start));
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    await confirmRampageDestination(container);
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload.expectedRouteOccupancies).toEqual(expected.expectedRouteOccupancies);
    expect(payload.expectedRelevantBeasts).toEqual(expected.expectedRelevantBeasts);
    expect(payload.expectedRouteOccupancies).not.toEqual(
      expectedForCreateShip(captureOperabilityBoard(withRealtimeOccupancyDrift(start)), SUNKEN_ORRERY_FAR)
        .expectedRouteOccupancies,
    );
    root.unmount();
    container.remove();
  });

  it("builds a Raider direction-choice move from the drag-start snapshot, not a later board", async () => {
    const start = initializedMariner();
    const expected = expectedForMoveShip(captureOperabilityBoard(start), RAID_ROUTE, SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    await dragRoutePiece(container, RAID_ROUTE, SUNKEN_ORRERY_FAR, 32);
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-raider-direction-chooser]")).not.toBeNull();
    rerenderSurface(root, withRealtimeOccupancyDrift(start));
    await act(async () => { button(container, "World orrery").click(); });
    const payload = mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      sourceRouteId: RAID_ROUTE,
      destinationRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: { kind: "board_isle", boardIsleId: "orrery" },
      expectedSourceOccupancy: expected.expectedSourceOccupancy,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
    });
    expect(payload.expectedRouteOccupancies).not.toEqual(
      expectedForMoveShip(
        captureOperabilityBoard(withRealtimeOccupancyDrift(start)),
        RAID_ROUTE,
        SUNKEN_ORRERY_FAR,
      ).expectedRouteOccupancies,
    );
    root.unmount();
    container.remove();
  });

  it("carries the original drag snapshot from Raider direction choice into the Rampage chooser", async () => {
    const start = withSunkenFleetTrapReady(initializedMariner());
    const expected = expectedForMoveShip(captureOperabilityBoard(start), RAID_ROUTE, SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    await dragRoutePiece(container, RAID_ROUTE, SUNKEN_ORRERY_FAR, 33);
    expect(container.querySelector("[data-raider-direction-chooser]")).not.toBeNull();
    rerenderSurface(root, withRealtimeOccupancyDrift(start));
    await act(async () => { button(container, "World orrery").click(); });
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    await confirmRampageDestination(container);
    const payload = mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      sourceRouteId: RAID_ROUTE,
      destinationRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: { kind: "board_isle", boardIsleId: "orrery" },
      expectedStormCounts: expected.expectedStormCounts,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
    });
    root.unmount();
    container.remove();
  });

  it("context-menu Remove on occupied Route is not nested under the draggable piece pointerdown", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    const marker = container.querySelector(
      `[data-route-occupancy-marker="ship"][data-route-id="${SHIP_ROUTE}"]`,
    ) as SVGGElement;
    const menu = openOccupiedRouteContext(container, SHIP_ROUTE, 40, 50);
    expect(marker.contains(menu)).toBe(false);
    const remove = contextAction(container, "remove-occupancy");
    await act(async () => {
      remove.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 40,
        clientY: 50,
        pointerId: 88,
        isPrimary: true,
        button: 0,
      }));
      window.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        clientX: 41,
        clientY: 50,
        pointerId: 88,
        button: 0,
      }));
      remove.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      expectedCampaignId: CAMPAIGN_ID,
      routeId: SHIP_ROUTE,
      expectedOccupancy: { kind: "ship" },
      occupancy: { kind: "empty" },
    });
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("occupied Route context Remove keeps the menu-open occupancy after later board drift", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    openOccupiedRouteContext(container, SHIP_ROUTE);
    rerenderSurface(root, {
      ...start,
      routes: start.routes.map((route) =>
        route.routeId === SHIP_ROUTE
          ? { ...route, occupancy: { kind: "raider" as const, toward: { kind: "board_isle" as const, boardIsleId: "thyras" } } }
          : route
      ),
    });
    await act(async () => {
      contextAction(container, "remove-occupancy").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: SHIP_ROUTE,
      expectedOccupancy: { kind: "ship" },
      occupancy: { kind: "empty" },
    });
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("drags an ordinary Ship onto an empty Route with moveMarinerShip", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await dragRoutePiece(container, SHIP_ROUTE, SUNKEN_ORRERY_FAR, 34);
    expect(mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0]).toMatchObject({
      sourceRouteId: SHIP_ROUTE,
      destinationRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: null,
    });
    expect(container.querySelector("[data-ship-rampage-chooser]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("shows distinct Beast names in the board Rampage chooser and maps each destination to the correct denizenId", async () => {
    const start = withTwoSunkenFleetBeastsTrapReady(initializedMariner());
    const { container, root } = renderSurface(start, WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    await act(async () => { contextAction(container, "add-ship").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const chooser = container.querySelector("[data-ship-rampage-chooser]") as HTMLElement;
    expect(chooser.textContent).toContain("Kraken-kin");
    expect(chooser.textContent).toContain("Spare Leviathan");
    const krakenSelect = chooser.querySelector('select[aria-label="Rampage destination for Kraken-kin"]') as HTMLSelectElement;
    const leviathanSelect = chooser.querySelector('select[aria-label="Rampage destination for Spare Leviathan"]') as HTMLSelectElement;
    expect(krakenSelect).not.toBeNull();
    expect(leviathanSelect).not.toBeNull();
    setSelect(krakenSelect, "hierophant");
    setSelect(leviathanSelect, "necromancer");
    await act(async () => { button(chooser, "Confirm Rampage").click(); });
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload.rampageResolutions).toEqual([
      expect.objectContaining({ denizenId: DEN_A, destinationSeatId: "hierophant" }),
      expect.objectContaining({ denizenId: DEN_B, destinationSeatId: "necromancer" }),
    ]);
    root.unmount();
    container.remove();
  });

  it("preserves an existing Raider toward when it remains valid on the destination Route", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await dragRoutePiece(container, RAID_ROUTE, ISHANA_DRUNTYR, 35);
    expect(container.querySelector("[data-raider-direction-chooser]")).toBeNull();
    expect(mockMutations["m3Commands.moveMarinerShip"].mock.calls[0][0]).toMatchObject({
      sourceRouteId: RAID_ROUTE,
      destinationRouteId: ISHANA_DRUNTYR,
      destinationToward: { kind: "board_isle", boardIsleId: "ishana" },
    });
    root.unmount();
    container.remove();
  });

  it("adds and removes Storms from Sea context menus using the menu-open storm count", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    openSeaContext(container, "wizard_strait");
    expect(container.querySelector("[data-mariner-context-menu]")?.textContent).toContain("Add Storm");
    expect(container.querySelector('[data-context-action="remove-storm"]')).toBeNull();
    await act(async () => { contextAction(container, "add-storm").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"].mock.calls[0][0]).toMatchObject({
      regionId: "wizard_strait",
      expectedStormCount: 0,
      stormCount: 1,
    });
    const storm = container.querySelector('[data-draggable-storm="true"][data-region-id="sidereal_sea"]') as Element;
    openContextOn(storm, 70, 60);
    await act(async () => { contextAction(container, "remove-storm").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"].mock.calls[1][0]).toMatchObject({
      regionId: "sidereal_sea",
      expectedStormCount: 2,
      stormCount: 1,
    });
    root.unmount();
    container.remove();
  });

  it("closes the context menu on Escape and outside click, and prevents native menu only on board targets", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as Element;
    const routeEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20, button: 2 });
    flushSync(() => { route.dispatchEvent(routeEvent); });
    expect(routeEvent.defaultPrevented).toBe(true);
    expect(container.querySelector("[data-mariner-context-menu]")).not.toBeNull();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    });
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();
    const isle = container.querySelector('[data-map-layer="isle"]') as Element;
    const isleEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 12, clientY: 12, button: 2 });
    flushSync(() => { isle.dispatchEvent(isleEvent); });
    expect(isleEvent.defaultPrevented).toBe(true);
    expect(container.querySelector('[data-mariner-context-menu][data-context-menu-kind="isle"]')).not.toBeNull();
    const instruction = container.querySelector("[data-board-instruction]") as Element;
    const instructionEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 8, clientY: 8, button: 2 });
    flushSync(() => { instruction.dispatchEvent(instructionEvent); });
    expect(instructionEvent.defaultPrevented).toBe(false);
    root.unmount();
    container.remove();
  });

  it("does not open a Mariner context menu while a Raider-direction intent is pending", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const empty = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as Element;
    await dragTrayPiece(container, "raider", empty, 71);
    const chooser = container.querySelector("[data-raider-direction-chooser]") as HTMLElement;
    expect(chooser).not.toBeNull();
    const chooserCopy = chooser.textContent;

    const otherRoute = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as Element;
    const routeEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 20,
      button: 2,
    });
    flushSync(() => { otherRoute.dispatchEvent(routeEvent); });
    expect(routeEvent.defaultPrevented).toBe(true);
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();

    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="wizard_strait"]') as Element;
    const seaEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 30,
      button: 2,
    });
    flushSync(() => { sea.dispatchEvent(seaEvent); });
    expect(seaEvent.defaultPrevented).toBe(true);
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();
    expect(container.querySelector("[data-raider-direction-chooser]")).toBe(chooser);
    expect(container.querySelector("[data-raider-direction-chooser]")?.textContent).toBe(chooserCopy);
    root.unmount();
    container.remove();
  });

  it("does not open a Mariner context menu while a server action is pending", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD, [], { pending: true });
    const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as Element;
    const routeEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 20,
      button: 2,
    });
    flushSync(() => { route.dispatchEvent(routeEvent); });
    expect(routeEvent.defaultPrevented).toBe(true);
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();

    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="wizard_strait"]') as Element;
    const seaEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 22,
      clientY: 22,
      button: 2,
    });
    flushSync(() => { sea.dispatchEvent(seaEvent); });
    expect(seaEvent.defaultPrevented).toBe(true);
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("closes a stale context menu without mutating if the board becomes busy before the click", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    openRouteContext(container, SUNKEN_ORRERY_FAR);
    expect(container.querySelector("[data-mariner-context-menu]")).not.toBeNull();
    rerenderSurface(root, initializedMariner(), WIZARD, { pending: true });
    expect(container.querySelector("[data-mariner-context-menu]")).not.toBeNull();
    await act(async () => {
      contextAction(container, "add-ship").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();
    expect(container.querySelector("[data-raider-direction-chooser]")).toBeNull();
    expect(container.querySelector("[data-ship-rampage-chooser]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("places a tray Ship on an empty Route with the pointerdown snapshot, replaces Raider, and no-ops same-type or off-board drops", async () => {
    const start = initializedMariner();
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    const empty = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as Element;
    const shipOccupied = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as Element;
    const raiderOccupied = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${RAID_ROUTE}"]`) as Element;
    await dragTrayPiece(container, "ship", shipOccupied, 61);
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    await dragTrayPiece(container, "ship", raiderOccupied, 611);
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: RAID_ROUTE,
      expectedOccupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      occupancy: { kind: "ship" },
    });
    await dragTrayPiece(container, "ship", document.body, 62);
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    await dragTrayPiece(container, "ship", empty, 63);
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: null,
      expectedTargetOccupancy: expected.expectedTargetOccupancy,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
    });
    expect(payload).not.toHaveProperty("sourceIsleId");
    root.unmount();
    container.remove();
  });

  it("opens a tray Raider direction chooser after a valid drop and does not guess an endpoint", async () => {
    const start = initializedMariner();
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    const empty = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as Element;
    await dragTrayPiece(container, "raider", empty, 64);
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    const chooser = container.querySelector("[data-raider-direction-chooser]") as HTMLElement;
    expect(chooser).not.toBeNull();
    expect(chooser.textContent).toMatch(/Raider -> World orrery/);
    expect(chooser.textContent).toMatch(/Raider -> World far reach/);
    await act(async () => { button(chooser, "Raider -> World orrery").click(); });
    expect(mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0]).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: { kind: "board_isle", boardIsleId: "orrery" },
      expectedTargetOccupancy: expected.expectedTargetOccupancy,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
    });
    root.unmount();
    container.remove();
  });

  it("keeps the original tray Raider snapshot through direction choice and Rampage after realtime drift", async () => {
    const start = withSunkenFleetTrapReady(initializedMariner());
    const expected = expectedForCreateShip(captureOperabilityBoard(start), SUNKEN_ORRERY_FAR);
    const { container, root } = renderSurface(start, WIZARD);
    const empty = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SUNKEN_ORRERY_FAR}"]`) as Element;
    await dragTrayPiece(container, "raider", empty, 65);
    expect(container.querySelector("[data-raider-direction-chooser]")).not.toBeNull();
    rerenderSurface(root, withRealtimeOccupancyDrift(start));
    await act(async () => { button(container, "Raider -> World orrery").click(); });
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-ship-rampage-chooser]")).not.toBeNull();
    await confirmRampageDestination(container);
    const payload = mockMutations["m3Commands.createMarinerShip"].mock.calls[0][0];
    expect(payload).toMatchObject({
      targetRouteId: SUNKEN_ORRERY_FAR,
      destinationToward: { kind: "board_isle", boardIsleId: "orrery" },
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
    });
    expect(payload.expectedRouteOccupancies).not.toEqual(
      expectedForCreateShip(captureOperabilityBoard(withRealtimeOccupancyDrift(start)), SUNKEN_ORRERY_FAR)
        .expectedRouteOccupancies,
    );
    root.unmount();
    container.remove();
  });

  it("places a tray Storm on a Sea with the pointerdown storm count and does not move Storms", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="wizard_strait"]') as Element;
    await dragTrayPiece(container, "storm", sea, 66);
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"].mock.calls[0][0]).toMatchObject({
      regionId: "wizard_strait",
      expectedStormCount: 0,
      stormCount: 1,
    });
    root.unmount();
    container.remove();
  });

  it("Delete and Backspace remove a selected occupied Route or decrement a selected Storm region, but not while editing", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const occupied = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as Element;
    flushSync(() => { occupied.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: SHIP_ROUTE,
      expectedOccupancy: { kind: "ship" },
      occupancy: { kind: "empty" },
    });
    const sea = container.querySelector('[data-map-layer="sea-hit"][data-region-id="sidereal_sea"]') as Element;
    flushSync(() => { sea.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"].mock.calls[0][0]).toMatchObject({
      regionId: "sidereal_sea",
      expectedStormCount: 2,
      stormCount: 1,
    });
    const stormCalls = mockMutations["m3Commands.setMarinerSeaStormCount"].mock.calls.length;
    const occupancyCalls = mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls.length;
    const input = container.querySelector('input[aria-label="Storm count"]') as HTMLInputElement;
    input.focus();
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"].mock.calls.length).toBe(stormCalls);
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls.length).toBe(occupancyCalls);
    root.unmount();
    container.remove();
  });

  it("opens a tray Raider direction chooser when dropping on Ship and replaces with the pointerdown snapshot", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    const shipRoute = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as Element;
    await dragTrayPiece(container, "raider", shipRoute, 701);
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-raider-direction-chooser]")).not.toBeNull();
    rerenderSurface(root, withRealtimeOccupancyDrift(start));
    await act(async () => { button(container, "Raider -> World thyras").click(); });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: SHIP_ROUTE,
      expectedOccupancy: { kind: "ship" },
      occupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "thyras" } },
    });
    root.unmount();
    container.remove();
  });

  it("no-ops tray Raider onto an existing Raider", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const raiderRoute = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${RAID_ROUTE}"]`) as Element;
    await dragTrayPiece(container, "raider", raiderRoute, 702);
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.createMarinerShip"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-raider-direction-chooser]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("still blocks dragging an on-board piece onto an occupied Route", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await dragRoutePiece(container, SHIP_ROUTE, RAID_ROUTE, 703);
    expect(mockMutations["m3Commands.moveMarinerShip"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("classifies tray Ship drag drop targets: Raider valid, Ship blocked", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await hoverTrayDragOverRoute(container, "ship", RAID_ROUTE, 710);
    expect(routeDropState(container, RAID_ROUTE)).toMatch(/^(available|hover|recommended)$/);
    expect(routeDropState(container, SHIP_ROUTE)).toBe("blocked");
    root.unmount();
    container.remove();
  });

  it("classifies tray Raider drag drop targets: Ship valid, Raider blocked", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await hoverTrayDragOverRoute(container, "raider", SHIP_ROUTE, 711);
    expect(routeDropState(container, SHIP_ROUTE)).toMatch(/^(available|hover|recommended)$/);
    expect(routeDropState(container, RAID_ROUTE)).toBe("blocked");
    root.unmount();
    container.remove();
  });

  it("classifies on-board piece drag drop targets on occupied Routes as blocked during drag", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await hoverRoutePieceDragOverRoute(container, SHIP_ROUTE, RAID_ROUTE, 712);
    expect(routeDropState(container, RAID_ROUTE)).toBe("blocked");
    root.unmount();
    container.remove();
  });

  it("renders a positive drop halo on a valid occupied replacement Route during tray Ship drag", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await hoverTrayDragOverRoute(container, "ship", RAID_ROUTE, 713);
    const raiderHit = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${RAID_ROUTE}"]`) as HTMLElement;
    expect(raiderHit.querySelector("[data-drop-halo]")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("right-click Raider offers reverse and change-to-ship with menu-open snapshots", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    openOccupiedRouteContext(container, RAID_ROUTE);
    await act(async () => { contextAction(container, "reverse-raider").click(); });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: RAID_ROUTE,
      expectedOccupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      occupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "scuttleport" } },
    });
    openOccupiedRouteContext(container, RAID_ROUTE);
    await act(async () => { contextAction(container, "change-to-ship").click(); });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[1][0]).toMatchObject({
      routeId: RAID_ROUTE,
      expectedOccupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      occupancy: { kind: "ship" },
    });
    root.unmount();
    container.remove();
  });

  it("right-click Ship offers change-to-Raider toward both endpoints", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    openOccupiedRouteContext(container, SHIP_ROUTE);
    await act(async () => { contextAction(container, "change-to-raider", "board:thyras").click(); });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: SHIP_ROUTE,
      expectedOccupancy: { kind: "ship" },
      occupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "thyras" } },
    });
    openOccupiedRouteContext(container, SHIP_ROUTE);
    await act(async () => { contextAction(container, "change-to-raider", "board:far_reach").click(); });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[1][0]).toMatchObject({
      occupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "far_reach" } },
    });
    root.unmount();
    container.remove();
  });

  it("keyboard R reverses a selected Raider but ignores editable targets and non-Raider selections", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const raiderRoute = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${RAID_ROUTE}"]`) as Element;
    flushSync(() => { raiderRoute.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls[0][0]).toMatchObject({
      routeId: RAID_ROUTE,
      occupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "scuttleport" } },
    });
    const shipRoute = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as Element;
    flushSync(() => { shipRoute.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const callsBefore = mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls.length;
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "R", bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls.length).toBe(callsBefore);
    const input = container.querySelector('select[aria-label="Change Mariner ship"]') as HTMLSelectElement;
    input.focus();
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true }));
    });
    expect(mockMutations["m3Commands.setMarinerRouteOccupancy"].mock.calls.length).toBe(callsBefore);
    root.unmount();
    container.remove();
  });

  it("does not move focus to the board stage on initial Mariner mount", () => {
    const external = document.createElement("button");
    external.type = "button";
    external.textContent = "External control";
    document.body.appendChild(external);
    external.focus();
    expect(document.activeElement).toBe(external);
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const stage = container.querySelector("[data-mariner-board-stage]") as HTMLElement;
    expect(document.activeElement).toBe(external);
    expect(document.activeElement).not.toBe(stage);
    root.unmount();
    container.remove();
    external.remove();
  });

  it("Escape dismisses selection and moves focus to the board stage instead of the Route hit target", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as HTMLElement;
    flushSync(() => { route.focus(); });
    flushSync(() => { route.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(document.activeElement).toBe(route);
    expect(container.querySelector("[data-board-overlay-inspector]")).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    const stage = container.querySelector("[data-mariner-board-stage]") as HTMLElement;
    expect(document.activeElement).toBe(stage);
    expect(document.activeElement).not.toBe(route);
    root.unmount();
    container.remove();
  });

  it("inspector Close dismisses selection and moves focus to the board stage instead of the Route hit target", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const route = container.querySelector(`[data-map-layer="route-hit"][data-route-id="${SHIP_ROUTE}"]`) as HTMLElement;
    flushSync(() => { route.focus(); });
    flushSync(() => { route.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(document.activeElement).toBe(route);
    act(() => {
      button(container, "Close").click();
    });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    const stage = container.querySelector("[data-mariner-board-stage]") as HTMLElement;
    expect(document.activeElement).toBe(stage);
    expect(document.activeElement).not.toBe(route);
    root.unmount();
    container.remove();
  });

  it("records UX-024 drag/drop as fixed pending human retest", () => {
    const docs = readFileSync(resolve("docs/m5-4-table-readiness-ux.md"), "utf8");
    const section = docs.slice(docs.indexOf("### UX-024"), docs.indexOf("### UX-025"));
    expect(section).toContain("FIXED — NEEDS HUMAN RETEST");
    expect(section).toMatch(/direct Storm piece drag/i);
    expect(section).not.toMatch(/Drag\/drop remains DEFERRED/i);
  });
});

function beastPiece(container: HTMLElement, denizenId: string): Element {
  const piece = container.querySelector(`[data-piece="beast"][data-beast-id="${denizenId}"]`) as Element | null;
  if (piece === null) throw new Error(`Missing Beast piece ${denizenId}`);
  return piece;
}

function isleHit(container: HTMLElement, boardIsleId: string): Element {
  const isle = container.querySelector(`[data-map-layer="isle"][data-isle-id="${boardIsleId}"]`) as Element | null;
  if (isle === null) throw new Error(`Missing Isle ${boardIsleId}`);
  return isle;
}

function seaHit(container: HTMLElement, regionId: string): Element {
  const sea = container.querySelector(`[data-map-layer="sea-hit"][data-region-id="${regionId}"]`) as Element | null;
  if (sea === null) throw new Error(`Missing Sea ${regionId}`);
  return sea;
}

async function dragBeastPiece(
  container: HTMLElement,
  denizenId: string,
  dropTarget: Element | null,
  pointerId = 81,
): Promise<void> {
  const piece = beastPiece(container, denizenId);
  (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dropTarget });
  await act(async () => {
    piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId, isPrimary: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

async function hoverBeastDragOver(
  container: HTMLElement,
  denizenId: string,
  dropTarget: Element,
  pointerId = 82,
): Promise<void> {
  const piece = beastPiece(container, denizenId);
  (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dropTarget });
  await act(async () => {
    piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId, isPrimary: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

function openBeastContext(container: HTMLElement, denizenId: string, clientX = 88, clientY = 44): HTMLElement {
  openContextOn(beastPiece(container, denizenId), clientX, clientY);
  const menu = container.querySelector("[data-mariner-context-menu]") as HTMLElement | null;
  if (menu === null) throw new Error("Missing Beast context menu");
  return menu;
}

function openIsleContext(container: HTMLElement, boardIsleId: string, clientX = 70, clientY = 36): HTMLElement {
  openContextOn(isleHit(container, boardIsleId), clientX, clientY);
  const menu = container.querySelector("[data-mariner-context-menu]") as HTMLElement | null;
  if (menu === null) throw new Error("Missing Isle context menu");
  return menu;
}

function withIsleMarket(
  mariner: MarinerState,
  boardIsleId: MarinerBoardIsleId,
  market: MarinerState["boardIsles"][number]["market"],
): MarinerState {
  return {
    ...mariner,
    boardIsles: mariner.boardIsles.map((isle) => (
      isle.boardIsleId === boardIsleId ? { ...isle, market } : isle
    )),
  };
}

function withNestingBeastOnIsle(mariner: MarinerState, boardIsleId: MarinerBoardIsleId): MarinerState {
  return {
    ...mariner,
    beasts: [
      ...mariner.beasts,
      {
        denizenId: DEN_B as DenizenId,
        element: "water",
        definitionId: "kraken",
        condition: "friendly_nesting",
        location: { kind: "board_isle", boardIsleId },
      },
    ],
  };
}

function withFriendlyNestingOnIsle(mariner: MarinerState, boardIsleId: MarinerBoardIsleId): MarinerState {
  return withBeast(mariner, {
    ...baselineBeast(mariner),
    condition: "friendly_nesting",
    location: { kind: "board_isle", boardIsleId },
  });
}

function isleDropState(container: HTMLElement, boardIsleId: string): string | null {
  return isleHit(container, boardIsleId).getAttribute("data-isle-drop");
}

async function confirmBeastRampage(container: HTMLElement, seatId = "hierophant"): Promise<void> {
  const chooser = container.querySelector("[data-beast-rampage-chooser]") as HTMLElement | null;
  if (chooser === null) throw new Error("Missing Beast Rampage chooser");
  const dest = chooser.querySelector('select[aria-label^="Rampage destination"]') as HTMLSelectElement | null;
  if (dest === null) throw new Error("Missing Beast Rampage destination");
  setSelect(dest, seatId);
  await act(async () => { button(chooser, "Confirm Rampage").click(); });
}

describe("M5.4 Mariner Beast and Market board controls", () => {
  it("A: clicks a Beast to select the Beast and does not select after a threshold drag", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const piece = beastPiece(container, DEN_A);
    (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 2, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 15, clientY: 15, pointerId: 2 }));
    });
    const inspector = container.querySelector("[data-board-overlay-inspector]")?.textContent ?? "";
    expect(inspector).toContain("Kraken-kin");
    expect(inspector).toMatch(/Distrusting/);
    expect(inspector).toContain("The Sunken Fleet");
    expect(inspector).not.toMatch(/Create Beast/);
    expect(piece.getAttribute("data-beast-selected")).toBe("true");
    expect(container.querySelector("[data-beast-selection-halo]")).not.toBeNull();
    await act(async () => {
      button(container, "Close").click();
    });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => seaHit(container, "sunken_fleet"),
    });
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 3, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId: 3 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 30, clientY: 15, pointerId: 3 }));
    });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("B: drags a Distrusting Beast to an adjacent Sea with the pointerdown snapshot", async () => {
    const start = initializedMariner();
    const expected = expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "sunken_fleet", "wizard_strait");
    const { container, root } = renderSurface(start, WIZARD);
    await dragBeastPiece(container, DEN_A, seaHit(container, "wizard_strait"), 83);
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "wizard_strait",
      expectedBeast: expected.expectedBeast,
      expectedStormCounts: expected.expectedStormCounts,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
      rampageResolution: null,
    });
    root.unmount();
    container.remove();
  });

  it("C: same-source and off-map Beast drops do not mutate", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    await dragBeastPiece(container, DEN_A, seaHit(container, "sunken_fleet"), 84);
    await dragBeastPiece(container, DEN_A, document.body, 86);
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.nestMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("D: drags a Distrusting Beast onto an adjacent Isle as nest and highlights the valid target", async () => {
    const start = initializedMariner();
    const expected = expectedForNestBeast(captureOperabilityBoard(start), DEN_A, "orrery");
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "orrery"), 87);
    expect(isleDropState(container, "orrery")).toMatch(/^(recommended|hover|available)$/);
    await dragBeastPiece(container, DEN_A, isleHit(container, "orrery"), 88);
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "orrery",
      expectedBeastCondition: expected.expectedBeastCondition,
      expectedBeastLocation: expected.expectedBeastLocation,
      expectedMarket: expected.expectedMarket,
      expectedRavageStormCount: expected.expectedRavageStormCount,
      expectedNestingBeastDenizenId: expected.expectedNestingBeastDenizenId,
    });
    root.unmount();
    container.remove();
  });

  it("E: Market Isles accept Nest; existing Nesting-Beast Isles still block", async () => {
    const withMarket = withIsleMarket(initializedMariner(), "orrery", { present: true, rarity: null });
    const expected = expectedForNestBeast(captureOperabilityBoard(withMarket), DEN_A, "orrery");
    const { container, root } = renderSurface(withMarket, WIZARD);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "orrery"), 89);
    expect(isleDropState(container, "orrery")).toMatch(/^(recommended|hover|available)$/);
    await dragBeastPiece(container, DEN_A, isleHit(container, "orrery"), 90);
    expect(mockMutations["m3Commands.nestMarinerBeast"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "orrery",
      expectedMarket: expected.expectedMarket,
    });
    expect(expected.expectedMarket).toEqual({ present: true, rarity: null });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();

    const nested = withNestingBeastOnIsle(initializedMariner(), "far_reach");
    const again = renderSurface(nested, WIZARD);
    await hoverBeastDragOver(again.container, DEN_A, isleHit(again.container, "far_reach"), 91);
    expect(isleDropState(again.container, "far_reach")).toBe("blocked");
    await dragBeastPiece(again.container, DEN_A, isleHit(again.container, "far_reach"), 92);
    expect(mockMutations["m3Commands.nestMarinerBeast"]).toHaveBeenCalledTimes(1);
    again.root.unmount();
    again.container.remove();
  });

  it("F: predicted Beast Rampage opens a chooser, keeps the pointerdown snapshot, and does not rebase after drift", async () => {
    const start = surroundRegion(initializedMariner(), "koiran_reef");
    const expected = expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "sunken_fleet", "koiran_reef");
    const drifted: MarinerState = {
      ...start,
      seaRegions: start.seaRegions.map((region) =>
        region.regionId === "wizard_strait" ? { ...region, stormCount: 1 } : region
      ),
    };
    const { container, root } = renderSurface(start, WIZARD);
    await dragBeastPiece(container, DEN_A, seaHit(container, "koiran_reef"), 93);
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-beast-rampage-chooser]")).not.toBeNull();
    expect(container.querySelector("[data-ship-rampage-chooser]")).toBeNull();
    rerenderSurface(root, drifted);
    await confirmBeastRampage(container);
    const payload = mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0];
    expect(payload).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "koiran_reef",
      expectedBeast: expected.expectedBeast,
      expectedStormCounts: expected.expectedStormCounts,
      expectedRouteOccupancies: expected.expectedRouteOccupancies,
      expectedRelevantBeasts: expected.expectedRelevantBeasts,
      rampageResolution: {
        denizenId: DEN_A,
        destinationSeatId: "hierophant",
      },
    });
    expect(payload.expectedStormCounts).not.toEqual(
      expectedForMoveBeast(captureOperabilityBoard(drifted), DEN_A, "sunken_fleet", "koiran_reef").expectedStormCounts,
    );
    root.unmount();
    container.remove();
  });

  it("G: right-click Beast offers Move, Nest, and confirmed Remove without the Sea menu replacing it", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    const menu = openBeastContext(container, DEN_A);
    expect(menu.getAttribute("data-context-menu-kind")).toBe("beast");
    expect(menu.textContent).toMatch(/Move ->/);
    expect(menu.textContent).toMatch(/Nest ->/);
    expect(menu.textContent).toContain("Remove Beast");
    expect(container.querySelector('[data-context-action="add-storm"]')).toBeNull();
    await act(async () => { contextAction(container, "move-beast", undefined).click(); });
    expect(mockMutations["m3Commands.moveMarinerBeast"]).toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
    });

    openBeastContext(container, DEN_A);
    await act(async () => { contextAction(container, "remove-beast").click(); });
    expect(mockMutations["m3Commands.removeMarinerBeast"]).not.toHaveBeenCalled();
    const confirm = container.querySelector("[data-beast-remove-confirm]") as HTMLElement;
    expect(confirm.textContent).toContain("Remove Kraken-kin?");
    rerenderSurface(root, withBeast(start, { ...baselineBeast(start), element: "fire" }));
    await act(async () => { button(confirm, "Remove").click(); });
    expect(mockMutations["m3Commands.removeMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      expectedBeast: baselineBeast(start),
    });
    expect(mockMutations["m3Commands.createMarinerBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("G: nesting Beast context offers Remove plus Nest relocation alternatives and is draggable", async () => {
    const nested = withBeast(initializedMariner(), {
      ...baselineBeast(initializedMariner()),
      condition: "friendly_nesting",
      location: { kind: "board_isle", boardIsleId: "sage_atoll" },
    });
    const { container, root } = renderSurface(nested, WIZARD);
    const piece = beastPiece(container, DEN_A);
    expect(piece.getAttribute("data-draggable-beast")).toBe("true");
    const menu = openBeastContext(container, DEN_A);
    expect(menu.querySelector('[data-context-action="move-beast"]')).toBeNull();
    expect(menu.querySelector('[data-context-action="nest-beast"]')).toBeNull();
    expect(menu.querySelector('[data-context-action="relocate-nest-elsewhere"]')).not.toBeNull();
    expect(menu.querySelector('[data-context-action="leave-nest-to-sea"]')).not.toBeNull();
    expect(menu.querySelector('[data-context-action="remove-beast"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("H: Add Beast uses an unused World Denizen and does not create one", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    openSeaContext(container, "wizard_strait");
    await act(async () => { contextAction(container, "add-beast").click(); });
    const chooser = container.querySelector("[data-beast-add-chooser]") as HTMLElement;
    expect(chooser).not.toBeNull();
    expect(chooser.textContent).not.toContain("No available Beast-profile World Denizens.");
    setSelect(select(chooser, "Add Beast Denizen"), DEN_B);
    setSelect(select(chooser, "Beast Element"), "water");
    await act(async () => { button(chooser, "Add Beast").click(); });
    expect(mockMutations["m3Commands.createMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.addMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_B,
      element: "water",
      condition: "distrusting",
      location: { kind: "sea_region", regionId: "wizard_strait" },
    });

    openIsleContext(container, "orrery");
    await act(async () => { contextAction(container, "add-beast").click(); });
    const isleChooser = container.querySelector("[data-beast-add-chooser]") as HTMLElement;
    setSelect(select(isleChooser, "Add Beast Denizen"), DEN_B);
    setSelect(select(isleChooser, "Beast Element"), "earth");
    await act(async () => { button(isleChooser, "Add Beast").click(); });
    expect(mockMutations["m3Commands.addMarinerBeast"].mock.calls[1][0]).toMatchObject({
      denizenId: DEN_B,
      element: "earth",
      condition: "friendly_nesting",
      location: { kind: "board_isle", boardIsleId: "orrery" },
    });
    root.unmount();
    container.remove();

    const used = withNestingBeastOnIsle(initializedMariner(), "sage_atoll");
    const again = renderSurface(used, WIZARD);
    openIsleContext(again.container, "ishana");
    expect(again.container.querySelector('[data-context-action="add-beast"]')).not.toBeNull();
    openIsleContext(again.container, "sage_atoll");
    expect(again.container.querySelector('[data-context-action="add-beast"]')).toBeNull();
    openIsleContext(again.container, "druntyr");
    expect(again.container.querySelector('[data-context-action="add-beast"]')).toBeNull();
    openSeaContext(again.container, "wizard_strait");
    await act(async () => { contextAction(again.container, "add-beast").click(); });
    expect(again.container.querySelector("[data-beast-add-chooser]")?.textContent).toContain(
      "No available Beast-profile World Denizens.",
    );
    expect(mockMutations["m3Commands.createMarinerBeast"]).not.toHaveBeenCalled();
    again.root.unmount();
    again.container.remove();
  });

  it("I: Market tray places on a valid empty Isle, no-ops existing Markets and off-board, and allows Nesting-Beast Isles", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    expect(container.querySelector('[data-tray-piece="market"]')?.textContent).toMatch(/Market/);
    expect(container.querySelector('[data-tray-piece="beast"]')).toBeNull();
    const orrery = isleHit(container, "orrery");
    await dragTrayPiece(container, "market", orrery, 94);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: start.boardIsles.find((isle) => isle.boardIsleId === "orrery")?.market,
      market: { present: true, rarity: null },
    });

    await dragTrayPiece(container, "market", isleHit(container, "ishana"), 95);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(1);

    await dragTrayPiece(container, "market", document.body, 96);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(1);
    root.unmount();
    container.remove();

    const nested = withNestingBeastOnIsle(initializedMariner(), "sage_atoll");
    const again = renderSurface(nested, WIZARD);
    await hoverTrayDragOverIsle(again.container, "sage_atoll", 97);
    expect(isleDropState(again.container, "sage_atoll")).toMatch(/^(available|hover)$/);
    await dragTrayPiece(again.container, "market", isleHit(again.container, "sage_atoll"), 98);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(2);
    again.root.unmount();
    again.container.remove();
  });

  it("J: Isle context Add/Remove Market keeps the menu-open expected Market after drift", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    openIsleContext(container, "orrery");
    await act(async () => { contextAction(container, "add-market").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: false },
      market: { present: true, rarity: null },
    });

    const withMarket = withIsleMarket(start, "ishana", { present: true, rarity: null });
    rerenderSurface(root, withMarket);
    const market = container.querySelector('[data-piece="market"][data-isle-id="ishana"]') as Element;
    openContextOn(market, 66, 40);
    expect(container.querySelector("[data-mariner-context-menu]")?.getAttribute("data-context-menu-kind")).toBe("isle");
    rerenderSurface(root, withIsleMarket(withMarket, "ishana", { present: true, rarity: "drifted pearl" }));
    await act(async () => { contextAction(container, "remove-market").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[1][0]).toMatchObject({
      boardIsleId: "ishana",
      expectedMarket: { present: true, rarity: null },
      market: { present: false },
    });
    root.unmount();
    container.remove();
  });

  it("K: Rarity add/edit/remove uses the editor-start Market and does not award Gifts", async () => {
    const start = withIsleMarket(initializedMariner(), "orrery", { present: true, rarity: null });
    const { container, root } = renderSurface(start, WIZARD);
    openIsleContext(container, "orrery");
    await act(async () => { contextAction(container, "add-rarity").click(); });
    const editor = container.querySelector("[data-rarity-editor]") as HTMLElement;
    const field = editor.querySelector('input[aria-label="Rarity description"]') as HTMLInputElement;
    setInput(field, "  moon silk  ");
    await act(async () => { button(editor, "Save Rarity").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: true, rarity: null },
      market: { present: true, rarity: "moon silk" },
    });
    expect(mockMutations["m3Commands.recordMarinerRavageResult"]).not.toHaveBeenCalled();

    const withRarity = withIsleMarket(start, "orrery", { present: true, rarity: "moon silk" });
    rerenderSurface(root, withRarity);
    openIsleContext(container, "orrery");
    await act(async () => { contextAction(container, "edit-rarity").click(); });
    const edit = container.querySelector("[data-rarity-editor]") as HTMLElement;
    const editField = edit.querySelector('input[aria-label="Rarity description"]') as HTMLInputElement;
    expect(editField.value).toBe("moon silk");
    rerenderSurface(root, withIsleMarket(withRarity, "orrery", { present: true, rarity: "drifted" }));
    setInput(editField, "tide glass");
    await act(async () => { button(edit, "Save Rarity").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[1][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: true, rarity: "moon silk" },
      market: { present: true, rarity: "tide glass" },
    });

    rerenderSurface(root, withRarity);
    openIsleContext(container, "orrery");
    await act(async () => { contextAction(container, "remove-rarity").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[2][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: true, rarity: "moon silk" },
      market: { present: true, rarity: null },
    });
    root.unmount();
    container.remove();
  });

  it("L: does not restore hover command menus and keeps Ship/Raider/Storm tray pieces", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    expect(container.querySelector("[data-hover-command-menu]")).toBeNull();
    expect(container.querySelector('[data-tray-piece="ship"]')).not.toBeNull();
    expect(container.querySelector('[data-tray-piece="raider"]')).not.toBeNull();
    expect(container.querySelector('[data-tray-piece="storm"]')).not.toBeNull();
    expect(container.querySelector('[data-tray-piece="market"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });
});

async function hoverTrayDragOverIsle(
  container: HTMLElement,
  hoverIsleId: string,
  pointerId = 99,
  piece: "market" | "rare-market" = "market",
): Promise<void> {
  const tray = container.querySelector(`[data-tray-piece="${piece}"]`) as Element;
  const dest = isleHit(container, hoverIsleId);
  (tray as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dest });
  await act(async () => {
    tray.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      pointerId,
      isPrimary: true,
      button: 0,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

function seaDropState(container: HTMLElement, regionId: string): string | null {
  return seaHit(container, regionId).getAttribute("data-sea-drop");
}

function isleDropFamily(container: HTMLElement, boardIsleId: string): string | null {
  return isleHit(container, boardIsleId).getAttribute("data-isle-drop-family");
}

function marketPiece(container: HTMLElement, boardIsleId: string): Element {
  const piece = container.querySelector(`[data-piece="market"][data-isle-id="${boardIsleId}"]`) as Element | null;
  if (piece === null) throw new Error(`Missing Market piece ${boardIsleId}`);
  return piece;
}

async function dragMarketPiece(
  container: HTMLElement,
  sourceIsleId: string,
  dropTarget: Element | null,
  pointerId = 111,
): Promise<void> {
  const piece = marketPiece(container, sourceIsleId);
  (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dropTarget });
  await act(async () => {
    piece.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 15,
      clientY: 15,
      pointerId,
      isPrimary: true,
      button: 0,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

function withBeastInRegion(regionId: "scuttle_channel"): MarinerState {
  const start = initializedMariner();
  return withBeast(start, {
    ...baselineBeast(start),
    location: { kind: "sea_region", regionId },
  });
}

describe("M5.4 UX B2 Beast placement and Market physical interaction", () => {
  it("A: Beast Sea highlights distinguish adjacent recommendation from other valid seas, and both accept drop", async () => {
    const start = initializedMariner();
    const adjacentExpected = expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "sunken_fleet", "wizard_strait");
    const otherExpected = expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "sunken_fleet", "sidereal_sea");
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, seaHit(container, "wizard_strait"), 201);
    expect(seaDropState(container, "sunken_fleet")).toBe("source");
    expect(seaDropState(container, "wizard_strait")).toMatch(/^(recommended|hover)$/);
    expect(seaDropState(container, "thyrian_sea")).toBe("recommended");
    expect(seaDropState(container, "sidereal_sea")).toBe("available");
    expect(seaDropState(container, "sidereal_sea")).not.toBe("blocked");
    await dragBeastPiece(container, DEN_A, seaHit(container, "wizard_strait"), 202);
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "wizard_strait",
      expectedBeast: adjacentExpected.expectedBeast,
      rampageResolution: null,
    });
    await dragBeastPiece(container, DEN_A, seaHit(container, "sidereal_sea"), 203);
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[1][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "sidereal_sea",
      expectedBeast: otherExpected.expectedBeast,
      rampageResolution: null,
    });
    const beforeSame = mockMutations["m3Commands.moveMarinerBeast"].mock.calls.length;
    await dragBeastPiece(container, DEN_A, seaHit(container, "sunken_fleet"), 204);
    expect(mockMutations["m3Commands.moveMarinerBeast"]).toHaveBeenCalledTimes(beforeSame);
    root.unmount();
    container.remove();
  });

  it("B: Beast Nest highlights use a distinct family, recommend adjacent Isles, and nest on any structurally valid Isle", async () => {
    const start = initializedMariner();
    const adjacentExpected = expectedForNestBeast(captureOperabilityBoard(start), DEN_A, "orrery");
    const otherExpected = expectedForNestBeast(captureOperabilityBoard(start), DEN_A, "sage_atoll");
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "sage_atoll"), 205);
    expect(isleDropFamily(container, "orrery")).toBe("nest");
    expect(isleDropState(container, "orrery")).toBe("recommended");
    expect(isleDropFamily(container, "sage_atoll")).toBe("nest");
    expect(isleDropState(container, "sage_atoll")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "scuttleport")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "ishana")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "druntyr")).toBe("blocked");
    await dragBeastPiece(container, DEN_A, isleHit(container, "orrery"), 206);
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "orrery",
      expectedMarket: adjacentExpected.expectedMarket,
      expectedNestingBeastDenizenId: adjacentExpected.expectedNestingBeastDenizenId,
    });
    await dragBeastPiece(container, DEN_A, isleHit(container, "sage_atoll"), 207);
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[1][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "sage_atoll",
      expectedMarket: otherExpected.expectedMarket,
      expectedNestingBeastDenizenId: otherExpected.expectedNestingBeastDenizenId,
    });
    await dragBeastPiece(container, DEN_A, isleHit(container, "druntyr"), 208);
    expect(mockMutations["m3Commands.nestMarinerBeast"]).toHaveBeenCalledTimes(2);
    root.unmount();
    container.remove();
  });

  it("C: Scuttle Channel recommended Nest keeps every adjacent Isle visible, including blocked reasons", async () => {
    const start = withBeastInRegion("scuttle_channel");
    const { container, root } = renderSurface(start, WIZARD);
    const menu = openBeastContext(container, DEN_A);
    expect(menu.querySelector('[data-context-section="recommended-nest"]')).not.toBeNull();
    const scuttleport = menu.querySelector('[data-context-action="nest-beast"][data-isle-id="scuttleport"]') as HTMLButtonElement | null;
    const ishana = menu.querySelector('[data-context-action="nest-beast"][data-isle-id="ishana"]') as HTMLButtonElement | null;
    const druntyr = menu.querySelector('[data-context-action="nest-beast"][data-isle-id="druntyr"]') as HTMLButtonElement | null;
    expect(scuttleport).not.toBeNull();
    expect(ishana).not.toBeNull();
    expect(druntyr).not.toBeNull();
    expect(scuttleport?.disabled).toBe(false);
    expect(ishana?.disabled).toBe(false);
    expect(druntyr?.disabled).toBe(true);
    expect(scuttleport?.getAttribute("data-disabled-reason")).toBeNull();
    expect(ishana?.getAttribute("data-disabled-reason")).toBeNull();
    expect(druntyr?.getAttribute("data-disabled-reason")).toBe("Ravaged");
    expect(scuttleport?.textContent).not.toMatch(/Market present/);
    expect(druntyr?.textContent).toMatch(/Ravaged/);
    root.unmount();
    container.remove();
  });

  it("D: Move/Nest elsewhere choosers are action-triggered and keep the menu-open snapshot after drift", async () => {
    const start = initializedMariner();
    const moveExpected = expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "sunken_fleet", "sidereal_sea");
    const nestExpected = expectedForNestBeast(captureOperabilityBoard(start), DEN_A, "sage_atoll");
    const drifted: MarinerState = {
      ...start,
      seaRegions: start.seaRegions.map((region) =>
        region.regionId === "wizard_strait" ? { ...region, stormCount: 2 } : region
      ),
      boardIsles: start.boardIsles.map((isle) =>
        isle.boardIsleId === "sage_atoll" ? { ...isle, market: { present: true, rarity: "drifted" } } : isle
      ),
    };
    const { container, root } = renderSurface(start, WIZARD);
    openBeastContext(container, DEN_A);
    expect(container.querySelector("[data-beast-move-elsewhere-chooser]")).toBeNull();
    await act(async () => { contextAction(container, "move-beast-elsewhere").click(); });
    const moveChooser = container.querySelector("[data-beast-move-elsewhere-chooser]") as HTMLElement | null;
    expect(moveChooser).not.toBeNull();
    expect(container.querySelector("[data-mariner-context-menu]")).toBeNull();
    expect(moveChooser?.querySelector('[data-elsewhere-region-id="wizard_strait"]')).toBeNull();
    expect(moveChooser?.querySelector('[data-elsewhere-region-id="sidereal_sea"]')).not.toBeNull();
    rerenderSurface(root, drifted);
    await act(async () => {
      (container.querySelector('[data-elsewhere-region-id="sidereal_sea"]') as HTMLButtonElement).click();
    });
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "sidereal_sea",
      expectedBeast: moveExpected.expectedBeast,
      expectedStormCounts: moveExpected.expectedStormCounts,
    });
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0].expectedStormCounts).not.toEqual(
      expectedForMoveBeast(captureOperabilityBoard(drifted), DEN_A, "sunken_fleet", "sidereal_sea").expectedStormCounts,
    );

    rerenderSurface(root, start);
    openBeastContext(container, DEN_A);
    expect(container.querySelector("[data-beast-nest-elsewhere-chooser]")).toBeNull();
    await act(async () => { contextAction(container, "nest-beast-elsewhere").click(); });
    const nestChooser = container.querySelector("[data-beast-nest-elsewhere-chooser]") as HTMLElement | null;
    expect(nestChooser).not.toBeNull();
    expect(nestChooser?.querySelector('[data-elsewhere-isle-id="orrery"]')).toBeNull();
    const sage = nestChooser?.querySelector('[data-elsewhere-isle-id="sage_atoll"]') as HTMLButtonElement | null;
    expect(sage?.disabled).toBe(false);
    const marketIsle = nestChooser?.querySelector('[data-elsewhere-isle-id="scuttleport"]') as HTMLButtonElement | null;
    expect(marketIsle?.disabled).toBe(false);
    expect(marketIsle?.getAttribute("data-disabled-reason")).toBeNull();
    const ravaged = nestChooser?.querySelector('[data-elsewhere-isle-id="druntyr"]') as HTMLButtonElement | null;
    expect(ravaged?.disabled).toBe(true);
    expect(ravaged?.getAttribute("data-disabled-reason")).toBe("Ravaged");
    rerenderSurface(root, drifted);
    await act(async () => {
      (container.querySelector('[data-elsewhere-isle-id="sage_atoll"]') as HTMLButtonElement).click();
    });
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "sage_atoll",
      expectedMarket: nestExpected.expectedMarket,
    });
    root.unmount();
    container.remove();
  });

  it("E: a nonadjacent Beast move that predicts Rampage defers and keeps the original snapshot", async () => {
    const start = surroundRegion(initializedMariner(), "sidereal_sea");
    const expected = expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "sunken_fleet", "sidereal_sea");
    const drifted: MarinerState = {
      ...start,
      seaRegions: start.seaRegions.map((region) =>
        region.regionId === "wizard_strait" ? { ...region, stormCount: 1 } : region
      ),
    };
    const { container, root } = renderSurface(start, WIZARD);
    await dragBeastPiece(container, DEN_A, seaHit(container, "sidereal_sea"), 209);
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-beast-rampage-chooser]")).not.toBeNull();
    rerenderSurface(root, drifted);
    await confirmBeastRampage(container);
    expect(mockMutations["m3Commands.moveMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      sourceRegionId: "sunken_fleet",
      destinationRegionId: "sidereal_sea",
      expectedBeast: expected.expectedBeast,
      expectedStormCounts: expected.expectedStormCounts,
      rampageResolution: {
        denizenId: DEN_A,
        destinationSeatId: "hierophant",
      },
    });
    root.unmount();
    container.remove();
  });

  it("F: Market and Rare Market supply pieces are both visible with a distinct rare marker", () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const ordinary = container.querySelector('[data-tray-piece="market"]');
    const rare = container.querySelector('[data-tray-piece="rare-market"]');
    expect(ordinary?.textContent).toMatch(/Market/);
    expect(ordinary?.textContent).not.toMatch(/Rare/);
    expect(rare?.textContent).toMatch(/Rare Market/);
    expect(ordinary?.querySelector('[data-rarity-cue="true"]')).toBeNull();
    expect(rare?.querySelector('[data-rarity-cue="true"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("G: ordinary supply Market places, transforms Rare, no-ops same-type, and allows Nesting-Beast Isles", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    await hoverTrayDragOverIsle(container, "scuttleport", 210);
    expect(isleDropState(container, "scuttleport")).toMatch(/^(available|hover)$/);
    expect(isleDropFamily(container, "scuttleport")).toBe("market");
    await dragTrayPiece(container, "market", isleHit(container, "orrery"), 211);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: false },
      market: { present: true, rarity: null },
    });
    await dragTrayPiece(container, "market", isleHit(container, "scuttleport"), 212);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[1][0]).toMatchObject({
      boardIsleId: "scuttleport",
      expectedMarket: { present: true, rarity: "amber glass" },
      market: { present: true, rarity: null },
    });
    await dragTrayPiece(container, "market", isleHit(container, "ishana"), 213);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(2);
    root.unmount();
    container.remove();

    const nested = withNestingBeastOnIsle(initializedMariner(), "sage_atoll");
    const again = renderSurface(nested, WIZARD);
    await hoverTrayDragOverIsle(again.container, "sage_atoll", 214);
    expect(isleDropState(again.container, "sage_atoll")).toMatch(/^(available|hover)$/);
    await dragTrayPiece(again.container, "market", isleHit(again.container, "sage_atoll"), 215);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(3);
    again.root.unmount();
    again.container.remove();
  });

  it("H: Rare Market supply commits undescribed Rare immediately without a description prompt", async () => {
    const start = initializedMariner();
    const undescribed = createUndescribedRareMarinerMarket();
    const { container, root } = renderSurface(start, WIZARD);
    await dragTrayPiece(container, "rare-market", isleHit(container, "orrery"), 216);
    expect(container.querySelector("[data-rarity-prompt]")).toBeNull();
    expect(container.querySelector("[data-rarity-editor]")).toBeNull();
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: false },
      market: undescribed,
    });

    await dragTrayPiece(container, "rare-market", isleHit(container, "ishana"), 217);
    expect(container.querySelector("[data-rarity-prompt]")).toBeNull();
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[1][0]).toMatchObject({
      boardIsleId: "ishana",
      expectedMarket: { present: true, rarity: null },
      market: undescribed,
    });

    await dragTrayPiece(container, "rare-market", isleHit(container, "scuttleport"), 218);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(2);
    expect(container.querySelector("[data-rarity-prompt]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("I: existing Market drag uses one moveMarinerMarket call and keeps the pointerdown snapshot", async () => {
    const start = initializedMariner();
    const ordinaryExpected = expectedForMoveMarket(captureOperabilityBoard(start), "ishana", "orrery");
    const rareExpected = expectedForMoveMarket(captureOperabilityBoard(start), "scuttleport", "sage_atoll");
    const { container, root } = renderSurface(start, WIZARD);
    await dragMarketPiece(container, "ishana", isleHit(container, "orrery"), 220);
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerMarket"].mock.calls[0][0]).toMatchObject({
      sourceBoardIsleId: "ishana",
      destinationBoardIsleId: "orrery",
      expectedSourceMarket: ordinaryExpected.expectedSourceMarket,
      expectedDestinationMarket: ordinaryExpected.expectedDestinationMarket,
      expectedDestinationNestingBeastDenizenId: ordinaryExpected.expectedDestinationNestingBeastDenizenId,
    });

    await dragMarketPiece(container, "scuttleport", isleHit(container, "sage_atoll"), 221);
    expect(mockMutations["m3Commands.moveMarinerMarket"].mock.calls[1][0]).toMatchObject({
      sourceBoardIsleId: "scuttleport",
      destinationBoardIsleId: "sage_atoll",
      expectedSourceMarket: { present: true, rarity: "amber glass" },
      expectedDestinationMarket: rareExpected.expectedDestinationMarket,
      expectedDestinationNestingBeastDenizenId: rareExpected.expectedDestinationNestingBeastDenizenId,
    });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();

    const piece = marketPiece(container, "ishana");
    (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => isleHit(container, "far_reach"),
    });
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 15,
        clientY: 15,
        pointerId: 222,
        isPrimary: true,
        button: 0,
      }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId: 222 }));
    });
    rerenderSurface(root, withIsleMarket(withIsleMarket(start, "ishana", { present: true, rarity: "drifted pearl" }), "far_reach", { present: true, rarity: null }));
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId: 222 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId: 222 }));
    });
    expect(mockMutations["m3Commands.moveMarinerMarket"].mock.calls[2][0]).toMatchObject({
      sourceBoardIsleId: "ishana",
      destinationBoardIsleId: "far_reach",
      expectedSourceMarket: { present: true, rarity: null },
      expectedDestinationMarket: { present: false },
    });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("J: Market click inspects, drag relocates without selecting, and right-click opens context without drag", async () => {
    const { container, root } = renderSurface(initializedMariner(), WIZARD);
    const piece = marketPiece(container, "ishana");
    (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 20,
        clientY: 20,
        pointerId: 223,
        isPrimary: true,
        button: 0,
      }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 20, clientY: 20, pointerId: 223 }));
      piece.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 20, clientY: 20 }));
    });
    expect(container.querySelector("[data-board-overlay-inspector]")?.textContent).toMatch(/World ishana|Ishana/i);
    await act(async () => { button(container, "Close").click(); });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => isleHit(container, "orrery"),
    });
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 15,
        clientY: 15,
        pointerId: 224,
        isPrimary: true,
        button: 0,
      }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId: 224 }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId: 224 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId: 224 }));
      piece.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 210, clientY: 210 }));
    });
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();

    openContextOn(marketPiece(container, "ishana"), 70, 36);
    expect(container.querySelector("[data-mariner-context-menu]")?.getAttribute("data-context-menu-kind")).toBe("isle");
    expect(container.querySelector('[data-context-action="add-rarity"]')).not.toBeNull();
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    root.unmount();
    container.remove();
  });

  it("K: Ship/Raider/Storm tray, hover menus, and Beast Add/Remove remain intact", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    expect(container.querySelector("[data-hover-command-menu]")).toBeNull();
    expect(container.querySelector('[data-tray-piece="ship"]')).not.toBeNull();
    expect(container.querySelector('[data-tray-piece="raider"]')).not.toBeNull();
    expect(container.querySelector('[data-tray-piece="storm"]')).not.toBeNull();
    await dragTrayPiece(container, "storm", seaHit(container, "wizard_strait"), 225);
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"]).toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerStorm"]).not.toHaveBeenCalled();
    openSeaContext(container, "wizard_strait");
    await act(async () => { contextAction(container, "add-beast").click(); });
    const chooser = container.querySelector("[data-beast-add-chooser]") as HTMLElement;
    setSelect(select(chooser, "Add Beast Denizen"), DEN_B);
    await act(async () => { button(chooser, "Add Beast").click(); });
    expect(mockMutations["m3Commands.addMarinerBeast"]).toHaveBeenCalled();
    expect(mockMutations["m3Commands.createMarinerBeast"]).not.toHaveBeenCalled();
    openBeastContext(container, DEN_A);
    await act(async () => { contextAction(container, "remove-beast").click(); });
    await act(async () => { button(container.querySelector("[data-beast-remove-confirm]") as HTMLElement, "Remove").click(); });
    expect(mockMutations["m3Commands.removeMarinerBeast"]).toHaveBeenCalled();
    root.unmount();
    container.remove();
  });
});

describe("M5.4 UX B2 Beast selection, Nesting relocation, and Rare Market", () => {
  it("A: Druntyr Friendly/Nesting Beast accepts pointerdown and retains Isle source plus snapshot", async () => {
    const start = withFriendlyNestingOnIsle(initializedMariner(), "druntyr");
    const { container, root } = renderSurface(start, WIZARD);
    const piece = beastPiece(container, DEN_A);
    expect(piece.getAttribute("data-draggable-beast")).toBe("true");
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "orrery"), 301);
    expect(isleDropState(container, "druntyr")).toBe("source");
    expect(isleDropState(container, "orrery")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "ishana")).toMatch(/^(available|hover)$/);
    rerenderSurface(root, withIsleMarket(start, "orrery", { present: true, rarity: null }));
    expect(isleDropState(container, "orrery")).toMatch(/^(available|hover)$/);
    root.unmount();
    container.remove();
  });

  it("B: click on Druntyr Beast selects the Beast, shows Beast inspector and halo, and drag suppresses click", async () => {
    const start = withFriendlyNestingOnIsle(initializedMariner(), "druntyr");
    const { container, root } = renderSurface(start, WIZARD);
    const piece = beastPiece(container, DEN_A);
    (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 302, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 15, clientY: 15, pointerId: 302 }));
    });
    const inspector = container.querySelector("[data-board-overlay-inspector]");
    expect(inspector?.textContent).toContain("Kraken-kin");
    expect(inspector?.textContent).toMatch(/Friendly \/ Nesting/);
    expect(inspector?.textContent).toMatch(/water/i);
    expect(inspector?.textContent).toContain("Kraken");
    expect(inspector?.textContent).toMatch(/Druntyr|World druntyr/i);
    expect(inspector?.textContent).not.toMatch(/Isle inspector/);
    expect(piece.getAttribute("data-beast-selected")).toBe("true");
    expect(container.querySelector("[data-beast-selection-halo]")).not.toBeNull();
    await act(async () => { button(container, "Close").click(); });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => isleHit(container, "orrery"),
    });
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 303, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId: 303 }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId: 303 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId: 303 }));
      piece.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 210, clientY: 210 }));
    });
    expect(container.querySelector("[data-board-overlay-inspector]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("C: Isle -> Isle Nesting drag uses relocateMarinerNestingBeast with pointerdown expected state", async () => {
    const start = withFriendlyNestingOnIsle(initializedMariner(), "sage_atoll");
    const nestExpected = expectedForNestBeast(captureOperabilityBoard(start), DEN_A, "orrery");
    const { container, root } = renderSurface(start, WIZARD);
    await dragBeastPiece(container, DEN_A, isleHit(container, "orrery"), 304);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.nestMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      expectedBeast: {
        denizenId: DEN_A,
        condition: "friendly_nesting",
        location: { kind: "board_isle", boardIsleId: "sage_atoll" },
      },
      destination: {
        kind: "board_isle",
        boardIsleId: "orrery",
        expectedMarket: nestExpected.expectedMarket,
        expectedRavageStormCount: nestExpected.expectedRavageStormCount,
        expectedNestingBeastDenizenId: nestExpected.expectedNestingBeastDenizenId,
      },
    });
    await dragBeastPiece(container, DEN_A, isleHit(container, "sage_atoll"), 305);
    await dragBeastPiece(container, DEN_A, isleHit(container, "druntyr"), 306);
    await dragBeastPiece(container, DEN_A, document.body, 307);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).toHaveBeenCalledTimes(1);
    root.unmount();
    container.remove();
  });

  it("D: Isle -> Sea Nesting drag uses relocateMarinerNestingBeast and keeps the Isle expected Beast", async () => {
    const start = withFriendlyNestingOnIsle(initializedMariner(), "sage_atoll");
    const { container, root } = renderSurface(start, WIZARD);
    await dragBeastPiece(container, DEN_A, seaHit(container, "wizard_strait"), 308);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();
    const payload = mockMutations["m3Commands.relocateMarinerNestingBeast"].mock.calls[0][0];
    expect(payload).toMatchObject({
      denizenId: DEN_A,
      expectedBeast: {
        denizenId: DEN_A,
        condition: "friendly_nesting",
        location: { kind: "board_isle", boardIsleId: "sage_atoll" },
      },
      destination: {
        kind: "sea_region",
        regionId: "wizard_strait",
        rampageResolution: null,
      },
    });
    expect(payload.destination.expectedStormCounts).toEqual(
      expectedForMoveBeast(captureOperabilityBoard(start), DEN_A, "wizard_strait", "wizard_strait").expectedStormCounts,
    );
    root.unmount();
    container.remove();
  });

  it("E: Isle -> Sea predicted Rampage opens the existing chooser and submits relocate with the original snapshot", async () => {
    const start = surroundRegion(withFriendlyNestingOnIsle(initializedMariner(), "sage_atoll"), "koiran_reef");
    const expectedStorms = expectedForMoveBeast(
      captureOperabilityBoard(start),
      DEN_A,
      "koiran_reef",
      "koiran_reef",
    ).expectedStormCounts;
    const drifted: MarinerState = {
      ...start,
      seaRegions: start.seaRegions.map((region) =>
        region.regionId === "wizard_strait" ? { ...region, stormCount: 1 } : region
      ),
    };
    const { container, root } = renderSurface(start, WIZARD);
    await dragBeastPiece(container, DEN_A, seaHit(container, "koiran_reef"), 309);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    expect(container.querySelector("[data-beast-rampage-chooser]")).not.toBeNull();
    rerenderSurface(root, drifted);
    await confirmBeastRampage(container);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      expectedBeast: {
        denizenId: DEN_A,
        condition: "friendly_nesting",
        location: { kind: "board_isle", boardIsleId: "sage_atoll" },
      },
      destination: {
        kind: "sea_region",
        regionId: "koiran_reef",
        expectedStormCounts: expectedStorms,
        rampageResolution: {
          denizenId: DEN_A,
          destinationSeatId: "hierophant",
        },
      },
    });
    expect(mockMutations["m3Commands.moveMarinerBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("F: Friendly/Nesting drag highlights all Seas and structurally valid Isles without recommended-adjacent SOURCE guidance", async () => {
    const start = withFriendlyNestingOnIsle(
      withNestingBeastOnIsle(initializedMariner(), "far_reach"),
      "sage_atoll",
    );
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "orrery"), 310);
    expect(isleDropState(container, "sage_atoll")).toBe("source");
    expect(isleDropFamily(container, "orrery")).toBe("nest");
    expect(isleDropState(container, "orrery")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "orrery")).not.toBe("recommended");
    expect(isleDropState(container, "scuttleport")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "ishana")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "druntyr")).toBe("blocked");
    expect(isleDropState(container, "far_reach")).toBe("blocked");
    expect(seaDropState(container, "wizard_strait")).toMatch(/^(available|hover)$/);
    expect(seaDropState(container, "sidereal_sea")).toBe("available");
    expect(seaDropState(container, "sunken_fleet")).toBe("available");
    expect(seaDropState(container, "wizard_strait")).not.toBe("recommended");
    root.unmount();
    container.remove();
  });

  it("G: Friendly/Nesting right-click keeps Remove and opens Move Nest / Leave Nest choosers with blocked reasons", async () => {
    const start = withFriendlyNestingOnIsle(
      withNestingBeastOnIsle(initializedMariner(), "far_reach"),
      "sage_atoll",
    );
    const { container, root } = renderSurface(start, WIZARD);
    const menu = openBeastContext(container, DEN_A);
    expect(menu.textContent).toContain("Remove Beast");
    expect(menu.textContent).toMatch(/Move Nest elsewhere/);
    expect(menu.textContent).toMatch(/Leave Nest to Sea/);
    expect(menu.querySelector('[data-context-action="move-beast"]')).toBeNull();
    await act(async () => { contextAction(container, "relocate-nest-elsewhere").click(); });
    const nestChooser = container.querySelector("[data-beast-relocate-nest-chooser]") as HTMLElement | null;
    expect(nestChooser).not.toBeNull();
    const orrery = nestChooser?.querySelector('[data-elsewhere-isle-id="orrery"]') as HTMLButtonElement | null;
    const scuttleport = nestChooser?.querySelector('[data-elsewhere-isle-id="scuttleport"]') as HTMLButtonElement | null;
    const ishana = nestChooser?.querySelector('[data-elsewhere-isle-id="ishana"]') as HTMLButtonElement | null;
    const druntyr = nestChooser?.querySelector('[data-elsewhere-isle-id="druntyr"]') as HTMLButtonElement | null;
    const farReach = nestChooser?.querySelector('[data-elsewhere-isle-id="far_reach"]') as HTMLButtonElement | null;
    const sourceIsle = nestChooser?.querySelector('[data-elsewhere-isle-id="sage_atoll"]') as HTMLButtonElement | null;
    expect(sourceIsle).toBeNull();
    expect(orrery?.disabled).toBe(false);
    expect(scuttleport?.disabled).toBe(false);
    expect(ishana?.disabled).toBe(false);
    expect(druntyr?.disabled).toBe(true);
    expect(farReach?.disabled).toBe(true);
    expect(scuttleport?.getAttribute("data-disabled-reason")).toBeNull();
    expect(ishana?.getAttribute("data-disabled-reason")).toBeNull();
    expect(druntyr?.getAttribute("data-disabled-reason")).toBe("Ravaged");
    expect(farReach?.getAttribute("data-disabled-reason")).toBe("Beast already Nesting here");
    expect(scuttleport?.textContent).not.toMatch(/Market present/);
    expect(druntyr?.textContent).toMatch(/Ravaged/);
    expect(farReach?.textContent).toMatch(/Beast already Nesting here/);
    await act(async () => { button(nestChooser!, "Cancel").click(); });

    openBeastContext(container, DEN_A);
    await act(async () => { contextAction(container, "leave-nest-to-sea").click(); });
    const seaChooser = container.querySelector("[data-beast-leave-nest-chooser]") as HTMLElement | null;
    expect(seaChooser).not.toBeNull();
    expect(seaChooser?.querySelector('[data-elsewhere-region-id="wizard_strait"]')).not.toBeNull();
    expect(seaChooser?.querySelector('[data-elsewhere-region-id="sidereal_sea"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("H: Rare Market drop commits sentinel immediately, transforms ordinary, no-ops same Rare, and allows Nesting-Beast Isles", async () => {
    const start = initializedMariner();
    const undescribed = createUndescribedRareMarinerMarket();
    const { container, root } = renderSurface(start, WIZARD);
    await dragTrayPiece(container, "rare-market", isleHit(container, "orrery"), 311);
    expect(container.querySelector("[data-rarity-prompt]")).toBeNull();
    expect(container.querySelector("[data-rarity-editor]")).toBeNull();
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: { present: false },
      market: undescribed,
    });
    await dragTrayPiece(container, "rare-market", isleHit(container, "ishana"), 312);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[1][0]).toMatchObject({
      boardIsleId: "ishana",
      expectedMarket: { present: true, rarity: null },
      market: undescribed,
    });
    await dragTrayPiece(container, "rare-market", isleHit(container, "scuttleport"), 313);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(2);
    const nested = withNestingBeastOnIsle(initializedMariner(), "sage_atoll");
    rerenderSurface(root, nested);
    await dragTrayPiece(container, "rare-market", isleHit(container, "sage_atoll"), 314);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(3);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[2][0]).toMatchObject({
      boardIsleId: "sage_atoll",
      expectedMarket: { present: false },
      market: undescribed,
    });
    expect(mockMutations["m3Commands.addMarinerBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("I: sentinel Rare Market never renders the reserved prose and still shows the rare cue", () => {
    const start = withIsleMarket(initializedMariner(), "orrery", createUndescribedRareMarinerMarket());
    const { container, root } = renderSurface(start, WIZARD);
    const piece = marketPiece(container, "orrery");
    expect(piece.getAttribute("data-rarity")).toBe("true");
    expect(piece.querySelector('[data-rarity-cue="true"]')).not.toBeNull();
    expect(piece.textContent).toContain("Rare Market");
    expect(container.textContent).not.toContain(MARINER_UNDESCRIBED_RARITY_SENTINEL);
    expect(isleHit(container, "orrery").getAttribute("aria-label")).not.toContain(MARINER_UNDESCRIBED_RARITY_SENTINEL);
    expect(isleHit(container, "orrery").getAttribute("aria-label")).toMatch(/Rare Market/);
    flushSync(() => {
      isleHit(container, "orrery").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector("[data-board-overlay-inspector]")?.textContent ?? "";
    expect(inspector).toMatch(/Rarity:\s*not described yet/);
    expect(inspector).not.toContain(MARINER_UNDESCRIBED_RARITY_SENTINEL);
    const rarityField = container.querySelector('input[aria-label="Isle Rarity"]') as HTMLInputElement | null;
    expect(rarityField?.value ?? "").not.toContain(MARINER_UNDESCRIBED_RARITY_SENTINEL);
    expect(rarityField?.value ?? "").toBe("");
    root.unmount();
    container.remove();
  });

  it("J: context Rarity actions distinguish Add, Describe, and Edit", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    openIsleContext(container, "ishana");
    expect(container.querySelector('[data-context-action="add-rarity"]')?.textContent).toMatch(/Add Rarity/);
    expect(container.querySelector('[data-context-action="edit-rarity"]')).toBeNull();
    expect(container.querySelector('[data-context-action="describe-rarity"]')).toBeNull();

    openIsleContext(container, "scuttleport");
    expect(container.querySelector('[data-context-action="edit-rarity"]')?.textContent).toMatch(/Edit Rarity/);
    expect(container.querySelector('[data-context-action="describe-rarity"]')).toBeNull();
    await act(async () => { contextAction(container, "edit-rarity").click(); });
    const edit = container.querySelector("[data-rarity-editor]") as HTMLElement;
    expect((edit.querySelector('input[aria-label="Rarity description"]') as HTMLInputElement).value).toBe("amber glass");
    await act(async () => { button(edit, "Cancel").click(); });

    rerenderSurface(root, withIsleMarket(start, "orrery", createUndescribedRareMarinerMarket()));
    openIsleContext(container, "orrery");
    expect(container.querySelector('[data-context-action="describe-rarity"]')?.textContent).toMatch(/Describe Rarity/);
    expect(container.querySelector('[data-context-action="edit-rarity"]')).toBeNull();
    expect(container.querySelector('[data-context-action="remove-rarity"]')).not.toBeNull();
    expect(container.querySelector('[data-context-action="remove-market"]')).not.toBeNull();
    await act(async () => { contextAction(container, "describe-rarity").click(); });
    const describe = container.querySelector("[data-rarity-editor]") as HTMLElement;
    expect((describe.querySelector('input[aria-label="Rarity description"]') as HTMLInputElement).value).toBe("");
    expect(describe.textContent).not.toContain(MARINER_UNDESCRIBED_RARITY_SENTINEL);
    root.unmount();
    container.remove();
  });

  it("K: Rarity editor rejects reserved sentinel prose and accepts actual description", async () => {
    const start = withIsleMarket(initializedMariner(), "orrery", createUndescribedRareMarinerMarket());
    const { container, root } = renderSurface(start, WIZARD);
    openIsleContext(container, "orrery");
    await act(async () => { contextAction(container, "describe-rarity").click(); });
    const editor = container.querySelector("[data-rarity-editor]") as HTMLElement;
    const field = editor.querySelector('input[aria-label="Rarity description"]') as HTMLInputElement;
    expect(isReservedMarinerRarityDescriptionInput(`  ${MARINER_UNDESCRIBED_RARITY_SENTINEL}  `)).toBe(true);
    setInput(field, `  ${MARINER_UNDESCRIBED_RARITY_SENTINEL}  `);
    await act(async () => { button(editor, "Save Rarity").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    expect(editor.textContent).toMatch(/reserved|cannot be used/i);
    setInput(field, "moon silk");
    await act(async () => { button(editor, "Save Rarity").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "orrery",
      expectedMarket: createUndescribedRareMarinerMarket(),
      market: { present: true, rarity: "moon silk" },
    });
    root.unmount();
    container.remove();
  });

  it("L: Distrusting Beast, Market drag, and tray Storm still use their existing commands", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, seaHit(container, "wizard_strait"), 315);
    expect(seaDropState(container, "wizard_strait")).toMatch(/^(recommended|hover)$/);
    expect(seaDropState(container, "sidereal_sea")).toBe("available");
    await dragBeastPiece(container, DEN_A, seaHit(container, "wizard_strait"), 316);
    expect(mockMutations["m3Commands.moveMarinerBeast"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).not.toHaveBeenCalled();
    await dragBeastPiece(container, DEN_A, isleHit(container, "orrery"), 317);
    expect(mockMutations["m3Commands.nestMarinerBeast"]).toHaveBeenCalledTimes(1);
    await dragMarketPiece(container, "ishana", isleHit(container, "orrery"), 318);
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    const sentinelStart = withIsleMarket(start, "orrery", createUndescribedRareMarinerMarket());
    rerenderSurface(root, sentinelStart);
    await dragMarketPiece(container, "orrery", isleHit(container, "far_reach"), 319);
    expect(mockMutations["m3Commands.moveMarinerMarket"].mock.calls[1][0]).toMatchObject({
      sourceBoardIsleId: "orrery",
      destinationBoardIsleId: "far_reach",
      expectedSourceMarket: createUndescribedRareMarinerMarket(),
    });
    expect(container.querySelector("[data-rarity-prompt]")).toBeNull();
    await dragTrayPiece(container, "storm", seaHit(container, "wizard_strait"), 320);
    expect(mockMutations["m3Commands.setMarinerSeaStormCount"]).toHaveBeenCalled();
    root.unmount();
    container.remove();
  });
});

const DRAFT4_MARKET_NEST_WARNING = "Draft 4 conflict: an Isle with a Nesting Beast cannot have a Market.";

function deferMutation(ref: string): { resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = () => settle();
  });
  mockMutations[ref].mockImplementation(() => promise);
  return { resolve };
}

async function beginPieceDrag(
  piece: Element,
  dropTarget: Element | null,
  pointerId: number,
): Promise<void> {
  (piece as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dropTarget });
  await act(async () => {
    piece.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: 15,
      clientY: 15,
      pointerId,
      isPrimary: true,
      button: 0,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
}

function releasePointer(pointerId: number): void {
  flushSync(() => {
    window.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      clientX: 210,
      clientY: 210,
      pointerId,
    }));
  });
}

describe("M5.4 UX B2 drag lifecycle and Market-Nest conflict", () => {
  it("ends Beast drag visual before an unresolved mutation settles", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    const deferred = deferMutation("m3Commands.moveMarinerBeast");
    const piece = beastPiece(container, DEN_A);
    await beginPieceDrag(piece, seaHit(container, "wizard_strait"), 401);
    expect(container.querySelector("[data-drag-ghost]")).not.toBeNull();
    releasePointer(401);
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(seaDropState(container, "wizard_strait")).toBeNull();
    expect(seaDropState(container, "sunken_fleet")).toBeNull();
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 260, clientY: 180, pointerId: 401 }));
    });
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(mockMutations["m3Commands.moveMarinerBeast"]).toHaveBeenCalledTimes(1);
    await act(async () => { deferred.resolve(); });
    expect(mockMutations["m3Commands.moveMarinerBeast"]).toHaveBeenCalledTimes(1);
    root.unmount();
    container.remove();
  });

  it("ends existing Market drag visual before an unresolved mutation settles", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    const deferred = deferMutation("m3Commands.moveMarinerMarket");
    await beginPieceDrag(marketPiece(container, "ishana"), isleHit(container, "orrery"), 402);
    expect(container.querySelector("[data-drag-ghost]")).not.toBeNull();
    releasePointer(402);
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(isleDropState(container, "orrery")).toBeNull();
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 280, clientY: 160, pointerId: 402 }));
    });
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    await act(async () => { deferred.resolve(); });
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    root.unmount();
    container.remove();
  });

  it("allows existing Market drop onto a Nesting-Beast Isle", async () => {
    const start = withFriendlyNestingOnIsle(initializedMariner(), "orrery");
    const expected = expectedForMoveMarket(captureOperabilityBoard(start), "ishana", "orrery");
    const { container, root } = renderSurface(start, WIZARD);
    await beginPieceDrag(marketPiece(container, "ishana"), isleHit(container, "orrery"), 403);
    expect(isleDropFamily(container, "orrery")).toBe("market");
    expect(isleDropState(container, "orrery")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "orrery")).not.toBe("blocked");
    await dragMarketPiece(container, "ishana", isleHit(container, "orrery"), 404);
    expect(isleDropState(container, "orrery")).toBeNull();
    expect(mockMutations["m3Commands.moveMarinerMarket"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.moveMarinerMarket"].mock.calls[0][0]).toMatchObject({
      sourceBoardIsleId: "ishana",
      destinationBoardIsleId: "orrery",
      expectedSourceMarket: expected.expectedSourceMarket,
      expectedDestinationMarket: expected.expectedDestinationMarket,
      expectedDestinationNestingBeastDenizenId: expected.expectedDestinationNestingBeastDenizenId,
    });
    expect(expected.expectedDestinationNestingBeastDenizenId).toBe(DEN_A);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.addMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("nests a Distrusting Beast onto a Market Isle and keeps the pointerdown Market snapshot", async () => {
    const start = initializedMariner();
    const expected = expectedForNestBeast(captureOperabilityBoard(start), DEN_A, "scuttleport");
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "scuttleport"), 405);
    expect(isleDropFamily(container, "scuttleport")).toBe("nest");
    expect(isleDropState(container, "scuttleport")).toMatch(/^(available|hover|recommended)$/);
    expect(isleDropState(container, "scuttleport")).not.toBe("blocked");
    await dragBeastPiece(container, DEN_A, isleHit(container, "scuttleport"), 406);
    expect(mockMutations["m3Commands.nestMarinerBeast"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.nestMarinerBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      boardIsleId: "scuttleport",
      expectedMarket: expected.expectedMarket,
    });
    expect(expected.expectedMarket).toEqual({ present: true, rarity: "amber glass" });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerMarket"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("relocates a Nesting Beast onto a Market Isle without mutating the Market", async () => {
    const start = withFriendlyNestingOnIsle(initializedMariner(), "orrery");
    const expected = expectedForRelocateNestingBeastToIsle(captureOperabilityBoard(start), DEN_A, "scuttleport");
    const { container, root } = renderSurface(start, WIZARD);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "scuttleport"), 407);
    expect(isleDropFamily(container, "scuttleport")).toBe("nest");
    expect(isleDropState(container, "scuttleport")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "scuttleport")).not.toBe("blocked");
    await dragBeastPiece(container, DEN_A, isleHit(container, "scuttleport"), 408);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"].mock.calls[0][0]).toMatchObject({
      denizenId: DEN_A,
      expectedBeast: expected.expectedBeast,
      destination: {
        kind: "board_isle",
        boardIsleId: "scuttleport",
        expectedMarket: expected.expectedMarket,
      },
    });
    expect(expected.expectedMarket).toEqual({ present: true, rarity: "amber glass" });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.moveMarinerMarket"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("places tray ordinary and Rare Markets onto a Nesting-Beast Isle", async () => {
    const nested = withFriendlyNestingOnIsle(initializedMariner(), "sage_atoll");
    const { container, root } = renderSurface(nested, WIZARD);
    await hoverTrayDragOverIsle(container, "sage_atoll", 409);
    expect(isleDropFamily(container, "sage_atoll")).toBe("market");
    expect(isleDropState(container, "sage_atoll")).toMatch(/^(available|hover)$/);
    expect(isleDropState(container, "sage_atoll")).not.toBe("blocked");
    await dragTrayPiece(container, "market", isleHit(container, "sage_atoll"), 410);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "sage_atoll",
      expectedMarket: { present: false },
      market: { present: true, rarity: null },
    });
    expect(mockMutations["m3Commands.addMarinerBeast"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();

    await hoverTrayDragOverIsle(container, "sage_atoll", 411, "rare-market");
    expect(isleDropState(container, "sage_atoll")).toMatch(/^(available|hover)$/);
    await dragTrayPiece(container, "rare-market", isleHit(container, "sage_atoll"), 412);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"]).toHaveBeenCalledTimes(2);
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[1][0]).toMatchObject({
      boardIsleId: "sage_atoll",
      expectedMarket: { present: false },
      market: createUndescribedRareMarinerMarket(),
    });
    expect(container.querySelector("[data-rarity-prompt]")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("offers Add Market on a Nesting-Beast Isle and still blocks Ravaged and second Nest", async () => {
    const nested = withFriendlyNestingOnIsle(initializedMariner(), "sage_atoll");
    const { container, root } = renderSurface(nested, WIZARD);
    openIsleContext(container, "sage_atoll");
    expect(container.querySelector('[data-context-action="add-market"]')).not.toBeNull();
    expect(container.querySelector('[data-context-action="add-market-blocked"]')).toBeNull();
    expect(container.querySelector('[data-context-action="add-beast"]')).toBeNull();
    openIsleContext(container, "ishana");
    expect(container.querySelector('[data-context-action="add-beast"]')).not.toBeNull();
    openIsleContext(container, "sage_atoll");
    await act(async () => { contextAction(container, "add-market").click(); });
    expect(mockMutations["m3Commands.setMarinerIsleMarket"].mock.calls[0][0]).toMatchObject({
      boardIsleId: "sage_atoll",
      expectedMarket: { present: false },
      market: { present: true, rarity: null },
    });
    expect(mockMutations["m3Commands.updateMarinerBeast"]).not.toHaveBeenCalled();

    openIsleContext(container, "sage_atoll");
    expect(container.querySelector('[data-context-action="add-beast"]')).toBeNull();
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "druntyr"), 413);
    expect(isleDropState(container, "druntyr")).toBe("blocked");
    await dragBeastPiece(container, DEN_A, isleHit(container, "druntyr"), 414);
    expect(mockMutations["m3Commands.relocateMarinerNestingBeast"]).not.toHaveBeenCalled();

    const occupied = withNestingBeastOnIsle(initializedMariner(), "orrery");
    rerenderSurface(root, occupied);
    await hoverBeastDragOver(container, DEN_A, isleHit(container, "orrery"), 415);
    expect(isleDropState(container, "orrery")).toBe("blocked");
    await dragBeastPiece(container, DEN_A, isleHit(container, "orrery"), 416);
    expect(mockMutations["m3Commands.nestMarinerBeast"]).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
  });

  it("shows a derived Draft-4 warning only while Market and Nest coexist", async () => {
    const conflicted = withFriendlyNestingOnIsle(initializedMariner(), "scuttleport");
    const { container, root } = renderSurface(conflicted, WIZARD);
    const cue = container.querySelector('[data-draft4-conflict-warning][data-isle-id="scuttleport"]');
    expect(cue).not.toBeNull();
    expect(cue?.querySelector("title")?.textContent).toBe(DRAFT4_MARKET_NEST_WARNING);
    expect(cue?.getAttribute("aria-label")).toBe(DRAFT4_MARKET_NEST_WARNING);
    expect(container.querySelector('[data-draft4-conflict-warning][data-isle-id="orrery"]')).toBeNull();
    expect(container.textContent).not.toMatch(/invalid|corrupt|illegal move/i);

    flushSync(() => {
      isleHit(container, "scuttleport").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const isleInspector = container.querySelector("[data-board-overlay-inspector]");
    expect(isleInspector?.textContent).toContain(DRAFT4_MARKET_NEST_WARNING);
    expect(isleInspector?.textContent).not.toMatch(/server will reject/i);

    await act(async () => { button(container, "Close").click(); });
    const piece = beastPiece(container, DEN_A);
    await act(async () => {
      piece.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true, clientX: 15, clientY: 15, pointerId: 417, isPrimary: true, button: 0,
      }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 15, clientY: 15, pointerId: 417 }));
    });
    expect(container.querySelector("[data-beast-inspector]")?.textContent).toContain(DRAFT4_MARKET_NEST_WARNING);

    rerenderSurface(root, withFriendlyNestingOnIsle(initializedMariner(), "orrery"));
    expect(container.querySelector("[data-draft4-conflict-warning]")).toBeNull();
    flushSync(() => {
      isleHit(container, "orrery").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector("[data-board-overlay-inspector]")?.textContent).not.toContain(DRAFT4_MARKET_NEST_WARNING);
    root.unmount();
    container.remove();
  });

  it("prevents native selection on busy piece pointerdown and keeps board text unselectable", async () => {
    const start = initializedMariner();
    const { container, root } = renderSurface(start, WIZARD);
    const deferred = deferMutation("m3Commands.moveMarinerBeast");
    await beginPieceDrag(beastPiece(container, DEN_A), seaHit(container, "wizard_strait"), 418);
    releasePointer(418);
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();

    const busyDown = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: 18,
      clientY: 18,
      pointerId: 419,
      isPrimary: true,
      button: 0,
    });
    flushSync(() => { beastPiece(container, DEN_A).dispatchEvent(busyDown); });
    expect(busyDown.defaultPrevented).toBe(true);
    expect(container.querySelector("[data-drag-ghost]")).toBeNull();
    expect(container.querySelector('[data-beast-selected="true"]')).toBeNull();

    const board = container.querySelector("[data-mariner-board]");
    const stage = container.querySelector("[data-mariner-board-stage]");
    expect(`${board?.className ?? ""} ${stage?.className ?? ""}`).toMatch(/select-none/);

    await act(async () => { deferred.resolve(); });
    openIsleContext(container, "ishana");
    await act(async () => { contextAction(container, "add-rarity").click(); });
    const rarity = container.querySelector('input[aria-label="Rarity description"]') as HTMLInputElement | null;
    expect(rarity).not.toBeNull();
    expect(rarity?.disabled).toBe(false);
    expect(rarity?.className).toMatch(/select-text/);
    expect(rarity?.className).not.toMatch(/select-none/);
    root.unmount();
    container.remove();
  });
});
