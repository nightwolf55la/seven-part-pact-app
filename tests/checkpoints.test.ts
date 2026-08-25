import { describe, it, expect } from "vitest";
import {
  isValidCheckpointId,
  parseCheckpointId,
  isLogicalStateCommandType,
  isHistoryNavigationCommandType,
  checkpointRestoreFingerprint,
  normalizeCheckpointLabel,
  validateCheckpointLabel,
  CAMPAIGN_COMMAND_TYPES,
  mapEventToActivityEntry,
  describeActivityEntry,
  replayHistoryControl,
  CURRENT_CHECKPOINT_VERSION,
  verifyCheckpoint,
  verifyCheckpointCollection,
} from "../shared/domain";
import type {
  CheckpointRestoredEventV1,
  CampaignEvent,
  CampaignCheckpointV1,
  RevisionCommandInfo,
  ReplayEventInfo,
} from "../shared/domain";

// ============================================================
// CheckpointId validation
// ============================================================

describe("CheckpointId validation", () => {
  it("accepts valid chk_<UUID>", () => {
    expect(isValidCheckpointId("chk_00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isValidCheckpointId("chk_a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidCheckpointId("")).toBe(false);
    expect(isValidCheckpointId("chk_")).toBe(false);
    expect(isValidCheckpointId("cmd_00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isValidCheckpointId("cmp_00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isValidCheckpointId("chk_NOT-A-UUID")).toBe(false);
    expect(isValidCheckpointId("chk_00000000-0000-0000-0000-00000000000")).toBe(false);
    expect(isValidCheckpointId("CHK_00000000-0000-0000-0000-000000000000")).toBe(false);
  });

  it("parseCheckpointId throws on invalid", () => {
    expect(() => parseCheckpointId("invalid")).toThrow();
    expect(() => parseCheckpointId("chk_00000000-0000-0000-0000-000000000000")).not.toThrow();
  });
});

// ============================================================
// Label normalization and validation
// ============================================================

describe("Checkpoint label validation", () => {
  it("normalizes by trimming whitespace", () => {
    expect(normalizeCheckpointLabel("  hello  ")).toBe("hello");
    expect(normalizeCheckpointLabel("Before Ritual")).toBe("Before Ritual");
    expect(normalizeCheckpointLabel("\t test \n")).toBe("test");
  });

  it("rejects empty label after normalization", () => {
    expect(validateCheckpointLabel("")).not.toBeNull();
    expect(validateCheckpointLabel("   ".trim())).not.toBeNull();
  });

  it("rejects label exceeding 120 chars", () => {
    const long = "a".repeat(121);
    expect(validateCheckpointLabel(long)).not.toBeNull();
    expect(validateCheckpointLabel("a".repeat(120))).toBeNull();
  });

  it("rejects control characters", () => {
    expect(validateCheckpointLabel("hello\x00world")).not.toBeNull();
    expect(validateCheckpointLabel("line\nbreak")).not.toBeNull();
    expect(validateCheckpointLabel("tab\there")).not.toBeNull();
    expect(validateCheckpointLabel("\x1f")).not.toBeNull();
  });

  it("accepts valid labels", () => {
    expect(validateCheckpointLabel("Before Ritual")).toBeNull();
    expect(validateCheckpointLabel("Session 5 - End")).toBeNull();
    expect(validateCheckpointLabel("a")).toBeNull();
  });
});

// ============================================================
// Command type classification
// ============================================================

describe("checkpoint_restore command classification", () => {
  it("is in CAMPAIGN_COMMAND_TYPES", () => {
    expect(CAMPAIGN_COMMAND_TYPES).toContain("checkpoint_restore");
  });

  it("is classified as logical-state", () => {
    expect(isLogicalStateCommandType("checkpoint_restore")).toBe(true);
  });

  it("is NOT history-navigation", () => {
    expect(isHistoryNavigationCommandType("checkpoint_restore")).toBe(false);
  });
});

// ============================================================
// Fingerprint
// ============================================================

describe("checkpointRestoreFingerprint", () => {
  it("produces deterministic output", () => {
    const fp = checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000001", 20);
    expect(fp).toBe("checkpoint_restore:v1:checkpoint=chk_00000000-0000-0000-0000-000000000001:expectedRevision=20");
  });

  it("differs for different checkpointId", () => {
    const fp1 = checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000001", 20);
    const fp2 = checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000002", 20);
    expect(fp1).not.toBe(fp2);
  });

  it("differs for different expectedRevision", () => {
    const fp1 = checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000001", 20);
    const fp2 = checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000001", 21);
    expect(fp1).not.toBe(fp2);
  });

  it("rejects negative expectedRevision", () => {
    expect(() => checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000001", -1)).toThrow();
  });

  it("rejects non-integer expectedRevision", () => {
    expect(() => checkpointRestoreFingerprint("chk_00000000-0000-0000-0000-000000000001", 1.5)).toThrow();
  });
});

// ============================================================
// CheckpointRestoredEventV1
// ============================================================

describe("CheckpointRestoredEventV1", () => {
  const event: CheckpointRestoredEventV1 = {
    type: "checkpoint_restored",
    version: 1,
    data: {
      checkpointId: "chk_00000000-0000-0000-0000-000000000001",
      sourceRevision: 7,
      labelAtRestore: "Before Ritual",
    },
  };

  it("has correct structure", () => {
    expect(event.type).toBe("checkpoint_restored");
    expect(event.version).toBe(1);
    expect(event.data.checkpointId).toBe("chk_00000000-0000-0000-0000-000000000001");
    expect(event.data.sourceRevision).toBe(7);
    expect(event.data.labelAtRestore).toBe("Before Ritual");
  });
});

// ============================================================
// History replay with checkpoint_restore
// ============================================================

describe("History replay with checkpoint_restore", () => {
  it("checkpoint_restore pushes NEW revision to undoStack and clears redoStack", () => {
    // Revisions: 1=move_month, 2=move_month, 3=checkpoint_restore
    const revisions: RevisionCommandInfo[] = [
      { campaignRevision: 1, commandType: "move_month" },
      { campaignRevision: 2, commandType: "move_month" },
      { campaignRevision: 3, commandType: "checkpoint_restore" },
    ];
    const events: ReplayEventInfo[] = [];

    const result = replayHistoryControl({ campaignRevision: 3, revisions, events });
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2, 3]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("restore after undo clears prior redo path", () => {
    // 1=move, 2=move, 3=undo(2->1), 4=checkpoint_restore
    const revisions: RevisionCommandInfo[] = [
      { campaignRevision: 1, commandType: "move_month" },
      { campaignRevision: 2, commandType: "move_month" },
      { campaignRevision: 3, commandType: "undo" },
      { campaignRevision: 4, commandType: "checkpoint_restore" },
    ];
    const events: ReplayEventInfo[] = [
      { campaignRevision: 3, event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } } },
    ];

    const result = replayHistoryControl({ campaignRevision: 4, revisions, events });
    expect(result.valid).toBe(true);
    // After undo: undoStack=[0,1], redoStack=[2]
    // After restore (logical-state): undoStack=[0,1,4], redoStack=[]
    expect(result.expectedUndoStack).toEqual([0, 1, 4]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("Restore -> Undo -> Redo full cycle", () => {
    // 1=move, 2=checkpoint_restore, 3=undo(2->1), 4=redo(1->2)
    const revisions: RevisionCommandInfo[] = [
      { campaignRevision: 1, commandType: "move_month" },
      { campaignRevision: 2, commandType: "checkpoint_restore" },
      { campaignRevision: 3, commandType: "undo" },
      { campaignRevision: 4, commandType: "redo" },
    ];
    const events: ReplayEventInfo[] = [
      { campaignRevision: 3, event: { type: "undo_applied", version: 1, data: { fromRevision: 2, targetRevision: 1 } } },
      { campaignRevision: 4, event: { type: "redo_applied", version: 1, data: { fromRevision: 1, targetRevision: 2 } } },
    ];

    const result = replayHistoryControl({ campaignRevision: 4, revisions, events });
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2]);
    expect(result.expectedRedoStack).toEqual([]);
  });

  it("multiple restores accumulate on undoStack", () => {
    // 1=move, 2=checkpoint_restore, 3=checkpoint_restore
    const revisions: RevisionCommandInfo[] = [
      { campaignRevision: 1, commandType: "move_month" },
      { campaignRevision: 2, commandType: "checkpoint_restore" },
      { campaignRevision: 3, commandType: "checkpoint_restore" },
    ];
    const events: ReplayEventInfo[] = [];

    const result = replayHistoryControl({ campaignRevision: 3, revisions, events });
    expect(result.valid).toBe(true);
    expect(result.expectedUndoStack).toEqual([0, 1, 2, 3]);
    expect(result.expectedRedoStack).toEqual([]);
  });
});

// ============================================================
// Activity model
// ============================================================

describe("Activity model for checkpoint_restored", () => {
  const event: CampaignEvent = {
    type: "checkpoint_restored",
    version: 1,
    data: {
      checkpointId: "chk_00000000-0000-0000-0000-000000000001",
      sourceRevision: 7,
      labelAtRestore: "Before Ritual",
    },
  };

  it("maps correctly to ActivityEntry", () => {
    const entry = mapEventToActivityEntry("test-id", 41, event);
    expect(entry.type).toBe("checkpoint_restored");
    if (entry.type === "checkpoint_restored") {
      expect(entry.checkpointId).toBe("chk_00000000-0000-0000-0000-000000000001");
      expect(entry.labelAtRestore).toBe("Before Ritual");
      expect(entry.sourceRevision).toBe(7);
      expect(entry.revision).toBe(41);
    }
  });

  it("describes correctly", () => {
    const entry = mapEventToActivityEntry("test-id", 41, event);
    const desc = describeActivityEntry(entry);
    expect(desc).toContain("Restored");
    expect(desc).toContain("Before Ritual");
    expect(desc).toContain("revision 7");
  });

  it("fails closed on unsupported version", () => {
    const badEvent = { ...event, version: 99 } as any;
    expect(() => mapEventToActivityEntry("test-id", 41, badEvent)).toThrow();
  });
});

// ============================================================
// Checkpoint verification
// ============================================================

describe("Checkpoint verification", () => {
  const validCheckpoint: CampaignCheckpointV1 = {
    checkpointVersion: 1,
    checkpointId: "chk_00000000-0000-0000-0000-000000000001",
    campaignId: "cmp_00000000-0000-0000-0000-000000000001",
    label: "Before Ritual",
    sourceRevision: 5,
    createdAtMs: 1700000000000,
  };

  it("passes for valid checkpoint", () => {
    const errors = verifyCheckpoint({
      checkpoint: validCheckpoint,
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } },
      revisionCommandType: "move_month",
    });
    expect(errors).toEqual([]);
  });

  it("detects wrong campaignId", () => {
    const errors = verifyCheckpoint({
      checkpoint: validCheckpoint,
      campaignId: "cmp_99999999-9999-9999-9999-999999999999",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("campaignId"))).toBe(true);
  });

  it("detects missing snapshot", () => {
    const errors = verifyCheckpoint({
      checkpoint: validCheckpoint,
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: false,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("snapshot"))).toBe(true);
  });

  it("detects sourceRevision exceeding campaignRevision", () => {
    const errors = verifyCheckpoint({
      checkpoint: { ...validCheckpoint, sourceRevision: 15 },
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("exceeds"))).toBe(true);
  });

  it("detects navigation commandType at source revision", () => {
    const errors = verifyCheckpoint({
      checkpoint: validCheckpoint,
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "undo",
    });
    expect(errors.some((e) => e.includes("non-logical-state"))).toBe(true);
  });

  it("detects missing revision record for non-zero source", () => {
    const errors = verifyCheckpoint({
      checkpoint: validCheckpoint,
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: null,
    });
    expect(errors.some((e) => e.includes("no revision record"))).toBe(true);
  });

  it("accepts sourceRevision 0 without revision record", () => {
    const chk: CampaignCheckpointV1 = { ...validCheckpoint, sourceRevision: 0 };
    const errors = verifyCheckpoint({
      checkpoint: chk,
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: null,
    });
    expect(errors).toEqual([]);
  });

  it("detects invalid checkpointId format", () => {
    const chk: CampaignCheckpointV1 = { ...validCheckpoint, checkpointId: "bad_id" };
    const errors = verifyCheckpoint({
      checkpoint: chk,
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("Invalid checkpointId"))).toBe(true);
  });
});

describe("Checkpoint collection verification", () => {
  it("detects duplicate checkpointId", () => {
    const chk: CampaignCheckpointV1 = {
      checkpointVersion: 1,
      checkpointId: "chk_00000000-0000-0000-0000-000000000001",
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      label: "A",
      sourceRevision: 1,
      createdAtMs: 1700000000000,
    };
    const errors = verifyCheckpointCollection({
      checkpoints: [chk, chk],
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotRevisions: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      revisionCommandTypes: new Map([[1, "move_month"]]),
    });
    expect(errors.some((e) => e.includes("Duplicate checkpointId"))).toBe(true);
  });

  it("passes for zero checkpoints", () => {
    const errors = verifyCheckpointCollection({
      checkpoints: [],
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotRevisions: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      revisionCommandTypes: new Map(),
    });
    expect(errors).toEqual([]);
  });
});

// ============================================================
// Logical revision selection (the checkpoint targets undoStack.last)
// ============================================================

describe("Checkpoint creation targets undoStack.last", () => {
  it("after undo, sourceRevision is undoStack.last, not campaignRevision", () => {
    // Scenario: revisions 1-5 (move_month), then undo at rev 6 (pops 5 from stack)
    // undoStack = [0,1,2,3,4], redoStack = [5], campaignRevision = 6
    // A checkpoint created here should target revision 4, not 6
    const revisions: RevisionCommandInfo[] = [
      { campaignRevision: 1, commandType: "move_month" },
      { campaignRevision: 2, commandType: "move_month" },
      { campaignRevision: 3, commandType: "move_month" },
      { campaignRevision: 4, commandType: "move_month" },
      { campaignRevision: 5, commandType: "move_month" },
      { campaignRevision: 6, commandType: "undo" },
    ];
    const events: ReplayEventInfo[] = [
      { campaignRevision: 6, event: { type: "undo_applied", version: 1, data: { fromRevision: 5, targetRevision: 4 } } },
    ];

    const result = replayHistoryControl({ campaignRevision: 6, revisions, events });
    expect(result.valid).toBe(true);
    // undoStack.last = 4
    expect(result.expectedUndoStack[result.expectedUndoStack.length - 1]).toBe(4);
    // This is what checkpoint creation would use, NOT 6
    expect(result.expectedUndoStack[result.expectedUndoStack.length - 1]).not.toBe(6);
  });
});

// ============================================================
// Hardened checkpoint verification (createdAtMs + label normalization)
// ============================================================

describe("Checkpoint verification hardening", () => {
  const baseCheckpoint: CampaignCheckpointV1 = {
    checkpointVersion: 1,
    checkpointId: "chk_00000000-0000-0000-0000-000000000001",
    campaignId: "cmp_00000000-0000-0000-0000-000000000001",
    label: "Before Ritual",
    sourceRevision: 5,
    createdAtMs: 1700000000000,
  };

  const baseInput = {
    campaignId: "cmp_00000000-0000-0000-0000-000000000001",
    campaignRevision: 10,
    snapshotExists: true,
    snapshotState: null,
    revisionCommandType: "move_month" as const,
  };

  it("rejects fractional createdAtMs", () => {
    const errors = verifyCheckpoint({
      checkpoint: { ...baseCheckpoint, createdAtMs: 1700000000000.5 },
      ...baseInput,
    });
    expect(errors.some((e) => e.includes("createdAtMs"))).toBe(true);
  });

  it("rejects unsafe large createdAtMs", () => {
    const errors = verifyCheckpoint({
      checkpoint: { ...baseCheckpoint, createdAtMs: Number.MAX_SAFE_INTEGER + 1 },
      ...baseInput,
    });
    expect(errors.some((e) => e.includes("createdAtMs"))).toBe(true);
  });

  it("rejects negative createdAtMs", () => {
    const errors = verifyCheckpoint({
      checkpoint: { ...baseCheckpoint, createdAtMs: -1 },
      ...baseInput,
    });
    expect(errors.some((e) => e.includes("createdAtMs"))).toBe(true);
  });

  it("rejects non-normalized label (leading whitespace)", () => {
    const errors = verifyCheckpoint({
      checkpoint: { ...baseCheckpoint, label: " Before Ritual" },
      ...baseInput,
    });
    expect(errors.some((e) => e.includes("not normalized"))).toBe(true);
  });

  it("rejects non-normalized label (trailing whitespace)", () => {
    const errors = verifyCheckpoint({
      checkpoint: { ...baseCheckpoint, label: "Before Ritual " },
      ...baseInput,
    });
    expect(errors.some((e) => e.includes("not normalized"))).toBe(true);
  });

  it("accepts valid checkpoint with safe integer createdAtMs", () => {
    const errors = verifyCheckpoint({
      checkpoint: baseCheckpoint,
      ...baseInput,
    });
    expect(errors).toEqual([]);
  });
});

// ============================================================
// Checkpoint-restore history verification
// ============================================================

import { verifyCheckpointRestoreRevision, checkpointRestoreFingerprint as fpFn } from "../shared/domain";

describe("verifyCheckpointRestoreRevision", () => {
  const validChkId = "chk_00000000-0000-0000-0000-000000000001";

  const validInput = {
    campaignRevision: 21,
    commandFingerprint: fpFn(validChkId, 20),
    eventType: "checkpoint_restored",
    eventVersion: 1,
    eventCheckpointId: validChkId,
    eventSourceRevision: 7,
    eventLabelAtRestore: "Before Ritual",
    sourceSnapshotExists: true,
    sourceSnapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } } as any,
    resultSnapshotExists: true,
    resultSnapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } } as any,
    sourceRevisionCommandType: "move_month" as const,
  };

  it("passes for valid restore revision", () => {
    const errors = verifyCheckpointRestoreRevision(validInput);
    expect(errors).toEqual([]);
  });

  it("rejects wrong event type", () => {
    const errors = verifyCheckpointRestoreRevision({ ...validInput, eventType: "month_changed" });
    expect(errors.some((e) => e.includes("checkpoint_restored"))).toBe(true);
  });

  it("rejects wrong event version", () => {
    const errors = verifyCheckpointRestoreRevision({ ...validInput, eventVersion: 2 });
    expect(errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("rejects wrong fingerprint", () => {
    const errors = verifyCheckpointRestoreRevision({ ...validInput, commandFingerprint: "wrong:fingerprint" });
    expect(errors.some((e) => e.includes("commandFingerprint"))).toBe(true);
  });

  it("rejects missing source snapshot", () => {
    const errors = verifyCheckpointRestoreRevision({ ...validInput, sourceSnapshotExists: false });
    expect(errors.some((e) => e.includes("source snapshot"))).toBe(true);
  });

  it("rejects result snapshot differing from source snapshot", () => {
    const errors = verifyCheckpointRestoreRevision({
      ...validInput,
      resultSnapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 99 } } as any,
    });
    expect(errors.some((e) => e.includes("result snapshot state does not match"))).toBe(true);
  });

  it("rejects source navigation revision", () => {
    const errors = verifyCheckpointRestoreRevision({ ...validInput, sourceRevisionCommandType: "undo" as any });
    expect(errors.some((e) => e.includes("non-logical-state"))).toBe(true);
  });

  it("rejects missing source revision record for non-zero source", () => {
    const errors = verifyCheckpointRestoreRevision({ ...validInput, sourceRevisionCommandType: null });
    expect(errors.some((e) => e.includes("no revision record"))).toBe(true);
  });

  it("accepts sourceRevision 0 without revision record", () => {
    const input = {
      ...validInput,
      eventSourceRevision: 0,
      commandFingerprint: fpFn(validChkId, 20),
      sourceRevisionCommandType: null,
    };
    const errors = verifyCheckpointRestoreRevision(input);
    expect(errors).toEqual([]);
  });

  it("labelAtRestore does NOT depend on current checkpoint label (no check)", () => {
    // labelAtRestore is historical — verification only checks it's a valid label string
    // It does NOT require it to match any current checkpoint document
    const errors = verifyCheckpointRestoreRevision({
      ...validInput,
      eventLabelAtRestore: "Old Name That Changed",
    });
    expect(errors).toEqual([]);
  });

  it("rejects sourceRevision exceeding revision - 1", () => {
    const errors = verifyCheckpointRestoreRevision({
      ...validInput,
      eventSourceRevision: 21, // equals campaignRevision, exceeds rev - 1 = 20
    });
    expect(errors.some((e) => e.includes("exceeds prior revision"))).toBe(true);
  });
});

// ============================================================
// Collection verification: orphan campaign detection
// ============================================================

describe("Checkpoint collection verification: orphan campaign detection", () => {
  it("detects checkpoint with wrong campaignId", () => {
    const chk: CampaignCheckpointV1 = {
      checkpointVersion: 1,
      checkpointId: "chk_00000000-0000-0000-0000-000000000001",
      campaignId: "cmp_99999999-9999-9999-9999-999999999999",
      label: "Orphan",
      sourceRevision: 1,
      createdAtMs: 1700000000000,
    };
    const errors = verifyCheckpointCollection({
      checkpoints: [chk],
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotRevisions: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      revisionCommandTypes: new Map([[1, "move_month"]]),
    });
    expect(errors.some((e) => e.includes("campaignId"))).toBe(true);
  });
});

// ============================================================
// listCheckpoints full validation (domain helper coverage)
// ============================================================

describe("listCheckpoints full validation via verifyCheckpoint", () => {
  const campaignId = "cmp_00000000-0000-0000-0000-000000000001";
  const baseCheckpoint: CampaignCheckpointV1 = {
    checkpointVersion: 1,
    checkpointId: "chk_00000000-0000-0000-0000-000000000001",
    campaignId,
    label: "Before Ritual",
    sourceRevision: 5,
    createdAtMs: 1700000000000,
  };

  const makeInput = (overrides: Partial<CampaignCheckpointV1> = {}) => ({
    checkpoint: { ...baseCheckpoint, ...overrides },
    campaignId,
    campaignRevision: 10,
    snapshotExists: true,
    snapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } } as any,
    revisionCommandType: "move_month" as const,
  });

  it("rejects non-normalized label in persisted checkpoint", () => {
    const errors = verifyCheckpoint(makeInput({ label: "  Before Ritual" }));
    expect(errors.some((e) => e.includes("not normalized"))).toBe(true);
  });

  it("rejects invalid createdAtMs (NaN)", () => {
    const errors = verifyCheckpoint(makeInput({ createdAtMs: NaN }));
    expect(errors.some((e) => e.includes("createdAtMs"))).toBe(true);
  });

  it("rejects missing source snapshot", () => {
    const errors = verifyCheckpoint({
      ...makeInput(),
      snapshotExists: false,
    });
    expect(errors.some((e) => e.includes("No snapshot exists"))).toBe(true);
  });

  it("rejects navigation source revision command type", () => {
    const errors = verifyCheckpoint({
      ...makeInput(),
      revisionCommandType: "undo" as any,
    });
    expect(errors.some((e) => e.includes("non-logical-state"))).toBe(true);
  });

  it("detects duplicate checkpointId across campaigns via collection", () => {
    const chk1: CampaignCheckpointV1 = { ...baseCheckpoint };
    const chk2: CampaignCheckpointV1 = { ...baseCheckpoint, campaignId: "cmp_99999999-9999-9999-9999-999999999999" };
    const errors = verifyCheckpointCollection({
      checkpoints: [chk1, chk2],
      campaignId,
      campaignRevision: 10,
      snapshotRevisions: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      revisionCommandTypes: new Map([[5, "move_month"]]),
    });
    expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("detects wrong-campaign checkpoint via collection", () => {
    const chk: CampaignCheckpointV1 = { ...baseCheckpoint, campaignId: "cmp_99999999-9999-9999-9999-999999999999" };
    const errors = verifyCheckpointCollection({
      checkpoints: [chk],
      campaignId,
      campaignRevision: 10,
      snapshotRevisions: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      revisionCommandTypes: new Map([[5, "move_month"]]),
    });
    expect(errors.some((e) => e.includes("campaignId"))).toBe(true);
  });

  it("valid zero checkpoints produces no errors via collection", () => {
    const errors = verifyCheckpointCollection({
      checkpoints: [],
      campaignId,
      campaignRevision: 10,
      snapshotRevisions: new Set([0]),
      revisionCommandTypes: new Map(),
    });
    expect(errors).toEqual([]);
  });

  it("valid normal checkpoint produces no errors", () => {
    const errors = verifyCheckpoint(makeInput());
    expect(errors).toEqual([]);
  });
});

// ============================================================
// verifyCheckpoint: invalid CampaignState snapshot rejection
// ============================================================

describe("verifyCheckpoint: CampaignState validation", () => {
  const campaignId = "cmp_00000000-0000-0000-0000-000000000001";
  const baseCheckpoint: CampaignCheckpointV1 = {
    checkpointVersion: 1,
    checkpointId: "chk_00000000-0000-0000-0000-000000000001",
    campaignId,
    label: "Before Ritual",
    sourceRevision: 5,
    createdAtMs: 1700000000000,
  };

  it("rejects invalid CampaignState in source snapshot", () => {
    const errors = verifyCheckpoint({
      checkpoint: baseCheckpoint,
      campaignId,
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: { schemaVersion: 99, ruleset: { id: "bogus", version: 1 }, calendar: { monthOrdinal: 3 } } as any,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("invalid CampaignState"))).toBe(true);
  });

  it("rejects snapshot with missing fields", () => {
    const errors = verifyCheckpoint({
      checkpoint: baseCheckpoint,
      campaignId,
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: { schemaVersion: 1 } as any,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("invalid CampaignState"))).toBe(true);
  });

  it("accepts valid CampaignState in source snapshot", () => {
    const errors = verifyCheckpoint({
      checkpoint: baseCheckpoint,
      campaignId,
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } } as any,
      revisionCommandType: "move_month",
    });
    expect(errors).toEqual([]);
  });

  it("still works when snapshotState is null (no deep validation)", () => {
    const errors = verifyCheckpoint({
      checkpoint: baseCheckpoint,
      campaignId,
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors).toEqual([]);
  });
});

// ============================================================
// canonicalCommit restore: persisted metadata validation (via domain helper proxy)
// ============================================================

describe("canonicalCommit restore persisted checkpoint metadata", () => {
  it("non-normalized persisted label is detectable by verifyCheckpoint", () => {
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: 1,
        checkpointId: "chk_00000000-0000-0000-0000-000000000001",
        campaignId: "cmp_00000000-0000-0000-0000-000000000001",
        label: " Leading Space",
        sourceRevision: 5,
        createdAtMs: 1700000000000,
      },
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("not normalized"))).toBe(true);
  });

  it("invalid createdAtMs is detectable by verifyCheckpoint", () => {
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: 1,
        checkpointId: "chk_00000000-0000-0000-0000-000000000001",
        campaignId: "cmp_00000000-0000-0000-0000-000000000001",
        label: "Valid Label",
        sourceRevision: 5,
        createdAtMs: Infinity,
      },
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: null,
      revisionCommandType: "move_month",
    });
    expect(errors.some((e) => e.includes("createdAtMs"))).toBe(true);
  });

  it("valid canonical checkpoint produces no errors", () => {
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: 1,
        checkpointId: "chk_00000000-0000-0000-0000-000000000001",
        campaignId: "cmp_00000000-0000-0000-0000-000000000001",
        label: "Valid Label",
        sourceRevision: 5,
        createdAtMs: 1700000000000,
      },
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      campaignRevision: 10,
      snapshotExists: true,
      snapshotState: { schemaVersion: 1, ruleset: { id: "seven_part_pact_draft4", version: 1 }, calendar: { monthOrdinal: 3 } } as any,
      revisionCommandType: "move_month",
    });
    expect(errors).toEqual([]);
  });
});
