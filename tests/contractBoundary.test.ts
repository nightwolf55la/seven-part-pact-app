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
import { SEVEN_PART_PACT_DRAFT4_ID, SEVEN_PART_PACT_DRAFT4_VERSION } from "../shared/domain";

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

const v1State = {
  schemaVersion: 1,
  ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
  calendar: { monthOrdinal: 3 },
};

const v2State = {
  schemaVersion: 2,
  ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
  calendar: { monthOrdinal: 3 },
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

describe("M3 CONTRACT: domain-level current-state validation rejects V1", () => {
  it("validateCampaignState rejects V1 state", () => {
    expect(() => validateCampaignState(v1State)).toThrow("Unsupported schemaVersion");
  });

  it("validateCampaignState accepts V2 state", () => {
    const result = validateCampaignState(v2State);
    expect(result.schemaVersion).toBe(2);
  });
});

describe("M3 CONTRACT: historical V1 acceptance paths remain intact", () => {
  it("validateAnyCampaignState still accepts V1", () => {
    const result = validateAnyCampaignState(v1State);
    expect(result.schemaVersion).toBe(1);
  });

  it("validateAnyCampaignState still accepts V2", () => {
    const result = validateAnyCampaignState(v2State);
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
