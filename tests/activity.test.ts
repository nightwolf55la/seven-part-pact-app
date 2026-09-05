import { describe, it, expect } from "vitest";
import {
  mapEventToActivityEntry,
  describeActivityEntry,
} from "../shared/domain/activity";
import type { CampaignEvent, MonthOrdinal } from "../shared/domain";

const ord = (n: number) => n as MonthOrdinal;

describe("mapEventToActivityEntry", () => {
  it("maps historical month_changed to a display-only activity entry", () => {
    const event = {
      type: "month_changed" as const,
      version: 1 as const,
      data: {
        direction: "forward" as const,
        fromOrdinal: ord(0),
        toOrdinal: ord(1),
      },
    };

    const entry = mapEventToActivityEntry("evt_legacy", 5, event);

    expect(entry).toEqual({
      id: "evt_legacy",
      revision: 5,
      type: "campaign_configuration",
      description: "April → May",
    });
    expect(describeActivityEntry(entry)).toBe("Revision 5 — April → May");
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
  it("describes undo_applied", () => {
    const entry = mapEventToActivityEntry("e2", 33, {
      type: "undo_applied",
      version: 1,
      data: { fromRevision: 32, targetRevision: 31 },
    });
    expect(describeActivityEntry(entry)).toBe("Revision 33 \u2014 Undo: revision 32 \u2192 31");
  });

  it("describes redo_applied", () => {
    const entry = mapEventToActivityEntry("e3", 34, {
      type: "redo_applied",
      version: 1,
      data: { fromRevision: 31, targetRevision: 32 },
    });
    expect(describeActivityEntry(entry)).toBe("Revision 34 \u2014 Redo: revision 31 \u2192 32");
  });
});
