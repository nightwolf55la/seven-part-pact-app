// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { DenizenId } from "../shared/domain";
import type { SorcererExternalPresence, SorcererOrreryHouseMarkerPresentation } from "../shared/domain";
import OrreryView from "../src/OrreryView";
import { buildOrreryResearcherMarkers } from "../src/orrery-view-model";

const POSITIONS = { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 };

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function marker(partial: Partial<SorcererOrreryHouseMarkerPresentation> & {
  name: string;
  house: SorcererOrreryHouseMarkerPresentation["house"];
  operationalThisMonth: boolean;
}): SorcererOrreryHouseMarkerPresentation {
  return {
    kind: "researcher",
    denizenId: partial.denizenId ?? denizenId(1),
    positionId: partial.positionId ?? "srp_orrery_1",
    ...partial,
  };
}

function renderOrrery(researcherMarkers?: readonly SorcererOrreryHouseMarkerPresentation[]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(OrreryView, {
      monthOrdinal: 0,
      orreryPositions: POSITIONS,
      researcherMarkers,
    }));
  });
  return { container, root };
}

describe("Orrery researcher marker presentation", () => {
  it("renders the existing Orrery with no researcher markers", () => {
    const { container, root } = renderOrrery();
    expect(container.querySelector('[aria-label="Orrery showing the 12 Houses, Sun position, and planet Arcs"]')).not.toBeNull();
    expect(container.textContent).toContain("Aries");
    expect(container.textContent).toContain("Saturn");
    expect(container.querySelectorAll('[data-testid^="orrery-researcher-marker-"]').length).toBe(0);
    expect(container.textContent).not.toContain("Research stations");
    root.unmount();
    container.remove();
  });

  it("renders a Working Researcher marker and textual reference", () => {
    const { container, root } = renderOrrery([
      marker({ name: "Ada", house: 0, operationalThisMonth: true }),
    ]);
    const badge = container.querySelector('[data-testid="orrery-researcher-marker-den_00000000-0000-0000-0000-000000000001"]');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("aria-label")).toBe("Researcher Ada in Aries — Working");
    expect(container.textContent).toContain("Research stations");
    expect(container.textContent).toContain("Ada — Aries — Working");
    root.unmount();
    container.remove();
  });

  it("renders an Unavailable Researcher with explicit unavailable-this-month text", () => {
    const { container, root } = renderOrrery([
      marker({
        denizenId: denizenId(2),
        positionId: "srp_orrery_2",
        name: "Beren",
        house: 4,
        operationalThisMonth: false,
      }),
    ]);
    const badge = container.querySelector('[data-testid="orrery-researcher-marker-den_00000000-0000-0000-0000-000000000002"]');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("aria-label")).toBe("Researcher Beren in Leo — Unavailable this month");
    expect(container.textContent).toContain("Beren — Leo — Unavailable this month");
    root.unmount();
    container.remove();
  });

  it("does not render a marker for non-Orrery external presence", () => {
    const presence: readonly SorcererExternalPresence[] = [
      {
        kind: "researcher",
        denizenId: denizenId(2),
        name: "Nim",
        operationalThisMonth: true,
        positionId: "srp_temple_krolis",
        target: { kind: "hierophant_temple", templeId: "krolis" },
      },
      {
        kind: "disruptive_arcanist",
        denizenId: denizenId(15),
        name: "Escaped",
        school: { kind: "source", schoolId: "invocation" },
        seatId: "necromancer",
      },
    ];
    const { container, root } = renderOrrery(buildOrreryResearcherMarkers(presence));
    expect(container.querySelectorAll('[data-testid^="orrery-researcher-marker-"]').length).toBe(0);
    expect(container.textContent).not.toContain("Research stations");
    root.unmount();
    container.remove();
  });

  it("renders two distinguishable markers when two Researchers share a House", () => {
    const { container, root } = renderOrrery([
      marker({
        denizenId: denizenId(1),
        positionId: "srp_orrery_1",
        name: "Ada",
        house: 0,
        operationalThisMonth: true,
      }),
      marker({
        denizenId: denizenId(3),
        positionId: "srp_orrery_3",
        name: "Cora",
        house: 0,
        operationalThisMonth: false,
      }),
    ]);
    const ada = container.querySelector('[data-testid="orrery-researcher-marker-den_00000000-0000-0000-0000-000000000001"]');
    const cora = container.querySelector('[data-testid="orrery-researcher-marker-den_00000000-0000-0000-0000-000000000003"]');
    expect(ada).not.toBeNull();
    expect(cora).not.toBeNull();
    expect(ada?.getAttribute("aria-label")).toBe("Researcher Ada in Aries — Working");
    expect(cora?.getAttribute("aria-label")).toBe("Researcher Cora in Aries — Unavailable this month");
    expect(container.textContent).toContain("Ada — Aries — Working");
    expect(container.textContent).toContain("Cora — Aries — Unavailable this month");
    root.unmount();
    container.remove();
  });
});
