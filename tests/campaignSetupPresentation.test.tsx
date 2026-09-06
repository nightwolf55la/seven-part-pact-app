// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

type SeatStatus = "present" | "silent" | "absent" | null;

interface SetupData {
  configuration: {
    ageId: string | null;
    facilitatorPlayerId: string | null;
  };
  players: { playerId: string; name: string }[];
  wizards: { wizardId: string; name: string; portrayedByPlayerId: string | null }[];
  pactSeats: Record<string, { status: SeatStatus; wizardId: string | null; watcherPlayerId: string | null }>;
}

const populatedSetup: SetupData = {
  configuration: { ageId: "awakening", facilitatorPlayerId: null },
  players: [
    { playerId: "plr_1", name: "Alice" },
    { playerId: "plr_2", name: "Bob" },
  ],
  wizards: [],
  pactSeats: {
    necromancer: { status: null, wizardId: null, watcherPlayerId: null },
    hierophant: { status: null, wizardId: null, watcherPlayerId: null },
    warlock: { status: null, wizardId: null, watcherPlayerId: null },
    mariner: { status: null, wizardId: null, watcherPlayerId: null },
    faustian: { status: null, wizardId: null, watcherPlayerId: null },
    sage: { status: null, wizardId: null, watcherPlayerId: null },
    sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
  },
};

let useQueryImpl: (query: unknown, args: unknown) => typeof undefined | null | SetupData;

vi.mock("convex/react", () => ({
  useQuery: (query: unknown, args: unknown) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
    },
  },
}));

import CampaignSetup from "../src/CampaignSetup";

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

function renderOnce(data: typeof undefined | null | SetupData): string {
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

describe("CampaignSetup presentation", () => {
  beforeEach(() => {
    useQueryImpl = () => undefined;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders section order: Age -> Players -> Facilitator -> Pact Seats", () => {
    const html = renderOnce(populatedSetup);
    const ageIdx = html.indexOf("Age");
    const playersIdx = html.indexOf("Players");
    const facilitatorIdx = html.indexOf("Facilitator");
    const pactSeatsIdx = html.indexOf("Pact Seats");

    expect(ageIdx).toBeGreaterThanOrEqual(0);
    expect(playersIdx).toBeGreaterThan(ageIdx);
    expect(facilitatorIdx).toBeGreaterThan(playersIdx);
    expect(pactSeatsIdx).toBeGreaterThan(facilitatorIdx);
  });

  it("facilitator empty option says 'Select facilitator...' not 'None'", () => {
    const html = renderOnce(populatedSetup);
    expect(html).toContain("Select facilitator...");
    // The old "None" text should not appear in the facilitator section
    const facilitatorIdx = html.indexOf("Facilitator");
    const pactSeatsIdx = html.indexOf("Pact Seats");
    const facilitatorSection = html.slice(facilitatorIdx, pactSeatsIdx);
    expect(facilitatorSection).not.toContain(">None<");
  });
});
