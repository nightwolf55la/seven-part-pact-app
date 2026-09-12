// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  buildInitializedDefaultNecromancerState,
  readLoreCompendiumReference,
  type NecromancerCampaignGateId,
  type NecromancerCampaignPathSpaceId,
  type NecromancerState,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import NecromancerSurface from "../src/NecromancerSurface";
import type { WorldReference } from "../src/WorldSurface";
import { MAX_VISIBLE_SOUL_BEADS, pathSpaceDisplayName } from "../src/necromancer-view-model";
import type { SorcererExternalPresence } from "../shared/domain";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_GATE_ID = "ngt_00000000-0000-0000-0000-000000000010" as NecromancerCampaignGateId;
const CAMPAIGN_PATH_A = "nps_00000000-0000-0000-0000-000000000098" as NecromancerCampaignPathSpaceId;
const CAMPAIGN_PATH_B = "nps_00000000-0000-0000-0000-000000000099" as NecromancerCampaignPathSpaceId;

const WORLD: WorldReference = {
  denizens: [],
  isles: [],
  places: [],
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
      initializeNecromancer: "m3Commands.initializeNecromancer",
      setNecromancerDepth: "m3Commands.setNecromancerDepth",
      setSelectedDeathLaws: "m3Commands.setSelectedDeathLaws",
      setNecromancerGateStatus: "m3Commands.setNecromancerGateStatus",
      setNecromancerSoulCount: "m3Commands.setNecromancerSoulCount",
      moveNecromancerSouls: "m3Commands.moveNecromancerSouls",
      addNecromancerFoe: "m3Commands.addNecromancerFoe",
      updateNecromancerFoe: "m3Commands.updateNecromancerFoe",
      removeNecromancerFoe: "m3Commands.removeNecromancerFoe",
      escapeNecromancerWizardFoe: "m3Commands.escapeNecromancerWizardFoe",
      addNecromancerWizardFoeTruth: "m3Commands.addNecromancerWizardFoeTruth",
      updateNecromancerWizardFoeTruth: "m3Commands.updateNecromancerWizardFoeTruth",
      removeNecromancerWizardFoeTruth: "m3Commands.removeNecromancerWizardFoeTruth",
      addNecromancerWizardTraversal: "m3Commands.addNecromancerWizardTraversal",
      updateNecromancerWizardTraversal: "m3Commands.updateNecromancerWizardTraversal",
      removeNecromancerWizardTraversal: "m3Commands.removeNecromancerWizardTraversal",
      addNecromancerAlly: "m3Commands.addNecromancerAlly",
      transformNecromancerSoulIntoAlly: "m3Commands.transformNecromancerSoulIntoAlly",
      updateNecromancerAlly: "m3Commands.updateNecromancerAlly",
      removeNecromancerAlly: "m3Commands.removeNecromancerAlly",
      addNecromancerGhoulCaller: "m3Commands.addNecromancerGhoulCaller",
      updateNecromancerGhoulCaller: "m3Commands.updateNecromancerGhoulCaller",
      removeNecromancerGhoulCaller: "m3Commands.removeNecromancerGhoulCaller",
      setPowerfulDenizenStatus: "m3Commands.setPowerfulDenizenStatus",
      createNecromancerCampaignGate: "m3Commands.createNecromancerCampaignGate",
      updateNecromancerCampaignGate: "m3Commands.updateNecromancerCampaignGate",
      createNecromancerCampaignPathSpace: "m3Commands.createNecromancerCampaignPathSpace",
      removeNecromancerCampaignPathSpace: "m3Commands.removeNecromancerCampaignPathSpace",
      addNecromancerStep: "m3Commands.addNecromancerStep",
      removeNecromancerStep: "m3Commands.removeNecromancerStep",
      addLoreEntry: "m3Commands.addLoreEntry",
      reviseLoreEntry: "m3Commands.reviseLoreEntry",
    },
  },
}));

function initializedWithCampaignStructure() {
  return buildInitializedDefaultNecromancerState({
    campaignGates: [{
      origin: "campaign",
      gateId: CAMPAIGN_GATE_ID,
      name: "Nightwell",
      band: "near",
      status: "ordinary",
    }],
    campaignPathSpaces: [
      { origin: "campaign", pathSpaceId: CAMPAIGN_PATH_A, region: "edge_of_life" },
      { origin: "campaign", pathSpaceId: CAMPAIGN_PATH_B, region: "edge_of_life" },
    ],
    ghoulCallers: [{
      denizenId: "den_00000000-0000-0000-0000-000000000006" as never,
      location: { kind: "path", pathSpaceId: "edge_sage" },
      pettyDeadCount: 0,
      primaryElement: "fire",
      aesthetic: "ash-stained funeral silks",
      strangeQuirk: "counts backwards from thirteen",
      ageYears: 47,
    }],
  });
}

function loreCompendiumReady() {
  const state = makeTestCampaignStateV5({
    necromancer: initializedWithCampaignStructure(),
  });
  const presentation = readLoreCompendiumReference(state);
  expect(presentation.ok).toBe(true);
  if (!presentation.ok) throw new Error("presentation expected");
  return { status: "ready" as const, presentation };
}

function renderSurface(extra?: {
  loreCompendium?: ReturnType<typeof loreCompendiumReady>;
  necromancer?: NecromancerState;
  world?: WorldReference;
  sorcererPresence?: readonly SorcererExternalPresence[];
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const necromancer = extra?.necromancer ?? initializedWithCampaignStructure();
  flushSync(() => {
    root.render(createElement(NecromancerSurface, {
      necromancer,
      world: extra?.world ?? WORLD,
      campaignId: CAMPAIGN_ID,
      necromancerWizard: null,
      wizards: [],
      loreCompendium: extra?.loreCompendium ?? loreCompendiumReady(),
      sorcererPresence: extra?.sorcererPresence ?? [],
    }));
  });
  return { container, root };
}

function button(container: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((el) => el.textContent === text);
  if (found === undefined) throw new Error(`Missing button: ${text}`);
  return found as HTMLButtonElement;
}

describe("campaign structure inspect controls", () => {
  it("selects a campaign Gate into the existing inspector", () => {
    const { container, root } = renderSurface();
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    flushSync(() => {
      details!.open = true;
      details!.dispatchEvent(new Event("toggle", { bubbles: true }));
    });
    const inspectGate = container.querySelector(`button[aria-label="Inspect Nightwell"]`);
    expect(inspectGate).not.toBeNull();
    flushSync(() => {
      (inspectGate as HTMLButtonElement).click();
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.textContent).toContain("Nightwell");
    expect(inspector?.textContent).toContain("Gate status");
    expect(inspector?.textContent).toContain("Soul count");
    expect(inspector?.textContent).toContain("Move Souls");
    root.unmount();
    container.remove();
  });

  it("selects a campaign path space into the existing inspector", () => {
    const { container, root } = renderSurface();
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    flushSync(() => {
      details!.open = true;
      details!.dispatchEvent(new Event("toggle", { bubbles: true }));
    });
    const pathLabel = pathSpaceDisplayName({
      origin: "campaign",
      pathSpaceId: CAMPAIGN_PATH_A,
      region: "edge_of_life",
    });
    const inspectPath = container.querySelector(`button[aria-label="Inspect ${pathLabel}"]`);
    expect(inspectPath).not.toBeNull();
    flushSync(() => {
      (inspectPath as HTMLButtonElement).click();
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.textContent).toContain(pathLabel);
    expect(inspector?.textContent).toContain("Soul count");
    expect(inspector?.textContent).toContain("Move Souls");
    expect(inspector?.textContent).not.toContain("Gate status");
    root.unmount();
    container.remove();
  });

  it("does not add a second inspect-button system for built-in SVG nodes", () => {
    const { container, root } = renderSurface();
    expect(button(container, "Inspect")).toBeDefined();
    const details = container.querySelector("details");
    flushSync(() => {
      details!.open = true;
    });
    const inspectButtons = Array.from(container.querySelectorAll("button")).filter((el) => el.textContent === "Inspect");
    expect(inspectButtons).toHaveLength(3);
    root.unmount();
    container.remove();
  });
});

describe("Gate inspector contextual Lore", () => {
  it("shows source Lore for a built-in Gate in the existing inspector", () => {
    const { container, root } = renderSurface();
    const amberGate = container.querySelector('[aria-label^="I Amber ordinary"]');
    expect(amberGate).not.toBeNull();
    flushSync(() => {
      (amberGate as Element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.textContent).toContain("Amber");
    expect(inspector?.querySelector(`[aria-label="Lore context panel"]`)).not.toBeNull();
    expect(inspector?.textContent).toContain("massive edifice");
    expect(container.querySelectorAll(`[aria-label="Selected space"]`)).toHaveLength(1);
    root.unmount();
    container.remove();
  });

  it("shows campaign Gate Lore or first Add in the same inspector", () => {
    const { container, root } = renderSurface();
    const details = container.querySelector("details");
    flushSync(() => {
      details!.open = true;
      details!.dispatchEvent(new Event("toggle", { bubbles: true }));
    });
    const inspectGate = container.querySelector(`button[aria-label="Inspect Nightwell"]`);
    flushSync(() => {
      (inspectGate as HTMLButtonElement).click();
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.querySelector(`[aria-label="Lore context panel"]`)).not.toBeNull();
    expect(inspector?.textContent).toMatch(/Add Lore|Available for Lore|Nightwell/);
    root.unmount();
    container.remove();
  });

  it("does not show contextual Lore when inspecting a path space", () => {
    const { container, root } = renderSurface();
    const details = container.querySelector("details");
    flushSync(() => {
      details!.open = true;
      details!.dispatchEvent(new Event("toggle", { bubbles: true }));
    });
    const pathLabel = pathSpaceDisplayName({
      origin: "campaign",
      pathSpaceId: CAMPAIGN_PATH_A,
      region: "edge_of_life",
    });
    const inspectPath = container.querySelector(`button[aria-label="Inspect ${pathLabel}"]`);
    flushSync(() => {
      (inspectPath as HTMLButtonElement).click();
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.querySelector(`[aria-label="Lore context panel"]`)).toBeNull();
    root.unmount();
    container.remove();
  });
});

describe("Ghoul-Caller durable profile presentation", () => {
  it("shows Primary Element, Aesthetic, Strange Quirk, and Age in ordinary Ghoul-Caller management", () => {
    const { container, root } = renderSurface();
    expect(container.textContent).toContain("Primary Element Fire");
    expect(container.textContent).toContain("Aesthetic ash-stained funeral silks");
    expect(container.textContent).toContain("Strange Quirk counts backwards from thirteen");
    expect(container.textContent).toContain("Age 47");
    expect(container.querySelector(`[aria-label="Add Ghoul-Caller Primary Element"]`)).not.toBeNull();
    expect(container.querySelector(`[aria-label="Add Ghoul-Caller Aesthetic"]`)).not.toBeNull();
    expect(container.querySelector(`[aria-label="Add Ghoul-Caller Strange Quirk"]`)).not.toBeNull();
    expect(container.querySelector(`[aria-label="Add Ghoul-Caller Age"]`)).not.toBeNull();
    root.unmount();
    container.remove();
  });
});

describe("Gates board operability presentation", () => {
  it("keeps original Gate topology labels, Hostile/Destroyed text, and a five-plus Soul warning", () => {
    const necromancer = buildInitializedDefaultNecromancerState({
      gateStatuses: { ivory: "hostile", terminus: "destroyed" },
      souls: [{ location: { kind: "gate", gateId: "amber" }, count: 6 }],
    });
    const { container, root } = renderSurface({ necromancer });
    expect(container.querySelector('[aria-label="Gates of Death board"]')).not.toBeNull();
    expect(container.textContent).toContain("I Amber");
    expect(container.textContent).toContain("Edge of Life — Depth 1");
    expect(container.textContent).toContain("Hostile");
    expect(container.textContent).toContain("Destroyed");
    expect(container.textContent).toContain("5+ Souls pending");
    const ivory = container.querySelector('[aria-label^="IV Ivory hostile"]');
    expect(ivory).not.toBeNull();
    flushSync(() => {
      (ivory as Element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector(`[aria-label="Selected space"]`)?.textContent).toContain("not a Cleanse Gate");
    expect(Array.from(container.querySelectorAll("button")).some((el) => el.textContent === "Rebuff")).toBe(false);
    root.unmount();
    container.remove();
  });

  it("bounds Soul bead DOM growth for a large valid counter", () => {
    const necromancer = buildInitializedDefaultNecromancerState({
      souls: [{ location: { kind: "gate", gateId: "amber" }, count: 5000 }],
    });
    const { container, root } = renderSurface({ necromancer });
    const beads = container.querySelector('[data-soul-beads="5000"]');
    expect(beads).not.toBeNull();
    expect(beads!.querySelectorAll("circle")).toHaveLength(MAX_VISIBLE_SOUL_BEADS);
    expect(container.textContent).toContain("5000");
    root.unmount();
    container.remove();
  });

  it("offers Transform Soul into Ally only at an eligible Gate and submits one compound mutation", async () => {
    mockMutations["m3Commands.transformNecromancerSoulIntoAlly"] = vi.fn(async () => {
      throw new Error("stale soul count");
    });
    mockMutations["m3Commands.setNecromancerSoulCount"] = vi.fn(async () => {});
    mockMutations["m3Commands.addNecromancerAlly"] = vi.fn(async () => {});
    const necromancer = buildInitializedDefaultNecromancerState({
      souls: [{ location: { kind: "gate", gateId: "amber" }, count: 2 }],
    });
    const { container, root } = renderSurface({ necromancer });
    const amber = container.querySelector('[aria-label^="I Amber ordinary"]');
    flushSync(() => {
      (amber as Element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.textContent).toContain("Transform Soul into Ally");
    const name = container.querySelector('[aria-label="New Ally name"]') as HTMLInputElement;
    expect(name).not.toBeNull();
    flushSync(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Bound Mira");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const form = inspector!.querySelector("form") as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await Promise.resolve();
    expect(mockMutations["m3Commands.transformNecromancerSoulIntoAlly"]).toHaveBeenCalledTimes(1);
    const firstArgs = mockMutations["m3Commands.transformNecromancerSoulIntoAlly"].mock.calls[0]?.[0];
    expect(firstArgs.gateId).toBe("amber");
    expect(firstArgs.expectedSoulCount).toBe(2);
    expect(mockMutations["m3Commands.setNecromancerSoulCount"]).not.toHaveBeenCalled();
    expect(mockMutations["m3Commands.addNecromancerAlly"]).not.toHaveBeenCalled();
    expect((container.querySelector('[aria-label="New Ally name"]') as HTMLInputElement).value).toBe("Bound Mira");
    flushSync(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await Promise.resolve();
    const secondArgs = mockMutations["m3Commands.transformNecromancerSoulIntoAlly"].mock.calls[1]?.[0];
    expect(secondArgs.commandId).toBe(firstArgs.commandId);
    expect(secondArgs.denizenId).toBe(firstArgs.denizenId);

    const terminus = container.querySelector('[aria-label^="XI Terminus ordinary"]');
    flushSync(() => {
      (terminus as Element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector(`[aria-label="Selected space"]`)?.textContent).not.toContain("Transform Soul into Ally");
    root.unmount();
    container.remove();
  });

  it("places Final Death Researcher at Final Death, not Terminus, and ignores other-Domain markers", () => {
    const { container, root } = renderSurface({
      sorcererPresence: [
        {
          kind: "researcher",
          denizenId: "den_00000000-0000-0000-0000-0000000000aa" as never,
          name: "Ashen Watcher",
          operationalThisMonth: true,
          positionId: "srp_necromancer_final_death",
          target: { kind: "necromancer_final_death" },
        },
        {
          kind: "researcher",
          denizenId: "den_00000000-0000-0000-0000-0000000000ab" as never,
          name: "Lina the Seer",
          operationalThisMonth: false,
          positionId: "srp_temple_krolis",
          target: { kind: "hierophant_temple", templeId: "krolis" },
        },
        {
          kind: "disruptive_arcanist",
          denizenId: "den_00000000-0000-0000-0000-0000000000ac" as never,
          name: "Vex",
          school: { kind: "source", schoolId: "invocation" },
          seatId: "hierophant",
        },
        {
          kind: "disruptive_arcanist",
          denizenId: "den_00000000-0000-0000-0000-0000000000ad" as never,
          name: "Grave Scholar",
          school: { kind: "source", schoolId: "invocation" },
          seatId: "necromancer",
        },
      ],
    });
    expect(container.querySelector('[data-researcher-target="necromancer_final_death"]')?.textContent).toContain("Ashen Watcher");
    expect(container.querySelector('[data-researcher-target="necromancer_final_death"]')?.textContent).toContain("Working this month");
    expect(container.textContent).toContain("Grave Scholar");
    expect(container.textContent).not.toContain("Lina the Seer");
    expect(container.textContent).not.toContain("Vex");
    const terminus = container.querySelector('[aria-label^="XI Terminus ordinary"]');
    expect(terminus?.textContent).not.toContain("Ashen Watcher");
    root.unmount();
    container.remove();
  });

  it("keeps named occupants reachable and Advanced corrections available", () => {
    const necromancer = buildInitializedDefaultNecromancerState({
      souls: [{ location: { kind: "gate", gateId: "amber" }, count: 2 }],
      foes: [{
        subject: { kind: "denizen", denizenId: "den_foe" as never },
        location: { kind: "gate", gateId: "amber" },
      }],
      allies: [{ denizenId: "den_ally" as never, location: { kind: "gate", gateId: "amber" } }],
      ghoulCallers: [{
        denizenId: "den_ghoul" as never,
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "fire",
        aesthetic: "ash",
        strangeQuirk: "whispers",
        ageYears: 40,
      }],
    });
    const world: WorldReference = {
      denizens: [
        { denizenId: "den_foe", name: "Howling Foe", representation: "individual", description: null },
        { denizenId: "den_ally", name: "Loyal Ally", representation: "individual", description: null },
        { denizenId: "den_ghoul", name: "Ash Caller", representation: "individual", description: null },
      ],
      isles: [],
      places: [],
    };
    const { container, root } = renderSurface({ necromancer, world });
    const amber = container.querySelector('[aria-label^="I Amber ordinary"]');
    flushSync(() => {
      (amber as Element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector(`[aria-label="Selected space"]`);
    expect(inspector?.textContent).toContain("Howling Foe");
    expect(inspector?.textContent).toContain("Loyal Ally");
    expect(container.textContent).toContain("Ash Caller");
    expect(inspector?.querySelector('[aria-label="All occupants"]')?.textContent).toContain("Howling Foe");
    const pieces = Array.from(container.querySelectorAll("details")).find((el) => el.textContent?.includes("Advanced / Correct Board — pieces"));
    expect(pieces).not.toBeNull();
    flushSync(() => {
      pieces!.open = true;
    });
    expect(container.textContent).toContain("Rebuff is not automated");
    root.unmount();
    container.remove();
  });
});
