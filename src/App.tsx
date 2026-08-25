import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { displayNameFromOrdinal, describeActivityEntry } from "../shared/domain";
import { useEffect, useRef, useState } from "react";
import type { ActivityEntry } from "../shared/domain";

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

export default function App() {
  const campaign = useQuery(api.campaign.getCampaign, {});
  const undoRedoState = useQuery(api.campaign.getUndoRedoState, {});
  const events = useQuery(api.campaign.getRecentEvents, { count: 20 });
  const moveMonth = useMutation(api.campaign.moveMonth);
  const undoMutation = useMutation(api.campaign.undo);
  const redoMutation = useMutation(api.campaign.redo);
  const ensureCampaign = useMutation(api.campaign.ensureCampaign);
  const initAttempted = useRef(false);

  const [pendingAction, setPendingAction] = useState<null | "undo" | "redo" | "move">(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (campaign === null && !initAttempted.current) {
      initAttempted.current = true;
      ensureCampaign({}).catch(() => {
        initAttempted.current = false;
      });
    }
  }, [campaign, ensureCampaign]);

  const isLoading = campaign === undefined || campaign === null;
  const monthName = campaign
    ? displayNameFromOrdinal(campaign.monthOrdinal)
    : "—";
  const revision = campaign?.revision ?? 0;

  const historyStateIsCurrent =
    campaign !== undefined &&
    campaign !== null &&
    undoRedoState !== undefined &&
    undoRedoState !== null &&
    campaign.revision === undoRedoState.campaignRevision;

  const navigationPending = pendingAction !== null;

  const canUndo =
    historyStateIsCurrent &&
    undoRedoState !== null &&
    undoRedoState !== undefined &&
    undoRedoState.canUndo &&
    !navigationPending;

  const canRedo =
    historyStateIsCurrent &&
    undoRedoState !== null &&
    undoRedoState !== undefined &&
    undoRedoState.canRedo &&
    !navigationPending;

  const monthButtonsDisabled = isLoading || navigationPending;

  async function handleUndo() {
    if (!historyStateIsCurrent || !undoRedoState || pendingAction) return;
    const commandId = generateCommandId();
    const expectedRevision = undoRedoState.campaignRevision;
    setPendingAction("undo");
    setActionError(null);
    try {
      await undoMutation({ commandId, expectedRevision });
    } catch {
      setActionError("That action could not be applied. The campaign may have changed; try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRedo() {
    if (!historyStateIsCurrent || !undoRedoState || pendingAction) return;
    const commandId = generateCommandId();
    const expectedRevision = undoRedoState.campaignRevision;
    setPendingAction("redo");
    setActionError(null);
    try {
      await redoMutation({ commandId, expectedRevision });
    } catch {
      setActionError("That action could not be applied. The campaign may have changed; try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleMove(direction: "forward" | "backward") {
    if (monthButtonsDisabled) return;
    setPendingAction("move");
    setActionError(null);
    try {
      await moveMonth({ direction, commandId: generateCommandId() });
    } catch {
      setActionError("That action could not be applied. The campaign may have changed; try again.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100">
          Seven-Part Pact
        </h1>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current Month
          </p>
          <p className="text-5xl font-bold text-slate-800 dark:text-slate-100">
            {monthName}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Revision {revision}
          </p>
        </section>

        <section className="flex gap-3">
          <button
            disabled={monthButtonsDisabled}
            onClick={() => handleMove("backward")}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Previous Month
          </button>
          <button
            disabled={monthButtonsDisabled}
            onClick={() => handleMove("forward")}
            className="flex-1 bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Next Month →
          </button>
        </section>

        <section className="flex gap-3">
          <button
            disabled={!canUndo}
            onClick={handleUndo}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pendingAction === "undo" ? "Undoing…" : "Undo"}
          </button>
          <button
            disabled={!canRedo}
            onClick={handleRedo}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pendingAction === "redo" ? "Redoing…" : "Redo"}
          </button>
        </section>

        {actionError !== null && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {actionError}
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Activity History
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {events === undefined ? (
              <div className="p-4 text-sm text-slate-400 dark:text-slate-500">
                Loading history…
              </div>
            ) : events.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 dark:text-slate-500">
                No events yet. Use the buttons above to change the month.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {events.map((event: ActivityEntry) => (
                  <li
                    key={event.id}
                    className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    {describeActivityEntry(event)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
