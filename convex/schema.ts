import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  monthDirectionValidator,
  monthDisplayNameValidator,
} from "./validators";

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
