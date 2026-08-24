import { describe, it, expect } from "vitest";
import {
  validateHistoryControlStructure,
  replayHistoryControl,
  verifyHistoryControl,
  isLogicalStateCommandType,
  isHistoryNavigationCommandType,
  undoFingerprint,
  redoFingerprint,
  CURRENT_HISTORY_CONTROL_VERSION,
  analyzeHistoryControlInitialization,
  statesDeepEqual,
  type CampaignHistoryControlV1,
  type HistoryControlValidationInput,
  type HistoryReplayInput,
  type HistoryControlVerificationInput,
  type HistoryControlInitInput,
  type HistoryControlInitResult,
  type SerializableCampaignState,
  type InitializationRevisionInfo,
  type InitializationEventInfo,
  type InitializationSnapshotInfo,
} from "../shared/domain";
import type { CampaignCommandType } from "../shared/domain/commands";
import { moveMonthFingerprint, migrationCommandFingerprint } from "../shared/domain/command-ids";

// --- Command Classification ---

describe("isLogicalStateCommandType", () => {
  it("returns true for move_month", () => {
    expect(isLogicalStateCommandType("move_month")).toBe(true);
  });

  it("returns true for legacy_month_change", () => {
    expect(isLogicalStateCommandType("legacy_month_change")).toBe(true);
  });

  it("returns false for undo", () => {
    expect(isLogicalStateCommandType("undo")).toBe(false);
  });

  it("returns false for redo", () => {
    expect(isLogicalStateCommandType("redo")).toBe(false);
  });
});

describe("isHistoryNavigationCommandType", () => {
  it("returns true for undo", () => {
    expect(isHistoryNavigationCommandType("undo")).toBe(true);
  });

  it("returns true for redo", () => {
    expect(isHistoryNavigationCommandType("redo")).toBe(true);
  });

  it("returns false for move_month", () => {
    expect(isHistoryNavigationCommandType("move_month")).toBe(false);
  });

  it("returns false for legacy_month_change", () => {
    expect(isHistoryNavigationCommandType("legacy_month_change")).toBe(false);
  });
});

// --- Fingerprints ---

describe("undoFingerprint", () => {
  it("produces correct format", () => {
    expect(undoFingerprint(5)).toBe("undo:v1:expectedRevision=5");
  });

  it("works with 0", () => {
    expect(undoFingerprint(0)).toBe("undo:v1:expectedRevision=0");
  });

  it("throws on non-safe-integer", () => {
    expect(() => undoFingerprint(1.5)).toThrow();
    expect(() => undoFingerprint(NaN)).toThrow();
    expect(() => undoFingerprint(Infinity)).toThrow();
    expect(() => undoFingerprint(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  it("throws on negative", () => {
    expect(() => undoFingerprint(-1)).toThrow();
  });
});

describe("redoFingerprint", () => {
  it("produces correct format", () => {
    expect(redoFingerprint(3)).toBe("redo:v1:expectedRevision=3");
  });

  it("throws on non-safe-integer", () => {
    expect(() => redoFingerprint(1.5)).toThrow();
    expect(() => redoFingerprint(NaN)).toThrow();
  });

  it("throws on negative", () => {
    expect(() => redoFingerprint(-1)).toThrow();
  });
});

// --- validateHistoryControlStructure ---

describe("validateHistoryControlStructure", () => {
  const baseControl: CampaignHistoryControlV1 = {
    historyControlVersion: 1,
    campaignId: "camp-1",
    undoStack: [0, 1, 2, 3],
    redoStack: [],
  };

  function makeInput(
    overrides: Partial<CampaignHistoryControlV1> = {},
    campaignRevision = 3,
  ): HistoryControlValidationInput {
    return {
      control: { ...baseControl, ...overrides },
      campaignId: "camp-1",
      campaignRevision,
    };
  }

  it("accepts valid control with empty redo", () => {
    const errors = validateHistoryControlStructure(makeInput());
    expect(errors).toEqual([]);
  });

  it("accepts valid control with non-empty redo", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 1], redoStack: [3, 2] }, 3),
    );
    expect(errors).toEqual([]);
  });

  it("rejects wrong version", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ historyControlVersion: 2 as any }),
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("historyControlVersion");
  });

  it("rejects campaignId mismatch", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ campaignId: "other" }),
    );
    expect(errors.some((e) => e.includes("campaignId"))).toBe(true);
  });

  it("rejects empty undoStack", () => {
    const errors = validateHistoryControlStructure(makeInput({ undoStack: [] }));
    expect(errors.some((e) => e.includes("non-empty"))).toBe(true);
  });

  it("rejects undoStack[0] != 0", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [1, 2, 3] }),
    );
    expect(errors.some((e) => e.includes("undoStack[0] must be 0"))).toBe(true);
  });

  it("rejects non-strictly-increasing undoStack", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 2, 2, 3] }),
    );
    expect(errors.some((e) => e.includes("not strictly increasing"))).toBe(true);
  });

  it("rejects non-strictly-decreasing redoStack", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 1], redoStack: [2, 3] }, 3),
    );
    expect(errors.some((e) => e.includes("not strictly decreasing"))).toBe(true);
  });

  it("rejects 0 in redoStack", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0], redoStack: [0] }, 1),
    );
    expect(errors.some((e) => e.includes("never legal in redoStack"))).toBe(true);
  });

  it("rejects redo entries <= undoStack top", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 2], redoStack: [1] }, 3),
    );
    expect(errors.some((e) => e.includes("not greater than undoStack top"))).toBe(true);
  });

  it("rejects entries exceeding campaignRevision", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 1, 5] }, 3),
    );
    expect(errors.some((e) => e.includes("exceeds campaignRevision"))).toBe(true);
  });

  it("rejects duplicates in undoStack", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 1, 1, 2] }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects revision in both stacks", () => {
    const errors = validateHistoryControlStructure(
      makeInput({ undoStack: [0, 1], redoStack: [3, 1] }, 3),
    );
    expect(errors.some((e) => e.includes("appears in both"))).toBe(true);
  });
});

// --- replayHistoryControl ---

describe("replayHistoryControl", () => {
  it("builds correct undoStack for all logical-state commands", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 3,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "legacy_month_change" },
        { campaignRevision: 3, commandType: "move_month" },
      ],
      events: [],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2, 3]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("handles undo correctly", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 3,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "undo" },
      ],
      events: [
        {
          campaignRevision: 3,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
      ],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1]);
    expect(result.expectedRedoStack).toEqual([2]);
  });

  it("handles redo correctly", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 4,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "undo" },
        { campaignRevision: 4, commandType: "redo" },
      ],
      events: [
        {
          campaignRevision: 3,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
        {
          campaignRevision: 4,
          event: { type: "redo_applied", version: 1, data: { fromRevision: 1, targetRevision: 2 } },
        },
      ],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("logical-state command after undo clears redo", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 4,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
        { campaignRevision: 3, commandType: "undo" },
        { campaignRevision: 4, commandType: "move_month" },
      ],
      events: [
        {
          campaignRevision: 3,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
      ],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 4]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("reports error for missing revision record", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 2,
      revisions: [{ campaignRevision: 1, commandType: "move_month" }],
      events: [],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing revision record"))).toBe(true);
  });

  it("reports error for undo with empty stack", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 1,
      revisions: [{ campaignRevision: 1, commandType: "undo" }],
      events: [
        {
          campaignRevision: 1,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 0, targetRevision: 0 } },
        },
      ],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("undo impossible"))).toBe(true);
  });

  it("reports error for redo with empty stack", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 2,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "redo" },
      ],
      events: [
        {
          campaignRevision: 2,
          event: { type: "redo_applied", version: 1, data: { fromRevision: 1, targetRevision: 0 } },
        },
      ],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("redo impossible"))).toBe(true);
  });

  it("reports error for undo event with wrong fromRevision", () => {
    const input: HistoryReplayInput = {
      campaignRevision: 2,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "undo" },
      ],
      events: [
        {
          campaignRevision: 2,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 99, targetRevision: 0 } },
        },
      ],
    };
    const result = replayHistoryControl(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("fromRevision"))).toBe(true);
  });
});

// --- verifyHistoryControl (integration) ---

describe("verifyHistoryControl", () => {
  const baseState: SerializableCampaignState = {
    schemaVersion: 1,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: 2 },
  };

  function makeVerificationInput(
    overrides: Partial<HistoryControlVerificationInput> = {},
  ): HistoryControlVerificationInput {
    return {
      control: {
        historyControlVersion: 1,
        campaignId: "camp-1",
        undoStack: [0, 1, 2],
        redoStack: [],
      },
      campaignId: "camp-1",
      campaignRevision: 2,
      campaignState: baseState,
      revisions: [
        { campaignRevision: 1, commandType: "move_month" },
        { campaignRevision: 2, commandType: "move_month" },
      ],
      events: [],
      snapshotRevisions: [0, 1, 2],
      snapshotAtUndoTop: baseState,
      ...overrides,
    };
  }

  it("reports no errors for valid state", () => {
    const errors = verifyHistoryControl(makeVerificationInput());
    expect(errors).toEqual([]);
  });

  it("reports missing snapshot for undo stack entry", () => {
    const errors = verifyHistoryControl(makeVerificationInput({ snapshotRevisions: [0, 2] }));
    expect(errors.some((e) => e.includes("undoStack references revision 1") && e.includes("no snapshot"))).toBe(true);
  });

  it("reports state mismatch between snapshot at undo top and campaign state", () => {
    const differentState: SerializableCampaignState = {
      schemaVersion: 1,
      ruleset: { id: "seven_part_pact_draft4", version: 1 },
      calendar: { monthOrdinal: 99 },
    };
    const errors = verifyHistoryControl(
      makeVerificationInput({ snapshotAtUndoTop: differentState }),
    );
    expect(errors.some((e) => e.includes("does not match authoritative"))).toBe(true);
  });

  it("reports replay mismatch", () => {
    const errors = verifyHistoryControl(
      makeVerificationInput({
        control: {
          historyControlVersion: 1,
          campaignId: "camp-1",
          undoStack: [0, 2],
          redoStack: [],
        },
      }),
    );
    expect(errors.some((e) => e.includes("Replay-derived undoStack"))).toBe(true);
  });

  it("reports non-logical-state command in undoStack", () => {
    const errors = verifyHistoryControl(
      makeVerificationInput({
        control: {
          historyControlVersion: 1,
          campaignId: "camp-1",
          undoStack: [0, 1, 2],
          redoStack: [],
        },
        revisions: [
          { campaignRevision: 1, commandType: "undo" },
          { campaignRevision: 2, commandType: "move_month" },
        ],
      }),
    );
    expect(errors.some((e) => e.includes("history-navigation commandType"))).toBe(true);
  });
});

// --- CURRENT_HISTORY_CONTROL_VERSION ---

describe("CURRENT_HISTORY_CONTROL_VERSION", () => {
  it("is 1", () => {
    expect(CURRENT_HISTORY_CONTROL_VERSION).toBe(1);
  });
});

// --- statesDeepEqual ---

describe("statesDeepEqual", () => {
  const s1: SerializableCampaignState = {
    schemaVersion: 1,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: 5 },
  };

  it("returns true for identical states", () => {
    expect(statesDeepEqual(s1, { ...s1 })).toBe(true);
  });

  it("returns false for different monthOrdinal", () => {
    expect(statesDeepEqual(s1, { ...s1, calendar: { monthOrdinal: 6 } })).toBe(false);
  });

  it("returns false for different schemaVersion", () => {
    expect(statesDeepEqual(s1, { ...s1, schemaVersion: 2 })).toBe(false);
  });

  it("returns false for different ruleset", () => {
    expect(statesDeepEqual(s1, { ...s1, ruleset: { id: "other", version: 1 } })).toBe(false);
  });
});

// --- analyzeHistoryControlInitialization ---

describe("analyzeHistoryControlInitialization", () => {
  const baseState: SerializableCampaignState = {
    schemaVersion: 1,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: 3 },
  };

  function makeSnap(rev: number, monthOrdinal: number): InitializationSnapshotInfo {
    return {
      campaignRevision: rev,
      state: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal } },
    };
  }

  function makeRevision(
    rev: number,
    commandType: CampaignCommandType = "move_month",
    fingerprint?: string,
  ): InitializationRevisionInfo {
    const fp = fingerprint ?? (commandType === "move_month"
      ? moveMonthFingerprint("forward")
      : migrationCommandFingerprint(rev, "forward"));
    return { campaignRevision: rev, commandType, commandFingerprint: fp };
  }

  function makeMonthEvent(
    rev: number,
    fromOrdinal: number,
    direction: "forward" | "backward" = "forward",
    idx: number = 0,
  ): InitializationEventInfo {
    const toOrdinal = direction === "forward" ? fromOrdinal + 1 : fromOrdinal - 1;
    return {
      campaignRevision: rev,
      eventIndex: idx,
      event: {
        type: "month_changed",
        version: 1,
        data: { direction, fromOrdinal, toOrdinal },
      },
    };
  }

  function makeValidInput(N: number = 3): HistoryControlInitInput {
    const revisions: InitializationRevisionInfo[] = [];
    const events: InitializationEventInfo[] = [];
    const snapshots: InitializationSnapshotInfo[] = [makeSnap(0, 0)];
    for (let r = 1; r <= N; r++) {
      revisions.push(makeRevision(r));
      events.push(makeMonthEvent(r, r - 1, "forward"));
      snapshots.push(makeSnap(r, r));
    }
    return {
      campaignId: "camp-1",
      campaignRevision: N,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: N } },
      revisions,
      events,
      snapshots,
      existingControlDocs: [],
    };
  }

  // --- READY state ---

  it("returns ready with undoStack [0..N] for valid linear history", () => {
    const result = analyzeHistoryControlInitialization(makeValidInput(3));
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.undoStack).toEqual([0, 1, 2, 3]);
      expect(result.redoStack).toEqual([]);
      expect(result.campaignId).toBe("camp-1");
      expect(result.campaignRevision).toBe(3);
    }
  });

  it("returns ready for revision 0 (empty history)", () => {
    const result = analyzeHistoryControlInitialization({
      campaignId: "camp-1",
      campaignRevision: 0,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 0 } },
      revisions: [],
      events: [],
      snapshots: [makeSnap(0, 0)],
      existingControlDocs: [],
    });
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.undoStack).toEqual([0]);
      expect(result.redoStack).toEqual([]);
    }
  });

  it("same authoritative history deterministically derives [0..N], []", () => {
    const input = makeValidInput(5);
    const r1 = analyzeHistoryControlInitialization(input);
    const r2 = analyzeHistoryControlInitialization(input);
    expect(r1).toEqual(r2);
    if (r1.status === "ready") {
      expect(r1.undoStack).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  // --- Rejections ---

  it("rejects missing snapshot 0", () => {
    const input = makeValidInput(2);
    const withoutSnap0 = {
      ...input,
      snapshots: input.snapshots.filter((s) => s.campaignRevision !== 0),
    };
    const result = analyzeHistoryControlInitialization(withoutSnap0);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("revision 0"))).toBe(true);
    }
  });

  it("rejects missing intermediate snapshot", () => {
    const input = makeValidInput(3);
    const withoutSnap2 = {
      ...input,
      snapshots: input.snapshots.filter((s) => s.campaignRevision !== 2),
    };
    const result = analyzeHistoryControlInitialization(withoutSnap2);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("revision 2"))).toBe(true);
    }
  });

  it("rejects duplicate snapshot", () => {
    const input = makeValidInput(2);
    const withDupe = {
      ...input,
      snapshots: [...input.snapshots, makeSnap(1, 1)],
    };
    const result = analyzeHistoryControlInitialization(withDupe);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("Duplicate snapshot"))).toBe(true);
    }
  });

  it("rejects missing revision record", () => {
    const input = makeValidInput(3);
    const withoutRev2 = {
      ...input,
      revisions: input.revisions.filter((r) => r.campaignRevision !== 2),
    };
    const result = analyzeHistoryControlInitialization(withoutRev2);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("Missing revision record: 2"))).toBe(true);
    }
  });

  it("rejects missing event history", () => {
    const input = makeValidInput(3);
    const withoutEvents = {
      ...input,
      events: input.events.filter((e) => e.campaignRevision !== 2),
    };
    const result = analyzeHistoryControlInitialization(withoutEvents);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("Revision 2 has no events"))).toBe(true);
    }
  });

  it("rejects invalid event indexes", () => {
    const input = makeValidInput(2);
    const withBadIdx = {
      ...input,
      events: input.events.map((e) =>
        e.campaignRevision === 2 ? { ...e, eventIndex: 5 } : e,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadIdx);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("event indexes not contiguous"))).toBe(true);
    }
  });

  it("rejects orphan event outside valid range", () => {
    const input = makeValidInput(2);
    const withOrphan = {
      ...input,
      events: [...input.events, makeMonthEvent(99, 98)],
    };
    const result = analyzeHistoryControlInitialization(withOrphan);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("Orphan event") && e.includes("99"))).toBe(true);
    }
  });

  it("rejects current campaign state != snapshot N", () => {
    const input = makeValidInput(3);
    const withBadState = {
      ...input,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 99 } },
    };
    const result = analyzeHistoryControlInitialization(withBadState);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("does not match authoritative"))).toBe(true);
    }
  });

  it("rejects undo command already in pre-migration history", () => {
    const input = makeValidInput(3);
    const withUndo = {
      ...input,
      revisions: input.revisions.map((r) =>
        r.campaignRevision === 2
          ? { ...r, commandType: "undo" as const, commandFingerprint: "undo:v1:expectedRevision=1" }
          : r,
      ),
    };
    const result = analyzeHistoryControlInitialization(withUndo);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("non-logical-state"))).toBe(true);
    }
  });

  it("rejects redo command already in pre-migration history", () => {
    const input = makeValidInput(3);
    const withRedo = {
      ...input,
      revisions: input.revisions.map((r) =>
        r.campaignRevision === 3
          ? { ...r, commandType: "redo" as const, commandFingerprint: "redo:v1:expectedRevision=2" }
          : r,
      ),
    };
    const result = analyzeHistoryControlInitialization(withRedo);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("non-logical-state"))).toBe(true);
    }
  });

  it("rejects non-safe-integer campaignRevision", () => {
    const input = makeValidInput(3);
    const bad = { ...input, campaignRevision: -1 };
    const result = analyzeHistoryControlInitialization(bad);
    expect(result.status).toBe("invalid");
  });

  // --- Semantic event validation (CASE A) ---

  it("rejects wrong event type", () => {
    const input = makeValidInput(2);
    const withBadType = {
      ...input,
      events: input.events.map((e) =>
        e.campaignRevision === 1
          ? { ...e, event: { ...e.event, type: "wrong_type" } }
          : e,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadType);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("month_changed") && e.includes("wrong_type"))).toBe(true);
    }
  });

  it("rejects wrong event version", () => {
    const input = makeValidInput(2);
    const withBadVer = {
      ...input,
      events: input.events.map((e) =>
        e.campaignRevision === 1
          ? { ...e, event: { ...e.event, version: 99 } }
          : e,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadVer);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("version 1") && e.includes("99"))).toBe(true);
    }
  });

  it("rejects extra event for a revision", () => {
    const input = makeValidInput(2);
    const extraEvt = makeMonthEvent(1, 0, "forward", 1);
    const withExtra = {
      ...input,
      events: [...input.events, extraEvt],
    };
    const result = analyzeHistoryControlInitialization(withExtra);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("exactly 1 event"))).toBe(true);
    }
  });

  it("rejects fromOrdinal mismatch with previous snapshot", () => {
    const input = makeValidInput(2);
    const withBadFrom = {
      ...input,
      events: input.events.map((e) =>
        e.campaignRevision === 2
          ? makeMonthEvent(2, 99, "forward")
          : e,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadFrom);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("fromOrdinal"))).toBe(true);
    }
  });

  it("rejects toOrdinal mismatch with advanceOrdinal", () => {
    const input = makeValidInput(2);
    const badEvt: InitializationEventInfo = {
      campaignRevision: 1,
      eventIndex: 0,
      event: {
        type: "month_changed",
        version: 1,
        data: { direction: "forward", fromOrdinal: 0, toOrdinal: 5 },
      },
    };
    const withBadTo = {
      ...input,
      events: input.events.map((e) =>
        e.campaignRevision === 1 ? badEvt : e,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadTo);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("toOrdinal") && e.includes("advanceOrdinal"))).toBe(true);
    }
  });

  it("rejects snapshot transition mismatch", () => {
    const input = makeValidInput(2);
    const withBadSnap = {
      ...input,
      snapshots: input.snapshots.map((s) =>
        s.campaignRevision === 1 ? makeSnap(1, 99) : s,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadSnap);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("toOrdinal") && e.includes("snapshot"))).toBe(true);
    }
  });

  it("rejects move_month fingerprint mismatch", () => {
    const input = makeValidInput(2);
    const withBadFp = {
      ...input,
      revisions: input.revisions.map((r) =>
        r.campaignRevision === 1
          ? { ...r, commandFingerprint: "move_month:v1:backward" }
          : r,
      ),
    };
    const result = analyzeHistoryControlInitialization(withBadFp);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("fingerprint"))).toBe(true);
    }
  });

  it("accepts mixed legacy_month_change + move_month history as READY", () => {
    const result = analyzeHistoryControlInitialization({
      campaignId: "camp-1",
      campaignRevision: 3,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } },
      revisions: [
        makeRevision(1, "legacy_month_change", migrationCommandFingerprint(1, "forward")),
        makeRevision(2, "move_month", moveMonthFingerprint("forward")),
        makeRevision(3, "legacy_month_change", migrationCommandFingerprint(3, "forward")),
      ],
      events: [
        makeMonthEvent(1, 0, "forward"),
        makeMonthEvent(2, 1, "forward"),
        makeMonthEvent(3, 2, "forward"),
      ],
      snapshots: [makeSnap(0, 0), makeSnap(1, 1), makeSnap(2, 2), makeSnap(3, 3)],
      existingControlDocs: [],
    });
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.undoStack).toEqual([0, 1, 2, 3]);
      expect(result.redoStack).toEqual([]);
    }
  });

  // --- Existing control: already_applied (CASE B) ---

  it("valid existing control (linear) returns already_applied", () => {
    const input = makeValidInput(3);
    const withControl = {
      ...input,
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "camp-1",
        undoStack: [0, 1, 2, 3],
        redoStack: [],
      }],
    };
    const result = analyzeHistoryControlInitialization(withControl);
    expect(result.status).toBe("already_applied");
    if (result.status === "already_applied") {
      expect(result.undoStackLength).toBe(4);
      expect(result.redoStackLength).toBe(0);
    }
  });

  it("valid existing control with undo returns already_applied", () => {
    const result = analyzeHistoryControlInitialization({
      campaignId: "camp-1",
      campaignRevision: 3,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 1 } },
      revisions: [
        makeRevision(1, "move_month"),
        makeRevision(2, "move_month"),
        makeRevision(3, "undo", "undo:v1:expectedRevision=2"),
      ],
      events: [
        makeMonthEvent(1, 0, "forward"),
        makeMonthEvent(2, 1, "forward"),
        {
          campaignRevision: 3, eventIndex: 0,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
      ],
      snapshots: [makeSnap(0, 0), makeSnap(1, 1), makeSnap(2, 2), makeSnap(3, 1)],
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "camp-1",
        undoStack: [0, 1],
        redoStack: [2],
      }],
    });
    expect(result.status).toBe("already_applied");
    if (result.status === "already_applied") {
      expect(result.undoStackLength).toBe(2);
      expect(result.redoStackLength).toBe(1);
    }
  });

  it("valid existing control with undo+redo returns already_applied", () => {
    const result = analyzeHistoryControlInitialization({
      campaignId: "camp-1",
      campaignRevision: 4,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 2 } },
      revisions: [
        makeRevision(1, "move_month"),
        makeRevision(2, "move_month"),
        makeRevision(3, "undo", "undo:v1:expectedRevision=2"),
        makeRevision(4, "redo", "redo:v1:expectedRevision=1"),
      ],
      events: [
        makeMonthEvent(1, 0, "forward"),
        makeMonthEvent(2, 1, "forward"),
        {
          campaignRevision: 3, eventIndex: 0,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
        {
          campaignRevision: 4, eventIndex: 0,
          event: { type: "redo_applied", version: 1, data: { fromRevision: 1, targetRevision: 2 } },
        },
      ],
      snapshots: [makeSnap(0, 0), makeSnap(1, 1), makeSnap(2, 2), makeSnap(3, 1), makeSnap(4, 2)],
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "camp-1",
        undoStack: [0, 1, 2],
        redoStack: [],
      }],
    });
    expect(result.status).toBe("already_applied");
    if (result.status === "already_applied") {
      expect(result.undoStackLength).toBe(3);
      expect(result.redoStackLength).toBe(0);
    }
  });

  it("existing control with invalid undo_applied fromRevision returns invalid", () => {
    const result = analyzeHistoryControlInitialization({
      campaignId: "camp-1",
      campaignRevision: 3,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 1 } },
      revisions: [
        makeRevision(1, "move_month"),
        makeRevision(2, "move_month"),
        makeRevision(3, "undo", "undo:v1:expectedRevision=2"),
      ],
      events: [
        makeMonthEvent(1, 0, "forward"),
        makeMonthEvent(2, 1, "forward"),
        {
          campaignRevision: 3, eventIndex: 0,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 99, targetRevision: 1 } },
        },
      ],
      snapshots: [makeSnap(0, 0), makeSnap(1, 1), makeSnap(2, 2), makeSnap(3, 1)],
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "camp-1",
        undoStack: [0, 1],
        redoStack: [2],
      }],
    });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("fromRevision"))).toBe(true);
    }
  });

  it("existing control with invalid redo_applied targetRevision returns invalid", () => {
    const result = analyzeHistoryControlInitialization({
      campaignId: "camp-1",
      campaignRevision: 4,
      campaignState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 2 } },
      revisions: [
        makeRevision(1, "move_month"),
        makeRevision(2, "move_month"),
        makeRevision(3, "undo", "undo:v1:expectedRevision=2"),
        makeRevision(4, "redo", "redo:v1:expectedRevision=1"),
      ],
      events: [
        makeMonthEvent(1, 0, "forward"),
        makeMonthEvent(2, 1, "forward"),
        {
          campaignRevision: 3, eventIndex: 0,
          event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } },
        },
        {
          campaignRevision: 4, eventIndex: 0,
          event: { type: "redo_applied", version: 1, data: { fromRevision: 1, targetRevision: 99 } },
        },
      ],
      snapshots: [makeSnap(0, 0), makeSnap(1, 1), makeSnap(2, 2), makeSnap(3, 1), makeSnap(4, 2)],
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "camp-1",
        undoStack: [0, 1, 2],
        redoStack: [],
      }],
    });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("targetRevision"))).toBe(true);
    }
  });

  it("existing control with persisted stack != replay returns invalid", () => {
    const input = makeValidInput(3);
    const withBadControl = {
      ...input,
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "camp-1",
        undoStack: [0, 2],
        redoStack: [],
      }],
    };
    const result = analyzeHistoryControlInitialization(withBadControl);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("existing control"))).toBe(true);
    }
  });

  it("existing control with wrong campaignId returns invalid", () => {
    const input = makeValidInput(3);
    const withBadControl = {
      ...input,
      existingControlDocs: [{
        historyControlVersion: 1 as const,
        campaignId: "wrong-camp",
        undoStack: [0, 1, 2, 3],
        redoStack: [],
      }],
    };
    const result = analyzeHistoryControlInitialization(withBadControl);
    expect(result.status).toBe("invalid");
  });

  it("existing control with wrong version returns invalid", () => {
    const input = makeValidInput(3);
    const withBadControl = {
      ...input,
      existingControlDocs: [{
        historyControlVersion: 99 as any,
        campaignId: "camp-1",
        undoStack: [0, 1, 2, 3],
        redoStack: [],
      }],
    };
    const result = analyzeHistoryControlInitialization(withBadControl);
    expect(result.status).toBe("invalid");
  });

  // --- Duplicate control documents ---

  it("duplicate control documents returns invalid", () => {
    const input = makeValidInput(3);
    const ctl: CampaignHistoryControlV1 = {
      historyControlVersion: 1,
      campaignId: "camp-1",
      undoStack: [0, 1, 2, 3],
      redoStack: [],
    };
    const withDupes = {
      ...input,
      existingControlDocs: [ctl, ctl],
    };
    const result = analyzeHistoryControlInitialization(withDupes);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.some((e) => e.includes("2 history control documents"))).toBe(true);
    }
  });

  // --- Executor cannot accept caller-supplied arbitrary stack ---

  it("undoStack is deterministically [0..N] — not caller-controlled", () => {
    const input = makeValidInput(3);
    const result = analyzeHistoryControlInitialization(input);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.undoStack).toEqual([0, 1, 2, 3]);
    }
  });

  it("redoStack is deterministically [] — not caller-controlled", () => {
    const input = makeValidInput(3);
    const result = analyzeHistoryControlInitialization(input);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.redoStack).toEqual([]);
    }
  });
});
