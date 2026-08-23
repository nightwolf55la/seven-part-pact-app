import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const monthDirectionValidator = v.union(
  v.literal("forward"),
  v.literal("backward"),
);

const monthDisplayNameValidator = v.union(
  v.literal("April"),
  v.literal("May"),
  v.literal("June"),
  v.literal("July"),
  v.literal("August"),
  v.literal("September"),
  v.literal("October"),
  v.literal("November"),
  v.literal("December"),
  v.literal("January"),
  v.literal("February"),
  v.literal("March"),
);

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  campaigns: defineTable({
    monthOrdinal: v.number(),
    revision: v.number(),
  }),

  events: defineTable({
    type: v.literal("month_changed"),
    revision: v.number(),
    direction: monthDirectionValidator,
    previousMonthOrdinal: v.number(),
    newMonthOrdinal: v.number(),
    previousMonth: monthDisplayNameValidator,
    newMonth: monthDisplayNameValidator,
  }).index("by_revision", ["revision"]),
});
