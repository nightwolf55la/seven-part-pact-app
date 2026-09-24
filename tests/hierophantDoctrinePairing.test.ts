import { describe, expect, it } from "vitest";
import { pairedOrdinaryDoctrineState } from "../src/hierophant-view-model";

describe("pairedOrdinaryDoctrineState", () => {
  it("pairs a builtin Doctrine with its catalog Blasphemy and back", () => {
    const pair = pairedOrdinaryDoctrineState(
      { kind: "doctrine", doctrineId: "worth_proved_through_labor" },
      [],
    );
    expect(pair).toEqual({ kind: "blasphemy", blasphemyId: "old_land_demands_blood" });
    expect(pairedOrdinaryDoctrineState(pair!, [])).toEqual({
      kind: "doctrine",
      doctrineId: "worth_proved_through_labor",
    });
  });

  it("does not invent a pair for custom Doctrine without a provided Blasphemy", () => {
    expect(pairedOrdinaryDoctrineState(
      { kind: "doctrine", doctrineId: "hdc_custom" as never },
      [{
        doctrineId: "hdc_custom" as never,
        orthodoxText: "Custom orthodox",
        blasphemy: null,
        supportedClassIds: ["peasant"],
      }],
    )).toBeNull();
  });

  it("pairs campaign Doctrine when the campaign record supplies a Blasphemy", () => {
    expect(pairedOrdinaryDoctrineState(
      { kind: "doctrine", doctrineId: "hdc_custom" as never },
      [{
        doctrineId: "hdc_custom" as never,
        orthodoxText: "Custom orthodox",
        blasphemy: { blasphemyId: "hbl_custom" as never, text: "Custom blasphemy" },
        supportedClassIds: ["peasant"],
      }],
    )).toEqual({ kind: "blasphemy", blasphemyId: "hbl_custom" });
  });
});
