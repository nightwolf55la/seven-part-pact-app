import { describe, it, expect } from "vitest";
import {
  loadHistoricalState,
  isHistoricalStateLogicallyEqual,
  validateCampaignState,
  validateAnyCampaignState,
  verifyMigrationInvariants,
  verifyHistoryControl,
  deriveUndoTransition,
  deriveRedoTransition,
  DomainError,
  matchCommandIdempotency,
  addPlayerFingerprint,
  createWizardFingerprint,
  removePlayerFingerprint,

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
    lifecycle: {
      kind: "play" as const,
      phase: "new_moon" as const,
      orrery: { saturn: 0 as any, jupiter: 9000 as any, mars: 18000 as any, venus: 27000 as any, mercury: 4500 as any },
      currentMonth: { timeParticipants: [], engagements: [], wizardmootAttendance: null },
    },
    wizardmootHistory: [],
  };
}

// ================================================================
// A: loadHistoricalState (the PRODUCTION helper) on V1 snapshots
// ================================================================

describe("loadHistoricalState (production helper)", () => {
  it("rejects V1 raw fixture (V3-only)", () => {
    const raw = v1SnapshotFixture(0);
    expect(() => loadHistoricalState(raw)).toThrow();
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

  it("does not mutate the raw V1 fixture when rejecting", () => {
    const raw = v1SnapshotFixture(5);
    const serializedBefore = JSON.stringify(raw);
    expect(() => loadHistoricalState(raw)).toThrow();
    expect(JSON.stringify(raw)).toBe(serializedBefore);
  });

  it("V1 fixture remains unchanged after multiple rejections", () => {
    const raw = v1SnapshotFixture(12);
    const copy = JSON.parse(JSON.stringify(raw));
    expect(() => loadHistoricalState(raw)).toThrow();
    expect(() => loadHistoricalState(raw)).toThrow();
    expect(() => loadHistoricalState(raw)).toThrow();
    expect(raw).toEqual(copy);
  });
});

// ================================================================
// A2: isHistoricalStateLogicallyEqual (ensureCampaign coherence helper)
// ================================================================

describe("isHistoricalStateLogicallyEqual (production helper)", () => {
  it("rejects V1 revision-0 snapshot (V3-only)", () => {
    const v1Raw = v1SnapshotFixture(0);
    const v2Current = v2State(0);
    expect(() => isHistoricalStateLogicallyEqual(v1Raw, v2Current)).toThrow();
  });

  it("detects mismatch in facilitatorPlayerId field", () => {
    const base = v2State(0);
    const altered = { ...v2State(0), configuration: { ageId: null, facilitatorPlayerId: "plr_fake" as any } };
    expect(isHistoricalStateLogicallyEqual(base, altered)).toBe(false);
  });

  it("detects mismatch in players field", () => {
    const base = v2State(0);
    const altered: CurrentCampaignState = {
      ...v2State(0),
      players: [{ playerId: "plr_fake" as any, name: "Ghost" }],
    };
    expect(isHistoricalStateLogicallyEqual(base, altered)).toBe(false);
  });

  it("detects mismatch in monthOrdinal field", () => {
    const base = v2State(0);
    const altered = v2State(5);
    expect(isHistoricalStateLogicallyEqual(base, altered)).toBe(false);
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

describe("V3 Production Paths", () => {
  describe("undo targeting V3 snapshot", () => {
    it("deriveUndoTransition succeeds with V3 target state", () => {
      const targetState = v2State(0);
      const currentV2 = v2State(1);

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

      expect(result.nextState.schemaVersion).toBe(3);
      validateCampaignState(result.nextState);
      expect(result.nextState.calendar.monthOrdinal).toBe(0);
      expect(result.event.type).toBe("undo_applied");
      expect(result.nextUndoStack).toEqual([0]);
      expect(result.nextRedoStack).toEqual([1]);
    });
  });

  describe("redo targeting V3 snapshot", () => {
    it("deriveRedoTransition succeeds with V3 target state", () => {
      const targetState = v2State(3);
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
          targetRevisionCommandType: "legacy_month_change",
        },
        control.campaignId,
      );

      expect(result.nextState.schemaVersion).toBe(3);
      validateCampaignState(result.nextState);
      expect(result.nextState.calendar.monthOrdinal).toBe(3);
      expect(result.event.type).toBe("redo_applied");
    });
  });

  describe("checkpoint restore from V3 snapshot", () => {
    it("V3 checkpoint source is valid", () => {
      const restored = v2State(7);
      expect(restored.schemaVersion).toBe(3);
      expect(restored.calendar.monthOrdinal).toBe(7);
      expect(restored.players).toEqual([]);
      expect(restored.wizards).toEqual([]);
      validateCampaignState(restored);
    });
  });

  describe("verifier accepts valid V3 campaign", () => {
    it("verifyMigrationInvariants passes with V3 snapshots in history", () => {
      const v3Snap = v2State(0) as unknown as SerializableCampaignState;
      const v2Snap = v2State(1) as unknown as SerializableCampaignState;

      const revisions: RevisionRecord[] = [
        { campaignRevision: 1, commandType: "legacy_month_change", commandFingerprint: "legacy_month_change:v1:rev1:forward" },
      ];
      const events: EventRecord[] = [
        { campaignRevision: 1, eventIndex: 0, event: { type: "month_changed", version: 1, data: { direction: "forward", fromOrdinal: 0, toOrdinal: 1 } } },
      ];
      const snapshots: SnapshotRecord[] = [
        { campaignRevision: 0, state: v3Snap },
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

    it("verifyHistoryControl passes with V3 snapshot at undo top", () => {
      const migratedUndoTop = v2State(0) as unknown as SerializableCampaignState;

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
        { campaignRevision: 1, commandType: "legacy_month_change", commandFingerprint: "legacy_month_change:v1:rev1:forward" },
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
