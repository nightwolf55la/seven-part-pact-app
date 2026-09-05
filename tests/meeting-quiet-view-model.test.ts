import { describe, it, expect } from "vitest";
import {
  reasonRequired,
  normalizeAttendanceDraft,
  quietSummary,
  formatQuietWarning,
  interpretBeginNextMonthResult,
  type MeetingAttendanceRow,
  type QuietWorkspaceData,
  type QuietWarning,
} from "../src/meeting-quiet-view-model";

function makeRow(
  wizardId: string,
  wizardName: string,
  expectedAttended: boolean,
  actualAttended: boolean,
  exceptionReason: string | null,
  meetingAllocationCount = 0,
  pendingMeetingAllocationCount = 0,
): MeetingAttendanceRow {
  return {
    wizardId,
    wizardName,
    expectedAttended,
    actualAttended,
    exceptionReason,
    meetingAllocationCount,
    pendingMeetingAllocationCount,
  };
}

const baseQuiet: QuietWorkspaceData = {
  monthOrdinal: 5,
  timeParticipants: [
    {
      wizardId: "wiz_1",
      wizardName: "Merlin",
      allocations: [
        { allocationId: "alc_a", destination: { kind: "domain" }, note: null, resolution: "pending" },
        { allocationId: "alc_b", destination: { kind: "meeting" }, note: null, resolution: "spent" },
      ],
    },
    {
      wizardId: "wiz_2",
      wizardName: "Morgana",
      allocations: [
        { allocationId: "alc_c", destination: { kind: "familiar" }, note: "scout", resolution: "pending" },
      ],
    },
  ],
  engagements: [
    { engagementId: "eng_1", actingWizardId: "wiz_1", target: { kind: "self" }, resolution: "pending", linkedTimeAllocationId: null },
    { engagementId: "eng_2", actingWizardId: "wiz_2", target: null, resolution: "resolved", linkedTimeAllocationId: "alc_c" },
  ],
  wizardmootAttendance: [
    { wizardId: "wiz_1", wizardName: "Merlin", attended: true, exceptionReason: null },
    { wizardId: "wiz_2", wizardName: "Morgana", attended: false, exceptionReason: "Sick" },
  ],
  modeledWizards: [
    { wizardId: "wiz_1", name: "Merlin" },
    { wizardId: "wiz_2", name: "Morgana" },
  ],
};

describe("reasonRequired", () => {
  it("returns false when actual equals expected", () => {
    expect(reasonRequired(makeRow("w1", "M", true, true, null))).toBe(false);
    expect(reasonRequired(makeRow("w1", "M", false, false, null))).toBe(false);
  });

  it("returns true when actual differs from expected", () => {
    expect(reasonRequired(makeRow("w1", "M", true, false, null))).toBe(true);
    expect(reasonRequired(makeRow("w1", "M", false, true, null))).toBe(true);
  });
});

describe("normalizeAttendanceDraft", () => {
  it("returns null reason when actual equals expected", () => {
    const r = normalizeAttendanceDraft(true, true, "some old reason");
    expect(r.valid).toBe(true);
    expect(r.submissionReason).toBeNull();
  });

  it("requires nonblank reason when actual differs", () => {
    const r = normalizeAttendanceDraft(true, false, "   ");
    expect(r.valid).toBe(false);
  });

  it("preserves exact nonblank reason when actual differs", () => {
    const r = normalizeAttendanceDraft(true, false, "  arrived late  ");
    expect(r.valid).toBe(true);
    expect(r.submissionReason).toBe("  arrived late  ");
  });

  it("preserves exact reason even with whitespace", () => {
    const r = normalizeAttendanceDraft(false, true, "exception");
    expect(r.valid).toBe(true);
    expect(r.submissionReason).toBe("exception");
  });
});

describe("quietSummary", () => {
  it("counts pending Time and unresolved Engagements", () => {
    const s = quietSummary(baseQuiet);
    expect(s.pendingTimeCount).toBe(2);
    expect(s.unresolvedEngagementCount).toBe(1);
  });
});

describe("formatQuietWarning", () => {
  it("resolves unresolved_time to wizard name and destination", () => {
    const w: QuietWarning = { key: "unresolved_time:alc_a", kind: "unresolved_time", resourceId: "alc_a" };
    expect(formatQuietWarning(w, baseQuiet)).toBe("Merlin still has unresolved Time: Domain.");
  });

  it("resolves unresolved_engagement to acting wizard name", () => {
    const w: QuietWarning = { key: "unresolved_engagement:eng_1", kind: "unresolved_engagement", resourceId: "eng_1" };
    expect(formatQuietWarning(w, baseQuiet)).toBe("Merlin's Engagement is still unresolved.");
  });

  it("falls back to kind/resourceId when resource cannot be resolved", () => {
    const w: QuietWarning = { key: "unresolved_time:alc_unknown", kind: "unresolved_time", resourceId: "alc_unknown" };
    expect(formatQuietWarning(w, baseQuiet)).toBe("unresolved_time: alc_unknown");
  });
});

describe("interpretBeginNextMonthResult", () => {
  it("returns applied when revision is non-null", () => {
    expect(interpretBeginNextMonthResult({ revision: 42 })).toBe("applied");
  });

  it("returns warnings when revision is null and warnings exist", () => {
    expect(interpretBeginNextMonthResult({ revision: null, warnings: [] })).toBe("warnings");
  });

  it("returns warnings when revision is null and warnings array is non-empty", () => {
    const w = [{ key: "unresolved_time:alc_a", kind: "unresolved_time", resourceId: "alc_a" }];
    expect(interpretBeginNextMonthResult({ revision: null, warnings: w })).toBe("warnings");
  });
});
