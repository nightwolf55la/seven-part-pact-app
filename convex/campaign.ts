import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  displayNameFromOrdinal,
  advanceOrdinal,
  MONTH_DISPLAY_NAMES,
} from "../shared/domain";

const monthDirectionValidator = v.union(
  v.literal("forward"),
  v.literal("backward"),
);

const monthDisplayNameValidator = v.union(
  ...MONTH_DISPLAY_NAMES.map((name) => v.literal(name)),
);

export const getCampaign = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("campaigns"),
      _creationTime: v.number(),
      monthOrdinal: v.number(),
      revision: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const campaign = await ctx.db.query("campaigns").first();
    return campaign ?? null;
  },
});

export const getRecentEvents = query({
  args: { count: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      type: v.literal("month_changed"),
      revision: v.number(),
      direction: monthDirectionValidator,
      previousMonthOrdinal: v.number(),
      newMonthOrdinal: v.number(),
      previousMonth: monthDisplayNameValidator,
      newMonth: monthDisplayNameValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const events = await ctx.db.query("events").order("desc").take(args.count);
    return events;
  },
});

export const moveMonth = mutation({
  args: {
    direction: monthDirectionValidator,
  },
  returns: v.object({
    revision: v.number(),
    monthOrdinal: v.number(),
    month: monthDisplayNameValidator,
  }),
  handler: async (ctx, args) => {
    let campaign = await ctx.db.query("campaigns").first();

    if (campaign === null) {
      const monthOrdinal = 0;
      const revision = 0;
      const id = await ctx.db.insert("campaigns", {
        monthOrdinal,
        revision,
      });
      campaign = await ctx.db.get(id);
      if (campaign === null) {
        throw new Error("Failed to initialize campaign");
      }
    }

    const previousMonthOrdinal = campaign.monthOrdinal;
    const previousMonth = displayNameFromOrdinal(previousMonthOrdinal);

    const newMonthOrdinal = advanceOrdinal(previousMonthOrdinal, args.direction);
    const newMonth = displayNameFromOrdinal(newMonthOrdinal);
    const newRevision = campaign.revision + 1;

    await ctx.db.patch(campaign._id, {
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
