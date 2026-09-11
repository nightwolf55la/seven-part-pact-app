import type { ElementId } from "./shared-world";
import type { PactSeatId } from "./pact-seats";
import type { MarinerBoardIsleId, MarinerHorizonCardinalGroupId } from "./mariner-catalogs";
import type { NecromancerBuiltinGateId } from "./necromancer-catalogs";
import type { HierophantStartingTempleId } from "./hierophant-catalogs";
import type { WarlockClanId } from "./warlock-catalogs";
import type { RulesetRef } from "./ruleset";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import {
  DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS,
  DRAFT4_V1_SOURCE_LORE_COLLECTIONS_RAW,
  DRAFT4_V1_SOURCE_LORE_TOPIC_IDS,
  DRAFT4_V1_SOURCE_LORE_CATALOG_SEMANTIC_DIGEST,
} from "./lore-catalog-collections";

export type SourceLoreCollectionId = (typeof DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS)[number];
export type SourceLoreTopicId = (typeof DRAFT4_V1_SOURCE_LORE_TOPIC_IDS)[number];
export type SourceLoreEntryId = string;

export type LoreSubjectKind =
  | "isle"
  | "place"
  | "necromancer_gate"
  | "hierophant_temple"
  | "warlock_clan"
  | "element"
  | "pact_domain"
  | "mariner_horizon"
  | "source_topic";

export const LORE_SUBJECT_KINDS: readonly LoreSubjectKind[] = [
  "isle",
  "place",
  "necromancer_gate",
  "hierophant_temple",
  "warlock_clan",
  "element",
  "pact_domain",
  "mariner_horizon",
  "source_topic",
] as const;

export type SourceLoreBindingDescriptor =
  | { readonly strategy: "wizard_home_isle"; readonly pactSeatId: PactSeatId }
  | { readonly strategy: "wizard_sanctum_place"; readonly pactSeatId: PactSeatId }
  | { readonly strategy: "sorcerer_spyrholm_isle" }
  | { readonly strategy: "sorcerer_tower_place" }
  | { readonly strategy: "mariner_board_isle"; readonly boardIsleId: MarinerBoardIsleId }
  | { readonly strategy: "mariner_ship_place" }
  | { readonly strategy: "necromancer_builtin_gate"; readonly gateId: NecromancerBuiltinGateId }
  | { readonly strategy: "hierophant_starting_temple"; readonly templeId: HierophantStartingTempleId }
  | { readonly strategy: "warlock_clan"; readonly clanId: WarlockClanId }
  | { readonly strategy: "element"; readonly elementId: ElementId }
  | { readonly strategy: "mariner_horizon"; readonly cardinalGroupId: MarinerHorizonCardinalGroupId }
  | { readonly strategy: "source_topic"; readonly topicId: SourceLoreTopicId };

export interface SourceLoreAttribution {
  readonly work: string;
  readonly pages: string;
  readonly anchor: string;
}

export interface SourceLoreEntryDefinition {
  readonly sourceEntryId: SourceLoreEntryId;
  readonly text: string;
}

export interface SourceLoreCollectionDefinition {
  readonly sourceCollectionId: SourceLoreCollectionId;
  readonly subjectKind: LoreSubjectKind;
  readonly binding: SourceLoreBindingDescriptor;
  readonly attribution: SourceLoreAttribution;
  readonly bindingRequirement: string;
  readonly discrepancyNotes: readonly string[];
  readonly entries: readonly SourceLoreEntryDefinition[];
}

export interface SourceLoreCatalog {
  readonly ruleset: {
    readonly id: typeof SEVEN_PART_PACT_DRAFT4_ID;
    readonly version: typeof SEVEN_PART_PACT_DRAFT4_VERSION;
  };
  readonly collections: readonly SourceLoreCollectionDefinition[];
}

export type SourceLoreCatalogLookup =
  | { readonly ok: true; readonly catalog: SourceLoreCatalog }
  | { readonly ok: false; readonly reason: "unsupported_ruleset" };

const SOURCE_LORE_ENTRY_ID_REGEX = /^e[0-9]{2}$/;
const SOURCE_COLLECTION_ID_SET = new Set<string>(DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS);
const SOURCE_TOPIC_ID_SET = new Set<string>(DRAFT4_V1_SOURCE_LORE_TOPIC_IDS);

export const DRAFT4_V1_SOURCE_LORE_COLLECTIONS: readonly SourceLoreCollectionDefinition[] =
  DRAFT4_V1_SOURCE_LORE_COLLECTIONS_RAW as unknown as readonly SourceLoreCollectionDefinition[];

const DRAFT4_V1_SOURCE_LORE_COLLECTION_BY_ID = new Map<SourceLoreCollectionId, SourceLoreCollectionDefinition>(
  DRAFT4_V1_SOURCE_LORE_COLLECTIONS.map((collection) => [collection.sourceCollectionId, collection]),
);

export const DRAFT4_V1_SOURCE_LORE_CATALOG: SourceLoreCatalog = {
  ruleset: {
    id: SEVEN_PART_PACT_DRAFT4_ID,
    version: SEVEN_PART_PACT_DRAFT4_VERSION,
  },
  collections: DRAFT4_V1_SOURCE_LORE_COLLECTIONS,
};

export { DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS, DRAFT4_V1_SOURCE_LORE_TOPIC_IDS, DRAFT4_V1_SOURCE_LORE_CATALOG_SEMANTIC_DIGEST };

export function isValidSourceLoreCollectionId(value: string): value is SourceLoreCollectionId {
  return SOURCE_COLLECTION_ID_SET.has(value);
}

export function isValidSourceLoreTopicId(value: string): value is SourceLoreTopicId {
  return SOURCE_TOPIC_ID_SET.has(value);
}

export function isValidSourceLoreEntryIdFormat(value: string): value is SourceLoreEntryId {
  return SOURCE_LORE_ENTRY_ID_REGEX.test(value);
}

export function isValidLoreSubjectKind(value: string): value is LoreSubjectKind {
  return (LORE_SUBJECT_KINDS as readonly string[]).includes(value);
}

/**
 * Exact ruleset baseline lookup. Never falls back to CURRENT_RULESET or any
 * implicit latest catalog.
 */
export function lookupSourceLoreCatalog(ruleset: RulesetRef): SourceLoreCatalogLookup {
  if (ruleset.id === SEVEN_PART_PACT_DRAFT4_ID && ruleset.version === SEVEN_PART_PACT_DRAFT4_VERSION) {
    return { ok: true, catalog: DRAFT4_V1_SOURCE_LORE_CATALOG };
  }
  return { ok: false, reason: "unsupported_ruleset" };
}

export function sourceLoreCollectionDefinition(
  catalog: SourceLoreCatalog,
  sourceCollectionId: string,
): SourceLoreCollectionDefinition | undefined {
  if (catalog !== DRAFT4_V1_SOURCE_LORE_CATALOG) {
    return catalog.collections.find((collection) => collection.sourceCollectionId === sourceCollectionId);
  }
  if (!isValidSourceLoreCollectionId(sourceCollectionId)) {
    return undefined;
  }
  return DRAFT4_V1_SOURCE_LORE_COLLECTION_BY_ID.get(sourceCollectionId);
}

export function sourceLoreEntryIds(definition: SourceLoreCollectionDefinition): readonly SourceLoreEntryId[] {
  return definition.entries.map((entry) => entry.sourceEntryId);
}

export function sourceLoreCatalogCoverage(catalog: SourceLoreCatalog): {
  readonly collectionCount: number;
  readonly fixedSourceEntryCount: number;
  readonly zeroBaselineSourceContextCount: number;
  readonly subjectKindDistribution: Readonly<Record<LoreSubjectKind, number>>;
} {
  const subjectKindDistribution = {} as Record<LoreSubjectKind, number>;
  for (const kind of LORE_SUBJECT_KINDS) {
    subjectKindDistribution[kind] = 0;
  }
  let fixedSourceEntryCount = 0;
  let zeroBaselineSourceContextCount = 0;
  for (const collection of catalog.collections) {
    subjectKindDistribution[collection.subjectKind] += 1;
    fixedSourceEntryCount += collection.entries.length;
    if (collection.entries.length === 0) {
      zeroBaselineSourceContextCount += 1;
    }
  }
  return {
    collectionCount: catalog.collections.length,
    fixedSourceEntryCount,
    zeroBaselineSourceContextCount,
    subjectKindDistribution,
  };
}

export function sourceLoreCatalogSemanticManifest(catalog: SourceLoreCatalog): unknown {
  return catalog.collections.map((collection) => ({
    sourceCollectionId: collection.sourceCollectionId,
    subjectKind: collection.subjectKind,
    binding: collection.binding,
    entries: collection.entries,
  }));
}

export type SourceLorePreviewResult =
  | {
      readonly ok: true;
      readonly definition: SourceLoreCollectionDefinition;
      readonly entries: readonly SourceLoreEntryDefinition[];
    }
  | { readonly ok: false; readonly reason: "unsupported_ruleset" | "unknown_collection" };

/**
 * Static source preview. Does not instantiate, bind, or repair campaign state.
 */
export function previewSourceLoreCollection(
  ruleset: RulesetRef,
  sourceCollectionId: string,
): SourceLorePreviewResult {
  const lookup = lookupSourceLoreCatalog(ruleset);
  if (!lookup.ok) {
    return { ok: false, reason: "unsupported_ruleset" };
  }
  const definition = sourceLoreCollectionDefinition(lookup.catalog, sourceCollectionId);
  if (definition === undefined) {
    return { ok: false, reason: "unknown_collection" };
  }
  return { ok: true, definition, entries: definition.entries };
}
