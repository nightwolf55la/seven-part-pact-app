import { buildTableWizardsRows } from "./table-wizards-view-model";
import type { PlayerRef, WizardRef, SeatRef } from "./table-wizards-view-model";

const STATUS_COLORS: Record<string, string> = {
  Present: "text-green-700 dark:text-green-400",
  Silent: "text-amber-700 dark:text-amber-400",
  Absent: "text-slate-500 dark:text-slate-400",
  "Not configured": "text-slate-400 dark:text-slate-500",
};

export default function TableWizards({
  pactSeats,
  players,
  wizards,
}: {
  pactSeats: Readonly<Record<string, SeatRef>>;
  players: readonly PlayerRef[];
  wizards: readonly WizardRef[];
}) {
  const rows = buildTableWizardsRows(pactSeats, players, wizards);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Table / Wizards
      </h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.seatId}
            className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {row.seatName}
              </span>
              <span className={`text-xs font-medium ${STATUS_COLORS[row.statusLabel] ?? "text-slate-500"}`}>
                {row.statusLabel}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
              {row.wizardName !== null ? (
                <p>Wizard: <span className="font-medium text-slate-600 dark:text-slate-300">{row.wizardName}</span></p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500">Wizard: —</p>
              )}
              {row.portrayedByPlayerName !== null ? (
                <p>Portrayed by: <span className="font-medium text-slate-600 dark:text-slate-300">{row.portrayedByPlayerName}</span></p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500">Portrayed by: —</p>
              )}
              {row.watcherPlayerName !== null ? (
                <p>Watcher: <span className="font-medium text-slate-600 dark:text-slate-300">{row.watcherPlayerName}</span></p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500">Watcher: —</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
