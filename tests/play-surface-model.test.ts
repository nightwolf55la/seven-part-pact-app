import { describe, it, expect } from "vitest";
import {
  initPlaySurface,
  navigateSurface,
  goBack,
  goForward,
  canGoBack,
  canGoForward,
  promoteSecondary,
  toggleSecondary,
  phaseDefaultLayout,
} from "../src/play-surface-model";

describe("phaseDefaultLayout", () => {
  it("new_moon -> primary orrery, secondary current_phase", () => {
    const l = phaseDefaultLayout("new_moon");
    expect(l.primary).toBe("orrery");
    expect(l.secondary).toBe("current_phase");
  });
  it("planning -> primary current_phase, secondary orrery", () => {
    const l = phaseDefaultLayout("planning");
    expect(l.primary).toBe("current_phase");
    expect(l.secondary).toBe("orrery");
  });
  it("story -> primary current_phase, secondary table_wizards", () => {
    const l = phaseDefaultLayout("story");
    expect(l.primary).toBe("current_phase");
    expect(l.secondary).toBe("table_wizards");
  });
  it("quiet -> primary current_phase, secondary orrery", () => {
    const l = phaseDefaultLayout("quiet");
    expect(l.primary).toBe("current_phase");
    expect(l.secondary).toBe("orrery");
  });
});

describe("navigate -> Back -> Forward", () => {
  it("navigates primary pane and restores via back/forward", () => {
    let s = initPlaySurface("new_moon");
    expect(s.primary.current).toBe("orrery");
    s = navigateSurface(s, "primary", "table_wizards");
    expect(s.primary.current).toBe("table_wizards");
    s = goBack(s, "primary");
    expect(s.primary.current).toBe("orrery");
    s = goForward(s, "primary");
    expect(s.primary.current).toBe("table_wizards");
  });
});

describe("forward truncation", () => {
  it("navigating after back truncates forward history", () => {
    let s = initPlaySurface("new_moon");
    s = navigateSurface(s, "primary", "table_wizards");
    s = navigateSurface(s, "primary", "current_phase");
    s = goBack(s, "primary");
    s = goBack(s, "primary");
    expect(s.primary.current).toBe("orrery");
    expect(canGoForward(s.primary)).toBe(true);
    s = navigateSurface(s, "primary", "table_wizards");
    expect(canGoForward(s.primary)).toBe(false);
    expect(s.primary.current).toBe("table_wizards");
  });
});

describe("independent pane history", () => {
  it("primary and secondary histories are independent", () => {
    let s = initPlaySurface("new_moon");
    s = navigateSurface(s, "primary", "table_wizards");
    s = navigateSurface(s, "secondary", "table_wizards");
    expect(s.primary.current).toBe("table_wizards");
    expect(s.secondary!.current).toBe("table_wizards");
    s = goBack(s, "primary");
    expect(s.primary.current).toBe("orrery");
    expect(s.secondary!.current).toBe("table_wizards");
    s = goBack(s, "secondary");
    expect(s.secondary!.current).toBe("current_phase");
    expect(s.primary.current).toBe("orrery");
  });
});

describe("promote secondary to primary", () => {
  it("promotes secondary surface as primary full-width", () => {
    let s = initPlaySurface("new_moon");
    s = navigateSurface(s, "secondary", "table_wizards");
    s = promoteSecondary(s);
    expect(s.primary.current).toBe("table_wizards");
    expect(s.showSecondary).toBe(false);
    expect(s.fullWidth).toBe(true);
  });
});

describe("toggle secondary", () => {
  it("toggles showSecondary and clears fullWidth", () => {
    let s = initPlaySurface("new_moon");
    expect(s.showSecondary).toBe(true);
    s = toggleSecondary(s);
    expect(s.showSecondary).toBe(false);
    expect(s.fullWidth).toBe(false);
    s = toggleSecondary(s);
    expect(s.showSecondary).toBe(true);
  });
});

describe("hierophant surface navigation", () => {
  it("accepts Hierophant as a navigable surface without changing phase defaults", () => {
    const planning = phaseDefaultLayout("planning");
    expect(planning.primary).toBe("current_phase");
    expect(planning.secondary).toBe("orrery");
    let s = initPlaySurface("planning");
    s = navigateSurface(s, "primary", "hierophant");
    expect(s.primary.current).toBe("hierophant");
    s = navigateSurface(s, "secondary", "hierophant");
    expect(s.secondary!.current).toBe("hierophant");
    s = goBack(s, "primary");
    expect(s.primary.current).toBe("current_phase");
    expect(s.secondary!.current).toBe("hierophant");
    s = goForward(s, "primary");
    expect(s.primary.current).toBe("hierophant");
    s = promoteSecondary(s);
    expect(s.primary.current).toBe("hierophant");
  });
});

describe("mariner surface navigation", () => {
  it("accepts Mariner as a navigable surface without changing phase defaults", () => {
    const planning = phaseDefaultLayout("planning");
    expect(planning.primary).toBe("current_phase");
    expect(planning.secondary).toBe("orrery");
    const story = phaseDefaultLayout("story");
    expect(story.primary).toBe("current_phase");
    expect(story.secondary).toBe("table_wizards");
    const quiet = phaseDefaultLayout("quiet");
    expect(quiet.primary).toBe("current_phase");
    expect(quiet.secondary).toBe("orrery");
    let s = initPlaySurface("planning");
    s = navigateSurface(s, "primary", "mariner");
    expect(s.primary.current).toBe("mariner");
    s = navigateSurface(s, "secondary", "mariner");
    expect(s.secondary!.current).toBe("mariner");
    s = goBack(s, "primary");
    expect(s.primary.current).toBe("current_phase");
    expect(s.secondary!.current).toBe("mariner");
  });
});

describe("necromancer surface navigation", () => {
  it("accepts Necromancer as a navigable surface without changing phase defaults", () => {
    const planning = phaseDefaultLayout("planning");
    expect(planning.primary).toBe("current_phase");
    expect(planning.secondary).toBe("orrery");
    const story = phaseDefaultLayout("story");
    expect(story.primary).toBe("current_phase");
    expect(story.secondary).toBe("table_wizards");
    const quiet = phaseDefaultLayout("quiet");
    expect(quiet.primary).toBe("current_phase");
    expect(quiet.secondary).toBe("orrery");
    let s = initPlaySurface("planning");
    s = navigateSurface(s, "primary", "necromancer");
    expect(s.primary.current).toBe("necromancer");
    s = navigateSurface(s, "secondary", "necromancer");
    expect(s.secondary!.current).toBe("necromancer");
    s = goBack(s, "primary");
    expect(s.primary.current).toBe("current_phase");
    expect(s.secondary!.current).toBe("necromancer");
  });
});

describe("no campaign state in model", () => {
  it("PlaySurfaceState contains only surface IDs and history", () => {
    const s = initPlaySurface("story");
    const json = JSON.stringify(s);
    expect(json).not.toContain("campaignId");
    expect(json).not.toContain("monthOrdinal");
    expect(json).not.toContain("campaignRevision");
    expect(json).not.toContain('"players"');
    expect(json).not.toContain('"pactSeats"');
    expect(json).not.toContain('"orrery"');
  });
});
