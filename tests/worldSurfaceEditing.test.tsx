// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const EMBER_ISLE_ID = "isle_ember";

const WORLD_REF = {
  denizens: [
    {
      denizenId: "den_thorn" as any,
      name: "Elder Thorn",
      representation: "individual" as const,
      description: "Keeper of the old road",
    },
  ],
  isles: [
    {
      isleId: EMBER_ISLE_ID as any,
      name: "Ember Isle",
      description: "An isle of warm stone",
    },
  ],
  places: [
    {
      placeId: "plc_ash" as any,
      name: "Ash Tower",
      description: "A blackened tower",
      placement: { kind: "on_isle" as const, isleId: EMBER_ISLE_ID as any },
    },
  ],
};

const mockMutations = {
  createDenizen: vi.fn(async () => {}),
  updateDenizen: vi.fn(async () => {}),
  createIsle: vi.fn(async () => {}),
  updateIsle: vi.fn(async () => {}),
  createPlace: vi.fn(async () => {}),
  updatePlace: vi.fn(async () => {}),
};

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "m3Commands.createDenizen") return mockMutations.createDenizen;
    if (ref === "m3Commands.updateDenizen") return mockMutations.updateDenizen;
    if (ref === "m3Commands.createIsle") return mockMutations.createIsle;
    if (ref === "m3Commands.updateIsle") return mockMutations.updateIsle;
    if (ref === "m3Commands.createPlace") return mockMutations.createPlace;
    if (ref === "m3Commands.updatePlace") return mockMutations.updatePlace;
    return vi.fn();
  },
}));

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Queries: {},
    m3Commands: {
      createDenizen: "m3Commands.createDenizen",
      updateDenizen: "m3Commands.updateDenizen",
      createIsle: "m3Commands.createIsle",
      updateIsle: "m3Commands.updateIsle",
      createPlace: "m3Commands.createPlace",
      updatePlace: "m3Commands.updatePlace",
    },
  },
}));

import WorldSurface from "../src/WorldSurface";

function renderWorld(world: typeof WORLD_REF): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(WorldSurface, { world }));
  });
  return { container, root };
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = input instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  flushSync(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
  flushSync(() => {
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function clickButton(container: HTMLElement, text: string) {
  const btn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  expect(btn, `Button "${text}" not found`).toBeDefined();
  flushSync(() => btn!.click());
}

async function clickButtonAsync(container: HTMLElement, text: string) {
  const btn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  expect(btn, `Button "${text}" not found`).toBeDefined();
  btn!.click();
  await flushSync(() => {});
  await new Promise((r) => setTimeout(r, 0));
  flushSync(() => {});
}

describe("World surface editing", () => {
  beforeEach(() => {
    for (const k of Object.keys(mockMutations) as (keyof typeof mockMutations)[]) {
      mockMutations[k].mockClear();
    }
  });

  it("denizen create + edit (only representation)", async () => {
    const { container, root } = renderWorld(WORLD_REF);

    // --- Create ---
    clickButton(container, "Add Denizen");

    const nameInput = container.querySelector('input[data-field="name"]') as HTMLInputElement;
    expect(nameInput).toBeDefined();
    setInputValue(nameInput, "The Watcher");

    const repSelect = container.querySelector('select[data-field="representation"]') as HTMLSelectElement;
    setSelectValue(repSelect, "collective");

    const descTextarea = container.querySelector('textarea[data-field="description"]') as HTMLTextAreaElement;
    setInputValue(descTextarea, "Watches from afar");

    await clickButtonAsync(container, "Create");

    expect(mockMutations.createDenizen).toHaveBeenCalledTimes(1);
    const createArgs = (mockMutations.createDenizen.mock.calls as any)[0][0];
    expect(createArgs.commandId).toMatch(/^cmd_/);
    expect(createArgs.denizenId).toMatch(/^den_/);
    expect(createArgs.name).toBe("The Watcher");
    expect(createArgs.representation).toBe("collective");
    expect(createArgs.description).toBe("Watches from afar");

    // --- Edit: only change representation ---
    clickButton(container, "Edit");

    const repSelect2 = container.querySelector('select[data-field="representation"]') as HTMLSelectElement;
    expect(repSelect2).toBeDefined();
    // Original representation was "individual", change to "collective"
    setSelectValue(repSelect2, "collective");

    await clickButtonAsync(container, "Save");

    expect(mockMutations.updateDenizen).toHaveBeenCalledTimes(1);
    const updateArgs = (mockMutations.updateDenizen.mock.calls as any)[0][0];
    expect(updateArgs.commandId).toMatch(/^cmd_/);
    expect(updateArgs.denizenId).toBe("den_thorn");
    expect(updateArgs.fields.representation).toEqual({
      expected: "individual",
      value: "collective",
    });
    // name and description MUST NOT be included
    expect(updateArgs.fields.name).toBeUndefined();
    expect(updateArgs.fields.description).toBeUndefined();

    root.unmount();
    container.remove();
  });

  it("isle create + edit (only name)", async () => {
    const { container, root } = renderWorld(WORLD_REF);

    // Switch to Isles tab
    clickButton(container, "Isles");

    // --- Create ---
    clickButton(container, "Add Isle");

    const nameInput = container.querySelector('input[data-field="name"]') as HTMLInputElement;
    setInputValue(nameInput, "Shadow Isle");

    const descTextarea = container.querySelector('textarea[data-field="description"]') as HTMLTextAreaElement;
    setInputValue(descTextarea, "Dark and cold");

    await clickButtonAsync(container, "Create");

    expect(mockMutations.createIsle).toHaveBeenCalledTimes(1);
    const createArgs = (mockMutations.createIsle.mock.calls as any)[0][0];
    expect(createArgs.commandId).toMatch(/^cmd_/);
    expect(createArgs.isleId).toMatch(/^isl_/);
    expect(createArgs.name).toBe("Shadow Isle");
    expect(createArgs.description).toBe("Dark and cold");

    // --- Edit: only change name ---
    clickButton(container, "Edit");

    const nameInput2 = container.querySelector('input[data-field="name"]') as HTMLInputElement;
    setInputValue(nameInput2, "Ember Isle Renamed");

    await clickButtonAsync(container, "Save");

    expect(mockMutations.updateIsle).toHaveBeenCalledTimes(1);
    const updateArgs = (mockMutations.updateIsle.mock.calls as any)[0][0];
    expect(updateArgs.commandId).toMatch(/^cmd_/);
    expect(updateArgs.isleId).toBe("isle_ember");
    expect(updateArgs.fields.name).toEqual({
      expected: "Ember Isle",
      value: "Ember Isle Renamed",
    });
    expect(updateArgs.fields.description).toBeUndefined();

    root.unmount();
    container.remove();
  });

  it("place create + edit (only placement)", async () => {
    const { container, root } = renderWorld(WORLD_REF);

    // Switch to Places tab
    clickButton(container, "Places");

    // --- Create: on_isle placement ---
    clickButton(container, "Add Place");

    const nameInput = container.querySelector('input[data-field="name"]') as HTMLInputElement;
    setInputValue(nameInput, "Obsidian Gate");

    const placementSelect = container.querySelector('select[data-field="placementKind"]') as HTMLSelectElement;
    setSelectValue(placementSelect, "on_isle");

    const isleSelect = container.querySelector('select[data-field="isleId"]') as HTMLSelectElement;
    expect(isleSelect).toBeDefined();
    setSelectValue(isleSelect, EMBER_ISLE_ID);

    await clickButtonAsync(container, "Create");

    expect(mockMutations.createPlace).toHaveBeenCalledTimes(1);
    const createArgs = (mockMutations.createPlace.mock.calls as any)[0][0];
    expect(createArgs.commandId).toMatch(/^cmd_/);
    expect(createArgs.placeId).toMatch(/^plc_/);
    expect(createArgs.name).toBe("Obsidian Gate");
    expect(createArgs.placement).toEqual({ kind: "on_isle", isleId: EMBER_ISLE_ID });

    // --- Edit: change placement to mobile with associatedIsleId ---
    clickButton(container, "Edit");

    const placementSelect2 = container.querySelector('select[data-field="placementKind"]') as HTMLSelectElement;
    setSelectValue(placementSelect2, "mobile");

    const assocSelect = container.querySelector('select[data-field="associatedIsleId"]') as HTMLSelectElement;
    expect(assocSelect).toBeDefined();
    setSelectValue(assocSelect, EMBER_ISLE_ID);

    await clickButtonAsync(container, "Save");

    expect(mockMutations.updatePlace).toHaveBeenCalledTimes(1);
    const updateArgs = (mockMutations.updatePlace.mock.calls as any)[0][0];
    expect(updateArgs.commandId).toMatch(/^cmd_/);
    expect(updateArgs.placeId).toBe("plc_ash");
    expect(updateArgs.fields.placement).toEqual({
      expected: { kind: "on_isle", isleId: EMBER_ISLE_ID },
      value: { kind: "mobile", associatedIsleId: EMBER_ISLE_ID },
    });
    expect(updateArgs.fields.name).toBeUndefined();
    expect(updateArgs.fields.description).toBeUndefined();

    root.unmount();
    container.remove();
  });
});
