import { DomainError } from "./errors";
import {
  DELETION_BATCH_SIZE,
  DELETION_PHASE_ORDER,
  CAMPAIGN_OWNED_CHILD_COLLECTIONS,
  isDeletionChildCleanupPhase,
  nextDeletionPhase,
  validateDeletionRequest,
  validateCampaignIdentityMatch,
} from "./campaign-deletion";
import type {
  DeletionPhase,
  DeletionOperation,
  CampaignOwnedChildCollection,
} from "./campaign-deletion";

export interface DeletionPersistenceAdapter {
  loadActiveDeletion(): DeletionOperation | null;
  loadCanonicalCampaignId(): string | null;
  insertDeletionMarker(op: DeletionOperation): void;
  patchDeletionPhase(phase: DeletionPhase): void;
  removeDeletionMarker(): void;
  countChildRecords(collection: CampaignOwnedChildCollection, campaignId: string): number;
  deleteChildBatch(collection: CampaignOwnedChildCollection, campaignId: string, limit: number): number;
  deleteCampaignRecord(campaignId: string): boolean;
  hasAnyCampaignRecord(): boolean;
  getCampaignRecordIdentity(): string | null;
  scheduleNextBatch(): void;
}

export interface RequestDeletionResult {
  status: "deleting";
  campaignId: string;
  phase: DeletionPhase;
}

export function requestDeletion(
  adapter: DeletionPersistenceAdapter,
  expectedCampaignId: string,
  confirmation: string,
): RequestDeletionResult {
  validateDeletionRequest(expectedCampaignId, confirmation);

  const existingOp = adapter.loadActiveDeletion();
  if (existingOp !== null) {
    if (existingOp.campaignId === expectedCampaignId) {
      return { status: "deleting", campaignId: existingOp.campaignId, phase: existingOp.phase };
    }
    throw new DomainError(
      "CAMPAIGN_DELETION_IN_PROGRESS",
      `A deletion is already in progress for campaign "${existingOp.campaignId}"`,
    );
  }

  const actualCampaignId = adapter.loadCanonicalCampaignId();
  if (actualCampaignId === null) {
    throw new DomainError("CAMPAIGN_NOT_FOUND", "No canonical campaign found to delete");
  }

  validateCampaignIdentityMatch(expectedCampaignId, actualCampaignId);

  const now = Date.now();
  const initialPhase: DeletionPhase = DELETION_PHASE_ORDER[0];
  const op: DeletionOperation = {
    campaignKey: "default",
    campaignId: actualCampaignId,
    status: "deleting",
    phase: initialPhase,
    startedAt: now,
    lastProgressAt: now,
  };

  adapter.insertDeletionMarker(op);
  adapter.scheduleNextBatch();

  return { status: "deleting", campaignId: actualCampaignId, phase: initialPhase };
}

export interface BatchResult {
  continued: boolean;
  finalPhase: DeletionPhase | "complete";
  deleted: number;
}

export function processBatch(adapter: DeletionPersistenceAdapter): BatchResult | null {
  const op = adapter.loadActiveDeletion();
  if (op === null) return null;

  const { campaignId, phase } = op;

  if (isDeletionChildCleanupPhase(phase)) {
    const deleted = adapter.deleteChildBatch(phase, campaignId, DELETION_BATCH_SIZE);
    if (deleted >= DELETION_BATCH_SIZE) {
      adapter.patchDeletionPhase(phase);
      adapter.scheduleNextBatch();
      return { continued: true, finalPhase: phase, deleted };
    }
    const remaining = adapter.countChildRecords(phase, campaignId);
    if (remaining > 0) {
      adapter.patchDeletionPhase(phase);
      adapter.scheduleNextBatch();
      return { continued: true, finalPhase: phase, deleted };
    }
    const next = nextDeletionPhase(phase);
    if (next === "complete") {
      adapter.removeDeletionMarker();
      return { continued: false, finalPhase: "complete", deleted };
    }
    adapter.patchDeletionPhase(next);
    adapter.scheduleNextBatch();
    return { continued: true, finalPhase: next, deleted };
  }

  if (phase === "campaign") {
    const recordIdentity = adapter.getCampaignRecordIdentity();
    if (recordIdentity !== null) {
      if (recordIdentity !== campaignId) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Deletion target is "${campaignId}" but canonical campaign has identity "${recordIdentity}". Refusing to delete unknown campaign data.`,
        );
      }
      adapter.deleteCampaignRecord(campaignId);
    }
    const next = nextDeletionPhase("campaign");
    if (next === "complete") {
      adapter.removeDeletionMarker();
      return { continued: false, finalPhase: "complete", deleted: 0 };
    }
    adapter.patchDeletionPhase(next);
    adapter.scheduleNextBatch();
    return { continued: true, finalPhase: next, deleted: 0 };
  }

  if (phase === "verify") {
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      const count = adapter.countChildRecords(col, campaignId);
      if (count > 0) {
        adapter.patchDeletionPhase(col);
        adapter.scheduleNextBatch();
        return { continued: true, finalPhase: col, deleted: 0 };
      }
    }
    const recordIdentity = adapter.getCampaignRecordIdentity();
    if (recordIdentity !== null) {
      if (recordIdentity !== campaignId) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Verification found canonical campaign with unexpected identity "${recordIdentity}" (expected "${campaignId}" or absent). Deletion marker retained.`,
        );
      }
      adapter.patchDeletionPhase("campaign");
      adapter.scheduleNextBatch();
      return { continued: true, finalPhase: "campaign", deleted: 0 };
    }
    adapter.removeDeletionMarker();
    return { continued: false, finalPhase: "complete", deleted: 0 };
  }

  return null;
}

export type LifecycleStatus =
  | { status: "none" }
  | { status: "deleting"; campaignId: string; phase: DeletionPhase }
  | { status: "campaign"; campaignId: string }
  | { status: "corrupt"; reason: string };

export function resolveLifecycle(
  hasDeletionMarker: DeletionOperation | null,
  canonicalCampaignId: string | null,
  hasOrphanedChildRecords: boolean,
): LifecycleStatus {
  if (hasDeletionMarker !== null) {
    return {
      status: "deleting",
      campaignId: hasDeletionMarker.campaignId,
      phase: hasDeletionMarker.phase,
    };
  }
  if (canonicalCampaignId !== null) {
    return { status: "campaign", campaignId: canonicalCampaignId };
  }
  if (hasOrphanedChildRecords) {
    return {
      status: "corrupt",
      reason: "Campaign-owned records exist without a canonical campaign or deletion marker",
    };
  }
  return { status: "none" };
}
