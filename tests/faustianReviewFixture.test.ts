import { describe, it, expect } from "vitest";
import {
  FAUSTIAN_CARD_IDS,
  faustianCardId,
  faustianDeckMissingSuits,
  validateFaustianStructure,
  type FaustianCardId,
  type FaustianState,
} from "../shared/domain";
import {
  FAUSTIAN_REVIEW_TWIST_CARD_ID,
  buildFaustianReviewPlayState,
  faustianReviewCardPlacements,
} from "../src/faustian-review-fixture";
import { buildFaustianTablePresentation } from "../src/faustian-view-model";

const WIZARD = "wiz_00000000-0000-0000-0000-00000000000a";
const CONSPIRACY = "den_00000000-0000-0000-0000-0000000000f1";
const CHALLENGE = "fpmc_00000000-0000-0000-0000-0000000000f1";
const GROUP = "fpmg_00000000-0000-0000-0000-0000000000f1";

function locatedCardIds(faustian: FaustianState): FaustianCardId[] {
  const located: FaustianCardId[] = [...faustian.faustianDeck, ...faustian.devilDeck];
  for (const community of faustian.communities) {
    located.push(...community.schemes.map((scheme) => scheme.cardId));
    located.push(...community.accompliceCardIds);
  }
  located.push(...faustian.machinations.map((card) => card.cardId));
  located.push(...faustian.defeatedSchemes);
  located.push(...faustian.entrustedCards.map((card) => card.cardId));
  located.push(...faustian.beneathAntagonists.map((card) => card.cardId));
  located.push(...faustian.possessions.map((card) => card.cardId));
  located.push(...faustian.setAsideHand);
  located.push(...faustian.domainPlacements.map((card) => card.cardId));
  return located;
}

describe("Faustian review/demo play fixture", () => {
  it("is a valid 52-card partition under existing Faustian structure invariants", () => {
    const faustian = buildFaustianReviewPlayState({
      conspiracyDenizenId: CONSPIRACY,
      obligationWizardId: WIZARD,
      currentMonthOrdinal: 11,
      pendingChallengeId: CHALLENGE,
      pendingGroupId: GROUP,
    });
    expect(() => validateFaustianStructure(faustian)).not.toThrow();
    const located = locatedCardIds(faustian);
    expect(located).toHaveLength(52);
    expect(new Set(located).size).toBe(52);
    expect([...located].sort()).toEqual([...FAUSTIAN_CARD_IDS].sort());
  });

  it("seeds a plausible mid-play table without duplicating the reserved Twist", () => {
    const faustian = buildFaustianReviewPlayState({
      conspiracyDenizenId: CONSPIRACY,
      obligationWizardId: WIZARD,
      currentMonthOrdinal: 11,
      pendingChallengeId: CHALLENGE,
      pendingGroupId: GROUP,
    });
    expect(FAUSTIAN_REVIEW_TWIST_CARD_ID).toBe(faustianCardId("hearts", "2"));
    expect(faustian.activeTwistCardIds).toEqual([FAUSTIAN_REVIEW_TWIST_CARD_ID]);
    expect(faustian.machinations.some((card) => card.cardId === FAUSTIAN_REVIEW_TWIST_CARD_ID && card.facing === "face_down")).toBe(true);
    expect(faustian.machinations.some((card) => card.facing === "face_up")).toBe(true);

    const aries = faustian.communities.find((community) => community.communityId === "aries")!;
    expect(aries.schemes.filter((scheme) => scheme.facing === "face_down").length).toBeGreaterThanOrEqual(2);
    expect(aries.schemes.filter((scheme) => scheme.facing === "face_up").length).toBeGreaterThanOrEqual(1);
    expect(aries.schemes.length).toBeGreaterThanOrEqual(3);
    expect(aries.accompliceCardIds.length).toBeGreaterThanOrEqual(1);
    expect(aries.pawnCount).toBe(1);

    const leo = faustian.communities.find((community) => community.communityId === "leo")!;
    expect(leo.schemes.some((scheme) => scheme.facing === "face_up")).toBe(true);
    expect(leo.accompliceCardIds.length).toBeGreaterThanOrEqual(1);
    expect(faustian.conspiracies).toEqual([{ denizenId: CONSPIRACY, communityId: "leo" }]);

    const populated = faustian.communities.filter((community) =>
      community.schemes.length > 0 || community.accompliceCardIds.length > 0,
    );
    expect(populated.length).toBeGreaterThanOrEqual(4);
    expect(faustian.communities.filter((community) => community.accompliceCardIds.length > 0).length).toBeGreaterThanOrEqual(3);
    expect(faustian.defeatedSchemes.length).toBeGreaterThanOrEqual(1);
    expect(faustian.faustianDeck.length).toBeGreaterThan(8);
    expect(faustian.devilDeck.length).toBeGreaterThan(8);
    expect(faustianDeckMissingSuits(faustian)).toEqual(["hearts"]);
    expect(faustian.pendingMachinationChallenges).toHaveLength(1);
    expect(faustian.pendingMachinationChallenges[0]?.kind).toBe("one_pair");
    expect(faustian.setAsideHand.length).toBeGreaterThanOrEqual(4);
    expect(faustian.devilObligations).toEqual([{
      kind: "wizard_owes_week_due_month",
      wizardId: WIZARD,
      dueMonthOrdinal: 11,
      weeks: 1,
    }]);
  });

  it("emits placement corrections that preserve the twist and cover every other card once", () => {
    const faustian = buildFaustianReviewPlayState();
    const placements = faustianReviewCardPlacements(faustian);
    const cardIds = placements.map((entry) => entry.cardId);
    expect(cardIds).not.toContain(FAUSTIAN_REVIEW_TWIST_CARD_ID);
    expect(new Set(cardIds).size).toBe(cardIds.length);
    expect(cardIds.length).toBe(51);
    expect(placements.every((entry) => entry.kind === "placement")).toBe(true);
  });

  it("presents both decks, missing-suit pressure, and occupied Community capacity at a glance", () => {
    const faustian = buildFaustianReviewPlayState({
      conspiracyDenizenId: CONSPIRACY,
      obligationWizardId: WIZARD,
      currentMonthOrdinal: 11,
      pendingChallengeId: CHALLENGE,
      pendingGroupId: GROUP,
    });
    const presentation = buildFaustianTablePresentation({
      faustian,
      denizens: [{ denizenId: CONSPIRACY, name: "Review Conspiracy", representation: "collective", description: null }],
      wizards: [{ wizardId: WIZARD, name: "Ash" }],
      currentMonthOrdinal: 11,
    });
    expect(presentation.faustianDeckCount).toBe(faustian.faustianDeck.length);
    expect(presentation.devilDeckCount).toBe(faustian.devilDeck.length);
    expect(presentation.missingSuits.map((suit) => suit.suit)).toEqual(["hearts"]);
    expect(presentation.communities[0]?.schemes.totalCount).toBeGreaterThanOrEqual(3);
    expect(presentation.communities[0]?.pawnCount).toBe(1);
    expect(presentation.communities[1]?.conspiracies).toHaveLength(1);
    expect(presentation.pendingChallenges).toHaveLength(1);
    expect(presentation.obligationCues[0]?.imminent).toBe(true);
  });
});
