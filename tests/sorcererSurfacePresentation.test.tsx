// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { DenizenId, WizardId } from "../shared/domain";
import type { SorcererBoardReference } from "../shared/domain";
import SorcererSurface from "../src/SorcererSurface";
import type { LoreCompendiumUiState } from "../src/lore-view-model";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

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
      recruitSorcererPersonnel: "m3Commands.recruitSorcererPersonnel",
      refocusSorcererResearcher: "m3Commands.refocusSorcererResearcher",
      tutorSorcererStudent: "m3Commands.tutorSorcererStudent",
      setSorcererResearcherOperationalThisMonth: "m3Commands.setSorcererResearcherOperationalThisMonth",
      adjustSorcererKnowledge: "m3Commands.adjustSorcererKnowledge",
      setSorcererArchivesOpen: "m3Commands.setSorcererArchivesOpen",
      moveSorcererTowerMagicConsumable: "m3Commands.moveSorcererTowerMagicConsumable",
      setSorcererResearcherProductionMultipliers: "m3Commands.setSorcererResearcherProductionMultipliers",
      setSorcererLaws: "m3Commands.setSorcererLaws",
      createSorcererCampaignDefinition: "m3Commands.createSorcererCampaignDefinition",
      updateSorcererCampaignDefinition: "m3Commands.updateSorcererCampaignDefinition",
      addSorcererArcanist: "m3Commands.addSorcererArcanist",
      updateSorcererArcanist: "m3Commands.updateSorcererArcanist",
      addSorcererConstruct: "m3Commands.addSorcererConstruct",
      setSorcererConstructInstructions: "m3Commands.setSorcererConstructInstructions",
      addPowerfulDenizenTruth: "m3Commands.addPowerfulDenizenTruth",
      removePowerfulDenizenTruth: "m3Commands.removePowerfulDenizenTruth",
      addSorcererInnovation: "m3Commands.addSorcererInnovation",
      reviseSorcererInnovation: "m3Commands.reviseSorcererInnovation",
      removeSorcererInnovation: "m3Commands.removeSorcererInnovation",
      rearrangeSorcererTower: "m3Commands.rearrangeSorcererTower",
    },
  },
}));

const PRESENTATION: SorcererBoardReference = {
  initialized: true,
  spyrholm: { isleId: "isl_00000000-0000-0000-0000-0000000000aa" as never, name: "Spyrholm" },
  tower: { placeId: "plc_00000000-0000-0000-0000-0000000000aa" as never, name: "Sorcerer's Tower" },
  university: { placeId: "plc_00000000-0000-0000-0000-0000000000ab" as never, name: "Spyrholm University" },
  towerOrder: [denizenId(4), denizenId(7), denizenId(10)],
  towerOccupants: [
    { denizenId: denizenId(4), name: "Sera", role: { kind: "student" } },
    { denizenId: denizenId(7), name: "Halden", role: { kind: "professor" } },
    {
      denizenId: denizenId(10),
      name: "Vesper",
      role: {
        kind: "reliable_tower_arcanist",
        school: { kind: "source", schoolId: "enchantment" },
        schoolLabel: "Enchantment",
      },
    },
  ],
  researchPositions: [
    {
      positionId: "srp_orrery_1",
      target: { kind: "orrery_house", house: 0 },
      targetLabel: "Aries",
      occupant: { denizenId: denizenId(1), name: "Rook", operationalThisMonth: true },
    },
    {
      positionId: "srp_court_1",
      target: { kind: "warlock_ideology", ideologyId: "aristocracy" },
      targetLabel: "Aristocracy",
      occupant: { denizenId: denizenId(2), name: "Nim", operationalThisMonth: false },
    },
    {
      positionId: "srp_sea_1",
      target: { kind: "mariner_sea_region", seaRegionId: "bay_of_ishana" },
      targetLabel: "Bay of Ishana",
      occupant: null,
    },
    {
      positionId: "srp_temple_krolis",
      target: { kind: "hierophant_temple", templeId: "krolis" },
      targetLabel: "Temple Krolis",
      occupant: null,
    },
  ],
  knowledge: {
    researchOrigin: 4,
    other: 2,
    nextMonthResearchOrigin: 9,
    researcherProductionMultiplierCurrent: 1,
    researcherProductionMultiplierNextMonth: 2,
  },
  archivesOpen: false,
  archivesSourceTiming: "wizardmoot",
  towerTomes: [{
    school: { kind: "source", schoolId: "enchantment" },
    schoolLabel: "Enchantment",
    count: 3,
  }],
  towerReagents: [{ reagentId: "gold", reagentLabel: "Gold", count: 2 }],
  wizardConsumables: [{
    wizardId: WIZ_A,
    wizardName: "Mira",
    tomes: [],
    reagents: [],
  }],
  laws: [{
    lawId: "first",
    applicationLabel: "First Law of Magic",
    text: "Magic requires oral recitation/chants.",
    status: "active",
  }],
  arcanists: [
    {
      denizenId: denizenId(10),
      name: "Vesper",
      school: { kind: "source", schoolId: "enchantment" },
      schoolLabel: "Enchantment",
      placement: { kind: "tower" },
      disruptiveProfile: null,
    },
    {
      denizenId: denizenId(15),
      name: "Escaped",
      school: { kind: "source", schoolId: "invocation" },
      schoolLabel: "Invocation",
      placement: { kind: "other_domain", seatId: "necromancer" },
      disruptiveProfile: {
        primaryElement: "fire",
        rank: "prentice",
        changesOfMagic: ["rewrites local weather"],
        quirk: "Speaks only in questions",
        prenticeSpellIds: ["speaking_the_names_of_beasts"],
      },
    },
  ],
  constructs: [{
    denizenId: denizenId(20),
    name: "Brass Sentinel",
    instructions: [{ condition: "If a stranger climbs", result: "Then it bars the stair." }],
    truths: [{ truthId: "pdtru_00000000-0000-0000-0000-0000000000aa" as never, text: "It never sleeps." }],
  }],
  innovations: [{
    innovationId: "sinn_00000000-0000-0000-0000-0000000000aa" as never,
    spellId: "hand_of_power",
    spellName: "Hand of Power",
    schoolId: "enchantment",
    schoolLabel: "Enchantment",
    text: "The chant may be whispered.",
  }],
  campaignSchools: [{
    schoolId: "ssch_00000000-0000-0000-0000-0000000000aa" as never,
    name: "Cartography",
    description: "Maps of hidden ways",
  }],
  campaignAcademicKinds: [{
    academicKindId: "sack_00000000-0000-0000-0000-0000000000ab" as never,
    name: "Cartomancer",
    action: "Reads the cards",
  }],
  campaignRecipes: [{
    recipeId: "srec_00000000-0000-0000-0000-0000000000aa" as never,
    name: "Moon Ink",
    recipeText: "Mix silver and night.",
  }],
  campaignKnowledgeMethods: [{
    knowledgeMethodId: "sknm_00000000-0000-0000-0000-0000000000aa" as never,
    name: "Listening to bells",
    description: "Hear the hidden hours",
  }],
  externalPresence: [],
};

const LORE: LoreCompendiumUiState = { status: "unavailable" };

const RETURN_PRESENTATION: SorcererBoardReference = {
  ...PRESENTATION,
  wizardConsumables: [
    {
      wizardId: WIZ_A,
      wizardName: "Mira",
      tomes: [{
        school: { kind: "source", schoolId: "artifice" },
        schoolLabel: "Artifice",
        count: 2,
      }],
      reagents: [{ reagentId: "lead", reagentLabel: "Lead", count: 4 }],
    },
    {
      wizardId: WIZ_B,
      wizardName: "Caleb",
      tomes: [],
      reagents: [{ reagentId: "salt", reagentLabel: "Salt", count: 1 }],
    },
  ],
};

function renderSurface(
  layout: "full" | "narrow" = "full",
  presentation: SorcererBoardReference = PRESENTATION,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(SorcererSurface, {
      presentation,
      campaignId: CAMPAIGN_ID,
      layout,
      loreCompendium: LORE,
    }));
  });
  return { container, root };
}

function clickNamedButton(container: HTMLElement, name: string) {
  const button = [...container.querySelectorAll("button")].find((entry) => entry.textContent?.trim() === name);
  expect(button).toBeDefined();
  flushSync(() => button!.click());
}

describe("Sorcerer surface presentation", () => {
  it("presents the Working Tower as the primary region with ordered occupants", () => {
    const { container, root } = renderSurface("full");
    const html = container.innerHTML;
    expect(html).toContain("Working Tower");
    expect(html).toContain("Vesper");
    expect(html).toContain("Halden");
    expect(html).toContain("Sera");
    expect(html).toContain("Recruit Student");
    expect(html).not.toMatch(/Rearrange Tower/);
    expect(html).toContain("Research Knowledge — Now");
    expect(html).toContain("Other Knowledge — Now");
    expect(html).toContain("Incoming Research — Next Month");
    expect(html).toContain("Working");
    expect(html).toContain("Unavailable this month");
    expect(html).toContain("Archives Closed");
    expect(html).toContain("Declared during Wizardmoot");
    expect(html).toContain("Enchantment");
    expect(html).toContain("χ");
    expect(html).toContain("Gold");
    expect(html).toContain("☉");
    expect(html).toContain("Aries");
    expect(html).toContain("Aristocracy");
    expect(html).toContain("Bay of Ishana");
    expect(html).toContain("Temple Krolis");
    const text = container.textContent ?? "";
    const vesper = text.indexOf("Vesper");
    const sera = text.indexOf("Sera");
    expect(vesper).toBeGreaterThan(-1);
    expect(sera).toBeGreaterThan(vesper);
    root.unmount();
    container.remove();
  });

  it("keeps the same information readable in the narrow layout", () => {
    const { container, root } = renderSurface("narrow");
    const html = container.innerHTML;
    expect(html).toContain("Working Tower");
    expect(html).toContain("Recruit Student");
    expect(html).toContain("Research Knowledge — Now");
    expect(html).toContain("Aries");
    expect(html).not.toMatch(/Rearrange Tower/);
    root.unmount();
    container.remove();
  });

  it("lets a Wizard return a Tome or Reagent the Tower does not hold", () => {
    const { container, root } = renderSurface("full", RETURN_PRESENTATION);
    expect(container.querySelector('[aria-label="Artifice tome, 2 held by Mira"]')).toBeNull();
    expect(container.querySelector('[aria-label="Lead reagent, 4 held by Mira"]')).toBeNull();
    clickNamedButton(container, "Return to Tower");
    expect(container.querySelector('[aria-label="Artifice tome, 2 held by Mira"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Lead reagent, 4 held by Mira"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Enchantment tome, 3 in the Tower"]')).not.toBeNull();
    flushSync(() => {
      (container.querySelector('[aria-label="Artifice tome, 2 held by Mira"]') as HTMLButtonElement).click();
    });
    expect(container.textContent).toContain("Return 1 from the chosen Wizard to the Tower.");
    root.unmount();
    container.remove();
  });

  it("does not offer Wizard-only items as Take from Tower sources", () => {
    const { container, root } = renderSurface("full", RETURN_PRESENTATION);
    expect(container.querySelector('[aria-label^="Artifice tome"]')).toBeNull();
    expect(container.querySelector('[aria-label^="Lead reagent"]')).toBeNull();
    expect(container.querySelector('[aria-label="Enchantment tome, 3 in the Tower"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Gold reagent, 2 in the Tower"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("keeps Advanced / Correct Board discoverable, collapsed, and subordinate", () => {
    const { container, root } = renderSurface("full");
    const advanced = [...container.querySelectorAll("details")].find((entry) => (
      entry.querySelector("summary")?.textContent?.trim() === "Advanced / Correct Board"
    ));
    expect(advanced).toBeDefined();
    expect(advanced?.open).toBe(false);
    expect(container.textContent).toContain("Working Tower");
    const outsideButtons = [...container.querySelectorAll("button")]
      .filter((button) => !advanced!.contains(button))
      .map((button) => button.textContent?.trim());
    expect(outsideButtons).not.toContain("Save Tower order");
    expect(outsideButtons).not.toContain("Record Personnel");
    expect(container.innerHTML).not.toMatch(/Rearrange Tower/);
    expect(container.textContent).toContain("Record Personnel");
    expect(container.textContent).toContain("Vesper");
    expect(container.textContent).toContain("Escaped");
    expect(container.textContent).toContain("Necromancer");
    expect(container.textContent).not.toMatch(/other_domain/);
    expect(container.textContent).toContain("Brass Sentinel");
    expect(container.textContent).toContain("Truths");
    expect(container.textContent).toContain("If / Then statements");
    expect(container.textContent).toContain("It never sleeps.");
    expect(container.textContent).toContain("If a stranger climbs");
    expect(container.textContent).toContain("Hand of Power");
    expect(container.textContent).toContain("Cartography");
    expect(container.textContent).toContain("Cartomancer");
    expect(container.textContent).toContain("Moon Ink");
    expect(container.textContent).toContain("Listening to bells");
    expect(container.textContent).toContain("School name");
    expect(container.textContent).toContain("Kind name");
    expect(container.textContent).toContain("Recipe name");
    expect(container.textContent).toContain("Method name");
    expect(container.textContent).not.toContain("schoolId");
    expect(container.textContent).not.toContain("academicKindId");
    expect(container.textContent).not.toContain("recipeId");
    expect(container.textContent).not.toContain("knowledgeMethodId");
    expect(container.textContent).toContain("Current month multiplier");
    expect(container.textContent).toContain("Exact correction of output multipliers");
    root.unmount();
    container.remove();
  });

  it("exposes Advanced Tower reorder, specialized personnel, and filtered selectors", () => {
    const { container, root } = renderSurface("full");
    const advanced = [...container.querySelectorAll("details")].find((entry) => (
      entry.querySelector("summary")?.textContent?.trim() === "Advanced / Correct Board"
    ));
    expect(advanced).toBeDefined();
    flushSync(() => {
      advanced!.querySelector("summary")!.click();
    });
    expect(advanced!.open).toBe(true);
    expect(container.textContent).toContain("Correct Tower order");
    expect(container.textContent).toContain("BOTTOM · Students");
    expect(container.textContent).toContain("MIDDLE · Academics");
    expect(container.textContent).toContain("TOP · Reliable Arcanists");
    expect(container.textContent).toContain("Move Up");
    expect(container.textContent).toContain("Save Tower order");
    expect(container.textContent).toContain("Record Personnel");
    const innovationSelect = [...container.querySelectorAll("select")].find((select) => (
      [...select.options].some((option) => option.textContent?.includes("Hand of Power"))
    ));
    expect(innovationSelect).toBeDefined();
    const optionText = [...innovationSelect!.options].map((option) => option.textContent ?? "").join("\n");
    expect(optionText).toContain("Hand of Power");
    expect(optionText).not.toContain("Apotheosis");
    expect(optionText).not.toContain("Titanomachy");
    const addArcanistPlacement = [...container.querySelectorAll("select")].find((select) => (
      [...select.options].some((option) => option.textContent === "Disruptive · other Domain")
    ));
    expect(addArcanistPlacement).toBeDefined();
    flushSync(() => {
      addArcanistPlacement!.value = "other_domain";
      addArcanistPlacement!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.textContent).toContain("Pact Domain");
    expect(container.textContent).toContain("Necromancer");
    const spellChooser = [...container.querySelectorAll("fieldset")].find((fieldset) => (
      fieldset.querySelector("legend")?.textContent?.trim() === "Known School spells"
    ));
    expect(spellChooser).toBeDefined();
    expect(spellChooser!.textContent).toContain("Hand of Power");
    expect(spellChooser!.textContent).toContain("Bombardment");
    expect(spellChooser!.textContent).not.toContain("Scrying");
    root.unmount();
    container.remove();
  });
});
