import { describe, it, expect } from "vitest";
import {
  parseElementInput,
  parseAgeInput,
  normalizeScalarText,
  parseChangesOfMagic,
  buildCharacterPatch,
  buildNullableAssociationChange,
  buildCurrentCompanionSlots,
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

describe("buildNullableAssociationChange", () => {
  it("same value => null, changed value => { expected, value }", () => {
    expect(buildNullableAssociationChange(null, null)).toBeNull();
    expect(buildNullableAssociationChange("isle_1", "isle_1")).toBeNull();
    expect(buildNullableAssociationChange(null, "isle_1")).toEqual({
      expected: null,
      value: "isle_1",
    });
    expect(buildNullableAssociationChange("isle_1", null)).toEqual({
      expected: "isle_1",
      value: null,
    });
    expect(buildNullableAssociationChange("isle_1", "isle_2")).toEqual({
      expected: "isle_1",
      value: "isle_2",
    });
  });
});

describe("buildCurrentCompanionSlots", () => {
  it("returns four slots ordered air/fire/earth/water with only current relationships for the wizard", () => {
    const WIZARD_ID = "wiz_1";
    const OTHER_WIZARD_ID = "wiz_2";

    const denizens = [
      { denizenId: "den_a", name: "Ash", representation: "individual" as const, description: null },
      { denizenId: "den_b", name: "Brook", representation: "individual" as const, description: null },
      { denizenId: "den_c", name: "Cinder", representation: "individual" as const, description: null },
    ];

    const relationships = [
      { companionRelationshipId: "rel_1", wizardId: WIZARD_ID, element: "air" as const, denizenId: "den_a", description: "Air companion", status: "current" as const },
      { companionRelationshipId: "rel_2", wizardId: WIZARD_ID, element: "air" as const, denizenId: "den_b", description: "Ended air", status: "ended" as const },
      { companionRelationshipId: "rel_3", wizardId: WIZARD_ID, element: "fire" as const, denizenId: "den_c", description: "Fire companion", status: "current" as const },
      { companionRelationshipId: "rel_4", wizardId: OTHER_WIZARD_ID, element: "water" as const, denizenId: "den_a", description: "Other wizard water", status: "current" as const },
    ];

    const slots = buildCurrentCompanionSlots(WIZARD_ID, denizens, relationships);

    expect(slots).toHaveLength(4);
    expect(slots[0].element).toBe("air");
    expect(slots[1].element).toBe("fire");
    expect(slots[2].element).toBe("earth");
    expect(slots[3].element).toBe("water");

    expect(slots[0].relationship).toEqual({
      companionRelationshipId: "rel_1",
      denizenId: "den_a",
      denizenName: "Ash",
      description: "Air companion",
    });
    expect(slots[1].relationship).toEqual({
      companionRelationshipId: "rel_3",
      denizenId: "den_c",
      denizenName: "Cinder",
      description: "Fire companion",
    });
    expect(slots[2].relationship).toBeNull();
    expect(slots[3].relationship).toBeNull();
  });
});
