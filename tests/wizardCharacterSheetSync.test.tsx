// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import WizardCharacterSheet from "../src/WizardCharacterSheet";
import type { WizardCharacterData } from "../shared/domain/campaign-state";
import { BLANK_WIZARD_CHARACTER } from "../shared/domain/campaign-state";

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

function renderSheet(props: {
  character: WizardCharacterData;
  onSave?: (patch: Record<string, unknown>) => void;
  onClose?: () => void;
  pending?: boolean;
  error?: string | null;
  homeIsleId?: string | null;
  sanctumPlaceId?: string | null;
  worldRef?: unknown;
  onSetHomeIsle?: (change: { expected: string | null; value: string | null }) => Promise<void>;
  onSetSanctum?: (change: { expected: string | null; value: string | null }) => Promise<void>;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let currentCharacter = props.character;
  let currentOnSave = props.onSave ?? (() => {});
  let currentOnClose = props.onClose ?? (() => {});
  let currentPending = props.pending ?? false;
  let currentError = props.error ?? null;
  let currentHomeIsleId = props.homeIsleId ?? null;
  let currentSanctumPlaceId = props.sanctumPlaceId ?? null;
  let currentWorldRef = props.worldRef;
  let currentOnSetHomeIsle = props.onSetHomeIsle;
  let currentOnSetSanctum = props.onSetSanctum;

  const rerender = (next: {
    character?: WizardCharacterData;
    onSave?: (patch: Record<string, unknown>) => void;
    onClose?: () => void;
    pending?: boolean;
    error?: string | null;
  }) => {
    if (next.character !== undefined) currentCharacter = next.character;
    if (next.onSave !== undefined) currentOnSave = next.onSave;
    if (next.onClose !== undefined) currentOnClose = next.onClose;
    if (next.pending !== undefined) currentPending = next.pending;
    if (next.error !== undefined) currentError = next.error;
    flushSync(() => {
      root.render(
        createElement(CaptureBoundary, null,
          createElement(WizardCharacterSheet, {
            wizardId: "wiz_1",
            wizardName: "Test Wizard",
            character: currentCharacter,
            pending: currentPending,
            error: currentError,
            onSave: currentOnSave,
            onClose: currentOnClose,
            homeIsleId: currentHomeIsleId,
            sanctumPlaceId: currentSanctumPlaceId,
            worldRef: currentWorldRef as any,
            onSetHomeIsle: currentOnSetHomeIsle as any,
            onSetSanctum: currentOnSetSanctum as any,
          }),
        ),
      );
    });
    // The effect's setForm may schedule a follow-up render; flush it.
    flushSync(() => {});
  };

  flushSync(() => {
    root.render(
      createElement(CaptureBoundary, null,
        createElement(WizardCharacterSheet, {
          wizardId: "wiz_1",
          wizardName: "Test Wizard",
          character: currentCharacter,
          pending: currentPending,
          error: currentError,
          onSave: currentOnSave,
          onClose: currentOnClose,
          homeIsleId: currentHomeIsleId,
          sanctumPlaceId: currentSanctumPlaceId,
          worldRef: currentWorldRef as any,
          onSetHomeIsle: currentOnSetHomeIsle as any,
          onSetSanctum: currentOnSetSanctum as any,
        }),
      ),
    );
  });

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  return { container, rerender, unmount };
}

function getInputElement(container: HTMLElement, label: string): HTMLInputElement | null {
  const labels = container.querySelectorAll("label");
  for (const l of labels) {
    if (l.textContent?.trim() === label) {
      const input = l.parentElement?.querySelector("input");
      if (input) return input as HTMLInputElement;
    }
  }
  return null;
}

function getTextArea(container: HTMLElement, label: string): HTMLTextAreaElement | null {
  const labels = container.querySelectorAll("label");
  for (const l of labels) {
    if (l.textContent?.trim() === label) {
      const ta = l.parentElement?.querySelector("textarea");
      if (ta) return ta as HTMLTextAreaElement;
    }
  }
  return null;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const desc = Object.getOwnPropertyDescriptor(
    el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value",
  );
  const setter = desc?.set;
  if (setter) setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("WizardCharacterSheet reactive sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clean sheet + new character prop => displayed form updates", () => {
    const initial: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Cat",
    };
    const { container, rerender, unmount } = renderSheet({ character: initial });

    const familiarInput = getInputElement(container, "Familiar description");
    expect(familiarInput).not.toBeNull();
    expect(familiarInput!.value).toBe("Cat");

    const updated: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Owl",
    };
    rerender({ character: updated });

    const familiarInputAfter = getInputElement(container, "Familiar description");
    expect(familiarInputAfter!.value).toBe("Owl");

    unmount();
  });

  it("dirty sheet + new character prop => local edit preserved", () => {
    const initial: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Cat",
    };
    const { container, rerender, unmount } = renderSheet({ character: initial });

    const familiarInput = getInputElement(container, "Familiar description");
    setNativeValue(familiarInput!, "Raven");

    const updated: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Owl",
    };
    rerender({ character: updated });

    const familiarInputAfter = getInputElement(container, "Familiar description");
    expect(familiarInputAfter!.value).toBe("Raven");

    unmount();
  });

  it("after remote update while locally dirty, save patch does not include unrelated remote field", () => {
    const initial: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Cat",
      importantNotes: "old notes",
    };

    let savedPatch: Record<string, unknown> | null = null;
    const onSave = (patch: Record<string, unknown>) => {
      savedPatch = patch;
    };

    const { container, rerender, unmount } = renderSheet({
      character: initial,
      onSave,
    });

    // User edits familiarDescription locally
    const familiarInput = getInputElement(container, "Familiar description");
    setNativeValue(familiarInput!, "Raven");

    // Remote update changes importantNotes while we're dirty
    const updated: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Cat",
      importantNotes: "remote notes",
    };
    rerender({ character: updated });

    // Trigger save by clicking the Save button
    const buttons = container.querySelectorAll("button");
    let saveButton: HTMLButtonElement | null = null;
    for (const b of buttons) {
      if (b.textContent === "Save") saveButton = b as HTMLButtonElement;
    }
    expect(saveButton).not.toBeNull();
    saveButton!.click();

    expect(savedPatch).not.toBeNull();
    expect(savedPatch!["familiarDescription"]).toBe("Raven");
    // importantNotes was changed only by the remote update, not by the user,
    // so it must NOT appear in the patch
    expect(savedPatch!["importantNotes"]).toBeUndefined();
    expect(savedPatch!["importantNotes" as string]).toBeUndefined();

    unmount();
  });

  it("invalid local Element input (1.5) is preserved when a remote character prop update arrives", () => {
    const initial: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
    };
    const { container, rerender, unmount } = renderSheet({ character: initial });

    // Type invalid "1.5" into the Air element field
    const airInput = getInputElement(container, "Air");
    expect(airInput).not.toBeNull();
    setNativeValue(airInput!, "1.5");

    // Remote update arrives
    const updated: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
      familiarDescription: "Owl",
    };
    rerender({ character: updated });

    // The invalid local edit must be preserved
    const airInputAfter = getInputElement(container, "Air");
    expect(airInputAfter!.value).toBe("1.5");

    unmount();
  });

  it("sheet title includes wizard name and 'Character Sheet'", () => {
    const initial: WizardCharacterData = {
      ...BLANK_WIZARD_CHARACTER,
    };
    const { container, unmount } = renderSheet({ character: initial });

    const h2 = container.querySelector("h2");
    expect(h2).not.toBeNull();
    expect(h2!.textContent).toContain("Test Wizard");
    expect(h2!.textContent).toContain("Character Sheet");

    unmount();
  });

  it("advances Home Isle baseline after a successful save so the next save uses the new expected value", async () => {
    const ISLE_A_ID = "isle_a";
    const ISLE_B_ID = "isle_b";
    const worldRef = {
      denizens: [],
      isles: [
        { isleId: ISLE_A_ID, name: "Isle A", description: null },
        { isleId: ISLE_B_ID, name: "Isle B", description: null },
      ],
      places: [],
    };

    const calls: { expected: string | null; value: string | null }[] = [];
    const onSetHomeIsle = vi.fn(async (change: { expected: string | null; value: string | null }) => {
      calls.push(change);
    });
    const onSetSanctum = vi.fn(async (_change: { expected: string | null; value: string | null }) => {});

    const { container, unmount } = renderSheet({
      character: { ...BLANK_WIZARD_CHARACTER },
      homeIsleId: null,
      worldRef,
      onSetHomeIsle,
      onSetSanctum,
    });

    // Helper: find the Home Isle select
    const getHomeIsleSelect = (): HTMLSelectElement | null => {
      const labels = container.querySelectorAll("label");
      for (const l of labels) {
        if (l.textContent?.trim() === "Home Isle") {
          const sel = l.parentElement?.querySelector("select");
          if (sel) return sel as HTMLSelectElement;
        }
      }
      return null;
    };

    // Helper: find the "Save Home Isle" button
    const getSaveHomeIsleButton = (): HTMLButtonElement | null => {
      const buttons = container.querySelectorAll("button");
      for (const b of buttons) {
        if (b.textContent === "Save Home Isle") return b as HTMLButtonElement;
      }
      return null;
    };

    // 1. Select Isle A
    const select1 = getHomeIsleSelect();
    expect(select1).not.toBeNull();
    select1!.value = ISLE_A_ID;
    select1!.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync(() => {});

    // 2. Save Home Isle
    const btn1 = getSaveHomeIsleButton();
    expect(btn1).not.toBeNull();
    btn1!.click();
    await vi.runAllTimersAsync();
    flushSync(() => {});

    // 3. Select Isle B
    const select2 = getHomeIsleSelect();
    select2!.value = ISLE_B_ID;
    select2!.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync(() => {});

    // 4. Save Home Isle
    const btn2 = getSaveHomeIsleButton();
    btn2!.click();
    await vi.runAllTimersAsync();
    flushSync(() => {});

    expect(calls).toEqual([
      { expected: null, value: ISLE_A_ID },
      { expected: ISLE_A_ID, value: ISLE_B_ID },
    ]);

    unmount();
  });
});
