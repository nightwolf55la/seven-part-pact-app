import { describe, it, expect } from "vitest";
import { type HierophantTemple } from "../shared/domain";
import {
  HIEROPHANT_SUPPLY_BLOCKED_REASON,
  HIEROPHANT_SUPPLY_CLASS_IDS,
  HIEROPHANT_SUPPLY_DRAG_MIME,
  beginHierophantSupplyDrag,
  endHierophantSupplyDrag,
  hierophantSupplyDragIsActive,
  liveHierophantSupplyClass,
  readHierophantSupplyDragClass,
  resolveHierophantSupplyDestination,
} from "../src/hierophant-supply";

const PLACE = "plc_00000000-0000-0000-0000-000000000001" as HierophantTemple["placeId"];

describe("Hierophant supply destinations", () => {
  const krolis: HierophantTemple = {
    templeId: "krolis",
    kind: "ordinary",
    placeId: PLACE,
    hostSeatId: "hierophant",
    status: "active",
    abundance: 5,
    conviction: 4,
    doctrine: { kind: "doctrine", doctrineId: "worth_proved_through_labor" },
  };
  const blasphemous: HierophantTemple = {
    ...krolis,
    templeId: "zephon",
    doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
  };
  const collapsed: HierophantTemple = {
    ...krolis,
    templeId: "ushin",
    status: "collapsed",
  };
  const hestar: HierophantTemple = {
    templeId: "hestar",
    kind: "hestar",
    placeId: PLACE,
    hostSeatId: "hierophant",
    status: "active",
    abundance: 4,
    conviction: 5,
  };

  it("keeps the five source Classes in table order", () => {
    expect(HIEROPHANT_SUPPLY_CLASS_IDS).toEqual(["peasant", "artisan", "merchant", "gentry", "pariah"]);
  });

  it("recommends ordinary Courtyard and Agiary, including Blasphemous Temples", () => {
    expect(resolveHierophantSupplyDestination(krolis, "courtyard")).toEqual({
      kind: "place",
      templeId: "krolis",
      area: "courtyard",
      highlight: "recommended",
    });
    expect(resolveHierophantSupplyDestination(blasphemous, "agiary")).toEqual({
      kind: "place",
      templeId: "zephon",
      area: "agiary",
      highlight: "recommended",
    });
    expect(resolveHierophantSupplyDestination(krolis, "hestar")).toBeNull();
  });

  it("places active ordinary and Hestar Supplicants at Temple level through the people zone", () => {
    expect(resolveHierophantSupplyDestination(krolis, "people")).toEqual({
      kind: "place",
      templeId: "krolis",
      area: null,
      highlight: "recommended",
    });
    expect(resolveHierophantSupplyDestination(hestar, "people")).toEqual({
      kind: "place",
      templeId: "hestar",
      area: null,
      highlight: "alternative",
    });
    expect(resolveHierophantSupplyDestination(collapsed, "people")).toEqual({
      kind: "blocked",
      templeId: "ushin",
      reason: HIEROPHANT_SUPPLY_BLOCKED_REASON,
      highlight: "reject",
    });
  });

  it("treats Hestar as a quieter alternative host and collapsed Temples as blocked", () => {
    expect(resolveHierophantSupplyDestination(hestar, "hestar")).toEqual({
      kind: "place",
      templeId: "hestar",
      area: null,
      highlight: "alternative",
    });
    expect(resolveHierophantSupplyDestination(hestar, "courtyard")).toBeNull();
    expect(resolveHierophantSupplyDestination(collapsed, "courtyard")).toEqual({
      kind: "blocked",
      templeId: "ushin",
      reason: HIEROPHANT_SUPPLY_BLOCKED_REASON,
      highlight: "reject",
    });
    expect(resolveHierophantSupplyDestination(collapsed, "blocked")).toMatchObject({ kind: "blocked" });
  });

  it("treats a live supply drag as active from the synchronous Class peek", () => {
    endHierophantSupplyDrag();
    expect(hierophantSupplyDragIsActive(null, () => "peasant", null)).toBe(true);
    expect(hierophantSupplyDragIsActive(null, () => null, null)).toBe(false);
    expect(hierophantSupplyDragIsActive(null, () => null, "artisan")).toBe(true);
    beginHierophantSupplyDrag("gentry");
    expect(liveHierophantSupplyClass()).toBe("gentry");
    expect(hierophantSupplyDragIsActive(null, () => null, null)).toBe(true);
    endHierophantSupplyDrag();
    expect(liveHierophantSupplyClass()).toBeNull();
  });

  it("reads the supply Class from drag data when present", () => {
    const transfer = {
      getData(type: string) {
        if (type === HIEROPHANT_SUPPLY_DRAG_MIME) return "gentry";
        return "";
      },
    } as unknown as DataTransfer;
    expect(readHierophantSupplyDragClass(transfer)).toBe("gentry");
    expect(readHierophantSupplyDragClass({ getData: () => "merchant" } as unknown as DataTransfer)).toBe("merchant");
    expect(readHierophantSupplyDragClass({ getData: () => "not-a-class" } as unknown as DataTransfer)).toBeNull();
  });
});
