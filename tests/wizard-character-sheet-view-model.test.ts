import { describe, it, expect } from "vitest";
import {
  parseElementInput,
  parseAgeInput,
  normalizeScalarText,
  parseChangesOfMagic,
  buildCharacterPatch,
  elementsTotal,
  isElementsComplete,
} from "../src/wizard-character-sheet-view-model";
import type { WizardCharacterData } from "../shared/domain/campaign-state";
import { BLANK_WIZARD_CHARACTER } from "../shared/domain/campaign-state";

const BASELINE: WizardCharacterData = {
  ...BLANK_WIZARD_CHARACTER,
};

describe("parseElementInput", () => {
  it("blank string => null", () => {
    expect(parseElementInput("")).toBeNull();
    expect(parseElementInput("  ")).toBeNull();
  });

  it("valid integer string => number", () => {
    expect(parseElementInput("3")).toBe(3);
    expect(parseElementInput("-1")).toBe(-1);
    expect(parseElementInput("0")).toBe(0);
  });

  it("non-integer or unsafe => null", () => {
    expect(parseElementInput("1.5")).toBeNull();
    expect(parseElementInput("abc")).toBeNull();
    expect(parseElementInput("NaN")).toBeNull();
  });
});

describe("isElementsComplete", () => {
  it("all null => false (no elements entered)", () => {
    expect(isElementsComplete(null, null, null, null)).toBe(false);
  });

  it("one entered, rest null => false (partial)", () => {
    expect(isElementsComplete(2, null, null, null)).toBe(false);
  });

  it("all four entered => true", () => {
    expect(isElementsComplete(2, 2, 2, 2)).toBe(true);
  });

  it("all four entered with negatives => true", () => {
    expect(isElementsComplete(-1, 3, 2, 4)).toBe(true);
  });
});

describe("elementsTotal", () => {
  it("null elements => null", () => {
    expect(elementsTotal(null)).toBeNull();
  });

  it("sums all four", () => {
    expect(elementsTotal({ air: 2, fire: 2, earth: 3, water: 1 })).toBe(8);
  });

  it("sums with negatives", () => {
    expect(elementsTotal({ air: -1, fire: 3, earth: 2, water: 4 })).toBe(8);
  });
});

describe("parseAgeInput", () => {
  it("blank => null", () => {
    expect(parseAgeInput("")).toBeNull();
    expect(parseAgeInput("  ")).toBeNull();
  });

  it("valid non-negative integer => number", () => {
    expect(parseAgeInput("42")).toBe(42);
    expect(parseAgeInput("0")).toBe(0);
  });

  it("negative => null (rejected)", () => {
    expect(parseAgeInput("-1")).toBeNull();
  });

  it("non-integer => null", () => {
    expect(parseAgeInput("1.5")).toBeNull();
    expect(parseAgeInput("abc")).toBeNull();
  });
});

describe("normalizeScalarText", () => {
  it("blank/whitespace => null", () => {
    expect(normalizeScalarText("")).toBeNull();
    expect(normalizeScalarText("   ")).toBeNull();
  });

  it("trims and returns non-blank", () => {
    expect(normalizeScalarText("  hello  ")).toBe("hello");
  });

  it("null => null", () => {
    expect(normalizeScalarText(null)).toBeNull();
  });
});

describe("parseChangesOfMagic", () => {
  it("empty textarea => []", () => {
    expect(parseChangesOfMagic("")).toEqual([]);
    expect(parseChangesOfMagic("\n\n")).toEqual([]);
  });

  it("trims each nonblank line", () => {
    expect(parseChangesOfMagic("  Fireball  \n  Ice Storm  ")).toEqual([
      "Fireball",
      "Ice Storm",
    ]);
  });

  it("drops blank lines", () => {
    expect(parseChangesOfMagic("Fireball\n\nIce Storm\n")).toEqual([
      "Fireball",
      "Ice Storm",
    ]);
  });

  it("preserves order", () => {
    expect(parseChangesOfMagic("C\nA\nB")).toEqual(["C", "A", "B"]);
  });

  it("preserves duplicates", () => {
    expect(parseChangesOfMagic("Fireball\nFireball")).toEqual([
      "Fireball",
      "Fireball",
    ]);
  });
});

describe("buildCharacterPatch", () => {
  it("no changes => empty patch", () => {
    const form = {
      elementsAir: "",
      elementsFire: "",
      elementsEarth: "",
      elementsWater: "",
      pactFragmentPersonalForm: "",
      familiarDescription: "",
      ageYears: "",
      publicChangesOfMagic: "",
      importantNotes: "",
    };
    expect(buildCharacterPatch(form, BASELINE)).toBeNull();
  });

  it("changed elements => patch with elements object", () => {
    const form = {
      elementsAir: "2",
      elementsFire: "2",
      elementsEarth: "3",
      elementsWater: "1",
      pactFragmentPersonalForm: "",
      familiarDescription: "",
      ageYears: "",
      publicChangesOfMagic: "",
      importantNotes: "",
    };
    const patch = buildCharacterPatch(form, BASELINE);
    expect(patch).not.toBeNull();
    expect(patch!.elements).toEqual({ air: 2, fire: 2, earth: 3, water: 1 });
    expect(patch!.pactFragmentPersonalForm).toBeUndefined();
  });

  it("all blank elements when baseline has elements => patch with null", () => {
    const baselineWithElements: WizardCharacterData = {
      ...BASELINE,
      elements: { air: 2, fire: 2, earth: 2, water: 2 },
    };
    const form = {
      elementsAir: "",
      elementsFire: "",
      elementsEarth: "",
      elementsWater: "",
      pactFragmentPersonalForm: "",
      familiarDescription: "",
      ageYears: "",
      publicChangesOfMagic: "",
      importantNotes: "",
    };
    const patch = buildCharacterPatch(form, baselineWithElements);
    expect(patch).not.toBeNull();
    expect(patch!.elements).toBeNull();
  });

  it("changed scalar text => patch with normalized text", () => {
    const form = {
      elementsAir: "",
      elementsFire: "",
      elementsEarth: "",
      elementsWater: "",
      pactFragmentPersonalForm: "  wolf  ",
      familiarDescription: "",
      ageYears: "",
      publicChangesOfMagic: "",
      importantNotes: "",
    };
    const patch = buildCharacterPatch(form, BASELINE);
    expect(patch!.pactFragmentPersonalForm).toBe("wolf");
  });

  it("blank scalar text when baseline has value => patch with null", () => {
    const baselineWithNotes: WizardCharacterData = {
      ...BASELINE,
      importantNotes: "old notes",
    };
    const form = {
      elementsAir: "",
      elementsFire: "",
      elementsEarth: "",
      elementsWater: "",
      pactFragmentPersonalForm: "",
      familiarDescription: "",
      ageYears: "",
      publicChangesOfMagic: "",
      importantNotes: "   ",
    };
    const patch = buildCharacterPatch(form, baselineWithNotes);
    expect(patch!.importantNotes).toBeNull();
  });

  it("changed age => patch with age number", () => {
    const form = {
      elementsAir: "",
      elementsFire: "",
      elementsEarth: "",
      elementsWater: "",
      pactFragmentPersonalForm: "",
      familiarDescription: "",
      ageYears: "42",
      publicChangesOfMagic: "",
      importantNotes: "",
    };
    const patch = buildCharacterPatch(form, BASELINE);
    expect(patch!.ageYears).toBe(42);
  });

  it("changed changes of magic => patch with parsed array", () => {
    const form = {
      elementsAir: "",
      elementsFire: "",
      elementsEarth: "",
      elementsWater: "",
      pactFragmentPersonalForm: "",
      familiarDescription: "",
      ageYears: "",
      publicChangesOfMagic: "Fireball\n\nIce Storm",
      importantNotes: "",
    };
    const patch = buildCharacterPatch(form, BASELINE);
    expect(patch!.publicChangesOfMagic).toEqual(["Fireball", "Ice Storm"]);
  });

});
