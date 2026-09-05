import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "../shared/domain";

function validState(monthOrdinal: number = 0) {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal },
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

describe("validateCampaignState", () => {
  it("accepts a valid V3 state with ordinal 0", () => {
    const state = validState(0);
    const result = validateCampaignState(state);
    expect(result).toEqual(state);
  });

  it("accepts a valid V3 state with negative ordinal", () => {
    const state = validState(-16);
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("accepts a valid V3 state with large positive ordinal", () => {
    const state = validState(999);
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("rejects null", () => {
    expect(() => validateCampaignState(null)).toThrow(DomainError);
  });

  it("rejects undefined", () => {
    expect(() => validateCampaignState(undefined)).toThrow(DomainError);
  });

  it("rejects wrong schemaVersion", () => {
    const state = { ...validState(), schemaVersion: 99 };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects unsupported ruleset id", () => {
    const state = {
      ...validState(),
      ruleset: { id: "unknown_ruleset", version: 1 },
    };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects unsupported ruleset version", () => {
    const state = {
      ...validState(),
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: 99 },
    };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects non-safe-integer monthOrdinal (Infinity)", () => {
    const state = validState();
    (state as any).calendar = { monthOrdinal: Infinity };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects non-safe-integer monthOrdinal (NaN)", () => {
    const state = validState();
    (state as any).calendar = { monthOrdinal: NaN };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects non-safe-integer monthOrdinal (float)", () => {
    const state = validState();
    (state as any).calendar = { monthOrdinal: 1.5 };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects missing calendar", () => {
    const state: any = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });

  it("rejects missing ruleset", () => {
    const state: any = {
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      calendar: { monthOrdinal: 0 },
    };
    try {
      validateCampaignState(state);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    }
  });
});
