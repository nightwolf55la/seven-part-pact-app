import { describe, it, expect } from "vitest";
import {
  extractBackupPreview,
  buildBackupFilename,
  formatBackupBytes,
} from "../shared/domain/backup-preview";
import { BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } from "../shared/domain";

const validProvenance = {
  sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001",
  sourceCampaignRevision: 10,
  sourceLogicalRevision: 8,
  exportedAtMs: 1700000000000,
};

const validState = {
  schemaVersion: 1,
  ruleset: { id: "seven_part_pact_draft4", version: 1 },
  calendar: { monthOrdinal: 3 },
};

function validBackup() {
  return {
    formatType: BACKUP_FORMAT_TYPE,
    backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    provenance: validProvenance,
    state: validState,
    integrity: { algorithm: "sha256" as const, digest: "a".repeat(64) },
  };
}

describe("extractBackupPreview", () => {
  it("extracts preview from a valid V1 backup", () => {
    const preview = extractBackupPreview(validBackup());
    expect(preview).not.toBeNull();
    expect(preview!.exportedAtMs).toBe(1700000000000);
    expect(preview!.sourceCampaignRevision).toBe(10);
    expect(preview!.sourceLogicalRevision).toBe(8);
    expect(preview!.monthOrdinal).toBe(3);
    expect(preview!.monthDisplayName).toBe("July");
    expect(preview!.backupFormatVersion).toBe(1);
  });

  it("returns null for non-object", () => {
    expect(extractBackupPreview(null)).toBeNull();
    expect(extractBackupPreview("string")).toBeNull();
    expect(extractBackupPreview(42)).toBeNull();
  });

  it("returns null for wrong formatType", () => {
    const b = validBackup();
    expect(extractBackupPreview({ ...b, formatType: "wrong" })).toBeNull();
  });

  it("returns null for wrong backupFormatVersion", () => {
    const b = validBackup();
    expect(extractBackupPreview({ ...b, backupFormatVersion: 99 })).toBeNull();
  });

  it("returns null for missing provenance", () => {
    const b = validBackup();
    const { provenance: _, ...rest } = b;
    expect(extractBackupPreview(rest)).toBeNull();
  });

  it("returns null for missing state", () => {
    const b = validBackup();
    const { state: _, ...rest } = b;
    expect(extractBackupPreview(rest)).toBeNull();
  });

  it("returns null for missing calendar", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      state: { ...b.state, calendar: undefined },
    });
    expect(preview).toBeNull();
  });

  it("returns null for missing monthOrdinal", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      state: { ...b.state, calendar: {} },
    });
    expect(preview).toBeNull();
  });

  it("returns null for non-integer provenance fields", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      provenance: { ...b.provenance, sourceCampaignRevision: "ten" as any },
    });
    expect(preview).toBeNull();
  });

  it("returns null for negative exportedAtMs", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      provenance: { ...b.provenance, exportedAtMs: -1 },
    });
    expect(preview).toBeNull();
  });

  it("returns null when sourceLogicalRevision exceeds sourceCampaignRevision", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      provenance: { ...b.provenance, sourceLogicalRevision: 99, sourceCampaignRevision: 5 },
    });
    expect(preview).toBeNull();
  });

  it("accepts negative monthOrdinal and resolves the correct month", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      state: { ...b.state, calendar: { monthOrdinal: -16 } },
    });
    expect(preview).not.toBeNull();
    expect(preview!.monthOrdinal).toBe(-16);
    // -16 normalizes to index 8 within the 12-month cycle (April=0) -> December
    expect(preview!.monthDisplayName).toBe("December");
  });

  it("accepts zero monthOrdinal", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      state: { ...b.state, calendar: { monthOrdinal: 0 } },
    });
    expect(preview).not.toBeNull();
    expect(preview!.monthOrdinal).toBe(0);
    expect(preview!.monthDisplayName).toBe("April");
  });

  it("rejects non-integer monthOrdinal", () => {
    const b = validBackup();
    const preview = extractBackupPreview({
      ...b,
      state: { ...b.state, calendar: { monthOrdinal: 3.5 } },
    });
    expect(preview).toBeNull();
  });
});

describe("buildBackupFilename", () => {
  it("builds filename with date and revision", () => {
    const filename = buildBackupFilename(42, 1700000000000);
    // 1700000000000 ms = 2023-11-14 UTC
    expect(filename).toMatch(/^seven-part-pact-backup-\d{4}-\d{2}-\d{2}-r42\.json$/);
  });

  it("uses local date components", () => {
    const filename = buildBackupFilename(1, 0);
    // epoch = 1970-01-01
    expect(filename).toBe("seven-part-pact-backup-1970-01-01-r1.json");
  });
});

describe("formatBackupBytes", () => {
  it("formats bytes", () => {
    expect(formatBackupBytes(0)).toBe("0 B");
    expect(formatBackupBytes(512)).toBe("512 B");
    expect(formatBackupBytes(1024)).toBe("1.0 KiB");
    expect(formatBackupBytes(1536)).toBe("1.5 KiB");
    expect(formatBackupBytes(1048576)).toBe("1.0 MiB");
  });
});
