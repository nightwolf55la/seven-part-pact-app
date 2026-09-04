import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { useState } from "react";

export default function DeletionInProgress({
  campaignId,
  phase,
}: {
  campaignId: string;
  phase: string;
}) {
  const resumeDeletion = useMutation(api.campaignDeletion.resumeCampaignDeletion);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResume() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await resumeDeletion({});
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not resume cleanup. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6 items-center text-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Seven-Part Pact
        </h1>
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Campaign Deletion In Progress
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The campaign is being permanently deleted. This cannot be undone.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Current phase: {phase}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Cleanup is resumable and the browser does not need to stay open.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Campaign ID: {campaignId}
          </p>
          <button
            disabled={pending}
            onClick={handleResume}
            className="w-full bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "Resuming…" : "Resume Cleanup"}
          </button>
          {error !== null && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
