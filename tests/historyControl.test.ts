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
  type CampaignHistoryControlV1,
  type HistoryControlValidationInput,
  type HistoryReplayInput,
  type HistoryControlVerificationInput,
  type RevisionCommandInfo,
  type ReplayEventInfo,
  type SerializableCampaignState,
} from "../shared/domain";

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
