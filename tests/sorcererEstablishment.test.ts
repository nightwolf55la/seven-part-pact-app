import { describe, expect, it } from "vitest";
import type { CampaignStateV5, DenizenId, IsleId, PlaceId, PlayerId, WizardId } from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  EMPTY_SHARED_WORLD_STATE,
  applyCreateDenizenV5Candidate,
  applyCreatePlaceV5Candidate,
  applyInitializeSorcerer,
  applySetWizardHomeIsleV5Candidate,
  applySetWizardSanctumV5Candidate,
  readSorcererBoardReference,
  readSorcererEstablishmentReadiness,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_HARBOR = "plc_00000000-0000-0000-0000-0000000000ac" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function seatedUninitialized(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Mira",
      portrayedByPlayerId: PLR_A,
      character: { ...BLANK_WIZARD_CHARACTER_V5 },
      homeIsleId: null,
      sanctumPlaceId: null,
      mortalityState: "not_deceased",
    }],
    pactSeats: {
      ...makeTestCampaignStateV5().pactSeats,
      sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    ...overrides,
  });
}

function addTowerAndCandidates(
  state: CampaignStateV5,
  extraPlaces: ReadonlyArray<{ placeId: PlaceId; name: string }>,
): CampaignStateV5 {
  let next = applySetWizardHomeIsleV5Candidate(state, WIZ_A, { expected: null, value: ISL_SPYR }).nextState;
  next = applyCreatePlaceV5Candidate(next, {
    placeId: PLC_TOWER,
    name: "The Working Tower",
    description: null,
    placement: { kind: "on_isle", isleId: ISL_SPYR },
  }).nextState;
  for (const place of extraPlaces) {
    next = applyCreatePlaceV5Candidate(next, {
      placeId: place.placeId,
      name: place.name,
      description: null,
      placement: { kind: "on_isle", isleId: ISL_SPYR },
    }).nextState;
  }
  return applySetWizardSanctumV5Candidate(next, WIZ_A, { expected: null, value: PLC_TOWER }).nextState;
}

function addIndividuals(state: CampaignStateV5, ids: readonly number[]): CampaignStateV5 {
  let next = state;
  for (const id of ids) {
    next = applyCreateDenizenV5Candidate(next, {
      denizenId: denizenId(id),
      name: `Staff ${id}`,
      representation: "individual",
      description: null,
    }).nextState;
  }
  return next;
}

function structurallyReadyUninitialized(): CampaignStateV5 {
  let state = seatedUninitialized({
    world: {
      ...EMPTY_SHARED_WORLD_STATE,
      isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
    },
  });
  state = addTowerAndCandidates(state, [{ placeId: PLC_UNIV, name: "Spyrholm University" }]);
  return addIndividuals(state, [1, 2, 3, 4, 5, 6, 7, 8]);
}

function serializedReadiness(value: unknown): string {
  return JSON.stringify(value);
}

describe("readSorcererEstablishmentReadiness", () => {
  it("lists exact missing structural prerequisites without raw IDs", () => {
    const readiness = readSorcererEstablishmentReadiness(seatedUninitialized({
      configuration: { ageId: null, facilitatorPlayerId: PLR_A },
    }));
    expect(readiness.initialized).toBe(false);
    expect(readiness.requiredSetupChoices).toEqual([]);
    expect(readiness).not.toHaveProperty("quietEstablish");
    expect(readiness.missingPrerequisites).toEqual([
      "A campaign Age has not been selected.",
      "Spyrholm has not been realized as a campaign World Isle.",
      "The Sorcerer's Tower (Sanctum) has not been established.",
      "A distinct University Place on Spyrholm is required.",
      "Quiet establishment needs eight individual Denizens for Researchers, Students, the Professor, and the Alchemist.",
    ]);
    expect(readiness.missingPrerequisites.join(" ")).not.toMatch(/wiz_|isl_|plc_|den_/);
  });

  it("does not let Denizen ID ordering determine Sorcerer personnel assignments", () => {
    let state = seatedUninitialized({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
      },
    });
    state = addTowerAndCandidates(state, [{ placeId: PLC_UNIV, name: "Spyrholm University" }]);
    state = addIndividuals(state, [8, 7, 6, 5, 4, 3, 2, 1]);

    const readiness = readSorcererEstablishmentReadiness(state);
    expect(readiness.initialized).toBe(false);
    expect(readiness.missingPrerequisites).toEqual([]);
    expect(readiness).not.toHaveProperty("quietEstablish");
    expect(serializedReadiness(readiness)).not.toContain(denizenId(1));
    expect(serializedReadiness(readiness)).not.toContain(denizenId(8));
    expect(readiness.requiredSetupChoices.some((choice) => choice.includes("Students"))).toBe(true);
    expect(readiness.requiredSetupChoices.some((choice) => choice.includes("Professor"))).toBe(true);
    expect(readiness.requiredSetupChoices.some((choice) => choice.includes("Alchemist"))).toBe(true);
  });

  it("does not silently select the first arbitrary non-Tower Place on Spyrholm as the University", () => {
    let state = seatedUninitialized({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
      },
    });
    state = addTowerAndCandidates(state, [
      { placeId: PLC_HARBOR, name: "Harbor Market" },
      { placeId: PLC_UNIV, name: "Spyrholm University" },
    ]);
    state = addIndividuals(state, [1, 2, 3, 4, 5, 6, 7, 8]);

    const readiness = readSorcererEstablishmentReadiness(state);
    expect(readiness.initialized).toBe(false);
    expect(readiness.missingPrerequisites).toEqual([]);
    expect(serializedReadiness(readiness)).not.toContain(PLC_HARBOR);
    expect(serializedReadiness(readiness)).not.toContain(PLC_UNIV);
    expect(readiness.requiredSetupChoices).toContain(
      "Choose which Place on Spyrholm is Spyrholm University.",
    );
  });

  it("lists explicit setup choices instead of a one-click inferred Quiet payload", () => {
    const readiness = readSorcererEstablishmentReadiness(structurallyReadyUninitialized());
    expect(readiness).toEqual({
      initialized: false,
      missingPrerequisites: [],
      requiredSetupChoices: [
        "Choose which Place on Spyrholm is Spyrholm University.",
        "Choose the two active Laws of Magic.",
        "In the Age of Awakening, the Facilitator secretly chooses the third forgotten Law of Magic.",
        "Choose which Orrery Houses host starting Research Positions.",
        "Choose which Warlock Ideologies and Mariner Seas host the remaining starting Research Positions.",
        "Place a Researcher at any House in the Zodiac.",
        "Place two Researchers in any other combination of Wizards' Domains.",
        "Assign three Students, a Professor, and an Alchemist (Salt) to the Tower.",
      ],
    });
    expect(serializedReadiness(readiness)).not.toMatch(/"first"|"second"|srp_|aristocracy|mercantilism|bay_of_ishana|wizard_strait/);
  });

  it("leaves an initialized Sorcerer presentation unchanged", () => {
    const uninitialized = structurallyReadyUninitialized();
    const initialized = applyInitializeSorcerer(uninitialized, {
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
    }).nextState;

    expect(readSorcererEstablishmentReadiness(initialized)).toEqual({
      initialized: true,
      missingPrerequisites: [],
      requiredSetupChoices: [],
    });
    const board = readSorcererBoardReference(initialized);
    expect(board.initialized).toBe(true);
    expect(board.tower?.name).toBe("The Working Tower");
    expect(board.university?.name).toBe("Spyrholm University");
    expect(board.researchPositions.some((position) => position.occupant?.denizenId === denizenId(1))).toBe(true);
  });
});
