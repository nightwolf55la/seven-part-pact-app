import type {
  AddLoreEntryTarget,
  LoreCollectionId,
  LoreEntryId,
  LoreSubjectRef,
  ReviseLoreEntryTarget,
} from "../shared/domain";
import {
  loreAddTargetFromDescriptor,
  loreSubjectRefsEqual,
  MAX_LORE_TEXT_LENGTH,
  type LoreAddOperationDescriptor,
  type LoreCompendiumReference,
  type LorePresentationContext,
  type LorePresentationEntry,
  type LorePresentationShelf,
  type LorePresentationShelfId,
  type LorePresentationSubject,
} from "../shared/domain";

export const LORE_EMPTY_ELIGIBLE_STATUS = "Available for Lore";

export type LoreBrowseFilters = {
  readonly search: string;
  readonly shelfId: LorePresentationShelfId | "all";
  readonly changedAndAddedOnly: boolean;
  readonly includeEmptyEligible: boolean;
};

export type LoreContextConstraint =
  | { readonly kind: "any" }
  | { readonly kind: "source"; readonly sourceCollectionId: string }
  | { readonly kind: "campaign"; readonly collectionId: string };

export function newLoreCommandId(uuid: string = crypto.randomUUID()): string {
  return `cmd_${uuid}`;
}

export function subjectHasNonPrintedEntry(subject: LorePresentationSubject): boolean {
  for (const context of subject.contexts) {
    for (const entry of context.entries) {
      if (entry.provenance !== "printed") {
        return true;
      }
    }
  }
  return false;
}

export function subjectMatchesSearch(subject: LorePresentationSubject, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }
  if (subject.subjectLabel.toLowerCase().includes(query)) {
    return true;
  }
  for (const context of subject.contexts) {
    if (context.contextLabel.toLowerCase().includes(query)) {
      return true;
    }
    if (context.kind === "source") {
      const { work, pages, anchor } = context.attribution;
      if (
        work.toLowerCase().includes(query)
        || pages.toLowerCase().includes(query)
        || anchor.toLowerCase().includes(query)
      ) {
        return true;
      }
    }
    for (const entry of context.entries) {
      if (entry.text.toLowerCase().includes(query)) {
        return true;
      }
      if (entry.provenance === "changed_in_play" && entry.printedText.toLowerCase().includes(query)) {
        return true;
      }
    }
  }
  return false;
}

export function compendiumSubjectIndexLabel(subject: LorePresentationSubject): string {
  if (subject.compendiumPresence === "empty_eligible") {
    return `${subject.subjectLabel} — ${LORE_EMPTY_ELIGIBLE_STATUS}`;
  }
  return subject.subjectLabel;
}

export function compendiumShelfOptions(
  presentation: Extract<LoreCompendiumReference, { ok: true }>,
): readonly LorePresentationShelf[] {
  const seen = new Map<LorePresentationShelfId, LorePresentationShelf>();
  for (const subject of presentation.subjects) {
    seen.set(subject.shelf.id, subject.shelf);
  }
  return [...seen.values()];
}

export function browseCompendiumSubjects(
  presentation: Extract<LoreCompendiumReference, { ok: true }>,
  filters: LoreBrowseFilters,
): readonly LorePresentationSubject[] {
  let subjects = presentation.subjects;
  if (!filters.includeEmptyEligible) {
    subjects = subjects.filter((subject) => subject.compendiumPresence === "has_lore");
  }
  if (filters.changedAndAddedOnly) {
    subjects = subjects.filter(subjectHasNonPrintedEntry);
  }
  if (filters.shelfId !== "all") {
    subjects = subjects.filter((subject) => subject.shelf.id === filters.shelfId);
  }
  if (filters.search.trim().length > 0) {
    subjects = subjects.filter((subject) => subjectMatchesSearch(subject, filters.search));
  }
  return subjects;
}

export function findPresentationSubjectByRef(
  presentation: Extract<LoreCompendiumReference, { ok: true }>,
  subjectRef: LoreSubjectRef,
): LorePresentationSubject | undefined {
  return presentation.subjects.find(
    (subject) => subject.subject !== null && loreSubjectRefsEqual(subject.subject, subjectRef),
  );
}

export function findPresentationSubjectByKey(
  presentation: Extract<LoreCompendiumReference, { ok: true }>,
  presentationKey: string,
): LorePresentationSubject | undefined {
  return presentation.subjects.find((subject) => subject.presentationKey === presentationKey);
}

export function filterContextsForSubject(
  subject: LorePresentationSubject,
  constraint: LoreContextConstraint,
): readonly LorePresentationContext[] {
  if (constraint.kind === "any") {
    return subject.contexts;
  }
  if (constraint.kind === "source") {
    return subject.contexts.filter(
      (context) => context.kind === "source" && context.sourceCollectionId === constraint.sourceCollectionId,
    );
  }
  return subject.contexts.filter(
    (context) => context.kind === "campaign" && context.collectionId === constraint.collectionId,
  );
}

export function validateLoreDraftText(text: string): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, message: "Lore text cannot be blank." };
  }
  if (text.length > MAX_LORE_TEXT_LENGTH) {
    return { ok: false, message: `Lore text cannot exceed ${MAX_LORE_TEXT_LENGTH} characters.` };
  }
  return { ok: true };
}

export function buildAddLoreEntryMutationArgs(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly descriptor: LoreAddOperationDescriptor;
  readonly loreEntryId: LoreEntryId;
  readonly text: string;
  readonly newCampaignCollectionId?: LoreCollectionId;
}):
  | { readonly ok: true; readonly payload: { readonly commandId: string; readonly expectedCampaignId: string; readonly target: AddLoreEntryTarget; readonly loreEntryId: LoreEntryId; readonly text: string } }
  | { readonly ok: false; readonly message: string } {
  const validation = validateLoreDraftText(args.text);
  if (!validation.ok) {
    return validation;
  }
  if ("targetForm" in args.descriptor) {
    if (args.newCampaignCollectionId === undefined) {
      return { ok: false, message: "A campaign Lore collection is required for this add." };
    }
    return {
      ok: true,
      payload: {
        commandId: args.commandId,
        expectedCampaignId: args.expectedCampaignId,
        target: loreAddTargetFromDescriptor(args.descriptor, args.newCampaignCollectionId),
        loreEntryId: args.loreEntryId,
        text: args.text,
      },
    };
  }
  return {
    ok: true,
    payload: {
      commandId: args.commandId,
      expectedCampaignId: args.expectedCampaignId,
      target: args.descriptor.target,
      loreEntryId: args.loreEntryId,
      text: args.text,
    },
  };
}

export function loreReviseEntryKey(context: LorePresentationContext, entry: LorePresentationEntry): string | null {
  if (entry.revise === null) {
    return null;
  }
  const target = entry.revise.target;
  switch (target.kind) {
    case "source_entry":
      return `source_entry:${target.sourceCollectionId}:${target.sourceEntryId}`;
    case "source_addition":
      return `source_addition:${target.sourceCollectionId}:${target.loreEntryId}`;
    case "campaign_entry":
      return `campaign_entry:${target.collectionId}:${target.loreEntryId}`;
  }
}

export function effectiveTextOfEntry(entry: LorePresentationEntry): string {
  return entry.text;
}

export function findEntryByReviseKey(
  subject: LorePresentationSubject,
  entryKey: string,
): { readonly context: LorePresentationContext; readonly entry: LorePresentationEntry } | undefined {
  for (const context of subject.contexts) {
    for (const entry of context.entries) {
      if (loreReviseEntryKey(context, entry) === entryKey) {
        return { context, entry };
      }
    }
  }
  return undefined;
}

export type ReviseEditorModel = {
  readonly entryKey: string;
  readonly reviseTarget: ReviseLoreEntryTarget;
  readonly expectedText: string;
  readonly draftText: string;
  readonly conflicted: boolean;
  readonly latestServerText: string | null;
};

export function initReviseEditor(
  entry: LorePresentationEntry,
  context: LorePresentationContext,
): ReviseEditorModel | null {
  const entryKey = loreReviseEntryKey(context, entry);
  if (entryKey === null || entry.revise === null) {
    return null;
  }
  const text = effectiveTextOfEntry(entry);
  return {
    entryKey,
    reviseTarget: entry.revise.target,
    expectedText: text,
    draftText: text,
    conflicted: false,
    latestServerText: null,
  };
}

export function syncReviseEditorWithPresentation(
  editor: ReviseEditorModel,
  subject: LorePresentationSubject,
): ReviseEditorModel {
  const found = findEntryByReviseKey(subject, editor.entryKey);
  if (found === undefined) {
    return { ...editor, conflicted: true };
  }
  const latest = effectiveTextOfEntry(found.entry);
  if (latest !== editor.expectedText) {
    return {
      ...editor,
      reviseTarget: found.entry.revise?.target ?? editor.reviseTarget,
      conflicted: true,
      latestServerText: latest,
    };
  }
  return {
    ...editor,
    reviseTarget: found.entry.revise?.target ?? editor.reviseTarget,
    conflicted: false,
    latestServerText: null,
  };
}

export function applyUseLatestAsBase(editor: ReviseEditorModel): ReviseEditorModel {
  if (editor.latestServerText === null) {
    return editor;
  }
  return {
    ...editor,
    expectedText: editor.latestServerText,
    draftText: editor.draftText,
    conflicted: false,
    latestServerText: null,
  };
}

export function reviseDraftUnchanged(editor: ReviseEditorModel): boolean {
  return editor.draftText === editor.expectedText;
}

export function buildReviseLoreEntryMutationArgs(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly editor: ReviseEditorModel;
}):
  | { readonly ok: true; readonly payload: { readonly commandId: string; readonly expectedCampaignId: string; readonly target: ReviseLoreEntryTarget; readonly expectedText: string; readonly text: string } }
  | { readonly ok: false; readonly message: string } {
  if (args.editor.conflicted) {
    return { ok: false, message: "Resolve the Lore conflict before saving." };
  }
  const validation = validateLoreDraftText(args.editor.draftText);
  if (!validation.ok) {
    return validation;
  }
  if (args.editor.draftText === args.editor.expectedText) {
    return { ok: false, message: "Change the Lore text before saving." };
  }
  return {
    ok: true,
    payload: {
      commandId: args.commandId,
      expectedCampaignId: args.expectedCampaignId,
      target: args.editor.reviseTarget,
      expectedText: args.editor.expectedText,
      text: args.editor.draftText,
    },
  };
}

export function isStaleLoreCommandError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes("STALE_COMMAND_PRECONDITION")
    || error.message.includes("expected current text does not match")
  );
}

export function markReviseEditorStaleFromServer(
  editor: ReviseEditorModel,
  latestServerText: string | null,
): ReviseEditorModel {
  return {
    ...editor,
    conflicted: true,
    latestServerText: latestServerText ?? editor.latestServerText,
  };
}

export type LoreCompendiumUiState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "unsupported_ruleset" }
  | { readonly status: "ready"; readonly presentation: Extract<LoreCompendiumReference, { ok: true }> };

export function loreCompendiumUiStateFromQuery(
  queryResult: undefined | null | { readonly presentation: LoreCompendiumReference },
): LoreCompendiumUiState {
  if (queryResult === undefined) {
    return { status: "loading" };
  }
  if (queryResult === null) {
    return { status: "unavailable" };
  }
  if (!queryResult.presentation.ok) {
    return { status: "unsupported_ruleset" };
  }
  return { status: "ready", presentation: queryResult.presentation };
}
