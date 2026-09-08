// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const BLANK_CHARACTER = {
  elements: null,
  pactFragmentPersonalForm: null,
  familiarDescription: null,
  ageYears: null,
  publicChangesOfMagic: [],
  importantNotes: null,
  companionDescriptions: { air: null, fire: null, earth: null, water: null },
};

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Queries: {},
    m3Commands: {
      createWizard: "m3Commands.createWizard",
      updateWizardCharacter: "m3Commands.updateWizardCharacter",
      setWizardHomeIsle: "m3Commands.setWizardHomeIsle",
      setWizardSanctum: "m3Commands.setWizardSanctum",
    },
  },
}));

import TableWizards from "../src/TableWizards";
import type { PlayerRef, WizardRef, SeatRef } from "../src/table-wizards-view-model";

class CaptureBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return createElement("div", { "data-testid": "boundary-error" }, this.state.error.message);
    }
    return this.props.children;
  }
}

function renderTable(props: {
  pactSeats: Record<string, SeatRef>;
  players: PlayerRef[];
  wizards: WizardRef[];
}): string {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(
      createElement(CaptureBoundary, null,
        createElement(TableWizards, { ...props, worldRef: undefined, campaignId: "cmp_00000000-0000-0000-0000-000000000001" }),
      ),
    );
  });
  const html = container.innerHTML;
  root.unmount();
  container.remove();
  return html;
}

const PLAYERS: PlayerRef[] = [
  { playerId: "plr_1", name: "Alice" },
  { playerId: "plr_2", name: "Bob" },
];

const SEATS_WITH_WIZARD: Record<string, SeatRef> = {
  necromancer: { status: "present", wizardId: "wiz_1", watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
};

describe("TableWizards presentation", () => {
  it("renders 'Character Sheet' action for seated wizard", () => {
    const wizards: WizardRef[] = [
      { wizardId: "wiz_1", name: "Zoltan", portrayedByPlayerId: "plr_1", character: BLANK_CHARACTER, homeIsleId: null, sanctumPlaceId: null },
    ];
    const html = renderTable({ pactSeats: SEATS_WITH_WIZARD, players: PLAYERS, wizards });
    expect(html).toContain("Character Sheet");
  });

  it("renders 'Character Sheet' action for unassigned wizard", () => {
    const wizards: WizardRef[] = [
      { wizardId: "wiz_2", name: "Morgaine", portrayedByPlayerId: "plr_2", character: BLANK_CHARACTER, homeIsleId: null, sanctumPlaceId: null },
    ];
    const html = renderTable({ pactSeats: SEATS_WITH_WIZARD, players: PLAYERS, wizards });
    expect(html).toContain("Character Sheet");
  });

  it("renders all four element values inline when present", () => {
    const wizards: WizardRef[] = [
      {
        wizardId: "wiz_1",
        name: "Zoltan",
        portrayedByPlayerId: "plr_1",
        character: { ...BLANK_CHARACTER, elements: { air: 3, fire: 1, earth: 2, water: 2 } },
        homeIsleId: null,
        sanctumPlaceId: null,
      },
    ];
    const html = renderTable({ pactSeats: SEATS_WITH_WIZARD, players: PLAYERS, wizards });
    expect(html).toContain("Air");
    expect(html).toContain("3");
    expect(html).toContain("Fire");
    expect(html).toContain("1");
    expect(html).toContain("Earth");
    expect(html).toContain("2");
    expect(html).toContain("Water");
    expect(html).toContain("2");
  });

  it("renders negative element values inline", () => {
    const wizards: WizardRef[] = [
      {
        wizardId: "wiz_1",
        name: "Zoltan",
        portrayedByPlayerId: "plr_1",
        character: { ...BLANK_CHARACTER, elements: { air: -1, fire: 5, earth: 0, water: -3 } },
        homeIsleId: null,
        sanctumPlaceId: null,
      },
    ];
    const html = renderTable({ pactSeats: SEATS_WITH_WIZARD, players: PLAYERS, wizards });
    expect(html).toContain("-1");
    expect(html).toContain("-3");
  });

  it("renders 'Elements —' when elements are null", () => {
    const wizards: WizardRef[] = [
      { wizardId: "wiz_1", name: "Zoltan", portrayedByPlayerId: "plr_1", character: BLANK_CHARACTER, homeIsleId: null, sanctumPlaceId: null },
    ];
    const html = renderTable({ pactSeats: SEATS_WITH_WIZARD, players: PLAYERS, wizards });
    expect(html).toContain("Elements");
    expect(html).toContain("—");
  });
});
