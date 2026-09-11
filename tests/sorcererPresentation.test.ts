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
  EMPTY_SHARED_WORLD_STATE,
  applyAddSorcererConstruct,
  applyInitializeSorcerer,
  applySetSorcererResearcherOperationalThisMonth,
  projectSorcererExternalPresence,
  readSorcererBoardReference,
  sorcererOrreryHouseMarkerFromExternalPresence,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function arcanistProfile(status: "reliable" | "disruptive"): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "arcanist" }],
    status: { kind: "standard", value: status },
    goal: null,
    methods: [],
    truths: [],
  };
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

function baseState(people: ReturnType<typeof person>[]): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [
      {
        wizardId: WIZ_A,
        name: "Mira",
        portrayedByPlayerId: PLR_A,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: ISL_SPYR,
        sanctumPlaceId: PLC_TOWER,
        mortalityState: "not_deceased",
      },
      {
        wizardId: WIZ_B,
        name: "Caleb",
        portrayedByPlayerId: null,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: ISL_SPYR,
        sanctumPlaceId: null,
        mortalityState: "not_deceased",
      },
    ],
    pactSeats: {
      ...makeTestCampaignStateV5().pactSeats,
      sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    world: {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: people,
      isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
      places: [
        { placeId: PLC_TOWER, name: "Sorcerer's Tower", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
        { placeId: PLC_UNIV, name: "Spyrholm University", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
      ],
    },
  });
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

function dynamicPeople() {
  return [
    person(1, "R1"), person(2, "R2"), person(3, "R3"),
    person(4, "S1"), person(5, "S2"), person(6, "S3"),
    person(7, "Professor"), person(8, "Alchemist"),
    person(9, "Librarian"),
    person(10, "Tower Arc", arcanistProfile("reliable")),
    person(15, "Escaped", arcanistProfile("disruptive")),
  ];
}

function initializedQuiet(): CampaignStateV5 {
  return applyInitializeSorcerer(baseState([
    person(1, "R1"), person(2, "R2"), person(3, "R3"),
    person(4, "S1"), person(5, "S2"), person(6, "S3"),
    person(7, "Professor"), person(8, "Alchemist"),
  ]), quietInput()).nextState;
}

function initializedDynamic(): CampaignStateV5 {
  return applyInitializeSorcerer(baseState(dynamicPeople()), {
    ...quietInput(),
    arrangementId: "dynamic",
    librarian: { denizenId: denizenId(9), school: { kind: "source", schoolId: "divination" } },
    towerArcanists: [{ denizenId: denizenId(10), school: { kind: "source", schoolId: "divination" } }],
  }).nextState;
}

function withDisruptive(state: CampaignStateV5): CampaignStateV5 {
  return {
    ...state,
    sorcerer: {
      ...state.sorcerer,
      arcanists: [
        ...state.sorcerer.arcanists,
        {
          denizenId: denizenId(15),
          school: { kind: "source", schoolId: "invocation" },
          placement: { kind: "other_domain", seatId: "necromancer" },
          disruptiveProfile: {
            primaryElement: "fire",
            rank: "journeyman",
            changesOfMagic: ["Speaks in sparks"],
            quirk: "Never blinks",
            prenticeSpellIds: [],
          },
        },
      ],
    },
  };
}

describe("readSorcererBoardReference", () => {
  it("uses exact towerOrder and includes Academics plus Reliable Tower Arcanists, not Researchers", () => {
    const state = initializedDynamic();
    const board = readSorcererBoardReference(state);
    expect(board.initialized).toBe(true);
    expect(board.spyrholm).toEqual({ isleId: ISL_SPYR, name: "Spyrholm" });
    expect(board.tower).toEqual({ placeId: PLC_TOWER, name: "Sorcerer's Tower" });
    expect(board.towerOrder).toEqual(state.sorcerer.towerOrder);
    expect(board.towerOccupants.map((occupant) => occupant.denizenId)).toEqual(state.sorcerer.towerOrder);
    expect(board.towerOccupants.some((occupant) => occupant.role.kind === "reliable_tower_arcanist")).toBe(true);
    expect(board.towerOccupants.some((occupant) => occupant.role.kind === "student")).toBe(true);
    expect(board.towerOccupants.some((occupant) => occupant.denizenId === denizenId(1))).toBe(false);
    expect(board.researchPositions.some((position) => position.occupant?.denizenId === denizenId(1))).toBe(true);
  });

  it("presents Students, then non-Student Academics, then Reliable Arcanists in exact towerOrder", () => {
    const state = initializedDynamic();
    const board = readSorcererBoardReference(state);
    const kinds = board.towerOccupants.map((occupant) => occupant.role.kind);
    expect(kinds).toEqual([
      "student",
      "student",
      "student",
      "professor",
      "librarian",
      "alchemist",
      "reliable_tower_arcanist",
    ]);
    expect(board.towerOrder).toEqual([
      denizenId(4), denizenId(5), denizenId(6), denizenId(7), denizenId(9), denizenId(8), denizenId(10),
    ]);
  });

  it("preserves exact typed Research Position targets and occupied/vacant state", () => {
    const board = readSorcererBoardReference(initializedQuiet());
    const orrery = board.researchPositions.find((position) => position.positionId === "srp_orrery_1");
    const temple = board.researchPositions.find((position) => position.positionId === "srp_temple_krolis");
    const vacantSea = board.researchPositions.find((position) => position.positionId === "srp_sea_1");
    expect(orrery?.target).toEqual({ kind: "orrery_house", house: 0 });
    expect(orrery?.targetLabel).toBe("Aries");
    expect(orrery?.occupant).toMatchObject({ denizenId: denizenId(1), name: "R1", operationalThisMonth: true });
    expect(temple?.target).toEqual({ kind: "hierophant_temple", templeId: "krolis" });
    expect(temple?.targetLabel).toBe("Temple Krolis");
    expect(vacantSea?.occupant).toBeNull();
    expect(vacantSea?.target.kind).toBe("mariner_sea_region");
  });

  it("keeps the three Knowledge provenance/time buckets distinct and shows only Tower custody consumables", () => {
    const state: CampaignStateV5 = {
      ...initializedQuiet(),
      sorcerer: {
        ...initializedQuiet().sorcerer,
        knowledge: {
          researchOrigin: 4,
          other: 2,
          nextMonthResearchOrigin: 9,
          researcherProductionMultiplierCurrent: 1,
          researcherProductionMultiplierNextMonth: 2,
        },
      },
      magicConsumables: {
        tomes: [
          { school: { kind: "source", schoolId: "enchantment" }, custody: { kind: "sorcerer_tower" }, count: 3 },
          { school: { kind: "source", schoolId: "divination" }, custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } }, count: 5 },
        ],
        reagents: [
          { reagentId: "salt", custody: { kind: "sorcerer_tower" }, count: 2 },
          { reagentId: "gold", custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } }, count: 1 },
        ],
      },
    };
    const board = readSorcererBoardReference(state);
    expect(board.knowledge).toEqual({
      researchOrigin: 4,
      other: 2,
      nextMonthResearchOrigin: 9,
      researcherProductionMultiplierCurrent: 1,
      researcherProductionMultiplierNextMonth: 2,
    });
    expect(board.towerTomes).toEqual([{
      school: { kind: "source", schoolId: "enchantment" },
      schoolLabel: "Enchantment",
      count: 3,
    }]);
    expect(board.towerReagents).toEqual([{
      reagentId: "salt",
      reagentLabel: "Salt",
      count: 2,
    }]);
    expect(board.archivesSourceTiming).toBe("wizardmoot");
  });

  it("derives Wizard consumables separately from Tower stacks and includes every Wizard", () => {
    const quiet = initializedQuiet();
    const state: CampaignStateV5 = {
      ...quiet,
      magicConsumables: {
        tomes: [
          { school: { kind: "source", schoolId: "enchantment" }, custody: { kind: "sorcerer_tower" }, count: 3 },
          { school: { kind: "source", schoolId: "divination" }, custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } }, count: 5 },
          { school: { kind: "source", schoolId: "artifice" }, custody: { kind: "subject", subject: { kind: "denizen", denizenId: denizenId(7) } }, count: 8 },
        ],
        reagents: [
          { reagentId: "salt", custody: { kind: "sorcerer_tower" }, count: 2 },
          { reagentId: "gold", custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } }, count: 1 },
          { reagentId: "lead", custody: { kind: "subject", subject: { kind: "denizen", denizenId: denizenId(8) } }, count: 4 },
        ],
      },
    };
    const board = readSorcererBoardReference(state);

    expect(board.towerTomes).toEqual([{
      school: { kind: "source", schoolId: "enchantment" },
      schoolLabel: "Enchantment",
      count: 3,
    }]);
    expect(board.towerReagents).toEqual([{
      reagentId: "salt",
      reagentLabel: "Salt",
      count: 2,
    }]);

    expect(board.wizardConsumables.map((wizard) => wizard.wizardId)).toEqual([WIZ_A, WIZ_B]);
    expect(board.wizardConsumables.map((wizard) => wizard.wizardName)).toEqual(["Mira", "Caleb"]);

    const mira = board.wizardConsumables.find((wizard) => wizard.wizardId === WIZ_A);
    const caleb = board.wizardConsumables.find((wizard) => wizard.wizardId === WIZ_B);
    expect(mira?.tomes).toEqual([{
      school: { kind: "source", schoolId: "divination" },
      schoolLabel: "Divination",
      count: 5,
    }]);
    expect(mira?.reagents).toEqual([{
      reagentId: "gold",
      reagentLabel: "Gold",
      count: 1,
    }]);
    expect(caleb?.tomes).toEqual([]);
    expect(caleb?.reagents).toEqual([]);

    const serialized = JSON.stringify(board.wizardConsumables);
    expect(serialized).not.toContain(denizenId(7));
    expect(serialized).not.toContain(denizenId(8));
    expect(serialized).not.toContain("artifice");
    expect(serialized).not.toContain("lead");
    expect(serialized).not.toContain("sorcerer_tower");
  });
});

describe("projectSorcererExternalPresence", () => {
  it("includes exact Researcher position + typed target and does not flatten Temple or Sea", () => {
    const unavailable = applySetSorcererResearcherOperationalThisMonth(initializedQuiet(), {
      denizenId: denizenId(1),
      expectedOperationalThisMonth: true,
      operationalThisMonth: false,
    }).nextState;
    const presence = projectSorcererExternalPresence(unavailable);
    const orrery = presence.find((entry) => entry.kind === "researcher" && entry.positionId === "srp_orrery_1");
    const temple = presence.find((entry) => entry.kind === "researcher" && entry.positionId === "srp_temple_krolis");
    expect(orrery).toMatchObject({
      kind: "researcher",
      denizenId: denizenId(1),
      name: "R1",
      operationalThisMonth: false,
      target: { kind: "orrery_house", house: 0 },
    });
    expect(temple?.kind === "researcher" && temple.target.kind === "hierophant_temple").toBe(true);
    expect(sorcererOrreryHouseMarkerFromExternalPresence(orrery!)).toEqual({
      kind: "researcher",
      denizenId: denizenId(1),
      name: "R1",
      operationalThisMonth: false,
      positionId: "srp_orrery_1",
      house: 0,
    });
    expect(sorcererOrreryHouseMarkerFromExternalPresence(temple!)).toBeNull();
  });

  it("exposes Disruptive Arcanist Pact-seat placement and excludes Tower Reliable Arcanists", () => {
    const state = withDisruptive(initializedDynamic());
    const presence = projectSorcererExternalPresence(state);
    expect(presence.some((entry) => entry.kind === "disruptive_arcanist")).toBe(true);
    expect(presence).toContainEqual({
      kind: "disruptive_arcanist",
      denizenId: denizenId(15),
      name: "Escaped",
      school: { kind: "source", schoolId: "invocation" },
      seatId: "necromancer",
    });
    expect(presence.some((entry) => entry.denizenId === denizenId(10))).toBe(false);
    expect(readSorcererBoardReference(state).externalPresence).toEqual(presence);
  });
});

describe("advanced construct presentation", () => {
  it("derives Powerful Truths beside If/Then instructions without duplicating storage", () => {
    const result = applyAddSorcererConstruct(initializedQuiet(), {
      denizenId: denizenId(20),
      name: "Brass Sentinel",
      description: null,
      truths: [{
        truthId: "pdtru_00000000-0000-0000-0000-0000000000aa" as never,
        text: "It never sleeps.",
      }],
      instructions: [{ condition: "If dusk", result: "Then lamps." }],
    });
    const construct = readSorcererBoardReference(result.nextState).constructs[0];
    expect(construct?.truths).toEqual([{
      truthId: "pdtru_00000000-0000-0000-0000-0000000000aa",
      text: "It never sleeps.",
    }]);
    expect(construct?.instructions).toEqual([{ condition: "If dusk", result: "Then lamps." }]);
    expect(result.nextState.sorcerer.constructs[0]).not.toHaveProperty("truths");
  });
});
