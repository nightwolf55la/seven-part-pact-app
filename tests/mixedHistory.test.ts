import { describe, it, expect } from "vitest";
import {
  validateAnyCampaignState,
  validateCampaignState,
  initialCampaignState,
  statesDeepEqual,
  applyAddPlayer,
  applyMoveMonth,
  verifyMigrationInvariants,
  verifyHistoryControl,
  deriveUndoTransition,
  deriveRedoTransition,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  addPlayerFingerprint,
  createWizardFingerprint,
  moveMonthFingerprint,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  CampaignStateV1,
  CampaignHistoryControlV1,
  MonthOrdinal,
  PlayerId,
  RevisionRecord,
  EventRecord,
  SnapshotRecord,
  CampaignDocument,
  SerializableCampaignState,
  RevisionCommandInfo,
  ReplayEventInfo,
} from "../shared/domain";
import { migrateToCurrentVersion } from "../shared/domain/state-migration";

// ================================================================
// Fixtures: V1 snapshot as raw persisted data
// ================================================================

function v1SnapshotFixture(monthOrdinal: number): CampaignStateV1 {
  return {
    schemaVersion: 1,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: monthOrdinal as MonthOrdinal },
  };
}

function v2State(monthOrdinal: number = 0): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: monthOrdinal as MonthOrdinal },
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

/**
 * Simulates the actual loadSnapshotState boundary in campaign.ts:
 *   raw persisted -> validateAnyCampaignState -> migrateToCurrentVersion
 *
 * This is the exact code path used by undo/redo/checkpoint-restore.
 */
function loadSnapshotBoundary(rawPersistedState: unknown): CurrentCampaignState {
  const validated = validateAnyCampaignState(rawPersistedState);
  return migrateToCurrentVersion(validated);
}

// ================================================================
// A: V2 current + V1 snapshot at same revision; next command succeeds
// ================================================================

describe("Mixed V1/V2 Production Paths", () => {
  describe("A: next command succeeds with V1 snapshot at same revision", () => {
    it("loadSnapshotBoundary converts V1 to valid V2", () => {
      const raw = v1SnapshotFixture(0);
      const loaded = loadSnapshotBoundary(raw);
      expect(loaded.schemaVersion).toBe(2);
      validateCampaignState(loaded);
    });

    it("V2 current state accepts normal command after V1 snapshot boundary", () => {
      // Scenario: revision 0 snapshot is V1, campaign doc is already V2 (admin-migrated)
      const currentV2 = v2State(0);
      const result = applyMoveMonth(currentV2, "forward");
      expect(result.nextState.calendar.monthOrdinal).toBe(1);
      validateCampaignState(result.nextState);
      // The V1 snapshot at rev 0 remains untouched — only current state advances
    });
  });

  // ================================================================
  // B: Undo targeting stored V1 snapshot
  // ================================================================

  describe("B: undo targeting V1 snapshot restores migrated V2", () => {
    it("deriveUndoTransition with V1 target (loaded through boundary) succeeds", () => {
      // revision 0 snapshot: V1 (as persisted)
      const rawV1Snap = v1SnapshotFixture(0);
      // Load through actual boundary (simulating loadSnapshotState)
      const targetState = loadSnapshotBoundary(rawV1Snap);

      // Current state at revision 1 (V2, after a move_month)
      const currentV2 = applyMoveMonth(v2State(0), "forward").nextState;
      const currentLogical = currentV2; // top of undo stack is revision 1

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_test",
        undoStack: [0, 1],
        redoStack: [],
      };

      const result = deriveUndoTransition(
        {
          control,
          campaignRevision: 1,
          campaignState: currentV2,
          targetSnapshotState: targetState,
          currentLogicalSnapshotState: currentLogical,
          targetRevisionCommandType: null,
        },
        control.campaignId,
      );

      expect(result.nextState.schemaVersion).toBe(2);
      validateCampaignState(result.nextState);
      expect(result.nextState.calendar.monthOrdinal).toBe(0);
      expect(result.event.type).toBe("undo_applied");
      expect(result.nextUndoStack).toEqual([0]);
      expect(result.nextRedoStack).toEqual([1]);
    });
  });

  // ================================================================
  // C: Redo targeting stored V1 snapshot
  // ================================================================

  describe("C: redo targeting V1 snapshot restores migrated V2", () => {
    it("deriveRedoTransition with V1 target (loaded through boundary) succeeds", () => {
      // After undoing back to rev 0, redo targets revision 1 (which has a V1 snapshot)
      const rawV1Snap = v1SnapshotFixture(3); // some advanced month
      const targetState = loadSnapshotBoundary(rawV1Snap);

      const currentV2 = v2State(0); // we're back at initial after undo

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_test",
        undoStack: [0],
        redoStack: [1],
      };

      const result = deriveRedoTransition(
        {
          control,
          campaignRevision: 2, // audit revision from undo
          campaignState: currentV2,
          targetSnapshotState: targetState,
          currentLogicalSnapshotState: currentV2,
          targetRevisionCommandType: "move_month",
        },
        control.campaignId,
      );

      expect(result.nextState.schemaVersion).toBe(2);
      validateCampaignState(result.nextState);
      expect(result.nextState.calendar.monthOrdinal).toBe(3);
      expect(result.event.type).toBe("redo_applied");
    });
  });

  // ================================================================
  // D: Checkpoint restore from V1 snapshot
  // ================================================================

  describe("D: checkpoint restore from V1 snapshot yields V2", () => {
    it("V1 checkpoint source snapshot loads through boundary as valid V2", () => {
      const rawV1 = v1SnapshotFixture(7);
      const restored = loadSnapshotBoundary(rawV1);
      expect(restored.schemaVersion).toBe(2);
      expect(restored.calendar.monthOrdinal).toBe(7);
      expect(restored.players).toEqual([]);
      expect(restored.wizards).toEqual([]);
      validateCampaignState(restored);
    });
  });

  // ================================================================
  // E: Verifier accepts valid V2-current / V1-history
  // ================================================================

  describe("E: verifier accepts valid mixed V1/V2 campaign", () => {
    it("verifyMigrationInvariants passes with V1 snapshots in history", () => {
      // Campaign at revision 1: snapshot 0 is V1, snapshot 1 is V2
      const v1Snap = v1SnapshotFixture(0) as unknown as SerializableCampaignState;
      const v2Snap = v2State(1) as unknown as SerializableCampaignState;

      const revisions: RevisionRecord[] = [
        { campaignRevision: 1, commandType: "move_month", commandFingerprint: moveMonthFingerprint("forward") },
      ];
      const events: EventRecord[] = [
        { campaignRevision: 1, eventIndex: 0, event: { type: "month_changed", version: 1, data: { direction: "forward", fromOrdinal: 0, toOrdinal: 1 } } },
      ];
      const snapshots: SnapshotRecord[] = [
        { campaignRevision: 0, state: v1Snap },
        { campaignRevision: 1, state: v2Snap },
      ];
      const campaignDocuments: CampaignDocument[] = [
        { campaignKey: "default", campaignId: "cmp_test", campaignRevision: 1, state: v2Snap },
      ];

      const result = verifyMigrationInvariants({
        campaignRevision: 1,
        revisions,
        events,
        snapshots,
        campaignDocuments,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("verifyHistoryControl passes with V1 snapshot at undo top (migrated)", () => {
      const v2Snap = v2State(0) as unknown as SerializableCampaignState;

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_test",
        undoStack: [0],
        redoStack: [],
      };

      const errors = verifyHistoryControl({
        control,
        campaignId: "cmp_test",
        campaignRevision: 0,
        campaignState: v2State(0),
        revisions: [],
        events: [],
        snapshotRevisions: [0],
        snapshotAtUndoTop: v2Snap,
      });

      expect(errors).toHaveLength(0);
    });
  });

  // ================================================================
  // F: Verifier rejects genuinely inconsistent mixed history
  // ================================================================

  describe("F: verifier rejects genuinely inconsistent campaign", () => {
    it("missing snapshot is detected", () => {
      const v2Snap = v2State(1) as unknown as SerializableCampaignState;

      const revisions: RevisionRecord[] = [
        { campaignRevision: 1, commandType: "move_month", commandFingerprint: moveMonthFingerprint("forward") },
      ];
      const events: EventRecord[] = [
        { campaignRevision: 1, eventIndex: 0, event: { type: "month_changed", version: 1, data: { direction: "forward", fromOrdinal: 0, toOrdinal: 1 } } },
      ];
      // Only revision 1 snapshot, missing revision 0
      const snapshots: SnapshotRecord[] = [
        { campaignRevision: 1, state: v2Snap },
      ];
      const campaignDocuments: CampaignDocument[] = [
        { campaignKey: "default", campaignId: "cmp_test", campaignRevision: 1, state: v2Snap },
      ];

      const result = verifyMigrationInvariants({
        campaignRevision: 1,
        revisions,
        events,
        snapshots,
        campaignDocuments,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validateAnyCampaignState rejects unknown schemaVersion", () => {
      expect(() => validateAnyCampaignState({ schemaVersion: 99 })).toThrow();
    });
  });

  // ================================================================
  // G: V1 fixture unchanged through load boundary
  // ================================================================

  describe("G: V1 snapshots remain unchanged in storage", () => {
    it("loadSnapshotBoundary does not mutate the raw V1 fixture", () => {
      const raw = v1SnapshotFixture(5);
      const serializedBefore = JSON.stringify(raw);
      loadSnapshotBoundary(raw);
      expect(JSON.stringify(raw)).toBe(serializedBefore);
    });

    it("V1 fixture retains exact structure after multiple loads", () => {
      const raw = v1SnapshotFixture(12);
      const copy = JSON.parse(JSON.stringify(raw));
      loadSnapshotBoundary(raw);
      loadSnapshotBoundary(raw);
      loadSnapshotBoundary(raw);
      expect(raw).toEqual(copy);
    });
  });
});

// ================================================================
// M3 Idempotency: simulated pre-transition check logic
// ================================================================

describe("M3 Idempotency Pre-Transition Check", () => {
  /**
   * Simulates the pre-transition idempotency check pattern from m3Commands.ts.
   * In production this queries campaignRevisions; here we simulate the lookup.
   */
  interface CommittedCommand {
    commandId: string;
    commandType: string;
    commandFingerprint: string;
    campaignRevision: number;
  }

  function checkIdempotencySimulated(
    existingCommands: CommittedCommand[],
    commandId: string,
    commandType: string,
    commandFingerprint: string,
  ): { alreadyApplied: true; revision: number } | null {
    const existing = existingCommands.find((c) => c.commandId === commandId);
    if (!existing) return null;

    if (existing.commandType !== commandType || existing.commandFingerprint !== commandFingerprint) {
      throw new DomainError(
        "COMMAND_ID_REUSED",
        `CommandId "${commandId}" already committed with type="${existing.commandType}" fingerprint="${existing.commandFingerprint}"`,
      );
    }

    return { alreadyApplied: true, revision: existing.campaignRevision };
  }

  it("exact add_player retry returns original revision without new revision", () => {
    const fp = addPlayerFingerprint("plr_abc", "Alice");
    const committed: CommittedCommand[] = [
      { commandId: "cmd_1", commandType: "add_player", commandFingerprint: fp, campaignRevision: 1 },
    ];

    const result = checkIdempotencySimulated(committed, "cmd_1", "add_player", fp);
    expect(result).not.toBeNull();
    expect(result!.alreadyApplied).toBe(true);
    expect(result!.revision).toBe(1);
  });

  it("exact create_wizard retry returns original revision", () => {
    const fp = createWizardFingerprint("wiz_abc", "Zephyr", "plr_1", "necromancer");
    const committed: CommittedCommand[] = [
      { commandId: "cmd_2", commandType: "create_wizard", commandFingerprint: fp, campaignRevision: 2 },
    ];

    const result = checkIdempotencySimulated(committed, "cmd_2", "create_wizard", fp);
    expect(result).not.toBeNull();
    expect(result!.alreadyApplied).toBe(true);
    expect(result!.revision).toBe(2);
  });

  it("exact remove_player retry returns original revision (player already absent)", () => {
    const fp = "remove_player:v1:plr_abc"; // matches removePlayerFingerprint("plr_abc")
    const committed: CommittedCommand[] = [
      { commandId: "cmd_3", commandType: "remove_player", commandFingerprint: fp, campaignRevision: 3 },
    ];

    const result = checkIdempotencySimulated(committed, "cmd_3", "remove_player", fp);
    expect(result).not.toBeNull();
    expect(result!.alreadyApplied).toBe(true);
    expect(result!.revision).toBe(3);
  });

  it("same commandId with changed normalized name throws COMMAND_ID_REUSED", () => {
    const fpOriginal = addPlayerFingerprint("plr_abc", "Alice");
    const fpChanged = addPlayerFingerprint("plr_abc", "Bob");
    const committed: CommittedCommand[] = [
      { commandId: "cmd_1", commandType: "add_player", commandFingerprint: fpOriginal, campaignRevision: 1 },
    ];

    expect(() =>
      checkIdempotencySimulated(committed, "cmd_1", "add_player", fpChanged),
    ).toThrow(DomainError);

    try {
      checkIdempotencySimulated(committed, "cmd_1", "add_player", fpChanged);
    } catch (e: any) {
      expect(e.code).toBe("COMMAND_ID_REUSED");
    }
  });

  it("same commandId with different command type throws COMMAND_ID_REUSED", () => {
    const fp = addPlayerFingerprint("plr_abc", "Alice");
    const committed: CommittedCommand[] = [
      { commandId: "cmd_1", commandType: "add_player", commandFingerprint: fp, campaignRevision: 1 },
    ];

    expect(() =>
      checkIdempotencySimulated(committed, "cmd_1", "rename_player", "rename_player:v1:plr_abc:Alice"),
    ).toThrow(DomainError);
  });

  it("retry after unrelated later revisions still returns original accepted revision", () => {
    const fp = addPlayerFingerprint("plr_abc", "Alice");
    // cmd_1 was applied at rev 1, later revisions 2 and 3 exist
    const committed: CommittedCommand[] = [
      { commandId: "cmd_1", commandType: "add_player", commandFingerprint: fp, campaignRevision: 1 },
      { commandId: "cmd_2", commandType: "add_player", commandFingerprint: addPlayerFingerprint("plr_def", "Bob"), campaignRevision: 2 },
      { commandId: "cmd_3", commandType: "move_month", commandFingerprint: moveMonthFingerprint("forward"), campaignRevision: 3 },
    ];

    const result = checkIdempotencySimulated(committed, "cmd_1", "add_player", fp);
    expect(result).not.toBeNull();
    expect(result!.revision).toBe(1);
    // Does not return 3 (latest) - returns original accepted revision
  });

  it("new command not found in committed list returns null (proceed to execute)", () => {
    const committed: CommittedCommand[] = [
      { commandId: "cmd_1", commandType: "add_player", commandFingerprint: "x", campaignRevision: 1 },
    ];

    const result = checkIdempotencySimulated(committed, "cmd_new", "add_player", "y");
    expect(result).toBeNull();
  });
});
