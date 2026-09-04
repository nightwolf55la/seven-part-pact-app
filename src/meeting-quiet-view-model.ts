import type { TimeDestination } from "../shared/domain/time-model";
import type { EngagementTarget } from "../shared/domain/engagement";
import {
  destinationLabel,
  engagementTargetLabel,
  type WorkspaceDataLike,
  type ModeledWizard,
} from "./planning-view-model";

export { destinationLabel, engagementTargetLabel };

// --- Meeting read-model types ---

export interface MeetingAttendanceRow {
  readonly wizardId: string;
  readonly wizardName: string;
  readonly expectedAttended: boolean;
  readonly actualAttended: boolean;
  readonly exceptionReason: string | null;
  readonly meetingAllocationCount: number;
  readonly pendingMeetingAllocationCount: number;
}

export interface MeetingWorkspaceData {
  readonly monthOrdinal: number;
  readonly attendance: readonly MeetingAttendanceRow[];
}

// --- Quiet read-model types ---

export interface QuietAllocation {
  readonly allocationId: string;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
  readonly resolution: "pending" | "spent" | "wasted";
}

export interface QuietTimeParticipant {
  readonly wizardId: string;
  readonly wizardName: string;
  readonly allocations: readonly QuietAllocation[];
}

export interface QuietEngagement {
  readonly engagementId: string;
  readonly actingWizardId: string;
  readonly target: EngagementTarget | null;
  readonly resolution: "pending" | "resolved";
  readonly linkedTimeAllocationId: string | null;
}

export interface QuietAttendanceRow {
  readonly wizardId: string;
  readonly wizardName: string;
  readonly attended: boolean;
  readonly exceptionReason: string | null;
}

export interface QuietWorkspaceData extends WorkspaceDataLike {
  readonly monthOrdinal: number;
  readonly timeParticipants: readonly QuietTimeParticipant[];
  readonly engagements: readonly QuietEngagement[];
  readonly wizardmootAttendance: readonly QuietAttendanceRow[];
  readonly modeledWizards: readonly ModeledWizard[];
}

// --- Warning type ---

export interface QuietWarning {
  readonly key: string;
  readonly kind: string;
  readonly resourceId: string;
}

// --- A. Meeting attendance display ---

export function reasonRequired(row: MeetingAttendanceRow): boolean {
  return row.actualAttended !== row.expectedAttended;
}

// --- B. Attendance draft normalization ---

export interface AttendanceDraftResult {
  readonly valid: boolean;
  readonly submissionReason: string | null;
}

export function normalizeAttendanceDraft(
  expectedAttended: boolean,
  actualAttended: boolean,
  draftReason: string,
): AttendanceDraftResult {
  if (actualAttended === expectedAttended) {
    return { valid: true, submissionReason: null };
  }
  if (draftReason.trim().length === 0) {
    return { valid: false, submissionReason: null };
  }
  return { valid: true, submissionReason: draftReason };
}

// --- C. Quiet summary ---

export interface QuietSummary {
  readonly pendingTimeCount: number;
  readonly unresolvedEngagementCount: number;
}

export function quietSummary(data: QuietWorkspaceData): QuietSummary {
  let pendingTimeCount = 0;
  for (const tp of data.timeParticipants) {
    for (const alloc of tp.allocations) {
      if (alloc.resolution === "pending") {
        pendingTimeCount++;
      }
    }
  }
  const unresolvedEngagementCount = data.engagements.filter(
    (e) => e.resolution === "pending",
  ).length;
  return { pendingTimeCount, unresolvedEngagementCount };
}

// --- D. Quiet warning formatting ---

function wizardNameById(data: QuietWorkspaceData, wizardId: string): string | null {
  const w = data.modeledWizards.find((mw) => mw.wizardId === wizardId);
  return w ? w.name : null;
}

export function formatQuietWarning(
  warning: QuietWarning,
  data: QuietWorkspaceData,
): string {
  switch (warning.kind) {
    case "unresolved_time": {
      for (const tp of data.timeParticipants) {
        const alloc = tp.allocations.find((a) => a.allocationId === warning.resourceId);
        if (alloc) {
          const destLabel = destinationLabel(alloc.destination, data);
          return `${tp.wizardName} still has unresolved Time: ${destLabel}.`;
        }
      }
      break;
    }
    case "unresolved_engagement": {
      const eng = data.engagements.find((e) => e.engagementId === warning.resourceId);
      if (eng) {
        const name = wizardNameById(data, eng.actingWizardId);
        const label = name ?? eng.actingWizardId;
        return `${label}'s Engagement is still unresolved.`;
      }
      break;
    }
  }
  return `${warning.kind}: ${warning.resourceId}`;
}

// --- E. Begin Next Month result interpretation ---

export type BeginNextMonthOutcome = "applied" | "warnings";

export function interpretBeginNextMonthResult(
  result: { revision: number | null; warnings?: QuietWarning[] },
): BeginNextMonthOutcome {
  if (result.revision !== null) return "applied";
  return "warnings";
}
