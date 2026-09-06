// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

type SeatStatus = "present" | "silent" | "absent" | null;

interface SetupData {
  configuration: { ageId: string | null; facilitatorPlayerId: string | null };
  players: { playerId: string; name: string }[];
  wizards: { wizardId: string; name: string; portrayedByPlayerId: string | null; character: unknown }[];
  pactSeats: Record<string, { status: SeatStatus; wizardId: string | null; watcherPlayerId: string | null }>;
}

const BLANK_CHARACTER = {
  elements: null,
  pactFragmentPersonalForm: null,
  familiarDescription: null,
  ageYears: null,
  publicChangesOfMagic: [],
  importantNotes: null,
  companionDescriptions: { air: null, fire: null, earth: null, water: null },
};

const populatedSetup: SetupData = {
  configuration: { ageId: "awakening", facilitatorPlayerId: "plr_1" },
  players: [
    { playerId: "plr_1", name: "Alice" },
    { playerId: "plr_2", name: "Bob" },
  ],
  wizards: [
    { wizardId: "wiz_1", name: "Merlin", portrayedByPlayerId: "plr_1", character: BLANK_CHARACTER },
  ],
  pactSeats: {
    necromancer: { status: null, wizardId: "wiz_1", watcherPlayerId: null },
    hierophant: { status: null, wizardId: null, watcherPlayerId: null },
    warlock: { status: null, wizardId: null, watcherPlayerId: null },
    mariner: { status: null, wizardId: null, watcherPlayerId: null },
    faustian: { status: null, wizardId: null, watcherPlayerId: null },
    sage: { status: null, wizardId: null, watcherPlayerId: null },
    sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
  },
};

let useQueryImpl: (query: unknown, args: unknown) => typeof undefined | null | SetupData;
let mutationResults: Record<string, (() => Promise<unknown>) | undefined>;

vi.mock("convex/react", () => ({
  useQuery: (query: unknown, args: unknown) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMemo(() => useQueryImpl(query, args), [useQueryImpl]);
  },
  useMutation: (mutationRef: string) => {
    const key = String(mutationRef);
    return (_args: unknown) => {
      const impl = mutationResults[key];
      if (impl) return impl();
      return Promise.resolve();
    };
  },
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
    },
  },
}));

import CampaignSetup from "../src/CampaignSetup";

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

function renderSetup(): { container: HTMLElement; unmount: () => void } {
  useQueryImpl = () => populatedSetup;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(CaptureBoundary, null, createElement(CampaignSetup)));
  });
  flushSync(() => {});
  return {
    container,
    unmount: () => { root.unmount(); container.remove(); },
  };
}

function setNativeValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype
    : el.tagName === "SELECT" ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  const setter = desc?.set;
  if (setter) setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function findButton(container: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = container.querySelectorAll("button");
  for (const b of buttons) {
    if (b.textContent?.trim() === text) return b as HTMLButtonElement;
  }
  return null;
}

function getSheetContainer(container: HTMLElement): HTMLElement | null {
  const h2s = container.querySelectorAll("h2");
  for (const h of h2s) {
    if (h.textContent === "Merlin") return h.closest(".fixed") as HTMLElement;
  }
  return null;
}

function getDialogContainer(container: HTMLElement): HTMLElement | null {
  const h2s = container.querySelectorAll("h2");
  for (const h of h2s) {
    if (h.textContent === "Add Wizard") return h.closest(".fixed") as HTMLElement;
  }
  return null;
}

function getInputByLabel(container: HTMLElement, label: string): HTMLInputElement | null {
  const labels = container.querySelectorAll("label");
  for (const l of labels) {
    if (l.textContent?.trim() === label) {
      const input = l.parentElement?.querySelector("input") as HTMLInputElement | null;
      if (input) return input;
    }
  }
  return null;
}

describe("CampaignSetup modal mutation error handling", () => {
  beforeEach(() => {
    mutationResults = {};
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("failed Add Wizard leaves the dialog open and displays the local error", async () => {
    mutationResults["m3Commands.createWizard"] = () => Promise.reject(new Error("Server boom"));
    const { container, unmount } = renderSetup();

    const addWizardBtn = findButton(container, "Add Wizard")!;
    addWizardBtn.click();
    flushSync(() => {});

    const dialog = getDialogContainer(container)!;
    const nameInput = getInputByLabel(dialog, "Wizard name")!;
    setNativeValue(nameInput, "Gandalf");
    flushSync(() => {});

    const selects = dialog.querySelectorAll("select");
    const seatSelect = Array.from(selects).find((s) => {
      const opts = Array.from(s.options).map((o) => o.textContent);
      return opts.some((t) => t?.includes("Hierophant"));
    })!;
    setNativeValue(seatSelect, "hierophant");
    flushSync(() => {});

    const submitBtn = Array.from(dialog.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Add Wizard",
    )! as HTMLButtonElement;
    submitBtn.click();

    await vi.waitFor(() => {
      flushSync(() => {});
      expect(container.innerHTML).toContain("Server boom");
    });

    expect(container.innerHTML).toContain("Add Wizard");
    unmount();
  });

  it("successful Add Wizard closes the dialog", async () => {
    mutationResults["m3Commands.createWizard"] = () => Promise.resolve();
    const { container, unmount } = renderSetup();

    const addWizardBtn = findButton(container, "Add Wizard")!;
    addWizardBtn.click();
    flushSync(() => {});

    const dialog = getDialogContainer(container)!;
    const nameInput = getInputByLabel(dialog, "Wizard name")!;
    setNativeValue(nameInput, "Gandalf");
    flushSync(() => {});

    const selects = dialog.querySelectorAll("select");
    const seatSelect = Array.from(selects).find((s) => {
      const opts = Array.from(s.options).map((o) => o.textContent);
      return opts.some((t) => t?.includes("Hierophant"));
    })!;
    setNativeValue(seatSelect, "hierophant");
    flushSync(() => {});

    const submitBtn = Array.from(dialog.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Add Wizard",
    )! as HTMLButtonElement;
    submitBtn.click();

    await vi.waitFor(() => {
      flushSync(() => {});
      const dialogAfter = getDialogContainer(container);
      expect(dialogAfter).toBeNull();
    });

    unmount();
  });

  it("failed character save leaves the character sheet open and displays the local error", async () => {
    mutationResults["m3Commands.updateWizardCharacter"] = () =>
      Promise.reject(new Error("Cannot save"));
    const { container, unmount } = renderSetup();

    const charBtn = findButton(container, "Character")!;
    charBtn.click();
    flushSync(() => {});

    const sheet = getSheetContainer(container)!;
    const familiarInput = getInputByLabel(sheet, "Familiar description")!;
    setNativeValue(familiarInput, "Owl");
    flushSync(() => {});

    const saveBtn = Array.from(sheet.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    )! as HTMLButtonElement;
    saveBtn.click();

    await vi.waitFor(() => {
      flushSync(() => {});
      expect(container.innerHTML).toContain("Cannot save");
    });

    expect(container.innerHTML).toContain("Merlin");
    unmount();
  });

  it("successful character save closes the character sheet", async () => {
    mutationResults["m3Commands.updateWizardCharacter"] = () => Promise.resolve();
    const { container, unmount } = renderSetup();

    const charBtn = findButton(container, "Character")!;
    charBtn.click();
    flushSync(() => {});

    const sheet = getSheetContainer(container)!;
    const familiarInput = getInputByLabel(sheet, "Familiar description")!;
    setNativeValue(familiarInput, "Owl");
    flushSync(() => {});

    const saveBtn = Array.from(sheet.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    )! as HTMLButtonElement;
    saveBtn.click();

    await vi.waitFor(() => {
      flushSync(() => {});
      const sheetAfter = getSheetContainer(container);
      expect(sheetAfter).toBeNull();
    });

    unmount();
  });
});
