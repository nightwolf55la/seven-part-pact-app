import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  interpretBeginNextMonthResult,
  type QuietWorkspaceData,
  type QuietWarning,
} from "./meeting-quiet-view-model";

export interface BeginNextMonthActionProps {
  expectedMonthOrdinal: number;
  formatWarning: (warning: QuietWarning) => string;
  data: QuietWorkspaceData;
}

type BeginNextMonthResult =
  | { revision: number | null; warnings?: QuietWarning[] };

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function isStaleContextError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("expected month") ||
    lower.includes("expected phase") ||
    lower.includes("not quiet") ||
    lower.includes("stale")
  );
}

export default function BeginNextMonthAction({
  expectedMonthOrdinal,
  formatWarning,
}: BeginNextMonthActionProps) {
  const beginNextMonth = useMutation(api.m3Commands.beginNextMonth);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<QuietWarning[] | null>(null);
  const [commandId, setCommandId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (ackKeys?: string[]) => {
      let cmdId = commandId;
      if (cmdId === null) {
        cmdId = generateCommandId();
        setCommandId(cmdId);
      }

      setPending(true);
      setError(null);

      try {
        const result = (await beginNextMonth({
          commandId: cmdId,
          expectedMonthOrdinal,
          acknowledgedWarningKeys: ackKeys,
        })) as BeginNextMonthResult;

        const outcome = interpretBeginNextMonthResult(result);
        if (outcome === "warnings" && result.warnings) {
          setWarnings(result.warnings);
        } else {
          setWarnings(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error beginning next month.";
        if (isStaleContextError(message)) {
          setError(
            "The campaign changed before the month rollover completed. Review the current Quiet state and try again.",
          );
        } else {
          setError(message);
        }
        setWarnings(null);
        setCommandId(null);
      } finally {
        setPending(false);
      }
    },
    [beginNextMonth, commandId, expectedMonthOrdinal],
  );

  const handleInitialClick = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  const handleConfirmWarnings = useCallback(() => {
    if (warnings === null) return;
    const ackKeys = warnings.map((w) => w.key);
    void handleSubmit(ackKeys);
  }, [warnings, handleSubmit]);

  if (warnings !== null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
            Confirmation required
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            Some resources from this month are still unresolved. Proceeding will
            not silently rewrite them. The prior state is preserved in the audit
            history. Proceed only when ready.
          </p>
          <ul className="flex flex-col gap-1">
            {warnings.map((w) => (
              <li key={w.key} className="text-xs text-amber-700 dark:text-amber-400">
                {formatWarning(w)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirmWarnings}
            disabled={pending}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {pending ? "Proceeding…" : "Proceed anyway"}
          </button>
          <button
            onClick={() => {
              setWarnings(null);
              setCommandId(null);
            }}
            disabled={pending}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleInitialClick}
        disabled={pending}
        className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {pending ? "Beginning…" : "Begin Next Month"}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
