// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { CampaignStateV5, IsleId, LoreCollectionId, LoreEntryId, PlaceId, PlayerId, WizardId } from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  LORE_PROVENANCE_ADDED_IN_PLAY,
  LORE_PROVENANCE_CHANGED_IN_PLAY,
  applyReviseLoreEntry,
  buildInitializedDefaultNecromancerState,
  readLoreCompendiumReference,
} from "../shared/domain";
import LoreSurface from "../src/LoreSurface";
import LoreContextPanel from "../src/LoreContextPanel";
import { makeTestCampaignStateV5 } from "./test-state";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_NECRO = "wiz_00000000-0000-0000-0000-0000000000aa" as WizardId;
const ISL_GRAVEN = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const ISL_DRIFT = "isl_00000000-0000-0000-0000-0000000000ab" as IsleId;
const PLC_CRYPT = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const LCOL_1 = "lcol_00000000-0000-0000-0000-0000000000aa" as LoreCollectionId;
const LORE_1 = "lore_00000000-0000-0000-0000-0000000000aa" as LoreEntryId;
const GRAVEN_E01 =
  "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.";
const GRAVEN_SUBJECT = { kind: "isle" as const, isleId: ISL_GRAVEN };

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
      addLoreEntry: "m3Commands.addLoreEntry",
      reviseLoreEntry: "m3Commands.reviseLoreEntry",
    },
  },
}));

function wizard() {
  return {
    wizardId: WIZ_NECRO,
    name: "The Necromancer",
    portrayedByPlayerId: PLR_A,
    character: { ...BLANK_WIZARD_CHARACTER_V5 },
    homeIsleId: ISL_GRAVEN,
    sanctumPlaceId: PLC_CRYPT,
    mortalityState: "not_deceased" as const,
  };
}

function boundState(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard()],
    pactSeats: {
      ...makeTestCampaignStateV5().pactSeats,
      necromancer: { status: "present", wizardId: WIZ_NECRO, watcherPlayerId: null },
    },
    world: {
      denizens: [],
      isles: [
        { isleId: ISL_GRAVEN, name: "Graven Isle", description: null },
        { isleId: ISL_DRIFT, name: "The Driftwood Isle", description: null },
      ],
      places: [
        { placeId: PLC_CRYPT, name: "Crypt", description: null, placement: { kind: "on_isle", isleId: ISL_GRAVEN } },
      ],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    },
    necromancer: buildInitializedDefaultNecromancerState({
      campaignGates: [{
        origin: "campaign",
        gateId: "ngt_00000000-0000-0000-0000-0000000000aa" as never,
        name: "The Ash Gate",
        band: "near",
        status: "ordinary",
      }],
    }),
    ...overrides,
  });
}

function presentationFrom(state: CampaignStateV5) {
  const result = readLoreCompendiumReference(state);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("presentation expected");
  return result;
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value",
  )!.set!;
  flushSync(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function button(container: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((el) => el.textContent?.trim() === text);
  if (found === undefined) throw new Error(`Missing button: ${text}`);
  return found as HTMLButtonElement;
}

beforeEach(() => {
  for (const key of Object.keys(mockMutations)) {
    mockMutations[key]?.mockClear();
  }
});

describe("LoreSurface presentation", () => {
  it("renders subject-oriented Compendium without raw Lore IDs in default browse", () => {
    const presentation = presentationFrom(boundState());
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(LoreSurface, {
        campaignId: CAMPAIGN_ID,
        uiState: { status: "ready", presentation },
      }));
    });
    expect(container.textContent).toContain("Compendium");
    expect(container.textContent).not.toMatch(/lcol_/);
    expect(container.textContent).not.toMatch(/necromancer\.home\./);
    expect(container.textContent).not.toContain("The Driftwood Isle — Available for Lore");
    flushSync(() => {
      button(container, "Show subjects available for Lore").click();
    });
    expect(container.textContent).toContain("The Driftwood Isle — Available for Lore");
    root.unmount();
    container.remove();
  });

  it("shows provenance, separate contexts, printed wording, and add/revise flows", () => {
    const presentation = presentationFrom(boundState({
      lore: {
        sourceCollections: [
          {
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: GRAVEN_SUBJECT,
            overrides: [{ sourceEntryId: "e01", currentText: "The Graven Isle is quieter." }],
            additions: [{ loreEntryId: LORE_1, text: "A new memorial was raised this year." }],
          },
          {
            sourceCollectionId: "mariner.delegated.graven_isle",
            boundSubject: GRAVEN_SUBJECT,
            overrides: [],
            additions: [],
          },
        ],
        campaignCollections: [],
      },
    }));
    const graven = presentation.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(LoreContextPanel, {
        subject: graven,
        campaignId: CAMPAIGN_ID,
      }));
    });
    expect(container.textContent).toContain(LORE_PROVENANCE_CHANGED_IN_PLAY);
    expect(container.textContent).toContain(LORE_PROVENANCE_ADDED_IN_PLAY);
    expect(container.textContent).toContain("Necromancer");
    expect(container.textContent).toContain("Mariner");
    expect(container.querySelectorAll('[role="tab"]').length).toBeGreaterThan(1);
    flushSync(() => {
      button(container, "Printed wording").click();
    });
    expect(container.textContent).toContain(GRAVEN_E01);

    flushSync(() => {
      button(container, "Revise").click();
    });
    const textarea = container.querySelector(`textarea[aria-label="Revise Lore text"]`) as HTMLTextAreaElement;
    setInputValue(textarea, "  Table revision with spaces  ");
    flushSync(() => {
      button(container, "Save").click();
    });
    const reviseCall = mockMutations["m3Commands.reviseLoreEntry"];
    expect(reviseCall).toHaveBeenCalled();
    const revisePayload = reviseCall.mock.calls[0]?.[0];
    expect(revisePayload.text).toBe("  Table revision with spaces  ");

    root.unmount();
    container.remove();
  });
});

describe("LoreContextPanel stale conflict", () => {
  it("preserves draft, blocks save, and supports use latest as base", () => {
    const base = boundState({
      lore: {
        sourceCollections: [{
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: GRAVEN_SUBJECT,
          overrides: [],
          additions: [],
        }],
        campaignCollections: [],
      },
    });
    const presentationBefore = presentationFrom(base);
    const gravenBefore = presentationBefore.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const revised = applyReviseLoreEntry(base, {
      target: {
        kind: "source_entry",
        sourceCollectionId: "necromancer.home.graven_isle",
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: GRAVEN_E01,
      text: "Server moved on.",
    }).nextState;
    const presentationAfter = presentationFrom(revised);
    const gravenAfter = presentationAfter.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;

    function StaleHarness() {
      const [subject, setSubject] = useState(gravenBefore);
      return createElement("div", null,
        createElement("button", { type: "button", onClick: () => setSubject(gravenAfter) }, "Apply server change"),
        createElement(LoreContextPanel, { subject, campaignId: CAMPAIGN_ID }),
      );
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(StaleHarness));
    });
    flushSync(() => {
      button(container, "Revise").click();
    });
    const textarea = container.querySelector(`textarea[aria-label="Revise Lore text"]`) as HTMLTextAreaElement;
    setInputValue(textarea, "Draft preserved.");
    flushSync(() => {
      button(container, "Apply server change").click();
    });
    expect(container.textContent).toContain("Your draft is preserved");
    expect(container.textContent).toContain("Server moved on.");
    expect((container.querySelector(`textarea[aria-label="Revise Lore text"]`) as HTMLTextAreaElement).value).toBe("Draft preserved.");
    const saveBtn = button(container, "Save");
    expect(saveBtn.disabled).toBe(true);
    flushSync(() => {
      button(container, "Use latest as base").click();
    });
    expect(saveBtn.disabled).toBe(false);
    expect((container.querySelector(`textarea[aria-label="Revise Lore text"]`) as HTMLTextAreaElement).value).toBe("Draft preserved.");

    root.unmount();
    container.remove();
  });
});
