import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { DenizenId, IsleId, PlaceId } from "./ids";
import { isValidDenizenId, isValidIsleId, isValidPlaceId } from "./ids";
import type { HouseIndex } from "./orrery";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { AgeDefinitionId } from "./ages";
import type { WarlockIdeologyId } from "./warlock-catalogs";
import { isValidWarlockIdeologyId } from "./warlock-catalogs";
import type { MarinerSeaRegionId } from "./mariner-catalogs";
import { isValidMarinerSeaRegionId } from "./mariner-catalogs";
import type { MagicSchoolRef } from "./magic-consumables";
import { EMPTY_MAGIC_CONSUMABLES_STATE } from "./magic-consumables";
import {
  isValidSorcererArrangementId,
  isValidSorcererLawOfMagicId,
  isValidSorcererSourceSchoolId,
  isValidCampaignSchoolOfMagicId,
  type SorcererArrangementId,
  type SorcererLawOfMagicId,
} from "./sorcerer-catalogs";
import type { SorcererEvent } from "./events";
import type {
  SorcererAcademic,
  SorcererArcanist,
  SorcererDisruptiveArcanistProfile,
  SorcererResearcher,
  SorcererResearchPositionId,
  SorcererState,
} from "./sorcerer-state";
import {
  EMPTY_SORCERER_KNOWLEDGE_STATE,
  EMPTY_SORCERER_STATE,
  buildSourceResearchPositions,
  isOrreryResearchPositionId,
  isValidSorcererArcanistRank,
  isValidSorcererResearchPositionId,
} from "./sorcerer-state";
import { isExactEmptySorcerer, validateSorcererReferenceIntegrity } from "./sorcerer-validation";
import { ELEMENT_IDS } from "./shared-world";
import { isValidGrimoireSpellId } from "./grimoire-catalog";

const MAX_TEXT_LENGTH = 8000;

export interface SorcererTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly SorcererEvent[];
}

export interface SorcererResearcherAssignment {
  readonly denizenId: DenizenId;
  readonly positionId: SorcererResearchPositionId;
}

export interface SorcererTowerArcanistIntent {
  readonly denizenId: DenizenId;
  readonly school: MagicSchoolRef;
}

export interface SorcererLibrarianIntent {
  readonly denizenId: DenizenId;
  readonly school: MagicSchoolRef;
}

export interface SorcererCalamityDisruptiveArcanistIntent {
  readonly denizenId: DenizenId;
  readonly school: MagicSchoolRef;
  readonly seatId: PactSeatId;
  readonly profile: SorcererDisruptiveArcanistProfile;
}

export interface InitializeSorcererInput {
  readonly arrangementId: SorcererArrangementId;
  readonly spyrholmIsleId: IsleId;
  readonly towerPlaceId: PlaceId;
  readonly universityPlaceId: PlaceId;
  readonly activeLawIds: readonly SorcererLawOfMagicId[];
  readonly unrevealedLawId: SorcererLawOfMagicId | null;
  readonly orreryHouses: readonly [HouseIndex, HouseIndex, HouseIndex];
  readonly ideologyIds: readonly [WarlockIdeologyId, WarlockIdeologyId];
  readonly seaRegionIds: readonly [MarinerSeaRegionId, MarinerSeaRegionId];
  readonly researchers: readonly SorcererResearcherAssignment[];
  readonly studentDenizenIds: readonly DenizenId[];
  readonly professorDenizenId: DenizenId;
  readonly alchemistDenizenId: DenizenId;
  readonly librarian: SorcererLibrarianIntent | null;
  readonly towerArcanists: readonly SorcererTowerArcanistIntent[];
  readonly calamityDisruptiveArcanist: SorcererCalamityDisruptiveArcanistIntent | null;
}

function uniqueOrThrow(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ${label}: ${id}`);
    }
    seen.add(id);
  }
}

function normalizeText(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must not be blank`);
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} exceeds ${MAX_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

function isValidHouseIndex(value: unknown): value is HouseIndex {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 11;
}

function canonicalizeMagicSchoolRef(school: MagicSchoolRef, label: string): MagicSchoolRef {
  if (school.kind === "source") {
    if (!isValidSorcererSourceSchoolId(school.schoolId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a known source School`);
    }
    return { kind: "source", schoolId: school.schoolId };
  }
  if (!isValidCampaignSchoolOfMagicId(school.schoolId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} campaign School id is invalid`);
  }
  return { kind: "campaign", schoolId: school.schoolId };
}

function magicSchoolRefsEqual(a: MagicSchoolRef, b: MagicSchoolRef): boolean {
  return a.kind === b.kind && a.schoolId === b.schoolId;
}

function canonicalizeDisruptiveProfile(
  profile: SorcererDisruptiveArcanistProfile,
): SorcererDisruptiveArcanistProfile {
  if (!(ELEMENT_IDS as readonly string[]).includes(profile.primaryElement)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Disruptive Arcanist primaryElement is invalid");
  }
  if (!isValidSorcererArcanistRank(profile.rank)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Disruptive Arcanist rank is invalid: ${profile.rank}`);
  }
  return {
    primaryElement: profile.primaryElement,
    rank: profile.rank,
    changesOfMagic: profile.changesOfMagic.map((entry, index) =>
      normalizeText(entry, `Disruptive Arcanist changesOfMagic[${index}]`),
    ),
    quirk: normalizeText(profile.quirk, "Disruptive Arcanist quirk"),
    prenticeSpellIds: profile.prenticeSpellIds.map((spellId) => {
      if (!isValidGrimoireSpellId(spellId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Prentice spell id: ${spellId}`);
      }
      return spellId;
    }),
  };
}

export function canonicalizeInitializeSorcererInput(input: InitializeSorcererInput): InitializeSorcererInput {
  return {
    arrangementId: input.arrangementId,
    spyrholmIsleId: input.spyrholmIsleId,
    towerPlaceId: input.towerPlaceId,
    universityPlaceId: input.universityPlaceId,
    activeLawIds: [...input.activeLawIds],
    unrevealedLawId: input.unrevealedLawId,
    orreryHouses: [input.orreryHouses[0], input.orreryHouses[1], input.orreryHouses[2]],
    ideologyIds: [input.ideologyIds[0], input.ideologyIds[1]],
    seaRegionIds: [input.seaRegionIds[0], input.seaRegionIds[1]],
    researchers: input.researchers.map((assignment) => ({ ...assignment })),
    studentDenizenIds: [...input.studentDenizenIds],
    professorDenizenId: input.professorDenizenId,
    alchemistDenizenId: input.alchemistDenizenId,
    librarian: input.librarian === null ? null : {
      denizenId: input.librarian.denizenId,
      school: canonicalizeMagicSchoolRef(input.librarian.school, "Librarian School"),
    },
    towerArcanists: input.towerArcanists.map((arcanist) => ({
      denizenId: arcanist.denizenId,
      school: canonicalizeMagicSchoolRef(arcanist.school, "Tower Arcanist School"),
    })),
    calamityDisruptiveArcanist: input.calamityDisruptiveArcanist === null
      ? null
      : {
          denizenId: input.calamityDisruptiveArcanist.denizenId,
          school: canonicalizeMagicSchoolRef(
            input.calamityDisruptiveArcanist.school,
            "Calamity Disruptive Arcanist School",
          ),
          seatId: input.calamityDisruptiveArcanist.seatId,
          profile: canonicalizeDisruptiveProfile(input.calamityDisruptiveArcanist.profile),
        },
  };
}

function allowedArrangementsForAge(ageId: AgeDefinitionId): readonly SorcererArrangementId[] {
  if (ageId === "awakening") {
    return ["quiet", "dynamic"];
  }
  if (ageId === "dominion") {
    return ["dynamic", "explosive"];
  }
  return ["explosive"];
}

function arrangementStaff(arrangementId: SorcererArrangementId): {
  researcherCount: number;
  studentCount: number;
  requiresLibrarian: boolean;
  towerArcanistCount: number;
} {
  if (arrangementId === "quiet") {
    return { researcherCount: 3, studentCount: 3, requiresLibrarian: false, towerArcanistCount: 0 };
  }
  if (arrangementId === "dynamic") {
    return { researcherCount: 3, studentCount: 3, requiresLibrarian: true, towerArcanistCount: 1 };
  }
  return { researcherCount: 4, studentCount: 4, requiresLibrarian: true, towerArcanistCount: 3 };
}

function requireDenizen(state: CampaignStateV5, denizenId: DenizenId, label: string): void {
  if (!isValidDenizenId(denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid ${label}: ${denizenId}`);
  }
  if (!state.world.denizens.some((denizen) => denizen.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve: ${denizenId}`);
  }
}

export function applyInitializeSorcerer(
  state: CampaignStateV5,
  rawInput: InitializeSorcererInput,
): SorcererTransitionResult {
  const input = canonicalizeInitializeSorcererInput(rawInput);
  if (!isExactEmptySorcerer(state.sorcerer)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sorcerer has already been initialized");
  }
  if (
    state.magicConsumables.tomes.length !== 0 ||
    state.magicConsumables.reagents.length !== 0
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sorcerer initialization requires empty magicConsumables");
  }

  if (!isValidSorcererArrangementId(input.arrangementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown arrangement: ${input.arrangementId}`);
  }
  const ageId = state.configuration.ageId;
  if (ageId === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sorcerer initialization requires a selected campaign age");
  }
  const allowed = allowedArrangementsForAge(ageId);
  if (!allowed.includes(input.arrangementId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Arrangement ${input.arrangementId} is not valid for age ${ageId}`,
    );
  }

  if (!isValidIsleId(input.spyrholmIsleId) || !state.world.isles.some((isle) => isle.isleId === input.spyrholmIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `spyrholmIsleId does not resolve: ${input.spyrholmIsleId}`);
  }
  if (!isValidPlaceId(input.towerPlaceId) || !isValidPlaceId(input.universityPlaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Tower and University Place IDs are invalid");
  }
  if (input.towerPlaceId === input.universityPlaceId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Tower and University must be distinct Places");
  }

  const sorcererWizardId = state.pactSeats.sorcerer.wizardId;
  if (sorcererWizardId !== null) {
    const wizard = state.wizards.find((candidate) => candidate.wizardId === sorcererWizardId);
    if (wizard === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Sorcerer seat wizard does not resolve: ${sorcererWizardId}`);
    }
    if (wizard.homeIsleId !== input.spyrholmIsleId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Sorcerer Wizard homeIsleId must already equal Spyrholm during normal initialization",
      );
    }
    if (wizard.sanctumPlaceId !== input.towerPlaceId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Sorcerer Wizard sanctumPlaceId must already equal the Sorcerer's Tower during normal initialization",
      );
    }
  }

  if (input.activeLawIds.length !== 2) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sorcerer initialization requires exactly two active Laws");
  }
  uniqueOrThrow(input.activeLawIds, "active Law of Magic");
  for (const lawId of input.activeLawIds) {
    if (!isValidSorcererLawOfMagicId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Law of Magic id: ${lawId}`);
    }
  }
  const unrevealedLawIds: SorcererLawOfMagicId[] = [];
  if (ageId === "awakening") {
    if (input.unrevealedLawId === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Age of Awakening requires one unrevealed Law");
    }
    if (!isValidSorcererLawOfMagicId(input.unrevealedLawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown unrevealed Law of Magic id: ${input.unrevealedLawId}`);
    }
    if (input.activeLawIds.includes(input.unrevealedLawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Unrevealed Law must be distinct from the two active Laws");
    }
    unrevealedLawIds.push(input.unrevealedLawId);
  } else if (input.unrevealedLawId !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Age ${ageId} ordinary setup has no unrevealed Law`);
  }

  uniqueOrThrow(input.orreryHouses.map(String), "Orrery House");
  for (const house of input.orreryHouses) {
    if (!isValidHouseIndex(house)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Orrery House: ${house}`);
    }
  }
  uniqueOrThrow(input.ideologyIds, "Warlock Ideology");
  for (const ideologyId of input.ideologyIds) {
    if (!isValidWarlockIdeologyId(ideologyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Warlock Ideology id: ${ideologyId}`);
    }
  }
  uniqueOrThrow(input.seaRegionIds, "Mariner Sea");
  for (const seaRegionId of input.seaRegionIds) {
    if (!isValidMarinerSeaRegionId(seaRegionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Mariner Sea id: ${seaRegionId}`);
    }
  }

  const researchPositions = buildSourceResearchPositions({
    orreryHouses: input.orreryHouses,
    ideologyIds: input.ideologyIds,
    seaRegionIds: input.seaRegionIds,
  });
  const positionIds = new Set(researchPositions.map((position) => position.positionId as string));

  const staff = arrangementStaff(input.arrangementId);
  if (input.researchers.length !== staff.researcherCount) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Arrangement ${input.arrangementId} requires ${staff.researcherCount} Researchers`,
    );
  }
  uniqueOrThrow(input.researchers.map((assignment) => assignment.denizenId), "Researcher");
  uniqueOrThrow(input.researchers.map((assignment) => assignment.positionId), "Researcher Position");
  let orreryResearcherCount = 0;
  const researchers: SorcererResearcher[] = [];
  for (const assignment of input.researchers) {
    requireDenizen(state, assignment.denizenId, "Researcher");
    if (!isValidSorcererResearchPositionId(assignment.positionId) || !positionIds.has(assignment.positionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Researcher Position does not resolve: ${assignment.positionId}`);
    }
    if (isOrreryResearchPositionId(assignment.positionId)) {
      orreryResearcherCount += 1;
    }
    researchers.push({ denizenId: assignment.denizenId, positionId: assignment.positionId });
  }
  if (orreryResearcherCount !== 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Normal initialization requires exactly one Researcher at an Orrery House");
  }
  if (researchers.length - orreryResearcherCount !== staff.researcherCount - 1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Remaining starting Researchers must occupy other Wizards' Domain positions",
    );
  }

  if (input.studentDenizenIds.length !== staff.studentCount) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Arrangement ${input.arrangementId} requires ${staff.studentCount} Students`,
    );
  }
  if (staff.requiresLibrarian !== (input.librarian !== null)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      staff.requiresLibrarian
        ? `Arrangement ${input.arrangementId} requires a Librarian`
        : `Arrangement ${input.arrangementId} has no starting Librarian`,
    );
  }
  if (input.towerArcanists.length !== staff.towerArcanistCount) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Arrangement ${input.arrangementId} requires ${staff.towerArcanistCount} Reliable Tower Arcanist(s)`,
    );
  }

  const academics: SorcererAcademic[] = [];
  const towerOrder: DenizenId[] = [];
  const occupiedDenizenIds: string[] = researchers.map((researcher) => researcher.denizenId);

  function takePerson(denizenId: DenizenId, label: string): void {
    requireDenizen(state, denizenId, label);
    if (occupiedDenizenIds.includes(denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} overlaps another starting role: ${denizenId}`);
    }
    occupiedDenizenIds.push(denizenId);
  }

  for (const denizenId of input.studentDenizenIds) {
    takePerson(denizenId, "Student");
    academics.push({ denizenId, role: { kind: "student" } });
    towerOrder.push(denizenId);
  }
  takePerson(input.professorDenizenId, "Professor");
  academics.push({ denizenId: input.professorDenizenId, role: { kind: "professor" } });
  towerOrder.push(input.professorDenizenId);

  if (input.librarian !== null) {
    takePerson(input.librarian.denizenId, "Librarian");
    academics.push({
      denizenId: input.librarian.denizenId,
      role: { kind: "librarian", school: input.librarian.school },
    });
    towerOrder.push(input.librarian.denizenId);
  }

  takePerson(input.alchemistDenizenId, "Alchemist");
  academics.push({
    denizenId: input.alchemistDenizenId,
    role: { kind: "alchemist", recipe: { kind: "builtin", recipeId: "first" } },
  });
  towerOrder.push(input.alchemistDenizenId);

  const arcanists: SorcererArcanist[] = [];
  for (const intent of input.towerArcanists) {
    takePerson(intent.denizenId, "Tower Arcanist");
    arcanists.push({
      denizenId: intent.denizenId,
      school: intent.school,
      placement: { kind: "tower" },
      disruptiveProfile: null,
    });
    towerOrder.push(intent.denizenId);
  }
  if (input.arrangementId === "dynamic" && input.librarian !== null) {
    const arcanist = input.towerArcanists[0];
    if (arcanist === undefined || !magicSchoolRefsEqual(arcanist.school, input.librarian.school)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Dynamic arrangement requires the starting Tower Arcanist's School to equal the Librarian's School",
      );
    }
  }

  if (ageId === "calamity") {
    if (input.calamityDisruptiveArcanist === null) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Age of Calamity requires one starting Disruptive Arcanist in another Domain",
      );
    }
    const intent = input.calamityDisruptiveArcanist;
    takePerson(intent.denizenId, "Calamity Disruptive Arcanist");
    if (!isValidPactSeatId(intent.seatId) || intent.seatId === "sorcerer") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Calamity Disruptive Arcanist must be placed in another Wizard's Domain",
      );
    }
    arcanists.push({
      denizenId: intent.denizenId,
      school: intent.school,
      placement: { kind: "other_domain", seatId: intent.seatId },
      disruptiveProfile: intent.profile,
    });
  } else if (input.calamityDisruptiveArcanist !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Age ${ageId} ordinary setup has no starting Disruptive Arcanist`);
  }

  const sorcerer: SorcererState = {
    initialized: true,
    spyrholmIsleId: input.spyrholmIsleId,
    towerPlaceId: input.towerPlaceId,
    universityPlaceId: input.universityPlaceId,
    activeLawIds: input.activeLawIds,
    unrevealedLawIds,
    campaignSchools: [],
    campaignAcademicKinds: [],
    campaignRecipes: [],
    campaignKnowledgeMethods: [],
    researchPositions,
    researchers,
    academics,
    towerOrder,
    knowledge: EMPTY_SORCERER_KNOWLEDGE_STATE,
    arcanists,
    constructs: [],
    innovations: [],
    archivesOpen: false,
  };

  const nextState: CampaignStateV5 = {
    ...state,
    sorcerer,
    magicConsumables: EMPTY_MAGIC_CONSUMABLES_STATE,
  };
  validateSorcererReferenceIntegrity(nextState);

  return {
    nextState,
    events: [{
      type: "sorcerer_initialized",
      version: 1,
      data: {
        arrangementId: input.arrangementId,
        sorcerer,
      },
    }],
  };
}
