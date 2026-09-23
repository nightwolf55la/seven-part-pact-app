import { describe, expect, it } from "vitest";
import type { HierophantTemple } from "../shared/domain";
import {
  hierophantSupplicantHostEqual,
  hierophantSupplicantHostFromDrop,
} from "../src/hierophant-supplicant-move";

describe("hierophantSupplicantHostFromDrop", () => {
  const courtyard = { kind: "ordinary", templeId: "krolis" } as HierophantTemple;
  const hestar = { kind: "hestar", templeId: "hestar" } as HierophantTemple;

  it("records ordinary Courtyard and Agiary hosts and Hestar with null area", () => {
    expect(hierophantSupplicantHostFromDrop(courtyard, "courtyard")).toEqual({
      kind: "temple",
      templeId: "krolis",
      area: "courtyard",
    });
    expect(hierophantSupplicantHostFromDrop(courtyard, "agiary")).toEqual({
      kind: "temple",
      templeId: "krolis",
      area: "agiary",
    });
    expect(hierophantSupplicantHostFromDrop(hestar, "hestar")).toEqual({
      kind: "temple",
      templeId: "hestar",
      area: null,
    });
  });

  it("treats a blocked ordinary drop as the same Temple with unresolved area", () => {
    expect(hierophantSupplicantHostFromDrop(courtyard, "blocked")).toEqual({
      kind: "temple",
      templeId: "krolis",
      area: null,
    });
  });
});

describe("hierophantSupplicantHostEqual", () => {
  it("compares temple id and area, including null Hestar area", () => {
    expect(hierophantSupplicantHostEqual(
      { kind: "temple", templeId: "krolis", area: "courtyard" },
      { kind: "temple", templeId: "krolis", area: "courtyard" },
    )).toBe(true);
    expect(hierophantSupplicantHostEqual(
      { kind: "temple", templeId: "krolis", area: "courtyard" },
      { kind: "temple", templeId: "krolis", area: "agiary" },
    )).toBe(false);
    expect(hierophantSupplicantHostEqual(
      { kind: "temple", templeId: "hestar", area: null },
      { kind: "temple", templeId: "hestar", area: null },
    )).toBe(true);
  });
});
