import type { CampaignStateV5, PactSeatStatus } from "./campaign-state";
import type { LoreCollectionId, LoreEntryId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId, PACT_SEAT_IDS, pactSeatDisplayName } from "./pact-seats";
import type { ElementId } from "./shared-world";
import {
  isValidHierophantStartingTempleId,
  hierophantStartingTempleDisplayName,
} from "./hierophant-catalogs";
import {
  isValidNecromancerBuiltinGateId,
  isValidNecromancerCampaignGateId,
  necromancerBuiltinGateDefinition,
} from "./necromancer-catalogs";
import { WARLOCK_CLAN_DEFINITIONS } from "./warlock-catalogs";
import {
  MARINER_BOARD_ISLE_DEFINITIONS,
  type MarinerBoardIsleId,
} from "./mariner-catalogs";
import type { SourceLoreAttribution, SourceLoreCollectionDefinition, SourceLoreCollectionId } from "./lore-catalog";
import { lookupSourceLoreCatalog } from "./lore-catalog";
import type { AddLoreEntryTarget, ReviseLoreEntryTarget } from "./lore-transitions";
import {
  campaignLoreCollectionForSubject,
  composeEffectiveSourceLore,
  instantiatedSourceLoreCollection,
  loreSubjectKey,
  MARINER_DELEGATED_ISLE_OWNER_SEATS,
  MARINER_FAR_REACH_SOURCE_COLLECTION_ID,
  MARINER_ISLE_LORE_DELEGATION,
  resolveSourceLoreBinding,
  selectMarinerIsleLoreContext,
  selectedMarinerIsleLoreAvailability,
  type CampaignLoreCollection,
  type InstantiatedSourceLoreCollection,
  type LoreBindingResolution,
  type LoreSubjectRef,
  type MarinerIsleLoreContextSelection,
} from "./lore-state";

export const LORE_PROVENANCE_PRINTED = "Printed wording";
export const LORE_PROVENANCE_CHANGED_IN_PLAY = "Changed in play";
export const LORE_PROVENANCE_ADDED_IN_PLAY = "Added in play";
export const LORE_CONTEXT_LABEL_CAMPAIGN = "Campaign Lore";

export const LORE_WRITE_UNAVAILABLE_NOT_READY =
  "This Lore can be read from the printed text, but it cannot be changed until its place in the campaign is established.";

export type LorePresentationShelfId =
  | "isles"
  | "places"
  | "gates"
  | "history"
  | "temples"
  | "faiths"
  | "clans"
  | "foreign_powers"
  | "horizons"
  | "hells"
  | "mythic_lands"
  | "elements"
  | "celestial"
  | "domains"
  | "topics";

export interface LorePresentationShelf {
  readonly id: LorePresentationShelfId;
  readonly label: string;
}

export type LoreAddOperationDescriptor =
  | {
      readonly operation: "add_lore_entry";
      readonly target: AddLoreEntryTarget;
    }
  | {
      readonly operation: "add_lore_entry";
      readonly targetForm: "new_campaign";
      readonly subject: LoreSubjectRef;
    };

export interface LoreReviseOperationDescriptor {
  readonly operation: "revise_lore_entry";
  readonly target: ReviseLoreEntryTarget;
}

export type LorePresentationEntry =
  | {
      readonly provenance: "printed";
      readonly provenanceLabel: typeof LORE_PROVENANCE_PRINTED;
      readonly sourceEntryId: string;
      readonly text: string;
      readonly revise: LoreReviseOperationDescriptor | null;
    }
  | {
      readonly provenance: "changed_in_play";
      readonly provenanceLabel: typeof LORE_PROVENANCE_CHANGED_IN_PLAY;
      readonly sourceEntryId: string;
      readonly text: string;
      readonly printedText: string;
      readonly revise: LoreReviseOperationDescriptor | null;
    }
  | {
      readonly provenance: "added_in_play";
      readonly provenanceLabel: typeof LORE_PROVENANCE_ADDED_IN_PLAY;
      readonly loreEntryId: LoreEntryId;
      readonly text: string;
      readonly revise: LoreReviseOperationDescriptor | null;
    };

export type LoreWriteAvailability =
  | {
      readonly writable: true;
      readonly add: LoreAddOperationDescriptor;
    }
  | {
      readonly writable: false;
      readonly reasonCode: "not_ready";
      readonly reason: typeof LORE_WRITE_UNAVAILABLE_NOT_READY;
    };

export type LorePresentationMarinerContextInfo = {
  readonly ownerSeatId: PactSeatId;
  readonly selection: MarinerIsleLoreContextSelection;
  readonly isPlaySelected: boolean;
};

export type LorePresentationContext =
  | {
      readonly kind: "source";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly contextLabel: string;
      readonly headingLabel: string;
      readonly attribution: SourceLoreAttribution;
      readonly readable: true;
      readonly entries: readonly LorePresentationEntry[];
      readonly write: LoreWriteAvailability;
      readonly mariner: LorePresentationMarinerContextInfo | null;
      readonly ordinaryAddPath: true;
    }
  | {
      readonly kind: "campaign";
      readonly collectionId: LoreCollectionId;
      readonly contextLabel: typeof LORE_CONTEXT_LABEL_CAMPAIGN;
      readonly headingLabel: string;
      readonly readable: true;
      readonly entries: readonly LorePresentationEntry[];
      readonly write: Extract<LoreWriteAvailability, { writable: true }>;
      readonly mariner: null;
      readonly ordinaryAddPath: boolean;
    };

export interface LorePresentationParallelCampaignCapability {
  readonly existing: boolean;
  readonly add: LoreAddOperationDescriptor;
}

export interface LorePresentationSubject {
  readonly presentationKey: string;
  readonly subject: LoreSubjectRef | null;
  readonly subjectLabel: string;
  readonly shelf: LorePresentationShelf;
  readonly contexts: readonly LorePresentationContext[];
  readonly hasEffectiveLore: boolean;
  readonly eligibleToReceiveLore: boolean;
  readonly compendiumPresence: "has_lore" | "empty_eligible";
  readonly ordinaryFirstAdd: LoreAddOperationDescriptor | null;
  readonly advancedParallelCampaignLore: LorePresentationParallelCampaignCapability | null;
}

export interface LorePresentationMarinerSeatSelection {
  readonly ownerSeatId: PactSeatId;
  readonly pactSeatStatus: PactSeatStatus | null;
  readonly selection: MarinerIsleLoreContextSelection;
  readonly binding: LoreBindingResolution | null;
}

export type LoreCompendiumReference =
  | {
      readonly ok: true;
      readonly subjects: readonly LorePresentationSubject[];
      readonly marinerIsleSelections: readonly LorePresentationMarinerSeatSelection[];
    }
  | {
      readonly ok: false;
      readonly reason: "unsupported_ruleset";
    };

const SHELF_LABELS: Record<LorePresentationShelfId, string> = {
  isles: "Isles",
  places: "Places",
  gates: "Gates",
  history: "History",
  temples: "Temples",
  faiths: "Faiths",
  clans: "Clans",
  foreign_powers: "Foreign Powers",
  horizons: "Distant Lands",
  hells: "Hells",
  mythic_lands: "Mythic Lands",
  elements: "Elements",
  celestial: "Celestial",
  domains: "Domains",
  topics: "Topics",
};

const SHELF_ORDER: readonly LorePresentationShelfId[] = [
  "isles",
  "places",
  "gates",
  "history",
  "temples",
  "faiths",
  "clans",
  "foreign_powers",
  "horizons",
  "hells",
  "mythic_lands",
  "elements",
  "celestial",
  "domains",
  "topics",
];

const PACT_SEAT_HOME_BOARD_ISLE: Record<PactSeatId, MarinerBoardIsleId> = {
  necromancer: "graven_isle",
  hierophant: "ishana",
  warlock: "halcyon_isles",
  mariner: "far_reach",
  faustian: "scuttleport",
  sage: "sage_atoll",
  sorcerer: "spyrholm",
};

interface SubjectAccumulator {
  presentationKey: string;
  subject: LoreSubjectRef | null;
  catalogOrder: number;
  sourceDefinitions: SourceLoreCollectionDefinition[];
  campaignCollection: CampaignLoreCollection | null;
}

/**
 * Derived Lore presentation for Compendium and contextual panels.
 * Never writes, repairs, rebinds, or falls forward to another ruleset catalog.
 */
export function readLoreCompendiumReference(state: CampaignStateV5): LoreCompendiumReference {
  const lookup = lookupSourceLoreCatalog(state.ruleset);
  if (!lookup.ok) {
    return { ok: false, reason: "unsupported_ruleset" };
  }

  const groups = new Map<string, SubjectAccumulator>();

  lookup.catalog.collections.forEach((definition, catalogOrder) => {
    const presentationKey = sourceContextGroupKey(state, definition);
    const existing = groups.get(presentationKey);
    if (existing === undefined) {
      groups.set(presentationKey, {
        presentationKey,
        subject: resolvedSubjectForSourceContext(state, definition),
        catalogOrder,
        sourceDefinitions: [definition],
        campaignCollection: null,
      });
      return;
    }
    existing.sourceDefinitions.push(definition);
    if (existing.subject === null) {
      existing.subject = resolvedSubjectForSourceContext(state, definition);
    }
  });

  for (const group of groups.values()) {
    if (group.subject !== null) {
      group.campaignCollection = campaignLoreCollectionForSubject(state, group.subject) ?? null;
    }
  }

  const representedRefKeys = new Set<string>();
  for (const group of groups.values()) {
    if (group.subject !== null) {
      representedRefKeys.add(loreSubjectKey(group.subject));
    }
  }

  const extraSubjects: LorePresentationSubject[] = [];
  const extraOrder: Array<{ presenceOrder: number; subject: LorePresentationSubject }> = [];
  let extraIndex = 0;

  const considerCampaignOnly = (subject: LoreSubjectRef, shelf: LorePresentationShelf, fallbackLabel: string): void => {
    const key = loreSubjectKey(subject);
    if (representedRefKeys.has(key)) {
      return;
    }
    representedRefKeys.add(key);
    const campaignCollection = campaignLoreCollectionForSubject(state, subject) ?? null;
    extraOrder.push({
      presenceOrder: extraIndex,
      subject: buildCampaignOnlySubject(state, subject, shelf, fallbackLabel, campaignCollection, `ref:${key}`),
    });
    extraIndex += 1;
  };

  for (const isle of state.world.isles) {
    considerCampaignOnly(
      { kind: "isle", isleId: isle.isleId },
      shelfById("isles"),
      isle.name,
    );
  }
  for (const place of state.world.places) {
    considerCampaignOnly(
      { kind: "place", placeId: place.placeId },
      shelfById("places"),
      place.name,
    );
  }
  for (const gate of state.necromancer.gates) {
    if (gate.origin !== "campaign") {
      continue;
    }
    considerCampaignOnly(
      { kind: "necromancer_gate", gateId: gate.gateId },
      shelfById("gates"),
      gate.name,
    );
  }
  for (const pactSeatId of PACT_SEAT_IDS) {
    considerCampaignOnly(
      { kind: "pact_domain", pactSeatId },
      shelfById("domains"),
      `${pactSeatDisplayName(pactSeatId)} Domain`,
    );
  }

  for (const collection of state.lore.campaignCollections) {
    const key = loreSubjectKey(collection.subject);
    if (representedRefKeys.has(key)) {
      continue;
    }
    representedRefKeys.add(key);
    extraOrder.push({
      presenceOrder: extraIndex,
      subject: buildCampaignOnlySubject(
        state,
        collection.subject,
        shelfForSubject(collection.subject),
        subjectLabelForRef(state, collection.subject, null),
        collection,
        `ref:${key}`,
      ),
    });
    extraIndex += 1;
  }

  extraSubjects.push(...extraOrder.sort((a, b) => a.presenceOrder - b.presenceOrder).map((item) => item.subject));

  const sourceSubjects = [...groups.values()]
    .sort((a, b) => a.catalogOrder - b.catalogOrder)
    .map((group) => buildSourceBackedSubject(state, group));

  const subjects = [...sourceSubjects, ...extraSubjects].sort((a, b) => {
    return SHELF_ORDER.indexOf(a.shelf.id) - SHELF_ORDER.indexOf(b.shelf.id);
  });

  return {
    ok: true,
    subjects,
    marinerIsleSelections: marinerIsleSelections(state),
  };
}

export function loreAddTargetFromDescriptor(
  descriptor: LoreAddOperationDescriptor,
  newCampaignCollectionId: LoreCollectionId,
): AddLoreEntryTarget {
  if ("targetForm" in descriptor) {
    return {
      kind: "campaign",
      collectionId: newCampaignCollectionId,
      subject: descriptor.subject,
    };
  }
  return descriptor.target;
}

function shelfById(id: LorePresentationShelfId): LorePresentationShelf {
  return { id, label: SHELF_LABELS[id] };
}

function domainIdFromSourceCollectionId(sourceCollectionId: string): PactSeatId | null {
  const prefix = sourceCollectionId.split(".")[0];
  return prefix !== undefined && isValidPactSeatId(prefix) ? prefix : null;
}

function humanAnchorLabel(anchor: string): string {
  return anchor
    .replace(/^(?:[IVXLCDM]+)\.\s+/u, "")
    .replace(/^Secrets of (?:the )?/u, "")
    .replace(/\s+(?:sits|is|docks)$/u, "")
    .trim();
}

function shelfForSourceDefinition(definition: SourceLoreCollectionDefinition): LorePresentationShelf {
  const id = definition.sourceCollectionId;
  if (id.includes(".home.") || id.includes(".delegated.") || id.includes(".isle.")) {
    return shelfById("isles");
  }
  if (id.includes(".sanctum.")) {
    return shelfById("places");
  }
  if (id.includes(".gate.")) {
    return shelfById("gates");
  }
  if (id.includes(".history.")) {
    return shelfById("history");
  }
  if (id.includes(".temple.")) {
    return shelfById("temples");
  }
  if (id.includes(".faith.")) {
    return shelfById("faiths");
  }
  if (id.includes(".clan.")) {
    return shelfById("clans");
  }
  if (id.includes(".foreign.")) {
    return shelfById("foreign_powers");
  }
  if (id.includes(".distant.")) {
    return shelfById("horizons");
  }
  if (id.includes(".hell.")) {
    return shelfById("hells");
  }
  if (id.includes(".mythic.")) {
    return shelfById("mythic_lands");
  }
  if (id.includes(".element.")) {
    return shelfById("elements");
  }
  if (id.includes(".celestial.")) {
    return shelfById("celestial");
  }
  return shelfForSubjectKind(definition.subjectKind);
}

function shelfForSubjectKind(kind: LoreSubjectRef["kind"]): LorePresentationShelf {
  switch (kind) {
    case "isle":
      return shelfById("isles");
    case "place":
      return shelfById("places");
    case "necromancer_gate":
      return shelfById("gates");
    case "hierophant_temple":
      return shelfById("temples");
    case "warlock_clan":
      return shelfById("clans");
    case "element":
      return shelfById("elements");
    case "pact_domain":
      return shelfById("domains");
    case "mariner_horizon":
      return shelfById("horizons");
    case "source_topic":
      return shelfById("topics");
  }
}

function shelfForSubject(subject: LoreSubjectRef): LorePresentationShelf {
  return shelfForSubjectKind(subject.kind);
}

function sourceContextLabel(definition: SourceLoreCollectionDefinition): string {
  if (definition.sourceCollectionId.startsWith("mariner.delegated.")) {
    return pactSeatDisplayName("mariner");
  }
  const domainId = domainIdFromSourceCollectionId(definition.sourceCollectionId);
  if (domainId !== null) {
    return pactSeatDisplayName(domainId);
  }
  return humanAnchorLabel(definition.attribution.anchor);
}

function intendedUnboundGroupKey(definition: SourceLoreCollectionDefinition): string {
  const binding = definition.binding;
  switch (binding.strategy) {
    case "wizard_home_isle":
      return `isle:${PACT_SEAT_HOME_BOARD_ISLE[binding.pactSeatId]}`;
    case "sorcerer_spyrholm_isle":
      return "isle:spyrholm";
    case "mariner_board_isle":
      return `isle:${binding.boardIsleId}`;
    case "wizard_sanctum_place":
      return `place:${binding.pactSeatId}_sanctum`;
    case "sorcerer_tower_place":
      return "place:sorcerer_tower";
    case "mariner_ship_place":
      return "place:mariner_ship";
    case "necromancer_builtin_gate":
      return `necromancer_gate:${binding.gateId}`;
    case "hierophant_starting_temple":
      return `hierophant_temple:${binding.templeId}`;
    case "warlock_clan":
      return `warlock_clan:${binding.clanId}`;
    case "element":
      return `element:${binding.elementId}`;
    case "mariner_horizon":
      return `mariner_horizon:${binding.cardinalGroupId}`;
    case "source_topic":
      return `source_topic:${binding.topicId}`;
  }
}

function resolvedSubjectForSourceContext(
  state: CampaignStateV5,
  definition: SourceLoreCollectionDefinition,
): LoreSubjectRef | null {
  const instance = instantiatedSourceLoreCollection(state, definition.sourceCollectionId);
  if (instance !== undefined) {
    return instance.boundSubject;
  }
  const binding = resolveSourceLoreBinding(state, definition.sourceCollectionId);
  return binding.ok ? binding.subject : null;
}

function writableSubjectForSourceContext(
  state: CampaignStateV5,
  definition: SourceLoreCollectionDefinition,
): LoreSubjectRef | null {
  return resolvedSubjectForSourceContext(state, definition);
}

function sourceContextGroupKey(state: CampaignStateV5, definition: SourceLoreCollectionDefinition): string {
  const subject = resolvedSubjectForSourceContext(state, definition);
  if (subject !== null) {
    return `ref:${loreSubjectKey(subject)}`;
  }
  return `unbound:${intendedUnboundGroupKey(definition)}`;
}

function boardIsleDisplayName(boardIsleId: MarinerBoardIsleId): string {
  return MARINER_BOARD_ISLE_DEFINITIONS.find((definition) => definition.boardIsleId === boardIsleId)?.displayName
    ?? boardIsleId;
}

function subjectLabelForRef(
  state: CampaignStateV5,
  subject: LoreSubjectRef,
  sourceDefinition: SourceLoreCollectionDefinition | null,
): string {
  switch (subject.kind) {
    case "isle": {
      const isle = state.world.isles.find((entry) => entry.isleId === subject.isleId);
      if (isle !== undefined && isle.name.trim() !== "") {
        return isle.name;
      }
      break;
    }
    case "place": {
      const place = state.world.places.find((entry) => entry.placeId === subject.placeId);
      if (place !== undefined && place.name.trim() !== "") {
        return place.name;
      }
      break;
    }
    case "necromancer_gate": {
      if (isValidNecromancerCampaignGateId(subject.gateId)) {
        const gate = state.necromancer.gates.find((entry) => entry.gateId === subject.gateId);
        if (gate !== undefined && gate.origin === "campaign" && gate.name.trim() !== "") {
          return gate.name;
        }
      } else if (isValidNecromancerBuiltinGateId(subject.gateId)) {
        if (sourceDefinition !== null) {
          return humanAnchorLabel(sourceDefinition.attribution.anchor);
        }
        const builtin = necromancerBuiltinGateDefinition(subject.gateId);
        return builtin.gateId === "terminus" ? builtin.displayName : `The ${builtin.displayName} Gate`;
      }
      break;
    }
    case "hierophant_temple": {
      if (isValidHierophantStartingTempleId(subject.templeId)) {
        return hierophantStartingTempleDisplayName(subject.templeId);
      }
      const temple = state.hierophant.temples.find((entry) => entry.templeId === subject.templeId);
      if (temple !== undefined) {
        const place = state.world.places.find((entry) => entry.placeId === temple.placeId);
        if (place !== undefined && place.name.trim() !== "") {
          return place.name;
        }
      }
      return "Temple";
    }
    case "warlock_clan": {
      const clan = WARLOCK_CLAN_DEFINITIONS.find((entry) => entry.clanId === subject.clanId);
      if (clan !== undefined) {
        return sourceDefinition !== null ? humanAnchorLabel(sourceDefinition.attribution.anchor) : clan.name;
      }
      break;
    }
    case "element":
      return elementLabel(subject.elementId, sourceDefinition);
    case "pact_domain":
      return `${pactSeatDisplayName(subject.pactSeatId)} Domain`;
    case "mariner_horizon":
      if (sourceDefinition !== null) {
        return humanAnchorLabel(sourceDefinition.attribution.anchor);
      }
      break;
    case "source_topic":
      if (sourceDefinition !== null) {
        return humanAnchorLabel(sourceDefinition.attribution.anchor);
      }
      break;
  }
  if (sourceDefinition !== null) {
    return humanAnchorLabel(sourceDefinition.attribution.anchor);
  }
  return fallbackSubjectKindLabel(subject.kind);
}

function elementLabel(elementId: ElementId, sourceDefinition: SourceLoreCollectionDefinition | null): string {
  if (sourceDefinition !== null) {
    return humanAnchorLabel(sourceDefinition.attribution.anchor);
  }
  switch (elementId) {
    case "air":
      return "Air";
    case "fire":
      return "Fire";
    case "earth":
      return "Earth";
    case "water":
      return "Water";
  }
}

function fallbackSubjectKindLabel(kind: LoreSubjectRef["kind"]): string {
  switch (kind) {
    case "isle":
      return "Isle";
    case "place":
      return "Place";
    case "necromancer_gate":
      return "Gate";
    case "hierophant_temple":
      return "Temple";
    case "warlock_clan":
      return "Clan";
    case "element":
      return "Element";
    case "pact_domain":
      return "Domain";
    case "mariner_horizon":
      return "Distant Lands";
    case "source_topic":
      return "Lore";
  }
}

function unboundSubjectLabel(definition: SourceLoreCollectionDefinition): string {
  const binding = definition.binding;
  if (binding.strategy === "mariner_board_isle") {
    return boardIsleDisplayName(binding.boardIsleId);
  }
  if (binding.strategy === "wizard_home_isle") {
    return boardIsleDisplayName(PACT_SEAT_HOME_BOARD_ISLE[binding.pactSeatId]);
  }
  if (binding.strategy === "sorcerer_spyrholm_isle") {
    return boardIsleDisplayName("spyrholm");
  }
  return humanAnchorLabel(definition.attribution.anchor);
}

function marinerInfoForCollection(
  state: CampaignStateV5,
  sourceCollectionId: SourceLoreCollectionId,
): LorePresentationMarinerContextInfo | null {
  if (sourceCollectionId === MARINER_FAR_REACH_SOURCE_COLLECTION_ID) {
    const selection = selectMarinerIsleLoreContext("mariner", state.pactSeats.mariner.status);
    return {
      ownerSeatId: "mariner",
      selection,
      isPlaySelected: selection.kind === "owner_only",
    };
  }
  for (const ownerSeatId of MARINER_DELEGATED_ISLE_OWNER_SEATS) {
    const mapping = MARINER_ISLE_LORE_DELEGATION[ownerSeatId];
    if (
      sourceCollectionId !== mapping.ownerCollectionId
      && sourceCollectionId !== mapping.delegatedCollectionId
    ) {
      continue;
    }
    const selection = selectMarinerIsleLoreContext(ownerSeatId, state.pactSeats[ownerSeatId].status);
    const isPlaySelected =
      selection.kind === "selected" && selection.sourceCollectionId === sourceCollectionId;
    return { ownerSeatId, selection, isPlaySelected };
  }
  return null;
}

function marinerIsleSelections(state: CampaignStateV5): readonly LorePresentationMarinerSeatSelection[] {
  const seats: PactSeatId[] = ["mariner", ...MARINER_DELEGATED_ISLE_OWNER_SEATS];
  return seats.map((ownerSeatId) => {
    const availability = selectedMarinerIsleLoreAvailability(state, ownerSeatId);
    return {
      ownerSeatId,
      pactSeatStatus: state.pactSeats[ownerSeatId].status,
      selection: availability.selection,
      binding: availability.binding,
    };
  });
}

function sourceWriteAvailability(
  sourceCollectionId: SourceLoreCollectionId,
  expectedSubject: LoreSubjectRef | null,
): LoreWriteAvailability {
  if (expectedSubject === null) {
    return {
      writable: false,
      reasonCode: "not_ready",
      reason: LORE_WRITE_UNAVAILABLE_NOT_READY,
    };
  }
  return {
    writable: true,
    add: {
      operation: "add_lore_entry",
      target: {
        kind: "source",
        sourceCollectionId,
        expectedSubject,
      },
    },
  };
}

function presentSourceEntries(
  definition: SourceLoreCollectionDefinition,
  instance: InstantiatedSourceLoreCollection | null,
  expectedSubject: LoreSubjectRef | null,
): readonly LorePresentationEntry[] {
  const baselineById = new Map(definition.entries.map((entry) => [entry.sourceEntryId, entry.text]));
  return composeEffectiveSourceLore(definition, instance).map((entry) => {
    if (entry.origin === "source") {
      const revise: LoreReviseOperationDescriptor | null =
        expectedSubject === null
          ? null
          : {
              operation: "revise_lore_entry",
              target: {
                kind: "source_entry",
                sourceCollectionId: definition.sourceCollectionId,
                sourceEntryId: entry.sourceEntryId,
                expectedSubject,
              },
            };
      if (entry.overridden) {
        return {
          provenance: "changed_in_play",
          provenanceLabel: LORE_PROVENANCE_CHANGED_IN_PLAY,
          sourceEntryId: entry.sourceEntryId,
          text: entry.text,
          printedText: baselineById.get(entry.sourceEntryId) ?? entry.text,
          revise,
        };
      }
      return {
        provenance: "printed",
        provenanceLabel: LORE_PROVENANCE_PRINTED,
        sourceEntryId: entry.sourceEntryId,
        text: entry.text,
        revise,
      };
    }
    return {
      provenance: "added_in_play",
      provenanceLabel: LORE_PROVENANCE_ADDED_IN_PLAY,
      loreEntryId: entry.loreEntryId,
      text: entry.text,
      revise:
        expectedSubject === null
          ? null
          : {
              operation: "revise_lore_entry",
              target: {
                kind: "source_addition",
                sourceCollectionId: definition.sourceCollectionId,
                loreEntryId: entry.loreEntryId,
                expectedSubject,
              },
            },
    };
  });
}

function presentCampaignEntries(
  collection: CampaignLoreCollection,
): readonly LorePresentationEntry[] {
  return collection.entries.map((entry) => ({
    provenance: "added_in_play" as const,
    provenanceLabel: LORE_PROVENANCE_ADDED_IN_PLAY,
    loreEntryId: entry.loreEntryId,
    text: entry.text,
    revise: {
      operation: "revise_lore_entry" as const,
      target: {
        kind: "campaign_entry" as const,
        collectionId: collection.collectionId,
        loreEntryId: entry.loreEntryId,
      },
    },
  }));
}

function headingLabel(subjectLabel: string, contextLabel: string): string {
  return `${subjectLabel} — ${contextLabel}`;
}

function buildSourceContext(
  state: CampaignStateV5,
  definition: SourceLoreCollectionDefinition,
  subjectLabel: string,
): Extract<LorePresentationContext, { kind: "source" }> {
  const instance = instantiatedSourceLoreCollection(state, definition.sourceCollectionId) ?? null;
  const expectedSubject = writableSubjectForSourceContext(state, definition);
  const contextLabel = sourceContextLabel(definition);
  return {
    kind: "source",
    sourceCollectionId: definition.sourceCollectionId,
    contextLabel,
    headingLabel: headingLabel(subjectLabel, contextLabel),
    attribution: definition.attribution,
    readable: true,
    entries: presentSourceEntries(definition, instance, expectedSubject),
    write: sourceWriteAvailability(definition.sourceCollectionId, expectedSubject),
    mariner: marinerInfoForCollection(state, definition.sourceCollectionId),
    ordinaryAddPath: true,
  };
}

function buildCampaignContext(
  collection: CampaignLoreCollection,
  subjectLabel: string,
  ordinaryAddPath: boolean,
): Extract<LorePresentationContext, { kind: "campaign" }> {
  return {
    kind: "campaign",
    collectionId: collection.collectionId,
    contextLabel: LORE_CONTEXT_LABEL_CAMPAIGN,
    headingLabel: headingLabel(subjectLabel, LORE_CONTEXT_LABEL_CAMPAIGN),
    readable: true,
    entries: presentCampaignEntries(collection),
    write: {
      writable: true,
      add: {
        operation: "add_lore_entry",
        target: {
          kind: "campaign",
          collectionId: collection.collectionId,
          subject: collection.subject,
        },
      },
    },
    mariner: null,
    ordinaryAddPath,
  };
}

function newCampaignAdd(subject: LoreSubjectRef): LoreAddOperationDescriptor {
  return {
    operation: "add_lore_entry",
    targetForm: "new_campaign",
    subject,
  };
}

function presenceFrom(hasEffectiveLore: boolean): "has_lore" | "empty_eligible" {
  return hasEffectiveLore ? "has_lore" : "empty_eligible";
}

function buildSourceBackedSubject(state: CampaignStateV5, group: SubjectAccumulator): LorePresentationSubject {
  const representative = group.sourceDefinitions[0];
  const subjectLabel =
    group.subject !== null
      ? subjectLabelForRef(state, group.subject, representative ?? null)
      : unboundSubjectLabel(representative!);
  const sourceContexts = group.sourceDefinitions.map((definition) =>
    buildSourceContext(state, definition, subjectLabel),
  );
  const campaignOrdinary = false;
  const campaignContext =
    group.campaignCollection === null
      ? []
      : [buildCampaignContext(group.campaignCollection, subjectLabel, campaignOrdinary)];
  const contexts = [...sourceContexts, ...campaignContext];
  const hasEffectiveLore = contexts.some((context) => context.entries.length > 0);
  const anyWritableSource = sourceContexts.some((context) => context.write.writable);
  const eligibleToReceiveLore =
    anyWritableSource
    || (group.subject !== null && (group.campaignCollection !== null || sourceContexts.length > 0));
  const advancedParallelCampaignLore =
    group.subject === null
      ? null
      : group.campaignCollection !== null
        ? {
            existing: true,
            add: {
              operation: "add_lore_entry" as const,
              target: {
                kind: "campaign" as const,
                collectionId: group.campaignCollection.collectionId,
                subject: group.subject,
              },
            },
          }
        : {
            existing: false,
            add: newCampaignAdd(group.subject),
          };

  return {
    presentationKey: group.presentationKey,
    subject: group.subject,
    subjectLabel,
    shelf: representative !== undefined ? shelfForSourceDefinition(representative) : shelfById("topics"),
    contexts,
    hasEffectiveLore,
    eligibleToReceiveLore,
    compendiumPresence: presenceFrom(hasEffectiveLore),
    ordinaryFirstAdd: null,
    advancedParallelCampaignLore,
  };
}

function buildCampaignOnlySubject(
  state: CampaignStateV5,
  subject: LoreSubjectRef,
  shelf: LorePresentationShelf,
  fallbackLabel: string,
  campaignCollection: CampaignLoreCollection | null,
  presentationKey: string,
): LorePresentationSubject {
  const subjectLabel =
    fallbackLabel.trim() !== "" ? fallbackLabel : subjectLabelForRef(state, subject, null);
  const contexts =
    campaignCollection === null ? [] : [buildCampaignContext(campaignCollection, subjectLabel, true)];
  const hasEffectiveLore = contexts.some((context) => context.entries.length > 0);
  const ordinaryFirstAdd =
    campaignCollection === null
      ? newCampaignAdd(subject)
      : {
          operation: "add_lore_entry" as const,
          target: {
            kind: "campaign" as const,
            collectionId: campaignCollection.collectionId,
            subject,
          },
        };
  return {
    presentationKey,
    subject,
    subjectLabel,
    shelf,
    contexts,
    hasEffectiveLore,
    eligibleToReceiveLore: true,
    compendiumPresence: presenceFrom(hasEffectiveLore),
    ordinaryFirstAdd,
    advancedParallelCampaignLore: null,
  };
}
