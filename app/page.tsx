"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { monthNameFromOrdinal } from "../convex/monthLogic";

export default function Home() {
  const campaign = useQuery(api.campaign.getCampaign, {});
  const events = useQuery(api.campaign.getRecentEvents, { count: 20 });
  const moveMonth = useMutation(api.campaign.moveMonth);

  const isLoading = campaign === undefined;
  const monthName = campaign
    ? monthNameFromOrdinal(campaign.monthOrdinal)
    : "—";
  const revision = campaign?.revision ?? 0;

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
            disabled={isLoading}
            onClick={() => moveMonth({ direction: "backward" })}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Previous Month
          </button>
          <button
            disabled={isLoading}
            onClick={() => moveMonth({ direction: "forward" })}
            className="flex-1 bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Next Month →
          </button>
        </section>

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
                {events.map((event) => (
                  <li
                    key={event._id}
                    className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    Revision {event.revision} — {event.previousMonth} →{" "}
                    {event.newMonth}
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
