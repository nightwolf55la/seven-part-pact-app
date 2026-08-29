import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { useState } from "react";
import { AGE_DEFINITIONS } from "../shared/domain/ages";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function generatePlayerId(): string {
  return `plr_${crypto.randomUUID()}`;
}

function generateWizardId(): string {
  return `wiz_${crypto.randomUUID()}`;
}

const SEAT_DISPLAY_NAMES: Record<string, string> = {
  necromancer: "Necromancer",
  hierophant: "Hierophant",
  warlock: "Warlock",
  mariner: "Mariner",
  faustian: "Faustian",
  sage: "Sage",
  sorcerer: "Sorcerer",
};

const STATUS_OPTIONS = [
  { value: "", label: "Not configured" },
  { value: "present", label: "Present" },
  { value: "silent", label: "Silent" },
  { value: "absent", label: "Absent" },
];

export default function CampaignSetup() {
  const setup = useQuery(api.m3Queries.getCampaignSetup, {});
  const addPlayer = useMutation(api.m3Commands.addPlayer);
  const renamePlayer = useMutation(api.m3Commands.renamePlayer);
  const removePlayer = useMutation(api.m3Commands.removePlayer);
  const setCampaignAge = useMutation(api.m3Commands.setCampaignAge);
  const setFacilitator = useMutation(api.m3Commands.setFacilitator);
  const createWizard = useMutation(api.m3Commands.createWizard);
  const renameWizard = useMutation(api.m3Commands.renameWizard);
  const setWizardPortrayal = useMutation(api.m3Commands.setWizardPortrayal);
  const setPactSeatWizard = useMutation(api.m3Commands.setPactSeatWizard);
  const setPactSeatStatus = useMutation(api.m3Commands.setPactSeatStatus);
  const setWatcher = useMutation(api.m3Commands.setWatcher);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (setup === undefined) {
    return <div className="p-4 text-sm text-slate-400">Loading setup...</div>;
  }
  if (setup === null) {
    return <div className="p-4 text-sm text-slate-400">No campaign yet. Create one first.</div>;
  }

  async function act(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "Action failed");
    } finally {
      setPending(false);
    }
  }

  const { configuration, players, wizards, pactSeats } = setup;

  // Compute which wizards are not currently assigned to any seat
  const assignedWizardIds = new Set(
    PACT_SEAT_IDS
      .map((sid) => pactSeats[sid]?.wizardId)
      .filter((id): id is string => id !== null && id !== undefined),
  );
  const unassignedWizards = wizards.filter((w) => !assignedWizardIds.has(w.wizardId));

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Age Configuration */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Age
        </h3>
        <select
          value={configuration.ageId ?? ""}
          disabled={pending}
          onChange={(e) => {
            const val = e.target.value || null;
            act(() => setCampaignAge({ commandId: generateCommandId(), ageId: val }));
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
        >
          <option value="">Not configured</option>
          {AGE_DEFINITIONS.map((age) => (
            <option key={age.id} value={age.id}>
              {age.displayName}
            </option>
          ))}
        </select>
      </section>

      {/* Facilitator */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Facilitator
        </h3>
        <select
          value={configuration.facilitatorPlayerId ?? ""}
          disabled={pending || players.length === 0}
          onChange={(e) => {
            const val = e.target.value || null;
            act(() => setFacilitator({ commandId: generateCommandId(), playerId: val }));
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
        >
          <option value="">None</option>
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.name}
            </option>
          ))}
        </select>
      </section>

      {/* Players */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Players
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="New player name"
            disabled={pending}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPlayerName.trim()) {
                act(() =>
                  addPlayer({
                    commandId: generateCommandId(),
                    playerId: generatePlayerId(),
                    name: newPlayerName.trim(),
                  }),
                );
                setNewPlayerName("");
              }
            }}
          />
          <button
            disabled={pending || !newPlayerName.trim()}
            onClick={() => {
              act(() =>
                addPlayer({
                  commandId: generateCommandId(),
                  playerId: generatePlayerId(),
                  name: newPlayerName.trim(),
                }),
              );
              setNewPlayerName("");
            }}
            className="bg-slate-800 dark:bg-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Add
          </button>
        </div>
        {players.length === 0 ? (
          <p className="text-xs text-slate-400">No players yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {players.map((p) => (
              <PlayerRow
                key={p.playerId}
                player={p}
                disabled={pending}
                onRename={(newName) =>
                  act(() =>
                    renamePlayer({
                      commandId: generateCommandId(),
                      playerId: p.playerId,
                      newName,
                    }),
                  )
                }
                onRemove={() =>
                  act(() =>
                    removePlayer({
                      commandId: generateCommandId(),
                      playerId: p.playerId,
                    }),
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* Pact Seats */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Pact Seats
        </h3>
        <div className="flex flex-col gap-4">
          {PACT_SEAT_IDS.map((seatId) => {
            const seat = pactSeats[seatId] ?? { status: null, wizardId: null, watcherPlayerId: null };
            const currentWizard = seat.wizardId
              ? wizards.find((w) => w.wizardId === seat.wizardId)
              : null;
            return (
              <PactSeatRow
                key={seatId}
                seatId={seatId}
                seat={seat}
                currentWizard={currentWizard ?? null}
                players={players}
                unassignedWizards={unassignedWizards}
                disabled={pending}
                onCreateWizard={(name, portrayedBy) =>
                  act(() =>
                    createWizard({
                      commandId: generateCommandId(),
                      wizardId: generateWizardId(),
                      name,
                      portrayedByPlayerId: portrayedBy,
                      seatId,
                    }),
                  )
                }
                onRenameWizard={(wizardId, newName) =>
                  act(() =>
                    renameWizard({
                      commandId: generateCommandId(),
                      wizardId,
                      newName,
                    }),
                  )
                }
                onSetPortrayal={(wizardId, playerId) =>
                  act(() =>
                    setWizardPortrayal({
                      commandId: generateCommandId(),
                      wizardId,
                      playerId,
                    }),
                  )
                }
                onUnassignWizard={() =>
                  act(() =>
                    setPactSeatWizard({
                      commandId: generateCommandId(),
                      seatId,
                      wizardId: null,
                    }),
                  )
                }
                onAssignWizard={(wizardId) =>
                  act(() =>
                    setPactSeatWizard({
                      commandId: generateCommandId(),
                      seatId,
                      wizardId,
                    }),
                  )
                }
                onSetStatus={(status) =>
                  act(() =>
                    setPactSeatStatus({
                      commandId: generateCommandId(),
                      seatId,
                      status: (status || null) as "present" | "silent" | "absent" | null,
                    }),
                  )
                }
                onSetWatcher={(playerId) =>
                  act(() =>
                    setWatcher({
                      commandId: generateCommandId(),
                      seatId,
                      playerId,
                    }),
                  )
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlayerRow({
  player,
  disabled,
  onRename,
  onRemove,
}: {
  player: { playerId: string; name: string };
  disabled: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(player.name);

  return (
    <li className="py-2 flex items-center justify-between gap-2">
      {editing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            if (editName.trim() && editName.trim() !== player.name) {
              onRename(editName.trim());
            }
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (editName.trim() && editName.trim() !== player.name) {
                onRename(editName.trim());
              }
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm"
        />
      ) : (
        <span
          className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
          onClick={() => { setEditName(player.name); setEditing(true); }}
        >
          {player.name}
        </span>
      )}
      <button
        disabled={disabled}
        onClick={onRemove}
        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50 cursor-pointer"
      >
        Remove
      </button>
    </li>
  );
}

function PactSeatRow({
  seatId,
  seat,
  currentWizard,
  players,
  unassignedWizards,
  disabled,
  onCreateWizard,
  onRenameWizard,
  onSetPortrayal,
  onUnassignWizard,
  onAssignWizard,
  onSetStatus,
  onSetWatcher,
}: {
  seatId: string;
  seat: { status: string | null; wizardId: string | null; watcherPlayerId: string | null };
  currentWizard: { wizardId: string; name: string; portrayedByPlayerId: string | null } | null;
  players: { playerId: string; name: string }[];
  unassignedWizards: { wizardId: string; name: string; portrayedByPlayerId: string | null }[];
  disabled: boolean;
  onCreateWizard: (name: string, portrayedBy: string | null) => void;
  onRenameWizard: (wizardId: string, name: string) => void;
  onSetPortrayal: (wizardId: string, playerId: string | null) => void;
  onUnassignWizard: () => void;
  onAssignWizard: (wizardId: string) => void;
  onSetStatus: (status: string | null) => void;
  onSetWatcher: (playerId: string | null) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editWizName, setEditWizName] = useState("");
  const [newWizName, setNewWizName] = useState("");
  const [newWizPlayer, setNewWizPlayer] = useState<string | null>(null);

  const hasWizard = seat.wizardId !== null;

  // Status: Present/Silent require a wizard; Absent/null are always available
  const statusOptions = STATUS_OPTIONS.filter((opt) => {
    if (opt.value === "present" || opt.value === "silent") return hasWizard;
    return true;
  });

  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {SEAT_DISPLAY_NAMES[seatId] ?? seatId}
        </h4>
        <select
          value={seat.status ?? ""}
          disabled={disabled}
          onChange={(e) => onSetStatus(e.target.value || null)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Current Wizard assigned to this seat */}
      {currentWizard ? (
        <div className="flex flex-col gap-1 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Wizard:</span>
            {editingName ? (
              <input
                type="text"
                value={editWizName}
                onChange={(e) => setEditWizName(e.target.value)}
                onBlur={() => {
                  if (editWizName.trim() && editWizName.trim() !== currentWizard.name) {
                    onRenameWizard(currentWizard.wizardId, editWizName.trim());
                  }
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editWizName.trim() && editWizName.trim() !== currentWizard.name) {
                      onRenameWizard(currentWizard.wizardId, editWizName.trim());
                    }
                    setEditingName(false);
                  }
                  if (e.key === "Escape") setEditingName(false);
                }}
                autoFocus
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"
              />
            ) : (
              <span
                className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:underline"
                onClick={() => { setEditWizName(currentWizard.name); setEditingName(true); }}
              >
                {currentWizard.name}
              </span>
            )}
            <button
              disabled={disabled}
              onClick={onUnassignWizard}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              Unassign
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Portrayed by:</span>
            <select
              value={currentWizard.portrayedByPlayerId ?? ""}
              disabled={disabled}
              onChange={(e) => onSetPortrayal(currentWizard.wizardId, e.target.value || null)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
            >
              <option value="">None</option>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : creating ? (
        <div className="flex flex-col gap-2 pl-2 border-l-2 border-blue-200 dark:border-blue-700">
          <input
            type="text"
            value={newWizName}
            onChange={(e) => setNewWizName(e.target.value)}
            placeholder="Wizard name"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm"
          />
          <select
            value={newWizPlayer ?? ""}
            onChange={(e) => setNewWizPlayer(e.target.value || null)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="">No player</option>
            {players.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              disabled={disabled || !newWizName.trim()}
              onClick={() => {
                onCreateWizard(newWizName.trim(), newWizPlayer);
                setCreating(false);
                setNewWizName("");
                setNewWizPlayer(null);
              }}
              className="text-xs bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded px-2 py-1 disabled:opacity-50 cursor-pointer"
            >
              Create
            </button>
            <button
              onClick={() => { setCreating(false); setNewWizName(""); setNewWizPlayer(null); }}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
          {unassignedWizards.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Assign existing:</span>
              <select
                disabled={disabled}
                value=""
                onChange={(e) => { if (e.target.value) onAssignWizard(e.target.value); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
              >
                <option value="">Select wizard...</option>
                {unassignedWizards.map((w) => (
                  <option key={w.wizardId} value={w.wizardId}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            disabled={disabled}
            onClick={() => setCreating(true)}
            className="self-start text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
          >
            + Create Wizard
          </button>
        </div>
      )}

      {/* Watcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Watcher:</span>
        <select
          value={seat.watcherPlayerId ?? ""}
          disabled={disabled}
          onChange={(e) => onSetWatcher(e.target.value || null)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
        >
          <option value="">None</option>
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
