import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { DenizenId, IsleId, PlaceId, WizardId } from "./ids";
import { isValidDenizenId, isValidIsleId, isValidPlaceId, isValidWizardId } from "./ids";
import type { HouseIndex } from "./orrery";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { AgeDefinitionId } from "./ages";
import type { WarlockIdeologyId } from "./warlock-catalogs";
import { isValidWarlockIdeologyId } from "./warlock-catalogs";
import type { MarinerSeaRegionId } from "./mariner-catalogs";
import { isValidMarinerSeaRegionId } from "./mariner-catalogs";
import type {
  MagicConsumableCustody,
  MagicSchoolRef,
  ReagentStack,
  TomeStack,
} from "./magic-consumables";
import {
  EMPTY_MAGIC_CONSUMABLES_STATE,
  magicConsumableCustodyKey,
  reagentStackKey,
  tomeStackKey,
} from "./magic-consumables";
import {
  isValidSorcererArrangementId,
  isValidSorcererBuiltinAlchemicalRecipeId,
  isValidSorcererLawOfMagicId,
  isValidSorcererSourceReagentId,
  isValidSorcererSourceSchoolId,
  isValidCampaignSchoolOfMagicId,
  type SorcererArrangementId,
  type SorcererLawOfMagicId,
  type SorcererSourceReagentId,
} from "./sorcerer-catalogs";
import type { SorcererEvent } from "./events";
import type {
  SorcererAcademic,
  SorcererAcademicRole,
  SorcererArcanist,
  SorcererCampaignAcademicKindId,
  SorcererDisruptiveArcanistProfile,
  SorcererKnowledgeState,
  SorcererRecipeRef,
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
  isValidSorcererCampaignAcademicKindId,
  isValidSorcererCampaignRecipeId,
  isValidSorcererResearchPositionId,
} from "./sorcerer-state";
import { isExactEmptySorcerer, validateSorcererReferenceIntegrity } from "./sorcerer-validation";
import { ELEMENT_IDS } from "./shared-world";
import { isValidGrimoireSpellId } from "./grimoire-catalog";
import { applyCreateDenizenV5Candidate } from "./world-subject-transitions";

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
    researchers.push({
      denizenId: assignment.denizenId,
      positionId: assignment.positionId,
      operationalThisMonth: true,
    });
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

export type SorcererPersonnelRoleDestination =
  | { readonly kind: "student" }
  | { readonly kind: "researcher"; readonly positionId: SorcererResearchPositionId }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId };

export type SorcererPersonnelSubject =
  | {
      readonly kind: "create_denizen";
      readonly denizenId: DenizenId;
      readonly name: string;
      readonly representation: "individual" | "collective";
      readonly description: string | null;
    }
  | { readonly kind: "existing_denizen"; readonly denizenId: DenizenId };

export interface RecruitSorcererPersonnelInput {
  readonly subject: SorcererPersonnelSubject;
  readonly destination: SorcererPersonnelRoleDestination;
  readonly expectedTowerOrder: readonly DenizenId[];
}

export type SorcererResearcherRefocusDestination =
  | { readonly kind: "research_position"; readonly positionId: SorcererResearchPositionId }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId };

export interface RefocusSorcererResearcherInput {
  readonly denizenId: DenizenId;
  readonly expectedPositionId: SorcererResearchPositionId;
  readonly destination: SorcererResearcherRefocusDestination;
  readonly expectedTowerOrder: readonly DenizenId[];
}

export type SorcererStudentTutorDestination =
  | { readonly kind: "researcher"; readonly positionId: SorcererResearchPositionId }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId };

export interface TutorSorcererStudentInput {
  readonly denizenId: DenizenId;
  readonly expectedTowerOrder: readonly DenizenId[];
  readonly destination: SorcererStudentTutorDestination;
}

export interface RearrangeSorcererTowerInput {
  readonly expectedTowerOrder: readonly DenizenId[];
  readonly towerOrder: readonly DenizenId[];
}

export interface SetSorcererResearcherOperationalThisMonthInput {
  readonly denizenId: DenizenId;
  readonly expectedOperationalThisMonth: boolean;
  readonly operationalThisMonth: boolean;
}

export type SorcererKnowledgePoolId = "researchOrigin" | "other" | "nextMonthResearchOrigin";

export interface AdjustSorcererKnowledgeInput {
  readonly pool: SorcererKnowledgePoolId;
  readonly expectedAmount: number;
  readonly amount: number;
}

export interface SetSorcererArchivesOpenInput {
  readonly expectedArchivesOpen: boolean;
  readonly archivesOpen: boolean;
}

export type SorcererTowerMagicConsumableItem =
  | { readonly kind: "tome"; readonly school: MagicSchoolRef }
  | { readonly kind: "reagent"; readonly reagentId: SorcererSourceReagentId };

export type SorcererTowerMagicConsumableDirection = "tower_to_wizard" | "wizard_to_tower";

export interface MoveSorcererTowerMagicConsumableInput {
  readonly direction: SorcererTowerMagicConsumableDirection;
  readonly wizardId: WizardId;
  readonly item: SorcererTowerMagicConsumableItem;
  readonly amount: number;
  readonly expectedSourceCount: number;
  readonly expectedDestinationCount: number;
}

function replaceSorcerer(state: CampaignStateV5, sorcerer: SorcererState): CampaignStateV5 {
  return { ...state, sorcerer };
}

function commitSorcerer(
  state: CampaignStateV5,
  sorcerer: SorcererState,
  events: readonly SorcererEvent[],
): SorcererTransitionResult {
  const nextState = replaceSorcerer(state, sorcerer);
  validateSorcererReferenceIntegrity(nextState);
  return { nextState, events };
}

function requireInitializedSorcerer(state: CampaignStateV5): SorcererState {
  if (!state.sorcerer.initialized) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sorcerer has not been initialized");
  }
  return state.sorcerer;
}

function denizenIdsEqual(a: readonly DenizenId[], b: readonly DenizenId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function sameDenizenIdSet(a: readonly DenizenId[], b: readonly DenizenId[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const counts = new Map<string, number>();
  for (const id of a) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const id of b) {
    const remaining = counts.get(id);
    if (remaining === undefined || remaining === 0) {
      return false;
    }
    counts.set(id, remaining - 1);
  }
  return true;
}

function requireExpectedTowerOrder(
  current: readonly DenizenId[],
  expected: readonly DenizenId[],
): void {
  if (!denizenIdsEqual(current, expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Tower order does not match the expected current order",
    );
  }
}

function assertNonNegativeSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a non-negative safe integer`);
  }
}

function assertPositiveSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a positive safe integer`);
  }
}

function canonicalizeRecipeRef(recipe: SorcererRecipeRef, label: string): SorcererRecipeRef {
  if (recipe.kind === "builtin") {
    if (!isValidSorcererBuiltinAlchemicalRecipeId(recipe.recipeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a known built-in Recipe`);
    }
    return { kind: "builtin", recipeId: recipe.recipeId };
  }
  if (!isValidSorcererCampaignRecipeId(recipe.recipeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} campaign Recipe id is invalid`);
  }
  return { kind: "campaign", recipeId: recipe.recipeId };
}

function canonicalizePersonnelDestination(
  destination: SorcererPersonnelRoleDestination,
): SorcererPersonnelRoleDestination {
  if (destination.kind === "researcher") {
    if (!isValidSorcererResearchPositionId(destination.positionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Research Position does not resolve: ${destination.positionId}`,
      );
    }
    return { kind: "researcher", positionId: destination.positionId };
  }
  if (destination.kind === "librarian") {
    return {
      kind: "librarian",
      school: canonicalizeMagicSchoolRef(destination.school, "Librarian School"),
    };
  }
  if (destination.kind === "alchemist") {
    return {
      kind: "alchemist",
      recipe: canonicalizeRecipeRef(destination.recipe, "Alchemist Recipe"),
    };
  }
  if (destination.kind === "campaign_academic") {
    if (!isValidSorcererCampaignAcademicKindId(destination.academicKindId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign Academic kind id is invalid");
    }
    return { kind: "campaign_academic", academicKindId: destination.academicKindId };
  }
  return destination;
}

function canonicalizeResearcherRefocusDestination(
  destination: SorcererResearcherRefocusDestination,
): SorcererResearcherRefocusDestination {
  if (destination.kind === "research_position") {
    if (!isValidSorcererResearchPositionId(destination.positionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Research Position does not resolve: ${destination.positionId}`,
      );
    }
    return { kind: "research_position", positionId: destination.positionId };
  }
  if (destination.kind === "librarian") {
    return {
      kind: "librarian",
      school: canonicalizeMagicSchoolRef(destination.school, "Librarian School"),
    };
  }
  if (destination.kind === "alchemist") {
    return {
      kind: "alchemist",
      recipe: canonicalizeRecipeRef(destination.recipe, "Alchemist Recipe"),
    };
  }
  if (destination.kind === "campaign_academic") {
    if (!isValidSorcererCampaignAcademicKindId(destination.academicKindId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign Academic kind id is invalid");
    }
    return { kind: "campaign_academic", academicKindId: destination.academicKindId };
  }
  return destination;
}

function canonicalizeStudentTutorDestination(
  destination: SorcererStudentTutorDestination,
): SorcererStudentTutorDestination {
  if (destination.kind === "researcher") {
    if (!isValidSorcererResearchPositionId(destination.positionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Research Position does not resolve: ${destination.positionId}`,
      );
    }
    return { kind: "researcher", positionId: destination.positionId };
  }
  if (destination.kind === "librarian") {
    return {
      kind: "librarian",
      school: canonicalizeMagicSchoolRef(destination.school, "Librarian School"),
    };
  }
  if (destination.kind === "alchemist") {
    return {
      kind: "alchemist",
      recipe: canonicalizeRecipeRef(destination.recipe, "Alchemist Recipe"),
    };
  }
  if (destination.kind === "campaign_academic") {
    if (!isValidSorcererCampaignAcademicKindId(destination.academicKindId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign Academic kind id is invalid");
    }
    return { kind: "campaign_academic", academicKindId: destination.academicKindId };
  }
  return destination;
}

function canonicalizeTowerOrder(order: readonly DenizenId[], label: string): readonly DenizenId[] {
  uniqueOrThrow(order, label);
  return order.map((denizenId) => {
    if (!isValidDenizenId(denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid ${label}: ${denizenId}`);
    }
    return denizenId;
  });
}

export function canonicalizeRecruitSorcererPersonnelInput(
  input: RecruitSorcererPersonnelInput,
): RecruitSorcererPersonnelInput {
  const subject = input.subject.kind === "create_denizen"
    ? {
        kind: "create_denizen" as const,
        denizenId: input.subject.denizenId,
        name: input.subject.name,
        representation: input.subject.representation,
        description: input.subject.description,
      }
    : { kind: "existing_denizen" as const, denizenId: input.subject.denizenId };
  return {
    subject,
    destination: canonicalizePersonnelDestination(input.destination),
    expectedTowerOrder: canonicalizeTowerOrder(input.expectedTowerOrder, "expected Tower order"),
  };
}

export function canonicalizeRefocusSorcererResearcherInput(
  input: RefocusSorcererResearcherInput,
): RefocusSorcererResearcherInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Researcher denizenId: ${input.denizenId}`);
  }
  if (!isValidSorcererResearchPositionId(input.expectedPositionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Research Position does not resolve: ${input.expectedPositionId}`,
    );
  }
  return {
    denizenId: input.denizenId,
    expectedPositionId: input.expectedPositionId,
    destination: canonicalizeResearcherRefocusDestination(input.destination),
    expectedTowerOrder: canonicalizeTowerOrder(input.expectedTowerOrder, "expected Tower order"),
  };
}

export function canonicalizeTutorSorcererStudentInput(
  input: TutorSorcererStudentInput,
): TutorSorcererStudentInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Student denizenId: ${input.denizenId}`);
  }
  return {
    denizenId: input.denizenId,
    expectedTowerOrder: canonicalizeTowerOrder(input.expectedTowerOrder, "expected Tower order"),
    destination: canonicalizeStudentTutorDestination(input.destination),
  };
}

export function canonicalizeRearrangeSorcererTowerInput(
  input: RearrangeSorcererTowerInput,
): RearrangeSorcererTowerInput {
  return {
    expectedTowerOrder: canonicalizeTowerOrder(input.expectedTowerOrder, "expected Tower order"),
    towerOrder: canonicalizeTowerOrder(input.towerOrder, "Tower order"),
  };
}

export function canonicalizeSetSorcererResearcherOperationalThisMonthInput(
  input: SetSorcererResearcherOperationalThisMonthInput,
): SetSorcererResearcherOperationalThisMonthInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Researcher denizenId: ${input.denizenId}`);
  }
  if (typeof input.expectedOperationalThisMonth !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "expectedOperationalThisMonth must be a boolean");
  }
  if (typeof input.operationalThisMonth !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "operationalThisMonth must be a boolean");
  }
  return {
    denizenId: input.denizenId,
    expectedOperationalThisMonth: input.expectedOperationalThisMonth,
    operationalThisMonth: input.operationalThisMonth,
  };
}

export function canonicalizeAdjustSorcererKnowledgeInput(
  input: AdjustSorcererKnowledgeInput,
): AdjustSorcererKnowledgeInput {
  if (
    input.pool !== "researchOrigin" &&
    input.pool !== "other" &&
    input.pool !== "nextMonthResearchOrigin"
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Knowledge pool: ${String(input.pool)}`);
  }
  assertNonNegativeSafeInteger("expected Knowledge amount", input.expectedAmount);
  assertNonNegativeSafeInteger("Knowledge amount", input.amount);
  return {
    pool: input.pool,
    expectedAmount: input.expectedAmount,
    amount: input.amount,
  };
}

export function canonicalizeSetSorcererArchivesOpenInput(
  input: SetSorcererArchivesOpenInput,
): SetSorcererArchivesOpenInput {
  if (typeof input.expectedArchivesOpen !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "expectedArchivesOpen must be a boolean");
  }
  if (typeof input.archivesOpen !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "archivesOpen must be a boolean");
  }
  return {
    expectedArchivesOpen: input.expectedArchivesOpen,
    archivesOpen: input.archivesOpen,
  };
}

function canonicalizeConsumableItem(
  item: SorcererTowerMagicConsumableItem,
): SorcererTowerMagicConsumableItem {
  if (item.kind === "tome") {
    return { kind: "tome", school: canonicalizeMagicSchoolRef(item.school, "Tome School") };
  }
  if (!isValidSorcererSourceReagentId(item.reagentId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown source Reagent: ${item.reagentId}`);
  }
  return { kind: "reagent", reagentId: item.reagentId };
}

export function canonicalizeMoveSorcererTowerMagicConsumableInput(
  input: MoveSorcererTowerMagicConsumableInput,
): MoveSorcererTowerMagicConsumableInput {
  if (input.direction !== "tower_to_wizard" && input.direction !== "wizard_to_tower") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unknown consumable movement direction: ${String(input.direction)}`,
    );
  }
  if (!isValidWizardId(input.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${input.wizardId}`);
  }
  assertPositiveSafeInteger("consumable amount", input.amount);
  assertNonNegativeSafeInteger("expected source count", input.expectedSourceCount);
  assertNonNegativeSafeInteger("expected destination count", input.expectedDestinationCount);
  return {
    direction: input.direction,
    wizardId: input.wizardId,
    item: canonicalizeConsumableItem(input.item),
    amount: input.amount,
    expectedSourceCount: input.expectedSourceCount,
    expectedDestinationCount: input.expectedDestinationCount,
  };
}

function requireExistingDenizen(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  if (!isValidDenizenId(denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid ${label}: ${denizenId}`);
  }
  const denizen = state.world.denizens.find((candidate) => candidate.denizenId === denizenId);
  if (denizen === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve: ${denizenId}`);
  }
  return denizen;
}

function requireIndividualPersonnelDenizen(
  state: CampaignStateV5,
  denizenId: DenizenId,
  label: string,
) {
  const denizen = requireExistingDenizen(state, denizenId, label);
  if (denizen.representation !== "individual") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${label} must reference an individual Denizen`,
    );
  }
  return denizen;
}

function sorcererPersonnelConflict(sorcerer: SorcererState, denizenId: DenizenId): string | null {
  if (sorcerer.researchers.some((researcher) => researcher.denizenId === denizenId)) {
    return "Researcher";
  }
  if (sorcerer.academics.some((academic) => academic.denizenId === denizenId)) {
    return "Academic";
  }
  if (sorcerer.arcanists.some((arcanist) => arcanist.denizenId === denizenId)) {
    return "Arcanist";
  }
  return null;
}

function requireNoPersonnelConflict(sorcerer: SorcererState, denizenId: DenizenId): void {
  const conflict = sorcererPersonnelConflict(sorcerer, denizenId);
  if (conflict !== null) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Denizen already holds a conflicting Sorcerer role (${conflict}): ${denizenId}`,
    );
  }
}

function requireVacantResearchPosition(
  sorcerer: SorcererState,
  positionId: SorcererResearchPositionId,
): void {
  if (!sorcerer.researchPositions.some((position) => position.positionId === positionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Research Position does not resolve: ${positionId}`);
  }
  if (sorcerer.researchers.some((researcher) => researcher.positionId === positionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Research Position is occupied: ${positionId}`);
  }
}

function requireLibrarianSchool(sorcerer: SorcererState, school: MagicSchoolRef): void {
  if (school.kind === "campaign" && !sorcerer.campaignSchools.some((entry) => entry.schoolId === school.schoolId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Librarian School does not resolve: ${school.schoolId}`,
    );
  }
}

function requireAlchemistRecipe(sorcerer: SorcererState, recipe: SorcererRecipeRef): void {
  if (recipe.kind === "campaign" && !sorcerer.campaignRecipes.some((entry) => entry.recipeId === recipe.recipeId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Alchemist Recipe does not resolve: ${recipe.recipeId}`,
    );
  }
}

function requireCampaignAcademicKind(
  sorcerer: SorcererState,
  academicKindId: SorcererCampaignAcademicKindId,
): void {
  if (!sorcerer.campaignAcademicKinds.some((kind) => kind.academicKindId === academicKindId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `campaign Academic kind does not resolve: ${academicKindId}`,
    );
  }
}

function academicRoleFromPersonnelDestination(
  sorcerer: SorcererState,
  destination: Exclude<SorcererPersonnelRoleDestination, { kind: "researcher" }>,
): SorcererAcademicRole {
  if (destination.kind === "student") {
    return { kind: "student" };
  }
  if (destination.kind === "professor") {
    return { kind: "professor" };
  }
  if (destination.kind === "librarian") {
    requireLibrarianSchool(sorcerer, destination.school);
    return { kind: "librarian", school: destination.school };
  }
  if (destination.kind === "alchemist") {
    requireAlchemistRecipe(sorcerer, destination.recipe);
    return { kind: "alchemist", recipe: destination.recipe };
  }
  requireCampaignAcademicKind(sorcerer, destination.academicKindId);
  return { kind: "campaign", academicKindId: destination.academicKindId };
}

function academicRoleFromNonStudentDestination(
  sorcerer: SorcererState,
  destination:
    | { readonly kind: "professor" }
    | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
    | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
    | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId },
): SorcererAcademicRole {
  return academicRoleFromPersonnelDestination(sorcerer, destination);
}

function appendTowerMember(order: readonly DenizenId[], denizenId: DenizenId): readonly DenizenId[] {
  return [...order, denizenId];
}

function removeTowerMember(order: readonly DenizenId[], denizenId: DenizenId): readonly DenizenId[] {
  return order.filter((id) => id !== denizenId);
}

export function applyRecruitSorcererPersonnel(
  state: CampaignStateV5,
  rawInput: RecruitSorcererPersonnelInput,
): SorcererTransitionResult {
  const input = canonicalizeRecruitSorcererPersonnelInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  requireExpectedTowerOrder(sorcerer.towerOrder, input.expectedTowerOrder);

  let workingState = state;
  let denizenCreated = false;
  let denizenId: DenizenId;
  if (input.subject.kind === "create_denizen") {
    if (input.subject.representation !== "individual") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Sorcerer personnel Denizen must be individual",
      );
    }
    const created = applyCreateDenizenV5Candidate(state, {
      denizenId: input.subject.denizenId,
      name: input.subject.name,
      representation: input.subject.representation,
      description: input.subject.description,
    });
    workingState = created.nextState;
    denizenCreated = true;
    denizenId = input.subject.denizenId;
  } else {
    denizenId = input.subject.denizenId;
  }

  const denizen = requireIndividualPersonnelDenizen(workingState, denizenId, "Sorcerer personnel");
  requireNoPersonnelConflict(workingState.sorcerer, denizenId);

  let nextSorcerer: SorcererState = workingState.sorcerer;
  if (input.destination.kind === "researcher") {
    requireVacantResearchPosition(nextSorcerer, input.destination.positionId);
    nextSorcerer = {
      ...nextSorcerer,
      researchers: [
        ...nextSorcerer.researchers,
        {
          denizenId,
          positionId: input.destination.positionId,
          operationalThisMonth: true,
        },
      ],
    };
  } else {
    const academic: SorcererAcademic = {
      denizenId,
      role: academicRoleFromPersonnelDestination(nextSorcerer, input.destination),
    };
    nextSorcerer = {
      ...nextSorcerer,
      academics: [...nextSorcerer.academics, academic],
      towerOrder: appendTowerMember(nextSorcerer.towerOrder, denizenId),
    };
  }

  return commitSorcerer(workingState, nextSorcerer, [{
    type: "sorcerer_personnel_recruited",
    version: 1,
    data: {
      denizenId,
      denizenCreated,
      denizenName: denizen.name,
      destination: input.destination,
      previousTowerOrder: sorcerer.towerOrder,
      nextTowerOrder: nextSorcerer.towerOrder,
    },
  }]);
}

export function applyRefocusSorcererResearcher(
  state: CampaignStateV5,
  rawInput: RefocusSorcererResearcherInput,
): SorcererTransitionResult {
  const input = canonicalizeRefocusSorcererResearcherInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  requireExpectedTowerOrder(sorcerer.towerOrder, input.expectedTowerOrder);
  const researcher = sorcerer.researchers.find((candidate) => candidate.denizenId === input.denizenId);
  if (researcher === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Researcher not found: ${input.denizenId}`);
  }
  if (researcher.positionId !== input.expectedPositionId) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Researcher Position: expected "${input.expectedPositionId}" but current is "${researcher.positionId}"`,
    );
  }

  let nextSorcerer: SorcererState;
  if (input.destination.kind === "research_position") {
    if (input.destination.positionId === researcher.positionId) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Refocus produces no change");
    }
    const nextPositionId = input.destination.positionId;
    requireVacantResearchPosition(sorcerer, nextPositionId);
    nextSorcerer = {
      ...sorcerer,
      researchers: sorcerer.researchers.map((candidate) =>
        candidate.denizenId === input.denizenId
          ? { ...candidate, positionId: nextPositionId }
          : candidate,
      ),
    };
  } else {
    const academic: SorcererAcademic = {
      denizenId: input.denizenId,
      role: academicRoleFromNonStudentDestination(sorcerer, input.destination),
    };
    nextSorcerer = {
      ...sorcerer,
      researchers: sorcerer.researchers.filter((candidate) => candidate.denizenId !== input.denizenId),
      academics: [...sorcerer.academics, academic],
      towerOrder: appendTowerMember(sorcerer.towerOrder, input.denizenId),
    };
  }

  return commitSorcerer(state, nextSorcerer, [{
    type: "sorcerer_researcher_refocused",
    version: 1,
    data: {
      denizenId: input.denizenId,
      previousPositionId: researcher.positionId,
      destination: input.destination,
      previousTowerOrder: sorcerer.towerOrder,
      nextTowerOrder: nextSorcerer.towerOrder,
    },
  }]);
}

export function applyTutorSorcererStudent(
  state: CampaignStateV5,
  rawInput: TutorSorcererStudentInput,
): SorcererTransitionResult {
  const input = canonicalizeTutorSorcererStudentInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  requireExpectedTowerOrder(sorcerer.towerOrder, input.expectedTowerOrder);
  const academic = sorcerer.academics.find((candidate) => candidate.denizenId === input.denizenId);
  if (academic === undefined || academic.role.kind !== "student") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Student not found: ${input.denizenId}`);
  }
  if (!sorcerer.towerOrder.includes(input.denizenId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Student is missing from Tower order: ${input.denizenId}`,
    );
  }

  const remainingAcademics = sorcerer.academics.filter((candidate) => candidate.denizenId !== input.denizenId);
  let nextSorcerer: SorcererState;
  if (input.destination.kind === "researcher") {
    requireVacantResearchPosition(sorcerer, input.destination.positionId);
    nextSorcerer = {
      ...sorcerer,
      academics: remainingAcademics,
      researchers: [
        ...sorcerer.researchers,
        {
          denizenId: input.denizenId,
          positionId: input.destination.positionId,
          operationalThisMonth: true,
        },
      ],
      towerOrder: removeTowerMember(sorcerer.towerOrder, input.denizenId),
    };
  } else {
    nextSorcerer = {
      ...sorcerer,
      academics: [
        ...remainingAcademics,
        {
          denizenId: input.denizenId,
          role: academicRoleFromNonStudentDestination(sorcerer, input.destination),
        },
      ],
    };
  }

  return commitSorcerer(state, nextSorcerer, [{
    type: "sorcerer_student_tutored",
    version: 1,
    data: {
      denizenId: input.denizenId,
      destination: input.destination,
      previousTowerOrder: sorcerer.towerOrder,
      nextTowerOrder: nextSorcerer.towerOrder,
    },
  }]);
}

export function applyRearrangeSorcererTower(
  state: CampaignStateV5,
  rawInput: RearrangeSorcererTowerInput,
): SorcererTransitionResult {
  const input = canonicalizeRearrangeSorcererTowerInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  requireExpectedTowerOrder(sorcerer.towerOrder, input.expectedTowerOrder);
  if (!sameDenizenIdSet(sorcerer.towerOrder, input.towerOrder)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Tower rearrangement must keep the exact current Tower membership",
    );
  }
  if (denizenIdsEqual(sorcerer.towerOrder, input.towerOrder)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Tower rearrangement produces no change");
  }
  return commitSorcerer(state, { ...sorcerer, towerOrder: input.towerOrder }, [{
    type: "sorcerer_tower_rearranged",
    version: 1,
    data: {
      previousTowerOrder: sorcerer.towerOrder,
      nextTowerOrder: input.towerOrder,
    },
  }]);
}

export function applySetSorcererResearcherOperationalThisMonth(
  state: CampaignStateV5,
  rawInput: SetSorcererResearcherOperationalThisMonthInput,
): SorcererTransitionResult {
  const input = canonicalizeSetSorcererResearcherOperationalThisMonthInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const researcher = sorcerer.researchers.find((candidate) => candidate.denizenId === input.denizenId);
  if (researcher === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Researcher not found: ${input.denizenId}`);
  }
  if (researcher.operationalThisMonth !== input.expectedOperationalThisMonth) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Researcher operationalThisMonth: expected "${input.expectedOperationalThisMonth}" but current is "${researcher.operationalThisMonth}"`,
    );
  }
  if (researcher.operationalThisMonth === input.operationalThisMonth) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Researcher operational state produces no change");
  }
  const researchers = sorcerer.researchers.map((candidate) =>
    candidate.denizenId === input.denizenId
      ? { ...candidate, operationalThisMonth: input.operationalThisMonth }
      : candidate,
  );
  return commitSorcerer(state, { ...sorcerer, researchers }, [{
    type: "sorcerer_researcher_operational_this_month_changed",
    version: 1,
    data: {
      denizenId: input.denizenId,
      previousOperationalThisMonth: researcher.operationalThisMonth,
      operationalThisMonth: input.operationalThisMonth,
    },
  }]);
}

export function applyAdjustSorcererKnowledge(
  state: CampaignStateV5,
  rawInput: AdjustSorcererKnowledgeInput,
): SorcererTransitionResult {
  const input = canonicalizeAdjustSorcererKnowledgeInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const previousAmount = sorcerer.knowledge[input.pool];
  if (previousAmount !== input.expectedAmount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Knowledge ${input.pool}: expected "${input.expectedAmount}" but current is "${previousAmount}"`,
    );
  }
  if (previousAmount === input.amount) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Knowledge adjustment produces no change");
  }
  const knowledge: SorcererKnowledgeState = {
    ...sorcerer.knowledge,
    [input.pool]: input.amount,
  };
  return commitSorcerer(state, { ...sorcerer, knowledge }, [{
    type: "sorcerer_knowledge_adjusted",
    version: 1,
    data: {
      pool: input.pool,
      previousAmount,
      amount: input.amount,
    },
  }]);
}

export function applySetSorcererArchivesOpen(
  state: CampaignStateV5,
  rawInput: SetSorcererArchivesOpenInput,
): SorcererTransitionResult {
  const input = canonicalizeSetSorcererArchivesOpenInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  if (sorcerer.archivesOpen !== input.expectedArchivesOpen) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Archives: expected "${input.expectedArchivesOpen}" but current is "${sorcerer.archivesOpen}"`,
    );
  }
  if (sorcerer.archivesOpen === input.archivesOpen) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Archives state produces no change");
  }
  return commitSorcerer(state, { ...sorcerer, archivesOpen: input.archivesOpen }, [{
    type: "sorcerer_archives_open_changed",
    version: 1,
    data: {
      previousArchivesOpen: sorcerer.archivesOpen,
      archivesOpen: input.archivesOpen,
    },
  }]);
}

const TOWER_CUSTODY: MagicConsumableCustody = { kind: "sorcerer_tower" };

function wizardCustody(wizardId: WizardId): MagicConsumableCustody {
  return { kind: "subject", subject: { kind: "wizard", wizardId } };
}

function custodyForDirection(
  direction: SorcererTowerMagicConsumableDirection,
  wizardId: WizardId,
  side: "source" | "destination",
): MagicConsumableCustody {
  const wizardIsSource = direction === "wizard_to_tower";
  if (side === "source") {
    return wizardIsSource ? wizardCustody(wizardId) : TOWER_CUSTODY;
  }
  return wizardIsSource ? TOWER_CUSTODY : wizardCustody(wizardId);
}

function stackCountForTome(
  tomes: readonly TomeStack[],
  school: MagicSchoolRef,
  custody: MagicConsumableCustody,
): number {
  const key = tomeStackKey({ school, custody, count: 1 });
  return tomes.find((stack) => tomeStackKey(stack) === key)?.count ?? 0;
}

function stackCountForReagent(
  reagents: readonly ReagentStack[],
  reagentId: SorcererSourceReagentId,
  custody: MagicConsumableCustody,
): number {
  const key = reagentStackKey({ reagentId, custody, count: 1 });
  return reagents.find((stack) => reagentStackKey(stack) === key)?.count ?? 0;
}

function applyCountChange<T extends { readonly count: number }>(
  stacks: readonly T[],
  keyOf: (stack: T) => string,
  targetKey: string,
  nextCount: number,
  create: (count: number) => T,
): T[] {
  const next: T[] = [];
  let found = false;
  for (const stack of stacks) {
    if (keyOf(stack) === targetKey) {
      found = true;
      if (nextCount > 0) {
        next.push(create(nextCount));
      }
    } else {
      next.push(stack);
    }
  }
  if (!found && nextCount > 0) {
    next.push(create(nextCount));
  }
  return next;
}

export function applyMoveSorcererTowerMagicConsumable(
  state: CampaignStateV5,
  rawInput: MoveSorcererTowerMagicConsumableInput,
): SorcererTransitionResult {
  const input = canonicalizeMoveSorcererTowerMagicConsumableInput(rawInput);
  requireInitializedSorcerer(state);
  if (!state.wizards.some((wizard) => wizard.wizardId === input.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `wizardId does not resolve: ${input.wizardId}`);
  }

  const sourceCustody = custodyForDirection(input.direction, input.wizardId, "source");
  const destinationCustody = custodyForDirection(input.direction, input.wizardId, "destination");
  if (magicConsumableCustodyKey(sourceCustody) === magicConsumableCustodyKey(destinationCustody)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Consumable source and destination must differ");
  }

  let previousSourceCount: number;
  let previousDestinationCount: number;
  let nextTomes = [...state.magicConsumables.tomes];
  let nextReagents = [...state.magicConsumables.reagents];

  if (input.item.kind === "tome") {
    previousSourceCount = stackCountForTome(state.magicConsumables.tomes, input.item.school, sourceCustody);
    previousDestinationCount = stackCountForTome(
      state.magicConsumables.tomes,
      input.item.school,
      destinationCustody,
    );
  } else {
    previousSourceCount = stackCountForReagent(
      state.magicConsumables.reagents,
      input.item.reagentId,
      sourceCustody,
    );
    previousDestinationCount = stackCountForReagent(
      state.magicConsumables.reagents,
      input.item.reagentId,
      destinationCustody,
    );
  }

  if (previousSourceCount !== input.expectedSourceCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `source count: expected "${input.expectedSourceCount}" but current is "${previousSourceCount}"`,
    );
  }
  if (previousDestinationCount !== input.expectedDestinationCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `destination count: expected "${input.expectedDestinationCount}" but current is "${previousDestinationCount}"`,
    );
  }
  if (previousSourceCount < input.amount) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Consumable source does not contain the requested amount");
  }

  const nextSourceCount = previousSourceCount - input.amount;
  const nextDestinationCount = previousDestinationCount + input.amount;

  if (input.item.kind === "tome") {
    const school = input.item.school;
    const sourceKey = tomeStackKey({ school, custody: sourceCustody, count: 1 });
    const destinationKey = tomeStackKey({ school, custody: destinationCustody, count: 1 });
    nextTomes = applyCountChange(
      nextTomes,
      tomeStackKey,
      sourceKey,
      nextSourceCount,
      (count) => ({ school, custody: sourceCustody, count }),
    );
    nextTomes = applyCountChange(
      nextTomes,
      tomeStackKey,
      destinationKey,
      nextDestinationCount,
      (count) => ({ school, custody: destinationCustody, count }),
    );
  } else {
    const reagentId = input.item.reagentId;
    const sourceKey = reagentStackKey({ reagentId, custody: sourceCustody, count: 1 });
    const destinationKey = reagentStackKey({
      reagentId,
      custody: destinationCustody,
      count: 1,
    });
    nextReagents = applyCountChange(
      nextReagents,
      reagentStackKey,
      sourceKey,
      nextSourceCount,
      (count) => ({ reagentId, custody: sourceCustody, count }),
    );
    nextReagents = applyCountChange(
      nextReagents,
      reagentStackKey,
      destinationKey,
      nextDestinationCount,
      (count) => ({ reagentId, custody: destinationCustody, count }),
    );
  }

  const nextState: CampaignStateV5 = {
    ...state,
    magicConsumables: { tomes: nextTomes, reagents: nextReagents },
  };
  validateSorcererReferenceIntegrity(nextState);
  return {
    nextState,
    events: [{
      type: "sorcerer_tower_magic_consumable_moved",
      version: 1,
      data: {
        direction: input.direction,
        wizardId: input.wizardId,
        item: input.item,
        amount: input.amount,
        previousSourceCount,
        nextSourceCount,
        previousDestinationCount,
        nextDestinationCount,
      },
    }],
  };
}
