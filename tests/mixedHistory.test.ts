import { describe, it, expect } from "vitest";
import {
  loadHistoricalState,
  isHistoricalStateLogicallyEqual,
  validateCampaignState,
  validateAnyCampaignState,
  applyMoveMonth,
  verifyMigrationInvariants,
  verifyHistoryControl,
  deriveUndoTransition,
  deriveRedoTransition,
  DomainError,
  matchCommandIdempotency,
  addPlayerFingerprint,
  createWizardFingerprint,
  removePlayerFingerprint,
  moveMonthFingerprint,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  CampaignStateV1,
  CampaignHistoryControlV1,
  MonthOrdinal,
  SnapshotRecord,
  RevisionRecord,
  EventRecord,
  CampaignDocument,
  SerializableCampaignState,
  IdempotencyMatchResult,
} from "../shared/domain";

// ================================================================
// Fixtures
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

// ================================================================
// A: loadHistoricalState (the PRODUCTION helper) on V1 snapshots
// ================================================================

describe("loadHistoricalState (production helper)", () => {
  it("converts V1 raw fixture to valid V2", () => {
    const raw = v1SnapshotFixture(0);
    const loaded = loadHistoricalState(raw);
    expect(loaded.schemaVersion).toBe(2);
    validateCampaignState(loaded);
  });

  it("preserves V2 state unchanged", () => {
    const v2 = v2State(5);
    const loaded = loadHistoricalState(v2);
    expect(loaded).toEqual(v2);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() => loadHistoricalState({ schemaVersion: 99 })).toThrow();
  });

  it("rejects null input", () => {
    expect(() => loadHistoricalState(null)).toThrow();
  });

  it("does not mutate the raw V1 fixture", () => {
    const raw = v1SnapshotFixture(5);
    const serializedBefore = JSON.stringify(raw);
    loadHistoricalState(raw);
    expect(JSON.stringify(raw)).toBe(serializedBefore);
  });

  it("V1 fixture remains unchanged after multiple loads", () => {
    const raw = v1SnapshotFixture(12);
    const copy = JSON.parse(JSON.stringify(raw));
    loadHistoricalState(raw);
    loadHistoricalState(raw);
    loadHistoricalState(raw);
    expect(raw).toEqual(copy);
  });
});

// ================================================================
// A2: isHistoricalStateLogicallyEqual (ensureCampaign coherence helper)
// ================================================================

describe("isHistoricalStateLogicallyEqual (production helper)", () => {
  it("V1 revision-0 snapshot equals its explicitly migrated V2 representation", () => {
    const v1Raw = v1SnapshotFixture(0);
    const v2Current = v2State(0);
    expect(isHistoricalStateLogicallyEqual(v1Raw, v2Current)).toBe(true);
  });

  it("detects mismatch in a V2-only field (facilitatorPlayerId)", () => {
    const v1Raw = v1SnapshotFixture(0);
    const altered = { ...v2State(0), configuration: { ageId: null, facilitatorPlayerId: "plr_fake" as any } };
    expect(isHistoricalStateLogicallyEqual(v1Raw, altered)).toBe(false);
  });

  it("detects mismatch in a V2-only field (players)", () => {
    const v1Raw = v1SnapshotFixture(0);
    const altered: CurrentCampaignState = {
      ...v2State(0),
      players: [{ playerId: "plr_fake" as any, name: "Ghost" }],
    };
    expect(isHistoricalStateLogicallyEqual(v1Raw, altered)).toBe(false);
  });

  it("detects mismatch in a V1 field (monthOrdinal)", () => {
    const v1Raw = v1SnapshotFixture(0);
    const altered = v2State(5);
    expect(isHistoricalStateLogicallyEqual(v1Raw, altered)).toBe(false);
  });

  it("fails closed on malformed historical state", () => {
    expect(() => isHistoricalStateLogicallyEqual({ schemaVersion: 99 }, v2State(0))).toThrow();
  });

  it("fails closed on null historical state", () => {
    expect(() => isHistoricalStateLogicallyEqual(null, v2State(0))).toThrow();
  });
});

// ================================================================
// B: Mixed V1/V2 production paths (undo/redo through V1 snapshots)
// ================================================================

describe("Mixed V1/V2 Production Paths", () => {
  describe("undo targeting V1 snapshot (via loadHistoricalState)", () => {
    it("deriveUndoTransition succeeds with V1-origin target state", () => {
      const targetState = loadHistoricalState(v1SnapshotFixture(0));
      const currentV2 = applyMoveMonth(v2State(0), "forward").nextState;

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
          currentLogicalSnapshotState: currentV2,
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

  describe("redo targeting V1 snapshot (via loadHistoricalState)", () => {
    it("deriveRedoTransition succeeds with V1-origin target state", () => {
      const targetState = loadHistoricalState(v1SnapshotFixture(3));
      const currentV2 = v2State(0);

      const control: CampaignHistoryControlV1 = {
        historyControlVersion: 1,
        campaignId: "cmp_test",
        undoStack: [0],
        redoStack: [1],
      };

      const result = deriveRedoTransition(
        {
          control,
          campaignRevision: 2,
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

  describe("checkpoint restore from V1 snapshot", () => {
    it("V1 checkpoint source loads as valid V2 through production helper", () => {
      const restored = loadHistoricalState(v1SnapshotFixture(7));
      expect(restored.schemaVersion).toBe(2);
      expect(restored.calendar.monthOrdinal).toBe(7);
      expect(restored.players).toEqual([]);
      expect(restored.wizards).toEqual([]);
      validateCampaignState(restored);
    });
  });

  describe("verifier accepts valid mixed V1/V2 campaign", () => {
    it("verifyMigrationInvariants passes with V1 snapshots in history", () => {
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

    it("verifyHistoryControl passes with V1 snapshot at undo top (migrated via loadHistoricalState)", () => {
      const migratedUndoTop = loadHistoricalState(v1SnapshotFixture(0)) as unknown as SerializableCampaignState;

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
        snapshotAtUndoTop: migratedUndoTop,
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe("verifier rejects genuinely inconsistent campaign", () => {
    it("missing snapshot is detected", () => {
      const v2Snap = v2State(1) as unknown as SerializableCampaignState;

      const revisions: RevisionRecord[] = [
        { campaignRevision: 1, commandType: "move_month", commandFingerprint: moveMonthFingerprint("forward") },
      ];
      const events: EventRecord[] = [
        { campaignRevision: 1, eventIndex: 0, event: { type: "month_changed", version: 1, data: { direction: "forward", fromOrdinal: 0, toOrdinal: 1 } } },
      ];
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
  });
});

// ================================================================
// C: matchCommandIdempotency (production helper)
// ================================================================

describe("matchCommandIdempotency (production helper)", () => {
  it("exact add_player match returns exact_match with original revision", () => {
    const fp = addPlayerFingerprint("plr_abc", "Alice");
    const result = matchCommandIdempotency(
      { commandType: "add_player", commandFingerprint: fp, campaignRevision: 1 },
      { commandType: "add_player", commandFingerprint: fp },
    );
    expect(result.kind).toBe("exact_match");
    if (result.kind === "exact_match") {
      expect(result.revision).toBe(1);
    }
  });

  it("exact create_wizard match returns exact_match", () => {
    const fp = createWizardFingerprint("wiz_abc", "Zephyr", "plr_1", "necromancer");
    const result = matchCommandIdempotency(
      { commandType: "create_wizard", commandFingerprint: fp, campaignRevision: 2 },
      { commandType: "create_wizard", commandFingerprint: fp },
    );
    expect(result.kind).toBe("exact_match");
    if (result.kind === "exact_match") {
      expect(result.revision).toBe(2);
    }
  });

  it("exact remove_player match returns exact_match", () => {
    const fp = removePlayerFingerprint("plr_abc");
    const result = matchCommandIdempotency(
      { commandType: "remove_player", commandFingerprint: fp, campaignRevision: 3 },
      { commandType: "remove_player", commandFingerprint: fp },
    );
    expect(result.kind).toBe("exact_match");
    if (result.kind === "exact_match") {
      expect(result.revision).toBe(3);
    }
  });

  it("same commandType but changed fingerprint returns conflict", () => {
    const fpOriginal = addPlayerFingerprint("plr_abc", "Alice");
    const fpChanged = addPlayerFingerprint("plr_abc", "Bob");
    const result = matchCommandIdempotency(
      { commandType: "add_player", commandFingerprint: fpOriginal, campaignRevision: 1 },
      { commandType: "add_player", commandFingerprint: fpChanged },
    );
    expect(result.kind).toBe("conflict");
    if (result.kind === "conflict") {
      expect(result.committedType).toBe("add_player");
      expect(result.committedFingerprint).toBe(fpOriginal);
    }
  });

  it("different commandType returns conflict", () => {
    const fp = addPlayerFingerprint("plr_abc", "Alice");
    const result = matchCommandIdempotency(
      { commandType: "add_player", commandFingerprint: fp, campaignRevision: 1 },
      { commandType: "rename_player", commandFingerprint: "rename_player:v1:plr_abc:Alice" },
    );
    expect(result.kind).toBe("conflict");
  });

  it("retry after unrelated later revisions still matches original", () => {
    const fp = addPlayerFingerprint("plr_abc", "Alice");
    const result = matchCommandIdempotency(
      { commandType: "add_player", commandFingerprint: fp, campaignRevision: 1 },
      { commandType: "add_player", commandFingerprint: fp },
    );
    expect(result.kind).toBe("exact_match");
    if (result.kind === "exact_match") {
      expect(result.revision).toBe(1);
    }
  });
});
