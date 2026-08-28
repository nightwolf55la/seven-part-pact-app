import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  validateAnyCampaignState,
  initialCampaignState,
  statesDeepEqual,
  applyAddPlayer,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
  addPlayerFingerprint,
  createWizardFingerprint,
} from "../shared/domain";
import type { CurrentCampaignState, PlayerId, CampaignStateV1, CampaignHistoryControlV1, MonthOrdinal } from "../shared/domain";
import { migrateToCurrentVersion, migrateV1toV2 } from "../shared/domain/state-migration";
import { deriveUndoTransition, deriveRedoTransition } from "../shared/domain/undo-redo";

/**
 * These tests prove that a campaign with mixed V1 historical snapshots
 * and a V2 current state operates correctly across undo/redo/restore paths.
 */

function makeV1Snapshot(monthOrdinal: number): CampaignStateV1 {
  return {
    schemaVersion: 1,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: monthOrdinal as MonthOrdinal },
  };
}

function makeV2Current(): CurrentCampaignState {
  return initialCampaignState();
}

function makeV2WithPlayer(): { state: CurrentCampaignState; playerId: PlayerId } {
  const state = initialCampaignState();
  const playerId = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
  const result = applyAddPlayer(state, playerId, "Alice");
  return { state: result.nextState, playerId };
}

describe("Mixed V1/V2 History Paths", () => {
  describe("A: V2 current with immutable V1 snapshot at same logical revision", () => {
    it("V1 snapshot migrates to equivalent V2 without mutating original", () => {
      const v1Snap = makeV1Snapshot(0);
      const original = JSON.parse(JSON.stringify(v1Snap));

      const validated = validateAnyCampaignState(v1Snap);
      const migrated = migrateToCurrentVersion(validated);

      expect(migrated.schemaVersion).toBe(2);
      validateCampaignState(migrated);
      expect(v1Snap).toEqual(original); // V1 unchanged
    });

    it("migrated V1 snapshot is deep-equal to fresh V2 initial state", () => {
      const v1Snap = makeV1Snapshot(0);
      const migrated = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));
      const freshV2 = makeV2Current();
      expect(statesDeepEqual(migrated, freshV2)).toBe(true);
    });

    it("normal M3 command succeeds on explicitly migrated V2 current state", () => {
      // Simulates: admin migration has run, current is V2, but revision-0 snapshot is still V1
      const currentV2 = makeV2Current();
      const playerId = "plr_00000000-0000-0000-0000-000000000002" as PlayerId;
      const result = applyAddPlayer(currentV2, playerId, "Bob");
      expect(result.nextState.players).toHaveLength(1);
      validateCampaignState(result.nextState);
    });
  });

  describe("B: Undo targeting V1 snapshot restores migrated V2", () => {
    it("deriveUndoTransition produces V2 restored state from V1 target", () => {
      // Setup: revision 0 has V1 snapshot, revision 1 has V2 snapshot
      const v1Snap = makeV1Snapshot(0);
      const migratedV1 = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));

      // Current state at revision 1 (after add_player from V2 base)
      const { state: currentV2 } = makeV2WithPlayer();

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_00000000-0000-0000-0000-000000000001",
        undoStack: [0, 1],
        redoStack: [],
      };

      const result = deriveUndoTransition(
        {
          control,
          campaignRevision: 1,
          campaignState: currentV2,
          targetSnapshotState: migratedV1, // caller has already migrated the V1 snapshot
          currentLogicalSnapshotState: currentV2,
          targetRevisionCommandType: null,
        },
        control.campaignId,
      );

      expect(result.nextState.schemaVersion).toBe(2);
      validateCampaignState(result.nextState);
      expect(statesDeepEqual(result.nextState, migratedV1)).toBe(true);
      expect(result.event.type).toBe("undo_applied");
    });

    it("undo produces valid undo/redo stacks", () => {
      const v1Snap = makeV1Snapshot(0);
      const migratedV1 = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));
      const { state: currentV2 } = makeV2WithPlayer();

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_00000000-0000-0000-0000-000000000001",
        undoStack: [0, 1],
        redoStack: [],
      };

      const result = deriveUndoTransition(
        {
          control,
          campaignRevision: 1,
          campaignState: currentV2,
          targetSnapshotState: migratedV1,
          currentLogicalSnapshotState: currentV2,
          targetRevisionCommandType: null,
        },
        control.campaignId,
      );

      // After undo: undoStack = [0], redoStack = [1]
      expect(result.nextUndoStack).toEqual([0]);
      expect(result.nextRedoStack).toEqual([1]);
    });
  });

  describe("C: Redo targeting V1 snapshot restores migrated V2", () => {
    it("deriveRedoTransition produces V2 restored state from V1 target", () => {
      // After an undo has been performed, redo targets revision 1 which has V1 snapshot
      const v1SnapAtRev1 = makeV1Snapshot(3);
      const migratedV1AtRev1 = migrateToCurrentVersion(validateAnyCampaignState(v1SnapAtRev1));

      // Current state is at revision 0 (initial) after undoing
      const currentV2 = makeV2Current();

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_00000000-0000-0000-0000-000000000001",
        undoStack: [0],
        redoStack: [1],
      };

      const result = deriveRedoTransition(
        {
          control,
          campaignRevision: 2, // audit revision from the undo
          campaignState: currentV2,
          targetSnapshotState: migratedV1AtRev1,
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

  describe("D: Checkpoint restore from V1 snapshot yields V2", () => {
    it("migrating a V1 checkpoint snapshot produces valid V2 for restore", () => {
      // Checkpoint at revision 2 stored a V1 snapshot
      const v1Snap = makeV1Snapshot(7);
      const validated = validateAnyCampaignState(v1Snap);
      const migrated = migrateToCurrentVersion(validated);

      expect(migrated.schemaVersion).toBe(2);
      expect(migrated.calendar.monthOrdinal).toBe(7);
      validateCampaignState(migrated);

      // The restored V2 has default empty collections
      expect(migrated.players).toEqual([]);
      expect(migrated.wizards).toEqual([]);
      expect(migrated.configuration.ageId).toBeNull();
      expect(migrated.configuration.facilitatorPlayerId).toBeNull();
    });
  });

  describe("E: Verification of valid mixed-history campaign", () => {
    it("statesDeepEqual correctly compares migrated V1 to fresh V2", () => {
      const v1Snap = makeV1Snapshot(0);
      const migrated = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));
      const freshV2 = makeV2Current();
      expect(statesDeepEqual(migrated, freshV2)).toBe(true);
    });

    it("statesDeepEqual detects difference between migrated V1 and modified V2", () => {
      const v1Snap = makeV1Snapshot(0);
      const migrated = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));
      const modifiedV2 = applyAddPlayer(migrated, "plr_00000000-0000-0000-0000-000000000001" as PlayerId, "X").nextState;
      expect(statesDeepEqual(migrated, modifiedV2)).toBe(false);
    });
  });

  describe("F: Genuine inconsistencies are still detected", () => {
    it("validateCampaignState rejects V1 state directly", () => {
      const v1Snap = makeV1Snapshot(3);
      expect(() => validateCampaignState(v1Snap)).toThrow();
    });

    it("validateAnyCampaignState rejects corrupt data", () => {
      expect(() => validateAnyCampaignState({ schemaVersion: 99 })).toThrow();
      expect(() => validateAnyCampaignState(null)).toThrow();
      expect(() => validateAnyCampaignState({ schemaVersion: 1, ruleset: null })).toThrow();
    });

    it("migrateToCurrentVersion rejects unknown schema version", () => {
      expect(() => migrateToCurrentVersion({ schemaVersion: 99 } as any)).toThrow();
    });
  });

  describe("G: V1 snapshots remain byte/logically unchanged", () => {
    it("JSON round-trip of V1 is stable through migration process", () => {
      const v1Snap = makeV1Snapshot(12);
      const serialized = JSON.stringify(v1Snap);
      const parsed = JSON.parse(serialized);

      // Migrate in memory
      migrateToCurrentVersion(validateAnyCampaignState(parsed));

      // Original parsed object unchanged
      expect(JSON.stringify(parsed)).toBe(serialized);
    });

    it("multiple migrations of same V1 produce identical V2", () => {
      const v1Snap = makeV1Snapshot(5);
      const m1 = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));
      const m2 = migrateToCurrentVersion(validateAnyCampaignState(v1Snap));
      expect(statesDeepEqual(m1, m2)).toBe(true);
    });
  });
});

describe("M3 Idempotency Fingerprints", () => {
  it("addPlayerFingerprint includes normalized name", () => {
    const fp1 = addPlayerFingerprint("plr_abc", "Alice");
    const fp2 = addPlayerFingerprint("plr_abc", "Bob");
    expect(fp1).not.toBe(fp2);
    expect(fp1).toContain("Alice");
  });

  it("addPlayerFingerprint same intent produces same fingerprint", () => {
    const fp1 = addPlayerFingerprint("plr_abc", "Alice");
    const fp2 = addPlayerFingerprint("plr_abc", "Alice");
    expect(fp1).toBe(fp2);
  });

  it("createWizardFingerprint includes all intent parameters", () => {
    const fp1 = createWizardFingerprint("wiz_a", "Zephyr", "plr_1", "necromancer");
    const fp2 = createWizardFingerprint("wiz_a", "Zephyr", "plr_2", "necromancer");
    const fp3 = createWizardFingerprint("wiz_a", "Zephyr", "plr_1", "sage");
    const fp4 = createWizardFingerprint("wiz_a", "Other", "plr_1", "necromancer");
    expect(fp1).not.toBe(fp2); // different portrayal
    expect(fp1).not.toBe(fp3); // different seat
    expect(fp1).not.toBe(fp4); // different name
  });

  it("MIGRATION_REQUIRED error code exists", () => {
    const err = new DomainError("MIGRATION_REQUIRED", "test");
    expect(err.code).toBe("MIGRATION_REQUIRED");
  });
});
