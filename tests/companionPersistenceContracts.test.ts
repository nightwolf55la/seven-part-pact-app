import { describe, it, expect } from "vitest";
import type {
  WizardCompanionChangedEventV1,
  CompanionDescriptionChangedEventV1,
  WizardId,
  ElementId,
  CompanionRelationshipId,
  CompanionRelationship,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  setWizardCompanionFingerprint,
  updateCompanionDescriptionFingerprint,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import type { CurrentCampaignState } from "../shared/domain";

describe("Companion persistence contracts", () => {
  // 1. Command types are active and logical-state
  it("CAMPAIGN_COMMAND_TYPES contains set_wizard_companion and update_companion_description as logical-state commands", () => {
    const types = CAMPAIGN_COMMAND_TYPES as readonly string[];
    expect(types).toContain("set_wizard_companion");
    expect(types).toContain("update_companion_description");
    expect(isLogicalStateCommandType("set_wizard_companion")).toBe(true);
    expect(isLogicalStateCommandType("update_companion_description")).toBe(true);
  });

  // 2. setWizardCompanionFingerprint: deterministic and sensitive
  it("setWizardCompanionFingerprint is deterministic and sensitive to intent changes", () => {
    const wizId = "wizard_00000000-0000-0000-0000-000000000001";
    const baseInput = {
      wizardId: wizId,
      element: "fire" as ElementId,
      expectedCurrentRelationshipId: null as CompanionRelationshipId | null,
      newRelationship: {
        companionRelationshipId: "comp_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId,
        denizenId: "denizen_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId,
        description: "A fiery companion" as string | null,
      },
    };

    const fp1 = setWizardCompanionFingerprint(baseInput);
    const fp2 = setWizardCompanionFingerprint(baseInput);
    expect(fp1).toBe(fp2);

    // changing expectedCurrentRelationshipId changes fingerprint
    const fp3 = setWizardCompanionFingerprint({
      ...baseInput,
      expectedCurrentRelationshipId: "comp_00000000-0000-0000-0000-000000000002" as CompanionRelationshipId,
    });
    expect(fp3).not.toBe(fp1);

    // changing newRelationship content changes fingerprint
    const fp4 = setWizardCompanionFingerprint({
      ...baseInput,
      newRelationship: {
        ...baseInput.newRelationship!,
        description: "A different companion",
      },
    });
    expect(fp4).not.toBe(fp1);

    // null newRelationship changes fingerprint
    const fp5 = setWizardCompanionFingerprint({
      ...baseInput,
      newRelationship: null,
    });
    expect(fp5).not.toBe(fp1);
  });

  // 3. updateCompanionDescriptionFingerprint: canonical/deterministic and sensitive
  it("updateCompanionDescriptionFingerprint is canonical and sensitive to intent changes", () => {
    const compId = "comp_00000000-0000-0000-0000-000000000001";
    const baseInput = {
      companionRelationshipId: compId,
      expectedStatus: "current" as const,
      description: { expected: "old desc" as string | null, value: "new desc" as string | null },
    };

    const fp1 = updateCompanionDescriptionFingerprint(baseInput);
    const fp2 = updateCompanionDescriptionFingerprint(baseInput);
    expect(fp1).toBe(fp2);

    // changing expectedStatus changes fingerprint
    const fp3 = updateCompanionDescriptionFingerprint({
      ...baseInput,
      expectedStatus: "ended" as const,
    });
    expect(fp3).not.toBe(fp1);

    // changing description.expected changes fingerprint
    const fp4 = updateCompanionDescriptionFingerprint({
      ...baseInput,
      description: { ...baseInput.description, expected: "different old" },
    });
    expect(fp4).not.toBe(fp1);

    // changing description.value changes fingerprint
    const fp5 = updateCompanionDescriptionFingerprint({
      ...baseInput,
      description: { ...baseInput.description, value: "different new" },
    });
    expect(fp5).not.toBe(fp1);
  });

  // 4. Canonical coherence accepts both command/event pairs
  it("validateEventCoherence accepts set_wizard_companion and update_companion_description with matching events", () => {
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

    const companionEvent: WizardCompanionChangedEventV1 = {
      type: "wizard_companion_changed",
      version: 1,
      data: {
        wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
        element: "fire" as ElementId,
        previousCurrentRelationship: null,
        newCurrentRelationship: null,
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "set_wizard_companion", events: [companionEvent] },
        1,
      ),
    ).not.toThrow();

    const descEvent: CompanionDescriptionChangedEventV1 = {
      type: "companion_description_changed",
      version: 1,
      data: {
        companionRelationshipId: "comp_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId,
        previous: {
          companionRelationshipId: "comp_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId,
          wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
          element: "fire" as ElementId,
          denizenId: "denizen_00000000-0000-0000-0000-000000000001" as unknown as CompanionRelationship["denizenId"],
          description: "old",
          status: "current",
        },
        updated: {
          companionRelationshipId: "comp_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId,
          wizardId: "wizard_00000000-0000-0000-0000-000000000001" as WizardId,
          element: "fire" as ElementId,
          denizenId: "denizen_00000000-0000-0000-0000-000000000001" as unknown as CompanionRelationship["denizenId"],
          description: "new",
          status: "current",
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "update_companion_description", events: [descEvent] },
        1,
      ),
    ).not.toThrow();
  });
});
