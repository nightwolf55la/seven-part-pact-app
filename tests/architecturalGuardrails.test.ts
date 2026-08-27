import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_COMMAND_TYPES,
  type CampaignCommandType,
  isLogicalStateCommandType,
  isHistoryNavigationCommandType,
  statesDeepEqual,
  assertPortableCampaignState,
  canonicalJsonStringify,
  CanonicalJsonError,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "../shared/domain";
import type { PersistableCampaignState } from "../shared/domain";
import type { CampaignStateV1 } from "../shared/domain/campaign-state";

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

  it("does not silently equate {future: undefined} with {}", () => {
    const a = { ...baseState };
    const b = { ...baseState, future: undefined };
    // canonicalJsonStringify rejects undefined property values,
    // so this comparison throws rather than silently equating them
    expect(() => statesDeepEqual(a, b)).toThrow(CanonicalJsonError);
  });
});

// ==========================================================================
// B. Persist-whole-state contract (no JSON round-trip)
// ==========================================================================

describe("assertPortableCampaignState: validates without transforming", () => {
  const validState = {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 7 },
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
  } as unknown as CampaignStateV1;

  it("returns the same object reference (no copy/transform)", () => {
    const result = assertPortableCampaignState(validState);
    expect(result).toBe(validState);
  });

  it("preserves synthetic future nested fields exactly", () => {
    const stateWithFuture = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 3 },
      wizards: {
        necromancer: { power: 10, domain: "death" },
        elementalist: { power: 8, domain: "fire" },
      },
      resources: [{ type: "sulfur", quantity: 5 }],
    } as unknown as CampaignStateV1;
    const result = assertPortableCampaignState(stateWithFuture);
    expect(result).toBe(stateWithFuture);
    expect((result as any).wizards.necromancer.power).toBe(10);
    expect((result as any).resources[0].quantity).toBe(5);
  });

  it("rejects undefined nested object fields", () => {
    const badState = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
      future: undefined,
    } as unknown as CampaignStateV1;
    expect(() => assertPortableCampaignState(badState)).toThrow(CanonicalJsonError);
  });

  it("rejects undefined array entries", () => {
    const badState = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
      items: [1, undefined, 3],
    } as unknown as CampaignStateV1;
    expect(() => assertPortableCampaignState(badState)).toThrow(CanonicalJsonError);
  });

  it("rejects non-finite numbers", () => {
    const badState = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
      power: Infinity,
    } as unknown as CampaignStateV1;
    expect(() => assertPortableCampaignState(badState)).toThrow(CanonicalJsonError);
  });
});

// ==========================================================================
// C. Command type source of truth
// ==========================================================================

describe("CAMPAIGN_COMMAND_TYPES is the single source of truth", () => {
  it("type CampaignCommandType is derived from the const tuple", () => {
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
// D. Canonical JSON contract enforcement
// ==========================================================================

describe("canonicalJsonStringify enforces portable JSON contract", () => {
  it("sorts nested object keys deterministically", () => {
    const raw = canonicalJsonStringify({ b: 1, a: 2 });
    expect(raw.indexOf('"a"')).toBeLessThan(raw.indexOf('"b"'));
  });

  it("preserves array order", () => {
    const json = canonicalJsonStringify({ items: [3, 1, 2] });
    expect(JSON.parse(json).items).toEqual([3, 1, 2]);
  });

  it("rejects undefined object property values", () => {
    expect(() => canonicalJsonStringify({ a: undefined, b: 1 })).toThrow(CanonicalJsonError);
  });

  it("rejects undefined array elements", () => {
    expect(() => canonicalJsonStringify([1, undefined, 3])).toThrow(CanonicalJsonError);
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalJsonStringify({ v: Infinity })).toThrow(CanonicalJsonError);
    expect(() => canonicalJsonStringify({ v: NaN })).toThrow(CanonicalJsonError);
  });

  it("rejects bigint", () => {
    expect(() => canonicalJsonStringify({ v: BigInt(1) })).toThrow(CanonicalJsonError);
  });

  it("supports null, booleans, finite numbers, strings, arrays, plain objects", () => {
    expect(canonicalJsonStringify(null)).toBe("null");
    expect(canonicalJsonStringify(true)).toBe("true");
    expect(canonicalJsonStringify(42)).toBe("42");
    expect(canonicalJsonStringify("hi")).toBe('"hi"');
    expect(canonicalJsonStringify([1, 2])).toBe("[1,2]");
    expect(canonicalJsonStringify({ a: 1 })).toBe('{"a":1}');
  });
});

// ==========================================================================
// E. PersistableCampaignState derives from AnyCampaignState
// ==========================================================================

describe("PersistableCampaignState is derived from AnyCampaignState", () => {
  it("MonthOrdinal brand is stripped to plain number", () => {
    // If PersistableCampaignState were manually listing fields, this type
    // assignment would still work. But if it were missing the calendar field
    // entirely, this would fail. The key guard is the next test.
    const ps: PersistableCampaignState = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: 1 },
      calendar: { monthOrdinal: 5 },
    };
    expect(ps.calendar.monthOrdinal).toBe(5);
    expect(typeof ps.calendar.monthOrdinal).toBe("number");
  });

  it("a CampaignStateV1 is assignable to PersistableCampaignState (structural compatibility)", () => {
    // CampaignStateV1 has branded MonthOrdinal; PersistableCampaignState has
    // plain number. If DeepUnbrand works correctly, CampaignStateV1 should be
    // assignable to PersistableCampaignState because branded number is a
    // subtype of number.
    const state: CampaignStateV1 = {
      schemaVersion: 1,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: 1 },
      calendar: { monthOrdinal: 5 as any },
    };
    const ps: PersistableCampaignState = state;
    expect(ps.schemaVersion).toBe(1);
  });
});
