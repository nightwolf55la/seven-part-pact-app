import { describe, it, expect } from "vitest";
import {
  buildExportBackup,
  fullyValidateBackup,
  parseAndValidateBackupStructure,
  validateBackupState,
  validateBackupCompatibility,
  BACKUP_FORMAT_TYPE,
  CURRENT_BACKUP_FORMAT_VERSION,
  MAX_PORTABLE_BACKUP_BYTES,
  canonicalJsonStringify,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  asCentidegreePosition,
} from "../shared/domain";
import {
  verifyBackupImportRevisionStructure,
  verifyBackupImportRevisionDigest,
} from "../shared/domain/backup-verification";
import type {
  CurrentCampaignState,
  CampaignBackupV1,
  ExportSourceData,
  MonthOrdinal,
  PlayerId,
  WizardId,
  AllocationId,
  EngagementId,
  MonthlyPlayState,
  CampaignStateV1,
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

const CMP_ID = "cmp_00000000-0000-0000-0000-000000000001";
const PLR = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const WIZ = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
const ALC = "alc_00000000-0000-0000-0000-000000000001" as AllocationId;
const ENG = "eng_00000000-0000-0000-0000-000000000001" as EngagementId;

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
    wizardmootAttendance: [{ wizardId: WIZ, attended: true, exceptionReason: null }],
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
      phase: "story",
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

function makeSource(state: CurrentCampaignState): ExportSourceData {
  return {
    sourceCampaignId: CMP_ID,
    sourceCampaignRevision: 10,
    sourceLogicalRevision: 8,
    state,
  };
}

async function buildBackup(state: CurrentCampaignState): Promise<CampaignBackupV1> {
  return buildExportBackup(makeSource(state), 1700000000000);
}

// ============================================================
// BACKUP EXPORT — V3 roundtrip
// ============================================================

describe("B3B2: V3 Setup backup roundtrip", () => {
  it("Setup with null monthOrdinal and partial Orrery roundtrips without fabricated defaults", async () => {
    const setup = v3SetupState();
    const backup = await buildBackup(setup);

    expect(backup.state.calendar.monthOrdinal).toBeNull();
    if (backup.state.schemaVersion === 3 && backup.state.lifecycle.kind === "setup") {
      expect(backup.state.lifecycle.orrery.saturn).toBe(500);
      expect(backup.state.lifecycle.orrery.jupiter).toBeNull();
      expect(backup.state.lifecycle.orrery.mars).toBeNull();
    }

    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, setup);
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.backup.state.calendar.monthOrdinal).toBeNull();
    }
  });

  it("backupFormatVersion does not change for V3 CampaignState", async () => {
    const backup = await buildBackup(v3SetupState());
    expect(backup.backupFormatVersion).toBe(CURRENT_BACKUP_FORMAT_VERSION);
    expect(backup.backupFormatVersion).toBe(1);
  });
});

describe("B3B2: V3 Play backup roundtrip", () => {
  it("preserves phase, Orrery, Time, Engagements, Wizardmoot, and history", async () => {
    const play = v3PlayState();
    const backup = await buildBackup(play);
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, play);
    expect("backup" in result).toBe(true);
    if (!("backup" in result)) return;

    const restored = result.backup.state;
    expect(restored.calendar.monthOrdinal).toBe(5);
    expect(restored.wizardmootHistory.length).toBe(2);

    if (restored.lifecycle.kind === "play") {
      expect(restored.lifecycle.phase).toBe("story");
      expect(restored.lifecycle.orrery.saturn).toBe(500);
      expect(restored.lifecycle.orrery.jupiter).toBe(750);
      expect(restored.lifecycle.currentMonth.timeParticipants.length).toBe(1);
      expect(restored.lifecycle.currentMonth.engagements.length).toBe(1);
      expect(restored.lifecycle.currentMonth.wizardmootAttendance?.length).toBe(1);
    }
  });

  it("canonical JSON of V3 Play state is deterministic", async () => {
    const play = v3PlayState();
    const j1 = canonicalJsonStringify(play);
    const j2 = canonicalJsonStringify(play);
    expect(j1).toBe(j2);
  });
});

// ============================================================
// V1/V2 BACKUP REJECTION
// ============================================================

describe("B3B2: V1/V2 backup state rejection", () => {
  it("validateBackupState rejects V1 state", () => {
    const v1: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const error = validateBackupState(v1);
    expect(error).not.toBeNull();
  });

  it("validateBackupState rejects V2 state (missing lifecycle)", () => {
    const v2 = {
      schemaVersion: 2,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
      configuration: { ageId: null, facilitatorPlayerId: null },
      players: [],
      wizards: [],
      pactSeats: emptyPactSeats(),
    };
    const error = validateBackupState(v2);
    expect(error).not.toBeNull();
  });

  it("fullyValidateBackup rejects V1 backup payload", async () => {
    const v1State: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const source: ExportSourceData = {
      sourceCampaignId: CMP_ID,
      sourceCampaignRevision: 5,
      sourceLogicalRevision: 5,
      state: v1State as any,
    };
    const backup = await buildExportBackup(source, 1700000000000);
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, v3PlayState());
    expect("error" in result).toBe(true);
  });
});

// ============================================================
// IMPORT RETURN TYPE — null monthOrdinal
// ============================================================

describe("B3B2: Import does not assume monthOrdinal is non-null", () => {
  it("fullyValidateBackup accepts V3 Setup with null monthOrdinal", async () => {
    const setup = v3SetupState();
    const backup = await buildBackup(setup);
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, setup);
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.backup.state.calendar.monthOrdinal).toBeNull();
    }
  });
});

// ============================================================
// VERIFIER — V3 backup_import revision verification
// ============================================================

describe("B3B2: backup_import revision verification with V3 states", () => {
  it("structural verification passes for V3 Play snapshot", async () => {
    const play = v3PlayState();
    const backup = await buildBackup(play);
    const digest = backup.integrity.digest;
    const fp = `backup_import:v1:expectedRevision=4:payloadDigest=${digest}`;

    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: fp,
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: CMP_ID,
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: play as any,
    });
    expect(errors).toEqual([]);
  });

  it("structural verification passes for V3 Setup snapshot", async () => {
    const setup = v3SetupState();
    const backup = await buildBackup(setup);
    const digest = backup.integrity.digest;
    const fp = `backup_import:v1:expectedRevision=4:payloadDigest=${digest}`;

    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: fp,
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: CMP_ID,
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: setup as any,
    });
    expect(errors).toEqual([]);
  });

  it("digest verification passes for V3 Play snapshot", async () => {
    const play = v3PlayState();
    const backup = await buildBackup(play);
    const digest = backup.integrity.digest;
    const fp = `backup_import:v1:expectedRevision=4:payloadDigest=${digest}`;

    const errors = await verifyBackupImportRevisionDigest({
      campaignRevision: 5,
      commandFingerprint: fp,
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: CMP_ID,
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 8,
        exportedAtMs: 1700000000000,
        payloadDigest: digest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: play as any,
    });
    expect(errors).toEqual([]);
  });

  it("structural verification rejects V1 snapshot", () => {
    const v1: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: "backup_import:v1:expectedRevision=4:payloadDigest=0000000000000000000000000000000000000000000000000000000000000000",
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: CMP_ID,
        sourceCampaignRevision: 5,
        sourceLogicalRevision: 5,
        exportedAtMs: 1700000000000,
        payloadDigest: "0000000000000000000000000000000000000000000000000000000000000000",
      },
      resultSnapshotExists: true,
      resultSnapshotState: v1 as any,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("corrupted V3 snapshot fails structural verification", () => {
    const tampered = { ...v3PlayState(), schemaVersion: 99 } as any;
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 5,
      commandFingerprint: "backup_import:v1:expectedRevision=4:payloadDigest=0000000000000000000000000000000000000000000000000000000000000000",
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: CMP_ID,
        sourceCampaignRevision: 5,
        sourceLogicalRevision: 5,
        exportedAtMs: 1700000000000,
        payloadDigest: "0000000000000000000000000000000000000000000000000000000000000000",
      },
      resultSnapshotExists: true,
      resultSnapshotState: tampered,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ============================================================
// VERIFIER — V3 state validation via validateBackupState
// ============================================================

describe("B3B2: Verifier accepts healthy V3 states and rejects corrupt/old", () => {
  it("accepts healthy V3 Setup state", () => {
    expect(validateBackupState(v3SetupState())).toBeNull();
  });

  it("accepts healthy V3 Play state", () => {
    expect(validateBackupState(v3PlayState())).toBeNull();
  });

  it("rejects corrupted V3 with tampered lifecycle kind", () => {
    const corrupt = { ...v3PlayState(), lifecycle: { kind: "bogus" } } as any;
    expect(validateBackupState(corrupt)).not.toBeNull();
  });

  it("rejects V3 with missing wizardmootHistory", () => {
    const bad = { ...v3PlayState() } as any;
    delete bad.wizardmootHistory;
    expect(validateBackupState(bad)).not.toBeNull();
  });

  it("rejects V1 state", () => {
    expect(validateBackupState({
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
    })).not.toBeNull();
  });
});
