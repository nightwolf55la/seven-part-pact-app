// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  EMPTY_FAUSTIAN_STATE,
  faustianCardId,
  type FaustianCardId,
  type FaustianCommunityId,
  type FaustianState,
} from "../shared/domain";
import FaustianSurface from "../src/FaustianSurface";
import {
  FACEDOWN_SCHEME_LABEL,
  FACEDOWN_TWIST_LABEL,
} from "../src/faustian-view-model";
import type { WorldReference } from "../src/WorldSurface";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const TWIST = faustianCardId("spades", "ace");
const SCHEME_A = faustianCardId("hearts", "2");
const SCHEME_B = faustianCardId("hearts", "3");
const SCHEME_C = faustianCardId("hearts", "4");
const SCHEME_D = faustianCardId("clubs", "5");
const ACCOMPLICE = faustianCardId("diamonds", "9");
const ACCOMPLICE_B = faustianCardId("diamonds", "8");
const DEVIL_TOP = faustianCardId("clubs", "6");

const WORLD: WorldReference = {
  denizens: [],
  isles: [],
  places: [],
};

const mockMutations: Record<string, ReturnType<typeof vi.fn>> = {};

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (!mockMutations[ref]) mockMutations[ref] = vi.fn(async () => {});
    return mockMutations[ref];
  },
}));

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Commands: {
      addLoreEntry: "m3Commands.addLoreEntry",
      reviseLoreEntry: "m3Commands.reviseLoreEntry",
      arrangeFaustianTable: "m3Commands.arrangeFaustianTable",
      completeFaustianStructuralPlaceholder: "m3Commands.completeFaustianStructuralPlaceholder",
      revealFaustianCommunitySchemes: "m3Commands.revealFaustianCommunitySchemes",
      foilFaustianCommunityScheme: "m3Commands.foilFaustianCommunityScheme",
      blackmailFaustianCommunity: "m3Commands.blackmailFaustianCommunity",
      placeFaustianSchemes: "m3Commands.placeFaustianSchemes",
      addFaustianPawn: "m3Commands.addFaustianPawn",
      removeFaustianPawn: "m3Commands.removeFaustianPawn",
      establishFaustianConspiracy: "m3Commands.establishFaustianConspiracy",
      directFaustianAccomplice: "m3Commands.directFaustianAccomplice",
      disruptFaustianPawn: "m3Commands.disruptFaustianPawn",
      recordFaustianSchemeOccurred: "m3Commands.recordFaustianSchemeOccurred",
      discloseFaustianTwist: "m3Commands.discloseFaustianTwist",
      recordFaustianTwistOccurred: "m3Commands.recordFaustianTwistOccurred",
      recordFaustianMachinationOutcome: "m3Commands.recordFaustianMachinationOutcome",
      completeFaustianMachinationResponse: "m3Commands.completeFaustianMachinationResponse",
      finalizeFaustianMachinationChallenge: "m3Commands.finalizeFaustianMachinationChallenge",
      correctFaustianCard: "m3Commands.correctFaustianCard",
      correctFaustianAntagonist: "m3Commands.correctFaustianAntagonist",
      correctFaustianDemon: "m3Commands.correctFaustianDemon",
      correctFaustianDomainSeizure: "m3Commands.correctFaustianDomainSeizure",
      correctFaustianDevilProfile: "m3Commands.correctFaustianDevilProfile",
      recordFaustianDueMonthObligation: "m3Commands.recordFaustianDueMonthObligation",
      fulfillFaustianDueMonthObligation: "m3Commands.fulfillFaustianDueMonthObligation",
      correctFaustianPersistentEffect: "m3Commands.correctFaustianPersistentEffect",
    },
  },
}));

function take(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  return { ...faustian, faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)) };
}

function withAries(
  faustian: FaustianState,
  patch: Partial<FaustianState["communities"][number]>,
): FaustianState {
  return {
    ...faustian,
    communities: faustian.communities.map((community) =>
      community.communityId === "aries" ? { ...community, ...patch } : community
    ),
  };
}

function playTable(): FaustianState {
  let faustian = take(EMPTY_FAUSTIAN_STATE, [TWIST, SCHEME_A, SCHEME_B, SCHEME_C, SCHEME_D, ACCOMPLICE, DEVIL_TOP]);
  faustian = {
    ...faustian,
    devilDeck: [DEVIL_TOP],
    machinations: [{ cardId: TWIST, facing: "face_down" }],
    activeTwistCardIds: [TWIST],
  };
  return withAries(faustian, {
    pawnCount: 1,
    schemes: [
      { cardId: SCHEME_A, facing: "face_up" },
      { cardId: SCHEME_B, facing: "face_down" },
    ],
    accompliceCardIds: [ACCOMPLICE],
  });
}

function renderSurface(extra?: {
  faustian?: FaustianState;
  monthOrdinal?: number;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const props = {
    faustian: extra?.faustian ?? playTable(),
    campaignId: CAMPAIGN_ID,
    world: WORLD,
    sorcererPresence: [],
    layout: "full" as const,
    lifecycleKind: "play" as const,
    monthOrdinal: extra?.monthOrdinal ?? 0,
    wizards: [{ wizardId: "wiz_00000000-0000-0000-0000-00000000000a", name: "Mara" }],
  };
  flushSync(() => {
    root.render(createElement(FaustianSurface, props));
  });
  return {
    container,
    root,
    rerender: (faustian: FaustianState) => {
      flushSync(() => {
        root.render(createElement(FaustianSurface, { ...props, faustian }));
      });
    },
  };
}

function communityEl(container: HTMLElement, communityId: FaustianCommunityId): HTMLElement {
  const found = container.querySelector(`[data-faustian-community="${communityId}"]`) as HTMLElement | null;
  if (found === null) throw new Error(`Missing community ${communityId}`);
  return found;
}

function openContextOn(target: Element, clientX = 80, clientY = 40): void {
  flushSync(() => {
    target.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 2,
    }));
  });
}

function clickAction(container: HTMLElement, action: string): void {
  const found = container.querySelector(`[data-faustian-context-menu] [data-context-action="${action}"]`) as HTMLButtonElement | null;
  if (found === null) throw new Error(`Missing context action ${action}`);
  flushSync(() => {
    found.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function flushPlay(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function dragSchemeSupply(
  container: HTMLElement,
  dropTarget: Element | null,
  pointerId = 71,
): Promise<void> {
  const supply = container.querySelector("[data-faustian-scheme-supply]") as Element;
  (supply as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => dropTarget });
  await act(async () => {
    supply.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId, isPrimary: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 15, pointerId }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId }));
  });
  await flushPlay();
}

beforeEach(() => {
  for (const key of Object.keys(mockMutations)) delete mockMutations[key];
});

describe("hidden information on the ordinary table", () => {
  it("keeps facedown Scheme and Twist identity out of rendered text, titles, menus, and drag markup", () => {
    const { container } = renderSurface();
    openContextOn(container.querySelector(`[aria-label="${FACEDOWN_SCHEME_LABEL}"]`) as Element);
    const menu = container.querySelector("[data-faustian-context-menu]");
    const haystack = `${container.innerHTML}\n${menu?.innerHTML ?? ""}`;
    expect(haystack).not.toContain("hearts_3");
    expect(haystack).not.toContain("spades_ace");
    expect(haystack).not.toMatch(/Three of Hearts/);
    expect(haystack).not.toMatch(/Ace of Spades/);
    expect(container.querySelector("[data-faustian-scheme-supply]")?.getAttribute("aria-label") ?? "").toMatch(/facedown|devil/i);
    expect(container.querySelector("[data-faustian-scheme-supply]")?.textContent ?? "").not.toMatch(/clubs_6|Six of Clubs/);
    const facedown = Array.from(container.querySelectorAll("[aria-label]")).filter((el) =>
      el.getAttribute("aria-label") === FACEDOWN_SCHEME_LABEL || el.getAttribute("aria-label") === FACEDOWN_TWIST_LABEL,
    );
    expect(facedown.length).toBeGreaterThan(0);
    for (const el of facedown) {
      expect(el.getAttribute("title") ?? "").not.toMatch(/hearts|Three|Ace of Spades/i);
    }
  });
});

describe("Scheme supply drag", () => {
  it("places exactly one Scheme through the existing semantic path using the pointerdown snapshot", async () => {
    const start = playTable();
    const { container, rerender } = renderSurface({ faustian: start });
    const aries = communityEl(container, "aries");
    const drifted: FaustianState = { ...start, devilDeck: [DEVIL_TOP, SCHEME_C] };
    const supply = container.querySelector("[data-faustian-scheme-supply]") as Element;
    (supply as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => aries });
    await act(async () => {
      supply.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 15, clientY: 15, pointerId: 81, isPrimary: true }));
    });
    rerender(drifted);
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 40, clientY: 15, pointerId: 81 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 210, clientY: 210, pointerId: 81 }));
    });
    await flushPlay();
    const place = mockMutations["m3Commands.placeFaustianSchemes"];
    expect(place).toHaveBeenCalledTimes(1);
    expect(place.mock.calls[0]?.[0]).toMatchObject({
      expectedCampaignId: CAMPAIGN_ID,
      communityId: "aries",
      requestedQuantity: 1,
      expectedFaustian: start,
    });
    expect(container.querySelector("[data-faustian-scheme-supply]")?.textContent ?? "").not.toMatch(/clubs_6|Six of Clubs/);
    expect(container.querySelector("[data-faustian-drag-ghost]")).toBeNull();
  });

  it("does nothing on an invalid drop and removes the drag ghost", async () => {
    const { container } = renderSurface();
    await dragSchemeSupply(container, container.querySelector("h2"));
    expect(mockMutations["m3Commands.placeFaustianSchemes"]?.mock.calls.length ?? 0).toBe(0);
    expect(container.querySelector("[data-faustian-drag-ghost]")).toBeNull();
  });

  it("resets the drag ghost when placement is rejected", async () => {
    mockMutations["m3Commands.placeFaustianSchemes"] = vi.fn(async () => {
      throw new Error("Devil's Deck does not contain enough cards for the requested quantity");
    });
    const { container } = renderSurface({ faustian: { ...playTable(), devilDeck: [] } });
    await dragSchemeSupply(container, communityEl(container, "aries"));
    expect(mockMutations["m3Commands.placeFaustianSchemes"]).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-faustian-drag-ghost]")).toBeNull();
  });

  it("marks the table as non-selectable while dragging", async () => {
    const { container } = renderSurface();
    const supply = container.querySelector("[data-faustian-scheme-supply]") as Element;
    (supply as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture = vi.fn();
    await act(async () => {
      supply.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, pointerId: 91, isPrimary: true }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 10, pointerId: 91 }));
    });
    const table = container.querySelector("[data-faustian-table]") as HTMLElement;
    expect(table.className).toMatch(/select-none/);
    expect(container.querySelector("[data-faustian-drag-ghost]")).not.toBeNull();
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 30, clientY: 10, pointerId: 91 }));
    });
  });
});

describe("contextual Community actions", () => {
  it("places one Scheme from a Community context action without a quantity form", async () => {
    const start = playTable();
    const { container } = renderSurface({ faustian: start });
    openContextOn(communityEl(container, "leo"));
    expect(container.querySelector("[data-faustian-context-menu]")?.textContent).not.toMatch(/clubs_6|Six of Clubs/);
    clickAction(container, "place-scheme");
    await flushPlay();
    expect(mockMutations["m3Commands.placeFaustianSchemes"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.placeFaustianSchemes"]!.mock.calls[0]?.[0]).toMatchObject({
      communityId: "leo",
      requestedQuantity: 1,
      expectedFaustian: start,
    });
    expect(container.textContent).not.toContain("Confirm Place Schemes");
    expect(container.textContent).not.toContain("Requested quantity");
  });

  it("Blackmails the right-clicked Community immediately with the captured table", async () => {
    const start = playTable();
    const { container } = renderSurface({ faustian: start });
    openContextOn(communityEl(container, "aries"));
    clickAction(container, "blackmail");
    await flushPlay();
    expect(mockMutations["m3Commands.blackmailFaustianCommunity"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.blackmailFaustianCommunity"]!.mock.calls[0]?.[0]).toMatchObject({
      communityId: "aries",
      expectedFaustian: start,
    });
    expect(container.textContent).not.toContain("Confirm Blackmail");
  });
});

describe("Investigation", () => {
  it("starts reveal from the Community and foils the physical revealed Scheme", async () => {
    const start = playTable();
    const afterReveal: FaustianState = withAries(start, {
      pawnCount: 1,
      schemes: [
        { cardId: SCHEME_A, facing: "face_up" },
        { cardId: SCHEME_B, facing: "face_up" },
      ],
      accompliceCardIds: [ACCOMPLICE],
    });
    mockMutations["m3Commands.revealFaustianCommunitySchemes"] = vi.fn(async () => {});
    const { container, rerender } = renderSurface({ faustian: start });
    openContextOn(communityEl(container, "aries"));
    await act(async () => {
      clickAction(container, "investigate");
    });
    await flushPlay();
    expect(mockMutations["m3Commands.revealFaustianCommunitySchemes"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.revealFaustianCommunitySchemes"]!.mock.calls[0]?.[0]).toMatchObject({
      communityId: "aries",
      expectedFaustian: start,
    });
    expect(container.textContent).not.toContain("Confirm Investigate reveal");
    rerender(afterReveal);
    const revealed = Array.from(container.querySelectorAll('[data-faustian-card="scheme"]')).find((el) =>
      (el.getAttribute("aria-label") ?? "").includes("Three of Hearts"),
    );
    expect(revealed).toBeDefined();
    openContextOn(revealed as Element);
    expect(container.querySelector("[data-faustian-context-menu]")?.textContent).not.toMatch(/Eligible Scheme/);
    clickAction(container, "foil");
    await flushPlay();
    expect(mockMutations["m3Commands.foilFaustianCommunityScheme"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.foilFaustianCommunityScheme"]!.mock.calls[0]?.[0]).toMatchObject({
      communityId: "aries",
      schemeCardId: SCHEME_B,
    });
    expect(container.textContent).not.toContain("Confirm foil");
  });

  it("does not let a newly arrived Scheme become the captured foil target", async () => {
    const start = withAries(take(EMPTY_FAUSTIAN_STATE, [TWIST, SCHEME_A, SCHEME_B]), {
      schemes: [
        { cardId: SCHEME_A, facing: "face_up" },
        { cardId: SCHEME_B, facing: "face_up" },
      ],
    });
    const { container, rerender } = renderSurface({ faustian: start });
    openContextOn(communityEl(container, "aries"));
    await act(async () => {
      clickAction(container, "investigate");
    });
    await flushPlay();
    expect(mockMutations["m3Commands.revealFaustianCommunitySchemes"]?.mock.calls.length ?? 0).toBe(0);
    const drifted = withAries(start, {
      schemes: [
        { cardId: SCHEME_A, facing: "face_up" },
        { cardId: SCHEME_B, facing: "face_up" },
        { cardId: SCHEME_C, facing: "face_up" },
      ],
    });
    rerender(drifted);
    const newCard = Array.from(container.querySelectorAll('[data-faustian-card="scheme"]')).find((el) =>
      (el.getAttribute("aria-label") ?? "").includes("Four of Hearts"),
    );
    expect(newCard).toBeDefined();
    openContextOn(newCard as Element);
    expect(container.querySelector('[data-context-action="foil"]')).toBeNull();
  });
});

describe("Scheme occurrence", () => {
  it("resolves the right-clicked face-up Scheme to Machinations without a Scheme dropdown", async () => {
    const start = playTable();
    const { container } = renderSurface({ faustian: start });
    const faceUp = Array.from(container.querySelectorAll('[data-faustian-card="scheme"]')).find((el) =>
      (el.getAttribute("aria-label") ?? "").includes("Two of Hearts"),
    );
    openContextOn(faceUp as Element);
    clickAction(container, "resolve-machinations");
    await flushPlay();
    expect(mockMutations["m3Commands.recordFaustianSchemeOccurred"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.recordFaustianSchemeOccurred"]!.mock.calls[0]?.[0]).toMatchObject({
      communityId: "aries",
      schemeCardId: SCHEME_A,
      destination: { kind: "ordinary_machinations" },
      expectedLocalAccompliceCardIds: [ACCOMPLICE],
    });
    expect(container.textContent).not.toContain("Face-up Scheme");
  });

  it("asks only for the local Accomplice set when that choice is semantically required", () => {
    const start = withAries(playTable(), {
      pawnCount: 1,
      schemes: [{ cardId: SCHEME_A, facing: "face_up" }],
      accompliceCardIds: [ACCOMPLICE, ACCOMPLICE_B],
    });
    const { container } = renderSurface({ faustian: start });
    const faceUp = Array.from(container.querySelectorAll('[data-faustian-card="scheme"]')).find((el) =>
      (el.getAttribute("aria-label") ?? "").includes("Two of Hearts"),
    );
    openContextOn(faceUp as Element);
    clickAction(container, "resolve-machinations");
    expect(mockMutations["m3Commands.recordFaustianSchemeOccurred"]?.mock.calls.length ?? 0).toBe(0);
    expect(container.textContent).toMatch(/Direct local Accomplices/);
    expect(container.textContent).not.toContain("Face-up Scheme");
  });
});

describe("Accomplice Direct", () => {
  it("directs the physical Accomplice through a destination choice and does not enable drag", async () => {
    const { container } = renderSurface();
    const accomplice = container.querySelector('[data-faustian-card="accomplice"]') as HTMLElement;
    expect(accomplice.getAttribute("data-draggable-accomplice")).toBeNull();
    openContextOn(accomplice);
    clickAction(container, "direct");
    expect(mockMutations["m3Commands.directFaustianAccomplice"]?.mock.calls.length ?? 0).toBe(0);
    const dest = container.querySelector('[data-context-action="direct-destination"][data-community-id="leo"]') as HTMLButtonElement;
    flushSync(() => {
      dest.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPlay();
    expect(mockMutations["m3Commands.directFaustianAccomplice"]).toHaveBeenCalledTimes(1);
    expect(mockMutations["m3Commands.directFaustianAccomplice"]!.mock.calls[0]?.[0]).toMatchObject({
      accompliceCardId: ACCOMPLICE,
      destinationCommunityId: "leo",
    });
    expect(Object.prototype.hasOwnProperty.call(
      mockMutations["m3Commands.directFaustianAccomplice"]!.mock.calls[0]?.[0] as object,
      "expectedFaustian",
    )).toBe(false);
  });
});
