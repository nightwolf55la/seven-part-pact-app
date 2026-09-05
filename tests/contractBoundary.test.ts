import { describe, it, expect } from "vitest";
import {
  newCampaignRecordValidator,
  currentCampaignStateValidator,
  anyCampaignStateValidator,
  campaignSnapshotRecordValidator,
} from "../convex/validators";
import {
  validateCampaignState,
  validateAnyCampaignState,
} from "../shared/domain/state-validation";
import { loadHistoricalState } from "../shared/domain/state-migration";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_STATE_SCHEMA_VERSION,
  fullyValidateBackup,
  BACKUP_FORMAT_TYPE,
  buildIntegrityPayloadFromParts,
  computeBackupPayloadDigest,
  verifyMigrationInvariants,
} from "../shared/domain";
import type {
  CampaignStateV1,
  CurrentCampaignState,
  MonthOrdinal,
  SerializableCampaignState,
  CampaignDocument,
} from "../shared/domain";

// ============================================================
// M3 CONTRACT boundary: authoritative current record is V2-only
// ============================================================

describe("M3 CONTRACT: authoritative campaign record state validator", () => {
  it("authoritative campaign record state field uses currentCampaignStateValidator (V3-only)", () => {
    // After V3 CONTRACT, anyCampaignStateValidator === currentCampaignStateValidator
    // because V1/V2 have been removed from the union.
    const stateField = (newCampaignRecordValidator as any).fields?.state
      ?? (newCampaignRecordValidator as any).validator?.fields?.state;
    expect(stateField).toBeDefined();
    expect(stateField).toBe(currentCampaignStateValidator);
  });

  it("snapshot record state field still uses anyCampaignStateValidator (V3-only)", () => {
    // Historical snapshots use anyCampaignStateValidator (V3-only).
    const stateField = (campaignSnapshotRecordValidator as any).fields?.state
      ?? (campaignSnapshotRecordValidator as any).validator?.fields?.state;
    expect(stateField).toBeDefined();
    expect(stateField).toBe(anyCampaignStateValidator);
  });
});

// ============================================================
// Domain-level behavioral CONTRACT boundary
// ============================================================

const v1State: CampaignStateV1 = {
  schemaVersion: 1,
  ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
  calendar: { monthOrdinal: 3 as MonthOrdinal },
};

function makeV2State(monthOrdinal: number = 3): CurrentCampaignState {
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
      kind: "setup" as const,
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
  };
}

const v2State = makeV2State();

describe("M3 CONTRACT: domain-level current-state validation rejects V1", () => {
  it("validateCampaignState rejects V1 state", () => {
    expect(() => validateCampaignState(v1State)).toThrow("Unsupported schemaVersion");
  });

  it("validateCampaignState accepts V2 state", () => {
    const result = validateCampaignState(makeV2State());
    expect(result.schemaVersion).toBe(3);
  });
});

describe("M3 CONTRACT: V1/V2 rejection and V3-only acceptance", () => {
  it("validateAnyCampaignState rejects V1", () => {
    expect(() => validateAnyCampaignState(v1State)).toThrow();
  });

  it("validateAnyCampaignState accepts V3", () => {
    const result = validateAnyCampaignState(makeV2State());
    expect(result.schemaVersion).toBe(3);
  });

  it("loadHistoricalState rejects V1", () => {
    expect(() => loadHistoricalState(v1State)).toThrow();
  });

  it("unknown schema version fails closed", () => {
    expect(() => validateAnyCampaignState({ ...v1State, schemaVersion: 99 })).toThrow();
  });
});

// ============================================================
// Legacy V1 backup import through supported migration path
// ============================================================

async function buildLegacyV1Backup(v1: CampaignStateV1) {
  const provenance = {
    sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000001" as any,
    sourceCampaignRevision: 5 as any,
    sourceLogicalRevision: 5 as any,
    exportedAtMs: 1700000000000,
  };
  const integrityPayload = buildIntegrityPayloadFromParts(provenance, v1 as any);
  const digest = await computeBackupPayloadDigest(integrityPayload);
  return {
    formatType: BACKUP_FORMAT_TYPE,
    backupFormatVersion: 1 as const,
    provenance,
    state: v1,
    integrity: { algorithm: "sha256" as const, digest },
  };
}

describe("M3 CONTRACT: V1 backup rejection (V3-only)", () => {
  it("backupFormatVersion 1 backup with physically V1 CampaignState is rejected by fullyValidateBackup", async () => {
    const v1ForBackup: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 7 as MonthOrdinal },
    };
    const backup = await buildLegacyV1Backup(v1ForBackup);

    expect(backup.backupFormatVersion).toBe(1);
    expect(backup.state.schemaVersion).toBe(1);

    const result = await fullyValidateBackup(JSON.stringify(backup), null);

    expect("error" in result).toBe(true);
  });

  it("V1 backup with target-state compatibility check is also rejected", async () => {
    const v1ForBackup: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const backup = await buildLegacyV1Backup(v1ForBackup);
    const currentTarget = makeV2State(3);

    const result = await fullyValidateBackup(JSON.stringify(backup), currentTarget);
    expect("error" in result).toBe(true);
  });
});

// ============================================================
// Production-shaped edge case (requirement 4)
// ============================================================

describe("M3 CONTRACT: production-shaped revision-0 with V3 snapshot", () => {
  it("verifier accepts campaignRevision 0 with V3 current and V3 snapshot at rev 0", () => {
    const v3Snap = makeV2State(0);
    const v3Current = makeV2State(0);

    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: v3Snap as unknown as SerializableCampaignState }],
      campaignDocuments: [{
        campaignKey: "default",
        campaignId: "cmp_production",
        campaignRevision: 0,
        state: v3Current as unknown as SerializableCampaignState,
      } as CampaignDocument],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("V1 physical snapshot at rev 0 is rejected by loadHistoricalState", () => {
    const v1Snap: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    expect(() => loadHistoricalState(v1Snap)).toThrow();
  });
});
