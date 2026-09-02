import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { DeletionOperation, DeletionPhase } from "../shared/domain";
import { DomainError, assertNotDeleting } from "../shared/domain";

export async function loadActiveDeletion(
  ctx: QueryCtx | MutationCtx,
): Promise<DeletionOperation | null> {
  const op = await ctx.db
    .query("campaignDeletionOperations")
    .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
    .unique();
  if (op === null) return null;
  return {
    campaignKey: op.campaignKey,
    campaignId: op.campaignId,
    status: op.status,
    phase: op.phase as DeletionPhase,
    startedAt: op.startedAt,
    lastProgressAt: op.lastProgressAt,
  };
}

export async function assertCampaignNotDeleting(
  ctx: QueryCtx | MutationCtx,
): Promise<void> {
  const op = await loadActiveDeletion(ctx);
  assertNotDeleting(op);
}
