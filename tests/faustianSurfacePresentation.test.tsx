// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, createElement } from "react";
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

const LEO_SCHEME = faustianCardId("diamonds", "8");
const LEO_ACCOMPLICE = faustianCardId("clubs", "queen");

function crowdedAries(): FaustianState {
  let faustian = take(EMPTY_FAUSTIAN_STATE, [
    TWIST, SCHEME_A, SCHEME_B, SCHEME_C, SCHEME_D, ACCOMPLICE, LEO_SCHEME, LEO_ACCOMPLICE,
  ]);
  faustian = {
    ...faustian,
    machinations: [{ cardId: TWIST, facing: "face_down" }],
    activeTwistCardIds: [TWIST],
    communities: faustian.communities.map((community) => {
      if (community.communityId === "aries") {
        return {
          ...community,
          pawnCount: 1,
          schemes: [
            { cardId: SCHEME_A, facing: "face_up" },
            { cardId: SCHEME_B, facing: "face_down" },
            { cardId: SCHEME_C, facing: "face_down" },
            { cardId: SCHEME_D, facing: "face_up" },
          ],
          accompliceCardIds: [ACCOMPLICE],
        };
      }
      if (community.communityId === "leo") {
        return {
          ...community,
          schemes: [{ cardId: LEO_SCHEME, facing: "face_up" }],
          accompliceCardIds: [LEO_ACCOMPLICE],
        };
      }
      return community;
    }),
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

beforeEach(() => {
  for (const key of Object.keys(mockMutations)) delete mockMutations[key];
});

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
      expect(el.getAttribute("aria-label") ?? "").not.toMatch(/hearts|clubs|spades|Two|Three|Four|Ace/i);
      expect(el.getAttribute("title") ?? "").not.toMatch(/hearts|Two|Three|Ace of Spades/i);
      expect(el.textContent ?? "").not.toMatch(/Ace of Spades|Three of Hearts|hearts_3/);
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

  it("starts Investigate only from an explicit Community action", async () => {
    const { container } = renderSurface();
    const aries = container.querySelector("[aria-label='Aries · monks/pilgrims · Hierophant']") as HTMLElement;
    flushSync(() => {
      aries.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).not.toContain("Confirm Investigate reveal");
    flushSync(() => {
      aries.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20, button: 2 }));
    });
    const investigate = container.querySelector('[data-context-action="investigate"]') as HTMLButtonElement;
    flushSync(() => {
      investigate.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Records the Faustian board result; shared Time is handled separately.");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockMutations["m3Commands.revealFaustianCommunitySchemes"]).toHaveBeenCalled();
  });

  it("continues Investigate to foil choice without a reveal command when only face-up Schemes exist", () => {
    let faustian = take(EMPTY_FAUSTIAN_STATE, [TWIST, SCHEME_A, SCHEME_B]);
    faustian = {
      ...faustian,
      machinations: [{ cardId: TWIST, facing: "face_down" }],
      activeTwistCardIds: [TWIST],
      communities: faustian.communities.map((community) =>
        community.communityId === "aries"
          ? {
            ...community,
            schemes: [
              { cardId: SCHEME_A, facing: "face_up" },
              { cardId: SCHEME_B, facing: "face_up" },
            ],
          }
          : community
      ),
    };
    const { container } = renderSurface({ faustian });
    const aries = container.querySelector("[aria-label='Aries · monks/pilgrims · Hierophant']") as HTMLElement;
    flushSync(() => {
      aries.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20, button: 2 }));
    });
    const investigate = container.querySelector('[data-context-action="investigate"]') as HTMLButtonElement;
    flushSync(() => {
      investigate.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).not.toContain("Confirm Investigate reveal");
    expect(container.textContent).not.toContain("Confirm foil");
    expect(container.textContent).toContain("2♥");
    expect(Object.values(mockMutations).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("presents an Active Twist as one Machinations card plus a reference, not two copies", () => {
    const { container } = renderSurface();
    expect(container.textContent).toContain("Active Twist");
    const machinations = container.querySelector('[data-faustian-zone="machinations"]');
    expect(machinations).not.toBeNull();
    expect(machinations?.textContent).toMatch(/spotlight|same physical card/i);
    const machinationCards = Array.from(container.querySelectorAll("button")).filter((button) =>
      (button.getAttribute("aria-label") ?? "").includes("Active Twist")
      && (button.getAttribute("aria-label") ?? "").includes("Machination"),
    );
    expect(machinationCards.length).toBeGreaterThan(0);
    const twistCardCopies = Array.from(container.querySelectorAll("button")).filter((button) =>
      button.getAttribute("aria-label") === FACEDOWN_TWIST_LABEL
      && button.className.includes("w-[4.5rem]"),
    );
    expect(twistCardCopies).toHaveLength(0);
  });

  it("renders one card table with decks, Machinations, and Defeated visible without an inspector", () => {
    const { container } = renderSurface();
    const table = container.querySelector("[data-faustian-table]");
    expect(table).not.toBeNull();
    expect(table?.querySelector('[data-faustian-zone="community-tableau"]')).not.toBeNull();
    expect(table?.querySelector('[data-faustian-zone="machinations"]')).not.toBeNull();
    expect(table?.querySelector('[data-faustian-zone="faustian-deck"]')?.textContent).toMatch(/\d+/);
    expect(table?.querySelector('[data-faustian-zone="devil-deck"]')?.textContent).toMatch(/\d+/);
    expect(table?.querySelector('[data-faustian-zone="defeated"]')).not.toBeNull();
    expect(container.querySelector("[aria-label='Aries inspector']")).toBeNull();
    expect(container.textContent).toContain("2♥");
    expect(container.textContent).toContain(FACEDOWN_SCHEME_LABEL);
    expect(container.textContent).toContain("1 Pawn");
    expect(container.querySelector('[data-faustian-scheme-supply]')).not.toBeNull();
  });

  it("shows pending Machination challenge attention on the table without opening a form", () => {
    let faustian = crowdedAries();
    faustian = {
      ...faustian,
      pendingMachinationChallenges: [{
        challengeId: "fpmc_00000000-0000-0000-0000-000000000001" as never,
        kind: "one_pair",
        sourceMonthOrdinal: 2 as never,
        dueMonthOrdinal: 3 as never,
        scoringHandCardIds: [SCHEME_A],
        groups: [{
          groupId: "fpmg_00000000-0000-0000-0000-000000000001" as never,
          responsibleWizardId: null,
          originalCardIds: [SCHEME_A],
          status: "pending",
          completedByWizardId: null,
          completedMonthOrdinal: null,
        }],
        outcomeDependentTwistCardIds: [TWIST],
      }],
    };
    const { container } = renderSurface({ faustian });
    const machinations = container.querySelector('[data-faustian-zone="machinations"]');
    expect(machinations?.textContent).toMatch(/One Pair/);
    expect(machinations?.textContent).toMatch(/pending/i);
    expect(container.querySelector("[data-faustian-warning-grid]")).toBeNull();
  });

  it("marks an empty Devil Deck on the physical supply, not a warning grid", () => {
    const { container } = renderSurface({ faustian: EMPTY_FAUSTIAN_STATE });
    const devil = container.querySelector('[data-faustian-zone="devil-deck"]');
    expect(devil?.getAttribute("data-faustian-attention")).toBe("empty-deck");
    expect(devil?.textContent).toMatch(/empty/i);
    expect(container.querySelector("[data-faustian-warning-grid]")).toBeNull();
  });

  it("renders the physical table before Less-common and Advanced play controls", () => {
    const { container } = renderSurface();
    const table = container.querySelector("[data-faustian-table]");
    const less = Array.from(container.querySelectorAll("summary")).find((el) =>
      (el.textContent ?? "").includes("Less-common"),
    );
    const advanced = Array.from(container.querySelectorAll("summary")).find((el) =>
      (el.textContent ?? "").includes("Advanced"),
    );
    expect(table).not.toBeNull();
    expect(less).toBeDefined();
    expect(advanced).toBeDefined();
    expect(table!.compareDocumentPosition(less!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(table!.compareDocumentPosition(advanced!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides empty Lore from the primary table and keeps Communities free of up/down field copy", () => {
    const { container } = renderSurface();
    expect(container.querySelector('[data-faustian-zone="lore"]')).toBeNull();
    const aries = container.querySelector('[data-faustian-community="aries"]');
    expect(aries?.textContent).not.toMatch(/up\s*\/\s*.*down/i);
    expect(aries?.textContent).not.toMatch(/\d+\s+up\s*\/\s*\d+\s+down/i);
  });

  it("keeps replaced ordinary Start controls out of the play surface", () => {
    const { container } = renderSurface();
    const aries = container.querySelector("[aria-label='Aries · monks/pilgrims · Hierophant']") as HTMLElement;
    flushSync(() => {
      aries.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).not.toContain("Start Investigate");
    expect(container.textContent).not.toContain("Start Blackmail");
    expect(container.textContent).not.toContain("Start Direct Accomplice");
    expect(container.textContent).not.toContain("Confirm Investigate reveal");
    expect(container.textContent).not.toContain("Confirm Blackmail");
    expect(container.textContent).not.toContain("Confirm Direct Accomplice");
    expect(container.querySelector("[data-faustian-table]")?.textContent).not.toContain("Place several Schemes");
    expect(container.textContent).toContain("Place several Schemes");
  });

  it("opens Community detail in the primary inspector rail on left-click", () => {
    const { container } = renderSurface();
    const aries = container.querySelector("[aria-label='Aries · monks/pilgrims · Hierophant']") as HTMLElement;
    flushSync(() => {
      aries.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector("[data-faustian-inspector]");
    expect(inspector).not.toBeNull();
    expect(inspector?.textContent).toMatch(/Aries/);
    expect(inspector?.textContent).toMatch(/monks\/pilgrims/);
    expect(inspector?.textContent).toMatch(/Hierophant/);
    expect(inspector?.textContent).toMatch(/1 Pawn|Pawn/);
    expect(container.querySelector("[data-faustian-primary-rail]")?.contains(inspector)).toBe(true);
    expect(Object.values(mockMutations).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("opens face-up card detail in the inspector without mutating canonical state", () => {
    const { container } = renderSurface();
    const faceUp = Array.from(container.querySelectorAll('[data-faustian-card="scheme"]')).find((el) =>
      (el.textContent ?? "").includes("2♥"),
    ) as HTMLElement;
    flushSync(() => {
      faceUp.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector("[data-faustian-inspector]");
    expect(inspector?.textContent).toMatch(/2♥/);
    expect(inspector?.textContent).toMatch(/Two of Hearts/);
    expect(inspector?.textContent).toMatch(/Scheme/);
    expect(Object.values(mockMutations).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("reveals a Twist privately inside the inspector rail without flipping the table card", () => {
    const { container } = renderSurface();
    const callsBefore = Object.values(mockMutations).reduce((sum, fn) => sum + fn.mock.calls.length, 0);
    click(container, PRIVATE_TWIST_INSPECT_LABEL);
    const inspector = container.querySelector("[data-faustian-inspector]");
    expect(inspector?.textContent).toContain("Private Twist inspection");
    expect(inspector?.textContent).toMatch(/A♠|Ace of Spades/);
    expect(inspector?.textContent).toContain("Local-only view");
    expect(container.querySelector("[data-faustian-primary-rail]")?.contains(inspector)).toBe(true);
    const stillFacedown = Array.from(container.querySelectorAll("[aria-label]")).some(
      (el) => el.getAttribute("aria-label") === FACEDOWN_TWIST_LABEL,
    );
    expect(stillFacedown).toBe(true);
    const tableTwist = Array.from(container.querySelectorAll('[data-faustian-card="machination"]')).find((el) =>
      (el.getAttribute("aria-label") ?? "").includes("Active Twist"),
    );
    expect(tableTwist?.textContent ?? "").not.toMatch(/A♠|Ace of Spades/);
    const callsAfter = Object.values(mockMutations).reduce((sum, fn) => sum + fn.mock.calls.length, 0);
    expect(callsAfter).toBe(callsBefore);
    flushSync(() => {
      const close = Array.from(container.querySelectorAll("button")).find((button) =>
        (button.textContent ?? "").includes("Close private view"),
      );
      close?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector("[data-faustian-inspector]")?.textContent ?? "").not.toContain("Private Twist inspection");
    expect(Array.from(container.querySelectorAll("[aria-label]")).some(
      (el) => el.getAttribute("aria-label") === FACEDOWN_TWIST_LABEL,
    )).toBe(true);
  });

  it("keeps Faustian's Deck and Devil's Deck visible together in the primary rail", () => {
    const { container } = renderSurface();
    const rail = container.querySelector("[data-faustian-primary-rail]");
    expect(rail?.querySelector('[data-faustian-zone="faustian-deck"]')).not.toBeNull();
    expect(rail?.querySelector('[data-faustian-zone="devil-deck"]')).not.toBeNull();
    expect(rail?.querySelector('[data-faustian-zone="machinations"]')).not.toBeNull();
    expect(rail?.querySelector("[data-faustian-inspector]")).not.toBeNull();
    expect(rail?.querySelector('[data-faustian-zone="faustian-deck"]')?.textContent).toMatch(/\d+/);
    expect(rail?.querySelector('[data-faustian-zone="devil-deck"]')?.textContent).toMatch(/\d+/);
  });

  it("does not render dashed empty card silhouettes in unoccupied Communities", () => {
    const { container } = renderSurface();
    const pisces = container.querySelector('[data-faustian-community="pisces"]');
    expect(pisces).not.toBeNull();
    expect(pisces?.querySelector("[data-faustian-empty-slot]")).toBeNull();
    expect(pisces?.innerHTML ?? "").not.toMatch(/border-dashed/);
    const aries = container.querySelector('[data-faustian-community="aries"]');
    expect(aries?.querySelectorAll("[data-faustian-card]").length).toBeGreaterThan(0);
  });

  it("keeps Scheme and Accomplice tokens free of Community-name glance text", () => {
    const { container } = renderSurface();
    const leo = container.querySelector('[data-faustian-community="leo"]') as HTMLElement;
    const scheme = leo.querySelector('[data-faustian-card="scheme"]') as HTMLElement;
    const accomplice = leo.querySelector('[data-faustian-card="accomplice"]') as HTMLElement;
    expect(scheme.textContent).toMatch(/8♦/);
    expect(scheme.textContent).toMatch(/SCHEME/i);
    expect(scheme.textContent).toMatch(/See Scheme consequence/);
    expect(scheme.textContent).not.toMatch(/In Leo|Leo/);
    expect(accomplice.textContent).toMatch(/Q♣/);
    expect(accomplice.textContent).toMatch(/ACCOMPLICE/i);
    expect(accomplice.textContent).toMatch(/Prevents ≤Q/);
    expect(accomplice.textContent).not.toMatch(/In Leo|Leo/);
    const facedown = container.querySelector(`[aria-label='${FACEDOWN_SCHEME_LABEL}']`);
    expect(facedown?.textContent ?? "").not.toMatch(/See Scheme consequence/);
  });

  it("names Leo at most once in a selected-card inspector", () => {
    const { container } = renderSurface();
    const scheme = container.querySelector('[data-faustian-community="leo"] [data-faustian-card="scheme"]') as HTMLElement;
    flushSync(() => {
      scheme.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const inspector = container.querySelector("[data-faustian-inspector]") as HTMLElement;
    expect(inspector.textContent).toMatch(/8♦/);
    expect(inspector.textContent).toMatch(/Eight of Diamonds/);
    expect(inspector.textContent).toMatch(/Scheme/);
    expect(inspector.textContent).toMatch(/See Scheme consequence/);
    expect(inspector.querySelectorAll("[data-faustian-inspector-location]").length).toBe(1);
    expect(inspector.querySelector("[data-faustian-inspector-location]")?.textContent).toBe("Leo");
    const leoHits = inspector.textContent?.match(/Leo/g) ?? [];
    expect(leoHits).toHaveLength(1);
    expect(inspector.textContent).not.toMatch(/In Leo/);
  });
});

describe("unused community id type", () => {
  it("keeps FaustianCommunityId import live for crowded fixture typing", () => {
    const communityId: FaustianCommunityId = "aries";
    expect(communityId).toBe("aries");
  });
});
