import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { useState } from "react";

export default function NoCampaign() {
  const startNewCampaign = useMutation(api.campaign.startNewCampaign);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await startNewCampaign({});
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not create a new campaign. Please try again.",
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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          There is no active campaign. Create one to begin setup.
        </p>
        <button
          disabled={pending}
          onClick={handleStart}
          className="w-full bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Creating…" : "Start New Campaign"}
        </button>
        {error !== null && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </main>
  );
}
