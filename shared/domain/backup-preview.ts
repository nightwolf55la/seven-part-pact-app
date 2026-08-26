import { BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION } from "./backup";
import { displayNameFromOrdinal } from "./calendar";

export interface BackupPreview {
  readonly exportedAtMs: number | null;
  readonly sourceCampaignRevision: number | null;
  readonly sourceLogicalRevision: number | null;
  readonly monthOrdinal: number | null;
  readonly monthDisplayName: string | null;
  readonly backupFormatVersion: number | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function asSafeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function extractBackupPreview(parsed: unknown): BackupPreview | null {
  if (!isPlainObject(parsed)) return null;
  if (parsed.formatType !== BACKUP_FORMAT_TYPE) return null;
  if (parsed.backupFormatVersion !== CURRENT_BACKUP_FORMAT_VERSION) return null;

  const prov = parsed.provenance;
  if (!isPlainObject(prov)) return null;

  const sourceCampaignRevision = asSafeInteger(prov.sourceCampaignRevision);
  const sourceLogicalRevision = asSafeInteger(prov.sourceLogicalRevision);
  const exportedAtMs = asSafeInteger(prov.exportedAtMs);

  const state = parsed.state;
  let monthOrdinal: number | null = null;
  let monthDisplayName: string | null = null;
  if (isPlainObject(state)) {
    const cal = state.calendar;
    if (isPlainObject(cal)) {
      monthOrdinal = asSafeInteger(cal.monthOrdinal);
      if (monthOrdinal !== null) {
        monthDisplayName = displayNameFromOrdinal(monthOrdinal);
      }
    }
  }

  return {
    exportedAtMs,
    sourceCampaignRevision,
    sourceLogicalRevision,
    monthOrdinal,
    monthDisplayName,
    backupFormatVersion: parsed.backupFormatVersion as number,
  };
}

export function buildBackupFilename(
  sourceCampaignRevision: number,
  exportedAtMs: number,
): string {
  const date = new Date(exportedAtMs);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `seven-part-pact-backup-${yyyy}-${mm}-${dd}-r${sourceCampaignRevision}.json`;
}

export function formatBackupBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
