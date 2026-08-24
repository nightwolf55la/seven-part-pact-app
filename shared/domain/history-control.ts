import type { CampaignCommandType } from "./commands";
import { isLogicalStateCommandType } from "./commands";
import type { SerializableCampaignState } from "./verification";

export const CURRENT_HISTORY_CONTROL_VERSION = 1 as const;

export interface CampaignHistoryControlV1 {
  readonly historyControlVersion: 1;
  readonly campaignId: string;
  readonly undoStack: readonly number[];
  readonly redoStack: readonly number[];
}

export interface HistoryControlValidationInput {
  readonly control: CampaignHistoryControlV1;
  readonly campaignId: string;
  readonly campaignRevision: number;
}

export function validateHistoryControlStructure(
  input: HistoryControlValidationInput,
): string[] {
  const errors: string[] = [];
  const { control, campaignId, campaignRevision } = input;

  if (control.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
    errors.push(`Unrecognized historyControlVersion: ${control.historyControlVersion}`);
    return errors;
  }

  if (control.campaignId !== campaignId) {
    errors.push(`History control campaignId "${control.campaignId}" does not match campaign "${campaignId}"`);
  }

  if (control.undoStack.length === 0) {
    errors.push("undoStack must be non-empty");
    return errors;
  }

  if (control.undoStack[0] !== 0) {
    errors.push(`undoStack[0] must be 0, got ${control.undoStack[0]}`);
  }

  for (let i = 0; i < control.undoStack.length; i++) {
    const r = control.undoStack[i];
    if (!Number.isSafeInteger(r) || r < 0) {
      errors.push(`undoStack[${i}] is not a non-negative safe integer: ${r}`);
    } else if (r > campaignRevision) {
      errors.push(`undoStack[${i}] = ${r} exceeds campaignRevision ${campaignRevision}`);
    }
  }

  for (let i = 1; i < control.undoStack.length; i++) {
    if (control.undoStack[i] <= control.undoStack[i - 1]) {
      errors.push(`undoStack is not strictly increasing at index ${i}: ${control.undoStack[i - 1]} >= ${control.undoStack[i]}`);
      break;
    }
  }

  for (let i = 0; i < control.redoStack.length; i++) {
    const r = control.redoStack[i];
    if (!Number.isSafeInteger(r) || r < 0) {
      errors.push(`redoStack[${i}] is not a non-negative safe integer: ${r}`);
    } else if (r > campaignRevision) {
      errors.push(`redoStack[${i}] = ${r} exceeds campaignRevision ${campaignRevision}`);
    } else if (r === 0) {
      errors.push(`redoStack[${i}] is 0, which is never legal in redoStack`);
    }
  }

  for (let i = 1; i < control.redoStack.length; i++) {
    if (control.redoStack[i] >= control.redoStack[i - 1]) {
      errors.push(`redoStack is not strictly decreasing at index ${i}: ${control.redoStack[i - 1]} <= ${control.redoStack[i]}`);
      break;
    }
  }

  if (control.undoStack.length > 0 && control.redoStack.length > 0) {
    const undoTop = control.undoStack[control.undoStack.length - 1];
    for (let i = 0; i < control.redoStack.length; i++) {
      if (control.redoStack[i] <= undoTop) {
        errors.push(`redoStack[${i}] = ${control.redoStack[i]} is not greater than undoStack top ${undoTop}`);
        break;
      }
    }
  }

  const undoSet = new Set(control.undoStack);
  if (undoSet.size !== control.undoStack.length) {
    errors.push("undoStack contains duplicate entries");
  }

  const redoSet = new Set(control.redoStack);
  if (redoSet.size !== control.redoStack.length) {
    errors.push("redoStack contains duplicate entries");
  }

  for (const r of control.redoStack) {
    if (undoSet.has(r)) {
      errors.push(`Revision ${r} appears in both undoStack and redoStack`);
      break;
    }
  }

  return errors;
}

export interface RevisionCommandInfo {
  readonly campaignRevision: number;
  readonly commandType: CampaignCommandType;
}

export interface ReplayEventInfo {
  readonly campaignRevision: number;
  readonly event: {
    readonly type: string;
    readonly version: number;
    readonly data: {
      readonly fromRevision?: number;
      readonly targetRevision?: number;
    };
  };
}

export interface HistoryReplayInput {
  readonly campaignRevision: number;
  readonly revisions: readonly RevisionCommandInfo[];
  readonly events: readonly ReplayEventInfo[];
}

export interface HistoryReplayResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly expectedUndoStack: readonly number[];
  readonly expectedRedoStack: readonly number[];
}

export function replayHistoryControl(input: HistoryReplayInput): HistoryReplayResult {
  const errors: string[] = [];
  const N = input.campaignRevision;

  const expectedUndo: number[] = [0];
  const expectedRedo: number[] = [];

  const revisionMap = new Map<number, RevisionCommandInfo>();
  for (const rev of input.revisions) {
    revisionMap.set(rev.campaignRevision, rev);
  }

  const eventMap = new Map<number, ReplayEventInfo>();
  for (const evt of input.events) {
    if (!eventMap.has(evt.campaignRevision)) {
      eventMap.set(evt.campaignRevision, evt);
    }
  }

  for (let r = 1; r <= N; r++) {
    const rev = revisionMap.get(r);
    if (!rev) {
      errors.push(`Missing revision record for revision ${r}`);
      continue;
    }

    if (isLogicalStateCommandType(rev.commandType)) {
      expectedUndo.push(r);
      expectedRedo.length = 0;
    } else if (rev.commandType === "undo") {
      const evt = eventMap.get(r);
      if (!evt) {
        errors.push(`Revision ${r} is undo but has no event`);
        continue;
      }
      if (evt.event.type !== "undo_applied" || evt.event.version !== 1) {
        errors.push(`Revision ${r} undo has unexpected event type="${evt.event.type}" version=${evt.event.version}`);
        continue;
      }
      if (expectedUndo.length <= 1) {
        errors.push(`Revision ${r} undo impossible: undoStack has only ${expectedUndo.length} entry`);
        continue;
      }
      const expectedFrom = expectedUndo[expectedUndo.length - 1];
      const expectedTarget = expectedUndo[expectedUndo.length - 2];
      if (evt.event.data.fromRevision !== expectedFrom) {
        errors.push(`Revision ${r} undo event.fromRevision=${evt.event.data.fromRevision} expected ${expectedFrom}`);
      }
      if (evt.event.data.targetRevision !== expectedTarget) {
        errors.push(`Revision ${r} undo event.targetRevision=${evt.event.data.targetRevision} expected ${expectedTarget}`);
      }
      const popped = expectedUndo.pop()!;
      expectedRedo.push(popped);
    } else if (rev.commandType === "redo") {
      const evt = eventMap.get(r);
      if (!evt) {
        errors.push(`Revision ${r} is redo but has no event`);
        continue;
      }
      if (evt.event.type !== "redo_applied" || evt.event.version !== 1) {
        errors.push(`Revision ${r} redo has unexpected event type="${evt.event.type}" version=${evt.event.version}`);
        continue;
      }
      if (expectedRedo.length === 0) {
        errors.push(`Revision ${r} redo impossible: redoStack is empty`);
        continue;
      }
      const expectedFrom = expectedUndo[expectedUndo.length - 1];
      const expectedTarget = expectedRedo[expectedRedo.length - 1];
      if (evt.event.data.fromRevision !== expectedFrom) {
        errors.push(`Revision ${r} redo event.fromRevision=${evt.event.data.fromRevision} expected ${expectedFrom}`);
      }
      if (evt.event.data.targetRevision !== expectedTarget) {
        errors.push(`Revision ${r} redo event.targetRevision=${evt.event.data.targetRevision} expected ${expectedTarget}`);
      }
      const target = expectedRedo.pop()!;
      expectedUndo.push(target);
    } else {
      errors.push(`Revision ${r} has unknown command type "${rev.commandType}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    expectedUndoStack: expectedUndo,
    expectedRedoStack: expectedRedo,
  };
}

export interface HistoryControlVerificationInput {
  readonly control: CampaignHistoryControlV1;
  readonly campaignId: string;
  readonly campaignRevision: number;
  readonly campaignState: SerializableCampaignState;
  readonly revisions: readonly RevisionCommandInfo[];
  readonly events: readonly ReplayEventInfo[];
  readonly snapshotRevisions: readonly number[];
  readonly snapshotAtUndoTop: SerializableCampaignState | null;
}

export function verifyHistoryControl(
  input: HistoryControlVerificationInput,
): string[] {
  const errors: string[] = [];

  const structuralErrors = validateHistoryControlStructure({
    control: input.control,
    campaignId: input.campaignId,
    campaignRevision: input.campaignRevision,
  });
  errors.push(...structuralErrors);

  if (structuralErrors.length > 0) return errors;

  const snapshotSet = new Set(input.snapshotRevisions);

  for (const r of input.control.undoStack) {
    if (!snapshotSet.has(r)) {
      errors.push(`undoStack references revision ${r} which has no snapshot`);
    }
  }
  for (const r of input.control.redoStack) {
    if (!snapshotSet.has(r)) {
      errors.push(`redoStack references revision ${r} which has no snapshot`);
    }
  }

  const revisionMap = new Map(input.revisions.map((r) => [r.campaignRevision, r]));
  for (const r of input.control.undoStack) {
    if (r === 0) continue;
    const rec = revisionMap.get(r);
    if (!rec) {
      errors.push(`undoStack references revision ${r} which has no revision record`);
    } else if (!isLogicalStateCommandType(rec.commandType)) {
      errors.push(`undoStack references revision ${r} with history-navigation commandType "${rec.commandType}"`);
    }
  }
  for (const r of input.control.redoStack) {
    const rec = revisionMap.get(r);
    if (!rec) {
      errors.push(`redoStack references revision ${r} which has no revision record`);
    } else if (!isLogicalStateCommandType(rec.commandType)) {
      errors.push(`redoStack references revision ${r} with history-navigation commandType "${rec.commandType}"`);
    }
  }

  if (input.snapshotAtUndoTop !== null) {
    const undoTop = input.control.undoStack[input.control.undoStack.length - 1];
    const snap = input.snapshotAtUndoTop;
    const state = input.campaignState;
    if (
      snap.schemaVersion !== state.schemaVersion ||
      snap.ruleset.id !== state.ruleset.id ||
      snap.ruleset.version !== state.ruleset.version ||
      snap.calendar.monthOrdinal !== state.calendar.monthOrdinal
    ) {
      errors.push(`snapshot(undoStack.last=${undoTop}).state does not match authoritative campaign state`);
    }
  }

  const replayResult = replayHistoryControl({
    campaignRevision: input.campaignRevision,
    revisions: input.revisions,
    events: input.events,
  });
  if (!replayResult.valid) {
    errors.push(...replayResult.errors.map((e) => `replay: ${e}`));
  } else {
    const undoMatch =
      replayResult.expectedUndoStack.length === input.control.undoStack.length &&
      replayResult.expectedUndoStack.every((v, i) => v === input.control.undoStack[i]);
    const redoMatch =
      replayResult.expectedRedoStack.length === input.control.redoStack.length &&
      replayResult.expectedRedoStack.every((v, i) => v === input.control.redoStack[i]);

    if (!undoMatch) {
      errors.push(`Replay-derived undoStack [${replayResult.expectedUndoStack.join(",")}] does not match persisted [${input.control.undoStack.join(",")}]`);
    }
    if (!redoMatch) {
      errors.push(`Replay-derived redoStack [${replayResult.expectedRedoStack.join(",")}] does not match persisted [${input.control.redoStack.join(",")}]`);
    }
  }

  return errors;
}
