import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  displayNameFromOrdinal,
  advanceOrdinal,
  INITIAL_MONTH_ORDINAL,
  applyMoveMonth,
  validateCampaignState,
} from "../shared/domain";
import type { CurrentCampaignState, MonthDirection } from "../shared/domain";
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
        .withIndex("by_campaign_revision_index")
        .order("desc")
        .take(args.count);

      return events.map((e) => ({
        _id: e._id,
        revision: e.campaignRevision,
        previousMonth: displayNameFromOrdinal(e.event.data.fromOrdinal),
        newMonth: displayNameFromOrdinal(e.event.data.toOrdinal),
      }));
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
    commandId: v.optional(v.string()),
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
      const currentState = validateCampaignState(maybeCanonical.state);
      const direction = args.direction as MonthDirection;
      const { nextState, events } = applyMoveMonth(currentState, direction);

      const commandId = args.commandId ?? crypto.randomUUID();

      const receipt = await canonicalCommit(ctx, {
        campaignDocId: maybeCanonical._id,
        campaignId: maybeCanonical.campaignId,
        currentRevision: maybeCanonical.campaignRevision,
        currentState,
        commandId,
        commandType: "move_month",
        nextState,
        events,
      });

      return {
        revision: receipt.newRevision,
        monthOrdinal: receipt.state.calendar.monthOrdinal as number,
        month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      };
    }

    let legacy = await ctx.db.query("campaigns").first();

    if (legacy === null) {
      const monthOrdinal = INITIAL_MONTH_ORDINAL;
      const revision = 0;
      const id = await ctx.db.insert("campaigns", {
        monthOrdinal,
        revision,
      });
      legacy = await ctx.db.get(id);
      if (legacy === null) {
        throw new Error("Failed to initialize campaign");
      }
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
