import { describe, it, expect } from "vitest";
import {
  deriveUndoTransition,
  deriveRedoTransition,
  validateUndoTransactionCoherence,
  validateRedoTransactionCoherence,
  replayHistoryControl,
  verifyHistoryControl,
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

// States for ordinals 0..10
const STATES: CurrentCampaignState[] = Array.from({ length: 11 }, (_, i) => makeState(i));

// ============================================================
// deriveUndoTransition
// ============================================================

describe("deriveUndoTransition", () => {
  it("UNDO_UNAVAILABLE when undoStack has only initial entry", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0]),
        campaignRevision: 0,
        campaignState: STATES[0],
        targetSnapshotState: null,
        currentLogicalSnapshotState: STATES[0],
        targetRevisionCommandType: null,
      }, "camp-1");
    }, "UNDO_UNAVAILABLE");
  });

  it("linear A->B->C then undo returns state B with correct stacks and event", () => {
    // undoStack=[0,1,2,3], campaignRevision=3, state=STATES[3]
    const result = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(statesDeepEqual(result.nextState, STATES[2])).toBe(true);
    expect(result.nextUndoStack).toEqual([0, 1, 2]);
    expect(result.nextRedoStack).toEqual([3]);
    expect(result.fromRevision).toBe(3);
    expect(result.targetRevision).toBe(2);
    expect(result.event.type).toBe("undo_applied");
    expect(result.event.version).toBe(1);
    expect(result.event.data.fromRevision).toBe(3);
    expect(result.event.data.targetRevision).toBe(2);
  });

  it("undo with non-contiguous undoStack works (gaps from prior undos)", () => {
    // undoStack=[0,1,2,5], redoStack=[8], campaignRevision=10
    const result = deriveUndoTransition({
      control: makeControl([0, 1, 2, 5], [8]),
      campaignRevision: 10,
      campaignState: STATES[5],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[5],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(result.nextUndoStack).toEqual([0, 1, 2]);
    expect(result.nextRedoStack).toEqual([8, 5]);
    expect(result.fromRevision).toBe(5);
    expect(result.targetRevision).toBe(2);
  });

  it("CAMPAIGN_STATE_CORRUPT when current logical snapshot is missing", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: STATES[1],
        currentLogicalSnapshotState: null,
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("CAMPAIGN_STATE_CORRUPT when current logical snapshot != campaign state", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: STATES[1],
        currentLogicalSnapshotState: STATES[9], // mismatch
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("CAMPAIGN_STATE_CORRUPT when target snapshot is missing", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: null,
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("CAMPAIGN_STATE_CORRUPT when target revision is undo (non-logical-state)", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 5,
        campaignState: STATES[2],
        targetSnapshotState: STATES[1],
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: "undo",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("target revision 0 is valid (no commandType check needed)", () => {
    const result = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: STATES[1],
      targetSnapshotState: STATES[0],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: null,
    }, "camp-1");

    expect(result.nextUndoStack).toEqual([0]);
    expect(result.nextRedoStack).toEqual([1]);
    expect(result.targetRevision).toBe(0);
  });
});

// ============================================================
// deriveRedoTransition
// ============================================================

describe("deriveRedoTransition", () => {
  it("REDO_UNAVAILABLE when redoStack is empty", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: null,
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: null,
      }, "camp-1");
    }, "REDO_UNAVAILABLE");
  });

  it("redo returns correct state/stacks/event", () => {
    const result = deriveRedoTransition({
      control: makeControl([0, 1], [2]),
      campaignRevision: 3,
      campaignState: STATES[1],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(statesDeepEqual(result.nextState, STATES[2])).toBe(true);
    expect(result.nextUndoStack).toEqual([0, 1, 2]);
    expect(result.nextRedoStack).toEqual([]);
    expect(result.fromRevision).toBe(1);
    expect(result.targetRevision).toBe(2);
    expect(result.event.type).toBe("redo_applied");
    expect(result.event.version).toBe(1);
    expect(result.event.data.fromRevision).toBe(1);
    expect(result.event.data.targetRevision).toBe(2);
  });

  it("redo with multiple redo entries pops last", () => {
    // redoStack=[5,3] → target=3, pops to redoStack=[5]
    const result = deriveRedoTransition({
      control: makeControl([0, 1], [5, 3]),
      campaignRevision: 6,
      campaignState: STATES[1],
      targetSnapshotState: STATES[3],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(result.nextUndoStack).toEqual([0, 1, 3]);
    expect(result.nextRedoStack).toEqual([5]);
    expect(result.targetRevision).toBe(3);
  });

  it("CAMPAIGN_STATE_CORRUPT when target snapshot missing for redo", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: null,
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("CAMPAIGN_STATE_CORRUPT when target is non-logical-state command", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: STATES[2],
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: "redo",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });
});

// ============================================================
// Multiple undo/redo sequences
// ============================================================

describe("multiple undo/redo sequence", () => {
  // Simulate: A->B->C->Undo->Undo->Redo->Redo
  it("A->B->C->Undo->Undo->Redo->Redo returns through correct states", () => {
    // After A->B->C: undoStack=[0,1,2,3], redoStack=[], rev=3, state=STATES[3]

    // Undo #1: C->B
    const u1 = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(statesDeepEqual(u1.nextState, STATES[2])).toBe(true);
    expect(u1.nextUndoStack).toEqual([0, 1, 2]);
    expect(u1.nextRedoStack).toEqual([3]);

    // Undo #2: B->A (campaignRevision advances to 4 for audit)
    const u2 = deriveUndoTransition({
      control: makeControl(u1.nextUndoStack as number[], u1.nextRedoStack as number[]),
      campaignRevision: 4,
      campaignState: STATES[2],
      targetSnapshotState: STATES[1],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(statesDeepEqual(u2.nextState, STATES[1])).toBe(true);
    expect(u2.nextUndoStack).toEqual([0, 1]);
    expect(u2.nextRedoStack).toEqual([3, 2]);

    // Redo #1: A->B (campaignRevision=5)
    const r1 = deriveRedoTransition({
      control: makeControl(u2.nextUndoStack as number[], u2.nextRedoStack as number[]),
      campaignRevision: 5,
      campaignState: STATES[1],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(statesDeepEqual(r1.nextState, STATES[2])).toBe(true);
    expect(r1.nextUndoStack).toEqual([0, 1, 2]);
    expect(r1.nextRedoStack).toEqual([3]);

    // Redo #2: B->C (campaignRevision=6)
    const r2 = deriveRedoTransition({
      control: makeControl(r1.nextUndoStack as number[], r1.nextRedoStack as number[]),
      campaignRevision: 6,
      campaignState: STATES[2],
      targetSnapshotState: STATES[3],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(statesDeepEqual(r2.nextState, STATES[3])).toBe(true);
    expect(r2.nextUndoStack).toEqual([0, 1, 2, 3]);
    expect(r2.nextRedoStack).toEqual([]);
  });

  // Mixed: A,B,C,Undo,Undo,Redo,Undo,Redo,Redo
  it("complex mixed sequence navigates correctly", () => {
    // A,B,C: undo=[0,1,2,3], redo=[], state=3
    // Undo: undo=[0,1,2], redo=[3], state=2
    const s1 = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    // Undo: undo=[0,1], redo=[3,2], state=1
    const s2 = deriveUndoTransition({
      control: makeControl(s1.nextUndoStack as number[], s1.nextRedoStack as number[]),
      campaignRevision: 4,
      campaignState: STATES[2],
      targetSnapshotState: STATES[1],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    // Redo: undo=[0,1,2], redo=[3], state=2
    const s3 = deriveRedoTransition({
      control: makeControl(s2.nextUndoStack as number[], s2.nextRedoStack as number[]),
      campaignRevision: 5,
      campaignState: STATES[1],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    // Undo: undo=[0,1], redo=[3,2], state=1
    const s4 = deriveUndoTransition({
      control: makeControl(s3.nextUndoStack as number[], s3.nextRedoStack as number[]),
      campaignRevision: 6,
      campaignState: STATES[2],
      targetSnapshotState: STATES[1],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    // Redo: undo=[0,1,2], redo=[3], state=2
    const s5 = deriveRedoTransition({
      control: makeControl(s4.nextUndoStack as number[], s4.nextRedoStack as number[]),
      campaignRevision: 7,
      campaignState: STATES[1],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    // Redo: undo=[0,1,2,3], redo=[], state=3
    const s6 = deriveRedoTransition({
      control: makeControl(s5.nextUndoStack as number[], s5.nextRedoStack as number[]),
      campaignRevision: 8,
      campaignState: STATES[2],
      targetSnapshotState: STATES[3],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(statesDeepEqual(s6.nextState, STATES[3])).toBe(true);
    expect(s6.nextUndoStack).toEqual([0, 1, 2, 3]);
    expect(s6.nextRedoStack).toEqual([]);
  });
});

// ============================================================
// Branch: A->B->C->Undo->D clears redo
// ============================================================

describe("branching after undo", () => {
  it("A->B->C->Undo->D: revision C remains in immutable history, redo unavailable", () => {
    // After A->B->C->Undo: undo=[0,1,2], redo=[3], state=2
    const u1 = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(u1.nextUndoStack).toEqual([0, 1, 2]);
    expect(u1.nextRedoStack).toEqual([3]);

    // After D (moveMonth forward from state 2→3, new rev 5):
    // canonicalCommit with logical_state_append would set undo=[0,1,2,5], redo=[]
    // The pure helper doesn't do this (canonicalCommit does), but we verify redo becomes unavailable

    // Verify redo becomes unavailable after branch (redo cleared by moveMonth)
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1, 2, 5]), // after D committed
        campaignRevision: 5,
        campaignState: STATES[3],
        targetSnapshotState: null,
        currentLogicalSnapshotState: STATES[3],
        targetRevisionCommandType: null,
      }, "camp-1");
    }, "REDO_UNAVAILABLE");
  });

  it("after branch: undo D returns to B", () => {
    // After A->B->C->Undo->D: undo=[0,1,2,5], redo=[], state at 5=STATES[3]
    const u = deriveUndoTransition({
      control: makeControl([0, 1, 2, 5]),
      campaignRevision: 5,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(statesDeepEqual(u.nextState, STATES[2])).toBe(true);
    expect(u.nextUndoStack).toEqual([0, 1, 2]);
    expect(u.nextRedoStack).toEqual([5]);
  });

  it("after branch undo D: redo D returns to D state", () => {
    // undo=[0,1,2], redo=[5], state=STATES[2]
    const r = deriveRedoTransition({
      control: makeControl([0, 1, 2], [5]),
      campaignRevision: 6,
      campaignState: STATES[2],
      targetSnapshotState: STATES[3],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    expect(statesDeepEqual(r.nextState, STATES[3])).toBe(true);
    expect(r.nextUndoStack).toEqual([0, 1, 2, 5]);
    expect(r.nextRedoStack).toEqual([]);
  });
});

// ============================================================
// validateUndoTransactionCoherence
// ============================================================

describe("validateUndoTransactionCoherence", () => {
  it("accepts valid undo coherence", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 4,
    });
    expect(errors).toEqual([]);
  });

  it("detects fromRevision mismatch", () => {
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

  it("detects targetRevision mismatch", () => {
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

  it("detects wrong nextUndoStack", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1], // wrong
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("nextUndoStack"))).toBe(true);
  });

  it("detects wrong nextRedoStack", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [], // wrong
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("nextRedoStack"))).toBe(true);
  });

  it("detects state mismatch", () => {
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

  it("detects audit revision in undoStack", () => {
    // Use priorUndoStack that would produce nextUndoStack=[0,1,2,4] after removing last
    // but newAuditRevision=2 so 2 is in the nextUndoStack
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 2, // illegally matches a revision already in undoStack
    });
    expect(errors.some((e) => e.includes("audit revision") && e.includes("nextUndoStack"))).toBe(true);
  });

  it("detects audit revision in redoStack", () => {
    // newAuditRevision=3 is in the nextRedoStack [3]
    // All other fields are consistent so only the audit-revision check triggers
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[2],
      targetSnapshotState: STATES[2],
      newAuditRevision: 3,
    });
    expect(errors.some((e) => e.includes("audit revision") && e.includes("nextRedoStack"))).toBe(true);
  });
});

// ============================================================
// validateRedoTransactionCoherence
// ============================================================

describe("validateRedoTransactionCoherence", () => {
  it("accepts valid redo coherence", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 3 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[3],
      newAuditRevision: 4,
    });
    expect(errors).toEqual([]);
  });

  it("detects fromRevision mismatch", () => {
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

  it("detects targetRevision mismatch", () => {
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

  it("detects audit revision in stacks", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3, 4], // audit rev 4 in undo
      nextRedoStack: [],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 3 } },
      restoredState: STATES[3],
      targetSnapshotState: STATES[3],
      newAuditRevision: 4,
    });
    expect(errors.some((e) => e.includes("audit revision"))).toBe(true);
  });
});

// ============================================================
// Replay verification with undo/redo events
// ============================================================

describe("replay verification with undo/redo", () => {

  it("correctly replays A->B->C->Undo", () => {
    const result = replayHistoryControl({
      campaignRevision: 4,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "move_month" },
        { campaignRevision: 4, commandType: "undo" },
      ],
      events: [
        {
          campaignRevision: 4,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2]);
    expect(result.expectedRedoStack).toEqual([3]);
  });

  it("correctly replays A->B->C->Undo->Undo->Redo", () => {
    const result = replayHistoryControl({
      campaignRevision: 6,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "move_month" },
        { campaignRevision: 4, commandType: "undo" },
        { campaignRevision: 5, commandType: "undo" },
        { campaignRevision: 6, commandType: "redo" },
      ],
      events: [
        {
          campaignRevision: 4,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
        },
        {
          campaignRevision: 5,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
        {
          campaignRevision: 6,
          event: { type: "redo_applied", version: 1, data: { fromRevision: 1, targetRevision: 2 } },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2]);
    expect(result.expectedRedoStack).toEqual([3]);
  });

  it("detects incorrect undo fromRevision in replay", () => {
    const result = replayHistoryControl({
      campaignRevision: 4,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "move_month" },
        { campaignRevision: 4, commandType: "undo" },
      ],
      events: [
        {
          campaignRevision: 4,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 99, targetRevision: 2 } },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("fromRevision"))).toBe(true);
  });

  it("detects incorrect redo targetRevision in replay", () => {
    const result = replayHistoryControl({
      campaignRevision: 5,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "move_month" },
        { campaignRevision: 4, commandType: "undo" },
        { campaignRevision: 5, commandType: "redo" },
      ],
      events: [
        {
          campaignRevision: 4,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
        },
        {
          campaignRevision: 5,
          event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 99 } },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("targetRevision"))).toBe(true);
  });

  it("replays branch correctly: A->B->C->Undo->D", () => {
    const result = replayHistoryControl({
      campaignRevision: 5,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "move_month" },
        { campaignRevision: 4, commandType: "undo" },
        { campaignRevision: 5, commandType: "move_month" },
      ],
      events: [
        {
          campaignRevision: 4,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2, 5]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("detects stack/replay disagreement", () => {
    const errors = verifyHistoryControl({
      control: {
        historyControlVersion: 1,
        campaignId: "camp-1",
        undoStack: [0, 1, 2, 3], // wrong: should be [0,1,2] after undo
        redoStack: [],
      },
      campaignId: "camp-1",
      campaignRevision: 4,
      campaignState: STATES[2],
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "move_month" },
        { campaignRevision: 4, commandType: "undo" },
      ],
      events: [
        {
          campaignRevision: 4,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
        },
      ],
      snapshotRevisions: [0, 1, 2, 3, 4],
      snapshotAtUndoTop: STATES[3],
    });
    expect(errors.some((e: string) => e.includes("Replay-derived"))).toBe(true);
  });
});

// ============================================================
// Event construction
// ============================================================

describe("event construction", () => {
  it("undo event has correct shape", () => {
    const result = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(result.event).toEqual({
      type: "undo_applied",
      version: 1,
      data: { fromRevision: 3, targetRevision: 2 },
    });
  });

  it("redo event has correct shape", () => {
    const result = deriveRedoTransition({
      control: makeControl([0, 1], [3, 2]),
      campaignRevision: 5,
      campaignState: STATES[1],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(result.event).toEqual({
      type: "redo_applied",
      version: 1,
      data: { fromRevision: 1, targetRevision: 2 },
    });
  });
});

// ============================================================
// Normal gameplay after undo
// ============================================================

describe("gameplay after undo uses undone state", () => {
  it("undo restores target state that becomes base for next command", () => {
    // After A(0→1)->B(1→2)->C(2→3)->Undo: state=STATES[2], undo=[0,1,2], redo=[3]
    const result = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");

    // The nextState IS the authoritative base for the next moveMonth
    expect(result.nextState.calendar.monthOrdinal).toBe(2);
    // After canonicalCommit with logical_state_append: undo=[0,1,2,newRev], redo=[]
    // This is handled by canonicalCommit, not the pure helper
  });
});

// ============================================================
// Corruption scenarios
// ============================================================

describe("corruption detection", () => {
  it("malformed control (empty undoStack) throws CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: {
          historyControlVersion: 1,
          campaignId: "camp-1",
          undoStack: [],
          redoStack: [],
        },
        campaignRevision: 0,
        campaignState: STATES[0],
        targetSnapshotState: null,
        currentLogicalSnapshotState: STATES[0],
        targetRevisionCommandType: null,
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("control with wrong campaignId throws CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: {
          historyControlVersion: 1,
          campaignId: "wrong-camp",
          undoStack: [0, 1],
          redoStack: [],
        },
        campaignRevision: 1,
        campaignState: STATES[1],
        targetSnapshotState: STATES[0],
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: null,
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("non-strictly-increasing undoStack throws CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: {
          historyControlVersion: 1,
          campaignId: "camp-1",
          undoStack: [0, 2, 1],
          redoStack: [],
        },
        campaignRevision: 2,
        campaignState: STATES[1],
        targetSnapshotState: STATES[2],
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });
});
