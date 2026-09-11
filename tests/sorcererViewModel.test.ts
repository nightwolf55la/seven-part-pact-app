import { describe, expect, it } from "vitest";
import type { DenizenId, SorcererResearchPositionId, WizardId } from "../shared/domain";
import type {
  SorcererBoardResearchPosition,
  SorcererBoardTowerOccupant,
  SorcererBoardWizardConsumables,
} from "../shared/domain";
import {
  academicOrderFromOccupants,
  buildAdjustKnowledgePayload,
  buildMoveConsumablePayload,
  buildRecruitStudentPayload,
  buildRefocusToAcademicPayload,
  buildRefocusToPositionPayload,
  buildTutorPayload,
  canMoveAcademic,
  groupResearchPositions,
  insertAcademicIntoNonStudentBand,
  knowledgePoolPresentation,
  moveAcademic,
  newDenizenId,
  reagentPresentation,
  researchOutpostGroupId,
  researchOutpostGroupLabel,
  schoolPresentation,
  tutorAcademicOrderAfterDestination,
  visualTowerBands,
  visualTowerOccupants,
  wizardConsumableCount,
} from "../src/sorcerer-view-model";

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;

function occupant(
  n: number,
  name: string,
  role: SorcererBoardTowerOccupant["role"],
): SorcererBoardTowerOccupant {
  return { denizenId: denizenId(n), name, role };
}

const TOWER: readonly SorcererBoardTowerOccupant[] = [
  occupant(4, "S1", { kind: "student" }),
  occupant(5, "S2", { kind: "student" }),
  occupant(6, "S3", { kind: "student" }),
  occupant(7, "Professor", { kind: "professor" }),
  occupant(9, "Librarian", {
    kind: "librarian",
    school: { kind: "source", schoolId: "divination" },
    schoolLabel: "Divination",
  }),
  occupant(8, "Alchemist", {
    kind: "alchemist",
    recipe: { kind: "builtin", recipeId: "first" },
    recipeLabel: "First Alchemical Recipe",
  }),
  occupant(10, "Tower Arc", {
    kind: "reliable_tower_arcanist",
    school: { kind: "source", schoolId: "divination" },
    schoolLabel: "Divination",
  }),
];

function position(
  positionId: SorcererBoardResearchPosition["positionId"],
  target: SorcererBoardResearchPosition["target"],
  targetLabel: string,
  occupantName: string | null = null,
): SorcererBoardResearchPosition {
  return {
    positionId,
    target,
    targetLabel,
    occupant: occupantName === null
      ? null
      : {
          denizenId: denizenId(1),
          name: occupantName,
          operationalThisMonth: true,
        },
  };
}

describe("visual tower occupants", () => {
  it("reverses persisted bottom-to-top order so Arcanists are visual top and Students visual bottom", () => {
    const visual = visualTowerOccupants(TOWER);
    expect(visual.map((entry) => entry.denizenId)).toEqual([
      denizenId(10),
      denizenId(8),
      denizenId(9),
      denizenId(7),
      denizenId(6),
      denizenId(5),
      denizenId(4),
    ]);
    expect(visual[0]?.role.kind).toBe("reliable_tower_arcanist");
    expect(visual[visual.length - 1]?.role.kind).toBe("student");
    expect(visual.map((entry) => entry.denizenId)).not.toEqual(TOWER.map((entry) => entry.denizenId));
    expect(visual[0]?.name).toBe("Tower Arc");
    expect(visual[visual.length - 1]?.name).toBe("S1");
  });

  it("bands Arcanists at the visual peak and Students at the visual base without changing identities", () => {
    const bands = visualTowerBands(TOWER);
    expect(bands.arcanists.map((entry) => entry.name)).toEqual(["Tower Arc"]);
    expect(bands.academics.map((entry) => entry.name)).toEqual(["Alchemist", "Librarian", "Professor"]);
    expect(bands.students.map((entry) => entry.name)).toEqual(["S3", "S2", "S1"]);
    expect([...bands.arcanists, ...bands.academics, ...bands.students].map((entry) => entry.denizenId))
      .toEqual(visualTowerOccupants(TOWER).map((entry) => entry.denizenId));
  });
});

describe("research position grouping", () => {
  it("maps typed targets to UI groups without flattening targetLabel", () => {
    const positions = [
      position("srp_orrery_1", { kind: "orrery_house", house: 0 }, "Aries", "R1"),
      position("srp_temple_krolis", { kind: "hierophant_temple", templeId: "krolis" }, "Temple Krolis"),
      position("srp_court_1", { kind: "warlock_ideology", ideologyId: "aristocracy" }, "Aristocracy"),
      position("srp_sea_1", { kind: "mariner_sea_region", seaRegionId: "bay_of_ishana" }, "Bay of Ishana"),
      position("srp_sage_future_1", { kind: "sage_future_of_pact" }, "Future of the Pact"),
      position("srp_faustian_devils_schemes", { kind: "faustian_devils_schemes" }, "Devils' Schemes"),
      position("srp_necromancer_final_death", { kind: "necromancer_final_death" }, "Final Death"),
      position(
        "srp_00000000-0000-0000-0000-0000000000aa" as SorcererResearchPositionId,
        { kind: "campaign_knowledge_method", knowledgeMethodId: "sknm_00000000-0000-0000-0000-0000000000aa" as never },
        "Star-ledger",
      ),
    ];

    expect(researchOutpostGroupId(positions[0]!.target)).toBe("orrery");
    expect(researchOutpostGroupId(positions[1]!.target)).toBe("temple");
    expect(researchOutpostGroupId(positions[2]!.target)).toBe("court");
    expect(researchOutpostGroupId(positions[3]!.target)).toBe("sea");
    expect(researchOutpostGroupId(positions[4]!.target)).toBe("future");
    expect(researchOutpostGroupId(positions[5]!.target)).toBe("devil");
    expect(researchOutpostGroupId(positions[6]!.target)).toBe("death");
    expect(researchOutpostGroupId(positions[7]!.target)).toBe("campaign");

    expect(researchOutpostGroupLabel("orrery")).toBe("Orrery");
    expect(researchOutpostGroupLabel("temple")).toBe("Temples");
    expect(researchOutpostGroupLabel("court")).toBe("Court");
    expect(researchOutpostGroupLabel("sea")).toBe("Seas");
    expect(researchOutpostGroupLabel("future")).toBe("Future of the Pact");
    expect(researchOutpostGroupLabel("devil")).toBe("Devil's Schemes");
    expect(researchOutpostGroupLabel("death")).toBe("Final Death");
    expect(researchOutpostGroupLabel("campaign")).toBe("Campaign Research");

    const groups = groupResearchPositions(positions);
    const orrery = groups.find((group) => group.groupId === "orrery");
    expect(orrery?.positions[0]?.targetLabel).toBe("Aries");
    expect(orrery?.positions[0]?.target).toEqual({ kind: "orrery_house", house: 0 });
    expect(groups.find((group) => group.groupId === "temple")?.positions[0]?.targetLabel).toBe("Temple Krolis");
    expect(groups.find((group) => group.groupId === "campaign")?.positions[0]?.targetLabel).toBe("Star-ledger");
  });
});

describe("recruit student payload", () => {
  it("creates an individual Student with current towerOrder CAS and no rank input", () => {
    const denizenIdValue = newDenizenId("11111111-1111-1111-1111-111111111111");
    expect(denizenIdValue).toBe("den_11111111-1111-1111-1111-111111111111");
    const payload = buildRecruitStudentPayload({
      denizenId: denizenIdValue,
      name: "New Student",
      description: "Curious",
      towerOrder: TOWER.map((entry) => entry.denizenId),
    });
    expect(payload.subject).toEqual({
      kind: "create_denizen",
      denizenId: denizenIdValue,
      name: "New Student",
      representation: "individual",
      description: "Curious",
    });
    expect(payload.destination).toEqual({ kind: "student" });
    expect(payload.expectedTowerOrder).toEqual(TOWER.map((entry) => entry.denizenId));
    expect(payload.nextAcademicOrder).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("rank");
    expect(JSON.stringify(payload)).not.toContain("insert");
  });
});

describe("refocus and promotion payloads", () => {
  it("omits Tower CAS for Position -> Position", () => {
    const payload = buildRefocusToPositionPayload({
      denizenId: denizenId(1),
      expectedPositionId: "srp_orrery_1",
      destinationPositionId: "srp_sea_1",
    });
    expect(payload).toEqual({
      denizenId: denizenId(1),
      expectedPositionId: "srp_orrery_1",
      destination: { kind: "research_position", positionId: "srp_sea_1" },
    });
    expect("expectedTowerOrder" in payload).toBe(false);
    expect("nextAcademicOrder" in payload).toBe(false);
  });

  it("inserts a Researcher into the Academic band without touching Students or Arcanists", () => {
    const academicOrder = academicOrderFromOccupants(TOWER);
    expect(academicOrder).toEqual([
      denizenId(4), denizenId(5), denizenId(6), denizenId(7), denizenId(9), denizenId(8),
    ]);
    const next = insertAcademicIntoNonStudentBand(TOWER, denizenId(1), 0);
    expect(next).toEqual([
      denizenId(4), denizenId(5), denizenId(6), denizenId(1), denizenId(7), denizenId(9), denizenId(8),
    ]);
    expect(next).not.toContain(denizenId(10));
    expect(() => insertAcademicIntoNonStudentBand(TOWER, denizenId(1), -1)).toThrow(/Student band/);
    const payload = buildRefocusToAcademicPayload({
      denizenId: denizenId(1),
      expectedPositionId: "srp_orrery_1",
      destination: { kind: "professor" },
      occupants: TOWER,
      insertionIndex: 1,
    });
    expect(payload.expectedTowerOrder).toEqual(TOWER.map((entry) => entry.denizenId));
    expect(payload.nextAcademicOrder).toEqual([
      denizenId(4), denizenId(5), denizenId(6), denizenId(7), denizenId(1), denizenId(9), denizenId(8),
    ]);
    expect(payload.nextAcademicOrder).not.toContain(denizenId(10));
    expect(payload.destination).toEqual({ kind: "professor" });
  });
});

describe("tutor payload and academic moves", () => {
  it("builds Student -> Researcher without that Student and without Arcanists", () => {
    const expected = academicOrderFromOccupants(TOWER);
    const next = tutorAcademicOrderAfterDestination(TOWER, denizenId(5), { kind: "researcher", positionId: "srp_sea_1" });
    expect(next).toEqual([denizenId(4), denizenId(6), denizenId(7), denizenId(9), denizenId(8)]);
    expect(next).not.toContain(denizenId(5));
    expect(next).not.toContain(denizenId(10));
    const payload = buildTutorPayload({
      denizenId: denizenId(5),
      occupants: TOWER,
      destination: { kind: "researcher", positionId: "srp_sea_1" },
      nextAcademicOrder: next,
    });
    expect(payload.expectedAcademicOrder).toEqual(expected);
    expect(payload.expectedTowerOrder).toEqual(TOWER.map((entry) => entry.denizenId));
    expect(payload.nextAcademicOrder).toEqual(next);
    expect(payload.destination).toEqual({ kind: "researcher", positionId: "srp_sea_1" });
  });

  it("keeps the same Denizen identity when tutoring a Student into an Academic", () => {
    const next = tutorAcademicOrderAfterDestination(TOWER, denizenId(4), { kind: "professor" });
    expect(next).toContain(denizenId(4));
    expect(next).not.toContain(denizenId(10));
    const payload = buildTutorPayload({
      denizenId: denizenId(4),
      occupants: TOWER,
      destination: { kind: "professor" },
      nextAcademicOrder: next,
    });
    expect(payload.denizenId).toBe(denizenId(4));
    expect(payload.expectedAcademicOrder).toEqual(academicOrderFromOccupants(TOWER));
  });

  it("allows Academic reordering within bands and rejects Student/non-Student crossings", () => {
    const order = academicOrderFromOccupants(TOWER);
    expect(canMoveAcademic(TOWER, order, 0, "up")).toBe(true);
    expect(canMoveAcademic(TOWER, order, 2, "up")).toBe(false);
    expect(canMoveAcademic(TOWER, order, 3, "down")).toBe(false);
    expect(canMoveAcademic(TOWER, order, 3, "up")).toBe(true);
    expect(canMoveAcademic(TOWER, order, 5, "up")).toBe(false);
    const swappedStudents = moveAcademic(TOWER, order, 0, "up");
    expect(swappedStudents).toEqual([
      denizenId(5), denizenId(4), denizenId(6), denizenId(7), denizenId(9), denizenId(8),
    ]);
    const swappedAcademics = moveAcademic(TOWER, order, 3, "up");
    expect(swappedAcademics).toEqual([
      denizenId(4), denizenId(5), denizenId(6), denizenId(9), denizenId(7), denizenId(8),
    ]);
    expect(() => moveAcademic(TOWER, order, 2, "up")).toThrow(/Student/);
  });

  it("cannot change Reliable Arcanist order through Tutor helpers", () => {
    const next = tutorAcademicOrderAfterDestination(TOWER, denizenId(6), { kind: "professor" });
    expect(next.includes(denizenId(10))).toBe(false);
    const payload = buildTutorPayload({
      denizenId: denizenId(6),
      occupants: TOWER,
      destination: { kind: "professor" },
      nextAcademicOrder: next,
    });
    expect(payload.nextAcademicOrder).not.toContain(denizenId(10));
    expect(payload.expectedTowerOrder?.[payload.expectedTowerOrder.length - 1]).toBe(denizenId(10));
  });
});

describe("knowledge payloads", () => {
  it("keeps the three pools separately labeled and addressed", () => {
    const pools = knowledgePoolPresentation({
      researchOrigin: 4,
      other: 2,
      nextMonthResearchOrigin: 9,
      researcherProductionMultiplierCurrent: 1,
      researcherProductionMultiplierNextMonth: 2,
    });
    expect(pools.map((pool) => pool.pool)).toEqual([
      "researchOrigin",
      "other",
      "nextMonthResearchOrigin",
    ]);
    expect(pools.map((pool) => pool.label)).toEqual([
      "Research Knowledge — Now",
      "Other Knowledge — Now",
      "Incoming Research — Next Month",
    ]);
    expect(pools.map((pool) => pool.amount)).toEqual([4, 2, 9]);
    const payload = buildAdjustKnowledgePayload({
      pool: "other",
      expectedAmount: 2,
      amount: 5,
    });
    expect(payload).toEqual({
      pool: "other",
      expectedAmount: 2,
      amount: 5,
    });
  });
});

describe("consumable movement payloads", () => {
  const wizardConsumables: readonly SorcererBoardWizardConsumables[] = [
    {
      wizardId: WIZ_A,
      wizardName: "Mira",
      tomes: [{
        school: { kind: "source", schoolId: "divination" },
        schoolLabel: "Divination",
        count: 5,
      }],
      reagents: [{ reagentId: "gold", reagentLabel: "Gold", count: 1 }],
    },
    {
      wizardId: WIZ_B,
      wizardName: "Caleb",
      tomes: [],
      reagents: [],
    },
  ];

  it("uses exact Tower source and Wizard destination counts, including zero", () => {
    expect(wizardConsumableCount(wizardConsumables, WIZ_B, {
      kind: "tome",
      school: { kind: "source", schoolId: "enchantment" },
    })).toBe(0);
    expect(wizardConsumableCount(wizardConsumables, WIZ_A, {
      kind: "tome",
      school: { kind: "source", schoolId: "divination" },
    })).toBe(5);
    const take = buildMoveConsumablePayload({
      direction: "tower_to_wizard",
      wizardId: WIZ_B,
      item: { kind: "tome", school: { kind: "source", schoolId: "enchantment" } },
      amount: 2,
      towerCount: 3,
      wizardConsumables,
    });
    expect(take).toEqual({
      direction: "tower_to_wizard",
      wizardId: WIZ_B,
      item: { kind: "tome", school: { kind: "source", schoolId: "enchantment" } },
      amount: 2,
      expectedSourceCount: 3,
      expectedDestinationCount: 0,
    });
    const giveBack = buildMoveConsumablePayload({
      direction: "wizard_to_tower",
      wizardId: WIZ_A,
      item: { kind: "reagent", reagentId: "gold" },
      amount: 1,
      towerCount: 2,
      wizardConsumables,
    });
    expect(giveBack).toEqual({
      direction: "wizard_to_tower",
      wizardId: WIZ_A,
      item: { kind: "reagent", reagentId: "gold" },
      amount: 1,
      expectedSourceCount: 1,
      expectedDestinationCount: 2,
    });
    expect(JSON.stringify(take)).not.toContain("denizen");
    expect(JSON.stringify(giveBack)).not.toContain("subject");
  });

  it("presents School and Reagent glyphs with human names from catalogs", () => {
    const school = schoolPresentation({ kind: "source", schoolId: "enchantment" }, "Enchantment");
    expect(school).toEqual({ name: "Enchantment", glyph: "χ" });
    const campaign = schoolPresentation(
      { kind: "campaign", schoolId: "ssch_00000000-0000-0000-0000-0000000000aa" as never },
      "House Cipher",
    );
    expect(campaign.name).toBe("House Cipher");
    expect(campaign.glyph).toBe("H");
    const reagent = reagentPresentation("gold");
    expect(reagent.name).toBe("Gold");
    expect(reagent.glyph).toBe("☉");
  });
});
