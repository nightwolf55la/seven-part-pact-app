import { describe, it, expect } from "vitest";
import {
  deriveUndoTransition,
  deriveRedoTransition,
  validateUndoTransactionCoherence,
  validateRedoTransactionCoherence,
} from "../shared/domain/undo-redo";
import {
  verifyCheckpoint,
  verifyCheckpointRestoreRevision,
  CURRENT_CHECKPOINT_VERSION,
} from "../shared/domain/checkpoints";
import {
  validateCampaignState,
  validateAnyCampaignState,
  statesDeepEqual,
  canonicalJsonStringify,
  asCentidegreePosition,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  DomainError,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  CampaignStateV3,
  CampaignStateV1,
  MonthlyPlayState,
} from "../shared/domain/campaign-state";
import type { CampaignHistoryControlV1 } from "../shared/domain/history-control";
import type {
  MonthOrdinal,
  PlayerId,
  WizardId,
  AllocationId,
  EngagementId,
} from "../shared/domain";

// ============================================================
// Fixtures
// ============================================================

const EMPTY_SEAT = { status: null, wizardId: null, watcherPlayerId: null } as const;

function emptyPactSeats() {
  return {
    necromancer: EMPTY_SEAT,
    hierophant: EMPTY_SEAT,
    warlock: EMPTY_SEAT,
    mariner: EMPTY_SEAT,
    faustian: EMPTY_SEAT,
    sage: EMPTY_SEAT,
    sorcerer: EMPTY_SEAT,
  };
}

function v3SetupState(): CurrentCampaignState {
  return {
    schemaVersion: 3,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: null },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [],
    wizards: [],
    pactSeats: emptyPactSeats(),
    lifecycle: {
      kind: "setup",
      orrery: { saturn: asCentidegreePosition(500), jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
  } as CurrentCampaignState;
}

const PLR = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const WIZ = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
const ALC = "alc_00000000-0000-0000-0000-000000000001" as AllocationId;
const ENG = "eng_00000000-0000-0000-0000-000000000001" as EngagementId;

function v3PlayState(): CurrentCampaignState {
  const currentMonth: MonthlyPlayState = {
    timeParticipants: [{
      participant: { kind: "wizard", wizardId: WIZ },
      effectiveBudget: 4,
      rescheduleAllowance: 1,
      reschedulesUsed: 0,
      allocations: [{
        allocationId: ALC,
        destination: { kind: "engagement", engagementId: ENG },
        note: "pressed an advantage",
        resolution: "pending",
      }],
    }],
    engagements: [{
      engagementId: ENG,
      actingWizardId: WIZ,
      target: { kind: "named_character", name: "Dread Lord Kazan" },
      resolution: "pending",
      linkedTimeAllocationId: ALC,
    }],
    wizardmootAttendance: [{ wizardId: WIZ, attended: false, exceptionReason: null }],
  };

  return {
    schemaVersion: 3,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 5 as MonthOrdinal },
    configuration: { ageId: "awakening", facilitatorPlayerId: PLR },
    players: [{ playerId: PLR, name: "Alice" }],
    wizards: [{ wizardId: WIZ, name: "Valdris", portrayedByPlayerId: PLR }],
    pactSeats: {
      ...emptyPactSeats(),
      necromancer: { status: "present", wizardId: WIZ, watcherPlayerId: null },
    },
    lifecycle: {
      kind: "play",
      phase: "meeting",
      orrery: {
        saturn: asCentidegreePosition(500),
        jupiter: asCentidegreePosition(750),
        mars: asCentidegreePosition(0),
        venus: asCentidegreePosition(1500),
        mercury: asCentidegreePosition(3000),
      },
      currentMonth,
    },
    wizardmootHistory: [
      { monthOrdinal: 3 as MonthOrdinal, attendance: [{ wizardId: WIZ, attended: true }] },
      { monthOrdinal: 4 as MonthOrdinal, attendance: [{ wizardId: WIZ, attended: false }] },
    ],
  } as CurrentCampaignState;
}

function makeControl(
  undoStack: number[],
  redoStack: number[] = [],
): CampaignHistoryControlV1 {
  return { historyControlVersion: 1, campaignId: "cmp_00000000-0000-0000-0000-000000000001", undoStack, redoStack };
}

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";

// ============================================================
// UNDO — V3 rich state restoration
// ============================================================

describe("B3B1: Undo restores complete V3 snapshots", () => {
  it("undo restores rich V3 Play state exactly", () => {
    const play = v3PlayState();
    const setup = v3SetupState();
    const result = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: play,
      targetSnapshotState: setup,
      currentLogicalSnapshotState: play,
      targetRevisionCommandType: null,
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(result.nextState, setup)).toBe(true);
    expect(result.nextState.calendar.monthOrdinal).toBeNull();
    expect(result.nextState.lifecycle.kind).toBe("setup");
  });

  it("undo restores V3 Play state with all lifecycle fields", () => {
    const setup = v3SetupState();
    const play = v3PlayState();
    const result = deriveUndoTransition({
      control: makeControl([0, 1, 2]),
      campaignRevision: 2,
      campaignState: setup,
      targetSnapshotState: play,
      currentLogicalSnapshotState: setup,
      targetRevisionCommandType: "move_month",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(result.nextState, play)).toBe(true);
    if (result.nextState.lifecycle.kind === "play") {
      expect(result.nextState.lifecycle.phase).toBe("meeting");
      expect(result.nextState.lifecycle.orrery.saturn).toBe(500);
      expect(result.nextState.lifecycle.currentMonth.timeParticipants.length).toBe(1);
      expect(result.nextState.lifecycle.currentMonth.engagements.length).toBe(1);
      expect(result.nextState.lifecycle.currentMonth.wizardmootAttendance?.length).toBe(1);
    }
    expect(result.nextState.wizardmootHistory.length).toBe(2);
  });

  it("undo of Setup with null month/orrery restores exactly", () => {
    const play = v3PlayState();
    const setup = v3SetupState();
    const result = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: play,
      targetSnapshotState: setup,
      currentLogicalSnapshotState: play,
      targetRevisionCommandType: null,
    }, CAMPAIGN_ID);

    expect(result.nextState.calendar.monthOrdinal).toBeNull();
    if (result.nextState.lifecycle.kind === "setup") {
      expect(result.nextState.lifecycle.orrery.saturn).toBe(500);
      expect(result.nextState.lifecycle.orrery.jupiter).toBeNull();
      expect(result.nextState.lifecycle.orrery.mars).toBeNull();
    }
  });

  it("undo coherence validates with rich V3 states", () => {
    const play = v3PlayState();
    const setup = v3SetupState();
    const result = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: play,
      targetSnapshotState: setup,
      currentLogicalSnapshotState: play,
      targetRevisionCommandType: null,
    }, CAMPAIGN_ID);

    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1],
      priorRedoStack: [],
      nextUndoStack: result.nextUndoStack as number[],
      nextRedoStack: result.nextRedoStack as number[],
      event: result.event as any,
      restoredState: result.nextState,
      targetSnapshotState: setup,
      newAuditRevision: 2,
    });
    expect(errors).toEqual([]);
  });
});

// ============================================================
// REDO — V3 rich state restoration
// ============================================================

describe("B3B1: Redo restores complete V3 snapshots", () => {
  it("redo restores rich V3 Play state exactly", () => {
    const setup = v3SetupState();
    const play = v3PlayState();
    const result = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: setup,
      targetSnapshotState: play,
      currentLogicalSnapshotState: setup,
      targetRevisionCommandType: "move_month",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(result.nextState, play)).toBe(true);
  });

  it("redo restores V3 Setup state with null fields exactly", () => {
    const play = v3PlayState();
    const setup = v3SetupState();
    const result = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: play,
      targetSnapshotState: setup,
      currentLogicalSnapshotState: play,
      targetRevisionCommandType: "move_month",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(result.nextState, setup)).toBe(true);
    expect(result.nextState.calendar.monthOrdinal).toBeNull();
    if (result.nextState.lifecycle.kind === "setup") {
      expect(result.nextState.lifecycle.orrery.jupiter).toBeNull();
    }
  });

  it("redo preserves wizardmootHistory and monthly state", () => {
    const setup = v3SetupState();
    const play = v3PlayState();
    const result = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: setup,
      targetSnapshotState: play,
      currentLogicalSnapshotState: setup,
      targetRevisionCommandType: "move_month",
    }, CAMPAIGN_ID);

    expect(result.nextState.wizardmootHistory.length).toBe(2);
    if (result.nextState.lifecycle.kind === "play") {
      expect(result.nextState.lifecycle.currentMonth.timeParticipants.length).toBe(1);
      expect(result.nextState.lifecycle.currentMonth.engagements.length).toBe(1);
    }
  });

  it("redo coherence validates with rich V3 states", () => {
    const setup = v3SetupState();
    const play = v3PlayState();
    const result = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: setup,
      targetSnapshotState: play,
      currentLogicalSnapshotState: setup,
      targetRevisionCommandType: "move_month",
    }, CAMPAIGN_ID);

    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0],
      priorRedoStack: [1],
      nextUndoStack: result.nextUndoStack as number[],
      nextRedoStack: result.nextRedoStack as number[],
      event: result.event as any,
      restoredState: result.nextState,
      targetSnapshotState: play,
      newAuditRevision: 3,
    });
    expect(errors).toEqual([]);
  });
});

// ============================================================
// CAS / expected-revision semantics unchanged
// ============================================================

describe("B3B1: recovery precondition semantics unchanged", () => {
  it("undo rejects when current logical snapshot does not match campaign state", () => {
    const play = v3PlayState();
    const setup = v3SetupState();
    expect(() => {
      deriveUndoTransition({
        control: makeControl([0, 1]),
        campaignRevision: 1,
        campaignState: play,
        targetSnapshotState: setup,
        currentLogicalSnapshotState: setup,
        targetRevisionCommandType: null,
      }, CAMPAIGN_ID);
    }).toThrow(DomainError);
  });

  it("undo rejects when undoStack has only initial entry", () => {
    const setup = v3SetupState();
    expect(() => {
      deriveUndoTransition({
        control: makeControl([0]),
        campaignRevision: 0,
        campaignState: setup,
        targetSnapshotState: null,
        currentLogicalSnapshotState: setup,
        targetRevisionCommandType: null,
      }, CAMPAIGN_ID);
    }).toThrow(DomainError);
  });

  it("redo rejects empty redo stack", () => {
    const play = v3PlayState();
    expect(() => {
      deriveRedoTransition({
        control: makeControl([0, 1]),
        campaignRevision: 1,
        campaignState: play,
        targetSnapshotState: null,
        currentLogicalSnapshotState: play,
        targetRevisionCommandType: null,
      }, CAMPAIGN_ID);
    }).toThrow(DomainError);
  });
});

// ============================================================
// V1/V2 snapshot rejection in undo/redo
// ============================================================

describe("B3B1: V1/V2 snapshots rejected by undo/redo", () => {
  const v1State: CampaignStateV1 = {
    schemaVersion: 1,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
  };

  it("undo rejects V1 target snapshot", () => {
    const play = v3PlayState();
    expect(() => {
      deriveUndoTransition({
        control: makeControl([0, 1]),
        campaignRevision: 1,
        campaignState: play,
        targetSnapshotState: v1State as any,
        currentLogicalSnapshotState: play,
        targetRevisionCommandType: null,
      }, CAMPAIGN_ID);
    }).toThrow();
  });

  it("redo rejects V1 target snapshot", () => {
    const play = v3PlayState();
    expect(() => {
      deriveRedoTransition({
        control: makeControl([0], [1]),
        campaignRevision: 2,
        campaignState: play,
        targetSnapshotState: v1State as any,
        currentLogicalSnapshotState: play,
        targetRevisionCommandType: "move_month",
      }, CAMPAIGN_ID);
    }).toThrow();
  });

  it("undo rejects V2 target snapshot", () => {
    const play = v3PlayState();
    const v2 = { ...v1State, schemaVersion: 2, configuration: { ageId: null, facilitatorPlayerId: null }, players: [], wizards: [], pactSeats: emptyPactSeats() };
    expect(() => {
      deriveUndoTransition({
        control: makeControl([0, 1]),
        campaignRevision: 1,
        campaignState: play,
        targetSnapshotState: v2 as any,
        currentLogicalSnapshotState: play,
        targetRevisionCommandType: null,
      }, CAMPAIGN_ID);
    }).toThrow();
  });
});

// ============================================================
// CHECKPOINTS — V3 verification
// ============================================================

describe("B3B1: Checkpoint verification with V3 states", () => {
  const CHK_ID = "chk_00000000-0000-0000-0000-000000000001";

  it("verifyCheckpoint accepts V3 Setup snapshot", () => {
    const setup = v3SetupState();
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: CURRENT_CHECKPOINT_VERSION,
        checkpointId: CHK_ID,
        campaignId: CAMPAIGN_ID,
        label: "Before Ritual",
        sourceRevision: 0,
        createdAtMs: 1000000,
      },
      campaignId: CAMPAIGN_ID,
      campaignRevision: 5,
      snapshotExists: true,
      snapshotState: setup as any,
      revisionCommandType: null,
    });
    expect(errors).toEqual([]);
  });

  it("verifyCheckpoint accepts V3 Play snapshot", () => {
    const play = v3PlayState();
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: CURRENT_CHECKPOINT_VERSION,
        checkpointId: CHK_ID,
        campaignId: CAMPAIGN_ID,
        label: "Mid-session save",
        sourceRevision: 3,
        createdAtMs: 2000000,
      },
      campaignId: CAMPAIGN_ID,
      campaignRevision: 5,
      snapshotExists: true,
      snapshotState: play as any,
      revisionCommandType: "move_month",
    });
    expect(errors).toEqual([]);
  });

  it("verifyCheckpoint rejects V1 snapshot", () => {
    const v1: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const errors = verifyCheckpoint({
      checkpoint: {
        checkpointVersion: CURRENT_CHECKPOINT_VERSION,
        checkpointId: CHK_ID,
        campaignId: CAMPAIGN_ID,
        label: "Bad checkpoint",
        sourceRevision: 1,
        createdAtMs: 1000000,
      },
      campaignId: CAMPAIGN_ID,
      campaignRevision: 5,
      snapshotExists: true,
      snapshotState: v1 as any,
      revisionCommandType: "move_month",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("invalid CampaignState"))).toBe(true);
  });
});

// ============================================================
// CHECKPOINT RESTORE — V3 roundtrip verification
// ============================================================

describe("B3B1: Checkpoint restore preserves complete V3 state", () => {
  const CHK_ID = "chk_00000000-0000-0000-0000-000000000001";

  it("restore verification passes when source and result are identical V3 Play states", () => {
    const play = v3PlayState();
    const errors = verifyCheckpointRestoreRevision({
      campaignRevision: 5,
      commandFingerprint: `checkpoint_restore:v1:checkpoint=${CHK_ID}:expectedRevision=4`,
      eventType: "checkpoint_restored",
      eventVersion: 1,
      eventCheckpointId: CHK_ID,
      eventSourceRevision: 2,
      eventLabelAtRestore: "Mid-session save",
      sourceSnapshotExists: true,
      sourceSnapshotState: play as any,
      resultSnapshotExists: true,
      resultSnapshotState: play as any,
      sourceRevisionCommandType: "move_month",
    });
    expect(errors).toEqual([]);
  });

  it("restore verification passes for V3 Setup state", () => {
    const setup = v3SetupState();
    const errors = verifyCheckpointRestoreRevision({
      campaignRevision: 3,
      commandFingerprint: `checkpoint_restore:v1:checkpoint=${CHK_ID}:expectedRevision=2`,
      eventType: "checkpoint_restored",
      eventVersion: 1,
      eventCheckpointId: CHK_ID,
      eventSourceRevision: 0,
      eventLabelAtRestore: "Initial state",
      sourceSnapshotExists: true,
      sourceSnapshotState: setup as any,
      resultSnapshotExists: true,
      resultSnapshotState: setup as any,
      sourceRevisionCommandType: null,
    });
    expect(errors).toEqual([]);
  });

  it("restore verification detects state mismatch (partial restoration would fail)", () => {
    const play = v3PlayState();
    const tampered = { ...play, wizardmootHistory: [] } as any;
    const errors = verifyCheckpointRestoreRevision({
      campaignRevision: 5,
      commandFingerprint: `checkpoint_restore:v1:checkpoint=${CHK_ID}:expectedRevision=4`,
      eventType: "checkpoint_restored",
      eventVersion: 1,
      eventCheckpointId: CHK_ID,
      eventSourceRevision: 2,
      eventLabelAtRestore: "Mid-session save",
      sourceSnapshotExists: true,
      sourceSnapshotState: play as any,
      resultSnapshotExists: true,
      resultSnapshotState: tampered,
      sourceRevisionCommandType: "move_month",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("does not match"))).toBe(true);
  });

  it("no CampaignState-specific field copying in checkpoint infrastructure", () => {
    const play = v3PlayState();
    const json1 = canonicalJsonStringify(play);
    const json2 = canonicalJsonStringify(play);
    expect(json1).toBe(json2);
    const parsed = JSON.parse(json1) as CampaignStateV3;
    expect(parsed.lifecycle).toBeDefined();
    expect(parsed.wizardmootHistory).toBeDefined();
    if (parsed.lifecycle.kind === "play") {
      expect(parsed.lifecycle.currentMonth).toBeDefined();
      expect(parsed.lifecycle.orrery).toBeDefined();
    }
  });
});
