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
  it("authoritative campaign record state field uses currentCampaignStateValidator (V2-only)", () => {
    // After CONTRACT, the campaigns table's authoritative record must use
    // the V2-only validator — not the EXPAND-phase V1|V2 union.
    const stateField = (newCampaignRecordValidator as any).fields?.state
      ?? (newCampaignRecordValidator as any).validator?.fields?.state;
    expect(stateField).toBeDefined();
    expect(stateField).toBe(currentCampaignStateValidator);
    expect(stateField).not.toBe(anyCampaignStateValidator);
  });

  it("snapshot record state field still uses anyCampaignStateValidator (V1|V2)", () => {
    // Historical snapshots must continue accepting V1 or V2.
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
  };
}

const v2State = makeV2State();

describe("M3 CONTRACT: domain-level current-state validation rejects V1", () => {
  it("validateCampaignState rejects V1 state", () => {
    expect(() => validateCampaignState(v1State)).toThrow("Unsupported schemaVersion");
  });

  it("validateCampaignState accepts V2 state", () => {
    const result = validateCampaignState(makeV2State());
    expect(result.schemaVersion).toBe(2);
  });
});

describe("M3 CONTRACT: historical V1 acceptance paths remain intact", () => {
  it("validateAnyCampaignState still accepts V1", () => {
    const result = validateAnyCampaignState(v1State);
    expect(result.schemaVersion).toBe(1);
  });

  it("validateAnyCampaignState still accepts V2", () => {
    const result = validateAnyCampaignState(makeV2State());
    expect(result.schemaVersion).toBe(2);
  });

  it("loadHistoricalState migrates V1 to current V2", () => {
    const result = loadHistoricalState(v1State);
    expect(result.schemaVersion).toBe(2);
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

describe("M3 CONTRACT: legacy V1 backup import (requirement 7)", () => {
  it("backupFormatVersion 1 backup with physically V1 CampaignState passes fullyValidateBackup", async () => {
    const v1ForBackup: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 7 as MonthOrdinal },
    };
    const backup = await buildLegacyV1Backup(v1ForBackup);

    expect(backup.backupFormatVersion).toBe(1);
    expect(backup.state.schemaVersion).toBe(1);

    const result = await fullyValidateBackup(JSON.stringify(backup), null);

    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.backup.state.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
      expect(result.backup.state.calendar.monthOrdinal).toBe(7);
      validateCampaignState(result.backup.state);
    }
  });

  it("V1 backup with target-state compatibility check also passes", async () => {
    const v1ForBackup: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const backup = await buildLegacyV1Backup(v1ForBackup);
    const currentTarget = makeV2State(3);

    const result = await fullyValidateBackup(JSON.stringify(backup), currentTarget);
    expect("backup" in result).toBe(true);
    if ("backup" in result) {
      expect(result.backup.state.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
    }
  });
});

// ============================================================
// Production-shaped edge case (requirement 4)
// ============================================================

describe("M3 CONTRACT: production-shaped revision-0 with V1 physical snapshot", () => {
  it("verifier accepts campaignRevision 0 with V2 current and physical V1 snapshot at rev 0", () => {
    const v1Snap: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const v2Current = makeV2State(0);

    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: v1Snap as unknown as SerializableCampaignState }],
      campaignDocuments: [{
        campaignKey: "default",
        campaignId: "cmp_production",
        campaignRevision: 0,
        state: v2Current as unknown as SerializableCampaignState,
      } as CampaignDocument],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("V1 physical snapshot at rev 0 migrates to logically equal V2 current", () => {
    const v1Snap: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 as MonthOrdinal },
    };
    const migrated = loadHistoricalState(v1Snap);
    expect(migrated.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
    expect(migrated).toEqual(makeV2State(0));
    validateCampaignState(migrated);
  });
});
