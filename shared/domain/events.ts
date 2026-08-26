import type { MonthDirection, MonthOrdinal } from "./calendar";

export interface MonthChangedDataV1 {
  readonly direction: MonthDirection;
  readonly fromOrdinal: MonthOrdinal;
  readonly toOrdinal: MonthOrdinal;
}

export interface MonthChangedEventV1 {
  readonly type: "month_changed";
  readonly version: 1;
  readonly data: MonthChangedDataV1;
}

export interface UndoAppliedDataV1 {
  readonly fromRevision: number;
  readonly targetRevision: number;
}

export interface UndoAppliedEventV1 {
  readonly type: "undo_applied";
  readonly version: 1;
  readonly data: UndoAppliedDataV1;
}

export interface RedoAppliedDataV1 {
  readonly fromRevision: number;
  readonly targetRevision: number;
}

export interface RedoAppliedEventV1 {
  readonly type: "redo_applied";
  readonly version: 1;
  readonly data: RedoAppliedDataV1;
}

export interface CheckpointRestoredDataV1 {
  readonly checkpointId: string;
  readonly sourceRevision: number;
  readonly labelAtRestore: string;
}

export interface CheckpointRestoredEventV1 {
  readonly type: "checkpoint_restored";
  readonly version: 1;
  readonly data: CheckpointRestoredDataV1;
}

export interface BackupImportedDataV1 {
  readonly backupFormatVersion: 1;
  readonly sourceCampaignId: string;
  readonly sourceCampaignRevision: number;
  readonly sourceLogicalRevision: number;
  readonly exportedAtMs: number;
  readonly payloadDigest: string;
}

export interface BackupImportedEventV1 {
  readonly type: "backup_imported";
  readonly version: 1;
  readonly data: BackupImportedDataV1;
}

export type CampaignEvent =
  | MonthChangedEventV1
  | UndoAppliedEventV1
  | RedoAppliedEventV1
  | CheckpointRestoredEventV1
  | BackupImportedEventV1;
