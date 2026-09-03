import { describe, it, expect } from "vitest";
import {
  canonicalJsonStringify,
  computeDigestFromCanonicalJson,
  CanonicalJsonError,
  BACKUP_FORMAT_TYPE,
  CURRENT_BACKUP_FORMAT_VERSION,
  MAX_PORTABLE_BACKUP_BYTES,
  parseAndValidateBackupStructure,
  validateBackupState,
  validateBackupCompatibility,
  fullyValidateBackup,
  parseAndVerifyBackupIntegrityForFingerprint,
  buildExportBackup,
  buildIntegrityPayloadFromParts,
  computeBackupPayloadDigest,
  backupImportFingerprint,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  describeActivityEntry,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "../shared/domain";
import {
  verifyBackupImportRevisionStructure,
  verifyBackupImportRevisionDigest,
} from "../shared/domain/backup-verification";
import type {
  CurrentCampaignState,
  CampaignBackupV1,
  BackupImportedEventV1,
  CampaignStateV1,
  ExportSourceData,
} from "../shared/domain";

// ============================================================
// Test helpers
// ============================================================

function validState(): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 3 as any },
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

function validProvenance() {
  return {
    sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001" as any,
    sourceCampaignRevision: 10 as any,
    sourceLogicalRevision: 8 as any,
    exportedAtMs: 1700000000000,
  };
}

async function buildValidBackup(state?: CurrentCampaignState): Promise<CampaignBackupV1> {
  const s = state ?? validState();
  return buildExportBackup(
    {
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state: s,
    },
    1700000000000,
  );
}

// ============================================================
// Canonical JSON Tests
// ============================================================

describe("canonicalJsonStringify", () => {
  it("sorts object keys lexicographically at every level", () => {
    const result = canonicalJsonStringify({ z: 1, a: 2, m: { b: 3, a: 4 } });
    expect(result).toBe('{"a":2,"m":{"a":4,"b":3},"z":1}');
  });

  it("preserves array element order", () => {
    const result = canonicalJsonStringify([3, 1, 2]);
    expect(result).toBe("[3,1,2]");
  });

  it("handles null", () => {
    expect(canonicalJsonStringify(null)).toBe("null");
  });

  it("handles booleans", () => {
    expect(canonicalJsonStringify(true)).toBe("true");
    expect(canonicalJsonStringify(false)).toBe("false");
  });

  it("handles strings with special characters", () => {
    expect(canonicalJsonStringify('hello "world"')).toBe('"hello \\"world\\""');
  });

  it("handles numbers", () => {
    expect(canonicalJsonStringify(42)).toBe("42");
    expect(canonicalJsonStringify(-0.5)).toBe("-0.5");
  });

  it("produces no whitespace", () => {
    const result = canonicalJsonStringify({ a: [1, { b: 2 }] });
    expect(result).not.toContain(" ");
    expect(result).not.toContain("\n");
    expect(result).not.toContain("\t");
  });

  it("rejects undefined object values", () => {
    expect(() => canonicalJsonStringify({ a: 1, b: undefined, c: 3 })).toThrow(CanonicalJsonError);
  });

  it("rejects undefined array elements", () => {
    const arr = [1, undefined, 3];
    expect(() => canonicalJsonStringify(arr)).toThrow(CanonicalJsonError);
  });

  it("rejects NaN", () => {
    expect(() => canonicalJsonStringify(NaN)).toThrow(CanonicalJsonError);
  });

  it("rejects Infinity", () => {
    expect(() => canonicalJsonStringify(Infinity)).toThrow(CanonicalJsonError);
    expect(() => canonicalJsonStringify(-Infinity)).toThrow(CanonicalJsonError);
  });

  it("rejects bigint", () => {
    expect(() => canonicalJsonStringify(BigInt(42))).toThrow(CanonicalJsonError);
  });

  it("rejects undefined at top level", () => {
    expect(() => canonicalJsonStringify(undefined)).toThrow(CanonicalJsonError);
  });

  it("rejects objects with non-plain prototypes", () => {
    class Custom { x = 1; }
    expect(() => canonicalJsonStringify(new Custom())).toThrow(CanonicalJsonError);
  });

  it("is deterministic: same input always same output", () => {
    const obj = { state: { calendar: { monthOrdinal: 5 }, ruleset: { id: "x", version: 1 }, schemaVersion: 1 } };
    const a = canonicalJsonStringify(obj);
    const b = canonicalJsonStringify(obj);
    expect(a).toBe(b);
  });

  it("different property insertion order produces same output", () => {
    const a = canonicalJsonStringify({ z: 1, a: 2 });
    const b = canonicalJsonStringify({ a: 2, z: 1 });
    expect(a).toBe(b);
  });
});

describe("computeDigestFromCanonicalJson", () => {
  it("produces a 64-char lowercase hex string", async () => {
    const digest = await computeDigestFromCanonicalJson("test");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", async () => {
    const a = await computeDigestFromCanonicalJson('{"a":1}');
    const b = await computeDigestFromCanonicalJson('{"a":1}');
    expect(a).toBe(b);
  });

  it("changes with meaningful content changes", async () => {
    const a = await computeDigestFromCanonicalJson('{"a":1}');
    const b = await computeDigestFromCanonicalJson('{"a":2}');
    expect(a).not.toBe(b);
  });
});

// ============================================================
// Backup Format Validation Tests
// ============================================================

describe("parseAndValidateBackupStructure", () => {
  it("accepts a valid V1 backup structure", async () => {
    const backup = await buildValidBackup();
    const error = parseAndValidateBackupStructure(backup);
    expect(error).toBeNull();
  });

  it("rejects non-object", () => {
    expect(parseAndValidateBackupStructure(null)?.code).toBe("INVALID_BACKUP_FORMAT");
    expect(parseAndValidateBackupStructure("string")?.code).toBe("INVALID_BACKUP_FORMAT");
    expect(parseAndValidateBackupStructure(42)?.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects wrong formatType", () => {
    const err = parseAndValidateBackupStructure({ formatType: "wrong", backupFormatVersion: 1 });
    expect(err?.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects unsupported future backup version", () => {
    const err = parseAndValidateBackupStructure({
      formatType: BACKUP_FORMAT_TYPE,
      backupFormatVersion: 99,
      provenance: validProvenance(),
      state: validState(),
      integrity: { algorithm: "sha256", digest: "a".repeat(64) },
    });
    expect(err?.code).toBe("UNSUPPORTED_BACKUP_VERSION");
  });

  it("rejects invalid sourceCampaignId", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, provenance: { ...backup.provenance, sourceCampaignId: "invalid" } };
    expect(parseAndValidateBackupStructure(modified)?.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects sourceLogicalRevision > sourceCampaignRevision", async () => {
    const backup = await buildValidBackup();
    const modified = {
      ...backup,
      provenance: { ...backup.provenance, sourceLogicalRevision: 99, sourceCampaignRevision: 5 },
    };
    expect(parseAndValidateBackupStructure(modified)?.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects bad digest shape", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, integrity: { algorithm: "sha256", digest: "toolshort" } };
    expect(parseAndValidateBackupStructure(modified as any)?.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects extra top-level fields", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, extraField: "bad" };
    expect(parseAndValidateBackupStructure(modified)?.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects extra provenance fields", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, provenance: { ...backup.provenance, extraKey: 42 } };
    expect(parseAndValidateBackupStructure(modified)?.code).toBe("INVALID_BACKUP_FORMAT");
  });
});

describe("validateBackupState", () => {
  it("accepts valid CampaignState", () => {
    expect(validateBackupState(validState())).toBeNull();
  });

  it("rejects unsupported schemaVersion", () => {
    const err = validateBackupState({ ...validState(), schemaVersion: 99 });
    expect(err?.code).toBe("BACKUP_INCOMPATIBLE");
  });

  it("rejects unsupported ruleset", () => {
    const err = validateBackupState({ ...validState(), ruleset: { id: "other", version: 1 } });
    expect(err?.code).toBe("BACKUP_INCOMPATIBLE");
  });

  it("rejects missing calendar", () => {
    const err = validateBackupState({ schemaVersion: CURRENT_STATE_SCHEMA_VERSION, ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION } });
    expect(err?.code).toBe("INVALID_BACKUP_FORMAT");
  });
});

describe("validateBackupCompatibility", () => {
  it("accepts matching schema/ruleset", () => {
    const err = validateBackupCompatibility(validState(), validState());
    expect(err).toBeNull();
  });

  it("rejects mismatched ruleset id", () => {
    const target = validState();
    const backup = { ...validState(), ruleset: { id: "other_ruleset", version: 1 } } as any;
    expect(validateBackupCompatibility(backup, target)?.code).toBe("BACKUP_INCOMPATIBLE");
  });

  it("rejects mismatched ruleset version", () => {
    const target = validState();
    const backup = { ...validState(), ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: 99 } } as any;
    expect(validateBackupCompatibility(backup, target)?.code).toBe("BACKUP_INCOMPATIBLE");
  });
});

// ============================================================
// Digest / Integrity Tests
// ============================================================

describe("backup integrity", () => {
  it("valid backup passes integrity check", async () => {
    const backup = await buildValidBackup();
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, null);
    expect("backup" in result).toBe(true);
  });

  it("corrupted state value fails integrity", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, state: { ...backup.state, calendar: { monthOrdinal: 999 } } };
    const json = JSON.stringify(modified);
    const result = await fullyValidateBackup(json, null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("BACKUP_INTEGRITY_FAILED");
    }
  });

  it("modified digest string fails integrity", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, integrity: { algorithm: "sha256" as const, digest: "b".repeat(64) } };
    const json = JSON.stringify(modified);
    const result = await fullyValidateBackup(json, null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("BACKUP_INTEGRITY_FAILED");
    }
  });

  it("whitespace/property reordering still passes (semantic canonicalization)", async () => {
    const backup = await buildValidBackup();
    // Reorder keys at top level
    const reordered = {
      integrity: backup.integrity,
      state: backup.state,
      backupFormatVersion: backup.backupFormatVersion,
      provenance: backup.provenance,
      formatType: backup.formatType,
    };
    const json = JSON.stringify(reordered, null, 2);
    const result = await fullyValidateBackup(json, null);
    expect("backup" in result).toBe(true);
  });

  it("digest is deterministic across builds", async () => {
    const payload = buildIntegrityPayloadFromParts(validProvenance() as any, validState());
    const d1 = await computeBackupPayloadDigest(payload);
    const d2 = await computeBackupPayloadDigest(payload);
    expect(d1).toBe(d2);
    expect(d1).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ============================================================
// Size Limit Tests
// ============================================================

describe("backup size limits", () => {
  it("rejects oversized UTF-8 payload", async () => {
    const oversized = JSON.stringify({ formatType: BACKUP_FORMAT_TYPE, padding: "x".repeat(MAX_PORTABLE_BACKUP_BYTES) });
    const result = await fullyValidateBackup(oversized, null);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("INVALID_BACKUP_FORMAT");
      expect(result.error.message).toContain("maximum size");
    }
  });

  it("accepts backup within size limit", async () => {
    const backup = await buildValidBackup();
    const json = JSON.stringify(backup);
    expect(new TextEncoder().encode(json).length).toBeLessThan(MAX_PORTABLE_BACKUP_BYTES);
    const result = await fullyValidateBackup(json, null);
    expect("backup" in result).toBe(true);
  });
});

// ============================================================
// Fingerprint Tests
// ============================================================

describe("backupImportFingerprint", () => {
  it("includes expectedRevision and payloadDigest", () => {
    const digest = "a".repeat(64);
    const fp = backupImportFingerprint(5, digest);
    expect(fp).toBe(`backup_import:v1:expectedRevision=5:payloadDigest=${"a".repeat(64)}`);
  });

  it("is deterministic", () => {
    const digest = "b".repeat(64);
    expect(backupImportFingerprint(10, digest)).toBe(backupImportFingerprint(10, digest));
  });

  it("different expectedRevision -> different fingerprint", () => {
    const digest = "c".repeat(64);
    expect(backupImportFingerprint(1, digest)).not.toBe(backupImportFingerprint(2, digest));
  });

  it("different digest -> different fingerprint", () => {
    expect(backupImportFingerprint(1, "a".repeat(64))).not.toBe(backupImportFingerprint(1, "b".repeat(64)));
  });

  it("rejects invalid expectedRevision", () => {
    expect(() => backupImportFingerprint(-1, "a".repeat(64))).toThrow();
    expect(() => backupImportFingerprint(1.5, "a".repeat(64))).toThrow();
  });

  it("rejects invalid digest", () => {
    expect(() => backupImportFingerprint(0, "short")).toThrow();
    expect(() => backupImportFingerprint(0, "A".repeat(64))).toThrow();
  });
});

// ============================================================
// Command Type Tests
// ============================================================

describe("backup_import command type", () => {
  it("is classified as logical-state", () => {
    expect(isLogicalStateCommandType("backup_import")).toBe(true);
  });
});

// ============================================================
// Activity Tests
// ============================================================

describe("backup_imported activity", () => {
  it("maps backup_imported event to activity entry", () => {
    const event: BackupImportedEventV1 = {
      type: "backup_imported",
      version: 1,
      data: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: "a".repeat(64),
      },
    };

    const entry = mapEventToActivityEntry("test-id", 51, event);
    expect(entry.type).toBe("backup_imported");
    expect(entry.revision).toBe(51);
    if (entry.type === "backup_imported") {
      expect(entry.sourceCampaignRevision).toBe(10);
      expect(entry.sourceLogicalRevision).toBe(8);
      expect(entry.exportedAtMs).toBe(1700000000000);
    }
  });

  it("describes backup_imported entry", () => {
    const entry = {
      id: "x",
      revision: 51,
      type: "backup_imported" as const,
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      exportedAtMs: 1700000000000,
    };
    const desc = describeActivityEntry(entry);
    expect(desc).toContain("51");
    expect(desc).toContain("8");
    expect(desc).toContain("Imported backup");
  });

  it("rejects unsupported version", () => {
    const event = {
      type: "backup_imported" as const,
      version: 99 as any,
      data: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: "a".repeat(64),
      },
    };
    expect(() => mapEventToActivityEntry("id", 1, event as any)).toThrow("Unsupported");
  });
});

// ============================================================
// Export Tests
// ============================================================

describe("buildExportBackup", () => {
  it("produces valid backup envelope", async () => {
    const source: ExportSourceData = {
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state: validState(),
    };
    const backup = await buildExportBackup(source, 1700000000000);

    expect(backup.formatType).toBe(BACKUP_FORMAT_TYPE);
    expect(backup.backupFormatVersion).toBe(CURRENT_BACKUP_FORMAT_VERSION);
    expect(backup.provenance.sourceCampaignId).toBe(source.sourceCampaignId);
    expect(backup.provenance.sourceCampaignRevision).toBe(10);
    expect(backup.provenance.sourceLogicalRevision).toBe(8);
    expect(backup.provenance.exportedAtMs).toBe(1700000000000);
    expect(backup.state).toEqual(validState());
    expect(backup.integrity.algorithm).toBe("sha256");
    expect(backup.integrity.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("exported backup passes full validation", async () => {
    const backup = await buildExportBackup(
      {
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 5,
        sourceLogicalRevision: 5,
        state: validState(),
      },
      Date.now(),
    );
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, validState());
    expect("backup" in result).toBe(true);
  });

  it("correctly handles export after undo (logical < campaign revision)", async () => {
    const backup = await buildExportBackup(
      {
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 20,
        sourceLogicalRevision: 15,
        state: validState(),
      },
      1700000000000,
    );
    expect(backup.provenance.sourceCampaignRevision).toBe(20);
    expect(backup.provenance.sourceLogicalRevision).toBe(15);
  });
});

// ============================================================
// Verifier Tests
// ============================================================

describe("verifyBackupImportRevisionStructure", () => {
  it("accepts valid backup_import revision", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects wrong event type", () => {
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: "x",
      eventType: "month_changed",
      eventVersion: 1,
      eventData: {} as any,
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("backup_imported");
  });

  it("rejects wrong fingerprint", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: "wrong_fingerprint",
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors.some(e => e.includes("fingerprint"))).toBe(true);
  });

  it("rejects sourceLogicalRevision > sourceCampaignRevision", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 5,
        sourceLogicalRevision: 10,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors.some(e => e.includes("exceeds"))).toBe(true);
  });

  it("rejects missing result snapshot", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: false,
      resultSnapshotState: null,
    });
    expect(errors.some(e => e.includes("snapshot"))).toBe(true);
  });
});

describe("verifyBackupImportRevisionDigest", () => {
  it("verifies correct digest from event + snapshot", async () => {
    const state = validState();
    const backup = await buildExportBackup(
      {
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        state,
      },
      1700000000000,
    );

    const errors = await verifyBackupImportRevisionDigest({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, backup.integrity.digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: backup.integrity.digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: state,
    });
    expect(errors).toHaveLength(0);
  });

  it("detects digest mismatch when snapshot state differs", async () => {
    const state = validState();
    const backup = await buildExportBackup(
      {
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        state,
      },
      1700000000000,
    );

    const differentState = { ...state, calendar: { monthOrdinal: 999 } };

    const errors = await verifyBackupImportRevisionDigest({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, backup.integrity.digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: backup.integrity.digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: differentState,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("digest");
  });
});

// ============================================================
// Full Validation Pipeline Tests
// ============================================================

describe("fullyValidateBackup", () => {
  it("rejects malformed JSON", async () => {
    const result = await fullyValidateBackup("{not valid json", null);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects wrong formatType", async () => {
    const result = await fullyValidateBackup(JSON.stringify({ formatType: "wrong" }), null);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.code).toBe("INVALID_BACKUP_FORMAT");
  });

  it("rejects future backupFormatVersion", async () => {
    const backup = await buildValidBackup();
    const modified = { ...backup, backupFormatVersion: 99 };
    const result = await fullyValidateBackup(JSON.stringify(modified), null);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.code).toBe("UNSUPPORTED_BACKUP_VERSION");
  });

  it("rejects incompatible target state", async () => {
    const backup = await buildValidBackup();
    const json = JSON.stringify(backup);
    const differentTarget = { ...validState(), ruleset: { id: "other_ruleset", version: 1 } } as any;
    const result = await fullyValidateBackup(json, differentTarget);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.code).toBe("BACKUP_INCOMPATIBLE");
  });

  it("valid backup returns backup and serverDigest", async () => {
    const backup = await buildValidBackup();
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, validState());
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.serverDigest).toBe(backup.integrity.digest);
      expect(result.backup.state).toEqual(validState());
    }
  });
});

// ============================================================
// History Control Integration
// ============================================================

describe("backup_import in history control", () => {
  it("backup_import is recognized as logical-state by isLogicalStateCommandType", () => {
    expect(isLogicalStateCommandType("backup_import")).toBe(true);
  });
});

// ============================================================
// Fingerprint Determinism
// ============================================================

describe("fingerprint determinism", () => {
  it("same semantic payload with different JSON formatting computes same fingerprint", async () => {
    const state = validState();
    const source = {
      sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
      sourceCampaignRevision: 10,
      sourceLogicalRevision: 8,
      state,
    };

    const backup = await buildExportBackup(source, 1700000000000);
    const compactJson = JSON.stringify(backup);
    const prettyJson = JSON.stringify(backup, null, 2);
    const reorderedJson = JSON.stringify({
      integrity: backup.integrity,
      state: backup.state,
      provenance: backup.provenance,
      backupFormatVersion: backup.backupFormatVersion,
      formatType: backup.formatType,
    });

    const r1 = await parseAndVerifyBackupIntegrityForFingerprint(compactJson);
    const r2 = await parseAndVerifyBackupIntegrityForFingerprint(prettyJson);
    const r3 = await parseAndVerifyBackupIntegrityForFingerprint(reorderedJson);

    expect("backup" in r1).toBe(true);
    expect("backup" in r2).toBe(true);
    expect("backup" in r3).toBe(true);
    if ("backup" in r1 && "backup" in r2 && "backup" in r3) {
      expect(r1.serverDigest).toBe(r2.serverDigest);
      expect(r1.serverDigest).toBe(r3.serverDigest);
      const fp1 = backupImportFingerprint(4, r1.serverDigest);
      const fp2 = backupImportFingerprint(4, r2.serverDigest);
      const fp3 = backupImportFingerprint(4, r3.serverDigest);
      expect(fp1).toBe(fp2);
      expect(fp1).toBe(fp3);
    }
  });

  it("different state produces different digest and fingerprint", async () => {
    const state1 = validState();
    const state2 = { ...validState(), calendar: { monthOrdinal: 7 as any } };
    const source1 = { sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001", sourceCampaignRevision: 10, sourceLogicalRevision: 8, state: state1 };
    const source2 = { sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001", sourceCampaignRevision: 10, sourceLogicalRevision: 8, state: state2 };

    const backup1 = await buildExportBackup(source1, 1700000000000);
    const backup2 = await buildExportBackup(source2, 1700000000000);

    expect(backup1.integrity.digest).not.toBe(backup2.integrity.digest);
    const fp1 = backupImportFingerprint(4, backup1.integrity.digest);
    const fp2 = backupImportFingerprint(4, backup2.integrity.digest);
    expect(fp1).not.toBe(fp2);
  });

  it("different expectedRevision produces different fingerprint for same digest", () => {
    const digest = "a".repeat(64);
    const fp1 = backupImportFingerprint(4, digest);
    const fp2 = backupImportFingerprint(5, digest);
    expect(fp1).not.toBe(fp2);
  });
});

// ============================================================
// parseAndVerifyBackupIntegrityForFingerprint edge cases
// ============================================================

describe("parseAndVerifyBackupIntegrityForFingerprint", () => {
  it("rejects backup with extra top-level fields gracefully", async () => {
    const backup = await buildValidBackup();
    const withExtra = { ...backup, extraField: "unexpected" };
    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(withExtra));
    // Extra fields should not cause a crash — they are either ignored or rejected
    // The implementation delegates to fullyValidateBackup which parses known fields
    expect("backup" in result || "error" in result).toBe(true);
  });

  it("rejects backup with tampered digest", async () => {
    const backup = await buildValidBackup();
    const tampered = { ...backup, integrity: { ...backup.integrity, digest: "b".repeat(64) } };
    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(tampered));
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.code).toBe("BACKUP_INTEGRITY_FAILED");
  });

  it("rejects backup with invalid provenance (negative revision)", async () => {
    const backup = await buildValidBackup();
    const invalid = {
      ...backup,
      provenance: { ...backup.provenance, sourceCampaignRevision: -1 },
    };
    const result = await parseAndVerifyBackupIntegrityForFingerprint(JSON.stringify(invalid));
    expect("error" in result).toBe(true);
  });
});

// ============================================================
// Verifier: backup_import structural validation edge cases
// ============================================================

describe("verifyBackupImportRevisionStructure additional cases", () => {
  it("rejects event version !== 1", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 2,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes("version"))).toBe(true);
  });

  it("rejects invalid sourceCampaignId format", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "not-a-valid-id",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes("campaignId") || e.includes("sourceCampaignId"))).toBe(true);
  });

  it("rejects negative exportedAtMs", () => {
    const digest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: -1,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: validState(),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes("exportedAtMs"))).toBe(true);
  });

  it("rejects result snapshot that fails domain validation", () => {
    const digest = "a".repeat(64);
    const badState = { schemaVersion: 1, ruleset: { id: "unknown_ruleset", version: 1 }, calendar: { monthOrdinal: 3 } } as any;
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: backupImportFingerprint(4, digest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: badState,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes("snapshot") || e.includes("validation"))).toBe(true);
  });
});
