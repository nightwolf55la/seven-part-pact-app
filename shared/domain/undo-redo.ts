import type { CurrentCampaignState } from "./campaign-state";
import type { UndoAppliedEventV1, RedoAppliedEventV1 } from "./events";
import type { CampaignHistoryControlV1 } from "./history-control";
import { validateHistoryControlStructure, statesDeepEqual } from "./history-control";
import { validateCampaignState } from "./state-validation";
import { DomainError } from "./errors";
import { isLogicalStateCommandType } from "./commands";
import type { CampaignCommandType } from "./commands";

export interface UndoTransitionInput {
  readonly control: CampaignHistoryControlV1;
  readonly campaignRevision: number;
  readonly campaignState: CurrentCampaignState;
  readonly targetSnapshotState: CurrentCampaignState | null;
  readonly currentLogicalSnapshotState: CurrentCampaignState | null;
  readonly targetRevisionCommandType: CampaignCommandType | null;
}

export interface RedoTransitionInput {
  readonly control: CampaignHistoryControlV1;
  readonly campaignRevision: number;
  readonly campaignState: CurrentCampaignState;
  readonly targetSnapshotState: CurrentCampaignState | null;
  readonly currentLogicalSnapshotState: CurrentCampaignState | null;
  readonly targetRevisionCommandType: CampaignCommandType | null;
}

export interface HistoryNavigationResult {
  readonly nextState: CurrentCampaignState;
  readonly event: UndoAppliedEventV1 | RedoAppliedEventV1;
  readonly nextUndoStack: readonly number[];
  readonly nextRedoStack: readonly number[];
  readonly fromRevision: number;
  readonly targetRevision: number;
}

function validateControlPreconditions(
  control: CampaignHistoryControlV1,
  campaignId: string,
  campaignRevision: number,
  campaignState: CurrentCampaignState,
  currentLogicalSnapshotState: CurrentCampaignState | null,
): void {
  const structErrors = validateHistoryControlStructure({
    control,
    campaignId: control.campaignId,
    campaignRevision,
  });
  if (structErrors.length > 0) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `History control structural validation failed: ${structErrors.join("; ")}`,
    );
  }

  if (control.campaignId !== campaignId) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `History control campaignId "${control.campaignId}" does not match campaign "${campaignId}"`,
    );
  }

  const currentLogicalRevision = control.undoStack[control.undoStack.length - 1];

  if (currentLogicalSnapshotState === null) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `No snapshot found for current logical revision ${currentLogicalRevision}`,
    );
  }

  if (!statesDeepEqual(currentLogicalSnapshotState, campaignState)) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `Snapshot at undoStack top (revision ${currentLogicalRevision}) does not match authoritative campaign state`,
    );
  }
}

export function deriveUndoTransition(
  input: UndoTransitionInput,
  campaignId: string,
): HistoryNavigationResult {
  const { control, campaignRevision, campaignState, targetSnapshotState, currentLogicalSnapshotState, targetRevisionCommandType } = input;

  validateControlPreconditions(control, campaignId, campaignRevision, campaignState, currentLogicalSnapshotState);

  if (control.undoStack.length <= 1) {
    throw new DomainError("UNDO_UNAVAILABLE", "Cannot undo: undoStack has only one entry (initial state)");
  }

  const fromRevision = control.undoStack[control.undoStack.length - 1];
  const targetRevision = control.undoStack[control.undoStack.length - 2];

  if (targetSnapshotState === null) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `No snapshot found for undo target revision ${targetRevision}`,
    );
  }

  validateCampaignState(targetSnapshotState);

  if (targetRevision !== 0 && targetRevisionCommandType !== null) {
    if (!isLogicalStateCommandType(targetRevisionCommandType)) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Undo target revision ${targetRevision} has non-logical-state commandType "${targetRevisionCommandType}"`,
      );
    }
  }

  const nextUndoStack = control.undoStack.slice(0, -1);
  const nextRedoStack = [...control.redoStack, fromRevision];

  const event: UndoAppliedEventV1 = {
    type: "undo_applied",
    version: 1,
    data: { fromRevision, targetRevision },
  };

  return {
    nextState: targetSnapshotState,
    event,
    nextUndoStack,
    nextRedoStack,
    fromRevision,
    targetRevision,
  };
}

export function deriveRedoTransition(
  input: RedoTransitionInput,
  campaignId: string,
): HistoryNavigationResult {
  const { control, campaignRevision, campaignState, targetSnapshotState, currentLogicalSnapshotState, targetRevisionCommandType } = input;

  validateControlPreconditions(control, campaignId, campaignRevision, campaignState, currentLogicalSnapshotState);

  if (control.redoStack.length === 0) {
    throw new DomainError("REDO_UNAVAILABLE", "Cannot redo: redoStack is empty");
  }

  const fromRevision = control.undoStack[control.undoStack.length - 1];
  const targetRevision = control.redoStack[control.redoStack.length - 1];

  if (targetSnapshotState === null) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `No snapshot found for redo target revision ${targetRevision}`,
    );
  }

  validateCampaignState(targetSnapshotState);

  if (targetRevisionCommandType !== null) {
    if (!isLogicalStateCommandType(targetRevisionCommandType)) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Redo target revision ${targetRevision} has non-logical-state commandType "${targetRevisionCommandType}"`,
      );
    }
  }

  const nextUndoStack = [...control.undoStack, targetRevision];
  const nextRedoStack = control.redoStack.slice(0, -1);

  const event: RedoAppliedEventV1 = {
    type: "redo_applied",
    version: 1,
    data: { fromRevision, targetRevision },
  };

  return {
    nextState: targetSnapshotState,
    event,
    nextUndoStack,
    nextRedoStack,
    fromRevision,
    targetRevision,
  };
}

export interface UndoCoherenceInput {
  readonly priorUndoStack: readonly number[];
  readonly priorRedoStack: readonly number[];
  readonly nextUndoStack: readonly number[];
  readonly nextRedoStack: readonly number[];
  readonly event: UndoAppliedEventV1;
  readonly restoredState: CurrentCampaignState;
  readonly targetSnapshotState: CurrentCampaignState;
  readonly newAuditRevision: number;
}

export function validateUndoTransactionCoherence(input: UndoCoherenceInput): string[] {
  const errors: string[] = [];
  const { priorUndoStack, priorRedoStack, nextUndoStack, nextRedoStack, event, restoredState, targetSnapshotState, newAuditRevision } = input;

  if (event.type !== "undo_applied" || event.version !== 1) {
    errors.push(`Expected exactly one undo_applied v1 event, got type="${event.type}" version=${event.version}`);
    return errors;
  }

  const expectedFrom = priorUndoStack[priorUndoStack.length - 1];
  if (event.data.fromRevision !== expectedFrom) {
    errors.push(`event.fromRevision=${event.data.fromRevision} expected ${expectedFrom} (prior undoStack.last)`);
  }

  const expectedTarget = priorUndoStack[priorUndoStack.length - 2];
  if (event.data.targetRevision !== expectedTarget) {
    errors.push(`event.targetRevision=${event.data.targetRevision} expected ${expectedTarget} (prior undoStack second-to-last)`);
  }

  const expectedNextUndo = priorUndoStack.slice(0, -1);
  if (nextUndoStack.length !== expectedNextUndo.length || !nextUndoStack.every((v, i) => v === expectedNextUndo[i])) {
    errors.push(`nextUndoStack [${nextUndoStack.join(",")}] expected [${expectedNextUndo.join(",")}]`);
  }

  const expectedNextRedo = [...priorRedoStack, expectedFrom];
  if (nextRedoStack.length !== expectedNextRedo.length || !nextRedoStack.every((v, i) => v === expectedNextRedo[i])) {
    errors.push(`nextRedoStack [${nextRedoStack.join(",")}] expected [${expectedNextRedo.join(",")}]`);
  }

  if (!statesDeepEqual(restoredState, targetSnapshotState)) {
    errors.push("Restored state does not deep-equal target snapshot state");
  }

  if (nextUndoStack.includes(newAuditRevision)) {
    errors.push(`New audit revision ${newAuditRevision} must not appear in nextUndoStack`);
  }
  if (nextRedoStack.includes(newAuditRevision)) {
    errors.push(`New audit revision ${newAuditRevision} must not appear in nextRedoStack`);
  }

  return errors;
}

export interface RedoCoherenceInput {
  readonly priorUndoStack: readonly number[];
  readonly priorRedoStack: readonly number[];
  readonly nextUndoStack: readonly number[];
  readonly nextRedoStack: readonly number[];
  readonly event: RedoAppliedEventV1;
  readonly restoredState: CurrentCampaignState;
  readonly targetSnapshotState: CurrentCampaignState;
  readonly newAuditRevision: number;
}

export function validateRedoTransactionCoherence(input: RedoCoherenceInput): string[] {
  const errors: string[] = [];
  const { priorUndoStack, priorRedoStack, nextUndoStack, nextRedoStack, event, restoredState, targetSnapshotState, newAuditRevision } = input;

  if (event.type !== "redo_applied" || event.version !== 1) {
    errors.push(`Expected exactly one redo_applied v1 event, got type="${event.type}" version=${event.version}`);
    return errors;
  }

  const expectedFrom = priorUndoStack[priorUndoStack.length - 1];
  if (event.data.fromRevision !== expectedFrom) {
    errors.push(`event.fromRevision=${event.data.fromRevision} expected ${expectedFrom} (prior undoStack.last)`);
  }

  const expectedTarget = priorRedoStack[priorRedoStack.length - 1];
  if (event.data.targetRevision !== expectedTarget) {
    errors.push(`event.targetRevision=${event.data.targetRevision} expected ${expectedTarget} (prior redoStack.last)`);
  }

  const expectedNextUndo = [...priorUndoStack, expectedTarget];
  if (nextUndoStack.length !== expectedNextUndo.length || !nextUndoStack.every((v, i) => v === expectedNextUndo[i])) {
    errors.push(`nextUndoStack [${nextUndoStack.join(",")}] expected [${expectedNextUndo.join(",")}]`);
  }

  const expectedNextRedo = priorRedoStack.slice(0, -1);
  if (nextRedoStack.length !== expectedNextRedo.length || !nextRedoStack.every((v, i) => v === expectedNextRedo[i])) {
    errors.push(`nextRedoStack [${nextRedoStack.join(",")}] expected [${expectedNextRedo.join(",")}]`);
  }

  if (!statesDeepEqual(restoredState, targetSnapshotState)) {
    errors.push("Restored state does not deep-equal target snapshot state");
  }

  if (nextUndoStack.includes(newAuditRevision)) {
    errors.push(`New audit revision ${newAuditRevision} must not appear in nextUndoStack`);
  }
  if (nextRedoStack.includes(newAuditRevision)) {
    errors.push(`New audit revision ${newAuditRevision} must not appear in nextRedoStack`);
  }

  return errors;
}
