import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  monthNameFromOrdinal,
  nextOrdinal,
  previousOrdinal,
} from "./monthLogic";

export const getCampaign = query({
  args: {},
  handler: async (ctx) => {
    const campaign = await ctx.db.query("campaigns").first();
    return campaign ?? null;
  },
});

export const getRecentEvents = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const events = await ctx.db.query("events").order("desc").take(args.count);
    return events;
  },
});

export const moveMonth = mutation({
  args: {
    direction: v.union(v.literal("forward"), v.literal("backward")),
  },
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
    const previousMonth = monthNameFromOrdinal(previousMonthOrdinal);

    const newMonthOrdinal =
      args.direction === "forward"
        ? nextOrdinal(previousMonthOrdinal)
        : previousOrdinal(previousMonthOrdinal);

    const newMonth = monthNameFromOrdinal(newMonthOrdinal);
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
      monthOrdinal: newMonthOrdinal,
      month: newMonth,
    };
  },
});
