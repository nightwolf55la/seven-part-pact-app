// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  EMPTY_FAUSTIAN_STATE,
  faustianCardId,
  readLoreCompendiumReference,
  type FaustianCardId,
  type FaustianCommunityId,
  type FaustianState,
  type SorcererExternalPresence,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import FaustianSurface from "../src/FaustianSurface";
import {
  FACEDOWN_SCHEME_LABEL,
  FACEDOWN_TWIST_LABEL,
  FAUSTIAN_TABLE_MIN_WIDTH_PX,
  PRIVATE_TWIST_INSPECT_LABEL,
} from "../src/faustian-view-model";
import type { LoreCompendiumUiState } from "../src/lore-view-model";
import type { WorldReference } from "../src/WorldSurface";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const TWIST = faustianCardId("spades", "ace");
const SCHEME_A = faustianCardId("hearts", "2");
const SCHEME_B = faustianCardId("hearts", "3");
const SCHEME_C = faustianCardId("hearts", "4");
const SCHEME_D = faustianCardId("clubs", "5");
const ACCOMPLICE = faustianCardId("diamonds", "9");

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
    },
  },
}));

function take(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  return { ...faustian, faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)) };
}

function crowdedAries(): FaustianState {
  let faustian = take(EMPTY_FAUSTIAN_STATE, [TWIST, SCHEME_A, SCHEME_B, SCHEME_C, SCHEME_D, ACCOMPLICE]);
  faustian = {
    ...faustian,
    machinations: [{ cardId: TWIST, facing: "face_down" }],
    activeTwistCardIds: [TWIST],
    communities: faustian.communities.map((community) =>
      community.communityId === "aries"
        ? {
          ...community,
          pawnCount: 1,
          schemes: [
            { cardId: SCHEME_A, facing: "face_up" },
            { cardId: SCHEME_B, facing: "face_down" },
            { cardId: SCHEME_C, facing: "face_down" },
            { cardId: SCHEME_D, facing: "face_up" },
          ],
          accompliceCardIds: [ACCOMPLICE],
        }
        : community
    ),
  };
  return faustian;
}

function loreReady(): LoreCompendiumUiState {
  const presentation = readLoreCompendiumReference(makeTestCampaignStateV5());
  expect(presentation.ok).toBe(true);
  if (!presentation.ok) throw new Error("expected lore");
  return { status: "ready", presentation };
}

function renderSurface(extra?: {
  faustian?: FaustianState;
  layout?: "full" | "narrow";
  sorcererPresence?: readonly SorcererExternalPresence[];
  loreCompendium?: LoreCompendiumUiState;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(FaustianSurface, {
      faustian: extra?.faustian ?? crowdedAries(),
      campaignId: CAMPAIGN_ID,
      world: WORLD,
      sorcererPresence: extra?.sorcererPresence ?? [],
      loreCompendium: extra?.loreCompendium,
      layout: extra?.layout ?? "full",
    }));
  });
  return { container, root };
}

function click(container: HTMLElement, label: string): void {
  const found = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === label);
  if (found === undefined) throw new Error(`Missing button ${label}`);
  flushSync(() => {
    found.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("Faustian surface presentation", () => {
  it("renders the 3-column Community tableau with identity headers and piece areas", () => {
    const { container } = renderSurface();
    expect(container.textContent).toContain("Aries");
    expect(container.textContent).toContain("monks/pilgrims");
    expect(container.textContent).toContain("Hierophant");
    expect(container.textContent).toContain("Pisces");
    expect(container.textContent).toContain("Faustian's Deck");
    expect(container.textContent).toContain("Devil's Deck");
    expect(container.textContent).toContain("Active Twist");
    expect(container.textContent).toContain("Held cards");
    expect(container.querySelector("[aria-label='Faustian Community tableau']")).not.toBeNull();
    const tableau = container.querySelector("[aria-label='Faustian Community tableau']") as HTMLElement;
    expect(tableau.style.minWidth).toBe(`${FAUSTIAN_TABLE_MIN_WIDTH_PX}px`);
  });

  it("does not leak facedown rank, suit, or identity through ordinary labels", () => {
    const { container } = renderSurface();
    const facedown = Array.from(container.querySelectorAll("[aria-label]")).filter((el) =>
      el.getAttribute("aria-label") === FACEDOWN_SCHEME_LABEL || el.getAttribute("aria-label") === FACEDOWN_TWIST_LABEL,
    );
    expect(facedown.length).toBeGreaterThan(0);
    for (const el of facedown) {
      expect(el.getAttribute("aria-label")).not.toMatch(/hearts|clubs|spades|Two|Three|Four|Ace/i);
      expect(el.getAttribute("title")).not.toMatch(/hearts|Two|Three|Ace of Spades/i);
      expect(el.textContent).not.toMatch(/Ace of Spades|Three of Hearts|hearts_3/);
    }
    expect(container.innerHTML).not.toContain("hearts_3");
    expect(container.innerHTML).not.toContain("spades_ace");
  });

  it("inspects a Twist privately without calling a mutation", () => {
    const { container } = renderSurface();
    const callsBefore = Object.values(mockMutations).reduce((sum, fn) => sum + fn.mock.calls.length, 0);
    click(container, PRIVATE_TWIST_INSPECT_LABEL);
    expect(container.textContent).toContain("Private Twist inspection");
    expect(container.textContent).toContain("Ace of Spades");
    expect(container.textContent).toContain("Local-only view");
    const stillFacedown = Array.from(container.querySelectorAll("[aria-label]")).some(
      (el) => el.getAttribute("aria-label") === FACEDOWN_TWIST_LABEL,
    );
    expect(stillFacedown).toBe(true);
    const callsAfter = Object.values(mockMutations).reduce((sum, fn) => sum + fn.mock.calls.length, 0);
    expect(callsAfter).toBe(callsBefore);
  });

  it("shows Sorcerer Working / Unavailable this month and Domain-wide Disruptive Arcanists", () => {
    const presence: SorcererExternalPresence[] = [
      {
        kind: "researcher",
        denizenId: "den_00000000-0000-0000-0000-000000000001" as never,
        name: "Ilex",
        operationalThisMonth: true,
        positionId: "srp_faustian_devils_schemes",
        target: { kind: "faustian_devils_schemes" },
      },
      {
        kind: "researcher",
        denizenId: "den_00000000-0000-0000-0000-000000000002" as never,
        name: "Quill",
        operationalThisMonth: false,
        positionId: "srp_faustian_devils_schemes",
        target: { kind: "faustian_devils_schemes" },
      },
      {
        kind: "disruptive_arcanist",
        denizenId: "den_00000000-0000-0000-0000-000000000003" as never,
        name: "Vesper",
        school: { kind: "source", schoolId: "enchantment" },
        seatId: "faustian",
      },
    ];
    const { container } = renderSurface({ sorcererPresence: presence });
    expect(container.textContent).toContain("Ilex — Working");
    expect(container.textContent).toContain("Quill — Unavailable this month");
    expect(container.textContent).toContain("Vesper — enchantment");
    expect(container.textContent).toContain("Disruptive Arcanists (Faustian Domain)");
  });

  it("binds existing Faustian Lore subjects", () => {
    const { container } = renderSurface({ loreCompendium: loreReady() });
    expect(container.textContent?.toLowerCase()).toMatch(/mutterheep|hell|codex 5/);
  });

  it("opens a full inspector for crowded Community overflow", () => {
    const { container } = renderSurface();
    click(container, "Inspect all 4 Schemes");
    expect(container.textContent).toContain("full inspector");
    expect(container.querySelector("[aria-label='Aries inspector']")).not.toBeNull();
  });

  it("keeps the tableau in a horizontal scroller at narrow layout", () => {
    const { container } = renderSurface({ layout: "narrow" });
    const scroller = container.querySelector(".overflow-x-auto");
    expect(scroller).not.toBeNull();
    const tableau = container.querySelector("[aria-label='Faustian Community tableau']") as HTMLElement;
    expect(tableau.style.minWidth).toBe(`${FAUSTIAN_TABLE_MIN_WIDTH_PX}px`);
  });

  it("does not start an action merely by selecting a Community", () => {
    const { container } = renderSurface();
    const aries = container.querySelector("[aria-label='Aries · monks/pilgrims · Hierophant']") as HTMLElement;
    flushSync(() => {
      aries.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(Object.values(mockMutations).every((fn) => fn.mock.calls.length === 0)).toBe(true);
    expect(container.textContent).not.toContain("Confirm");
  });
});

describe("unused community id type", () => {
  it("keeps FaustianCommunityId import live for crowded fixture typing", () => {
    const communityId: FaustianCommunityId = "aries";
    expect(communityId).toBe("aries");
  });
});
