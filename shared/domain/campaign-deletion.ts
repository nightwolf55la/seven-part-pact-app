import type { CampaignId } from "./ids";
import { isValidCampaignId } from "./ids";
import { DomainError } from "./errors";

/**
 * Maximum documents deleted per cleanup batch invocation.
 * Chosen to stay well within Convex mutation limits while making progress.
 */
export const DELETION_BATCH_SIZE = 200;

export const DELETION_CONFIRMATION_STRING = "DELETE";

export type DeletionPhase =
  | "campaignEvents"
  | "campaignSnapshots"
  | "campaignRevisions"
  | "campaignCheckpoints"
  | "campaignHistoryControl"
  | "campaign"
  | "verify";

export const DELETION_PHASE_ORDER: readonly DeletionPhase[] = [
  "campaignEvents",
  "campaignSnapshots",
  "campaignRevisions",
  "campaignCheckpoints",
  "campaignHistoryControl",
  "campaign",
  "verify",
] as const;

export interface DeletionOperation {
  readonly campaignKey: string;
  readonly campaignId: string;
  readonly status: "deleting";
  readonly phase: DeletionPhase;
  readonly startedAt: number;
  readonly lastProgressAt: number;
}

export const CAMPAIGN_OWNED_CHILD_COLLECTIONS = [
  "campaignEvents",
  "campaignSnapshots",
  "campaignRevisions",
  "campaignCheckpoints",
  "campaignHistoryControl",
] as const;

export type CampaignOwnedChildCollection = (typeof CAMPAIGN_OWNED_CHILD_COLLECTIONS)[number];

export function validateDeletionRequest(
  expectedCampaignId: string,
  confirmation: string,
): void {
  if (confirmation !== DELETION_CONFIRMATION_STRING) {
    throw new DomainError(
      "CAMPAIGN_DELETION_CONFIRMATION_FAILED",
      `Deletion requires confirmation string "${DELETION_CONFIRMATION_STRING}", got "${confirmation}"`,
    );
  }
  if (!isValidCampaignId(expectedCampaignId)) {
    throw new DomainError(
      "CAMPAIGN_DELETION_STALE_IDENTITY",
      `Invalid campaign identity format: "${expectedCampaignId}"`,
    );
  }
}

export function validateCampaignIdentityMatch(
  expectedCampaignId: string,
  actualCampaignId: string,
): void {
  if (expectedCampaignId !== actualCampaignId) {
    throw new DomainError(
      "CAMPAIGN_DELETION_STALE_IDENTITY",
      `Expected campaign "${expectedCampaignId}" but current campaign is "${actualCampaignId}"`,
    );
  }
}

export function assertNotDeleting(
  deletionOp: DeletionOperation | null,
): void {
  if (deletionOp !== null) {
    throw new DomainError(
      "CAMPAIGN_DELETION_IN_PROGRESS",
      `Campaign deletion is in progress (phase: ${deletionOp.phase}). No campaign mutations are allowed until deletion completes.`,
    );
  }
}

export function nextDeletionPhase(currentPhase: DeletionPhase): DeletionPhase | "complete" {
  const idx = DELETION_PHASE_ORDER.indexOf(currentPhase);
  if (idx < 0) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `Unknown deletion phase: "${currentPhase}"`,
    );
  }
  if (idx >= DELETION_PHASE_ORDER.length - 1) {
    return "complete";
  }
  return DELETION_PHASE_ORDER[idx + 1];
}

export function isDeletionChildCleanupPhase(phase: DeletionPhase): phase is CampaignOwnedChildCollection {
  return (CAMPAIGN_OWNED_CHILD_COLLECTIONS as readonly string[]).includes(phase);
}
