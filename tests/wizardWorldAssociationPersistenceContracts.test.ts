import { describe, it, expect } from "vitest";
import type {
  WizardHomeIsleChangedEventV1,
  WizardSanctumChangedEventV1,
  WizardId,
  IsleId,
  PlaceId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  setWizardHomeIsleFingerprint,
  setWizardSanctumFingerprint,
  mapEventToActivityEntry,
} from "../shared/domain";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import type { CurrentCampaignState } from "../shared/domain";

describe("Wizard world association persistence contracts", () => {
  // 1. Command types are active and logical-state
  it("CAMPAIGN_COMMAND_TYPES contains set_wizard_home_isle and set_wizard_sanctum as logical-state commands", () => {
    const types = CAMPAIGN_COMMAND_TYPES as readonly string[];
    expect(types).toContain("set_wizard_home_isle");
    expect(types).toContain("set_wizard_sanctum");
    expect(isLogicalStateCommandType("set_wizard_home_isle")).toBe(true);
    expect(isLogicalStateCommandType("set_wizard_sanctum")).toBe(true);
  });

  // 2. Fingerprints are deterministic and sensitive to expected/value changes
  it("association fingerprints are deterministic and sensitive to expected/value changes", () => {
    const wizId = "wizard_00000000-0000-0000-0000-000000000001";

    // home isle: deterministic
    const fp1 = setWizardHomeIsleFingerprint(CAMPAIGN_ID, wizId, { expected: null, value: "isle_001" });
    const fp2 = setWizardHomeIsleFingerprint(CAMPAIGN_ID, wizId, { expected: null, value: "isle_001" });
    expect(fp1).toBe(fp2);

    // home isle: changes when expected changes
    const fp3 = setWizardHomeIsleFingerprint(CAMPAIGN_ID, wizId, { expected: "isle_001", value: "isle_001" });
    expect(fp3).not.toBe(fp1);

    // home isle: changes when value changes
    const fp4 = setWizardHomeIsleFingerprint(CAMPAIGN_ID, wizId, { expected: null, value: "isle_002" });
    expect(fp4).not.toBe(fp1);

    // home isle: changing expectedCampaignId changes fingerprint
    const fp5 = setWizardHomeIsleFingerprint("cmp_00000000-0000-0000-0000-000000000002", wizId, { expected: null, value: "isle_001" });
    expect(fp5).not.toBe(fp1);

    // sanctum: deterministic
    const sf1 = setWizardSanctumFingerprint(CAMPAIGN_ID, wizId, { expected: null, value: "place_001" });
    const sf2 = setWizardSanctumFingerprint(CAMPAIGN_ID, wizId, { expected: null, value: "place_001" });
    expect(sf1).toBe(sf2);

    // sanctum: changes when expected changes
    const sf3 = setWizardSanctumFingerprint(CAMPAIGN_ID, wizId, { expected: "place_001", value: "place_001" });
    expect(sf3).not.toBe(sf1);

    // sanctum: changes when value changes
    const sf4 = setWizardSanctumFingerprint(CAMPAIGN_ID, wizId, { expected: null, value: "place_002" });
    expect(sf4).not.toBe(sf1);
  });

  // 3. Canonical coherence accepts both command/event pairs
  it("validateEventCoherence accepts set_wizard_home_isle and set_wizard_sanctum with matching events", () => {
    const dummyState = {} as CurrentCampaignState;
    const baseInput = {
      campaignDocId: "dummy" as unknown as CanonicalCommitInput["campaignDocId"],
      campaignId: "cmp_dummy",
      currentRevision: 0,
      currentState: dummyState,
      commandId: "cmd_dummy",
      commandFingerprint: "fp_dummy",
      nextState: dummyState,
      historyControlUpdate: { kind: "logical_state_append" as const },
    };

    const homeIsleEvent: WizardHomeIsleChangedEventV1 = {
      type: "wizard_home_isle_changed",
      version: 1,
      data: {
        wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
        previousHomeIsleId: null,
        newHomeIsleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "set_wizard_home_isle", events: [homeIsleEvent] },
        1,
      ),
    ).not.toThrow();

    const sanctumEvent: WizardSanctumChangedEventV1 = {
      type: "wizard_sanctum_changed",
      version: 1,
      data: {
        wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
        previousSanctumPlaceId: null,
        newSanctumPlaceId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "set_wizard_sanctum", events: [sanctumEvent] },
        1,
      ),
    ).not.toThrow();
  });

  // 4. Activity maps both events to campaign_configuration
  it("Activity mapping for both association events uses campaign_configuration", () => {
    const homeIsleEvent: WizardHomeIsleChangedEventV1 = {
      type: "wizard_home_isle_changed",
      version: 1,
      data: {
        wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
        previousHomeIsleId: null,
        newHomeIsleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
      },
    };
    const entry1 = mapEventToActivityEntry("e1", 1, homeIsleEvent);
    expect(entry1.type).toBe("campaign_configuration");
    if (entry1.type === "campaign_configuration") {
      expect(entry1.description).toContain("home Isle");
    }

    const sanctumEvent: WizardSanctumChangedEventV1 = {
      type: "wizard_sanctum_changed",
      version: 1,
      data: {
        wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
        previousSanctumPlaceId: null,
        newSanctumPlaceId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
      },
    };
    const entry2 = mapEventToActivityEntry("e2", 2, sanctumEvent);
    expect(entry2.type).toBe("campaign_configuration");
    if (entry2.type === "campaign_configuration") {
      expect(entry2.description).toContain("Sanctum");
    }
  });
});
