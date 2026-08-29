import { describe, it, expect } from "vitest";
import {
  validateMoveMonthTransaction,
  verifyMigrationInvariants,
  moveMonthFingerprint,
  applyMoveMonth,
  backupImportFingerprint,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_STATE_SCHEMA_VERSION,
} from "../shared/domain";
import {
  verifyBackupImportRevisionStructure,
} from "../shared/domain/backup-verification";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  CurrentCampaignState,
  MonthOrdinal,
  MonthDirection,
  RevisionRecord,
  EventRecord,
  SnapshotRecord,
  CampaignDocument,
} from "../shared/domain";

function makeState(monthOrdinal: number): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: {
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    },
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

function makeEvent(
  direction: MonthDirection,
  from: number,
  to: number,
): EventRecord["event"] {
  return {
    type: "month_changed",
    version: 1,
    data: { direction, fromOrdinal: from, toOrdinal: to },
  };
}

function makeSnapshot(revision: number, monthOrdinal: number): SnapshotRecord {
  return {
    campaignRevision: revision,
    state: makeState(monthOrdinal),
  };
}

function makeRevision(revision: number): RevisionRecord {
  return {
    campaignRevision: revision,
    commandType: "legacy_month_change",
    commandFingerprint: `legacy_month_change:v1:rev${revision}:forward`,
  };
}

function makeEventRecord(revision: number, index: number, event: EventRecord["event"]): EventRecord {
  return { campaignRevision: revision, eventIndex: index, event };
}

function makeCanonicalDoc(revision: number, monthOrdinal: number): CampaignDocument {
  return {
    campaignKey: "default",
    campaignId: "cmp_00000000-0000-0000-0000-000000000000",
    campaignRevision: revision,
    state: makeState(monthOrdinal),
  };
}

describe("validateMoveMonthTransaction", () => {
  it("accepts a valid forward transaction", () => {
    const state = makeState(5);
    const { nextState, events } = applyMoveMonth(state, "forward");
    const fp = moveMonthFingerprint("forward");
    const errors = validateMoveMonthTransaction(state, events, nextState, fp);
    expect(errors).toEqual([]);
  });

  it("accepts a valid backward transaction", () => {
    const state = makeState(3);
    const { nextState, events } = applyMoveMonth(state, "backward");
    const fp = moveMonthFingerprint("backward");
    const errors = validateMoveMonthTransaction(state, events, nextState, fp);
    expect(errors).toEqual([]);
  });

  it("rejects zero events", () => {
    const state = makeState(5);
    const errors = validateMoveMonthTransaction(state, [], state, moveMonthFingerprint("forward"));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("exactly one event");
  });

  it("rejects two events", () => {
    const state = makeState(5);
    const e1 = makeEvent("forward", 5, 6);
    const e2 = makeEvent("forward", 6, 7);
    const errors = validateMoveMonthTransaction(state, [e1, e2], makeState(7), moveMonthFingerprint("forward"));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("exactly one event");
  });

  it("rejects wrong event type", () => {
    const state = makeState(5);
    const badEvent = {
      type: "spell_cast",
      version: 1,
      data: { direction: "forward", fromOrdinal: 5, toOrdinal: 6 },
    } as unknown as EventRecord["event"];
    const errors = validateMoveMonthTransaction(state, [badEvent], makeState(6), moveMonthFingerprint("forward"));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("month_changed version 1");
  });

  it("rejects fromOrdinal mismatch", () => {
    const state = makeState(5);
    const evt = makeEvent("forward", 99, 100);
    const errors = validateMoveMonthTransaction(state, [evt], makeState(100), moveMonthFingerprint("forward"));
    expect(errors.some((e) => e.includes("fromOrdinal"))).toBe(true);
  });

  it("rejects toOrdinal inconsistent with direction", () => {
    const state = makeState(5);
    const evt = makeEvent("forward", 5, 99);
    const errors = validateMoveMonthTransaction(state, [evt], makeState(99), moveMonthFingerprint("forward"));
    expect(errors.some((e) => e.includes("toOrdinal"))).toBe(true);
  });

  it("rejects nextState monthOrdinal not matching toOrdinal", () => {
    const state = makeState(5);
    const evt = makeEvent("forward", 5, 6);
    const errors = validateMoveMonthTransaction(state, [evt], makeState(99), moveMonthFingerprint("forward"));
    expect(errors.some((e) => e.includes("Next state monthOrdinal"))).toBe(true);
  });

  it("rejects wrong commandFingerprint", () => {
    const state = makeState(5);
    const { nextState, events } = applyMoveMonth(state, "forward");
    const errors = validateMoveMonthTransaction(state, events, nextState, "wrong:fingerprint");
    expect(errors.some((e) => e.includes("commandFingerprint"))).toBe(true);
  });

  it("rejects backward fingerprint for forward event", () => {
    const state = makeState(5);
    const { nextState, events } = applyMoveMonth(state, "forward");
    const errors = validateMoveMonthTransaction(state, events, nextState, moveMonthFingerprint("backward"));
    expect(errors.some((e) => e.includes("commandFingerprint"))).toBe(true);
  });
});

describe("historical snapshot loading uses loadSnapshotState (V1/V2 regression)", () => {
  const campaignSource = fs.readFileSync(
    path.resolve(__dirname, "../convex/campaign.ts"),
    "utf-8",
  );

  function extractFunctionBody(source: string, exportName: string): string {
    const marker = `export const ${exportName}`;
    const start = source.indexOf(marker);
    if (start === -1) throw new Error(`Could not find "${marker}" in campaign.ts`);
    const nextExport = source.indexOf("\nexport ", start + marker.length);
    return source.slice(start, nextExport === -1 ? undefined : nextExport);
  }

  describe("getUndoRedoState", () => {
    const body = extractFunctionBody(campaignSource, "getUndoRedoState");

    it("loads the logical snapshot via loadSnapshotState, not a raw DB query", () => {
      expect(body).toContain("loadSnapshotState");
    });

    it("does not directly query campaignSnapshots", () => {
      const rawQueryPattern = /ctx\.db[\s\S]*?\.query\(\s*["']campaignSnapshots["']\s*\)/;
      expect(body).not.toMatch(rawQueryPattern);
    });
  });

  describe("listCheckpoints", () => {
    const body = extractFunctionBody(campaignSource, "listCheckpoints");

    it("loads checkpoint source snapshots via loadSnapshotState, not a raw DB query", () => {
      expect(body).toContain("loadSnapshotState");
    });

    it("does not directly query campaignSnapshots", () => {
      const rawQueryPattern = /ctx\.db[\s\S]*?\.query\(\s*["']campaignSnapshots["']\s*\)/;
      expect(body).not.toMatch(rawQueryPattern);
    });
  });
});

describe("verifyBackupImportRevisionStructure with V1 historical snapshot", () => {
  it("accepts a valid V1 result snapshot in backup_import history", () => {
    const v1Snapshot = {
      schemaVersion: 1 as const,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 5 },
    };

    const payloadDigest = "a".repeat(64);
    const errors = verifyBackupImportRevisionStructure({
      campaignRevision: 36,
      commandFingerprint: backupImportFingerprint(35, payloadDigest),
      eventType: "backup_imported",
      eventVersion: 1,
      eventData: {
        backupFormatVersion: 1,
        sourceCampaignId: "cmp_00000000-0000-0000-0000-000000000000",
        sourceCampaignRevision: 10,
        sourceLogicalRevision: 10,
        exportedAtMs: 1700000000000,
        payloadDigest,
      },
      resultSnapshotExists: true,
      resultSnapshotState: v1Snapshot,
    });

    expect(errors.filter((e: string) => e.includes("result snapshot state invalid"))).toEqual([]);
  });
});

describe("verifyMigrationInvariants", () => {
  function makeValidInput(revisionCount: number) {
    const revisions: RevisionRecord[] = [];
    const events: EventRecord[] = [];
    const snapshots: SnapshotRecord[] = [makeSnapshot(0, 0)];

    for (let r = 1; r <= revisionCount; r++) {
      const from = r - 1;
      const to = r;
      revisions.push(makeRevision(r));
      events.push(makeEventRecord(r, 0, makeEvent("forward", from, to)));
      snapshots.push(makeSnapshot(r, to));
    }

    const campaignDocuments: CampaignDocument[] = [makeCanonicalDoc(revisionCount, revisionCount)];

    return {
      campaignRevision: revisionCount,
      revisions,
      events,
      snapshots,
      campaignDocuments,
    };
  }

  it("accepts a complete valid migration", () => {
    const input = makeValidInput(3);
    const result = verifyMigrationInvariants(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts revision 0 with no revisions or events", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 0,
      revisions: [],
      events: [],
      snapshots: [makeSnapshot(0, 0)],
      campaignDocuments: [makeCanonicalDoc(0, 0)],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects event at revision 0", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 1,
      revisions: [makeRevision(1)],
      events: [
        makeEventRecord(0, 0, makeEvent("forward", 0, 1)),
        makeEventRecord(1, 0, makeEvent("forward", 0, 1)),
      ],
      snapshots: [makeSnapshot(0, 0), makeSnapshot(1, 1)],
      campaignDocuments: [makeCanonicalDoc(1, 1)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("revision 0"))).toBe(true);
  });

  it("rejects event beyond N", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 1,
      revisions: [makeRevision(1)],
      events: [
        makeEventRecord(1, 0, makeEvent("forward", 0, 1)),
        makeEventRecord(2, 0, makeEvent("forward", 1, 2)),
      ],
      snapshots: [makeSnapshot(0, 0), makeSnapshot(1, 1)],
      campaignDocuments: [makeCanonicalDoc(1, 1)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outside range"))).toBe(true);
  });

  it("rejects orphan event without matching revision", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 3,
      revisions: [makeRevision(1), makeRevision(2)],
      events: [
        makeEventRecord(1, 0, makeEvent("forward", 0, 1)),
        makeEventRecord(2, 0, makeEvent("forward", 1, 2)),
        makeEventRecord(3, 0, makeEvent("forward", 2, 3)),
      ],
      snapshots: [makeSnapshot(0, 0), makeSnapshot(1, 1), makeSnapshot(2, 2), makeSnapshot(3, 3)],
      campaignDocuments: [makeCanonicalDoc(3, 3)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("no matching revision"))).toBe(true);
  });

  it("rejects revision with no events", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 2,
      revisions: [makeRevision(1), makeRevision(2)],
      events: [makeEventRecord(1, 0, makeEvent("forward", 0, 1))],
      snapshots: [makeSnapshot(0, 0), makeSnapshot(1, 1), makeSnapshot(2, 2)],
      campaignDocuments: [makeCanonicalDoc(2, 2)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Revision 2 has no events"))).toBe(true);
  });

  it("rejects non-contiguous eventIndex", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: 1,
      revisions: [makeRevision(1)],
      events: [makeEventRecord(1, 0, makeEvent("forward", 0, 1)), makeEventRecord(1, 2, makeEvent("forward", 0, 1))],
      snapshots: [makeSnapshot(0, 0), makeSnapshot(1, 1)],
      campaignDocuments: [makeCanonicalDoc(1, 1)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("eventIndex gap"))).toBe(true);
  });

  it("rejects missing snapshot for revision 0", () => {
    const input = makeValidInput(2);
    const result = verifyMigrationInvariants({
      ...input,
      snapshots: input.snapshots.filter((s) => s.campaignRevision !== 0),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing snapshot for revision 0"))).toBe(true);
  });

  it("rejects missing snapshot for a middle revision", () => {
    const input = makeValidInput(5);
    const result = verifyMigrationInvariants({
      ...input,
      snapshots: input.snapshots.filter((s) => s.campaignRevision !== 3),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing snapshot for revision 3"))).toBe(true);
  });

  it("rejects extra snapshot beyond N", () => {
    const input = makeValidInput(2);
    const result = verifyMigrationInvariants({
      ...input,
      snapshots: [...input.snapshots, makeSnapshot(3, 3)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outside range"))).toBe(true);
  });

  it("rejects wrong snapshot count (N+1 required)", () => {
    const input = makeValidInput(3);
    const result = verifyMigrationInvariants({
      ...input,
      snapshots: input.snapshots.filter((s) => s.campaignRevision !== 2),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing snapshot"))).toBe(true);
  });

  it("rejects duplicate snapshots", () => {
    const input = makeValidInput(1);
    const result = verifyMigrationInvariants({
      ...input,
      snapshots: [
        makeSnapshot(0, 0),
        makeSnapshot(1, 1),
        makeSnapshot(1, 1),
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate snapshot"))).toBe(true);
  });

  it("rejects missing revision record", () => {
    const input = makeValidInput(3);
    const result = verifyMigrationInvariants({
      ...input,
      revisions: input.revisions.filter((r) => r.campaignRevision !== 2),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing revision record: 2"))).toBe(true);
  });

  it("rejects revision record outside range 1..N", () => {
    const input = makeValidInput(2);
    const result = verifyMigrationInvariants({
      ...input,
      revisions: [...input.revisions, makeRevision(5)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("outside range"))).toBe(true);
  });

  it("rejects duplicate revision records", () => {
    const input = makeValidInput(2);
    const result = verifyMigrationInvariants({
      ...input,
      revisions: [...input.revisions, makeRevision(1)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate revision record"))).toBe(true);
  });

  it("rejects remaining legacy campaign document", () => {
    const input = makeValidInput(1);
    const legacyDoc: CampaignDocument = {
      campaignKey: "__legacy__",
      campaignId: "",
      campaignRevision: 1,
      state: makeState(1),
    };
    const result = verifyMigrationInvariants({
      ...input,
      campaignDocuments: [makeCanonicalDoc(1, 1), legacyDoc],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("non-canonical"))).toBe(true);
  });

  it("rejects zero campaign documents", () => {
    const input = makeValidInput(1);
    const result = verifyMigrationInvariants({
      ...input,
      campaignDocuments: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exactly one canonical"))).toBe(true);
  });

  it("rejects two canonical campaign documents", () => {
    const input = makeValidInput(1);
    const result = verifyMigrationInvariants({
      ...input,
      campaignDocuments: [makeCanonicalDoc(1, 1), makeCanonicalDoc(1, 1)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exactly one canonical"))).toBe(true);
  });

  it("rejects campaign document with mismatched revision", () => {
    const input = makeValidInput(3);
    const result = verifyMigrationInvariants({
      ...input,
      campaignDocuments: [makeCanonicalDoc(99, 3)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("does not match expected"))).toBe(true);
  });

  it("rejects negative campaignRevision", () => {
    const result = verifyMigrationInvariants({
      campaignRevision: -1,
      revisions: [],
      events: [],
      snapshots: [],
      campaignDocuments: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid campaignRevision"))).toBe(true);
  });
});
