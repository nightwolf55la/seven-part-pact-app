import { describe, expect, it } from "vitest";
import type {
  CampaignSchoolOfMagicId,
  DenizenId,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  EMPTY_MAGIC_CONSUMABLES_STATE,
  GRIMOIRE_SPELL_DEFINITIONS,
  GRIMOIRE_SPELL_IDS,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_DEFINITIONS,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS,
  SORCERER_BUILTIN_ALCHEMICAL_RECIPE_DEFINITIONS,
  SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS,
  SORCERER_LAW_OF_MAGIC_DEFINITIONS,
  SORCERER_LAW_OF_MAGIC_IDS,
  SORCERER_SOURCE_REAGENT_DEFINITIONS,
  SORCERER_SOURCE_REAGENT_IDS,
  SORCERER_SOURCE_SCHOOL_DEFINITIONS,
  SORCERER_SOURCE_SCHOOL_IDS,
  grimoireSpellDefinition,
  isValidBuiltinPowerfulDenizenTaxonomyId,
  isValidCampaignSchoolOfMagicId,
  isValidGrimoireSpellId,
  isValidSorcererBuiltinAlchemicalRecipeId,
  isValidSorcererLawOfMagicId,
  isValidSorcererSourceReagentId,
  isValidSorcererSourceSchoolId,
  sorcererBuiltinAlchemicalRecipeDefinition,
  sorcererLawOfMagicDefinition,
  sorcererSourceReagentDefinition,
  sorcererSourceSchoolDefinition,
  validateMagicConsumablesStructure,
} from "../shared/domain";

const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const CAMPAIGN_SCHOOL = "ssch_00000000-0000-0000-0000-0000000000aa" as CampaignSchoolOfMagicId;

function expectInvalid(state: unknown, pattern: RegExp): void {
  expect(() => validateMagicConsumablesStructure(state)).toThrow(DomainError);
  try {
    validateMagicConsumablesStructure(state);
  } catch (error) {
    expect((error as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    expect((error as DomainError).message).toMatch(pattern);
  }
}

describe("Sorcerer source Schools of Magic", () => {
  it("defines exactly eight source Schools with stable IDs, display names, and glyphs", () => {
    expect([...SORCERER_SOURCE_SCHOOL_IDS]).toEqual([
      "enchantment",
      "metamorphosis",
      "oneirism",
      "divination",
      "apotropaism",
      "thaumaturgy",
      "invocation",
      "artifice",
    ]);
    expect(SORCERER_SOURCE_SCHOOL_DEFINITIONS).toEqual([
      { schoolId: "enchantment", name: "Enchantment", glyph: "χ" },
      { schoolId: "metamorphosis", name: "Metamorphosis", glyph: "μ" },
      { schoolId: "oneirism", name: "Oneirism", glyph: "ω" },
      { schoolId: "divination", name: "Divination", glyph: "δ" },
      { schoolId: "apotropaism", name: "Apotropaism", glyph: "φ" },
      { schoolId: "thaumaturgy", name: "Thaumaturgy", glyph: "θ" },
      { schoolId: "invocation", name: "Invocation", glyph: "ν" },
      { schoolId: "artifice", name: "Artifice", glyph: "α" },
    ]);
    for (const schoolId of SORCERER_SOURCE_SCHOOL_IDS) {
      expect(isValidSorcererSourceSchoolId(schoolId)).toBe(true);
      expect(sorcererSourceSchoolDefinition(schoolId).schoolId).toBe(schoolId);
      expect(schoolId).not.toBe(sorcererSourceSchoolDefinition(schoolId).name);
    }
    expect(isValidSorcererSourceSchoolId("Enchantment")).toBe(false);
    expect(isValidSorcererSourceSchoolId("unknown")).toBe(false);
  });
});

describe("Sorcerer source Laws of Magic", () => {
  it("defines seven untitled source Laws with ordinal IDs and application labels", () => {
    expect([...SORCERER_LAW_OF_MAGIC_IDS]).toEqual([
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
      "seventh",
    ]);
    expect(SORCERER_LAW_OF_MAGIC_DEFINITIONS.map((d) => d.applicationLabel)).toEqual([
      "First Law of Magic",
      "Second Law of Magic",
      "Third Law of Magic",
      "Fourth Law of Magic",
      "Fifth Law of Magic",
      "Sixth Law of Magic",
      "Seventh Law of Magic",
    ]);
    expect(SORCERER_LAW_OF_MAGIC_DEFINITIONS.map((d) => d.text)).toEqual([
      "Magic requires oral recitation/chants.",
      "Magic requires rare tinctures/reagents/materials.",
      "Magic requires the Wizard's Familiar.",
      "Magic requires a wand/staff/gemstone/mask/other casting implement.",
      "Magic requires runes/circles/geometric texts.",
      "Magic is channeled through the body, requiring appropriate mental/physical readiness and free gesturing.",
      "Magic must be kept from mundane humans.",
    ]);
    for (const lawId of SORCERER_LAW_OF_MAGIC_IDS) {
      expect(isValidSorcererLawOfMagicId(lawId)).toBe(true);
      expect(sorcererLawOfMagicDefinition(lawId).id).toBe(lawId);
    }
    expect(isValidSorcererLawOfMagicId("oral_recitation")).toBe(false);
  });

  it("does not encode a static global 'exactly two selected Laws' rule", () => {
    expect(SORCERER_LAW_OF_MAGIC_IDS).toHaveLength(7);
    expect(isValidSorcererLawOfMagicId("first")).toBe(true);
    expect(isValidSorcererLawOfMagicId("seventh")).toBe(true);
  });
});

describe("Sorcerer source Reagents", () => {
  it("defines ten source Reagents with stable IDs and glyphs", () => {
    expect([...SORCERER_SOURCE_REAGENT_IDS]).toEqual([
      "salt",
      "tin",
      "iron",
      "copper",
      "mercury",
      "silver",
      "lead",
      "aluminum",
      "sulfur",
      "gold",
    ]);
    expect(SORCERER_SOURCE_REAGENT_DEFINITIONS).toEqual([
      { reagentId: "salt", name: "Salt", glyph: "⊖" },
      { reagentId: "tin", name: "Tin", glyph: "♃" },
      { reagentId: "iron", name: "Iron", glyph: "♂" },
      { reagentId: "copper", name: "Copper", glyph: "♀" },
      { reagentId: "mercury", name: "Mercury", glyph: "☿" },
      { reagentId: "silver", name: "Silver", glyph: "☾" },
      { reagentId: "lead", name: "Lead", glyph: "♄" },
      { reagentId: "aluminum", name: "Aluminum", glyph: "♆" },
      { reagentId: "sulfur", name: "Sulfur", glyph: "🜍" },
      { reagentId: "gold", name: "Gold", glyph: "☉" },
    ]);
    for (const reagentId of SORCERER_SOURCE_REAGENT_IDS) {
      expect(isValidSorcererSourceReagentId(reagentId)).toBe(true);
      expect(sorcererSourceReagentDefinition(reagentId).reagentId).toBe(reagentId);
    }
    expect(isValidSorcererSourceReagentId("Salt")).toBe(false);
  });
});

describe("Sorcerer built-in Alchemical Recipes", () => {
  it("defines nine source recipes with stable identity and narrow output metadata", () => {
    expect([...SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS]).toEqual([
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
      "seventh",
      "eighth",
      "ninth",
    ]);
    expect(SORCERER_BUILTIN_ALCHEMICAL_RECIPE_DEFINITIONS.map((d) => ({
      recipeId: d.recipeId,
      sourceDescription: d.sourceDescription,
      outputReagentIds: [...d.outputReagentIds],
    }))).toEqual([
      { recipeId: "first", sourceDescription: "2 Knowledge -> Salt", outputReagentIds: ["salt"] },
      { recipeId: "second", sourceDescription: "2 Salt -> Tin + Lead", outputReagentIds: ["tin", "lead"] },
      { recipeId: "third", sourceDescription: "2 Tin -> Iron", outputReagentIds: ["iron"] },
      { recipeId: "fourth", sourceDescription: "2 Tin -> Copper", outputReagentIds: ["copper"] },
      { recipeId: "fifth", sourceDescription: "Copper + Iron + Tin -> Mercury", outputReagentIds: ["mercury"] },
      { recipeId: "sixth", sourceDescription: "Tome + Tin -> Silver", outputReagentIds: ["silver"] },
      { recipeId: "seventh", sourceDescription: "Tome + Silver + Copper -> Aluminum", outputReagentIds: ["aluminum"] },
      { recipeId: "eighth", sourceDescription: "Student + Lead + Salt -> Sulfur", outputReagentIds: ["sulfur"] },
      {
        recipeId: "ninth",
        sourceDescription: "Sulfur + Aluminum + Lead + Silver + Mercury + Copper + Iron + Tin -> Gold",
        outputReagentIds: ["gold"],
      },
    ]);
    for (const recipeId of SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS) {
      expect(isValidSorcererBuiltinAlchemicalRecipeId(recipeId)).toBe(true);
      const definition = sorcererBuiltinAlchemicalRecipeDefinition(recipeId);
      expect(definition.recipeId).toBe(recipeId);
      expect(definition.applicationLabel).toMatch(/Alchemical Recipe$/);
      expect("execute" in definition).toBe(false);
      expect("ingredients" in definition).toBe(false);
    }
  });
});

describe("Static Grimoire spell-reference catalog", () => {
  const GREAT_WORKS = [
    { spellId: "apotheosis", name: "Apotheosis", schoolId: "enchantment" },
    { spellId: "titanomachy", name: "Titanomachy", schoolId: "metamorphosis" },
    { spellId: "egophagy", name: "Egophagy", schoolId: "oneirism" },
    { spellId: "prophecy", name: "Prophecy", schoolId: "divination" },
    { spellId: "annihilation", name: "Annihilation", schoolId: "apotropaism" },
    { spellId: "demiurgy", name: "Demiurgy", schoolId: "thaumaturgy" },
    { spellId: "pestilence", name: "Pestilence", schoolId: "invocation" },
    { spellId: "anthropogenesis", name: "Anthropogenesis", schoolId: "artifice" },
  ] as const;

  it("covers all eight Schools with unique IDs and the complete Draft-4 inventory", () => {
    expect(GRIMOIRE_SPELL_IDS).toHaveLength(58);
    expect(GRIMOIRE_SPELL_DEFINITIONS).toHaveLength(58);
    expect([...GRIMOIRE_SPELL_IDS]).toEqual(GRIMOIRE_SPELL_DEFINITIONS.map((d) => d.spellId));
    expect(new Set(GRIMOIRE_SPELL_IDS).size).toBe(58);

    const schools = new Set(GRIMOIRE_SPELL_DEFINITIONS.map((d) => d.schoolId));
    expect([...schools].sort()).toEqual([...SORCERER_SOURCE_SCHOOL_IDS].sort());

    for (const definition of GRIMOIRE_SPELL_DEFINITIONS) {
      expect(isValidGrimoireSpellId(definition.spellId)).toBe(true);
      expect(isValidSorcererSourceSchoolId(definition.schoolId)).toBe(true);
      expect(grimoireSpellDefinition(definition.spellId)).toEqual(definition);
      expect(definition.spellId.includes(" ")).toBe(false);
    }
    expect(isValidGrimoireSpellId("Hand of Power")).toBe(false);
    expect(GRIMOIRE_SPELL_DEFINITIONS.some((d) => d.name === "The Creation of Transports")).toBe(true);
    expect(GRIMOIRE_SPELL_DEFINITIONS.some((d) => d.name === "Creation of Transportation")).toBe(false);
  });

  it("flags exactly one Great Work per source School, matching the Draft-4 Great Works", () => {
    const greatWorks = GRIMOIRE_SPELL_DEFINITIONS.filter((d) => d.isGreatWork);
    expect(greatWorks).toHaveLength(8);
    expect(greatWorks.map((d) => ({ spellId: d.spellId, name: d.name, schoolId: d.schoolId }))).toEqual(
      GREAT_WORKS.map((d) => ({ ...d })),
    );
    for (const schoolId of SORCERER_SOURCE_SCHOOL_IDS) {
      expect(GRIMOIRE_SPELL_DEFINITIONS.filter((d) => d.schoolId === schoolId && d.isGreatWork)).toHaveLength(1);
    }
  });
});

describe("Powerful-Denizen Sorcerer taxonomies", () => {
  it("adds Arcanist, Construct, and Witch as builtin taxonomies with source definitions", () => {
    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).toEqual(expect.arrayContaining([
      "arcanist",
      "construct",
      "witch",
    ]));
    expect(isValidBuiltinPowerfulDenizenTaxonomyId("arcanist")).toBe(true);
    expect(isValidBuiltinPowerfulDenizenTaxonomyId("construct")).toBe(true);
    expect(isValidBuiltinPowerfulDenizenTaxonomyId("witch")).toBe(true);

    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_DEFINITIONS).toEqual(
      expect.arrayContaining([
        { taxonomyId: "arcanist", name: "Arcanist", description: null },
        { taxonomyId: "construct", name: "Construct", description: null },
        { taxonomyId: "witch", name: "Witch", description: null },
      ]),
    );

    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).toEqual(expect.arrayContaining([
      "ghoul_caller",
      "prophet",
      "cult",
      "beast",
      "foe_of_death",
      "conspiracy",
      "occultist",
      "demon",
      "fairy",
      "druid",
      "angel",
      "errant_noble",
      "army",
      "hero",
    ]));
    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).toHaveLength(17);
  });
});

describe("Shared Tome/Reagent magic consumables", () => {
  it("exports empty default state and accepts it", () => {
    expect(EMPTY_MAGIC_CONSUMABLES_STATE).toEqual({ tomes: [], reagents: [] });
    expect(() => validateMagicConsumablesStructure(EMPTY_MAGIC_CONSUMABLES_STATE)).not.toThrow();
  });

  it("accepts fungible stacks keyed by School/Reagent plus custody, including campaign School refs", () => {
    expect(isValidCampaignSchoolOfMagicId(CAMPAIGN_SCHOOL)).toBe(true);
    expect(isValidCampaignSchoolOfMagicId("enchantment")).toBe(false);

    const state = {
      tomes: [
        {
          school: { kind: "source" as const, schoolId: "enchantment" as const },
          custody: { kind: "sorcerer_tower" as const },
          count: 2,
        },
        {
          school: { kind: "campaign" as const, schoolId: CAMPAIGN_SCHOOL },
          custody: { kind: "subject" as const, subject: { kind: "wizard" as const, wizardId: WIZ_A } },
          count: 1,
        },
        {
          school: { kind: "source" as const, schoolId: "artifice" as const },
          custody: { kind: "subject" as const, subject: { kind: "denizen" as const, denizenId: DEN_1 } },
          count: 4,
        },
      ],
      reagents: [
        {
          reagentId: "salt" as const,
          custody: { kind: "sorcerer_tower" as const },
          count: 3,
        },
        {
          reagentId: "gold" as const,
          custody: { kind: "subject" as const, subject: { kind: "denizen" as const, denizenId: DEN_1 } },
          count: 1,
        },
      ],
    };
    expect(() => validateMagicConsumablesStructure(state)).not.toThrow();
  });

  it("rejects zero/negative/non-finite counts and represents absence by omitting the stack", () => {
    expectInvalid({
      tomes: [{
        school: { kind: "source", schoolId: "enchantment" },
        custody: { kind: "sorcerer_tower" },
        count: 0,
      }],
      reagents: [],
    }, /positive safe integer/);
    expectInvalid({
      tomes: [],
      reagents: [{
        reagentId: "salt",
        custody: { kind: "sorcerer_tower" },
        count: -1,
      }],
    }, /positive safe integer/);
    expectInvalid({
      tomes: [{
        school: { kind: "source", schoolId: "enchantment" },
        custody: { kind: "sorcerer_tower" },
        count: 1.5,
      }],
      reagents: [],
    }, /positive safe integer/);
    expectInvalid({
      tomes: [{
        school: { kind: "source", schoolId: "enchantment" },
        custody: { kind: "sorcerer_tower" },
        count: Number.POSITIVE_INFINITY,
      }],
      reagents: [],
    }, /positive safe integer/);
  });

  it("rejects duplicate logical stacks and unsupported custody or identity", () => {
    expectInvalid({
      tomes: [
        {
          school: { kind: "source", schoolId: "enchantment" },
          custody: { kind: "sorcerer_tower" },
          count: 1,
        },
        {
          school: { kind: "source", schoolId: "enchantment" },
          custody: { kind: "sorcerer_tower" },
          count: 2,
        },
      ],
      reagents: [],
    }, /duplicate/i);
    expectInvalid({
      tomes: [],
      reagents: [
        { reagentId: "tin", custody: { kind: "sorcerer_tower" }, count: 1 },
        { reagentId: "tin", custody: { kind: "sorcerer_tower" }, count: 4 },
      ],
    }, /duplicate/i);
    expectInvalid({
      tomes: [{
        school: { kind: "source", schoolId: "enchantment" },
        custody: { kind: "place", placeId: "plc_00000000-0000-0000-0000-000000000001" },
        count: 1,
      }],
      reagents: [],
    }, /custody/);
    expectInvalid({
      tomes: [{
        school: { kind: "source", schoolId: "not_a_school" },
        custody: { kind: "sorcerer_tower" },
        count: 1,
      }],
      reagents: [],
    }, /school/);
    expectInvalid({
      tomes: [],
      reagents: [{
        reagentId: "vitriol",
        custody: { kind: "sorcerer_tower" },
        count: 1,
      }],
    }, /reagent/);
  });

  it("does not require a magic-user taxonomy on Denizen holders", () => {
    const state = {
      tomes: [{
        school: { kind: "source" as const, schoolId: "divination" as const },
        custody: {
          kind: "subject" as const,
          subject: { kind: "denizen" as const, denizenId: DEN_1 },
        },
        count: 1,
      }],
      reagents: [{
        reagentId: "mercury" as const,
        custody: {
          kind: "subject" as const,
          subject: { kind: "denizen" as const, denizenId: DEN_1 },
        },
        count: 2,
      }],
    };
    expect(() => validateMagicConsumablesStructure(state)).not.toThrow();
  });
});
