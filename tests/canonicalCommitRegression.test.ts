import { describe, it, expect } from "vitest";
import {
  deriveUndoTransition,
  deriveRedoTransition,
  validateUndoTransactionCoherence,
  validateRedoTransactionCoherence,
  DomainError,
  statesDeepEqual,
  parseAndVerifyBackupIntegrityForFingerprint,
  fullyValidateBackup,
  buildExportBackup,
  backupImportFingerprint,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  type CampaignHistoryControlV1,
  type CurrentCampaignState,
  type CampaignStateV1,
} from "../shared/domain";

// --- Helpers ---

function makeState(monthOrdinal: number): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: monthOrdinal as any },
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

function assertDomainError(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error(`Expected DomainError(${code}) but no error was thrown`);
  } catch (e) {
    if (!(e instanceof DomainError)) {
      throw new Error(`Expected DomainError(${code}) but got: ${e}`);
    }
    expect(e.code).toBe(code);
  }
}

const STATES: CurrentCampaignState[] = Array.from({ length: 11 }, (_, i) => makeState(i));

// ============================================================
// Section 1: undoStack-top snapshot mismatch with currentState
// ============================================================

describe("pre-commit logical state coherence (validateControlPreconditions)", () => {
  it("currentLogicalSnapshotState null -> CAMPAIGN_STATE_CORRUPT", () => {
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

  it("currentLogicalSnapshotState mismatch with campaignState -> CAMPAIGN_STATE_CORRUPT", () => {
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

  it("redo also checks currentLogicalSnapshotState mismatch -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: STATES[2],
        currentLogicalSnapshotState: STATES[9], // mismatch
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });
});

// ============================================================
// Section 2: Undo target — no fallback to nextState
// ============================================================

describe("undo target validation — no snapshot fallback", () => {
  it("missing undo target snapshot (null) -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: null, // missing
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("nonzero undo target with missing revision record -> CAMPAIGN_STATE_CORRUPT", () => {
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

  it("undo target with navigation commandType (undo) -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: STATES[1],
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: "undo", // not logical-state
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("undo target with navigation commandType (redo) -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveUndoTransition({
        control: makeControl([0, 1, 2]),
        campaignRevision: 2,
        campaignState: STATES[2],
        targetSnapshotState: STATES[1],
        currentLogicalSnapshotState: STATES[2],
        targetRevisionCommandType: "redo", // not logical-state
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("undo to revision 0 without a revision record is legal", () => {
    const result = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: STATES[1],
      targetSnapshotState: STATES[0],
      currentLogicalSnapshotState: STATES[1],
      targetRevisionCommandType: null,
    }, "camp-1");
    expect(result.targetRevision).toBe(0);
    expect(statesDeepEqual(result.nextState, STATES[0])).toBe(true);
  });
});

// ============================================================
// Section 3: Redo target — no snapshot fallback
// ============================================================

describe("redo target validation — no snapshot fallback", () => {
  it("missing redo target snapshot (null) -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: null, // missing
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: "move_month",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("redo target missing revision record -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: STATES[2],
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: null,
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });

  it("redo target with navigation commandType -> CAMPAIGN_STATE_CORRUPT", () => {
    assertDomainError(() => {
      deriveRedoTransition({
        control: makeControl([0, 1], [2]),
        campaignRevision: 3,
        campaignState: STATES[1],
        targetSnapshotState: STATES[2],
        currentLogicalSnapshotState: STATES[1],
        targetRevisionCommandType: "undo",
      }, "camp-1");
    }, "CAMPAIGN_STATE_CORRUPT");
  });
});

// ============================================================
// Section 4: Coherence validators reject mismatched target snapshot
// (proves no fallback in canonicalCommit passes silently)
// ============================================================

describe("coherence validators reject restoredState != targetSnapshotState", () => {
  it("undo: restoredState differs from targetSnapshotState -> error", () => {
    const errors = validateUndoTransactionCoherence({
      priorUndoStack: [0, 1, 2, 3],
      priorRedoStack: [],
      nextUndoStack: [0, 1, 2],
      nextRedoStack: [3],
      event: { type: "undo_applied", version: 1, data: { fromRevision: 3, targetRevision: 2 } },
      restoredState: STATES[5], // caller passes nextState
      targetSnapshotState: STATES[2], // real snapshot
      newAuditRevision: 4,
    });
    expect(errors.some(e => e.includes("deep-equal"))).toBe(true);
  });

  it("redo: restoredState differs from targetSnapshotState -> error", () => {
    const errors = validateRedoTransactionCoherence({
      priorUndoStack: [0, 1, 2],
      priorRedoStack: [3],
      nextUndoStack: [0, 1, 2, 3],
      nextRedoStack: [],
      event: { type: "redo_applied", version: 1, data: { fromRevision: 2, targetRevision: 3 } },
      restoredState: STATES[5], // caller passes nextState
      targetSnapshotState: STATES[3], // real snapshot
      newAuditRevision: 4,
    });
    expect(errors.some(e => e.includes("deep-equal"))).toBe(true);
  });
});

// ============================================================
// Section 5: Valid undo/redo paths still accepted
// ============================================================

describe("valid undo/redo paths accepted", () => {
  it("valid undo produces no errors", () => {
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
    expect(errors).toHaveLength(0);
  });

  it("valid redo produces no errors", () => {
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
    expect(errors).toHaveLength(0);
  });

  it("valid undo derive transition succeeds", () => {
    const result = deriveUndoTransition({
      control: makeControl([0, 1, 2, 3]),
      campaignRevision: 3,
      campaignState: STATES[3],
      targetSnapshotState: STATES[2],
      currentLogicalSnapshotState: STATES[3],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(result.targetRevision).toBe(2);
    expect(statesDeepEqual(result.nextState, STATES[2])).toBe(true);
  });

  it("valid redo derive transition succeeds", () => {
    const result = deriveRedoTransition({
      control: makeControl([0, 1, 2], [3]),
      campaignRevision: 4,
      campaignState: STATES[2],
      targetSnapshotState: STATES[3],
      currentLogicalSnapshotState: STATES[2],
      targetRevisionCommandType: "move_month",
    }, "camp-1");
    expect(result.targetRevision).toBe(3);
    expect(statesDeepEqual(result.nextState, STATES[3])).toBe(true);
  });
});

// ============================================================
// Section 6: Pre-idempotency backup helper skips domain validation
// ============================================================

describe("parseAndVerifyBackupIntegrityForFingerprint — pre-idempotency split", () => {
  it("authenticates structurally valid V1 payload with unknown state schema", async () => {
    // Build a backup with a state that has an unrecognized schemaVersion.
    // The pre-idempotency helper should NOT reject this — it only checks
    // envelope structure and integrity.
    const validState: CampaignStateV1 = makeState(3);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state: validState,
    }, 1700000000000);

    // Tamper the state to have an unrecognized schema version AFTER signing
    // (which would break integrity). Instead, rebuild with a custom state
    // that would fail domain validation.
    // We need to build a backup where the state is structurally valid JSON
    // but would fail validateCampaignState. Use schemaVersion: 99.
    const customState = { schemaVersion: 99, ruleset: { id: "future_ruleset", version: 1 }, calendar: { monthOrdinal: 3 } };
    const customBackup = {
      ...backup,
      state: customState,
    };
    // Re-compute integrity for modified state
    const { computeBackupPayloadDigest, buildIntegrityPayloadFromParts, BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } = await import("../shared/domain");
    const integrityPayload = buildIntegrityPayloadFromParts(
      backup.provenance as any,
      customState as any,
    );
    const newDigest = await computeBackupPayloadDigest(integrityPayload);
    const rebuiltBackup = {
      formatType: BACKUP_FORMAT_TYPE,
      backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      provenance: backup.provenance,
      state: customState,
      integrity: { algorithm: "sha256" as const, digest: newDigest },
    };

    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(rebuiltBackup));
    // Should SUCCEED — pre-idempotency does not run CampaignState domain validation
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.serverDigest).toBe(newDigest);
    }
  });

  it("fullyValidateBackup rejects the same payload for domain incompatibility", async () => {
    const { computeBackupPayloadDigest, buildIntegrityPayloadFromParts, BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } = await import("../shared/domain");
    const validState: CampaignStateV1 = makeState(3);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state: validState,
    }, 1700000000000);

    const customState = { schemaVersion: 99, ruleset: { id: "future_ruleset", version: 1 }, calendar: { monthOrdinal: 3 } };
    const integrityPayload = buildIntegrityPayloadFromParts(
      backup.provenance as any,
      customState as any,
    );
    const newDigest = await computeBackupPayloadDigest(integrityPayload);
    const rebuiltBackup = {
      formatType: BACKUP_FORMAT_TYPE,
      backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      provenance: backup.provenance,
      state: customState,
      integrity: { algorithm: "sha256" as const, digest: newDigest },
    };

    // fullyValidateBackup (post-idempotency) MUST reject domain-invalid state
    const result = await fullyValidateBackup(JSON.stringify(rebuiltBackup), null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("BACKUP_INCOMPATIBLE");
    }
  });

  it("pre-idempotency helper still rejects tampered digest", async () => {
    const validState: CampaignStateV1 = makeState(3);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state: validState,
    }, 1700000000000);

    const tampered = { ...backup, integrity: { ...backup.integrity, digest: "b".repeat(64) } };
    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(tampered));
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("BACKUP_INTEGRITY_FAILED");
    }
  });

  it("pre-idempotency helper still rejects malformed envelope", async () => {
    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify({ formatType: "wrong" }));
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("INVALID_BACKUP_FORMAT");
    }
  });

  it("pre-idempotency returns correct digest for fingerprint construction", async () => {
    const validState: CampaignStateV1 = makeState(5);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 15,
      sourceLogicalRevision: 12,
      state: validState,
    }, 1700000000000);

    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(backup));
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      const fp = backupImportFingerprint(14, result.serverDigest);
      expect(fp).toContain("backup_import:v1:");
      expect(fp).toContain(result.serverDigest);
    }
  });
});

// ============================================================
// Section 7: Pre-idempotency result type is NOT ValidatedBackupV1
// ============================================================

describe("pre-idempotency result type does not claim CampaignState validation", () => {
  it("returns IntegrityVerifiedBackupV1 with plain-object state, not CampaignStateV1", async () => {
    const validState: CampaignStateV1 = makeState(3);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state: validState,
    }, 1700000000000);

    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(backup));
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      // state is Record<string, unknown>, not CampaignStateV1
      expect(typeof result.backup.state).toBe("object");
      expect(result.backup.state).not.toBeNull();
      // Accessing a CampaignState field should require a cast — the type is
      // intentionally opaque at this stage.
      expect((result.backup.state as Record<string, unknown>).schemaVersion).toBe(1);
    }
  });

  it("accepts empty-object state {} with correct digest (no domain validation)", async () => {
    const { computeBackupPayloadDigest, buildIntegrityPayloadFromParts, BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } = await import("../shared/domain");
    const provenance = {
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      exportedAtMs: 1700000000000,
    };
    const emptyState = {};
    const integrityPayload = buildIntegrityPayloadFromParts(provenance as any, emptyState as any);
    const digest = await computeBackupPayloadDigest(integrityPayload);
    const backup = {
      formatType: BACKUP_FORMAT_TYPE,
      backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      provenance,
      state: emptyState,
      integrity: { algorithm: "sha256" as const, digest },
    };

    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(backup));
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.serverDigest).toBe(digest);
    }
  });

  it("fullyValidateBackup rejects empty-object state with stable DomainError", async () => {
    const { computeBackupPayloadDigest, buildIntegrityPayloadFromParts, BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } = await import("../shared/domain");
    const provenance = {
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      exportedAtMs: 1700000000000,
    };
    const emptyState = {};
    const integrityPayload = buildIntegrityPayloadFromParts(provenance as any, emptyState as any);
    const digest = await computeBackupPayloadDigest(integrityPayload);
    const backup = {
      formatType: BACKUP_FORMAT_TYPE,
      backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      provenance,
      state: emptyState,
      integrity: { algorithm: "sha256" as const, digest },
    };

    const result = await fullyValidateBackup(JSON.stringify(backup), null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      // Must be a stable backup-specific error code, not TypeError
      expect(["INVALID_BACKUP_FORMAT", "BACKUP_INCOMPATIBLE"]).toContain(result.error.code);
    }
  });

  it("fullyValidateBackup rejects { schemaVersion: 1 } state with stable DomainError", async () => {
    const { computeBackupPayloadDigest, buildIntegrityPayloadFromParts, BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } = await import("../shared/domain");
    const provenance = {
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      exportedAtMs: 1700000000000,
    };
    const partialState = { schemaVersion: 1 };
    const integrityPayload = buildIntegrityPayloadFromParts(provenance as any, partialState as any);
    const digest = await computeBackupPayloadDigest(integrityPayload);
    const backup = {
      formatType: BACKUP_FORMAT_TYPE,
      backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      provenance,
      state: partialState,
      integrity: { algorithm: "sha256" as const, digest },
    };

    const result = await fullyValidateBackup(JSON.stringify(backup), null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(["INVALID_BACKUP_FORMAT", "BACKUP_INCOMPATIBLE"]).toContain(result.error.code);
    }
  });

  it("pre-idempotency and full validation produce same digest for valid backup", async () => {
    const validState: CampaignStateV1 = makeState(7);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 20,
      sourceLogicalRevision: 15,
      state: validState,
    }, 1700000000000);

    const preResult = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(backup));
    const fullResult = await fullyValidateBackup(JSON.stringify(backup), validState);

    expect("backup" in preResult).toBe(true);
    expect("backup" in fullResult).toBe(true);

    if ("backup" in preResult && "backup" in fullResult) {
      expect(preResult.serverDigest).toBe(fullResult.serverDigest);
      expect(preResult.serverDigest).toBe(backup.integrity.digest);
    }
  });

  it("valid backup behavior remains unchanged through full pipeline", async () => {
    const validState: CampaignStateV1 = makeState(4);
    const backup = await buildExportBackup({
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 12,
      sourceLogicalRevision: 10,
      state: validState,
    }, 1700000000000);

    const preResult = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(backup));
    expect("backup" in preResult).toBe(true);

    if ("backup" in preResult) {
      const fp = backupImportFingerprint(11, preResult.serverDigest);
      expect(fp).toBe(`backup_import:v1:expectedRevision=11:payloadDigest=${preResult.serverDigest}`);
    }

    const fullResult = await fullyValidateBackup(JSON.stringify(backup), validState);
    expect("backup" in fullResult).toBe(true);
    if ("backup" in fullResult) {
      expect(fullResult.backup.state.schemaVersion).toBe(1);
      expect(fullResult.backup.state.ruleset.id).toBe(SEVEN_PART_PACT_DRAFT4_ID);
    }
  });
});
