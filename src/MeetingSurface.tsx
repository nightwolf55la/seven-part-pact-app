import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type { LunarPhase } from "../shared/domain/campaign-state";
import {
  reasonRequired,
  normalizeAttendanceDraft,
  type MeetingWorkspaceData,
  type MeetingAttendanceRow,
} from "./meeting-quiet-view-model";

export interface MeetingSurfaceProps {
  phase: LunarPhase;
  monthOrdinal: number;
}

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function isStaleError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("expected month") ||
    lower.includes("expected phase") ||
    lower.includes("not meeting") ||
    lower.includes("attendance")
  );
}

function staleMessage(): string {
  return "The Meeting state changed before this edit completed. Review the current attendance and try again.";
}

export default function MeetingSurface({ phase: _phase, monthOrdinal: _monthOrdinal }: MeetingSurfaceProps) {
  const meetingData = useQuery(api.m3Queries.getMeetingWorkspace, {});
  const [drafts, setDrafts] = useState<Record<string, { attended: boolean; reason: string }>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const data = meetingData as MeetingWorkspaceData | null | undefined;

  if (data === undefined) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Loading Meeting workspace…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Meeting state is updating…</p>
      </section>
    );
  }

  const monthOrdinal = data.monthOrdinal;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Current Phase
        </h3>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Meeting</p>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Review Wizardmoot attendance. Actual attendance may differ from expected
          with an exception reason. Completing the Wizardmoot resolves all pending
          Meeting Time as spent, then the campaign enters Quiet.
        </p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {actionError}
        </p>
      )}

      {data.attendance.map((row) => {
        const draft = drafts[row.wizardId] ?? {
          attended: row.actualAttended,
          reason: row.exceptionReason ?? "",
        };
        const needsReason = draft.attended !== row.expectedAttended;
        return (
          <AttendanceCard
            key={row.wizardId}
            row={row}
            draft={draft}
            needsReason={needsReason}
            monthOrdinal={monthOrdinal}
            onDraftChange={(d) =>
              setDrafts((prev) => ({ ...prev, [row.wizardId]: d }))
            }
            actionPending={actionPending}
            setActionPending={setActionPending}
            setError={setActionError}
            error={actionError}
          />
        );
      })}

      <CompleteMeetingAction monthOrdinal={monthOrdinal} />
    </section>
  );
}

interface AttendanceCardProps {
  row: MeetingAttendanceRow;
  draft: { attended: boolean; reason: string };
  needsReason: boolean;
  monthOrdinal: number;
  onDraftChange: (d: { attended: boolean; reason: string }) => void;
  actionPending: boolean;
  setActionPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

function AttendanceCard({
  row,
  draft,
  needsReason,
  monthOrdinal,
  onDraftChange,
  actionPending,
  setActionPending,
  setError,
  error,
}: AttendanceCardProps) {
  const adjustAttendance = useMutation(api.m3Commands.adjustWizardmootAttendance);

  const handleSave = useCallback(async () => {
    const result = normalizeAttendanceDraft(
      row.expectedAttended,
      draft.attended,
      draft.reason,
    );
    if (!result.valid) {
      setError("An exception reason is required when actual attendance differs from expected.");
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      await adjustAttendance({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        wizardId: row.wizardId,
        attended: draft.attended,
        exceptionReason: result.submissionReason,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save attendance.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [adjustAttendance, monthOrdinal, row.wizardId, row.expectedAttended, draft, setActionPending, setError]);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {row.wizardName}
        </span>
        <span className="text-xs text-slate-400">
          Meeting Time: {row.meetingAllocationCount} ({row.pendingMeetingAllocationCount} pending)
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Expected: <span className="font-medium">{row.expectedAttended ? "Attending" : "Not attending"}</span></span>
        <span>Actual: <span className="font-medium">{row.actualAttended ? "Attending" : "Not attending"}</span></span>
        {row.exceptionReason && (
          <span>Reason: {row.exceptionReason}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Actual attendance:</label>
          <select
            value={draft.attended ? "true" : "false"}
            onChange={(e) =>
              onDraftChange({ ...draft, attended: e.target.value === "true" })
            }
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
          >
            <option value="true">Attending</option>
            <option value="false">Not attending</option>
          </select>
        </div>

        {needsReason && (
          <input
            type="text"
            value={draft.reason}
            onChange={(e) => onDraftChange({ ...draft, reason: e.target.value })}
            placeholder="Exception reason (required)"
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
          />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={actionPending}
            className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {actionPending ? "Saving…" : "Save Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteMeetingAction({ monthOrdinal }: { monthOrdinal: number }) {
  const completeMeeting = useMutation(api.m3Commands.completeMeeting);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await completeMeeting({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete Meeting.";
      const lower = message.toLowerCase();
      if (lower.includes("expected month") || lower.includes("not meeting")) {
        setError("The Meeting state changed before this action completed. Review the current state and try again.");
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }, [completeMeeting, monthOrdinal]);

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-2">
      <button
        onClick={() => void handleComplete()}
        disabled={pending}
        className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {pending ? "Completing…" : "Complete Meeting"}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
