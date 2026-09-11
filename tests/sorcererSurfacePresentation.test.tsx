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
  arcanists: [],
  constructs: [],
  innovations: [],
  campaignSchools: [],
  campaignAcademicKinds: [],
  campaignRecipes: [],
  campaignKnowledgeMethods: [],
  externalPresence: [],
};

const LORE: LoreCompendiumUiState = { status: "unavailable" };

function renderSurface(layout: "full" | "narrow" = "full") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(SorcererSurface, {
      presentation: PRESENTATION,
      campaignId: CAMPAIGN_ID,
      layout,
      loreCompendium: LORE,
    }));
  });
  return { container, root };
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
});
