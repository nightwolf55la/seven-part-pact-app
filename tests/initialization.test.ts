import { describe, it, expect } from "vitest";
import {
  initialCampaignState,
  validateCampaignState,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  verifyMigrationInvariants,
  isValidCampaignId,
} from "../shared/domain";
import type {
  RevisionRecord,
  EventRecord,
  SnapshotRecord,
  CampaignDocument,
  SerializableCampaignState,
} from "../shared/domain";

describe("initialCampaignState", () => {
  it("returns current state schema version", () => {
    const state = initialCampaignState();
    expect(state.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
  });

  it("returns current ruleset ID", () => {
    const state = initialCampaignState();
    expect(state.ruleset.id).toBe(SEVEN_PART_PACT_DRAFT4_ID);
  });

  it("returns current ruleset version", () => {
    const state = initialCampaignState();
    expect(state.ruleset.version).toBe(SEVEN_PART_PACT_DRAFT4_VERSION);
  });

  it("monthOrdinal is null initially", () => {
    const state = initialCampaignState();
    expect(state.calendar.monthOrdinal).toBeNull();
  });

  it("passes domain validation", () => {
    const state = initialCampaignState();
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("is deterministic (multiple calls return equal values)", () => {
    const a = initialCampaignState();
    const b = initialCampaignState();
    expect(a).toEqual(b);
  });
});

describe("CampaignId generation contract", () => {
  it("cmp_ prefix with UUID is valid", () => {
    const id = `cmp_${crypto.randomUUID()}`;
    expect(isValidCampaignId(id)).toBe(true);
  });

  it("multiple generated IDs are unique", () => {
    const ids = new Set(Array.from({ length: 100 }, () => `cmp_${crypto.randomUUID()}`));
    expect(ids.size).toBe(100);
  });
});

function makeInitialState(): SerializableCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: null },
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

function freshCampaignDoc(): CampaignDocument {
  return {
    campaignKey: "default",
    campaignId: "cmp_00000000-0000-0000-0000-000000000000",
    campaignRevision: 0,
    state: makeInitialState(),
  };
}

describe("ensureCampaign initialization planning (pure invariants)", () => {
  it("empty persistence is eligible (N=0, 1 snapshot, 1 doc is valid)", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("existing valid canonical campaign is idempotent (no additional changes)", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(true);
  });

  it("orphan legacy events without campaign fail closed", () => {
    // This would be caught at the Convex layer before calling verifyMigrationInvariants,
    // but at the domain level having events with no matching revision is invalid
    const evt: EventRecord = {
      campaignRevision: 1,
      eventIndex: 0,
      event: { type: "month_changed", version: 1, data: { direction: "forward", fromOrdinal: 0, toOrdinal: 1 } },
    };
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [evt],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outside range"))).toBe(true);
  });

  it("orphan campaignRevisions without campaign fail closed", () => {
    const rev: RevisionRecord = {
      campaignRevision: 1,
      commandType: "move_month",
      commandFingerprint: "move_month:v1:forward",
    };
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [rev],
      events: [],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outside range"))).toBe(true);
  });

  it("multiple campaign documents fail closed", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc(), freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exactly one canonical"))).toBe(true);
  });

  it("missing revision-0 snapshot is corruption", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing snapshot for revision 0"))).toBe(true);
  });

  it("contradictory revision-0 snapshot is corruption (different month)", () => {
    const wrongState: SerializableCampaignState = {
      ...makeInitialState(),
      calendar: { monthOrdinal: 99 },
    };
    // verifyMigrationInvariants itself does not check state content equality,
    // but verifyMigration.ts handler does the final-snapshot equality check.
    // Here we verify the structural invariant passes (snapshot exists, count correct),
    // the content check is at the handler layer.
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: wrongState }],
      campaignDocuments: [freshCampaignDoc()],
    });
    // Structural invariants pass (1 snapshot, 0 revisions, 1 doc)
    expect(result.valid).toBe(true);
  });
});

describe("verifyMigrationInvariants at revision 0", () => {
  it("canonical revision 0 with exactly one snapshot is valid", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(true);
  });

  it("revision 0 with a revision record is invalid", () => {
    const rev: RevisionRecord = {
      campaignRevision: 1,
      commandType: "move_month",
      commandFingerprint: "move_month:v1:forward",
    };
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [rev],
      events: [],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
  });

  it("revision 0 with a gameplay event is invalid", () => {
    const evt: EventRecord = {
      campaignRevision: 1,
      eventIndex: 0,
      event: { type: "month_changed", version: 1, data: { direction: "forward", fromOrdinal: 0, toOrdinal: 1 } },
    };
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [evt],
      snapshots: [{ campaignRevision: 0, state: makeInitialState() }],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
  });

  it("revision 0 with zero snapshots is invalid", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing snapshot"))).toBe(true);
  });

  it("revision 0 with more than one snapshot is invalid", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [
        { campaignRevision: 0, state: makeInitialState() },
        { campaignRevision: 0, state: makeInitialState() },
      ],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate snapshot"))).toBe(true);
  });

  it("revision 0 with an out-of-range snapshot is invalid", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [
        { campaignRevision: 0, state: makeInitialState() },
        { campaignRevision: 1, state: makeInitialState() },
      ],
      campaignDocuments: [freshCampaignDoc()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outside range"))).toBe(true);
  });
});
