import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  campaigns: defineTable({
    monthOrdinal: v.number(),
    revision: v.number(),
  }),

  events: defineTable({
    type: v.string(),
    revision: v.number(),
    direction: v.string(),
    previousMonthOrdinal: v.number(),
    newMonthOrdinal: v.number(),
    previousMonth: v.string(),
    newMonth: v.string(),
  }).index("by_revision", ["revision"]),
});
