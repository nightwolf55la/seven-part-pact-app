import { v } from "convex/values";
import { query } from "./_generated/server";

const verificationResultValidator = v.union(
  v.object({
    status: v.literal("no_canonical_campaign"),
  }),
  v.object({
    status: v.literal("valid"),
    campaignId: v.string(),
    campaignRevision: v.number(),
    revisionRecordCount: v.number(),
    eventRecordCount: v.number(),
    snapshotCount: v.number(),
    revisionsContiguous: v.boolean(),
    snapshotsCoverAllRevisions: v.boolean(),
    commandIdsUnique: v.boolean(),
    allEventsHaveRevision: v.boolean(),
    eventIndexesValid: v.boolean(),
    finalSnapshotMatchesCampaign: v.boolean(),
    noDuplicateRevisions: v.boolean(),
    noDuplicateSnapshots: v.boolean(),
  }),
  v.object({
    status: v.literal("invalid"),
    errors: v.array(v.string()),
  }),
);

export const verifyMigration = query({
  args: {},
  returns: verificationResultValidator,
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical === null || !("campaignKey" in maybeCanonical) || maybeCanonical.campaignKey !== "default") {
      return { status: "no_canonical_campaign" as const };
    }

    const canonical = maybeCanonical as typeof maybeCanonical & {
      campaignId: string;
      campaignRevision: number;
      state: { schemaVersion: 1; ruleset: { id: string; version: number }; calendar: { monthOrdinal: number } };
    };

    const campaignId = canonical.campaignId;
    const campaignRevision = canonical.campaignRevision;
    const errors: string[] = [];

    const revisionRecords = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_revision")
      .collect();

    const campaignRevisions = revisionRecords.filter((r) => r.campaignId === campaignId);
    const revisionRecordCount = campaignRevisions.length;

    const eventRecords = await ctx.db
      .query("campaignEvents")
      .withIndex("by_campaign_revision_index")
      .collect();
    const campaignEvents = eventRecords.filter((e) => e.campaignId === campaignId);
    const eventRecordCount = campaignEvents.length;

    const snapshotRecords = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision")
      .collect();
    const campaignSnapshots = snapshotRecords.filter((s) => s.campaignId === campaignId);
    const snapshotCount = campaignSnapshots.length;

    const revNums = campaignRevisions.map((r) => r.campaignRevision).sort((a, b) => a - b);
    let revisionsContiguous = true;
    for (let i = 0; i < revNums.length; i++) {
      if (revNums[i] !== i + 1) {
        revisionsContiguous = false;
        errors.push(`Revision ${i + 1} missing; found ${revNums[i]}`);
        break;
      }
    }
    if (revNums.length !== campaignRevision) {
      revisionsContiguous = false;
      errors.push(`Expected ${campaignRevision} revisions, found ${revNums.length}`);
    }

    const snapRevs = new Set(campaignSnapshots.map((s) => s.campaignRevision));
    let snapshotsCoverAllRevisions = true;
    for (let i = 0; i <= campaignRevision; i++) {
      if (!snapRevs.has(i)) {
        snapshotsCoverAllRevisions = false;
        errors.push(`Missing snapshot for revision ${i}`);
        break;
      }
    }

    const commandIds = campaignRevisions.map((r) => r.commandId);
    const commandIdsUnique = new Set(commandIds).size === commandIds.length;
    if (!commandIdsUnique) {
      errors.push("Duplicate command IDs found");
    }

    const revisionSet = new Set(revNums);
    let allEventsHaveRevision = true;
    for (const evt of campaignEvents) {
      if (!revisionSet.has(evt.campaignRevision)) {
        allEventsHaveRevision = false;
        errors.push(`Event at revision ${evt.campaignRevision} has no matching revision record`);
        break;
      }
    }

    let eventIndexesValid = true;
    const eventsByRev = new Map<number, number[]>();
    for (const evt of campaignEvents) {
      const list = eventsByRev.get(evt.campaignRevision) ?? [];
      list.push(evt.eventIndex);
      eventsByRev.set(evt.campaignRevision, list);
    }
    for (const [rev, indexes] of eventsByRev) {
      indexes.sort((a, b) => a - b);
      for (let i = 0; i < indexes.length; i++) {
        if (indexes[i] !== i) {
          eventIndexesValid = false;
          errors.push(`Revision ${rev}: eventIndex gap at position ${i}`);
          break;
        }
      }
      if (!eventIndexesValid) break;
    }

    const finalSnapshot = campaignSnapshots.find((s) => s.campaignRevision === campaignRevision);
    let finalSnapshotMatchesCampaign = false;
    if (finalSnapshot) {
      const canonicalState = canonical.state;
      finalSnapshotMatchesCampaign =
        finalSnapshot.state.calendar.monthOrdinal === canonicalState.calendar.monthOrdinal &&
        finalSnapshot.state.schemaVersion === canonicalState.schemaVersion;
    } else {
      errors.push("Final snapshot not found");
    }

    const revSet = new Set<number>();
    let noDuplicateRevisions = true;
    for (const r of campaignRevisions) {
      if (revSet.has(r.campaignRevision)) {
        noDuplicateRevisions = false;
        errors.push(`Duplicate revision record: ${r.campaignRevision}`);
        break;
      }
      revSet.add(r.campaignRevision);
    }

    const snapKeySet = new Set<number>();
    let noDuplicateSnapshots = true;
    for (const s of campaignSnapshots) {
      if (snapKeySet.has(s.campaignRevision)) {
        noDuplicateSnapshots = false;
        errors.push(`Duplicate snapshot for revision: ${s.campaignRevision}`);
        break;
      }
      snapKeySet.add(s.campaignRevision);
    }

    if (errors.length > 0) {
      return { status: "invalid" as const, errors };
    }

    return {
      status: "valid" as const,
      campaignId,
      campaignRevision,
      revisionRecordCount,
      eventRecordCount,
      snapshotCount,
      revisionsContiguous,
      snapshotsCoverAllRevisions,
      commandIdsUnique,
      allEventsHaveRevision,
      eventIndexesValid,
      finalSnapshotMatchesCampaign,
      noDuplicateRevisions,
      noDuplicateSnapshots,
    };
  },
});
