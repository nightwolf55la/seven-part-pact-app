import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeSorcererInput,
  IsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  PowerfulDenizenProfile,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_SHARED_WORLD_STATE,
  adjustSorcererKnowledgeFingerprint,
  applyAdjustSorcererKnowledge,
  applyInitializeSorcerer,
  applyMoveSorcererTowerMagicConsumable,
  applyRearrangeSorcererTower,
  applyRecruitSorcererPersonnel,
  applyRefocusSorcererResearcher,
  applySetSorcererArchivesOpen,
  applySetSorcererResearcherOperationalThisMonth,
  applyTutorSorcererStudent,
  canonicalizeAdjustSorcererKnowledgeInput,
  canonicalizeMoveSorcererTowerMagicConsumableInput,
  canonicalizeRearrangeSorcererTowerInput,
  canonicalizeRecruitSorcererPersonnelInput,
  canonicalizeRefocusSorcererResearcherInput,
  canonicalizeSetSorcererArchivesOpenInput,
  canonicalizeSetSorcererResearcherOperationalThisMonthInput,
  canonicalizeTutorSorcererStudentInput,
  isLogicalStateCommandType,
  moveSorcererTowerMagicConsumableFingerprint,
  rearrangeSorcererTowerFingerprint,
  recruitSorcererPersonnelFingerprint,
  refocusSorcererResearcherFingerprint,
  setSorcererArchivesOpenFingerprint,
  setSorcererResearcherOperationalThisMonthFingerprint,
  tutorSorcererStudentFingerprint,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;
const NEW_DEN = "den_00000000-0000-0000-0000-000000000064" as DenizenId;
const EXISTING_FREE = "den_00000000-0000-0000-0000-000000000063" as DenizenId;
const ACADEMIC_KIND = "sack_00000000-0000-0000-0000-0000000000aa";

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function expectCode(run: () => unknown, code: DomainError["code"], pattern?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (pattern !== undefined) {
      expect((error as DomainError).message).toMatch(pattern);
    }
  }
}

function person(id: number, name: string, profile: PowerfulDenizenProfile | null = null) {
  return {
    denizenId: denizenId(id),
    name,
    representation: "individual" as const,
    description: null,
    mortalityState: "not_deceased" as const,
    powerfulProfile: profile,
  };
}

function quietPeople() {
  return [
    person(1, "R1"), person(2, "R2"), person(3, "R3"),
    person(4, "S1"), person(5, "S2"), person(6, "S3"),
    person(7, "Professor"), person(8, "Alchemist"),
    {
      denizenId: EXISTING_FREE,
      name: "Free Scholar",
      representation: "individual" as const,
      description: null,
      mortalityState: "not_deceased" as const,
      powerfulProfile: null,
    },
  ];
}

function quietInput(): InitializeSorcererInput {
  return {
    arrangementId: "quiet",
    spyrholmIsleId: ISL_SPYR,
    towerPlaceId: PLC_TOWER,
    universityPlaceId: PLC_UNIV,
    activeLawIds: ["first", "second"],
    unrevealedLawId: "third",
    orreryHouses: [0, 4, 8],
    ideologyIds: ["aristocracy", "mercantilism"],
    seaRegionIds: ["bay_of_ishana", "wizard_strait"],
    researchers: [
      { denizenId: denizenId(1), positionId: "srp_orrery_1" },
      { denizenId: denizenId(2), positionId: "srp_temple_krolis" },
      { denizenId: denizenId(3), positionId: "srp_court_1" },
    ],
    studentDenizenIds: [denizenId(4), denizenId(5), denizenId(6)],
    professorDenizenId: denizenId(7),
    alchemistDenizenId: denizenId(8),
    librarian: null,
    towerArcanists: [],
    calamityDisruptiveArcanist: null,
  };
}

function initializedQuiet(): CampaignStateV5 {
  return applyInitializeSorcerer(
    makeTestCampaignStateV5({
      calendar: { monthOrdinal: 0 as MonthOrdinal },
      configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [{
        wizardId: WIZ_A,
        name: "Mira",
        portrayedByPlayerId: PLR_A,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: ISL_SPYR,
        sanctumPlaceId: PLC_TOWER,
        mortalityState: "not_deceased",
      }],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
      },
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: quietPeople(),
        isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
        places: [
          { placeId: PLC_TOWER, name: "Sorcerer's Tower", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
          { placeId: PLC_UNIV, name: "Spyrholm University", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
        ],
      },
    }),
    quietInput(),
  ).nextState;
}

function withCampaignAcademicKind(state: CampaignStateV5): CampaignStateV5 {
  return {
    ...state,
    sorcerer: {
      ...state.sorcerer,
      campaignAcademicKinds: [{
        academicKindId: ACADEMIC_KIND as never,
        name: "Cartomancer",
        action: "Reads the cards",
      }],
    },
  };
}

function campaignOf(state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId: CAMPAIGN_A,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
  snapshot?: CampaignStateV5;
}) {
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {},
    async loadCanonicalCampaign() {
      return options.campaign;
    },
    async findAcceptedCommand() {
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

const OPERABILITY_COMMANDS = [
  "recruit_sorcerer_personnel",
  "refocus_sorcerer_researcher",
  "tutor_sorcerer_student",
  "rearrange_sorcerer_tower",
  "set_sorcerer_researcher_operational_this_month",
  "adjust_sorcerer_knowledge",
  "set_sorcerer_archives_open",
  "move_sorcerer_tower_magic_consumable",
] as const;

describe("sorcerer operability command registration", () => {
  it("registers the Body A commands as logical-state operations", () => {
    for (const commandType of OPERABILITY_COMMANDS) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
      expect(isLogicalStateCommandType(commandType)).toBe(true);
    }
  });
});

describe("recruit_sorcerer_personnel", () => {
  it("atomically creates a new Denizen Student and appends Tower membership", () => {
    const before = initializedQuiet();
    const result = applyRecruitSorcererPersonnel(before, {
      subject: {
        kind: "create_denizen",
        denizenId: NEW_DEN,
        name: "New Student",
        representation: "individual",
        description: null,
      },
      destination: { kind: "student" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    expect(result.nextState.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(true);
    expect(result.nextState.sorcerer.academics.some((academic) =>
      academic.denizenId === NEW_DEN && academic.role.kind === "student",
    )).toBe(true);
    expect(result.nextState.sorcerer.towerOrder).toEqual([...before.sorcerer.towerOrder, NEW_DEN]);
    expect(result.events[0]).toMatchObject({
      type: "sorcerer_personnel_recruited",
      data: { denizenId: NEW_DEN, denizenCreated: true, denizenName: "New Student" },
    });
  });

  it("assigns an existing Denizen as Student without duplicating the Denizen", () => {
    const before = initializedQuiet();
    const denizenCount = before.world.denizens.length;
    const result = applyRecruitSorcererPersonnel(before, {
      subject: { kind: "existing_denizen", denizenId: EXISTING_FREE },
      destination: { kind: "student" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    expect(result.nextState.world.denizens).toHaveLength(denizenCount);
    expect(result.nextState.sorcerer.academics.some((academic) => academic.denizenId === EXISTING_FREE)).toBe(true);
    expect(result.events[0]?.data).toMatchObject({ denizenCreated: false, denizenName: "Free Scholar" });
  });

  it("recruits a new Denizen Researcher onto a vacant Position", () => {
    const before = initializedQuiet();
    const result = applyRecruitSorcererPersonnel(before, {
      subject: {
        kind: "create_denizen",
        denizenId: NEW_DEN,
        name: "Field Scholar",
        representation: "individual",
        description: null,
      },
      destination: { kind: "researcher", positionId: "srp_sea_1" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    expect(result.nextState.sorcerer.researchers.some((researcher) =>
      researcher.denizenId === NEW_DEN && researcher.positionId === "srp_sea_1",
    )).toBe(true);
    expect(result.nextState.sorcerer.towerOrder).toEqual(before.sorcerer.towerOrder);
  });

  it("recruits an existing Denizen as a representative non-Student Academic", () => {
    const before = initializedQuiet();
    const result = applyRecruitSorcererPersonnel(before, {
      subject: { kind: "existing_denizen", denizenId: EXISTING_FREE },
      destination: { kind: "professor" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    expect(result.nextState.sorcerer.academics.some((academic) =>
      academic.denizenId === EXISTING_FREE && academic.role.kind === "professor",
    )).toBe(true);
    expect(result.nextState.sorcerer.towerOrder[result.nextState.sorcerer.towerOrder.length - 1]).toBe(EXISTING_FREE);
  });

  it("rejects a Denizen who already holds a Sorcerer role", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyRecruitSorcererPersonnel(before, {
        subject: { kind: "existing_denizen", denizenId: denizenId(4) },
        destination: { kind: "professor" },
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "INVALID_CAMPAIGN_STATE",
      /conflicting Sorcerer role/,
    );
  });

  it("rejects an unknown Research Position and an occupied Position", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyRecruitSorcererPersonnel(before, {
        subject: { kind: "existing_denizen", denizenId: EXISTING_FREE },
        destination: { kind: "researcher", positionId: "srp_not_a_position" as never },
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "INVALID_CAMPAIGN_STATE",
      /does not resolve/,
    );
    expectCode(
      () => applyRecruitSorcererPersonnel(before, {
        subject: { kind: "existing_denizen", denizenId: EXISTING_FREE },
        destination: { kind: "researcher", positionId: "srp_orrery_1" },
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "INVALID_CAMPAIGN_STATE",
      /occupied/,
    );
  });

  it("leaves no partial candidate when compound Denizen creation plus invalid destination fails", () => {
    const before = initializedQuiet();
    const denizenCount = before.world.denizens.length;
    expectCode(
      () => applyRecruitSorcererPersonnel(before, {
        subject: {
          kind: "create_denizen",
          denizenId: NEW_DEN,
          name: "Failed Recruit",
          representation: "individual",
          description: null,
        },
        destination: { kind: "researcher", positionId: "srp_temple_krolis" },
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "INVALID_CAMPAIGN_STATE",
      /occupied/,
    );
    expect(before.world.denizens).toHaveLength(denizenCount);
    expect(before.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(false);
    expect(before.sorcerer.researchers.some((researcher) => researcher.denizenId === NEW_DEN)).toBe(false);
  });
});

describe("refocus_sorcerer_researcher", () => {
  it("moves a Researcher from Position A to vacant Position B", () => {
    const before = initializedQuiet();
    const result = applyRefocusSorcererResearcher(before, {
      denizenId: denizenId(1),
      expectedPositionId: "srp_orrery_1",
      destination: { kind: "research_position", positionId: "srp_sea_1" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    const researcher = result.nextState.sorcerer.researchers.find((entry) => entry.denizenId === denizenId(1));
    expect(researcher?.positionId).toBe("srp_sea_1");
    expect(result.events[0]?.data).toMatchObject({
      previousPositionId: "srp_orrery_1",
      destination: { kind: "research_position", positionId: "srp_sea_1" },
    });
  });

  it("rejects a stale expected source Position and an occupied destination", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyRefocusSorcererResearcher(before, {
        denizenId: denizenId(1),
        expectedPositionId: "srp_sea_1",
        destination: { kind: "research_position", positionId: "srp_sea_2" },
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectCode(
      () => applyRefocusSorcererResearcher(before, {
        denizenId: denizenId(1),
        expectedPositionId: "srp_orrery_1",
        destination: { kind: "research_position", positionId: "srp_temple_krolis" },
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "INVALID_CAMPAIGN_STATE",
      /occupied/,
    );
  });

  it("promotes a Researcher into a representative Academic while preserving identity", () => {
    const before = initializedQuiet();
    const result = applyRefocusSorcererResearcher(before, {
      denizenId: denizenId(2),
      expectedPositionId: "srp_temple_krolis",
      destination: { kind: "librarian", school: { kind: "source", schoolId: "divination" } },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    expect(result.nextState.sorcerer.researchers.some((researcher) => researcher.denizenId === denizenId(2))).toBe(false);
    expect(result.nextState.sorcerer.academics.some((academic) =>
      academic.denizenId === denizenId(2) && academic.role.kind === "librarian",
    )).toBe(true);
    expect(result.nextState.sorcerer.towerOrder).toContain(denizenId(2));
  });
});

describe("tutor_sorcerer_student", () => {
  it("promotes a Student to Researcher and removes them from exact Tower membership", () => {
    const before = initializedQuiet();
    const result = applyTutorSorcererStudent(before, {
      denizenId: denizenId(4),
      expectedTowerOrder: before.sorcerer.towerOrder,
      destination: { kind: "researcher", positionId: "srp_sea_1" },
    });
    expect(result.nextState.sorcerer.academics.some((academic) => academic.denizenId === denizenId(4))).toBe(false);
    expect(result.nextState.sorcerer.researchers.some((researcher) =>
      researcher.denizenId === denizenId(4) && researcher.positionId === "srp_sea_1",
    )).toBe(true);
    expect(result.nextState.sorcerer.towerOrder).toEqual(
      before.sorcerer.towerOrder.filter((id) => id !== denizenId(4)),
    );
    expect(result.nextState.world.denizens.some((denizen) => denizen.denizenId === denizenId(4))).toBe(true);
  });

  it("promotes a Student to a representative Academic while keeping Tower membership exact", () => {
    const before = withCampaignAcademicKind(initializedQuiet());
    const result = applyTutorSorcererStudent(before, {
      denizenId: denizenId(5),
      expectedTowerOrder: before.sorcerer.towerOrder,
      destination: { kind: "campaign_academic", academicKindId: ACADEMIC_KIND as never },
    });
    const academic = result.nextState.sorcerer.academics.find((entry) => entry.denizenId === denizenId(5));
    expect(academic?.role).toEqual({ kind: "campaign", academicKindId: ACADEMIC_KIND });
    expect(result.nextState.sorcerer.towerOrder).toEqual(before.sorcerer.towerOrder);
  });

  it("rejects a stale Tower order and a non-Student", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyTutorSorcererStudent(before, {
        denizenId: denizenId(4),
        expectedTowerOrder: [...before.sorcerer.towerOrder].reverse(),
        destination: { kind: "professor" },
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectCode(
      () => applyTutorSorcererStudent(before, {
        denizenId: denizenId(7),
        expectedTowerOrder: before.sorcerer.towerOrder,
        destination: { kind: "professor" },
      }),
      "INVALID_CAMPAIGN_STATE",
      /Student not found/,
    );
  });
});

describe("rearrange_sorcerer_tower", () => {
  it("accepts a valid exact permutation", () => {
    const before = initializedQuiet();
    const nextOrder = [...before.sorcerer.towerOrder].reverse();
    const result = applyRearrangeSorcererTower(before, {
      expectedTowerOrder: before.sorcerer.towerOrder,
      towerOrder: nextOrder,
    });
    expect(result.nextState.sorcerer.towerOrder).toEqual(nextOrder);
  });

  it("rejects missing, duplicate, extra, and stale orders", () => {
    const before = initializedQuiet();
    const current = before.sorcerer.towerOrder;
    expectCode(
      () => applyRearrangeSorcererTower(before, {
        expectedTowerOrder: current,
        towerOrder: current.slice(1),
      }),
      "INVALID_CAMPAIGN_STATE",
      /exact current Tower membership/,
    );
    expectCode(
      () => applyRearrangeSorcererTower(before, {
        expectedTowerOrder: current,
        towerOrder: [...current.slice(1), current[0]!, current[0]!],
      }),
      "INVALID_CAMPAIGN_STATE",
      /Duplicate/,
    );
    expectCode(
      () => applyRearrangeSorcererTower(before, {
        expectedTowerOrder: current,
        towerOrder: [...current, EXISTING_FREE],
      }),
      "INVALID_CAMPAIGN_STATE",
      /exact current Tower membership/,
    );
    expectCode(
      () => applyRearrangeSorcererTower(before, {
        expectedTowerOrder: [...current].reverse(),
        towerOrder: [...current].reverse(),
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("set_sorcerer_researcher_operational_this_month", () => {
  it("toggles Working and Unavailable for only the targeted Researcher", () => {
    const before = initializedQuiet();
    const unavailable = applySetSorcererResearcherOperationalThisMonth(before, {
      denizenId: denizenId(1),
      expectedOperationalThisMonth: true,
      operationalThisMonth: false,
    });
    expect(unavailable.nextState.sorcerer.researchers.find((entry) => entry.denizenId === denizenId(1))?.operationalThisMonth).toBe(false);
    expect(unavailable.nextState.sorcerer.researchers.find((entry) => entry.denizenId === denizenId(2))?.operationalThisMonth).toBe(true);
    const working = applySetSorcererResearcherOperationalThisMonth(unavailable.nextState, {
      denizenId: denizenId(1),
      expectedOperationalThisMonth: false,
      operationalThisMonth: true,
    });
    expect(working.nextState.sorcerer.researchers.find((entry) => entry.denizenId === denizenId(1))?.operationalThisMonth).toBe(true);
  });
});

describe("adjust_sorcerer_knowledge", () => {
  it("changes each provenance pool independently", () => {
    const before = initializedQuiet();
    const research = applyAdjustSorcererKnowledge(before, {
      pool: "researchOrigin",
      expectedAmount: 0,
      amount: 4,
    }).nextState;
    const other = applyAdjustSorcererKnowledge(research, {
      pool: "other",
      expectedAmount: 0,
      amount: 2,
    }).nextState;
    const delayed = applyAdjustSorcererKnowledge(other, {
      pool: "nextMonthResearchOrigin",
      expectedAmount: 0,
      amount: 7,
    }).nextState;
    expect(delayed.sorcerer.knowledge).toMatchObject({
      researchOrigin: 4,
      other: 2,
      nextMonthResearchOrigin: 7,
      researcherProductionMultiplierCurrent: 1,
      researcherProductionMultiplierNextMonth: 1,
    });
  });

  it("rejects a negative result and a stale expected amount", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyAdjustSorcererKnowledge(before, {
        pool: "other",
        expectedAmount: 0,
        amount: -1,
      }),
      "INVALID_CAMPAIGN_STATE",
      /non-negative/,
    );
    const raised = applyAdjustSorcererKnowledge(before, {
      pool: "researchOrigin",
      expectedAmount: 0,
      amount: 3,
    }).nextState;
    expectCode(
      () => applyAdjustSorcererKnowledge(raised, {
        pool: "researchOrigin",
        expectedAmount: 0,
        amount: 5,
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("set_sorcerer_archives_open", () => {
  it("opens and closes Archives and rejects a stale current value", () => {
    const before = initializedQuiet();
    const opened = applySetSorcererArchivesOpen(before, {
      expectedArchivesOpen: false,
      archivesOpen: true,
    });
    expect(opened.nextState.sorcerer.archivesOpen).toBe(true);
    expect(applySetSorcererArchivesOpen(opened.nextState, {
      expectedArchivesOpen: true,
      archivesOpen: false,
    }).nextState.sorcerer.archivesOpen).toBe(false);
    expectCode(
      () => applySetSorcererArchivesOpen(before, {
        expectedArchivesOpen: true,
        archivesOpen: false,
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("move_sorcerer_tower_magic_consumable", () => {
  function withTowerStores(state: CampaignStateV5): CampaignStateV5 {
    return {
      ...state,
      magicConsumables: {
        tomes: [
          { school: { kind: "source", schoolId: "enchantment" }, custody: { kind: "sorcerer_tower" }, count: 3 },
          { school: { kind: "source", schoolId: "enchantment" }, custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } }, count: 1 },
        ],
        reagents: [
          { reagentId: "salt", custody: { kind: "sorcerer_tower" }, count: 2 },
        ],
      },
    };
  }

  it("partially transfers a Tower Tome stack to a Wizard and merges the destination", () => {
    const before = withTowerStores(initializedQuiet());
    const result = applyMoveSorcererTowerMagicConsumable(before, {
      direction: "tower_to_wizard",
      wizardId: WIZ_A,
      item: { kind: "tome", school: { kind: "source", schoolId: "enchantment" } },
      amount: 2,
      expectedSourceCount: 3,
      expectedDestinationCount: 1,
    });
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    const tomes = result.nextState.magicConsumables.tomes;
    expect(tomes.filter((stack) => stack.school.schoolId === "enchantment")).toHaveLength(2);
    expect(tomes.find((stack) => stack.custody.kind === "sorcerer_tower")?.count).toBe(1);
    expect(tomes.find((stack) => stack.custody.kind === "subject")?.count).toBe(3);
  });

  it("transfers a Tower Reagent stack to a Wizard", () => {
    const before = withTowerStores(initializedQuiet());
    const result = applyMoveSorcererTowerMagicConsumable(before, {
      direction: "tower_to_wizard",
      wizardId: WIZ_A,
      item: { kind: "reagent", reagentId: "salt" },
      amount: 2,
      expectedSourceCount: 2,
      expectedDestinationCount: 0,
    });
    expect(result.nextState.magicConsumables.reagents.some((stack) => stack.custody.kind === "sorcerer_tower")).toBe(false);
    expect(result.nextState.magicConsumables.reagents.find((stack) => stack.custody.kind === "subject")?.count).toBe(2);
  });

  it("supports the narrow Wizard-to-Tower correction and rejects insufficient, non-positive, and stale stacks", () => {
    const before = withTowerStores(initializedQuiet());
    const corrected = applyMoveSorcererTowerMagicConsumable(before, {
      direction: "wizard_to_tower",
      wizardId: WIZ_A,
      item: { kind: "tome", school: { kind: "source", schoolId: "enchantment" } },
      amount: 1,
      expectedSourceCount: 1,
      expectedDestinationCount: 3,
    });
    expect(corrected.nextState.magicConsumables.tomes.find((stack) => stack.custody.kind === "sorcerer_tower")?.count).toBe(4);
    expect(corrected.nextState.magicConsumables.tomes.some((stack) => stack.custody.kind === "subject")).toBe(false);
    expectCode(
      () => applyMoveSorcererTowerMagicConsumable(before, {
        direction: "tower_to_wizard",
        wizardId: WIZ_A,
        item: { kind: "reagent", reagentId: "salt" },
        amount: 5,
        expectedSourceCount: 2,
        expectedDestinationCount: 0,
      }),
      "INVALID_CAMPAIGN_STATE",
      /does not contain/,
    );
    expectCode(
      () => applyMoveSorcererTowerMagicConsumable(before, {
        direction: "tower_to_wizard",
        wizardId: WIZ_A,
        item: { kind: "reagent", reagentId: "salt" },
        amount: 0,
        expectedSourceCount: 2,
        expectedDestinationCount: 0,
      }),
      "INVALID_CAMPAIGN_STATE",
      /positive/,
    );
    expectCode(
      () => applyMoveSorcererTowerMagicConsumable(before, {
        direction: "tower_to_wizard",
        wizardId: WIZ_A,
        item: { kind: "reagent", reagentId: "salt" },
        amount: 1,
        expectedSourceCount: 9,
        expectedDestinationCount: 0,
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("sorcerer operability persistence contract", () => {
  it("fingerprints, idempotent replay, and command/event coherence hold for representative commands", async () => {
    const before = initializedQuiet();
    const recruitInput = canonicalizeRecruitSorcererPersonnelInput({
      subject: { kind: "existing_denizen", denizenId: EXISTING_FREE },
      destination: { kind: "student" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    const recruitFingerprint = recruitSorcererPersonnelFingerprint(CAMPAIGN_A, recruitInput);
    const recruitPrepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "recruit_sorcerer_personnel",
      commandFingerprint: recruitFingerprint,
      apply: (current) => applyRecruitSorcererPersonnel(current, recruitInput),
    });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      recruitPrepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(first.commits[0]?.events[0]?.type).toBe("sorcerer_personnel_recruited");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "recruit_sorcerer_personnel", commandFingerprint: recruitFingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      recruitPrepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const knowledgeInput = canonicalizeAdjustSorcererKnowledgeInput({
      pool: "other",
      expectedAmount: 0,
      amount: 2,
    });
    const knowledge = recordingIo({ campaign: campaignOf(before, 6) });
    await executeOrdinaryLogicalCommand(
      knowledge.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "adjust_sorcerer_knowledge",
        commandFingerprint: adjustSorcererKnowledgeFingerprint(CAMPAIGN_A, knowledgeInput),
        apply: (current) => applyAdjustSorcererKnowledge(current, knowledgeInput),
      }),
    );
    expect(knowledge.commits[0]?.events[0]?.type).toBe("sorcerer_knowledge_adjusted");
    expect(() => validateEventCoherenceForTest(knowledge.commits[0]!, 1)).not.toThrow();

    expect(recruitSorcererPersonnelFingerprint(CAMPAIGN_A, recruitInput)).toBe(recruitFingerprint);
    expect(refocusSorcererResearcherFingerprint(CAMPAIGN_A, canonicalizeRefocusSorcererResearcherInput({
      denizenId: denizenId(1),
      expectedPositionId: "srp_orrery_1",
      destination: { kind: "research_position", positionId: "srp_sea_1" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    }))).toMatch(/^refocus_sorcerer_researcher:v1:/);
    expect(tutorSorcererStudentFingerprint(CAMPAIGN_A, canonicalizeTutorSorcererStudentInput({
      denizenId: denizenId(4),
      expectedTowerOrder: before.sorcerer.towerOrder,
      destination: { kind: "professor" },
    }))).toMatch(/^tutor_sorcerer_student:v1:/);
    expect(rearrangeSorcererTowerFingerprint(CAMPAIGN_A, canonicalizeRearrangeSorcererTowerInput({
      expectedTowerOrder: before.sorcerer.towerOrder,
      towerOrder: [...before.sorcerer.towerOrder].reverse(),
    }))).toMatch(/^rearrange_sorcerer_tower:v1:/);
    expect(setSorcererResearcherOperationalThisMonthFingerprint(
      CAMPAIGN_A,
      canonicalizeSetSorcererResearcherOperationalThisMonthInput({
        denizenId: denizenId(1),
        expectedOperationalThisMonth: true,
        operationalThisMonth: false,
      }),
    )).toMatch(/^set_sorcerer_researcher_operational_this_month:v1:/);
    expect(setSorcererArchivesOpenFingerprint(CAMPAIGN_A, canonicalizeSetSorcererArchivesOpenInput({
      expectedArchivesOpen: false,
      archivesOpen: true,
    }))).toMatch(/^set_sorcerer_archives_open:v1:/);
    expect(moveSorcererTowerMagicConsumableFingerprint(CAMPAIGN_A, canonicalizeMoveSorcererTowerMagicConsumableInput({
      direction: "tower_to_wizard",
      wizardId: WIZ_A,
      item: { kind: "reagent", reagentId: "salt" },
      amount: 1,
      expectedSourceCount: 1,
      expectedDestinationCount: 0,
    }))).toMatch(/^move_sorcerer_tower_magic_consumable:v1:/);
  });

  it("rejects the wrong semantic event type for a Body A command", () => {
    const commit = {
      campaignDocId: "dummy" as CanonicalCommitInput["campaignDocId"],
      campaignId: CAMPAIGN_A,
      currentRevision: 4,
      currentState: initializedQuiet(),
      commandId: COMMAND_1,
      commandType: "adjust_sorcerer_knowledge" as const,
      commandFingerprint: "adjust_sorcerer_knowledge:v1:test",
      nextState: initializedQuiet(),
      events: [{
        type: "sorcerer_archives_open_changed" as const,
        version: 1 as const,
        data: { previousArchivesOpen: false, archivesOpen: true },
      }],
      historyControlUpdate: { kind: "logical_state_append" as const },
    };
    expect(() => validateEventCoherenceForTest(commit, 5)).toThrow(DomainError);
  });
});

describe("getSorcererReference", () => {
  it("is wired through validated CampaignState and returns derived presentation", () => {
    const source = readFileSync(join(__dirname, "../convex/m3Queries.ts"), "utf8");
    const handler = source.slice(source.indexOf("export const getSorcererReference"));
    expect(handler).toMatch(/validateCampaignState\(doc\.state\)/);
    expect(handler).toMatch(/campaignId: doc\.campaignId/);
    expect(handler).toMatch(/campaignRevision: doc\.campaignRevision/);
    expect(handler).toMatch(/presentation: readSorcererBoardReference\(current\)/);
  });
});
