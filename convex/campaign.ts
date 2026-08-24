import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  displayNameFromOrdinal,
  advanceOrdinal,
  INITIAL_MONTH_ORDINAL,
  applyMoveMonth,
  validateCampaignState,
  parseLiveCommandId,
  moveMonthFingerprint,
  initialCampaignState,
  isValidCampaignId,
  DomainError,
} from "../shared/domain";
import type { MonthDirection, CampaignId } from "../shared/domain";
import {
  monthDirectionValidator,
  monthDisplayNameValidator,
} from "./validators";
import { canonicalCommit } from "./canonicalCommit";

type CanonicalCampaignDoc = {
  _id: any;
  _creationTime: number;
  campaignKey: "default";
  campaignId: string;
  campaignRevision: number;
  state: { schemaVersion: 1; ruleset: { id: "seven_part_pact_draft4"; version: 1 }; calendar: { monthOrdinal: number } };
};

function isCanonical(doc: unknown): doc is CanonicalCampaignDoc {
  return doc !== null && typeof doc === "object" && "campaignKey" in (doc as any) && (doc as any).campaignKey === "default";
}

function generateCampaignId(): CampaignId {
  const raw = `cmp_${crypto.randomUUID()}`;
  if (!isValidCampaignId(raw)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Generated CampaignId failed validation: "${raw}"`);
  }
  return raw;
}

const campaignViewValidator = v.union(
  v.object({
    _id: v.id("campaigns"),
    _creationTime: v.number(),
    monthOrdinal: v.number(),
    revision: v.number(),
  }),
  v.null(),
);

export const getCampaign = query({
  args: {},
  returns: campaignViewValidator,
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      return {
        _id: maybeCanonical._id,
        _creationTime: maybeCanonical._creationTime,
        monthOrdinal: maybeCanonical.state.calendar.monthOrdinal,
        revision: maybeCanonical.campaignRevision,
      };
    }

    const legacy = await ctx.db.query("campaigns").first();
    if (legacy === null) return null;
    if (!("monthOrdinal" in legacy)) return null;
    return {
      _id: legacy._id,
      _creationTime: legacy._creationTime,
      monthOrdinal: legacy.monthOrdinal,
      revision: legacy.revision,
    };
  },
});

export const ensureCampaign = mutation({
  args: {},
  returns: campaignViewValidator,
  handler: async (ctx) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      const snapshot = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", maybeCanonical.campaignId).eq("campaignRevision", 0),
        )
        .unique();

      if (snapshot === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          "Canonical campaign exists at revision 0 but its revision-0 snapshot is missing",
        );
      }

      if (
        snapshot.state.schemaVersion !== maybeCanonical.state.schemaVersion ||
        snapshot.state.ruleset.id !== maybeCanonical.state.ruleset.id ||
        snapshot.state.ruleset.version !== maybeCanonical.state.ruleset.version ||
        snapshot.state.calendar.monthOrdinal !== maybeCanonical.state.calendar.monthOrdinal
      ) {
        if (maybeCanonical.campaignRevision === 0) {
          throw new DomainError(
            "CAMPAIGN_STATE_CORRUPT",
            "Canonical campaign at revision 0 has contradictory revision-0 snapshot",
          );
        }
      }

      return {
        _id: maybeCanonical._id,
        _creationTime: maybeCanonical._creationTime,
        monthOrdinal: maybeCanonical.state.calendar.monthOrdinal,
        revision: maybeCanonical.campaignRevision,
      };
    }

    const allCampaigns = await ctx.db.query("campaigns").collect();

    if (allCampaigns.length > 0) {
      const hasLegacy = allCampaigns.some((c) => "monthOrdinal" in c && !("campaignKey" in c));
      if (hasLegacy) {
        const legacy = allCampaigns.find((c) => "monthOrdinal" in c && !("campaignKey" in c))!;
        return {
          _id: legacy._id,
          _creationTime: legacy._creationTime,
          monthOrdinal: (legacy as any).monthOrdinal,
          revision: (legacy as any).revision,
        };
      }
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Unexpected campaign documents found (${allCampaigns.length}) but none are canonical or legacy`,
      );
    }

    const legacyEvents = await ctx.db.query("events").first();
    if (legacyEvents !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Legacy events exist but no campaign document found",
      );
    }

    const orphanRevisions = await ctx.db.query("campaignRevisions").first();
    if (orphanRevisions !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignRevisions exist but no campaign document found",
      );
    }

    const orphanEvents = await ctx.db.query("campaignEvents").first();
    if (orphanEvents !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignEvents exist but no campaign document found",
      );
    }

    const orphanSnapshots = await ctx.db.query("campaignSnapshots").first();
    if (orphanSnapshots !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignSnapshots exist but no campaign document found",
      );
    }

    const orphanHistoryControl = await ctx.db.query("campaignHistoryControl").first();
    if (orphanHistoryControl !== null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "Orphan campaignHistoryControl exist but no campaign document found",
      );
    }

    const state = initialCampaignState();
    validateCampaignState(state);

    const campaignId = generateCampaignId();

    const persistState = {
      schemaVersion: state.schemaVersion,
      ruleset: { id: state.ruleset.id, version: state.ruleset.version },
      calendar: { monthOrdinal: state.calendar.monthOrdinal as number },
    };

    const docId = await ctx.db.insert("campaigns", {
      campaignKey: "default" as const,
      campaignId: campaignId as string,
      campaignRevision: 0,
      state: persistState,
    });

    await ctx.db.insert("campaignSnapshots", {
      campaignId: campaignId as string,
      campaignRevision: 0,
      state: persistState,
    });

    await ctx.db.insert("campaignHistoryControl", {
      campaignId: campaignId as string,
      historyControlVersion: 1,
      undoStack: [0],
      redoStack: [],
    });

    const doc = await ctx.db.get(docId);
    if (doc === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", "Failed to read back newly created campaign");
    }

    return {
      _id: doc._id,
      _creationTime: doc._creationTime,
      monthOrdinal: state.calendar.monthOrdinal as number,
      revision: 0,
    };
  },
});

const eventViewValidator = v.object({
  _id: v.string(),
  revision: v.number(),
  previousMonth: v.string(),
  newMonth: v.string(),
});

export const getRecentEvents = query({
  args: { count: v.number() },
  returns: v.array(eventViewValidator),
  handler: async (ctx, args) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      const events = await ctx.db
        .query("campaignEvents")
        .withIndex("by_campaign_revision_index", (q) =>
          q.eq("campaignId", maybeCanonical.campaignId),
        )
        .order("desc")
        .take(args.count);

      return events.map((e) => {
        if (e.event.type !== "month_changed") {
          return null;
        }
        return {
          _id: e._id,
          revision: e.campaignRevision,
          previousMonth: displayNameFromOrdinal(e.event.data.fromOrdinal),
          newMonth: displayNameFromOrdinal(e.event.data.toOrdinal),
        };
      }).filter((e): e is NonNullable<typeof e> => e !== null);
    }

    const legacyEvents = await ctx.db.query("events").order("desc").take(args.count);
    return legacyEvents.map((e) => ({
      _id: e._id,
      revision: e.revision,
      previousMonth: e.previousMonth,
      newMonth: e.newMonth,
    }));
  },
});

export const moveMonth = mutation({
  args: {
    direction: monthDirectionValidator,
    commandId: v.string(),
  },
  returns: v.object({
    revision: v.number(),
    monthOrdinal: v.number(),
    month: monthDisplayNameValidator,
  }),
  handler: async (ctx, args) => {
    const maybeCanonical = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (maybeCanonical !== null && isCanonical(maybeCanonical)) {
      const commandId = parseLiveCommandId(args.commandId);
      const currentState = validateCampaignState(maybeCanonical.state);
      const direction = args.direction as MonthDirection;
      const { nextState, events } = applyMoveMonth(currentState, direction);
      const fingerprint = moveMonthFingerprint(direction);

      const receipt = await canonicalCommit(ctx, {
        campaignDocId: maybeCanonical._id,
        campaignId: maybeCanonical.campaignId,
        currentRevision: maybeCanonical.campaignRevision,
        currentState,
        commandId,
        commandType: "move_month",
        commandFingerprint: fingerprint,
        nextState,
        events,
      });

      return {
        revision: receipt.newRevision,
        monthOrdinal: receipt.state.calendar.monthOrdinal as number,
        month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      };
    }

    const legacy = await ctx.db.query("campaigns").first();

    if (legacy === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        "No campaign exists. Call ensureCampaign first.",
      );
    }

    if (!("monthOrdinal" in legacy)) {
      throw new Error("Campaign has been migrated to new format");
    }

    const previousMonthOrdinal = legacy.monthOrdinal;
    const previousMonth = displayNameFromOrdinal(previousMonthOrdinal);

    const newMonthOrdinal = advanceOrdinal(previousMonthOrdinal, args.direction);
    const newMonth = displayNameFromOrdinal(newMonthOrdinal);
    const newRevision = legacy.revision + 1;

    await ctx.db.patch(legacy._id, {
      monthOrdinal: newMonthOrdinal,
      revision: newRevision,
    });

    await ctx.db.insert("events", {
      type: "month_changed",
      revision: newRevision,
      direction: args.direction,
      previousMonthOrdinal,
      newMonthOrdinal,
      previousMonth,
      newMonth,
    });

    return {
      revision: newRevision,
      monthOrdinal: newMonthOrdinal as number,
      month: newMonth,
    };
  },
});
