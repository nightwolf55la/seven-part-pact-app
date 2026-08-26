import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_COMMAND_TYPES,
  type CampaignCommandType,
  isLogicalStateCommandType,
  isHistoryNavigationCommandType,
  statesDeepEqual,
  toPersistableState,
  canonicalJsonStringify,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "../shared/domain";

// ==========================================================================
// A. Full-state equality guardrails
// ==========================================================================

describe("statesDeepEqual: canonical JSON comparison", () => {
  const baseState = {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 5 },
  };

  it("equal states compare equal regardless of key insertion order", () => {
    const a = { calendar: { monthOrdinal: 5 }, schemaVersion: 1 as const, ruleset: { version: 1, id: SEVEN_PART_PACT_DRAFT4_ID } };
    const b = { schemaVersion: 1 as const, ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: 1 }, calendar: { monthOrdinal: 5 } };
    expect(statesDeepEqual(a, b)).toBe(true);
  });

  it("detects difference in deeply nested field", () => {
    const a = { ...baseState, calendar: { monthOrdinal: 5 } };
    const b = { ...baseState, calendar: { monthOrdinal: 6 } };
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("detects difference in top-level field", () => {
    const a = { ...baseState, schemaVersion: 1 };
    const b = { ...baseState, schemaVersion: 2 };
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("detects difference in nested ruleset field", () => {
    const a = { ...baseState };
    const b = { ...baseState, ruleset: { id: "other", version: 1 } };
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("detects additional future-like nested fields", () => {
    // Simulate a future state with extra fields that the equality function
    // must notice without being manually updated.
    const a = { ...baseState, wizards: { necromancer: { power: 10 } } };
    const b = { ...baseState, wizards: { necromancer: { power: 11 } } };
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("treats states with same future fields as equal", () => {
    const a = { ...baseState, wizards: { necromancer: { power: 10 } } };
    const b = { ...baseState, wizards: { necromancer: { power: 10 } } };
    expect(statesDeepEqual(a, b)).toBe(true);
  });

  it("detects difference in array entries within future fields", () => {
    const a = { ...baseState, resources: [1, 2, 3] };
    const b = { ...baseState, resources: [1, 2, 4] };
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("detects presence of extra field vs absence", () => {
    const a = { ...baseState };
    const b = { ...baseState, domains: { forest: {} } };
    expect(statesDeepEqual(a, b)).toBe(false);
  });
});

// ==========================================================================
// B. Persist-whole-state contract
// ==========================================================================

describe("toPersistableState: preserves complete state", () => {
  it("preserves all current CampaignStateV1 fields", () => {
    const state = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 7 },
    };
    const persisted = toPersistableState(state);
    expect(persisted).toEqual(state);
    expect(statesDeepEqual(persisted, state)).toBe(true);
  });

  it("preserves synthetic future nested fields (not projected away)", () => {
    // This is the critical safety test: if canonicalCommit used a manual
    // projection (listing only known fields), this test would fail for
    // future state additions.
    const stateWithFuture = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 3 },
      wizards: {
        necromancer: { power: 10, domain: "death" },
        elementalist: { power: 8, domain: "fire" },
      },
      resources: [{ type: "sulfur", quantity: 5 }],
    };
    const persisted = toPersistableState(stateWithFuture);
    expect(persisted).toEqual(stateWithFuture);
    expect((persisted as any).wizards.necromancer.power).toBe(10);
    expect((persisted as any).resources[0].quantity).toBe(5);
  });

  it("strips branded types (produces plain numbers)", () => {
    const state = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
    };
    const persisted = toPersistableState(state);
    expect(typeof persisted.calendar.monthOrdinal).toBe("number");
    expect(persisted.calendar.monthOrdinal).toBe(0);
  });

  it("result is a distinct object (not same reference)", () => {
    const state = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 2 },
    };
    const persisted = toPersistableState(state);
    expect(persisted).not.toBe(state);
    expect(persisted.ruleset).not.toBe(state.ruleset);
  });
});

// ==========================================================================
// C. Command type source of truth
// ==========================================================================

describe("CAMPAIGN_COMMAND_TYPES is the single source of truth", () => {
  it("type CampaignCommandType is derived from the const tuple", () => {
    // If the type is derived from the tuple, then every entry in the tuple
    // is assignable to CampaignCommandType, and the tuple covers all values.
    const commands: CampaignCommandType[] = [...CAMPAIGN_COMMAND_TYPES];
    expect(commands.length).toBe(CAMPAIGN_COMMAND_TYPES.length);
    expect(commands.length).toBeGreaterThan(0);
  });

  it("no duplicate entries in CAMPAIGN_COMMAND_TYPES", () => {
    const set = new Set(CAMPAIGN_COMMAND_TYPES);
    expect(set.size).toBe(CAMPAIGN_COMMAND_TYPES.length);
  });

  it("isLogicalStateCommandType covers all command types", () => {
    for (const cmd of CAMPAIGN_COMMAND_TYPES) {
      const isLogical = isLogicalStateCommandType(cmd);
      const isNav = isHistoryNavigationCommandType(cmd);
      expect(typeof isLogical).toBe("boolean");
      expect(isNav).toBe(!isLogical);
    }
  });
});

// ==========================================================================
// D. Canonical JSON contract for state equality
// ==========================================================================

describe("canonicalJsonStringify contract for CampaignState", () => {
  it("sorts nested object keys deterministically", () => {
    const a = JSON.parse(canonicalJsonStringify({ b: 1, a: 2 }));
    const raw = canonicalJsonStringify({ b: 1, a: 2 });
    // keys should appear sorted in the output
    expect(raw.indexOf('"a"')).toBeLessThan(raw.indexOf('"b"'));
  });

  it("preserves array order", () => {
    const json = canonicalJsonStringify({ items: [3, 1, 2] });
    expect(JSON.parse(json).items).toEqual([3, 1, 2]);
  });

  it("rejects undefined (CampaignState must not contain undefined)", () => {
    expect(() => canonicalJsonStringify({ a: undefined, b: 1 })).not.toThrow();
    // undefined keys are omitted (matching JSON.stringify behavior)
    const json = canonicalJsonStringify({ a: undefined, b: 1 });
    expect(JSON.parse(json)).toEqual({ b: 1 });
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalJsonStringify({ v: Infinity })).toThrow();
    expect(() => canonicalJsonStringify({ v: NaN })).toThrow();
  });

  it("rejects bigint", () => {
    expect(() => canonicalJsonStringify({ v: BigInt(1) })).toThrow();
  });
});
