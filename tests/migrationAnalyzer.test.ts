import { describe, it, expect } from "vitest";
import {
  analyzeLegacyMigration,
  displayNameFromOrdinal,
  INITIAL_MONTH_ORDINAL,
} from "../shared/domain";
import type {
  LegacyCampaignInput,
  LegacyEventInput,
  MigrationReady,
} from "../shared/domain";

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

describe("analyzeLegacyMigration", () => {
  describe("empty database", () => {
    it("reports not_needed when no campaign and no events", () => {
      const result = analyzeLegacyMigration([], []);
      expect(result.status).toBe("not_needed");
    });
  });

  describe("valid revision-0 campaign", () => {
    it("produces 1 snapshot and 0 revisions", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 0, revision: 0 };
      const result = analyzeLegacyMigration([campaign], []);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;
      expect(r.legacyCampaignRevision).toBe(0);
      expect(r.initialMonthOrdinal).toBe(0);
      expect(r.finalMonthOrdinal).toBe(0);
      expect(r.legacyEventCount).toBe(0);
      expect(r.revisionRecordCount).toBe(0);
      expect(r.newEventRecordCount).toBe(0);
      expect(r.snapshotCount).toBe(1);
      expect(r.snapshots).toHaveLength(1);
      expect(r.snapshots[0].campaignRevision).toBe(0);
      expect(r.snapshots[0].state.calendar.monthOrdinal).toBe(0);
      expect(r.revisions).toHaveLength(0);
      expect(r.idsDeferred).toBe(true);
    });
  });

  describe("invalid revision-0 campaign with impossible month", () => {
    it("rejects campaign at revision 0 with non-initial monthOrdinal", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 5, revision: 0 };
      const result = analyzeLegacyMigration([campaign], []);
      expect(result.status).toBe("invalid");
    });
  });

  describe("valid multi-revision chain", () => {
    it("validates a 3-revision forward chain", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 3, revision: 3 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        makeEvent(2, "forward", 1, 2),
        makeEvent(3, "forward", 2, 3),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;
      expect(r.legacyCampaignRevision).toBe(3);
      expect(r.initialMonthOrdinal).toBe(0);
      expect(r.finalMonthOrdinal).toBe(3);
      expect(r.legacyEventCount).toBe(3);
      expect(r.revisionRecordCount).toBe(3);
      expect(r.newEventRecordCount).toBe(3);
      expect(r.snapshotCount).toBe(4);
      expect(r.snapshots).toHaveLength(4);
      expect(r.revisions).toHaveLength(3);
      expect(r.migrationCommandType).toBe("legacy_month_change");
    });

    it("validates a chain with forward and backward moves", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 1, revision: 3 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        makeEvent(2, "forward", 1, 2),
        makeEvent(3, "backward", 2, 1),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;
      expect(r.finalMonthOrdinal).toBe(1);
    });

    it("validates negative ordinals from backward moves past April", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: -2, revision: 2 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "backward", 0, -1),
        makeEvent(2, "backward", -1, -2),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;
      expect(r.finalMonthOrdinal).toBe(-2);
      expect(r.snapshots[0].state.calendar.monthOrdinal).toBe(0);
      expect(r.snapshots[1].state.calendar.monthOrdinal).toBe(-1);
      expect(r.snapshots[2].state.calendar.monthOrdinal).toBe(-2);
    });

    it("validates positive multi-cycle ordinals", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 13, revision: 13 };
      const events: LegacyEventInput[] = [];
      for (let i = 0; i < 13; i++) {
        events.push(makeEvent(i + 1, "forward", i, i + 1));
      }
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;
      expect(r.finalMonthOrdinal).toBe(13);
      expect(r.snapshotCount).toBe(14);
    });
  });

  describe("missing campaign with events", () => {
    it("rejects events with no campaign", () => {
      const events: LegacyEventInput[] = [makeEvent(1, "forward", 0, 1)];
      const result = analyzeLegacyMigration([], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("no campaign");
    });
  });

  describe("multiple campaigns", () => {
    it("rejects more than one campaign", () => {
      const campaigns: LegacyCampaignInput[] = [
        { monthOrdinal: 0, revision: 0 },
        { monthOrdinal: 1, revision: 1 },
      ];
      const result = analyzeLegacyMigration(campaigns, []);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("2");
    });
  });

  describe("missing revision in chain", () => {
    it("rejects non-contiguous revisions (gap)", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 2, revision: 2 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        makeEvent(3, "forward", 1, 2),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("contiguous");
    });
  });

  describe("duplicate revision", () => {
    it("rejects duplicate revision numbers", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 1, revision: 2 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        makeEvent(1, "forward", 1, 2),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("Duplicate");
    });
  });

  describe("incorrect previous ordinal", () => {
    it("rejects event whose previousMonthOrdinal does not match prior state", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 2, revision: 2 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        { ...makeEvent(2, "forward", 5, 2), previousMonthOrdinal: 5 },
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("previousMonthOrdinal");
    });
  });

  describe("incorrect destination ordinal for direction", () => {
    it("rejects event where newMonthOrdinal is wrong for direction", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 2, revision: 1 };
      const events: LegacyEventInput[] = [
        {
          type: "month_changed",
          revision: 1,
          direction: "forward",
          previousMonthOrdinal: 0,
          newMonthOrdinal: 2,
          previousMonth: displayNameFromOrdinal(0),
          newMonth: displayNameFromOrdinal(2),
        },
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("newMonthOrdinal");
    });
  });

  describe("incorrect previous display month", () => {
    it("rejects event with wrong previousMonth display name", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 1, revision: 1 };
      const events: LegacyEventInput[] = [
        {
          type: "month_changed",
          revision: 1,
          direction: "forward",
          previousMonthOrdinal: 0,
          newMonthOrdinal: 1,
          previousMonth: "December",
          newMonth: displayNameFromOrdinal(1),
        },
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("previousMonth");
    });
  });

  describe("incorrect new display month", () => {
    it("rejects event with wrong newMonth display name", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 1, revision: 1 };
      const events: LegacyEventInput[] = [
        {
          type: "month_changed",
          revision: 1,
          direction: "forward",
          previousMonthOrdinal: 0,
          newMonthOrdinal: 1,
          previousMonth: displayNameFromOrdinal(0),
          newMonth: "March",
        },
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("newMonth");
    });
  });

  describe("campaign revision inconsistent with history", () => {
    it("rejects when campaign revision differs from event count", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 1, revision: 5 };
      const events: LegacyEventInput[] = [makeEvent(1, "forward", 0, 1)];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
    });
  });

  describe("final campaign month inconsistent with history", () => {
    it("rejects when campaign monthOrdinal does not match chain result", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 99, revision: 2 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        makeEvent(2, "forward", 1, 2),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("invalid");
      expect((result as { reason: string }).reason).toContain("monthOrdinal");
    });
  });

  describe("successful reconstruction details", () => {
    it("produces N + 1 snapshots for N events", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 5, revision: 5 };
      const events: LegacyEventInput[] = [];
      for (let i = 0; i < 5; i++) {
        events.push(makeEvent(i + 1, "forward", i, i + 1));
      }
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;
      expect(r.snapshots).toHaveLength(6);
      expect(r.snapshots[0].campaignRevision).toBe(0);
      expect(r.snapshots[5].campaignRevision).toBe(5);
    });

    it("normalized events use type month_changed, version 1, canonical data", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 2, revision: 2 };
      const events: LegacyEventInput[] = [
        makeEvent(1, "forward", 0, 1),
        makeEvent(2, "forward", 1, 2),
      ];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;

      for (const rev of r.revisions) {
        expect(rev.event.type).toBe("month_changed");
        expect(rev.event.version).toBe(1);
        expect(rev.commandType).toBe("legacy_month_change");
        expect(rev.event.data).toHaveProperty("direction");
        expect(rev.event.data).toHaveProperty("fromOrdinal");
        expect(rev.event.data).toHaveProperty("toOrdinal");
        expect(Object.keys(rev.event.data)).toHaveLength(3);
      }

      expect(r.revisions[0].event.data.direction).toBe("forward");
      expect(r.revisions[0].event.data.fromOrdinal).toBe(0);
      expect(r.revisions[0].event.data.toOrdinal).toBe(1);
    });

    it("snapshots contain correct state schema and ruleset", () => {
      const campaign: LegacyCampaignInput = { monthOrdinal: 1, revision: 1 };
      const events: LegacyEventInput[] = [makeEvent(1, "forward", 0, 1)];
      const result = analyzeLegacyMigration([campaign], events);
      expect(result.status).toBe("ready");
      const r = result as MigrationReady;

      for (const snap of r.snapshots) {
        expect(snap.state.schemaVersion).toBe(1);
        expect(snap.state.ruleset.id).toBe("seven_part_pact_draft4");
        expect(snap.state.ruleset.version).toBe(1);
      }
    });
  });
});
