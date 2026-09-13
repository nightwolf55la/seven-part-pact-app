import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CampaignEvent, DenizenId, FaustianCommunityId, MonthOrdinal, WizardId } from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  describeActivityEntry,
  faustianCardId,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
} from "../shared/domain";
import { campaignEventValidator } from "../convex/validators";

const ARIES = "aries" as FaustianCommunityId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const SCHEME = faustianCardId("hearts", "king");
const TWIST = faustianCardId("spades", "ace");
const H5 = faustianCardId("hearts", "5");
const H2 = faustianCardId("hearts", "2");
const H7 = faustianCardId("hearts", "7");
const SK = faustianCardId("spades", "king");
const HK = faustianCardId("hearts", "king");
const HQ = faustianCardId("hearts", "queen");
const H8 = faustianCardId("hearts", "8");
const C4 = faustianCardId("clubs", "4");

function findValidatorMembers(
  validator: { kind?: string; members?: unknown[]; fields?: Record<string, { kind?: string; value?: unknown }> },
  type: string,
  version: number,
): unknown[] {
  if (validator.kind === "union") {
    return (validator.members as Array<{ kind?: string }>).flatMap((member) =>
      findValidatorMembers(member as never, type, version),
    );
  }
  if (validator.kind === "object") {
    const typeField = validator.fields?.type;
    const versionField = validator.fields?.version;
    if (typeField?.kind === "literal" && typeField.value === type && versionField?.kind === "literal" && versionField.value === version) {
      return [validator];
    }
  }
  return [];
}

const FAUSTIAN_REGISTRATION: readonly {
  readonly commandType: string;
  readonly mutationName: string;
  readonly eventType: string;
  readonly mapLine: string;
  readonly event: CampaignEvent;
}[] = [
  {
    commandType: "reveal_faustian_community_schemes",
    mutationName: "revealFaustianCommunitySchemes",
    eventType: "faustian_community_schemes_revealed",
    mapLine: "reveal_faustian_community_schemes: { required: [\"faustian_community_schemes_revealed\"] }",
    event: { type: "faustian_community_schemes_revealed", version: 1, data: { communityId: ARIES, revealedSchemeCardIds: [SCHEME], eligibleSchemeCardIds: [SCHEME] } },
  },
  {
    commandType: "foil_faustian_community_scheme",
    mutationName: "foilFaustianCommunityScheme",
    eventType: "faustian_community_scheme_foiled",
    mapLine: "foil_faustian_community_scheme: { required: [\"faustian_community_scheme_foiled\"] }",
    event: { type: "faustian_community_scheme_foiled", version: 1, data: { communityId: ARIES, schemeCardId: SCHEME } },
  },
  {
    commandType: "arrange_faustian_table",
    mutationName: "arrangeFaustianTable",
    eventType: "faustian_antagonist_established",
    mapLine: "arrange_faustian_table: { required: [\"faustian_table_arranged\"], optional: [\"faustian_antagonist_established\"] }",
    event: { type: "faustian_antagonist_established", version: 1, data: { denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId, seatId: "hierophant", chipCount: 2 } },
  },
  {
    commandType: "record_faustian_scheme_occurred",
    mutationName: "recordFaustianSchemeOccurred",
    eventType: "faustian_scheme_occurred",
    mapLine: "record_faustian_scheme_occurred: { required: [\"faustian_scheme_occurred\"] }",
    event: { type: "faustian_scheme_occurred", version: 1, data: { communityId: ARIES, schemeCardId: SCHEME, destination: { kind: "ordinary_machinations" }, directAccompliceCardIds: [H5], cascadedAccompliceCardIds: [H2], fallenAccompliceCardIds: [H5, H2], pawnCommunityIds: [ARIES] } },
  },
  {
    commandType: "disclose_faustian_twist",
    mutationName: "discloseFaustianTwist",
    eventType: "faustian_twist_disclosed",
    mapLine: "disclose_faustian_twist: { required: [\"faustian_twist_disclosed\"] }",
    event: { type: "faustian_twist_disclosed", version: 1, data: { disclosedTwistCardId: TWIST, replacementTwistCardId: H7 } },
  },
  {
    commandType: "record_faustian_twist_occurred",
    mutationName: "recordFaustianTwistOccurred",
    eventType: "faustian_twist_occurred",
    mapLine: "record_faustian_twist_occurred: { required: [\"faustian_twist_occurred\"] }",
    event: { type: "faustian_twist_occurred", version: 1, data: { twistCardId: TWIST, movedDevilDeckCardIds: [SK] } },
  },
  {
    commandType: "record_faustian_machination_outcome",
    mutationName: "recordFaustianMachinationOutcome",
    eventType: "faustian_machination_outcome_recorded",
    mapLine: "record_faustian_machination_outcome: { required: [\"faustian_machination_outcome_recorded\"] }",
    event: { type: "faustian_machination_outcome_recorded", version: 1, data: { resultKind: "one_pair", scoringHandCardIds: [HK, SK, HQ, H8, H7], challengeId: "fpmc_00000000-0000-0000-0000-000000000001", recycledCardIds: [C4], outcomeDependentTwistCardIds: [TWIST], persistentEffect: null } },
  },
  {
    commandType: "complete_faustian_machination_response",
    mutationName: "completeFaustianMachinationResponse",
    eventType: "faustian_machination_response_completed",
    mapLine: "complete_faustian_machination_response: { required: [\"faustian_machination_response_completed\"] }",
    event: { type: "faustian_machination_response_completed", version: 1, data: { challengeId: "fpmc_00000000-0000-0000-0000-000000000001", groupId: "fpmg_00000000-0000-0000-0000-000000000001", completedByWizardId: WIZ_A, completedMonthOrdinal: 3 as MonthOrdinal, recycledCardIds: [HK] } },
  },
  {
    commandType: "finalize_faustian_machination_challenge",
    mutationName: "finalizeFaustianMachinationChallenge",
    eventType: "faustian_machination_challenge_finalized",
    mapLine: "finalize_faustian_machination_challenge: { required: [\"faustian_machination_challenge_finalized\"] }",
    event: { type: "faustian_machination_challenge_finalized", version: 1, data: { challengeId: "fpmc_00000000-0000-0000-0000-000000000001", pendingHoldingDisposition: "shuffle_into_faustian_deck", routedCardIds: [], twistDispositions: [{ cardId: TWIST, destination: "remain_face_up_in_machinations" }] } },
  },
  {
    commandType: "correct_faustian_card",
    mutationName: "correctFaustianCard",
    eventType: "faustian_card_corrected",
    mapLine: "correct_faustian_card: { required: [\"faustian_card_corrected\"] }",
    event: { type: "faustian_card_corrected", version: 1, data: { correctionKind: "placement", cardId: HK, deck: null } },
  },
  {
    commandType: "correct_faustian_antagonist",
    mutationName: "correctFaustianAntagonist",
    eventType: "faustian_antagonist_corrected",
    mapLine: "correct_faustian_antagonist: { required: [\"faustian_antagonist_corrected\"] }",
    event: { type: "faustian_antagonist_corrected", version: 1, data: { correctionKind: "attach", denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId } },
  },
  {
    commandType: "correct_faustian_demon",
    mutationName: "correctFaustianDemon",
    eventType: "faustian_demon_corrected",
    mapLine: "correct_faustian_demon: { required: [\"faustian_demon_corrected\"] }",
    event: { type: "faustian_demon_corrected", version: 1, data: { correctionKind: "record", denizenId: "den_00000000-0000-0000-0000-000000000002" as DenizenId } },
  },
  {
    commandType: "correct_faustian_domain_seizure",
    mutationName: "correctFaustianDomainSeizure",
    eventType: "faustian_domain_seizure_corrected",
    mapLine: "correct_faustian_domain_seizure: { required: [\"faustian_domain_seizure_corrected\"] }",
    event: { type: "faustian_domain_seizure_corrected", version: 1, data: { correctionKind: "set", seatId: "hierophant" } },
  },
  {
    commandType: "correct_faustian_devil_profile",
    mutationName: "correctFaustianDevilProfile",
    eventType: "faustian_devil_profile_corrected",
    mapLine: "correct_faustian_devil_profile: { required: [\"faustian_devil_profile_corrected\"] }",
    event: { type: "faustian_devil_profile_corrected", version: 1, data: { correctionKind: "laws" } },
  },
  {
    commandType: "record_faustian_due_month_obligation",
    mutationName: "recordFaustianDueMonthObligation",
    eventType: "faustian_due_month_obligation_recorded",
    mapLine: "record_faustian_due_month_obligation: { required: [\"faustian_due_month_obligation_recorded\"] }",
    event: { type: "faustian_due_month_obligation_recorded", version: 1, data: { wizardId: WIZ_A, dueMonthOrdinal: 4 as MonthOrdinal, weeks: 1 } },
  },
  {
    commandType: "fulfill_faustian_due_month_obligation",
    mutationName: "fulfillFaustianDueMonthObligation",
    eventType: "faustian_due_month_obligation_fulfilled",
    mapLine: "fulfill_faustian_due_month_obligation: { required: [\"faustian_due_month_obligation_fulfilled\"] }",
    event: { type: "faustian_due_month_obligation_fulfilled", version: 1, data: { wizardId: WIZ_A, dueMonthOrdinal: 4 as MonthOrdinal, weeks: 1 } },
  },
  {
    commandType: "correct_faustian_persistent_effect",
    mutationName: "correctFaustianPersistentEffect",
    eventType: "faustian_persistent_effect_corrected",
    mapLine: "correct_faustian_persistent_effect: { required: [\"faustian_persistent_effect_corrected\"] }",
    event: { type: "faustian_persistent_effect_corrected", version: 1, data: { correctionKind: "add", effectKind: "flush" } },
  },
];

describe("Faustian persisted event registration", () => {
  it("registers every A/B/C/D Faustian event across union, map, Convex validator, Activity, and mutations", () => {
    const mapSource = readFileSync(join(__dirname, "..", "convex", "canonicalCommit.ts"), "utf8");
    const commandSource = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");
    const activitySource = readFileSync(join(__dirname, "..", "shared", "domain", "activity.ts"), "utf8");
    for (const entry of FAUSTIAN_REGISTRATION) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(entry.commandType);
      expect(isLogicalStateCommandType(entry.commandType as typeof CAMPAIGN_COMMAND_TYPES[number])).toBe(true);
      expect(mapSource).toContain(entry.mapLine);
      expect(findValidatorMembers(campaignEventValidator as never, entry.eventType, 1).length).toBe(1);
      expect(activitySource).toContain(`case "${entry.eventType}":`);
      expect(commandSource).toContain(`export const ${entry.mutationName} = mutation({`);
      const text = describeActivityEntry(mapEventToActivityEntry("evt_1", 9, entry.event));
      expect(text).not.toMatch(/hearts_king|spades_ace|King of Hearts|Five of Hearts|hearts_5/i);
    }
  });
});
