import type { CampaignCommandType } from "./commands";
import { isLogicalStateCommandType } from "./commands";
import type { SerializableCampaignState } from "./verification";
import { advanceOrdinal } from "./calendar";
import { moveMonthFingerprint, migrationCommandFingerprint } from "./command-ids";
import { statesDeepEqual } from "./state-equality";

export { statesDeepEqual } from "./state-equality";

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
    if (!statesDeepEqual(input.snapshotAtUndoTop, input.campaignState)) {
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

// ============================================================
// Shared pure history-control initialization analysis
// ============================================================

export interface InitializationRevisionInfo {
  readonly campaignRevision: number;
  readonly commandType: CampaignCommandType;
  readonly commandFingerprint: string;
}

export interface InitializationEventInfo {
  readonly campaignRevision: number;
  readonly eventIndex: number;
  readonly event: {
    readonly type: string;
    readonly version: number;
    readonly data: Record<string, unknown>;
  };
}

export interface InitializationSnapshotInfo {
  readonly campaignRevision: number;
  readonly state: SerializableCampaignState;
}

export interface HistoryControlInitInput {
  readonly campaignId: string;
  readonly campaignRevision: number;
  readonly campaignState: SerializableCampaignState;
  readonly revisions: readonly InitializationRevisionInfo[];
  readonly events: readonly InitializationEventInfo[];
  readonly snapshots: readonly InitializationSnapshotInfo[];
  readonly existingControlDocs: readonly CampaignHistoryControlV1[];
}

export type HistoryControlInitResult =
  | { readonly status: "ready"; readonly campaignId: string; readonly campaignRevision: number; readonly undoStack: readonly number[]; readonly redoStack: readonly number[] }
  | { readonly status: "already_applied"; readonly campaignId: string; readonly undoStackLength: number; readonly redoStackLength: number }
  | { readonly status: "invalid"; readonly errors: readonly string[] };

function validateLogicalStateEventSemantics(
  revisions: ReadonlyMap<number, InitializationRevisionInfo>,
  eventsByRev: ReadonlyMap<number, InitializationEventInfo[]>,
  snapshotMap: ReadonlyMap<number, InitializationSnapshotInfo>,
  N: number,
  advanceOrdinalFn: (ordinal: number, direction: "forward" | "backward") => number,
  moveMonthFingerprintFn: (direction: "forward" | "backward") => string,
  migrationCommandFingerprintFn: (revision: number, direction: "forward" | "backward") => string,
): string[] {
  const errors: string[] = [];

  for (let r = 1; r <= N; r++) {
    const rev = revisions.get(r);
    if (!rev) continue;

    // checkpoint_restore has its own event type; validated separately
    if (rev.commandType === "checkpoint_restore") {
      const evts = eventsByRev.get(r);
      if (!evts || evts.length !== 1) {
        errors.push(`Revision ${r}: checkpoint_restore expected exactly 1 event, found ${evts?.length ?? 0}`);
        continue;
      }
      const evt = evts[0];
      if (evt.event.type !== "checkpoint_restored" || evt.event.version !== 1) {
        errors.push(`Revision ${r}: checkpoint_restore event must be checkpoint_restored v1, got type="${evt.event.type}" version=${evt.event.version}`);
      }
      continue;
    }

    // backup_import has its own event type; validated separately
    if (rev.commandType === "backup_import") {
      const evts = eventsByRev.get(r);
      if (!evts || evts.length !== 1) {
        errors.push(`Revision ${r}: backup_import expected exactly 1 event, found ${evts?.length ?? 0}`);
        continue;
      }
      const evt = evts[0];
      if (evt.event.type !== "backup_imported" || evt.event.version !== 1) {
        errors.push(`Revision ${r}: backup_import event must be backup_imported v1, got type="${evt.event.type}" version=${evt.event.version}`);
      }
      continue;
    }

    const evts = eventsByRev.get(r);
    if (!evts || evts.length === 0) continue;

    if (evts.length !== 1) {
      errors.push(`Revision ${r}: expected exactly 1 event for ${rev.commandType}, found ${evts.length}`);
      continue;
    }

    const evt = evts[0];

    if (evt.event.type !== "month_changed") {
      errors.push(`Revision ${r}: expected event type "month_changed", got "${evt.event.type}"`);
      continue;
    }

    if (evt.event.version !== 1) {
      errors.push(`Revision ${r}: expected event version 1, got ${evt.event.version}`);
      continue;
    }

    const data = evt.event.data;
    const direction = data.direction as string | undefined;
    const fromOrdinal = data.fromOrdinal as number | undefined;
    const toOrdinal = data.toOrdinal as number | undefined;

    if (direction !== "forward" && direction !== "backward") {
      errors.push(`Revision ${r}: invalid event direction "${direction}"`);
      continue;
    }

    if (typeof fromOrdinal !== "number" || !Number.isSafeInteger(fromOrdinal)) {
      errors.push(`Revision ${r}: invalid event fromOrdinal`);
      continue;
    }

    if (typeof toOrdinal !== "number" || !Number.isSafeInteger(toOrdinal)) {
      errors.push(`Revision ${r}: invalid event toOrdinal`);
      continue;
    }

    const prevSnap = snapshotMap.get(r - 1);
    if (prevSnap && fromOrdinal !== prevSnap.state.calendar.monthOrdinal) {
      errors.push(`Revision ${r}: event fromOrdinal ${fromOrdinal} does not match snapshot(${r - 1}).monthOrdinal ${prevSnap.state.calendar.monthOrdinal}`);
    }

    const expectedTo = advanceOrdinalFn(fromOrdinal, direction);
    if (toOrdinal !== expectedTo) {
      errors.push(`Revision ${r}: event toOrdinal ${toOrdinal} does not match advanceOrdinal(${fromOrdinal}, "${direction}") = ${expectedTo}`);
    }

    const currSnap = snapshotMap.get(r);
    if (currSnap && toOrdinal !== currSnap.state.calendar.monthOrdinal) {
      errors.push(`Revision ${r}: event toOrdinal ${toOrdinal} does not match snapshot(${r}).monthOrdinal ${currSnap.state.calendar.monthOrdinal}`);
    }

    if (rev.commandType === "move_month") {
      const expectedFp = moveMonthFingerprintFn(direction);
      if (rev.commandFingerprint !== expectedFp) {
        errors.push(`Revision ${r}: move_month fingerprint "${rev.commandFingerprint}" does not match expected "${expectedFp}"`);
      }
    } else if (rev.commandType === "legacy_month_change") {
      const expectedFp = migrationCommandFingerprintFn(r, direction);
      if (rev.commandFingerprint !== expectedFp) {
        errors.push(`Revision ${r}: legacy_month_change fingerprint "${rev.commandFingerprint}" does not match expected "${expectedFp}"`);
      }
    }
  }

  return errors;
}

export function analyzeHistoryControlInitialization(
  input: HistoryControlInitInput,
): HistoryControlInitResult {
  const { campaignId, campaignRevision, campaignState, revisions, events, snapshots, existingControlDocs } = input;

  // --- Duplicate control detection ---
  if (existingControlDocs.length > 1) {
    return {
      status: "invalid",
      errors: [`Found ${existingControlDocs.length} history control documents — expected at most 1 (corrupt state)`],
    };
  }

  const existingControl = existingControlDocs.length === 1 ? existingControlDocs[0] : null;

  // --- Basic campaign validation ---
  if (!Number.isSafeInteger(campaignRevision) || campaignRevision < 0) {
    return { status: "invalid", errors: [`campaignRevision ${campaignRevision} is not a non-negative safe integer`] };
  }

  const N = campaignRevision;

  // --- Revision records: unique, complete 1..N ---
  const errors: string[] = [];
  const revisionMap = new Map<number, InitializationRevisionInfo>();
  for (const rev of revisions) {
    if (revisionMap.has(rev.campaignRevision)) {
      errors.push(`Duplicate revision record: ${rev.campaignRevision}`);
    }
    revisionMap.set(rev.campaignRevision, rev);
  }

  for (let r = 1; r <= N; r++) {
    if (!revisionMap.has(r)) {
      errors.push(`Missing revision record: ${r}`);
    }
  }

  if (revisionMap.size !== N) {
    errors.push(`Expected ${N} revision records, found ${revisionMap.size}`);
  }

  // --- Events: group by revision ---
  const eventsByRev = new Map<number, InitializationEventInfo[]>();
  for (const evt of events) {
    const list = eventsByRev.get(evt.campaignRevision) ?? [];
    list.push(evt);
    eventsByRev.set(evt.campaignRevision, list);
  }

  // Check for orphan events outside revisions 1..N
  for (const [rev] of eventsByRev) {
    if (rev < 1 || rev > N) {
      errors.push(`Orphan event(s) at revision ${rev} outside valid range 1..${N}`);
    }
  }

  // Event index contiguity for each revision
  for (let r = 1; r <= N; r++) {
    const evts = eventsByRev.get(r);
    if (!evts || evts.length === 0) {
      errors.push(`Revision ${r} has no events`);
    } else {
      const sorted = [...evts].sort((a, b) => a.eventIndex - b.eventIndex);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].eventIndex !== i) {
          errors.push(`Revision ${r}: event indexes not contiguous (expected ${i}, got ${sorted[i].eventIndex})`);
          break;
        }
      }
    }
  }

  // --- Snapshots: unique, complete 0..N ---
  const snapshotMap = new Map<number, InitializationSnapshotInfo>();
  for (const snap of snapshots) {
    if (snapshotMap.has(snap.campaignRevision)) {
      errors.push(`Duplicate snapshot for revision: ${snap.campaignRevision}`);
    }
    snapshotMap.set(snap.campaignRevision, snap);
  }

  if (!snapshotMap.has(0)) {
    errors.push("Missing snapshot for revision 0 (initial state)");
  }

  for (let r = 1; r <= N; r++) {
    if (!snapshotMap.has(r)) {
      errors.push(`Missing snapshot for revision ${r}`);
    }
  }

  if (snapshotMap.size !== N + 1) {
    errors.push(`Expected ${N + 1} snapshots, found ${snapshotMap.size}`);
  }

  // --- Snapshot at N must deep-equal authoritative campaign state ---
  const snapshotN = snapshotMap.get(N);
  if (snapshotN) {
    if (!statesDeepEqual(snapshotN.state, campaignState)) {
      errors.push(`Snapshot at revision ${N} does not match authoritative campaign state`);
    }
  }

  // --- If structural errors, cannot proceed ---
  if (errors.length > 0) {
    return { status: "invalid", errors };
  }

  // ==================================================================
  // CASE B: existingControl !== null → verify against current history
  // ==================================================================
  if (existingControl !== null) {
    const replayEvents: ReplayEventInfo[] = [];
    for (let r = 1; r <= N; r++) {
      const rev = revisionMap.get(r);
      if (!rev) continue;
      if (!isLogicalStateCommandType(rev.commandType)) {
        const evts = eventsByRev.get(r);
        if (evts && evts.length > 0) {
          const evt = evts[0];
          replayEvents.push({
            campaignRevision: r,
            event: {
              type: evt.event.type,
              version: evt.event.version,
              data: {
                fromRevision: evt.event.data.fromRevision as number | undefined,
                targetRevision: evt.event.data.targetRevision as number | undefined,
              },
            },
          });
        }
      }
    }

    const verificationErrors = verifyHistoryControl({
      control: existingControl,
      campaignId,
      campaignRevision,
      campaignState,
      revisions: revisions.map((r) => ({ campaignRevision: r.campaignRevision, commandType: r.commandType })),
      events: replayEvents,
      snapshotRevisions: [...snapshotMap.keys()],
      snapshotAtUndoTop: snapshotMap.get(existingControl.undoStack[existingControl.undoStack.length - 1])?.state ?? null,
    });

    if (verificationErrors.length > 0) {
      return { status: "invalid", errors: verificationErrors.map((e) => `existing control: ${e}`) };
    }

    return {
      status: "already_applied",
      campaignId,
      undoStackLength: existingControl.undoStack.length,
      redoStackLength: existingControl.redoStack.length,
    };
  }

  // ==================================================================
  // CASE A: existingControl === null → initialization candidate
  // ==================================================================

  // All revisions must be logical-state (no undo/redo in pre-initialization history)
  const initErrors: string[] = [];
  for (const rev of revisions) {
    if (!isLogicalStateCommandType(rev.commandType)) {
      initErrors.push(`Revision ${rev.campaignRevision} has non-logical-state commandType "${rev.commandType}" — cannot initialize history control from mixed history`);
    }
  }
  if (initErrors.length > 0) {
    return { status: "invalid", errors: initErrors };
  }

  // Semantic event validation
  const semanticErrors = validateLogicalStateEventSemantics(
    revisionMap,
    eventsByRev,
    snapshotMap,
    N,
    (ordinal, direction) => advanceOrdinal(ordinal, direction) as number,
    moveMonthFingerprint,
    migrationCommandFingerprint,
  );
  if (semanticErrors.length > 0) {
    return { status: "invalid", errors: semanticErrors };
  }

  // Derive expected stacks: for linear pre-Undo history it's [0,1,...,N], []
  const expectedUndoStack: number[] = [];
  for (let r = 0; r <= N; r++) {
    expectedUndoStack.push(r);
  }

  return {
    status: "ready",
    campaignId,
    campaignRevision,
    undoStack: expectedUndoStack,
    redoStack: [],
  };
}

