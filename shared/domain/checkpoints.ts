import { isValidCheckpointId } from "./ids";
import { validateCheckpointLabel } from "./command-ids";
import type { SerializableCampaignState } from "./verification";
import { isLogicalStateCommandType } from "./commands";
import type { CampaignCommandType } from "./commands";

export const CURRENT_CHECKPOINT_VERSION = 1 as const;

export interface CampaignCheckpointV1 {
  readonly checkpointVersion: 1;
  readonly checkpointId: string;
  readonly campaignId: string;
  readonly label: string;
  readonly sourceRevision: number;
  readonly createdAtMs: number;
}

export interface CheckpointVerificationInput {
  readonly checkpoint: CampaignCheckpointV1;
  readonly campaignId: string;
  readonly campaignRevision: number;
  readonly snapshotExists: boolean;
  readonly snapshotState: SerializableCampaignState | null;
  readonly revisionCommandType: CampaignCommandType | null;
}

export function verifyCheckpoint(input: CheckpointVerificationInput): string[] {
  const errors: string[] = [];
  const { checkpoint, campaignId, campaignRevision } = input;

  if (checkpoint.checkpointVersion !== CURRENT_CHECKPOINT_VERSION) {
    errors.push(`Unrecognized checkpointVersion: ${checkpoint.checkpointVersion}`);
    return errors;
  }

  if (!isValidCheckpointId(checkpoint.checkpointId)) {
    errors.push(`Invalid checkpointId format: "${checkpoint.checkpointId}"`);
  }

  if (checkpoint.campaignId !== campaignId) {
    errors.push(`Checkpoint campaignId "${checkpoint.campaignId}" does not match campaign "${campaignId}"`);
  }

  const labelError = validateCheckpointLabel(checkpoint.label);
  if (labelError !== null) {
    errors.push(`Invalid checkpoint label: ${labelError}`);
  }

  if (!Number.isSafeInteger(checkpoint.sourceRevision) || checkpoint.sourceRevision < 0) {
    errors.push(`sourceRevision ${checkpoint.sourceRevision} is not a non-negative safe integer`);
  } else if (checkpoint.sourceRevision > campaignRevision) {
    errors.push(`sourceRevision ${checkpoint.sourceRevision} exceeds campaignRevision ${campaignRevision}`);
  }

  if (!Number.isFinite(checkpoint.createdAtMs) || checkpoint.createdAtMs < 0) {
    errors.push(`createdAtMs ${checkpoint.createdAtMs} is not a valid timestamp`);
  }

  if (!input.snapshotExists) {
    errors.push(`No snapshot exists for sourceRevision ${checkpoint.sourceRevision}`);
  } else if (input.snapshotState !== null) {
    if (typeof input.snapshotState.schemaVersion !== "number") {
      errors.push(`Snapshot at sourceRevision ${checkpoint.sourceRevision} has invalid state`);
    }
  }

  if (checkpoint.sourceRevision > 0) {
    if (input.revisionCommandType === null) {
      errors.push(`sourceRevision ${checkpoint.sourceRevision} has no revision record`);
    } else if (!isLogicalStateCommandType(input.revisionCommandType)) {
      errors.push(`sourceRevision ${checkpoint.sourceRevision} has non-logical-state commandType "${input.revisionCommandType}"`);
    }
  }

  return errors;
}

export interface CheckpointCollectionVerificationInput {
  readonly checkpoints: readonly CampaignCheckpointV1[];
  readonly campaignId: string;
  readonly campaignRevision: number;
  readonly snapshotRevisions: ReadonlySet<number>;
  readonly revisionCommandTypes: ReadonlyMap<number, CampaignCommandType>;
}

export function verifyCheckpointCollection(input: CheckpointCollectionVerificationInput): string[] {
  const errors: string[] = [];
  const { checkpoints, campaignId, campaignRevision, snapshotRevisions, revisionCommandTypes } = input;

  const idCounts = new Map<string, number>();
  for (const chk of checkpoints) {
    idCounts.set(chk.checkpointId, (idCounts.get(chk.checkpointId) ?? 0) + 1);
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push(`Duplicate checkpointId "${id}" appears ${count} times`);
    }
  }

  for (const chk of checkpoints) {
    const snapshotExists = snapshotRevisions.has(chk.sourceRevision);
    const revCommandType = chk.sourceRevision === 0
      ? null
      : (revisionCommandTypes.get(chk.sourceRevision) ?? null);

    const chkErrors = verifyCheckpoint({
      checkpoint: chk,
      campaignId,
      campaignRevision,
      snapshotExists,
      snapshotState: null,
      revisionCommandType: revCommandType,
    });

    for (const e of chkErrors) {
      errors.push(`Checkpoint "${chk.checkpointId}": ${e}`);
    }
  }

  return errors;
}
