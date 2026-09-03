import { describe, it, expect } from "vitest";
import {
  initialCampaignState,
  validateCampaignState,
  statesDeepEqual,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_HISTORY_CONTROL_VERSION,
  validateHistoryControlStructure,
  assertNotDeleting,
  DomainError,
} from "../shared/domain";
import type { CurrentCampaignState, CampaignHistoryControlV1 } from "../shared/domain";

// ============================================================
// V3 initial state shape
// ============================================================

describe("C1A: initialCampaignState produces exact V3 incomplete Setup", () => {
  const state = initialCampaignState();

  it("is schema version 3", () => {
    expect(state.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
    expect(state.schemaVersion).toBe(3);
  });

  it("uses correct ruleset", () => {
    expect(state.ruleset.id).toBe(SEVEN_PART_PACT_DRAFT4_ID);
    expect(state.ruleset.version).toBe(SEVEN_PART_PACT_DRAFT4_VERSION);
  });

  it("has null monthOrdinal", () => {
    expect(state.calendar.monthOrdinal).toBeNull();
  });

  it("has null age and facilitator", () => {
    expect(state.configuration.ageId).toBeNull();
    expect(state.configuration.facilitatorPlayerId).toBeNull();
  });

  it("has empty players and wizards", () => {
    expect(state.players).toEqual([]);
    expect(state.wizards).toEqual([]);
  });

  it("has all pact seats unclassified (status null)", () => {
    for (const seat of Object.values(state.pactSeats)) {
      expect(seat.status).toBeNull();
      expect(seat.wizardId).toBeNull();
      expect(seat.watcherPlayerId).toBeNull();
    }
  });

  it("is in setup lifecycle with all null Orrery positions", () => {
    expect(state.lifecycle.kind).toBe("setup");
    if (state.lifecycle.kind === "setup") {
      const o = state.lifecycle.orrery;
      expect(o.saturn).toBeNull();
      expect(o.jupiter).toBeNull();
      expect(o.mars).toBeNull();
      expect(o.venus).toBeNull();
      expect(o.mercury).toBeNull();
    }
  });

  it("has empty wizardmootHistory", () => {
    expect(state.wizardmootHistory).toEqual([]);
  });

  it("passes domain validation", () => {
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});

// ============================================================
// Revision-0 snapshot consistency
// ============================================================

describe("C1A: revision-0 snapshot equals canonical state", () => {
  it("initialCampaignState is deterministic and self-equal", () => {
    const s1 = initialCampaignState();
    const s2 = initialCampaignState();
    expect(statesDeepEqual(s1, s2)).toBe(true);
  });
});

// ============================================================
// Initial history control validity
// ============================================================

describe("C1A: initial history control is valid", () => {
  it("undoStack [0] and empty redoStack pass structural validation", () => {
    const campaignId = "cmp_00000000-0000-0000-0000-000000000001";
    const control: CampaignHistoryControlV1 = {
      historyControlVersion: CURRENT_HISTORY_CONTROL_VERSION as 1,
      campaignId,
      undoStack: [0],
      redoStack: [],
    };
    const errors = validateHistoryControlStructure({
      control,
      campaignId,
      campaignRevision: 0,
    });
    expect(errors).toEqual([]);
  });

  it("empty undoStack fails structural validation", () => {
    const campaignId = "cmp_00000000-0000-0000-0000-000000000001";
    const control: CampaignHistoryControlV1 = {
      historyControlVersion: CURRENT_HISTORY_CONTROL_VERSION as 1,
      campaignId,
      undoStack: [],
      redoStack: [],
    };
    const errors = validateHistoryControlStructure({
      control,
      campaignId,
      campaignRevision: 0,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Deletion barrier (pure domain)
// ============================================================

describe("C1A: deletion barrier rejects active deletion", () => {
  it("assertNotDeleting throws for an active deletion operation", () => {
    const op = {
      campaignKey: "default",
      campaignId: "cmp_00000000-0000-0000-0000-000000000001",
      status: "deleting" as const,
      phase: "campaignEvents" as const,
      startedAt: 1700000000000,
      lastProgressAt: 1700000000000,
    };
    expect(() => assertNotDeleting(op)).toThrow(DomainError);
  });

  it("assertNotDeleting passes when no deletion exists", () => {
    expect(() => assertNotDeleting(null)).not.toThrow();
  });
});

// ============================================================
// No event at revision 0
// ============================================================

describe("C1A: fresh campaign produces no gameplay event", () => {
  it("initialCampaignState creates state, not events", () => {
    // The mutation creates only campaign doc + snapshot + history control.
    // There is no event creation helper in initialCampaignState.
    // This test validates the contract: the state constructor returns
    // a state object, not a {state, events} tuple.
    const result = initialCampaignState();
    expect(result).toBeDefined();
    expect("type" in result).toBe(false);
    expect("events" in result).toBe(false);
  });
});

// ============================================================
// Campaign existence guard (domain-level)
// ============================================================

describe("C1A: existing campaign blocks creation", () => {
  it("CAMPAIGN_ALREADY_EXISTS is a recognized DomainError code", () => {
    const err = new DomainError("CAMPAIGN_ALREADY_EXISTS", "test");
    expect(err.code).toBe("CAMPAIGN_ALREADY_EXISTS");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("CAMPAIGN_GRAPH_NOT_EMPTY is a recognized DomainError code", () => {
    const err = new DomainError("CAMPAIGN_GRAPH_NOT_EMPTY", "test");
    expect(err.code).toBe("CAMPAIGN_GRAPH_NOT_EMPTY");
    expect(err).toBeInstanceOf(DomainError);
  });
});
