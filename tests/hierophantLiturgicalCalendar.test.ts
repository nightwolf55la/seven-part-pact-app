import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS,
  HIEROPHANT_LITURGICAL_HOLIDAY_IDS,
  type HierophantLiturgicalHolidayDefinition,
} from "../shared/domain";
import { MONTH_IDS, displayNameFromMonthId, type MonthId } from "../shared/domain/calendar";

const ORDINARY_STARTING_TEMPLE_IDS = ["krolis", "notor", "ushin", "zephon"] as const;

function feastDays(
  definitions: readonly HierophantLiturgicalHolidayDefinition[],
): HierophantLiturgicalHolidayDefinition[] {
  return definitions.filter((d) => d.observance.kind === "feast_day");
}

function templeHolidays(
  definitions: readonly HierophantLiturgicalHolidayDefinition[],
): HierophantLiturgicalHolidayDefinition[] {
  return definitions.filter((d) => d.observance.kind === "temple");
}

describe("Hierophant Liturgical Calendar", () => {
  it("defines exactly 16 Holidays with 4 Feast Days and 12 Temple-specific observances", () => {
    expect(HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS).toHaveLength(16);
    expect(feastDays(HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS)).toHaveLength(4);
    expect(templeHolidays(HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS)).toHaveLength(12);
  });

  it("covers every calendar month with at least one Holiday", () => {
    const monthsPresent = new Set(
      HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS.map((d) => d.monthId),
    );
    for (const monthId of MONTH_IDS) {
      expect(monthsPresent.has(monthId)).toBe(true);
    }
  });

  it("encodes the four Feast Days on their source months", () => {
    const feastByName = new Map(
      feastDays(HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS).map((d) => [d.name, d]),
    );
    expect(feastByName.get("Brother's Day")).toMatchObject({
      monthId: "march",
      observance: { kind: "feast_day" },
    });
    expect(feastByName.get("Midsummer Festival")).toMatchObject({
      monthId: "june",
      observance: { kind: "feast_day" },
    });
    expect(feastByName.get("Harvest-End")).toMatchObject({
      monthId: "september",
      observance: { kind: "feast_day" },
    });
    expect(feastByName.get("Midwinter Banquet")).toMatchObject({
      monthId: "december",
      observance: { kind: "feast_day" },
    });
  });

  it("assigns exactly three Temple-specific Holidays to each ordinary starting Temple", () => {
    for (const templeId of ORDINARY_STARTING_TEMPLE_IDS) {
      const count = templeHolidays(HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS).filter(
        (d) => d.observance.kind === "temple" && d.observance.templeId === templeId,
      ).length;
      expect(count).toBe(3);
    }
  });

  it("does not associate any ordinary Holiday with Hestar", () => {
    for (const definition of templeHolidays(HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS)) {
      if (definition.observance.kind !== "temple") continue;
      expect(ORDINARY_STARTING_TEMPLE_IDS).toContain(definition.observance.templeId);
    }
  });

  it("preserves exact source names, months, associations, and descriptions", () => {
    const byName = new Map(
      HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS.map((d) => [d.name, d]),
    );

    const expected: Array<{
      name: string;
      monthId: MonthId;
      observance: HierophantLiturgicalHolidayDefinition["observance"];
      description: string;
    }> = [
      {
        name: "Week of Lights",
        monthId: "january",
        observance: { kind: "temple", templeId: "krolis" },
        description:
          "Week of ten thousand candles, parties in the street across Ishana. Considered the start of the new year by the common folk of Isha.",
      },
      {
        name: "The Serpent's Parade",
        monthId: "february",
        observance: { kind: "temple", templeId: "notor" },
        description:
          "Celebrate the gods' slaying of Ymos, with giant snake floats paraded through the slums.",
      },
      {
        name: "Endnight",
        monthId: "february",
        observance: { kind: "temple", templeId: "zephon" },
        description:
          "The coldest night of the year, stories of the end of the world, many climb up to the Chalk Cliffs to watch the night sky.",
      },
      {
        name: "Saint Innocent's Day",
        monthId: "april",
        observance: { kind: "temple", templeId: "ushin" },
        description:
          "The first prophet's death-day, honored with bouquets of flowers, lapel pins, and extravagant ceremonies reaffirming the King's divine mandate.",
      },
      {
        name: "Galetide",
        monthId: "may",
        observance: { kind: "temple", templeId: "zephon" },
        description:
          "Honoring the four winds, giant woodwind instruments built to play music through nature.",
      },
      {
        name: "Hangman's Day",
        monthId: "may",
        observance: { kind: "temple", templeId: "notor" },
        description:
          "Venerating the patron prophet of thieves and gamblers with fake gold coins, miscreancy, and carousing.",
      },
      {
        name: "Triumpart",
        monthId: "july",
        observance: { kind: "temple", templeId: "ushin" },
        description:
          'The clans each race their finest ship through the bay, the winner ceremonially "marries" the prophet Cassine.',
      },
      {
        name: "Old Api's Fair",
        monthId: "august",
        observance: { kind: "temple", templeId: "krolis" },
        description:
          "Sheep-worshiping festival, mutton, wool, and fine wine across Ishana.",
      },
      {
        name: "Ambolas",
        monthId: "august",
        observance: { kind: "temple", templeId: "zephon" },
        description:
          "Pilgrims traverse the Chalk Cliffs to honor the path walked by the Teacher Edon in his quest to keep the Orthodoxy safe from the violence of the Tragedies.",
      },
      {
        name: "Goblin Night",
        monthId: "october",
        observance: { kind: "temple", templeId: "krolis" },
        description:
          "Scarecrows are dressed up as goblins and demons to scare off the unwelcome dead.",
      },
      {
        name: "Mournival",
        monthId: "november",
        observance: { kind: "temple", templeId: "notor" },
        description:
          "Grieving for the Tragedies and those who have died, families going on pilgrimages to the Graven Isle to leave offerings there.",
      },
      {
        name: "Debutante",
        monthId: "november",
        observance: { kind: "temple", templeId: "ushin" },
        description:
          "Fancy masquerades, bonfires, and elaborate balls held amongst the noble Clans.",
      },
      {
        name: "Brother's Day",
        monthId: "march",
        observance: { kind: "feast_day" },
        description:
          "Commemorates the discovery of Ithax upon the iceberg by his brother Ephris. Celebrated with lots of alcohol, elaborate costumes, and wrestling and duels amongst men.",
      },
      {
        name: "Midsummer Festival",
        monthId: "june",
        observance: { kind: "feast_day" },
        description:
          "Commemorates the creation of life by the two brother-gods. Celebrated with various animal costumes, pageantry, and parades through the streets.",
      },
      {
        name: "Harvest-End",
        monthId: "september",
        observance: { kind: "feast_day" },
        description:
          "Commemorates Ithax's ascent to the heavens to steal fire for mankind, and the shooting star he rode back down to earth. Celebrated with bonfires, picnics, and fire-tossing.",
      },
      {
        name: "Midwinter Banquet",
        monthId: "december",
        observance: { kind: "feast_day" },
        description:
          "Commemorates the gifts of fire, magic, and invention brought to mankind by Ithax. Celebrated with candles, lots of feasting, and ice-skating across the Bay of Ishana.",
      },
    ];

    expect(byName.size).toBe(16);
    for (const entry of expected) {
      const found = byName.get(entry.name);
      expect(found).toBeDefined();
      expect(found?.monthId).toBe(entry.monthId);
      expect(displayNameFromMonthId(found!.monthId)).toBe(
        displayNameFromMonthId(entry.monthId),
      );
      expect(found?.observance).toEqual(entry.observance);
      expect(found?.description).toBe(entry.description);
    }
  });

  it("uses unique application Holiday IDs", () => {
    expect(HIEROPHANT_LITURGICAL_HOLIDAY_IDS).toHaveLength(16);
    expect(new Set(HIEROPHANT_LITURGICAL_HOLIDAY_IDS).size).toBe(16);
    for (const definition of HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS) {
      expect(definition.id).toBeTruthy();
    }
  });

  it("does not introduce automatic holiday behavior in domain transitions", () => {
    const transitionsSource = readFileSync(
      join(process.cwd(), "shared/domain/hierophant-transitions.ts"),
      "utf8",
    );
    expect(transitionsSource).not.toContain("HIEROPHANT_LITURGICAL");
    expect(transitionsSource).not.toContain("Liturgical");
  });
});
