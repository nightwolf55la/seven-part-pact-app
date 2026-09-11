/**
 * Sorcerer current-state shape for CampaignState V5.
 *
 * SOURCE: Tower arrangements, Research Positions, Researchers/Academics/Arcanists,
 * Knowledge, Tomes/Reagents, Archives, Innovations, Constructs' written If/Then
 * instructions, Disruptive Arcanist profiles, and Age-specific setup.
 *
 * APPLICATION DESIGN: exact TypeScript shape, stable IDs, validator layout,
 * normalized campaign-created definition records, and current-vs-delayed Knowledge.
 *
 * Static catalog prose lives in sorcerer-catalogs / grimoire-catalog, not here.
 */

import type { Brand } from "./brand";
import type { DenizenId, IsleId, PlaceId } from "./ids";
import type { HouseIndex } from "./orrery";
import type { PactSeatId } from "./pact-seats";
import type { ElementId } from "./shared-world";
import type { HierophantOrdinaryStartingTempleId, HierophantTempleId } from "./hierophant-catalogs";
import type { WarlockIdeologyId } from "./warlock-catalogs";
import type { MarinerSeaRegionId } from "./mariner-catalogs";
import type { GrimoireSpellId } from "./grimoire-catalog";
import type {
  CampaignSchoolOfMagicId,
  SorcererBuiltinAlchemicalRecipeId,
  SorcererLawOfMagicId,
} from "./sorcerer-catalogs";
import type { MagicSchoolRef } from "./magic-consumables";

const BRANDED_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const SORCERER_BASE_RESEARCH_POSITION_IDS = [
  "srp_orrery_1",
  "srp_orrery_2",
  "srp_orrery_3",
  "srp_temple_krolis",
  "srp_temple_notor",
  "srp_temple_ushin",
  "srp_temple_zephon",
  "srp_court_1",
  "srp_court_2",
  "srp_sea_1",
  "srp_sea_2",
  "srp_sage_future_1",
  "srp_sage_future_2",
  "srp_faustian_devils_schemes",
  "srp_necromancer_final_death",
] as const;

export type SorcererBaseResearchPositionId = (typeof SORCERER_BASE_RESEARCH_POSITION_IDS)[number];
export type SorcererCampaignResearchPositionId = Brand<string, "SorcererCampaignResearchPositionId">;
export type SorcererResearchPositionId = SorcererBaseResearchPositionId | SorcererCampaignResearchPositionId;

export type SorcererInnovationId = Brand<string, "SorcererInnovationId">;
export type SorcererCampaignAcademicKindId = Brand<string, "SorcererCampaignAcademicKindId">;
export type SorcererCampaignRecipeId = Brand<string, "SorcererCampaignRecipeId">;
export type SorcererCampaignKnowledgeMethodId = Brand<string, "SorcererCampaignKnowledgeMethodId">;

const CAMPAIGN_RESEARCH_POSITION_ID_REGEX = new RegExp(`^srp_${BRANDED_UUID}$`);
const INNOVATION_ID_REGEX = new RegExp(`^sinn_${BRANDED_UUID}$`);
const CAMPAIGN_ACADEMIC_KIND_ID_REGEX = new RegExp(`^sack_${BRANDED_UUID}$`);
const CAMPAIGN_RECIPE_ID_REGEX = new RegExp(`^srec_${BRANDED_UUID}$`);
const CAMPAIGN_KNOWLEDGE_METHOD_ID_REGEX = new RegExp(`^sknm_${BRANDED_UUID}$`);

const BASE_RESEARCH_POSITION_ID_SET = new Set<string>(SORCERER_BASE_RESEARCH_POSITION_IDS);

export function isValidSorcererBaseResearchPositionId(
  value: string,
): value is SorcererBaseResearchPositionId {
  return BASE_RESEARCH_POSITION_ID_SET.has(value);
}

export function isValidSorcererCampaignResearchPositionId(
  value: string,
): value is SorcererCampaignResearchPositionId {
  return CAMPAIGN_RESEARCH_POSITION_ID_REGEX.test(value);
}

export function isValidSorcererResearchPositionId(value: string): value is SorcererResearchPositionId {
  return isValidSorcererBaseResearchPositionId(value) || isValidSorcererCampaignResearchPositionId(value);
}

export function isValidSorcererInnovationId(value: string): value is SorcererInnovationId {
  return INNOVATION_ID_REGEX.test(value);
}

export function isValidSorcererCampaignAcademicKindId(value: string): value is SorcererCampaignAcademicKindId {
  return CAMPAIGN_ACADEMIC_KIND_ID_REGEX.test(value);
}

export function isValidSorcererCampaignRecipeId(value: string): value is SorcererCampaignRecipeId {
  return CAMPAIGN_RECIPE_ID_REGEX.test(value);
}

export function isValidSorcererCampaignKnowledgeMethodId(
  value: string,
): value is SorcererCampaignKnowledgeMethodId {
  return CAMPAIGN_KNOWLEDGE_METHOD_ID_REGEX.test(value);
}

export const SORCERER_RESEARCH_TEMPLE_IDS: readonly HierophantOrdinaryStartingTempleId[] = [
  "krolis",
  "notor",
  "ushin",
  "zephon",
];

export const SORCERER_ORRERY_RESEARCH_POSITION_IDS = [
  "srp_orrery_1",
  "srp_orrery_2",
  "srp_orrery_3",
] as const satisfies readonly SorcererBaseResearchPositionId[];

export const SORCERER_TEMPLE_RESEARCH_POSITION_IDS = [
  "srp_temple_krolis",
  "srp_temple_notor",
  "srp_temple_ushin",
  "srp_temple_zephon",
] as const satisfies readonly SorcererBaseResearchPositionId[];

export type SorcererResearchPositionTarget =
  | { readonly kind: "orrery_house"; readonly house: HouseIndex }
  | { readonly kind: "hierophant_temple"; readonly templeId: HierophantTempleId }
  | { readonly kind: "warlock_ideology"; readonly ideologyId: WarlockIdeologyId }
  | { readonly kind: "mariner_sea_region"; readonly seaRegionId: MarinerSeaRegionId }
  | { readonly kind: "sage_future_of_pact" }
  | { readonly kind: "faustian_devils_schemes" }
  | { readonly kind: "necromancer_final_death" }
  | {
      readonly kind: "campaign_knowledge_method";
      readonly knowledgeMethodId: SorcererCampaignKnowledgeMethodId;
    };

export interface SorcererResearchPosition {
  readonly positionId: SorcererResearchPositionId;
  readonly target: SorcererResearchPositionTarget;
}

export interface SorcererResearcher {
  readonly denizenId: DenizenId;
  readonly positionId: SorcererResearchPositionId;
}

export type SorcererRecipeRef =
  | { readonly kind: "builtin"; readonly recipeId: SorcererBuiltinAlchemicalRecipeId }
  | { readonly kind: "campaign"; readonly recipeId: SorcererCampaignRecipeId };

export type SorcererAcademicRole =
  | { readonly kind: "student" }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign"; readonly academicKindId: SorcererCampaignAcademicKindId };

export interface SorcererAcademic {
  readonly denizenId: DenizenId;
  readonly role: SorcererAcademicRole;
}

/**
 * APPLICATION DESIGN: Research-origin Knowledge is Student-eligible.
 * Other Knowledge is not established as Research-origin. Generic Knowledge Gifts
 * default to `other` unless their concrete source says they were obtained through Research.
 *
 * The source "Researchers produce twice as much Knowledge next month" effect is why
 * current/next production multipliers exist. F2 does not define stacking rules.
 */
export interface SorcererKnowledgeState {
  readonly researchOrigin: number;
  readonly other: number;
  readonly nextMonthResearchOrigin: number;
  readonly researcherProductionMultiplierCurrent: number;
  readonly researcherProductionMultiplierNextMonth: number;
}

export const EMPTY_SORCERER_KNOWLEDGE_STATE: SorcererKnowledgeState = {
  researchOrigin: 0,
  other: 0,
  nextMonthResearchOrigin: 0,
  researcherProductionMultiplierCurrent: 1,
  researcherProductionMultiplierNextMonth: 1,
};

export const SORCERER_ARCANIST_RANKS = ["prentice", "journeyman", "master"] as const;
export type SorcererArcanistRank = (typeof SORCERER_ARCANIST_RANKS)[number];

export function isValidSorcererArcanistRank(value: string): value is SorcererArcanistRank {
  return (SORCERER_ARCANIST_RANKS as readonly string[]).includes(value);
}

/**
 * SOURCE: Prentice Arcanists know one or two spells from their School.
 * Journeymen know "most" and Masters "certain" spells — F2 does not invent those lists.
 *
 * Custom spell identity for campaign-created Schools remains deferred. A Prentice of a
 * campaign School is representable without Grimoire spell IDs.
 */
export interface SorcererDisruptiveArcanistProfile {
  readonly primaryElement: ElementId;
  readonly rank: SorcererArcanistRank;
  readonly changesOfMagic: readonly string[];
  readonly quirk: string;
  readonly prenticeSpellIds: readonly GrimoireSpellId[];
}

export type SorcererArcanistPlacement =
  | { readonly kind: "tower" }
  | { readonly kind: "other_domain"; readonly seatId: PactSeatId };

export interface SorcererArcanist {
  readonly denizenId: DenizenId;
  readonly school: MagicSchoolRef;
  readonly placement: SorcererArcanistPlacement;
  readonly disruptiveProfile: SorcererDisruptiveArcanistProfile | null;
}

/**
 * SOURCE: written If/Then statements govern repeated Construct behavior.
 * F2 persists the text for table execution; there is no interpreter.
 */
export interface SorcererConstructInstruction {
  readonly condition: string;
  readonly result: string;
}

export interface SorcererConstructOverlay {
  readonly denizenId: DenizenId;
  readonly instructions: readonly SorcererConstructInstruction[];
}

/** School is derived from the Grimoire catalog; do not persist it here. */
export interface SorcererInnovation {
  readonly innovationId: SorcererInnovationId;
  readonly spellId: GrimoireSpellId;
  readonly text: string;
}

export interface SorcererCampaignSchoolDefinition {
  readonly schoolId: CampaignSchoolOfMagicId;
  readonly name: string;
  readonly description: string;
}

export interface SorcererCampaignAcademicKindDefinition {
  readonly academicKindId: SorcererCampaignAcademicKindId;
  readonly name: string;
  readonly action: string;
}

export interface SorcererCampaignRecipeDefinition {
  readonly recipeId: SorcererCampaignRecipeId;
  readonly name: string;
  readonly recipeText: string;
}

export interface SorcererCampaignKnowledgeMethodDefinition {
  readonly knowledgeMethodId: SorcererCampaignKnowledgeMethodId;
  readonly name: string;
  readonly description: string;
}

export interface SorcererState {
  readonly initialized: boolean;
  readonly spyrholmIsleId: IsleId | null;
  readonly towerPlaceId: PlaceId | null;
  readonly universityPlaceId: PlaceId | null;
  readonly activeLawIds: readonly SorcererLawOfMagicId[];
  readonly unrevealedLawIds: readonly SorcererLawOfMagicId[];
  readonly campaignSchools: readonly SorcererCampaignSchoolDefinition[];
  readonly campaignAcademicKinds: readonly SorcererCampaignAcademicKindDefinition[];
  readonly campaignRecipes: readonly SorcererCampaignRecipeDefinition[];
  readonly campaignKnowledgeMethods: readonly SorcererCampaignKnowledgeMethodDefinition[];
  readonly researchPositions: readonly SorcererResearchPosition[];
  readonly researchers: readonly SorcererResearcher[];
  readonly academics: readonly SorcererAcademic[];
  readonly towerOrder: readonly DenizenId[];
  readonly knowledge: SorcererKnowledgeState;
  readonly arcanists: readonly SorcererArcanist[];
  readonly constructs: readonly SorcererConstructOverlay[];
  readonly innovations: readonly SorcererInnovation[];
  readonly archivesOpen: boolean;
}

export const EMPTY_SORCERER_STATE: SorcererState = {
  initialized: false,
  spyrholmIsleId: null,
  towerPlaceId: null,
  universityPlaceId: null,
  activeLawIds: [],
  unrevealedLawIds: [],
  campaignSchools: [],
  campaignAcademicKinds: [],
  campaignRecipes: [],
  campaignKnowledgeMethods: [],
  researchPositions: [],
  researchers: [],
  academics: [],
  towerOrder: [],
  knowledge: EMPTY_SORCERER_KNOWLEDGE_STATE,
  arcanists: [],
  constructs: [],
  innovations: [],
  archivesOpen: false,
};

export function isOrreryResearchPositionId(positionId: SorcererResearchPositionId): boolean {
  return (SORCERER_ORRERY_RESEARCH_POSITION_IDS as readonly string[]).includes(positionId);
}

export interface SourceResearchPositionTopologyInput {
  readonly orreryHouses: readonly [HouseIndex, HouseIndex, HouseIndex];
  readonly ideologyIds: readonly [WarlockIdeologyId, WarlockIdeologyId];
  readonly seaRegionIds: readonly [MarinerSeaRegionId, MarinerSeaRegionId];
}

/** SOURCE base topology of 15 Research Positions. Not a permanent cardinality invariant. */
export function buildSourceResearchPositions(
  input: SourceResearchPositionTopologyInput,
): readonly SorcererResearchPosition[] {
  return [
    { positionId: "srp_orrery_1", target: { kind: "orrery_house", house: input.orreryHouses[0] } },
    { positionId: "srp_orrery_2", target: { kind: "orrery_house", house: input.orreryHouses[1] } },
    { positionId: "srp_orrery_3", target: { kind: "orrery_house", house: input.orreryHouses[2] } },
    { positionId: "srp_temple_krolis", target: { kind: "hierophant_temple", templeId: "krolis" } },
    { positionId: "srp_temple_notor", target: { kind: "hierophant_temple", templeId: "notor" } },
    { positionId: "srp_temple_ushin", target: { kind: "hierophant_temple", templeId: "ushin" } },
    { positionId: "srp_temple_zephon", target: { kind: "hierophant_temple", templeId: "zephon" } },
    { positionId: "srp_court_1", target: { kind: "warlock_ideology", ideologyId: input.ideologyIds[0] } },
    { positionId: "srp_court_2", target: { kind: "warlock_ideology", ideologyId: input.ideologyIds[1] } },
    { positionId: "srp_sea_1", target: { kind: "mariner_sea_region", seaRegionId: input.seaRegionIds[0] } },
    { positionId: "srp_sea_2", target: { kind: "mariner_sea_region", seaRegionId: input.seaRegionIds[1] } },
    { positionId: "srp_sage_future_1", target: { kind: "sage_future_of_pact" } },
    { positionId: "srp_sage_future_2", target: { kind: "sage_future_of_pact" } },
    { positionId: "srp_faustian_devils_schemes", target: { kind: "faustian_devils_schemes" } },
    { positionId: "srp_necromancer_final_death", target: { kind: "necromancer_final_death" } },
  ];
}
