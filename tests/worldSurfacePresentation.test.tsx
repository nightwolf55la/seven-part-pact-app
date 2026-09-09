// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const EMBER_ISLE_ID = "isle_ember";
const GLASS_ISLE_ID = "isle_glass";

const WORLD_REF = {
  denizens: [
    {
      denizenId: "den_thorn" as any,
      name: "Elder Thorn",
      representation: "individual" as const,
      description: "Keeper of the old road",
    },
    {
      denizenId: "den_choir" as any,
      name: "The Lantern Choir",
      representation: "collective" as const,
      description: "Voices beneath the stars",
    },
  ],
  isles: [
    {
      isleId: EMBER_ISLE_ID as any,
      name: "Ember Isle",
      description: "An isle of warm stone",
    },
    {
      isleId: GLASS_ISLE_ID as any,
      name: "Glass Isle",
      description: null,
    },
  ],
  places: [
    {
      placeId: "plc_ash" as any,
      name: "Ash Tower",
      description: "A blackened tower",
      placement: { kind: "on_isle" as const, isleId: EMBER_ISLE_ID as any },
    },
    {
      placeId: "plc_wander" as any,
      name: "The Wandering House",
      description: null,
      placement: { kind: "mobile" as const, associatedIsleId: GLASS_ISLE_ID as any },
    },
    {
      placeId: "plc_cross" as any,
      name: "The Crossroads",
      description: null,
      placement: { kind: "unspecified" as const },
    },
  ],
};

const PLAY_REF = {
  monthOrdinal: 1,
  phase: "planning" as const,
  orreryPositions: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
  players: [],
  wizards: [],
  pactSeats: {},
};

let mockPlayRef: typeof PLAY_REF | undefined = PLAY_REF;
let mockWorldRef: typeof WORLD_REF | undefined | null = WORLD_REF;

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Queries: {
      getPlayReference: "m3Queries.getPlayReference",
      getWorldReference: "m3Queries.getWorldReference",
      getHierophantReference: "m3Queries.getHierophantReference",
    },
    m3Commands: {
      createDenizen: "m3Commands.createDenizen",
      updateDenizen: "m3Commands.updateDenizen",
      createIsle: "m3Commands.createIsle",
      updateIsle: "m3Commands.updateIsle",
      createPlace: "m3Commands.createPlace",
      updatePlace: "m3Commands.updatePlace",
    },
  },
}));

// Override useQuery to distinguish between the two queries
vi.mock("convex/react", () => ({
  useQuery: (queryRef: string) => {
    if (queryRef === "m3Queries.getPlayReference") return mockPlayRef;
    if (queryRef === "m3Queries.getWorldReference") return mockWorldRef;
    if (queryRef === "m3Queries.getHierophantReference") {
      return { campaignId: "camp_1", campaignRevision: 1, hierophant: { temples: [], selectedFlameLawIds: [], campaignClasses: [], campaignDoctrines: [], supplicants: [], prophets: [], cults: [], holidayTempleIds: [] } };
    }
    return undefined;
  },
  useMutation: () => vi.fn(async () => {}),
}));

vi.mock("../src/CampaignTools", () => ({
  default: () => createElement("div", { "data-testid": "campaign-tools" }, "Campaign Tools"),
}));

vi.mock("../src/CurrentPhaseSurface", () => ({
  default: () => createElement("div", { "data-testid": "current-phase" }, "Current Phase"),
}));

vi.mock("../src/OrreryView", () => ({
  default: () => createElement("div", { "data-testid": "orrery" }, "Orrery"),
}));

vi.mock("../src/TableWizards", () => ({
  default: () => createElement("div", { "data-testid": "table-wizards" }, "Table Wizards"),
}));

import PlayShell from "../src/PlayShell";

function renderShell(): string {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(
      createElement(PlayShell, {
        campaignId: "camp_1",
        campaignRevision: 1,
        monthDisplayName: "Month 1",
        phase: "planning" as const,
      }),
    );
  });
  const html = container.innerHTML;
  root.unmount();
  container.remove();
  return html;
}

describe("World surface presentation", () => {
  it("World surface shows denizens, isles, and places with placement", () => {
    mockPlayRef = PLAY_REF;
    mockWorldRef = WORLD_REF;

    const html = renderShell();

    // World surface control exists
    expect(html).toContain("World");

    // Navigate to the World surface in the primary pane
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        createElement(PlayShell, {
          campaignId: "camp_1",
          campaignRevision: 1,
          monthDisplayName: "Month 1",
          phase: "planning" as const,
        }),
      );
    });

    const worldButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "World",
    );
    expect(worldButton).toBeDefined();
    flushSync(() => {
      worldButton!.click();
    });

    // Default tab is Denizens — Elder Thorn is visible
    expect(container.innerHTML).toContain("Denizens");
    expect(container.innerHTML).toContain("Elder Thorn");

    // Switch to Isles tab
    const islesButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Isles",
    );
    expect(islesButton).toBeDefined();
    flushSync(() => {
      islesButton!.click();
    });
    let htmlAfter = container.innerHTML;
    expect(htmlAfter).toContain("Ember Isle");

    // Switch to Places tab
    const placesButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Places",
    );
    expect(placesButton).toBeDefined();
    flushSync(() => {
      placesButton!.click();
    });
    htmlAfter = container.innerHTML;
    expect(htmlAfter).toContain("Ash Tower");
    // Placement display includes Ember Isle name
    expect(htmlAfter).toContain("Ember Isle");

    root.unmount();
    container.remove();
  });

  it("filter is case-insensitive and filters the active tab", () => {
    mockPlayRef = PLAY_REF;
    mockWorldRef = WORLD_REF;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        createElement(PlayShell, {
          campaignId: "camp_1",
          campaignRevision: 1,
          monthDisplayName: "Month 1",
          phase: "planning" as const,
        }),
      );
    });

    // Navigate to the World surface first
    const worldButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "World",
    );
    expect(worldButton).toBeDefined();
    flushSync(() => {
      worldButton!.click();
    });

    // Active tab is Denizens by default
    expect(container.innerHTML).toContain("Elder Thorn");
    expect(container.innerHTML).toContain("The Lantern Choir");

    // Enter filter "lantern" into the filter input
    const filterInput = container.querySelector('input[placeholder="Filter world…"]') as HTMLInputElement;
    expect(filterInput).toBeDefined();
    flushSync(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      nativeInputValueSetter.call(filterInput, "lantern");
      filterInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const htmlAfter = container.innerHTML;
    expect(htmlAfter).toContain("The Lantern Choir");
    expect(htmlAfter).not.toContain("Elder Thorn");

    root.unmount();
    container.remove();
  });
});
