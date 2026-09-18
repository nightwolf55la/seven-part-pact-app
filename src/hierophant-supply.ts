import type { HierophantBuiltinClassId, HierophantTemple } from "../shared/domain";

export const HIEROPHANT_SUPPLY_CLASS_IDS = [
  "peasant",
  "artisan",
  "merchant",
  "gentry",
  "pariah",
] as const satisfies readonly HierophantBuiltinClassId[];

export type HierophantSupplyClassId = (typeof HIEROPHANT_SUPPLY_CLASS_IDS)[number];

export type HierophantSupplyZone = "courtyard" | "agiary" | "hestar" | "blocked";

export const HIEROPHANT_SUPPLY_BLOCKED_REASON =
  "Receive Supplicant is not available at a collapsed Temple";

export type HierophantSupplyDestination =
  | {
      readonly kind: "place";
      readonly templeId: string;
      readonly area: "courtyard" | "agiary" | null;
      readonly highlight: "recommended" | "alternative";
    }
  | {
      readonly kind: "blocked";
      readonly templeId: string;
      readonly reason: string;
      readonly highlight: "reject";
    };

export function resolveHierophantSupplyDestination(
  temple: HierophantTemple,
  zone: HierophantSupplyZone,
): HierophantSupplyDestination | null {
  if (temple.status !== "active") {
    return {
      kind: "blocked",
      templeId: temple.templeId,
      reason: HIEROPHANT_SUPPLY_BLOCKED_REASON,
      highlight: "reject",
    };
  }
  if (temple.kind === "hestar") {
    if (zone !== "hestar") return null;
    return {
      kind: "place",
      templeId: "hestar",
      area: null,
      highlight: "alternative",
    };
  }
  if (zone === "courtyard" || zone === "agiary") {
    return {
      kind: "place",
      templeId: temple.templeId,
      area: zone,
      highlight: "recommended",
    };
  }
  return null;
}
