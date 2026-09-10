// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

type SeatStatus = "present" | "silent" | "absent" | null;

const BLANK_CHARACTER = {
  elements: null,
  pactFragmentPersonalForm: null,
  familiarDescription: null,
  ageYears: null,
  publicChangesOfMagic: [],
  importantNotes: null,
  companionDescriptions: { air: null, fire: null, earth: null, water: null },
};

import { EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE } from "../shared/domain";

interface SetupData {
  campaignId: string;
  configuration: { ageId: string | null; facilitatorPlayerId: string | null };
  players: { playerId: string; name: string }[];
  wizards: { wizardId: string; name: string; portrayedByPlayerId: string | null; character: typeof BLANK_CHARACTER }[];
  pactSeats: Record<string, { status: SeatStatus; wizardId: string | null; watcherPlayerId: string | null }>;
  pactFragmentOperationalState: typeof EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE;
  monthOrdinal: number | null;
  monthDisplayName: string | null;
  orreryPositions: Record<string, number | null>;
  readiness: { ready: true } | { ready: false; issues: { code: string; message: string; seatId: string | null; planetId: string | null }[] };
}

const populatedSetup: SetupData = {
  campaignId: "cmp_1",
  configuration: { ageId: "awakening", facilitatorPlayerId: null },
  players: [
    { playerId: "plr_1", name: "Alice" },
    { playerId: "plr_2", name: "Bob" },
  ],
  wizards: [
    { wizardId: "wiz_1", name: "Zoltan", portrayedByPlayerId: "plr_1", character: BLANK_CHARACTER },
  ],
  pactSeats: {
    necromancer: { status: "present", wizardId: "wiz_1", watcherPlayerId: null },
    hierophant: { status: null, wizardId: null, watcherPlayerId: null },
    warlock: { status: null, wizardId: null, watcherPlayerId: null },
    mariner: { status: null, wizardId: null, watcherPlayerId: null },
    faustian: { status: null, wizardId: null, watcherPlayerId: null },
    sage: { status: null, wizardId: null, watcherPlayerId: null },
    sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
  },
  pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  monthOrdinal: null,
  monthDisplayName: null,
  orreryPositions: {},
  readiness: { ready: false, issues: [] },
};

let useQueryImpl: (query: unknown, args: unknown) => typeof undefined | null | SetupData;

vi.mock("convex/react", () => ({
  useQuery: (query: unknown, args: unknown) => {
    return useMemo(() => useQueryImpl(query, args), [useQueryImpl]);
  },
  useMutation: () => vi.fn(),
}));

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Queries: { getCampaignSetup: "m3Queries.getCampaignSetup" },
    m3Commands: {
      addPlayer: "m3Commands.addPlayer",
      renamePlayer: "m3Commands.renamePlayer",
      removePlayer: "m3Commands.removePlayer",
      setCampaignAge: "m3Commands.setCampaignAge",
      setFacilitator: "m3Commands.setFacilitator",
      createWizard: "m3Commands.createWizard",
      renameWizard: "m3Commands.renameWizard",
      setWizardPortrayal: "m3Commands.setWizardPortrayal",
      setPactSeatWizard: "m3Commands.setPactSeatWizard",
      setPactSeatStatus: "m3Commands.setPactSeatStatus",
      setWatcher: "m3Commands.setWatcher",
      updateWizardCharacter: "m3Commands.updateWizardCharacter",
      setWizardMortalityState: "m3Commands.setWizardMortalityState",
      updatePactFragmentOperationalState: "m3Commands.updatePactFragmentOperationalState",
    },
  },
}));

import CampaignSetup from "../src/CampaignSetup";
import AddWizardDialog from "../src/AddWizardDialog";

interface BoundaryState {
  error: Error | null;
}

class CaptureBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  render() {
    if (this.state.error) {
      return createElement("div", { "data-testid": "boundary-error" }, this.state.error.message);
    }
    return this.props.children;
  }
}

function renderSetup(data: typeof undefined | null | SetupData): string {
  useQueryImpl = () => data;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(
      createElement(CaptureBoundary, null, createElement(CampaignSetup)),
    );
  });
  const html = container.innerHTML;
  root.unmount();
  container.remove();
  return html;
}

function renderDialog(props: {
  players: { playerId: string; name: string }[];
  pactSeats: Record<string, { wizardId: string | null }>;
  pending?: boolean;
  error?: string | null;
  onCreate?: () => void;
  onClose?: () => void;
}): string {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(
      createElement(CaptureBoundary, null,
        createElement(AddWizardDialog, {
          players: props.players,
          pactSeats: props.pactSeats,
          pending: props.pending ?? false,
          error: props.error ?? null,
          onCreate: props.onCreate ?? (() => {}),
          onClose: props.onClose ?? (() => {}),
        }),
      ),
    );
  });
  const html = container.innerHTML;
  root.unmount();
  container.remove();
  return html;
}

describe("CampaignSetup Wizard presentation", () => {
  beforeEach(() => {
    useQueryImpl = () => undefined;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a top-level Add Wizard button", () => {
    const html = renderSetup(populatedSetup);
    expect(html).toContain("Add Wizard");
  });

  it("renders a Wizards section", () => {
    const html = renderSetup(populatedSetup);
    expect(html).toContain("Wizards");
  });

  it("renders a Character Sheet action for modeled wizards", () => {
    const html = renderSetup(populatedSetup);
    expect(html).toContain("Character Sheet");
  });

  it("does not render inline + Create Wizard inside empty Pact-seat rows", () => {
    const html = renderSetup(populatedSetup);
    expect(html).not.toContain("+ Create Wizard");
  });
});

describe("AddWizardDialog presentation", () => {
  it("renders the label 'Initial Pact seat'", () => {
    const html = renderDialog({
      players: [],
      pactSeats: {
        necromancer: { wizardId: null },
        hierophant: { wizardId: null },
        warlock: { wizardId: null },
        mariner: { wizardId: null },
        faustian: { wizardId: null },
        sage: { wizardId: null },
        sorcerer: { wizardId: null },
      },
    });
    expect(html).toContain("Initial Pact seat");
  });

  it("does not include occupied seats in the selectable options", () => {
    const html = renderDialog({
      players: [],
      pactSeats: {
        necromancer: { wizardId: "wiz_1" },
        hierophant: { wizardId: null },
        warlock: { wizardId: null },
        mariner: { wizardId: null },
        faustian: { wizardId: null },
        sage: { wizardId: null },
        sorcerer: { wizardId: null },
      },
    });
    const selectStart = html.indexOf("Initial Pact seat");
    const selectEnd = html.indexOf("</select>", selectStart);
    const selectSection = html.slice(selectStart, selectEnd);
    expect(selectSection).toContain("Hierophant");
    expect(selectSection).not.toContain("Necromancer");
  });

  it("renders 'Wizard name' field", () => {
    const html = renderDialog({
      players: [],
      pactSeats: Object.fromEntries(
        ["necromancer", "hierophant", "warlock", "mariner", "faustian", "sage", "sorcerer"].map(
          (s) => [s, { wizardId: null }],
        ),
      ),
    });
    expect(html).toContain("Wizard name");
  });

  it("renders 'Portrayed by' field", () => {
    const html = renderDialog({
      players: [],
      pactSeats: Object.fromEntries(
        ["necromancer", "hierophant", "warlock", "mariner", "faustian", "sage", "sorcerer"].map(
          (s) => [s, { wizardId: null }],
        ),
      ),
    });
    expect(html).toContain("Portrayed by");
  });
});
