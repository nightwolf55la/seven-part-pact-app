import { describe, it, expect } from "vitest";
import {
  mapEventToActivityEntry,
  describeActivityEntry,
} from "../shared/domain/activity";
import type { CampaignEvent, MonthOrdinal } from "../shared/domain";

const ord = (n: number) => n as MonthOrdinal;

describe("mapEventToActivityEntry", () => {
  it("maps month_changed v1 to month_changed entry", () => {
    const event: CampaignEvent = {
      type: "month_changed",
      version: 1,
      data: { direction: "forward", fromOrdinal: ord(0), toOrdinal: ord(1) },
    };
    const entry = mapEventToActivityEntry("evt_1", 5, event);
    expect(entry).toEqual({
      id: "evt_1",
      revision: 5,
      type: "month_changed",
      previousMonth: "April",
      newMonth: "May",
    });
  });

  it("maps month_changed backward correctly", () => {
    const event: CampaignEvent = {
      type: "month_changed",
      version: 1,
      data: { direction: "backward", fromOrdinal: ord(1), toOrdinal: ord(0) },
    };
    const entry = mapEventToActivityEntry("evt_2", 6, event);
    expect(entry.type).toBe("month_changed");
    if (entry.type === "month_changed") {
      expect(entry.previousMonth).toBe("May");
      expect(entry.newMonth).toBe("April");
    }
  });

  it("maps undo_applied v1 to undo_applied entry", () => {
    const event: CampaignEvent = {
      type: "undo_applied",
      version: 1,
      data: { fromRevision: 32, targetRevision: 31 },
    };
    const entry = mapEventToActivityEntry("evt_3", 33, event);
    expect(entry).toEqual({
      id: "evt_3",
      revision: 33,
      type: "undo_applied",
      fromRevision: 32,
      targetRevision: 31,
    });
  });

  it("maps redo_applied v1 to redo_applied entry", () => {
    const event: CampaignEvent = {
      type: "redo_applied",
      version: 1,
      data: { fromRevision: 31, targetRevision: 32 },
    };
    const entry = mapEventToActivityEntry("evt_4", 34, event);
    expect(entry).toEqual({
      id: "evt_4",
      revision: 34,
      type: "redo_applied",
      fromRevision: 31,
      targetRevision: 32,
    });
  });

  it("throws on unsupported month_changed version", () => {
    const event = {
      type: "month_changed" as const,
      version: 99 as unknown as 1,
      data: { direction: "forward" as const, fromOrdinal: ord(0), toOrdinal: ord(1) },
    };
    expect(() => mapEventToActivityEntry("evt_5", 7, event as CampaignEvent)).toThrow();
  });

  it("throws on unsupported undo_applied version", () => {
    const event = {
      type: "undo_applied" as const,
      version: 99 as unknown as 1,
      data: { fromRevision: 10, targetRevision: 9 },
    };
    expect(() => mapEventToActivityEntry("evt_6", 8, event as CampaignEvent)).toThrow();
  });

  it("throws on unsupported redo_applied version", () => {
    const event = {
      type: "redo_applied" as const,
      version: 99 as unknown as 1,
      data: { fromRevision: 9, targetRevision: 10 },
    };
    expect(() => mapEventToActivityEntry("evt_7", 9, event as CampaignEvent)).toThrow();
  });
});

describe("describeActivityEntry", () => {
  it("describes month_changed", () => {
    const entry = mapEventToActivityEntry("e1", 32, {
      type: "month_changed",
      version: 1,
      data: { direction: "forward", fromOrdinal: ord(0), toOrdinal: ord(1) },
    });
    expect(describeActivityEntry(entry)).toBe("Revision 32 — April → May");
  });

  it("describes undo_applied", () => {
    const entry = mapEventToActivityEntry("e2", 33, {
      type: "undo_applied",
      version: 1,
      data: { fromRevision: 32, targetRevision: 31 },
    });
    expect(describeActivityEntry(entry)).toBe("Revision 33 — Undo: revision 32 → 31");
  });

  it("describes redo_applied", () => {
    const entry = mapEventToActivityEntry("e3", 34, {
      type: "redo_applied",
      version: 1,
      data: { fromRevision: 31, targetRevision: 32 },
    });
    expect(describeActivityEntry(entry)).toBe("Revision 34 — Redo: revision 31 → 32");
  });
});
