// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
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
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let currentCharacter = props.character;
  let currentOnSave = props.onSave ?? (() => {});
  let currentOnClose = props.onClose ?? (() => {});
  let currentPending = props.pending ?? false;
  let currentError = props.error ?? null;

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
});
