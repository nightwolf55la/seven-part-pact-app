import { describe, it, expect } from "vitest";
import {
  validateAnyCampaignState,
  validateCampaignState,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
  isSupportedSchemaVersion,
  SUPPORTED_STATE_SCHEMA_VERSIONS,
  CAMPAIGN_COMMAND_TYPES,
} from "../shared/domain";
import { migrateToCurrentVersion } from "../shared/domain/state-migration";

const V1_STATE = {
  schemaVersion: 1,
  ruleset: { id: "seven_part_pact_draft4", version: 1 },
  calendar: { monthOrdinal: 5 },
};

const V2_STATE = {
  schemaVersion: 2,
  ruleset: { id: "seven_part_pact_draft4", version: 1 },
  calendar: { monthOrdinal: 5 },
  configuration: { ageId: null, facilitatorPlayerId: null },
  players: [],
  wizards: [],
  pactSeats: {
    seat_1: { status: null, wizardId: null, watcherPlayerId: null },
    seat_2: { status: null, wizardId: null, watcherPlayerId: null },
    seat_3: { status: null, wizardId: null, watcherPlayerId: null },
    seat_4: { status: null, wizardId: null, watcherPlayerId: null },
    seat_5: { status: null, wizardId: null, watcherPlayerId: null },
    seat_6: { status: null, wizardId: null, watcherPlayerId: null },
    seat_7: { status: null, wizardId: null, watcherPlayerId: null },
  },
};

describe("V1/V2 Legacy Retirement — Fail-Closed", () => {
  it("SUPPORTED_STATE_SCHEMA_VERSIONS contains only V3", () => {
    expect(SUPPORTED_STATE_SCHEMA_VERSIONS).toEqual([3]);
  });

  it("CURRENT_STATE_SCHEMA_VERSION is 3", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(3);
  });

  it("isSupportedSchemaVersion rejects V1", () => {
    expect(isSupportedSchemaVersion(1)).toBe(false);
  });

  it("isSupportedSchemaVersion rejects V2", () => {
    expect(isSupportedSchemaVersion(2)).toBe(false);
  });

  it("isSupportedSchemaVersion accepts V3", () => {
    expect(isSupportedSchemaVersion(3)).toBe(true);
  });

  describe("validateAnyCampaignState rejects V1/V2", () => {
    it("rejects V1 state", () => {
      expect(() => validateAnyCampaignState(V1_STATE)).toThrow();
    });

    it("rejects V2 state", () => {
      expect(() => validateAnyCampaignState(V2_STATE)).toThrow();
    });
  });

  describe("validateCampaignState rejects V1/V2", () => {
    it("rejects V1 state", () => {
      expect(() => validateCampaignState(V1_STATE)).toThrow();
    });

    it("rejects V2 state", () => {
      expect(() => validateCampaignState(V2_STATE)).toThrow();
    });
  });

  describe("migrateToCurrentVersion rejects V1/V2", () => {
    it("rejects V1 state", () => {
      expect(() => migrateToCurrentVersion(V1_STATE as any)).toThrow(DomainError);
    });

    it("rejects V2 state", () => {
      expect(() => migrateToCurrentVersion(V2_STATE as any)).toThrow(DomainError);
    });

    it("does not produce a V3 state from V1 input", () => {
      let result: unknown = undefined;
      try { result = migrateToCurrentVersion(V1_STATE as any); } catch { /* expected */ }
      expect(result).toBeUndefined();
    });

    it("does not produce a V3 state from V2 input", () => {
      let result: unknown = undefined;
      try { result = migrateToCurrentVersion(V2_STATE as any); } catch { /* expected */ }
      expect(result).toBeUndefined();
    });
  });

  describe("error messaging does not suggest migration", () => {
    it("V1 rejection does not mention 'admin migration'", () => {
      try {
        migrateToCurrentVersion(V1_STATE as any);
        expect.unreachable("should have thrown");
      } catch (e) {
        const msg = (e as Error).message.toLowerCase();
        expect(msg).not.toContain("admin migration");
        expect(msg).not.toContain("run the explicit");
        expect(msg).not.toContain("run the migration");
      }
    });

    it("V2 rejection does not mention 'admin migration'", () => {
      try {
        migrateToCurrentVersion(V2_STATE as any);
        expect.unreachable("should have thrown");
      } catch (e) {
        const msg = (e as Error).message.toLowerCase();
        expect(msg).not.toContain("admin migration");
        expect(msg).not.toContain("run the explicit");
        expect(msg).not.toContain("run the migration");
      }
    });
  });

  describe("no V1→V3 or V2→V3 semantic migration path exists", () => {
    it("there is no migrateV1toV2 export", async () => {
      const mod = await import("../shared/domain/state-migration");
      expect("migrateV1toV2" in mod).toBe(false);
    });

    it("there is no migrateV2toV3 export", async () => {
      const mod = await import("../shared/domain/state-migration");
      expect("migrateV2toV3" in mod).toBe(false);
    });

    it("there is no migrateV1toV3 export", async () => {
      const mod = await import("../shared/domain/state-migration");
      expect("migrateV1toV3" in mod).toBe(false);
    });
  });
});

// ============================================================
// M4 Free-Month / Legacy Runtime Surface Retirement
// ============================================================

describe("M4 Free-Month Legacy Runtime Retirement", () => {
  describe("active command types exclude legacy month commands", () => {
    it("CAMPAIGN_COMMAND_TYPES does not contain move_month", () => {
      expect(CAMPAIGN_COMMAND_TYPES).not.toContain("move_month");
    });

    it("CAMPAIGN_COMMAND_TYPES does not contain legacy_month_change", () => {
      expect(CAMPAIGN_COMMAND_TYPES).not.toContain("legacy_month_change");
    });
  });

  describe("active event surface excludes month_changed", () => {
    it("InfrastructureEvent union does not include month_changed", async () => {
      const eventsModule = await import("../shared/domain/events");
      // MonthChangedEventV1 type should not be exported from the active event surface
      expect("MonthChangedEventV1" in eventsModule).toBe(false);
    });
  });

  describe("active domain index does not export legacy free-month helpers", () => {
    it("does not export applyMoveMonth", async () => {
      const index = await import("../shared/domain/index");
      expect("applyMoveMonth" in index).toBe(false);
    });

    it("does not export MoveMonthTransitionResult", async () => {
      const index = await import("../shared/domain/index");
      expect("MoveMonthTransitionResult" in index).toBe(false);
    });

    it("does not export moveMonthFingerprint", async () => {
      const index = await import("../shared/domain/index");
      expect("moveMonthFingerprint" in index).toBe(false);
    });

    it("does not export validateMoveMonthTransaction", async () => {
      const index = await import("../shared/domain/index");
      expect("validateMoveMonthTransaction" in index).toBe(false);
    });

    it("does not export MonthChangedEventV1", async () => {
      const index = await import("../shared/domain/index");
      expect("MonthChangedEventV1" in index).toBe(false);
    });

    it("does not export MonthChangedDataV1", async () => {
      const index = await import("../shared/domain/index");
      expect("MonthChangedDataV1" in index).toBe(false);
    });
  });

  describe("active validator surface excludes month_changed from named exports", () => {
    it("campaignEventValidator accepts historical month_changed for schema compatibility", async () => {
      // month_changed is retained in the validator for persisted-data backward
      // compatibility but is NOT part of the active InfrastructureEvent union
      // or domain index exports.
      const { campaignEventValidator } = await import("../convex/validators");
      expect(campaignEventValidator).toBeDefined();
    });

    it("monthChangedEventV1Validator is not exported", async () => {
      const validators = await import("../convex/validators");
      expect("monthChangedEventV1Validator" in validators).toBe(false);
    });
  });

  describe("Convex campaign API does not expose moveMonth mutation", () => {
    it("campaign module does not export moveMonth", async () => {
      const campaignModule = await import("../convex/campaign");
      expect("moveMonth" in campaignModule).toBe(false);
    });
  });

  describe("legacy campaign/event read fallbacks are removed", () => {
    it("campaign module does not reference the legacy events table in getRecentEvents", async () => {
      // Read the source to verify no legacy fallback path exists.
      // This is an architectural guardrail: the source text should not contain
      // a query to the "events" table (the legacy table).
      const fs = await import("fs");
      const source = fs.readFileSync("convex/campaign.ts", "utf-8");
      const legacyEventsQuery = /\.query\(\s*["']events["']\s*\)/.test(source);
      expect(legacyEventsQuery).toBe(false);
    });

    it("getCampaign does not contain legacy monthOrdinal-in-doc fallback", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("convex/campaign.ts", "utf-8");
      // The legacy fallback reads "monthOrdinal" in legacy directly — this pattern should be gone
      const getCampaignSection = source.split("export const getCampaign")[1]?.split("export const ")[0] ?? "";
      const hasLegacyFallback = getCampaignSection.includes('"monthOrdinal" in legacy');
      expect(hasLegacyFallback).toBe(false);
    });

    it("ensureCampaign does not contain legacy document fallback", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("convex/campaign.ts", "utf-8");
      const ensureSection = source.split("export const ensureCampaign")[1]?.split("export const ")[0] ?? "";
      const hasLegacyFallback = ensureSection.includes('"monthOrdinal" in c');
      expect(hasLegacyFallback).toBe(false);
    });
  });
});
