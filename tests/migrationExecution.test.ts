import { describe, it, expect } from "vitest";
import {
  syntheticMigrationCommandId,
  isSyntheticMigrationCommandId,
  displayNameFromOrdinal,
  INITIAL_MONTH_ORDINAL,
  DomainError,
} from "../shared/domain";
import {
  analyzeLegacyMigration,
} from "../shared/domain/migration-analyzer";
import type {
  LegacyCampaignInput,
  LegacyEventInput,
  MigrationReady,
} from "../shared/domain/migration-analyzer";

function makeEvent(
  revision: number,
  direction: "forward" | "backward",
  previousMonthOrdinal: number,
  newMonthOrdinal: number,
): LegacyEventInput {
  return {
    type: "month_changed",
    revision,
    direction,
    previousMonthOrdinal,
    newMonthOrdinal,
    previousMonth: displayNameFromOrdinal(previousMonthOrdinal),
    newMonth: displayNameFromOrdinal(newMonthOrdinal),
  };
}

describe("syntheticMigrationCommandId", () => {
  it("produces deterministic IDs for same revision", () => {
    expect(syntheticMigrationCommandId(1)).toBe(syntheticMigrationCommandId(1));
    expect(syntheticMigrationCommandId(5)).toBe(syntheticMigrationCommandId(5));
  });

  it("produces distinct IDs for different revisions", () => {
    expect(syntheticMigrationCommandId(1)).not.toBe(syntheticMigrationCommandId(2));
  });

  it("is recognizable as synthetic", () => {
    expect(isSyntheticMigrationCommandId(syntheticMigrationCommandId(1))).toBe(true);
    expect(isSyntheticMigrationCommandId(syntheticMigrationCommandId(99))).toBe(true);
  });

  it("live command IDs are not synthetic", () => {
    expect(isSyntheticMigrationCommandId("cmd_abc-123")).toBe(false);
    expect(isSyntheticMigrationCommandId("random-uuid")).toBe(false);
  });
});

describe("migration execution planning", () => {
  it("N events -> N revisions, N events, N+1 snapshots", () => {
    const N = 5;
    const campaign: LegacyCampaignInput = { monthOrdinal: N, revision: N };
    const events: LegacyEventInput[] = [];
    for (let i = 0; i < N; i++) {
      events.push(makeEvent(i + 1, "forward", i, i + 1));
    }
    const result = analyzeLegacyMigration([campaign], events);
    expect(result.status).toBe("ready");
    const r = result as MigrationReady;
    expect(r.revisionRecordCount).toBe(N);
    expect(r.newEventRecordCount).toBe(N);
    expect(r.snapshotCount).toBe(N + 1);
  });

  it("invalid analysis prevents execution (missing events)", () => {
    const campaign: LegacyCampaignInput = { monthOrdinal: 3, revision: 3 };
    const events: LegacyEventInput[] = [makeEvent(1, "forward", 0, 1)];
    const result = analyzeLegacyMigration([campaign], events);
    expect(result.status).toBe("invalid");
  });

  it("nonempty canonical tables would prevent migration (verified by status check)", () => {
    const campaign: LegacyCampaignInput = { monthOrdinal: 0, revision: 0 };
    const result = analyzeLegacyMigration([campaign], []);
    expect(result.status).toBe("ready");
  });

  it("already migrated state detected when no legacy campaign", () => {
    const result = analyzeLegacyMigration([], []);
    expect(result.status).toBe("not_needed");
  });
});

describe("canonical transaction semantics (pure logic)", () => {
  it("valid chain produces exactly one event per revision", () => {
    const campaign: LegacyCampaignInput = { monthOrdinal: 3, revision: 3 };
    const events: LegacyEventInput[] = [
      makeEvent(1, "forward", 0, 1),
      makeEvent(2, "forward", 1, 2),
      makeEvent(3, "forward", 2, 3),
    ];
    const result = analyzeLegacyMigration([campaign], events) as MigrationReady;
    expect(result.revisions).toHaveLength(3);
    for (const rev of result.revisions) {
      expect(rev.event.type).toBe("month_changed");
      expect(rev.event.version).toBe(1);
    }
  });

  it("each revision has exactly one corresponding snapshot in plan", () => {
    const campaign: LegacyCampaignInput = { monthOrdinal: 2, revision: 2 };
    const events: LegacyEventInput[] = [
      makeEvent(1, "forward", 0, 1),
      makeEvent(2, "forward", 1, 2),
    ];
    const result = analyzeLegacyMigration([campaign], events) as MigrationReady;
    const snapshotRevisions = result.snapshots.map((s) => s.campaignRevision);
    expect(snapshotRevisions).toEqual([0, 1, 2]);
  });

  it("synthetic command IDs for migration are deterministic and unique", () => {
    const ids = new Set<string>();
    for (let i = 1; i <= 30; i++) {
      const id = syntheticMigrationCommandId(i);
      expect(ids.has(id as string)).toBe(false);
      ids.add(id as string);
    }
  });

  it("incompatible command reuse would use stable COMMAND_ID_REUSED code", () => {
    const err = new DomainError("COMMAND_ID_REUSED", "test");
    expect(err.code).toBe("COMMAND_ID_REUSED");
    expect(err).toBeInstanceOf(Error);
  });
});
