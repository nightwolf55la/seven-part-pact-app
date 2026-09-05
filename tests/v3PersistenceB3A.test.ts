import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  validateAnyCampaignState,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  SUPPORTED_STATE_SCHEMA_VERSIONS,
  DomainError,
  statesDeepEqual,
  assertPortableCampaignState,
  canonicalJsonStringify,
  asCentidegreePosition,
} from "../shared/domain";
import { initialCampaignState } from "../shared/domain/initial-state";
import {
  loadHistoricalState,
  migrateToCurrentVersion,
  isSupportedSchemaVersion,
} from "../shared/domain/state-migration";
import type {
  CampaignStateV1,
  CampaignStateV2,
  CampaignStateV3,
  CurrentCampaignState,
  MonthlyPlayState,
} from "../shared/domain/campaign-state";
import type { MonthOrdinal, PlayerId, WizardId, AllocationId, EngagementId } from "../shared/domain";

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

function baseV3Setup(overrides?: Partial<CampaignStateV3>): CampaignStateV3 {
  return {
    schemaVersion: 3,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: null },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [],
    wizards: [],
    pactSeats: emptyPactSeats(),
    lifecycle: { kind: "setup", orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null } },
    wizardmootHistory: [],
    ...overrides,
  };
}

function richPlayState(): CampaignStateV3 {
  const playerId = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
  const wizardId = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
  const allocId = "alc_00000000-0000-0000-0000-000000000001" as AllocationId;
  const engId = "eng_00000000-0000-0000-0000-000000000001" as EngagementId;

  const currentMonth: MonthlyPlayState = {
    timeParticipants: [{
      participant: { kind: "wizard", wizardId },
      effectiveBudget: 4,
      rescheduleAllowance: 1,
      reschedulesUsed: 0,
      allocations: [{
        allocationId: allocId,
        destination: { kind: "engagement", engagementId: engId },
        note: "test allocation",
        resolution: "pending",
      }],
    }],
    engagements: [{
      engagementId: engId,
      actingWizardId: wizardId,
      target: { kind: "named_character", name: "Dread Lord Kazan" },
      resolution: "pending",
      linkedTimeAllocationId: allocId,
    }],
    wizardmootAttendance: [{ wizardId, attended: false, exceptionReason: null }],
  };

  return {
    schemaVersion: 3,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 5 as MonthOrdinal },
    configuration: { ageId: "awakening", facilitatorPlayerId: playerId },
    players: [{ playerId, name: "Alice" }],
    wizards: [{ wizardId, name: "Valdris", portrayedByPlayerId: playerId }],
    pactSeats: {
      ...emptyPactSeats(),
      necromancer: { status: "present", wizardId, watcherPlayerId: null },
    },
    lifecycle: {
      kind: "play",
      phase: "meeting",
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
      { monthOrdinal: 3 as MonthOrdinal, attendance: [{ wizardId, attended: true }] },
      { monthOrdinal: 4 as MonthOrdinal, attendance: [{ wizardId, attended: false }] },
    ],
  };
}

// ============================================================
// 1. Incomplete V3 Setup survives serialize/validate roundtrip exactly
// ============================================================

describe("B3A: V3 incomplete Setup serialize/validate roundtrip", () => {
  it("null month survives roundtrip", () => {
    const setup = baseV3Setup();
    expect(setup.calendar.monthOrdinal).toBeNull();
    const validated = validateCampaignState(setup);
    expect(validated.calendar.monthOrdinal).toBeNull();
  });

  it("null setup planet positions survive roundtrip", () => {
    const setup = baseV3Setup();
    const validated = validateCampaignState(setup);
    expect(validated.lifecycle.kind).toBe("setup");
    if (validated.lifecycle.kind === "setup") {
      expect(validated.lifecycle.orrery.saturn).toBeNull();
      expect(validated.lifecycle.orrery.jupiter).toBeNull();
      expect(validated.lifecycle.orrery.mars).toBeNull();
      expect(validated.lifecycle.orrery.venus).toBeNull();
      expect(validated.lifecycle.orrery.mercury).toBeNull();
    }
  });

  it("partial planet positions survive roundtrip", () => {
    const setup = baseV3Setup({
      lifecycle: {
        kind: "setup",
        orrery: {
          saturn: asCentidegreePosition(500),
          jupiter: null,
          mars: null,
          venus: asCentidegreePosition(0),
          mercury: null,
        },
      },
    });
    const validated = validateCampaignState(setup);
    if (validated.lifecycle.kind === "setup") {
      expect(validated.lifecycle.orrery.saturn).toBe(500);
      expect(validated.lifecycle.orrery.jupiter).toBeNull();
      expect(validated.lifecycle.orrery.venus).toBe(0);
    }
  });

  it("serialization preserves null fields exactly", () => {
    const setup = baseV3Setup();
    const json = canonicalJsonStringify(setup);
    const parsed = JSON.parse(json);
    expect(parsed.calendar.monthOrdinal).toBeNull();
    expect(parsed.lifecycle.orrery.saturn).toBeNull();
  });

  it("assertPortableCampaignState accepts incomplete Setup", () => {
    const setup = baseV3Setup();
    expect(() => assertPortableCampaignState(setup)).not.toThrow();
  });

  it("statesDeepEqual confirms identity roundtrip", () => {
    const setup = baseV3Setup();
    const validated = validateCampaignState(setup);
    expect(statesDeepEqual(setup, validated)).toBe(true);
  });
});

// ============================================================
// 2. Representative V3 Play state survives exactly
// ============================================================

describe("B3A: V3 Play state serialize/validate roundtrip", () => {
  it("rich play state validates successfully", () => {
    const play = richPlayState();
    expect(() => validateCampaignState(play)).not.toThrow();
  });

  it("serialization roundtrip preserves all fields", () => {
    const play = richPlayState();
    const json = canonicalJsonStringify(play);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.lifecycle.kind).toBe("play");
    expect(parsed.lifecycle.phase).toBe("meeting");
    expect(parsed.lifecycle.orrery.saturn).toBe(500);
    expect(parsed.lifecycle.currentMonth.timeParticipants.length).toBe(1);
    expect(parsed.lifecycle.currentMonth.engagements.length).toBe(1);
    expect(parsed.lifecycle.currentMonth.wizardmootAttendance.length).toBe(1);
    expect(parsed.wizardmootHistory.length).toBe(2);
  });

  it("statesDeepEqual confirms identity for rich play state", () => {
    const play = richPlayState();
    const validated = validateCampaignState(play);
    expect(statesDeepEqual(play, validated)).toBe(true);
  });

  it("assertPortableCampaignState accepts rich play state", () => {
    const play = richPlayState();
    expect(() => assertPortableCampaignState(play)).not.toThrow();
  });
});

// ============================================================
// 3. Current campaign validator accepts V3
// ============================================================

describe("B3A: current campaign validator accepts V3", () => {
  it("validateCampaignState accepts V3 Setup", () => {
    const result = validateCampaignState(baseV3Setup());
    expect(result.schemaVersion).toBe(3);
  });

  it("validateCampaignState accepts V3 Play", () => {
    const result = validateCampaignState(richPlayState());
    expect(result.schemaVersion).toBe(3);
  });

  it("initialCampaignState passes validation", () => {
    const initial = initialCampaignState();
    expect(() => validateCampaignState(initial)).not.toThrow();
  });
});

// ============================================================
// 4. Snapshot validator accepts V3
// ============================================================

describe("B3A: snapshot validator accepts V3", () => {
  it("validateAnyCampaignState accepts V3 Setup", () => {
    const result = validateAnyCampaignState(baseV3Setup());
    expect(result.schemaVersion).toBe(3);
  });

  it("validateAnyCampaignState accepts V3 Play", () => {
    const result = validateAnyCampaignState(richPlayState());
    expect(result.schemaVersion).toBe(3);
  });

  it("loadHistoricalState accepts V3", () => {
    const result = loadHistoricalState(richPlayState());
    expect(result.schemaVersion).toBe(3);
  });
});

// ============================================================
// 5. V1 rejected
// ============================================================

describe("B3A: V1 rejected", () => {
  const v1: CampaignStateV1 = {
    schemaVersion: 1,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
  };

  it("validateCampaignState rejects V1", () => {
    expect(() => validateCampaignState(v1)).toThrow(DomainError);
  });

  it("validateAnyCampaignState rejects V1", () => {
    expect(() => validateAnyCampaignState(v1)).toThrow("no longer supported");
  });

  it("loadHistoricalState rejects V1", () => {
    expect(() => loadHistoricalState(v1)).toThrow();
  });

  it("isSupportedSchemaVersion rejects 1", () => {
    expect(isSupportedSchemaVersion(1)).toBe(false);
  });
});

// ============================================================
// 6. V2 rejected
// ============================================================

describe("B3A: V2 rejected", () => {
  const v2: CampaignStateV2 = {
    schemaVersion: 2,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [],
    wizards: [],
    pactSeats: emptyPactSeats(),
  };

  it("validateCampaignState rejects V2", () => {
    expect(() => validateCampaignState(v2)).toThrow(DomainError);
  });

  it("validateAnyCampaignState rejects V2", () => {
    expect(() => validateAnyCampaignState(v2)).toThrow("no longer supported");
  });

  it("loadHistoricalState rejects V2", () => {
    expect(() => loadHistoricalState(v2)).toThrow();
  });

  it("isSupportedSchemaVersion rejects 2", () => {
    expect(isSupportedSchemaVersion(2)).toBe(false);
  });
});

// ============================================================
// 7. No migration-to-V3 function/path exists
// ============================================================

describe("B3A: no migration-to-V3 path", () => {
  it("SUPPORTED_STATE_SCHEMA_VERSIONS is V3-only", () => {
    expect(SUPPORTED_STATE_SCHEMA_VERSIONS).toEqual([3]);
  });

  it("CURRENT_STATE_SCHEMA_VERSION is 3", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(3);
  });

  it("migrateToCurrentVersion passes V3 through", () => {
    const state = baseV3Setup();
    const result = migrateToCurrentVersion(state);
    expect(result).toBe(state);
  });

  it("migrateToCurrentVersion throws on non-V3", () => {
    const fakeV4 = { ...baseV3Setup(), schemaVersion: 4 } as any;
    expect(() => migrateToCurrentVersion(fakeV4)).toThrow();
  });

  it("unknown schema version fails closed", () => {
    expect(() => validateAnyCampaignState({ ...baseV3Setup(), schemaVersion: 99 })).toThrow();
  });
});

// ============================================================
// 8. V3 Wizardmoot history and monthly state are not lost by serialization
// ============================================================

describe("B3A: serialization preserves wizardmoot history and monthly state", () => {
  it("wizardmootHistory entries survive canonical JSON roundtrip", () => {
    const play = richPlayState();
    const json = canonicalJsonStringify(play);
    const parsed = JSON.parse(json) as CampaignStateV3;
    expect(parsed.wizardmootHistory).toEqual(play.wizardmootHistory);
  });

  it("currentMonth.timeParticipants survive", () => {
    const play = richPlayState();
    const json = canonicalJsonStringify(play);
    const parsed = JSON.parse(json) as CampaignStateV3;
    if (parsed.lifecycle.kind === "play") {
      expect(parsed.lifecycle.currentMonth.timeParticipants).toEqual(
        (play.lifecycle as any).currentMonth.timeParticipants,
      );
    }
  });

  it("currentMonth.engagements survive", () => {
    const play = richPlayState();
    const json = canonicalJsonStringify(play);
    const parsed = JSON.parse(json) as CampaignStateV3;
    if (parsed.lifecycle.kind === "play") {
      expect(parsed.lifecycle.currentMonth.engagements).toEqual(
        (play.lifecycle as any).currentMonth.engagements,
      );
    }
  });

  it("currentMonth.wizardmootAttendance survives", () => {
    const play = richPlayState();
    const json = canonicalJsonStringify(play);
    const parsed = JSON.parse(json) as CampaignStateV3;
    if (parsed.lifecycle.kind === "play") {
      expect(parsed.lifecycle.currentMonth.wizardmootAttendance).toEqual(
        (play.lifecycle as any).currentMonth.wizardmootAttendance,
      );
    }
  });

  it("statesDeepEqual detects loss if wizardmootHistory is emptied", () => {
    const play = richPlayState();
    const tampered = { ...play, wizardmootHistory: [] };
    expect(statesDeepEqual(play, tampered)).toBe(false);
  });

  it("statesDeepEqual detects loss if currentMonth is emptied", () => {
    const play = richPlayState();
    const emptyMonth: MonthlyPlayState = {
      timeParticipants: [],
      engagements: [],
      wizardmootAttendance: null,
    };
    const tampered = {
      ...play,
      lifecycle: { ...(play.lifecycle as any), currentMonth: emptyMonth },
    };
    expect(statesDeepEqual(play, tampered)).toBe(false);
  });
});
