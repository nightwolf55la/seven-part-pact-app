// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  buildInitializedDefaultNecromancerState,
  type NecromancerCampaignGateId,
  type NecromancerCampaignPathSpaceId,
} from "../shared/domain";
import NecromancerSurface from "../src/NecromancerSurface";
import type { WorldReference } from "../src/WorldSurface";
import { pathSpaceDisplayName } from "../src/necromancer-view-model";

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
      addNecromancerAlly: "m3Commands.addNecromancerAlly",
      updateNecromancerAlly: "m3Commands.updateNecromancerAlly",
      removeNecromancerAlly: "m3Commands.removeNecromancerAlly",
      addNecromancerGhoulCaller: "m3Commands.addNecromancerGhoulCaller",
      updateNecromancerGhoulCaller: "m3Commands.updateNecromancerGhoulCaller",
      removeNecromancerGhoulCaller: "m3Commands.removeNecromancerGhoulCaller",
      createNecromancerCampaignGate: "m3Commands.createNecromancerCampaignGate",
      updateNecromancerCampaignGate: "m3Commands.updateNecromancerCampaignGate",
      createNecromancerCampaignPathSpace: "m3Commands.createNecromancerCampaignPathSpace",
      removeNecromancerCampaignPathSpace: "m3Commands.removeNecromancerCampaignPathSpace",
      addNecromancerStep: "m3Commands.addNecromancerStep",
      removeNecromancerStep: "m3Commands.removeNecromancerStep",
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
      disposition: "disruptive",
      location: { kind: "path", pathSpaceId: "edge_sage" },
      pettyDeadCount: 0,
      primaryElement: "fire",
      aesthetic: "ash-stained funeral silks",
      strangeQuirk: "counts backwards from thirteen",
      ageYears: 47,
    }],
  });
}

function renderSurface() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(NecromancerSurface, {
      necromancer: initializedWithCampaignStructure(),
      world: WORLD,
      campaignId: CAMPAIGN_ID,
      necromancerWizard: null,
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
