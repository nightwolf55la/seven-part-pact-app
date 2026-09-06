// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import AddWizardDialog from "../src/AddWizardDialog";

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

function renderDialog(props: {
  players: { playerId: string; name: string }[];
  pactSeats: Record<string, { wizardId: string | null }>;
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
          pending: false,
          error: null,
          onCreate: () => {},
          onClose: () => {},
        }),
      ),
    );
  });
  const html = container.innerHTML;
  root.unmount();
  container.remove();
  return html;
}

describe("AddWizardDialog portrayal filtering", () => {
  it("does not offer a player already portraying a seated wizard", () => {
    const html = renderDialog({
      players: [
        { playerId: "plr_1", name: "Alice" },
        { playerId: "plr_2", name: "Bob" },
      ],
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

    // The "Portrayed by" select should contain both Alice and Bob
    const portrayedStart = html.indexOf("Portrayed by");
    const portrayedEnd = html.indexOf("</select>", portrayedStart);
    const portrayedSection = html.slice(portrayedStart, portrayedEnd);
    expect(portrayedSection).toContain("Alice");
    expect(portrayedSection).toContain("Bob");
  });

  it("filters out a player portraying a seated wizard when passed filtered players", () => {
    const html = renderDialog({
      players: [
        { playerId: "plr_2", name: "Bob" },
      ],
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

    const portrayedStart = html.indexOf("Portrayed by");
    const portrayedEnd = html.indexOf("</select>", portrayedStart);
    const portrayedSection = html.slice(portrayedStart, portrayedEnd);
    expect(portrayedSection).toContain("Bob");
    expect(portrayedSection).not.toContain("Alice");
  });
});
