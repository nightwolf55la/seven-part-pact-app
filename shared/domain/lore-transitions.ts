import type { CampaignStateV5 } from "./campaign-state";
import type { LoreCollectionId, LoreEntryId } from "./ids";
import { isValidLoreCollectionId, isValidLoreEntryId } from "./ids";
import { DomainError } from "./errors";
import type {
  LoreEntryAddedEventV1,
  LoreEntryRevisedEventV1,
  LoreEvent,
} from "./events";
import {
  lookupSourceLoreCatalog,
  sourceLoreCollectionDefinition,
  type SourceLoreCollectionId,
  type SourceLoreEntryId,
} from "./lore-catalog";
import {
  campaignLoreCollectionForSubject,
  instantiatedSourceLoreCollection,
  loreSubjectKey,
  loreSubjectRefsEqual,
  resolveSourceLoreBinding,
  type CampaignAuthoredLoreEntry,
  type InstantiatedSourceLoreCollection,
  type LoreState,
  type LoreSubjectRef,
  type SourceLoreEntryOverride,
} from "./lore-state";
import { assertValidStoredLoreText, validateLoreSubjectRef } from "./lore-validation";

export type AddLoreEntryTarget =
  | {
      readonly kind: "source";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly expectedSubject: LoreSubjectRef;
    }
  | {
      readonly kind: "campaign";
      readonly collectionId: LoreCollectionId;
      readonly subject: LoreSubjectRef;
    };

export interface AddLoreEntryInput {
  readonly target: AddLoreEntryTarget;
  readonly loreEntryId: LoreEntryId;
  readonly text: string;
}

export type ReviseLoreEntryTarget =
  | {
      readonly kind: "source_entry";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly sourceEntryId: SourceLoreEntryId;
      readonly expectedSubject: LoreSubjectRef;
    }
  | {
      readonly kind: "source_addition";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly loreEntryId: LoreEntryId;
      readonly expectedSubject: LoreSubjectRef;
    }
  | {
      readonly kind: "campaign_entry";
      readonly collectionId: LoreCollectionId;
      readonly loreEntryId: LoreEntryId;
    };

export interface ReviseLoreEntryInput {
  readonly target: ReviseLoreEntryTarget;
  readonly expectedText: string;
  readonly text: string;
}

export interface LoreTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly LoreEvent[];
}

function replaceLore(state: CampaignStateV5, lore: LoreState): CampaignStateV5 {
  return { ...state, lore };
}

function authoredLoreEntryIds(lore: LoreState): Set<string> {
  const ids = new Set<string>();
  for (const collection of lore.sourceCollections) {
    for (const entry of collection.additions) {
      ids.add(entry.loreEntryId);
    }
  }
  for (const collection of lore.campaignCollections) {
    for (const entry of collection.entries) {
      ids.add(entry.loreEntryId);
    }
  }
  return ids;
}

function requireLoreEntryId(loreEntryId: string, lore: LoreState): LoreEntryId {
  if (!isValidLoreEntryId(loreEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `loreEntryId is malformed: ${loreEntryId}`);
  }
  if (authoredLoreEntryIds(lore).has(loreEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate loreEntryId: ${loreEntryId}`);
  }
  return loreEntryId;
}

function requireExpectedSubject(current: LoreSubjectRef, expected: LoreSubjectRef): void {
  if (!loreSubjectRefsEqual(current, expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Lore subject: expected "${loreSubjectKey(expected)}" but current is "${loreSubjectKey(current)}"`,
    );
  }
}

function requireExpectedText(current: string, expected: string): void {
  if (current !== expected) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Lore text: expected current text does not match",
    );
  }
}

function requireGenuineTextChange(current: string, next: string): void {
  if (current === next) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Lore revision produces no change");
  }
}

function sourceDefinition(state: CampaignStateV5, sourceCollectionId: string) {
  const lookup = lookupSourceLoreCatalog(state.ruleset);
  if (!lookup.ok) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unsupported ruleset for Lore catalog lookup");
  }
  const definition = sourceLoreCollectionDefinition(lookup.catalog, sourceCollectionId);
  if (definition === undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unknown source Lore collection: ${sourceCollectionId}`,
    );
  }
  return definition;
}

function resolveReadyBinding(state: CampaignStateV5, sourceCollectionId: string): LoreSubjectRef {
  const resolution = resolveSourceLoreBinding(state, sourceCollectionId);
  if (!resolution.ok) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Source Lore collection ${sourceCollectionId} cannot bind (${resolution.reason})`,
    );
  }
  return resolution.subject;
}

function replaceSourceCollection(
  lore: LoreState,
  sourceCollectionId: SourceLoreCollectionId,
  next: InstantiatedSourceLoreCollection,
): LoreState {
  const index = lore.sourceCollections.findIndex(
    (collection) => collection.sourceCollectionId === sourceCollectionId,
  );
  if (index === -1) {
    return {
      ...lore,
      sourceCollections: [...lore.sourceCollections, next],
    };
  }
  const sourceCollections = [...lore.sourceCollections];
  sourceCollections[index] = next;
  return { ...lore, sourceCollections };
}

function addSourceAuthoredEntry(
  state: CampaignStateV5,
  sourceCollectionId: SourceLoreCollectionId,
  expectedSubject: LoreSubjectRef,
  entry: CampaignAuthoredLoreEntry,
): { nextState: CampaignStateV5; boundSubject: LoreSubjectRef; collectionCreated: boolean } {
  sourceDefinition(state, sourceCollectionId);
  const existing = instantiatedSourceLoreCollection(state, sourceCollectionId);
  if (existing !== undefined) {
    requireExpectedSubject(existing.boundSubject, expectedSubject);
    return {
      nextState: replaceLore(state, replaceSourceCollection(state.lore, sourceCollectionId, {
        ...existing,
        additions: [...existing.additions, entry],
      })),
      boundSubject: existing.boundSubject,
      collectionCreated: false,
    };
  }

  const boundSubject = resolveReadyBinding(state, sourceCollectionId);
  requireExpectedSubject(boundSubject, expectedSubject);
  return {
    nextState: replaceLore(state, replaceSourceCollection(state.lore, sourceCollectionId, {
      sourceCollectionId,
      boundSubject,
      overrides: [],
      additions: [entry],
    })),
    boundSubject,
    collectionCreated: true,
  };
}

export function applyAddLoreEntry(state: CampaignStateV5, input: AddLoreEntryInput): LoreTransitionResult {
  assertValidStoredLoreText("text", input.text);
  const loreEntryId = requireLoreEntryId(input.loreEntryId, state.lore);
  const entry: CampaignAuthoredLoreEntry = { loreEntryId, text: input.text };

  if (input.target.kind === "source") {
    const applied = addSourceAuthoredEntry(
      state,
      input.target.sourceCollectionId,
      input.target.expectedSubject,
      entry,
    );
    const event: LoreEntryAddedEventV1 = {
      type: "lore_entry_added",
      version: 1,
      data: {
        collection: {
          kind: "source",
          sourceCollectionId: input.target.sourceCollectionId,
          boundSubject: applied.boundSubject,
        },
        loreEntryId,
        text: input.text,
        collectionCreated: applied.collectionCreated,
      },
    };
    return { nextState: applied.nextState, events: [event] };
  }

  const target = input.target;
  const subject = validateLoreSubjectRef("target.subject", target.subject, state);
  if (!isValidLoreCollectionId(target.collectionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `collectionId is malformed: ${target.collectionId}`,
    );
  }

  const existing = campaignLoreCollectionForSubject(state, subject);
  if (existing !== undefined) {
    if (existing.collectionId !== target.collectionId) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        `Lore collection: expected "${target.collectionId}" but current is "${existing.collectionId}"`,
      );
    }
    const event: LoreEntryAddedEventV1 = {
      type: "lore_entry_added",
      version: 1,
      data: {
        collection: {
          kind: "campaign",
          collectionId: existing.collectionId,
          subject: existing.subject,
        },
        loreEntryId,
        text: input.text,
        collectionCreated: false,
      },
    };
    return {
      nextState: replaceLore(state, {
        ...state.lore,
        campaignCollections: state.lore.campaignCollections.map((collection) =>
          collection.collectionId === existing.collectionId
            ? { ...collection, entries: [...collection.entries, entry] }
            : collection,
        ),
      }),
      events: [event],
    };
  }

  if (state.lore.campaignCollections.some((collection) => collection.collectionId === target.collectionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Duplicate LoreCollectionId: ${target.collectionId}`,
    );
  }

  const event: LoreEntryAddedEventV1 = {
    type: "lore_entry_added",
    version: 1,
    data: {
      collection: {
        kind: "campaign",
        collectionId: target.collectionId,
        subject,
      },
      loreEntryId,
      text: input.text,
      collectionCreated: true,
    },
  };
  return {
    nextState: replaceLore(state, {
      ...state.lore,
      campaignCollections: [
        ...state.lore.campaignCollections,
        {
          collectionId: target.collectionId,
          subject,
          entries: [entry],
        },
      ],
    }),
    events: [event],
  };
}

function upsertSourceOverride(
  overrides: readonly SourceLoreEntryOverride[],
  sourceEntryId: SourceLoreEntryId,
  currentText: string,
  baselineText: string,
): readonly SourceLoreEntryOverride[] {
  if (currentText === baselineText) {
    return overrides.filter((override) => override.sourceEntryId !== sourceEntryId);
  }
  const next: SourceLoreEntryOverride = { sourceEntryId, currentText };
  const index = overrides.findIndex((override) => override.sourceEntryId === sourceEntryId);
  if (index === -1) {
    return [...overrides, next];
  }
  const copy = [...overrides];
  copy[index] = next;
  return copy;
}

function applyReviseSourceEntry(
  state: CampaignStateV5,
  sourceCollectionId: SourceLoreCollectionId,
  sourceEntryId: SourceLoreEntryId,
  expectedSubject: LoreSubjectRef,
  expectedText: string,
  text: string,
): LoreTransitionResult {
  const definition = sourceDefinition(state, sourceCollectionId);
  const baseline = definition.entries.find((entry) => entry.sourceEntryId === sourceEntryId);
  if (baseline === undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unknown source Lore entry ${sourceCollectionId}:${sourceEntryId}`,
    );
  }

  const existing = instantiatedSourceLoreCollection(state, sourceCollectionId);
  const currentText =
    existing?.overrides.find((override) => override.sourceEntryId === sourceEntryId)?.currentText
    ?? baseline.text;
  requireExpectedText(currentText, expectedText);
  requireGenuineTextChange(currentText, text);

  let boundSubject: LoreSubjectRef;
  let sourceCollectionBound = false;
  let nextInstance: InstantiatedSourceLoreCollection;

  if (existing !== undefined) {
    requireExpectedSubject(existing.boundSubject, expectedSubject);
    boundSubject = existing.boundSubject;
    nextInstance = {
      ...existing,
      overrides: upsertSourceOverride(existing.overrides, sourceEntryId, text, baseline.text),
    };
  } else {
    boundSubject = resolveReadyBinding(state, sourceCollectionId);
    requireExpectedSubject(boundSubject, expectedSubject);
    sourceCollectionBound = true;
    nextInstance = {
      sourceCollectionId,
      boundSubject,
      overrides: upsertSourceOverride([], sourceEntryId, text, baseline.text),
      additions: [],
    };
  }

  const event: LoreEntryRevisedEventV1 = {
    type: "lore_entry_revised",
    version: 1,
    data: {
      target: {
        kind: "source_entry",
        sourceCollectionId,
        sourceEntryId,
        boundSubject,
      },
      previousText: currentText,
      text,
      sourceCollectionBound,
    },
  };
  return {
    nextState: replaceLore(state, replaceSourceCollection(state.lore, sourceCollectionId, nextInstance)),
    events: [event],
  };
}

export function applyReviseLoreEntry(
  state: CampaignStateV5,
  input: ReviseLoreEntryInput,
): LoreTransitionResult {
  assertValidStoredLoreText("text", input.text);

  if (input.target.kind === "source_entry") {
    return applyReviseSourceEntry(
      state,
      input.target.sourceCollectionId,
      input.target.sourceEntryId,
      input.target.expectedSubject,
      input.expectedText,
      input.text,
    );
  }

  if (input.target.kind === "source_addition") {
    const target = input.target;
    const existing = instantiatedSourceLoreCollection(state, target.sourceCollectionId);
    if (existing === undefined) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Source Lore collection is not instantiated: ${target.sourceCollectionId}`,
      );
    }
    requireExpectedSubject(existing.boundSubject, target.expectedSubject);
    const index = existing.additions.findIndex((entry) => entry.loreEntryId === target.loreEntryId);
    if (index === -1) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Lore entry not found in source collection additions: ${target.loreEntryId}`,
      );
    }
    const current = existing.additions[index];
    requireExpectedText(current.text, input.expectedText);
    requireGenuineTextChange(current.text, input.text);
    const additions = [...existing.additions];
    additions[index] = { loreEntryId: current.loreEntryId, text: input.text };
    const event: LoreEntryRevisedEventV1 = {
      type: "lore_entry_revised",
      version: 1,
      data: {
        target: {
          kind: "source_addition",
          sourceCollectionId: target.sourceCollectionId,
          loreEntryId: target.loreEntryId,
          boundSubject: existing.boundSubject,
        },
        previousText: current.text,
        text: input.text,
        sourceCollectionBound: false,
      },
    };
    return {
      nextState: replaceLore(state, replaceSourceCollection(state.lore, target.sourceCollectionId, {
        ...existing,
        additions,
      })),
      events: [event],
    };
  }

  const target = input.target;
  const collection = state.lore.campaignCollections.find(
    (candidate) => candidate.collectionId === target.collectionId,
  );
  if (collection === undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Campaign Lore collection not found: ${target.collectionId}`,
    );
  }
  const index = collection.entries.findIndex((entry) => entry.loreEntryId === target.loreEntryId);
  if (index === -1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Lore entry not found in campaign collection: ${target.loreEntryId}`,
    );
  }
  const current = collection.entries[index];
  requireExpectedText(current.text, input.expectedText);
  requireGenuineTextChange(current.text, input.text);
  const entries = [...collection.entries];
  entries[index] = { loreEntryId: current.loreEntryId, text: input.text };
  const event: LoreEntryRevisedEventV1 = {
    type: "lore_entry_revised",
    version: 1,
    data: {
      target: {
        kind: "campaign_entry",
        collectionId: collection.collectionId,
        loreEntryId: target.loreEntryId,
        subject: collection.subject,
      },
      previousText: current.text,
      text: input.text,
      sourceCollectionBound: false,
    },
  };
  return {
    nextState: replaceLore(state, {
      ...state.lore,
      campaignCollections: state.lore.campaignCollections.map((candidate) =>
        candidate.collectionId === collection.collectionId
          ? { ...candidate, entries }
          : candidate,
      ),
    }),
    events: [event],
  };
}
