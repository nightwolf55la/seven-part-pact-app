import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { useState } from "react";
import { buildTableWizardsRows } from "./table-wizards-view-model";
import type { PlayerRef, WizardRef, SeatRef } from "./table-wizards-view-model";
import { PACT_SEAT_IDS, pactSeatDisplayName } from "../shared/domain/pact-seats";
import AddWizardDialog from "./AddWizardDialog";
import WizardCharacterSheet from "./WizardCharacterSheet";
import { eligiblePortrayingPlayersForNewWizard } from "./setup-view-model";
import type { WizardCharacterData } from "../shared/domain/campaign-state";
import type { WorldReference } from "./WorldSurface";

const STATUS_COLORS: Record<string, string> = {
  Present: "text-green-700 dark:text-green-400",
  Silent: "text-amber-700 dark:text-amber-400",
  Absent: "text-slate-500 dark:text-slate-400",
  "Not configured": "text-slate-400 dark:text-slate-500",
};

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function generateWizardId(): string {
  return `wiz_${crypto.randomUUID()}`;
}

export default function TableWizards({
  pactSeats,
  players,
  wizards,
  worldRef,
}: {
  pactSeats: Readonly<Record<string, SeatRef>>;
  players: readonly PlayerRef[];
  wizards: readonly WizardRef[];
  worldRef: WorldReference | null | undefined;
}) {
  const rows = buildTableWizardsRows(pactSeats, players, wizards);
  const createWizard = useMutation(api.m3Commands.createWizard);
  const updateWizardCharacter = useMutation(api.m3Commands.updateWizardCharacter);
  const setWizardHomeIsle = useMutation(api.m3Commands.setWizardHomeIsle);
  const setWizardSanctum = useMutation(api.m3Commands.setWizardSanctum);

  const [pending, setPending] = useState(false);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [addWizardError, setAddWizardError] = useState<string | null>(null);
  const [characterWizardId, setCharacterWizardId] = useState<string | null>(null);
  const [characterError, setCharacterError] = useState<string | null>(null);

  const assignedWizardIds = new Set(
    PACT_SEAT_IDS
      .map((sid) => pactSeats[sid]?.wizardId)
      .filter((id): id is string => id !== null && id !== undefined),
  );
  const unassignedWizards = wizards.filter((w) => !assignedWizardIds.has(w.wizardId));

  const characterWizard = characterWizardId
    ? wizards.find((w) => w.wizardId === characterWizardId) ?? null
    : null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Table / Wizards
        </h3>
        <button
          disabled={pending}
          onClick={() => { setShowAddWizard(true); setAddWizardError(null); }}
          className="text-xs font-medium bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg px-3 py-1.5 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Add Wizard
        </button>
      </div>
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
                <div className="flex items-center gap-2">
                  <p>Wizard: <span className="font-medium text-slate-600 dark:text-slate-300">{row.wizardName}</span></p>
                  {row.wizardId !== null && (
                    <button
                      disabled={pending}
                      onClick={() => { setCharacterWizardId(row.wizardId!); setCharacterError(null); }}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Character Sheet
                    </button>
                  )}
                </div>
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
              {row.elements !== null ? (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                  <span>Air <span className="font-medium text-slate-600 dark:text-slate-300">{row.elements.air}</span></span>
                  <span>Fire <span className="font-medium text-slate-600 dark:text-slate-300">{row.elements.fire}</span></span>
                  <span>Earth <span className="font-medium text-slate-600 dark:text-slate-300">{row.elements.earth}</span></span>
                  <span>Water <span className="font-medium text-slate-600 dark:text-slate-300">{row.elements.water}</span></span>
                </div>
              ) : (
                <p className="text-slate-400 dark:text-slate-500">Elements —</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {unassignedWizards.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <p className="text-xs text-slate-400">Unassigned Wizards:</p>
          {unassignedWizards.map((w) => (
            <div key={w.wizardId} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{w.name}</span>
              <button
                disabled={pending}
                onClick={() => { setCharacterWizardId(w.wizardId); setCharacterError(null); }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Character Sheet
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddWizard && (
        <AddWizardDialog
          players={eligiblePortrayingPlayersForNewWizard(players, pactSeats, wizards)}
          pactSeats={pactSeats}
          pending={pending}
          error={addWizardError}
          onCreate={async (name, portrayedBy, seatId) => {
            setPending(true);
            setAddWizardError(null);
            try {
              await createWizard({
                commandId: generateCommandId(),
                wizardId: generateWizardId(),
                name,
                portrayedByPlayerId: portrayedBy,
                seatId,
              });
              setShowAddWizard(false);
              setAddWizardError(null);
            } catch (e: any) {
              setAddWizardError(e?.message ?? "Failed to create wizard");
            } finally {
              setPending(false);
            }
          }}
          onClose={() => { setShowAddWizard(false); setAddWizardError(null); }}
        />
      )}

      {characterWizard && (
        <WizardCharacterSheet
          wizardId={characterWizard.wizardId}
          wizardName={characterWizard.name}
          character={characterWizard.character as WizardCharacterData}
          pending={pending}
          error={characterError}
          homeIsleId={characterWizard.homeIsleId}
          sanctumPlaceId={characterWizard.sanctumPlaceId}
          worldRef={worldRef}
          onSetHomeIsle={async (change) => {
            setCharacterError(null);
            setPending(true);
            try {
              await setWizardHomeIsle({
                commandId: generateCommandId(),
                wizardId: characterWizard.wizardId,
                change,
              });
            } catch (e: any) {
              setCharacterError(e?.message ?? "Failed to save Home Isle");
            } finally {
              setPending(false);
            }
          }}
          onSetSanctum={async (change) => {
            setCharacterError(null);
            setPending(true);
            try {
              await setWizardSanctum({
                commandId: generateCommandId(),
                wizardId: characterWizard.wizardId,
                change,
              });
            } catch (e: any) {
              setCharacterError(e?.message ?? "Failed to save Sanctum");
            } finally {
              setPending(false);
            }
          }}
          onSave={async (patch) => {
            setCharacterError(null);
            setPending(true);
            try {
              await updateWizardCharacter({
                commandId: generateCommandId(),
                wizardId: characterWizard.wizardId,
                patch,
              });
              setCharacterWizardId(null);
              setCharacterError(null);
            } catch (e: any) {
              setCharacterError(e?.message ?? "Failed to save character");
            } finally {
              setPending(false);
            }
          }}
          onClose={() => { setCharacterWizardId(null); setCharacterError(null); }}
        />
      )}
    </section>
  );
}
