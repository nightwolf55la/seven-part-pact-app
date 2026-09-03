import { describe, it, expect } from "vitest";
import {
  validateAnyCampaignState,
  validateCampaignState,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
  isSupportedSchemaVersion,
  SUPPORTED_STATE_SCHEMA_VERSIONS,
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
