import { useState } from "react";
import { PACT_SEAT_IDS, pactSeatDisplayName } from "../shared/domain/pact-seats";

export interface AddWizardDialogProps {
  readonly players: readonly { playerId: string; name: string }[];
  readonly pactSeats: Readonly<Record<string, { wizardId: string | null }>>;
  readonly pending: boolean;
  readonly error: string | null;
  readonly onCreate: (name: string, portrayedByPlayerId: string | null, seatId: string) => void;
  readonly onClose: () => void;
}

export default function AddWizardDialog({
  players,
  pactSeats,
  pending,
  error,
  onCreate,
  onClose,
}: AddWizardDialogProps) {
  const [name, setName] = useState("");
  const [portrayedBy, setPortrayedBy] = useState<string | null>(null);
  const [seatId, setSeatId] = useState<string>("");

  const availableSeats = PACT_SEAT_IDS.filter(
    (sid) => pactSeats[sid]?.wizardId === null || pactSeats[sid]?.wizardId === undefined,
  );

  const canSubmit = name.trim() !== "" && seatId !== "" && !pending;

  function handleSubmit() {
    if (!canSubmit) return;
    onCreate(name.trim(), portrayedBy, seatId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Add Wizard
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Wizard name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              placeholder="Wizard name"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) handleSubmit();
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Portrayed by
            </label>
            <select
              value={portrayedBy ?? ""}
              onChange={(e) => setPortrayedBy(e.target.value || null)}
              disabled={pending}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">No player</option>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Initial Pact seat
            </label>
            <select
              value={seatId}
              onChange={(e) => setSeatId(e.target.value)}
              disabled={pending}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Select seat...</option>
              {availableSeats.map((sid) => (
                <option key={sid} value={sid}>
                  {pactSeatDisplayName(sid)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={pending}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-sm font-medium bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg px-4 py-2 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {pending ? "Creating..." : "Add Wizard"}
          </button>
        </div>
      </div>
    </div>
  );
}
