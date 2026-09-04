export default function CorruptCampaign({ reason }: { reason: string }) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6 items-center text-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Seven-Part Pact
        </h1>
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm p-6 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
            Campaign State Inconsistent
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The application found an inconsistent campaign persistence state.
            Normal gameplay, setup, deletion, and repair are not available.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-left break-words">
            {reason}
          </p>
        </div>
      </div>
    </main>
  );
}
