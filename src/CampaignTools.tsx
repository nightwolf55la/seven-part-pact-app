import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { describeActivityEntry } from "../shared/domain";
import {
  extractBackupPreview,
  buildBackupFilename,
  type BackupPreview,
} from "../shared/domain/backup-preview";
import { useRef, useState } from "react";
import type { ActivityEntry } from "../shared/domain";

const MAX_PORTABLE_BACKUP_BYTES = 512 * 1024;

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function generateCheckpointId(): string {
  return `chk_${crypto.randomUUID()}`;
}

type PendingAction =
  | null
  | "undo"
  | "redo"
  | "createCheckpoint"
  | "restoreCheckpoint"
  | "exportBackup"
  | "importBackup";

export default function CampaignTools({
  campaignId,
}: {
  campaignId: string;
}) {
  const undoRedoState = useQuery(api.campaign.getUndoRedoState, {});
  const events = useQuery(api.campaign.getRecentEvents, { count: 20 });
  const checkpoints = useQuery(api.campaign.listCheckpoints, {});
  const undoMutation = useMutation(api.campaign.undo);
  const redoMutation = useMutation(api.campaign.redo);
  const createCheckpointMutation = useMutation(api.campaign.createCheckpoint);
  const restoreCheckpointMutation = useMutation(api.campaign.restoreCheckpoint);
  const exportBackupAction = useAction(api.backup.exportPortableBackup);
  const importBackupMutation = useMutation(api.backup.importPortableBackup);
  const requestDeletionMutation = useMutation(
    api.campaignDeletion.requestCampaignDeletion,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [backupRawText, setBackupRawText] = useState<string | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);
  const [importConfirming, setImportConfirming] = useState(false);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const historyStateIsCurrent =
    undoRedoState !== undefined &&
    undoRedoState !== null;

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

  const canCreateCheckpoint =
    !navigationPending && checkpointLabel.trim().length > 0;

  const canRestoreCheckpoint =
    historyStateIsCurrent && !navigationPending && undoRedoState !== null && undoRedoState !== undefined;

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

  async function handleCreateCheckpoint() {
    if (!canCreateCheckpoint) return;
    const checkpointId = generateCheckpointId();
    setPendingAction("createCheckpoint");
    setActionError(null);
    try {
      await createCheckpointMutation({ checkpointId, label: checkpointLabel });
      setCheckpointLabel("");
    } catch {
      setActionError("That action could not be applied. The campaign may have changed; try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRestoreCheckpoint(checkpointId: string) {
    if (!canRestoreCheckpoint || !undoRedoState) return;
    const commandId = generateCommandId();
    const expectedRevision = undoRedoState.campaignRevision;
    setPendingAction("restoreCheckpoint");
    setActionError(null);
    try {
      await restoreCheckpointMutation({ checkpointId, commandId, expectedRevision });
    } catch {
      setActionError("That action could not be applied. The campaign may have changed; try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDownloadBackup() {
    if (pendingAction) return;
    setPendingAction("exportBackup");
    setActionError(null);
    try {
      const backup = await exportBackupAction({});
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const filename = buildBackupFilename(
        backup.provenance.sourceCampaignRevision as number,
        backup.provenance.exportedAtMs,
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setActionError("The backup could not be downloaded. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleFileSelected(file: File) {
    setBackupFileError(null);
    setBackupPreview(null);
    setBackupRawText(null);
    setImportConfirming(false);
    if (file.size > MAX_PORTABLE_BACKUP_BYTES) {
      setBackupFileError("That file is too large. Backup files must be 512 KiB or smaller.");
      return;
    }
    try {
      const text = await file.text();
      if (new TextEncoder().encode(text).length > MAX_PORTABLE_BACKUP_BYTES) {
        setBackupFileError("That file is too large. Backup files must be 512 KiB or smaller.");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setBackupFileError("This file is not valid JSON.");
        return;
      }
      const preview = extractBackupPreview(parsed);
      if (preview === null) {
        setBackupRawText(text);
        setBackupFileError("Backup metadata could not be read. Server validation will reject invalid backup files.");
        return;
      }
      setBackupRawText(text);
      setBackupPreview(preview);
    } catch {
      setBackupFileError("That file could not be read.");
    }
  }

  function clearBackupSelection() {
    setBackupRawText(null);
    setBackupPreview(null);
    setBackupFileError(null);
    setImportConfirming(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!historyStateIsCurrent || !undoRedoState || pendingAction) return;
    if (backupRawText === null || backupPreview === null) return;
    const commandId = generateCommandId();
    const expectedRevision = undoRedoState.campaignRevision;
    setPendingAction("importBackup");
    setActionError(null);
    try {
      await importBackupMutation({
        commandId,
        expectedRevision,
        backupJson: backupRawText,
      });
      clearBackupSelection();
    } catch {
      setActionError("That backup could not be imported. The file may be invalid, incompatible, or the campaign may have changed.");
      setImportConfirming(false);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleConfirmDelete() {
    if (deleteConfirmText !== "DELETE") return;
    setPendingAction("importBackup");
    setDeleteError(null);
    try {
      await requestDeletionMutation({
        expectedCampaignId: campaignId,
        confirmation: deleteConfirmText,
      });
    } catch (e: unknown) {
      setDeleteError(
        e instanceof Error
          ? e.message
          : "Could not start deletion. Please try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Campaign Tools
        </h2>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        These are global campaign recovery and administrative tools. Undo and Redo affect the entire campaign, not just your local view.
      </p>

      {actionError !== null && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          {actionError}
        </p>
      )}

      {/* Campaign Recovery: Undo / Redo */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Campaign Recovery
        </h3>
        <div className="flex gap-3">
          <button
            disabled={!canUndo}
            onClick={handleUndo}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pendingAction === "undo" ? "Undoing…" : "Undo Campaign"}
          </button>
          <button
            disabled={!canRedo}
            onClick={handleRedo}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pendingAction === "redo" ? "Redoing…" : "Redo Campaign"}
          </button>
        </div>
      </section>

      {/* Checkpoints */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Checkpoints
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={checkpointLabel}
            maxLength={120}
            onChange={(e) => setCheckpointLabel(e.target.value)}
            placeholder="Checkpoint label"
            disabled={navigationPending}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            disabled={!canCreateCheckpoint}
            onClick={handleCreateCheckpoint}
            className="bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {pendingAction === "createCheckpoint" ? "Creating…" : "Create Checkpoint"}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {checkpoints === undefined ? (
            <div className="p-4 text-sm text-slate-400 dark:text-slate-500">
              Loading checkpoints…
            </div>
          ) : checkpoints.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 dark:text-slate-500">
              No checkpoints yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {checkpoints.map((cp) => (
                <li
                  key={cp.checkpointId}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cp.label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Revision {cp.sourceRevision} ·{" "}
                      {new Date(cp.createdAtMs).toLocaleString()}
                    </p>
                  </div>
                  <button
                    disabled={!canRestoreCheckpoint}
                    onClick={() => handleRestoreCheckpoint(cp.checkpointId)}
                    className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {pendingAction === "restoreCheckpoint" ? "Restoring…" : "Restore"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Backup / Import */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Backup / Import
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col gap-3">
          <button
            disabled={pendingAction !== null}
            onClick={handleDownloadBackup}
            className="w-full bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pendingAction === "exportBackup" ? "Downloading…" : "Download Backup"}
          </button>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="backup-file-input"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Import a backup file
            </label>
            <input
              id="backup-file-input"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              disabled={pendingAction !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 file:cursor-pointer file:transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {backupFileError !== null && (
            <p className="text-xs text-red-600 dark:text-red-400">{backupFileError}</p>
          )}
          {backupPreview !== null && backupRawText !== null && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Backup preview
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <dt className="text-slate-400 dark:text-slate-500">Exported</dt>
                <dd>{new Date(backupPreview.exportedAtMs).toLocaleString()}</dd>
                <dt className="text-slate-400 dark:text-slate-500">Source revision</dt>
                <dd>{`Revision ${backupPreview.sourceCampaignRevision}`}</dd>
                <dt className="text-slate-400 dark:text-slate-500">Logical revision</dt>
                <dd>{`Revision ${backupPreview.sourceLogicalRevision}`}</dd>
                <dt className="text-slate-400 dark:text-slate-500">Month</dt>
                <dd>{backupPreview.monthDisplayName}</dd>
                <dt className="text-slate-400 dark:text-slate-500">Format version</dt>
                <dd>{`v${backupPreview.backupFormatVersion}`}</dd>
              </dl>
              {!importConfirming ? (
                <button
                  disabled={!historyStateIsCurrent || pendingAction !== null}
                  onClick={() => setImportConfirming(true)}
                  className="mt-1 self-start rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Import Backup
                </button>
              ) : (
                <div className="mt-1 flex flex-col gap-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Import this backup? Your current game state will be replaced by the backed-up state. You can Undo the import afterward.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={pendingAction !== null}
                      onClick={() => setImportConfirming(false)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!historyStateIsCurrent || pendingAction !== null}
                      onClick={handleConfirmImport}
                      className="rounded-lg border border-slate-800 dark:border-slate-100 bg-slate-800 dark:bg-slate-100 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {pendingAction === "importBackup" ? "Importing…" : "Confirm Import"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Activity History */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Activity History
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {events === undefined ? (
            <div className="p-4 text-sm text-slate-400 dark:text-slate-500">
              Loading history…
            </div>
          ) : events.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 dark:text-slate-500">
              No events yet.
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

      {/* Delete / Start Over */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
          Delete / Start Over
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm p-4 flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This permanently deletes the entire campaign and all its history. This action cannot be undone and is not recoverable through Undo.
          </p>
          {!deleteConfirming ? (
            <button
              onClick={() => setDeleteConfirming(true)}
              className="self-start rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              Delete / Start Over
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Type <span className="font-mono font-bold">DELETE</span> to confirm. This will permanently remove the entire campaign.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                disabled={pendingAction !== null}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700 disabled:opacity-50"
              />
              {deleteError !== null && (
                <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  disabled={pendingAction !== null}
                  onClick={() => {
                    setDeleteConfirming(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteConfirmText !== "DELETE" || pendingAction !== null}
                  onClick={handleConfirmDelete}
                  className="rounded-lg border border-red-700 dark:border-red-300 bg-red-700 dark:bg-red-300 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-red-800 dark:hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {pendingAction === "importBackup" ? "Deleting…" : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
