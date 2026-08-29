import { describe, it, expect } from "vitest";
import {
  deriveUndoTransition,
  deriveRedoTransition,
  validateUndoTransactionCoherence,
  validateRedoTransactionCoherence,
  DomainError,
  statesDeepEqual,
  type CampaignHistoryControlV1,
  type CurrentCampaignState,
} from "../shared/domain";

// --- Helpers ---

function makeState(monthOrdinal: number): CurrentCampaignState {
  return {
    schemaVersion: 2,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: monthOrdinal as any },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [],
    wizards: [],
    pactSeats: {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    },
  };
}

function makeControl(
  undoStack: number[],
  redoStack: number[] = [],
): CampaignHistoryControlV1 {
  return {
    historyControlVersion: 1,
    campaignId: "camp-1",
    undoStack,
    redoStack,
  };
}

function assertDomainError(fn: () => unknown, code: string): DomainError {
  try {
    fn();
    throw new Error(`Expected DomainError(${code}) but no error was thrown`);
  } catch (e) {
    if (!(e instanceof DomainError)) {
      throw new Error(`Expected DomainError(${code}) but got: ${e}`);
    }
    expect(e.code).toBe(code);
    return e;
  }
}

const STATES: CurrentCampaignState[] = Array.from({ length: 11 }, (_, i) => makeState(i));

// ============================================================
// Fix 1: Missing target revision record must be corruption
// ============================================================

describe("deriveUndoTransition — missing revision record rejection", () => {
  it("nonzero undo target with null commandType -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: STATES[1],
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: null, // missing record
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("undo to revision 0 with null commandType remains legal", () => {
    const result = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: STATES[1],
      targetSnapshotState: STATES[0],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: null, // no record for revision 0 is normal
    }, "camp-1");
    expect(result.targetRevision).toBe(0);
    expect(statesDeepEqual(result.nextState, STATES[0])).toBe(true);
  });
});

describe("deriveRedoTransition — missing revision record rejection", () => {
  it("redo target with null commandType -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: STATES[2],
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: null, // missing record
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });
});

// ============================================================
// Fix 2: Central coherence verification tests (pure domain layer)
// These validate the coherence helpers used by canonicalCommit.
// ============================================================

describe("validateUndoTransactionCoherence — central verification", () => {
  it("rejects wrong fromRevision", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 99, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("fromRevision"))).toBe(true);
  });

  it("rejects wrong targetRevision", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 99 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("targetRevision"))).toBe(true);
  });

  it("rejects wrong proposed undo stacks", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1], // wrong: should be [0,1,2]
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("nextUndoStack"))).toBe(true);
  });

  it("rejects nextState differing from target snapshot", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[9], // mismatch
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("deep-equal"))).toBe(true);
  });

  it("rejects new audit revision appearing in undo stack", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 2, // collision with undoStack
    });
    expect(errors.some((e) => e.includes("audit revision"))).toBe(true);
  });
});

describe("validateRedoTransactionCoherence — central verification", () => {
  it("rejects wrong fromRevision", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 99, targetRevision: 3 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[3],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("fromRevision"))).toBe(true);
  });

  it("rejects wrong targetRevision", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 99 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[3],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("targetRevision"))).toBe(true);
  });

  it("rejects wrong proposed redo stacks", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [3], // wrong: should be []
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 3 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[3],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("nextRedoStack"))).toBe(true);
  });

  it("rejects nextState differing from target snapshot", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 3 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[9], // mismatch
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("deep-equal"))).toBe(true);
  });

  it("rejects new audit revision appearing in redo stack", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [4, 3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [4],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 3 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[3],
      newAuditRevision: 4, // collision with redoStack
    });
    expect(errors.some((e) => e.includes("audit revision"))).toBe(true);
  });
});
