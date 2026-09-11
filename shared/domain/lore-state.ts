import type { CampaignStateV5, PactSeatStatus } from "./campaign-state";
import type { IsleId, PlaceId, LoreCollectionId, LoreEntryId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type { ElementId } from "./shared-world";
import type { NecromancerGateId } from "./necromancer-catalogs";
import type { HierophantTempleId } from "./hierophant-catalogs";
import type { WarlockClanId } from "./warlock-catalogs";
import type { MarinerHorizonCardinalGroupId } from "./mariner-catalogs";
import type { RulesetRef } from "./ruleset";
import { DomainError } from "./errors";
import {
  lookupSourceLoreCatalog,
  sourceLoreCollectionDefinition,
  type LoreSubjectKind,
  type SourceLoreBindingDescriptor,
  type SourceLoreCatalog,
  type SourceLoreCollectionDefinition,
  type SourceLoreCollectionId,
  type SourceLoreEntryId,
  type SourceLoreTopicId,
} from "./lore-catalog";

export type LoreSubjectRef =
  | { readonly kind: "isle"; readonly isleId: IsleId }
  | { readonly kind: "place"; readonly placeId: PlaceId }
  | { readonly kind: "necromancer_gate"; readonly gateId: NecromancerGateId }
  | { readonly kind: "hierophant_temple"; readonly templeId: HierophantTempleId }
  | { readonly kind: "warlock_clan"; readonly clanId: WarlockClanId }
  | { readonly kind: "element"; readonly elementId: ElementId }
  | { readonly kind: "pact_domain"; readonly pactSeatId: PactSeatId }
  | { readonly kind: "mariner_horizon"; readonly cardinalGroupId: MarinerHorizonCardinalGroupId }
  | { readonly kind: "source_topic"; readonly topicId: SourceLoreTopicId };

export interface SourceLoreEntryOverride {
  readonly sourceEntryId: SourceLoreEntryId;
  readonly currentText: string;
}

export interface CampaignAuthoredLoreEntry {
  readonly loreEntryId: LoreEntryId;
  readonly text: string;
}

export interface InstantiatedSourceLoreCollection {
  readonly sourceCollectionId: SourceLoreCollectionId;
  readonly boundSubject: LoreSubjectRef;
  readonly overrides: readonly SourceLoreEntryOverride[];
  readonly additions: readonly CampaignAuthoredLoreEntry[];
}

export interface CampaignLoreCollection {
  readonly collectionId: LoreCollectionId;
  readonly subject: LoreSubjectRef;
  readonly entries: readonly CampaignAuthoredLoreEntry[];
}

export interface LoreState {
  readonly sourceCollections: readonly InstantiatedSourceLoreCollection[];
  readonly campaignCollections: readonly CampaignLoreCollection[];
}

export const EMPTY_LORE_STATE: LoreState = {
  sourceCollections: [],
  campaignCollections: [],
};

export type EffectiveLoreEntry =
  | {
      readonly origin: "source";
      readonly sourceEntryId: SourceLoreEntryId;
      readonly text: string;
      readonly overridden: boolean;
    }
  | {
      readonly origin: "campaign_authored";
      readonly loreEntryId: LoreEntryId;
      readonly text: string;
    };

export type LoreBindingResolution =
  | { readonly ok: true; readonly subject: LoreSubjectRef }
  | {
      readonly ok: false;
      readonly reason: "unsupported_ruleset" | "unknown_collection" | "not_ready";
    };

export type MarinerIsleLoreContextSelection =
  | {
      readonly kind: "selected";
      readonly role: "owner" | "mariner_delegated";
      readonly sourceCollectionId: SourceLoreCollectionId;
    }
  | { readonly kind: "owner_only"; readonly sourceCollectionId: SourceLoreCollectionId }
  | { readonly kind: "no_status_decision" };

export const MARINER_DELEGATED_ISLE_OWNER_SEATS = [
  "necromancer",
  "hierophant",
  "warlock",
  "faustian",
  "sage",
  "sorcerer",
] as const;

export type MarinerDelegatedIsleOwnerSeatId = (typeof MARINER_DELEGATED_ISLE_OWNER_SEATS)[number];

export const MARINER_ISLE_LORE_DELEGATION: {
  readonly [K in MarinerDelegatedIsleOwnerSeatId]: {
    readonly ownerCollectionId: SourceLoreCollectionId;
    readonly delegatedCollectionId: SourceLoreCollectionId;
  };
} = {
  necromancer: {
    ownerCollectionId: "necromancer.home.graven_isle",
    delegatedCollectionId: "mariner.delegated.graven_isle",
  },
  hierophant: {
    ownerCollectionId: "hierophant.home.ishana",
    delegatedCollectionId: "mariner.delegated.ishana",
  },
  warlock: {
    ownerCollectionId: "warlock.home.halcyon_isles",
    delegatedCollectionId: "mariner.delegated.halcyon_isles",
  },
  faustian: {
    ownerCollectionId: "faustian.home.scuttleport",
    delegatedCollectionId: "mariner.delegated.scuttleport",
  },
  sage: {
    ownerCollectionId: "sage.home.moonlit_atoll",
    delegatedCollectionId: "mariner.delegated.sage_atoll",
  },
  sorcerer: {
    ownerCollectionId: "sorcerer.home.spyrholm",
    delegatedCollectionId: "mariner.delegated.spyrholm",
  },
};

export const MARINER_FAR_REACH_SOURCE_COLLECTION_ID: SourceLoreCollectionId = "mariner.home.far_reach";

export function loreSubjectKey(subject: LoreSubjectRef): string {
  switch (subject.kind) {
    case "isle":
      return `isle:${subject.isleId}`;
    case "place":
      return `place:${subject.placeId}`;
    case "necromancer_gate":
      return `necromancer_gate:${subject.gateId}`;
    case "hierophant_temple":
      return `hierophant_temple:${subject.templeId}`;
    case "warlock_clan":
      return `warlock_clan:${subject.clanId}`;
    case "element":
      return `element:${subject.elementId}`;
    case "pact_domain":
      return `pact_domain:${subject.pactSeatId}`;
    case "mariner_horizon":
      return `mariner_horizon:${subject.cardinalGroupId}`;
    case "source_topic":
      return `source_topic:${subject.topicId}`;
  }
}

export function loreSubjectRefsEqual(a: LoreSubjectRef, b: LoreSubjectRef): boolean {
  return loreSubjectKey(a) === loreSubjectKey(b);
}

export function instantiatedSourceLoreCollection(
  state: CampaignStateV5,
  sourceCollectionId: SourceLoreCollectionId,
): InstantiatedSourceLoreCollection | undefined {
  return state.lore.sourceCollections.find((collection) => collection.sourceCollectionId === sourceCollectionId);
}

export function campaignLoreCollectionForSubject(
  state: CampaignStateV5,
  subject: LoreSubjectRef,
): CampaignLoreCollection | undefined {
  const key = loreSubjectKey(subject);
  return state.lore.campaignCollections.find((collection) => loreSubjectKey(collection.subject) === key);
}

export function composeEffectiveSourceLore(
  definition: SourceLoreCollectionDefinition,
  instance: InstantiatedSourceLoreCollection | null,
): readonly EffectiveLoreEntry[] {
  const overridesByEntryId = new Map<string, string>();
  if (instance !== null) {
    for (const override of instance.overrides) {
      if (overridesByEntryId.has(override.sourceEntryId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `Duplicate source Lore override for ${definition.sourceCollectionId}:${override.sourceEntryId}`,
        );
      }
      overridesByEntryId.set(override.sourceEntryId, override.currentText);
    }
  }

  const baselineIds = new Set(definition.entries.map((entry) => entry.sourceEntryId));
  for (const sourceEntryId of overridesByEntryId.keys()) {
    if (!baselineIds.has(sourceEntryId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Source Lore override references unknown source entry ${definition.sourceCollectionId}:${sourceEntryId}`,
      );
    }
  }

  const effective: EffectiveLoreEntry[] = definition.entries.map((entry) => {
    const overriddenText = overridesByEntryId.get(entry.sourceEntryId);
    if (overriddenText === undefined) {
      return {
        origin: "source",
        sourceEntryId: entry.sourceEntryId,
        text: entry.text,
        overridden: false,
      };
    }
    return {
      origin: "source",
      sourceEntryId: entry.sourceEntryId,
      text: overriddenText,
      overridden: true,
    };
  });

  if (instance !== null) {
    for (const addition of instance.additions) {
      effective.push({
        origin: "campaign_authored",
        loreEntryId: addition.loreEntryId,
        text: addition.text,
      });
    }
  }

  return effective;
}

export type EffectiveSourceLoreRead =
  | {
      readonly ok: true;
      readonly definition: SourceLoreCollectionDefinition;
      readonly boundSubject: LoreSubjectRef | null;
      readonly entries: readonly EffectiveLoreEntry[];
      readonly instantiated: boolean;
    }
  | { readonly ok: false; readonly reason: "unsupported_ruleset" | "unknown_collection" };

/**
 * Pure effective-Lore read. Never creates, repairs, or rebinds state.
 * Uninstantiated collections return the static baseline preview.
 */
export function readEffectiveSourceLore(
  state: CampaignStateV5,
  sourceCollectionId: string,
): EffectiveSourceLoreRead {
  return readEffectiveSourceLoreForRuleset(state.ruleset, state.lore, sourceCollectionId);
}

export function readEffectiveSourceLoreForRuleset(
  ruleset: RulesetRef,
  lore: LoreState,
  sourceCollectionId: string,
): EffectiveSourceLoreRead {
  const lookup = lookupSourceLoreCatalog(ruleset);
  if (!lookup.ok) {
    return { ok: false, reason: "unsupported_ruleset" };
  }
  const definition = sourceLoreCollectionDefinition(lookup.catalog, sourceCollectionId);
  if (definition === undefined) {
    return { ok: false, reason: "unknown_collection" };
  }
  const instance = lore.sourceCollections.find(
    (collection) => collection.sourceCollectionId === definition.sourceCollectionId,
  );
  return {
    ok: true,
    definition,
    boundSubject: instance?.boundSubject ?? null,
    entries: composeEffectiveSourceLore(definition, instance ?? null),
    instantiated: instance !== undefined,
  };
}

export function readCampaignLoreCollectionEntries(
  collection: CampaignLoreCollection,
): readonly EffectiveLoreEntry[] {
  return collection.entries.map((entry) => ({
    origin: "campaign_authored",
    loreEntryId: entry.loreEntryId,
    text: entry.text,
  }));
}

function wizardForPactSeat(state: CampaignStateV5, seatId: PactSeatId) {
  const wizardId = state.pactSeats[seatId].wizardId;
  if (wizardId === null) {
    return null;
  }
  return state.wizards.find((wizard) => wizard.wizardId === wizardId) ?? null;
}

function resolveBindingDescriptor(
  state: CampaignStateV5,
  binding: SourceLoreBindingDescriptor,
): LoreBindingResolution {
  switch (binding.strategy) {
    case "wizard_home_isle": {
      const wizard = wizardForPactSeat(state, binding.pactSeatId);
      if (wizard === null || wizard.homeIsleId === null) {
        return { ok: false, reason: "not_ready" };
      }
      return { ok: true, subject: { kind: "isle", isleId: wizard.homeIsleId } };
    }
    case "wizard_sanctum_place": {
      const wizard = wizardForPactSeat(state, binding.pactSeatId);
      if (wizard === null || wizard.sanctumPlaceId === null) {
        return { ok: false, reason: "not_ready" };
      }
      return { ok: true, subject: { kind: "place", placeId: wizard.sanctumPlaceId } };
    }
    case "sorcerer_spyrholm_isle": {
      if (state.sorcerer.spyrholmIsleId === null) {
        return { ok: false, reason: "not_ready" };
      }
      return { ok: true, subject: { kind: "isle", isleId: state.sorcerer.spyrholmIsleId } };
    }
    case "sorcerer_tower_place": {
      if (state.sorcerer.towerPlaceId === null) {
        return { ok: false, reason: "not_ready" };
      }
      return { ok: true, subject: { kind: "place", placeId: state.sorcerer.towerPlaceId } };
    }
    case "mariner_board_isle": {
      const boardIsle = state.mariner.boardIsles.find((isle) => isle.boardIsleId === binding.boardIsleId);
      if (boardIsle === undefined) {
        return { ok: false, reason: "not_ready" };
      }
      return { ok: true, subject: { kind: "isle", isleId: boardIsle.worldIsleId } };
    }
    case "mariner_ship_place": {
      if (state.mariner.shipPlaceId === null) {
        return { ok: false, reason: "not_ready" };
      }
      return { ok: true, subject: { kind: "place", placeId: state.mariner.shipPlaceId } };
    }
    case "necromancer_builtin_gate":
      return { ok: true, subject: { kind: "necromancer_gate", gateId: binding.gateId } };
    case "hierophant_starting_temple":
      return { ok: true, subject: { kind: "hierophant_temple", templeId: binding.templeId } };
    case "warlock_clan":
      return { ok: true, subject: { kind: "warlock_clan", clanId: binding.clanId } };
    case "element":
      return { ok: true, subject: { kind: "element", elementId: binding.elementId } };
    case "mariner_horizon":
      return { ok: true, subject: { kind: "mariner_horizon", cardinalGroupId: binding.cardinalGroupId } };
    case "source_topic":
      return { ok: true, subject: { kind: "source_topic", topicId: binding.topicId } };
  }
}

/**
 * Pure first-use binding availability check. Does not write or repair state.
 */
export function resolveSourceLoreBinding(
  state: CampaignStateV5,
  sourceCollectionId: string,
): LoreBindingResolution {
  const lookup = lookupSourceLoreCatalog(state.ruleset);
  if (!lookup.ok) {
    return { ok: false, reason: "unsupported_ruleset" };
  }
  const definition = sourceLoreCollectionDefinition(lookup.catalog, sourceCollectionId);
  if (definition === undefined) {
    return { ok: false, reason: "unknown_collection" };
  }
  return resolveBindingDescriptor(state, definition.binding);
}

function isMarinerDelegatedIsleOwnerSeatId(value: PactSeatId): value is MarinerDelegatedIsleOwnerSeatId {
  return (MARINER_DELEGATED_ISLE_OWNER_SEATS as readonly string[]).includes(value);
}

/**
 * APPLICATION DESIGN: derive Mariner Isle Lore context from actual Pact-seat
 * status only. Silent is not treated as Absent. Null is not a missing Wizard
 * or uninitialized Domain. Selection never falls back to the other collection.
 */
export function selectMarinerIsleLoreContext(
  ownerSeatId: PactSeatId,
  pactSeatStatus: PactSeatStatus | null,
): MarinerIsleLoreContextSelection {
  if (ownerSeatId === "mariner") {
    return {
      kind: "owner_only",
      sourceCollectionId: MARINER_FAR_REACH_SOURCE_COLLECTION_ID,
    };
  }
  if (!isMarinerDelegatedIsleOwnerSeatId(ownerSeatId)) {
    return { kind: "no_status_decision" };
  }
  if (pactSeatStatus === null) {
    return { kind: "no_status_decision" };
  }
  const mapping = MARINER_ISLE_LORE_DELEGATION[ownerSeatId];
  if (pactSeatStatus === "absent") {
    return {
      kind: "selected",
      role: "mariner_delegated",
      sourceCollectionId: mapping.delegatedCollectionId,
    };
  }
  return {
    kind: "selected",
    role: "owner",
    sourceCollectionId: mapping.ownerCollectionId,
  };
}

export function selectedMarinerIsleLoreAvailability(
  state: CampaignStateV5,
  ownerSeatId: PactSeatId,
): {
  readonly selection: MarinerIsleLoreContextSelection;
  readonly binding: LoreBindingResolution | null;
} {
  const selection = selectMarinerIsleLoreContext(ownerSeatId, state.pactSeats[ownerSeatId].status);
  if (selection.kind === "no_status_decision") {
    return { selection, binding: null };
  }
  return {
    selection,
    binding: resolveSourceLoreBinding(state, selection.sourceCollectionId),
  };
}

export function catalogForCampaignRuleset(state: CampaignStateV5): SourceLoreCatalog | null {
  const lookup = lookupSourceLoreCatalog(state.ruleset);
  return lookup.ok ? lookup.catalog : null;
}

export function expectedSubjectKindForBinding(binding: SourceLoreBindingDescriptor): LoreSubjectKind {
  switch (binding.strategy) {
    case "wizard_home_isle":
    case "sorcerer_spyrholm_isle":
    case "mariner_board_isle":
      return "isle";
    case "wizard_sanctum_place":
    case "sorcerer_tower_place":
    case "mariner_ship_place":
      return "place";
    case "necromancer_builtin_gate":
      return "necromancer_gate";
    case "hierophant_starting_temple":
      return "hierophant_temple";
    case "warlock_clan":
      return "warlock_clan";
    case "element":
      return "element";
    case "mariner_horizon":
      return "mariner_horizon";
    case "source_topic":
      return "source_topic";
  }
}
