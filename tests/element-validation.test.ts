import { describe, it, expect } from "vitest";
import {
  parseElementInput,
  validateElementInputs,
} from "../src/wizard-character-sheet-view-model";

describe("validateElementInputs", () => {
  it("all blank => valid, represents null", () => {
    const result = validateElementInputs("", "", "", "");
    expect(result.valid).toBe(true);
    expect(result.value).toBeNull();
  });

  it("one valid value plus blanks => invalid (partial)", () => {
    const result = validateElementInputs("2", "", "", "");
    expect(result.valid).toBe(false);
  });

  it("one nonblank invalid value (1.5) plus blanks => invalid", () => {
    const result = validateElementInputs("1.5", "", "", "");
    expect(result.valid).toBe(false);
  });

  it("four values with one non-integer => invalid", () => {
    const result = validateElementInputs("2", "2", "abc", "2");
    expect(result.valid).toBe(false);
  });

  it("four safe integers including a negative => valid", () => {
    const result = validateElementInputs("-1", "3", "2", "4");
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({ air: -1, fire: 3, earth: 2, water: 4 });
  });

  it("four values with one unsafe large number => invalid", () => {
    const result = validateElementInputs("2", "2", "2", "99999999999999999999");
    expect(result.valid).toBe(false);
  });

  it("whitespace-only is treated as blank", () => {
    const result = validateElementInputs("  ", "  ", "  ", "  ");
    expect(result.valid).toBe(true);
    expect(result.value).toBeNull();
  });

  it("three blanks one value => invalid", () => {
    const result = validateElementInputs("", "", "", "5");
    expect(result.valid).toBe(false);
  });
});

describe("parseElementInput (unchanged behavior)", () => {
  it("blank => null", () => {
    expect(parseElementInput("")).toBeNull();
  });
  it("valid integer => number", () => {
    expect(parseElementInput("3")).toBe(3);
    expect(parseElementInput("-1")).toBe(-1);
  });
  it("non-integer => null", () => {
    expect(parseElementInput("1.5")).toBeNull();
  });
});
