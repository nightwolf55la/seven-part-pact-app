import { describe, it, expect, expectTypeOf } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CampaignEvent,
  CampaignStateV5,
  DenizenId,
  InitializeNecromancerInput,
  MonthOrdinal,
  NecromancerCampaignGateId,
  NecromancerCampaignPathSpaceId,
  NecromancerEvent,
  NecromancerInitializedEventV1,
  PlayerId,
  PowerfulDenizenTruthId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  addNecromancerAllyFingerprint,
  addNecromancerFoeFingerprint,
  addNecromancerGhoulCallerFingerprint,
  addNecromancerStepFingerprint,
  addNecromancerWizardFoeTruthFingerprint,
  addNecromancerWizardTraversalFingerprint,
  applyAddNecromancerAlly,
  applyAddNecromancerFoe,
  applyAddNecromancerGhoulCaller,
  applyAddNecromancerStep,
  applyAddNecromancerWizardFoeTruth,
  applyAddNecromancerWizardTraversal,
  applyCreateNecromancerCampaignGate,
  applyCreateNecromancerCampaignPathSpace,
  applyInitializeNecromancer,
  applyMoveNecromancerSouls,
  applyRemoveNecromancerAlly,
  applyRemoveNecromancerCampaignPathSpace,
  applyRemoveNecromancerFoe,
  applyRemoveNecromancerGhoulCaller,
  applyRemoveNecromancerStep,
  applyRemoveNecromancerWizardFoeTruth,
  applyRemoveNecromancerWizardTraversal,
  applyEscapeNecromancerWizardFoe,
  applySetNecromancerDepth,
  applySetNecromancerGateStatus,
  applySetNecromancerSelectedLaws,
  applySetNecromancerSoulCount,
  applyUpdateNecromancerAlly,
  applyUpdateNecromancerCampaignGate,
  applyUpdateNecromancerFoe,
  applyUpdateNecromancerGhoulCaller,
  applyUpdateNecromancerWizardFoeTruth,
  applyUpdateNecromancerWizardTraversal,
  canonicalizeCreateNecromancerCampaignGateInput,
  canonicalizeInitializeNecromancerInput,
  canonicalizeNecromancerGhoulCaller,
  canonicalizeUpdateNecromancerCampaignGateFields,
  canonicalizeUpdateNecromancerGhoulCallerFields,
  createNecromancerCampaignGateFingerprint,
  createNecromancerCampaignPathSpaceFingerprint,
  initializeNecromancerFingerprint,
  isLogicalStateCommandType,
  isNecromancerWizardFoe,
  moveNecromancerSoulsFingerprint,
  removeNecromancerAllyFingerprint,
  removeNecromancerCampaignPathSpaceFingerprint,
  removeNecromancerFoeFingerprint,
  removeNecromancerGhoulCallerFingerprint,
  removeNecromancerStepFingerprint,
  removeNecromancerWizardFoeTruthFingerprint,
  removeNecromancerWizardTraversalFingerprint,
  escapeNecromancerWizardFoeFingerprint,
  setNecromancerDepthFingerprint,
  setNecromancerGateStatusFingerprint,
  setNecromancerSoulCountFingerprint,
  setSelectedDeathLawsFingerprint,
  updateNecromancerAllyFingerprint,
  updateNecromancerCampaignGateFingerprint,
  updateNecromancerFoeFingerprint,
  updateNecromancerGhoulCallerFingerprint,
  updateNecromancerWizardFoeTruthFingerprint,
  updateNecromancerWizardTraversalFingerprint,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import { campaignEventValidator } from "../convex/validators";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";
import * as Domain from "../shared/domain";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_3 = "den_00000000-0000-0000-0000-000000000003" as DenizenId;
const DEN_4 = "den_00000000-0000-0000-0000-000000000004" as DenizenId;
const DEN_5 = "den_00000000-0000-0000-0000-000000000005" as DenizenId;
const DEN_6 = "den_00000000-0000-0000-0000-000000000006" as DenizenId;
const DEN_COLLECTIVE = "den_00000000-0000-0000-0000-0000000000cc" as DenizenId;
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000ab" as NecromancerCampaignGateId;
const CAMPAIGN_PATH = "nps_00000000-0000-0000-0000-0000000000cd" as NecromancerCampaignPathSpaceId;

export const NECROMANCER_COMMAND_TYPES = [
  "initialize_necromancer",
  "set_necromancer_depth",
  "set_selected_death_laws",
  "set_necromancer_gate_status",
  "set_necromancer_soul_count",
  "move_necromancer_souls",
  "add_necromancer_foe",
  "update_necromancer_foe",
  "remove_necromancer_foe",
  "escape_necromancer_wizard_foe",
  "add_necromancer_wizard_foe_truth",
  "update_necromancer_wizard_foe_truth",
  "remove_necromancer_wizard_foe_truth",
  "add_necromancer_wizard_traversal",
  "update_necromancer_wizard_traversal",
  "remove_necromancer_wizard_traversal",
  "add_necromancer_ally",
  "update_necromancer_ally",
  "remove_necromancer_ally",
  "add_necromancer_ghoul_caller",
  "update_necromancer_ghoul_caller",
  "remove_necromancer_ghoul_caller",
  "create_necromancer_campaign_gate",
  "update_necromancer_campaign_gate",
  "create_necromancer_campaign_path_space",
  "remove_necromancer_campaign_path_space",
  "add_necromancer_step",
  "remove_necromancer_step",
] as const;

const NECROMANCER_COMMAND_EVENT_PAIRS: ReadonlyArray<readonly [
  (typeof NECROMANCER_COMMAND_TYPES)[number],
  NecromancerEvent["type"],
]> = [
  ["initialize_necromancer", "necromancer_initialized"],
  ["set_necromancer_depth", "necromancer_depth_changed"],
  ["set_selected_death_laws", "necromancer_laws_changed"],
  ["set_necromancer_gate_status", "necromancer_gate_status_changed"],
  ["set_necromancer_soul_count", "necromancer_soul_count_changed"],
  ["move_necromancer_souls", "necromancer_souls_moved"],
  ["add_necromancer_foe", "necromancer_foe_added"],
  ["update_necromancer_foe", "necromancer_foe_updated"],
  ["remove_necromancer_foe", "necromancer_foe_removed"],
  ["escape_necromancer_wizard_foe", "necromancer_wizard_foe_escaped"],
  ["add_necromancer_wizard_foe_truth", "necromancer_wizard_foe_truth_added"],
  ["update_necromancer_wizard_foe_truth", "necromancer_wizard_foe_truth_updated"],
  ["remove_necromancer_wizard_foe_truth", "necromancer_wizard_foe_truth_removed"],
  ["add_necromancer_wizard_traversal", "necromancer_wizard_traversal_added"],
  ["update_necromancer_wizard_traversal", "necromancer_wizard_traversal_updated"],
  ["remove_necromancer_wizard_traversal", "necromancer_wizard_traversal_removed"],
  ["add_necromancer_ally", "necromancer_ally_added"],
  ["update_necromancer_ally", "necromancer_ally_updated"],
  ["remove_necromancer_ally", "necromancer_ally_removed"],
  ["add_necromancer_ghoul_caller", "necromancer_ghoul_caller_added"],
  ["update_necromancer_ghoul_caller", "necromancer_ghoul_caller_updated"],
  ["remove_necromancer_ghoul_caller", "necromancer_ghoul_caller_removed"],
  ["create_necromancer_campaign_gate", "necromancer_campaign_gate_created"],
  ["update_necromancer_campaign_gate", "necromancer_campaign_gate_updated"],
  ["create_necromancer_campaign_path_space", "necromancer_campaign_path_space_created"],
  ["remove_necromancer_campaign_path_space", "necromancer_campaign_path_space_removed"],
  ["add_necromancer_step", "necromancer_step_added"],
  ["remove_necromancer_step", "necromancer_step_removed"],
];

const MUTATION_NAMES = [
  "initializeNecromancer",
  "setNecromancerDepth",
  "setSelectedDeathLaws",
  "setNecromancerGateStatus",
  "setNecromancerSoulCount",
  "moveNecromancerSouls",
  "addNecromancerFoe",
  "updateNecromancerFoe",
  "removeNecromancerFoe",
  "escapeNecromancerWizardFoe",
  "addNecromancerWizardFoeTruth",
  "updateNecromancerWizardFoeTruth",
  "removeNecromancerWizardFoeTruth",
  "addNecromancerWizardTraversal",
  "updateNecromancerWizardTraversal",
  "removeNecromancerWizardTraversal",
  "addNecromancerAlly",
  "updateNecromancerAlly",
  "removeNecromancerAlly",
  "addNecromancerGhoulCaller",
  "updateNecromancerGhoulCaller",
  "removeNecromancerGhoulCaller",
  "createNecromancerCampaignGate",
  "updateNecromancerCampaignGate",
  "createNecromancerCampaignPathSpace",
  "removeNecromancerCampaignPathSpace",
  "addNecromancerStep",
  "removeNecromancerStep",
] as const;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

const FOE_PROFILE = {
  taxonomies: [{ kind: "builtin" as const, taxonomyId: "foe_of_death" as const }],
  status: { kind: "standard" as const, value: "malignant" as const },
  goal: null,
  methods: [],
  truths: [],
};
const GHOUL_PROFILE = {
  taxonomies: [{ kind: "builtin" as const, taxonomyId: "ghoul_caller" as const }],
  status: { kind: "standard" as const, value: "disruptive" as const },
  goal: null,
  methods: [],
  truths: [],
};
const TRUTH_1 = "pdtru_00000000-0000-0000-0000-0000000000d2" as PowerfulDenizenTruthId;

function wizard(wizardId: WizardId, name: string, mortalityState: "not_deceased" | "deceased" = "not_deceased") {
  return {
    wizardId,
    name,
    portrayedByPlayerId: PLR_A,
    character: {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    },
    homeIsleId: null,
    sanctumPlaceId: null,
    mortalityState: mortalityState,
  };
}

function baseV5(): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_A, "Wizard A")],
    pactSeats: {
      ...EMPTY_PACT_SEATS,
      necromancer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    world: {
      denizens: [
        { denizenId: DEN_1, name: "Deep Foe", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: FOE_PROFILE },
        { denizenId: DEN_2, name: "Terminus Foe", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: FOE_PROFILE },
        { denizenId: DEN_3, name: "Far Foe One", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: FOE_PROFILE },
        { denizenId: DEN_4, name: "Far Foe Two", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: FOE_PROFILE },
        { denizenId: DEN_5, name: "Near Ally", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: null },
        { denizenId: DEN_6, name: "Ghoul-Caller", representation: "individual", description: null, mortalityState: "not_deceased", powerfulProfile: GHOUL_PROFILE },
        { denizenId: DEN_COLLECTIVE, name: "A Host of Dead", representation: "collective", description: null, mortalityState: null, powerfulProfile: FOE_PROFILE },
      ],
      isles: [],
      places: [],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    },
  });
}

function quietInput(): InitializeNecromancerInput {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
    arrangementGhoulCaller: null,
  };
}

function findValidatorMembers(validator: { kind?: string; members?: unknown[]; fields?: Record<string, { kind?: string; value?: unknown }> }, type: string, version: number): unknown[] {
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

function matchesValidator(validator: { kind?: string; value?: unknown; members?: unknown[]; element?: unknown; fields?: Record<string, unknown>; inner?: unknown }, value: unknown): boolean {
  switch (validator.kind) {
    case "string":
      return typeof value === "string";
    case "number":
    case "float64":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "literal":
      return value === validator.value;
    case "any":
      return true;
    case "union":
      return (validator.members as Array<{ kind?: string }>).some((member) => matchesValidator(member, value));
    case "array":
      return Array.isArray(value) && value.every((item) => matchesValidator(validator.element as { kind?: string }, item));
    case "optional":
      return value === undefined || matchesValidator(validator.inner as { kind?: string }, value);
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const obj = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(validator.fields ?? {})) {
        const fieldValidator = field as { kind?: string; inner?: unknown };
        const optional = fieldValidator.kind === "optional";
        const inner = optional ? fieldValidator.inner as { kind?: string } : fieldValidator;
        if (!(key in obj) || obj[key] === undefined) {
          if (optional) {
            continue;
          }
          return false;
        }
        if (!matchesValidator(inner, obj[key])) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

function collectRealNecromancerEvents(): NecromancerEvent[] {
  const initialized = applyInitializeNecromancer(baseV5(), quietInput());
  let state = initialized.nextState;
  const events: NecromancerEvent[] = [...initialized.events];

  const depth = applySetNecromancerDepth(state, { wizardId: WIZ_A, value: 0 }, { wizardId: WIZ_A, value: 2 });
  state = depth.nextState;
  events.push(...depth.events);

  const laws = applySetNecromancerSelectedLaws(state, state.necromancer.selectedLaws, [
    { lawId: "seventh", visibility: "hidden" },
  ]);
  state = laws.nextState;
  events.push(...laws.events);

  const status = applySetNecromancerGateStatus(state, "deep", "ordinary", "hostile");
  state = status.nextState;
  events.push(...status.events);

  const souls = applySetNecromancerSoulCount(state, { kind: "path", pathSpaceId: "edge_sage" }, 1, 3);
  state = souls.nextState;
  events.push(...souls.events);

  const moved = applyMoveNecromancerSouls(
    state,
    { kind: "path", pathSpaceId: "edge_sage" },
    { kind: "path", pathSpaceId: "edge_hierophant" },
    2,
    3,
    1,
  );
  state = moved.nextState;
  events.push(...moved.events);

  const addedFoe = applyAddNecromancerFoe(state, {
    subject: { kind: "denizen", denizenId: DEN_COLLECTIVE },
    location: { kind: "gate", gateId: "bronze" },
  });
  state = addedFoe.nextState;
  events.push(...addedFoe.events);

  const updatedFoe = applyUpdateNecromancerFoe(state, { kind: "denizen", denizenId: DEN_COLLECTIVE }, {
    location: { expected: { kind: "gate", gateId: "bronze" }, value: { kind: "escaped", seatId: "sage", abominationKind: "occult" } },
  });
  state = updatedFoe.nextState;
  events.push(...updatedFoe.events);

  const removedFoe = applyRemoveNecromancerFoe(state, { kind: "denizen", denizenId: DEN_COLLECTIVE }, {
    subject: { kind: "denizen", denizenId: DEN_COLLECTIVE },
    location: { kind: "escaped", seatId: "sage", abominationKind: "occult" },
  });
  state = removedFoe.nextState;
  events.push(...removedFoe.events);

  const addedAlly = applyAddNecromancerAlly(state, {
    denizenId: DEN_3,
    location: { kind: "gate", gateId: "lead" },
  });
  state = addedAlly.nextState;
  events.push(...addedAlly.events);

  const updatedAlly = applyUpdateNecromancerAlly(state, DEN_3, {
    location: { expected: { kind: "gate", gateId: "lead" }, value: { kind: "gate", gateId: "ivory" } },
  });
  state = updatedAlly.nextState;
  events.push(...updatedAlly.events);

  const removedAlly = applyRemoveNecromancerAlly(state, DEN_3, {
    denizenId: DEN_3,
    location: { kind: "gate", gateId: "ivory" },
  });
  state = removedAlly.nextState;
  events.push(...removedAlly.events);

  const addedGhoul = applyAddNecromancerGhoulCaller(state, {
    denizenId: DEN_6,
    location: { kind: "path", pathSpaceId: "edge_mariner" },
    pettyDeadCount: 0,
    primaryElement: "air",
    aesthetic: "pale linen",
    strangeQuirk: "never blinks",
    ageYears: 33,
  });
  state = addedGhoul.nextState;
  events.push(...addedGhoul.events);

  const updatedGhoul = applyUpdateNecromancerGhoulCaller(state, DEN_6, {
    pettyDeadCount: { expected: 0, value: 2 },
  });
  state = updatedGhoul.nextState;
  events.push(...updatedGhoul.events);

  const removedGhoul = applyRemoveNecromancerGhoulCaller(state, DEN_6, state.necromancer.ghoulCallers[0]);
  state = removedGhoul.nextState;
  events.push(...removedGhoul.events);

  const createdGate = applyCreateNecromancerCampaignGate(state, {
    gateId: CAMPAIGN_GATE,
    name: "Ossuary",
    band: "far",
  });
  state = createdGate.nextState;
  events.push(...createdGate.events);

  const updatedGate = applyUpdateNecromancerCampaignGate(state, CAMPAIGN_GATE, {
    name: { expected: "Ossuary", value: "Black Ossuary" },
  });
  state = updatedGate.nextState;
  events.push(...updatedGate.events);

  const createdPath = applyCreateNecromancerCampaignPathSpace(state, {
    pathSpaceId: CAMPAIGN_PATH,
    region: "abyss",
  });
  state = createdPath.nextState;
  events.push(...createdPath.events);

  const addedStep = applyAddNecromancerStep(state, {
    from: { kind: "path", pathSpaceId: CAMPAIGN_PATH },
    to: { kind: "gate", gateId: "terminus" },
  });
  state = addedStep.nextState;
  events.push(...addedStep.events);

  const removedStep = applyRemoveNecromancerStep(state, {
    from: { kind: "path", pathSpaceId: CAMPAIGN_PATH },
    to: { kind: "gate", gateId: "terminus" },
  });
  state = removedStep.nextState;
  events.push(...removedStep.events);

  const removedPath = applyRemoveNecromancerCampaignPathSpace(state, CAMPAIGN_PATH, {
    origin: "campaign",
    pathSpaceId: CAMPAIGN_PATH,
    region: "abyss",
  });
  events.push(...removedPath.events);
  state = removedPath.nextState;

  state = {
    ...state,
    wizards: [...state.wizards, wizard(WIZ_B, "Wizard B")],
  };
  const addedTraversal = applyAddNecromancerWizardTraversal(state, {
    wizardId: WIZ_B,
    kind: "living_katabasis",
    location: { kind: "gate", gateId: "amber" },
  });
  state = addedTraversal.nextState;
  events.push(...addedTraversal.events);

  const updatedTraversal = applyUpdateNecromancerWizardTraversal(state, WIZ_B, {
    location: { expected: { kind: "gate", gateId: "amber" }, value: { kind: "gate", gateId: "bronze" } },
  });
  state = updatedTraversal.nextState;
  events.push(...updatedTraversal.events);

  const removedTraversal = applyRemoveNecromancerWizardTraversal(state, WIZ_B, {
    wizardId: WIZ_B,
    kind: "living_katabasis",
    location: { kind: "gate", gateId: "bronze" },
  });
  state = removedTraversal.nextState;
  events.push(...removedTraversal.events);

  state = {
    ...state,
    wizards: state.wizards.map((candidate) =>
      candidate.wizardId === WIZ_B ? { ...candidate, mortalityState: "deceased" } : candidate,
    ),
  };
  const addedWizardFoe = applyAddNecromancerFoe(state, {
    subject: { kind: "wizard", wizardId: WIZ_B },
    location: { kind: "gate", gateId: "amber" },
    truths: [],
  });
  state = addedWizardFoe.nextState;
  events.push(...addedWizardFoe.events);

  const addedTruth = applyAddNecromancerWizardFoeTruth(state, {
    wizardId: WIZ_B,
    truthId: TRUTH_1,
    text: "The Edge remembers his name",
  });
  state = addedTruth.nextState;
  events.push(...addedTruth.events);

  const updatedTruth = applyUpdateNecromancerWizardFoeTruth(state, WIZ_B, TRUTH_1, {
    expected: "The Edge remembers his name",
    value: "The Edge still remembers his name",
  });
  state = updatedTruth.nextState;
  events.push(...updatedTruth.events);

  const wizardFoe = state.necromancer.foes.find(
    (foe) => foe.subject.kind === "wizard" && foe.subject.wizardId === WIZ_B,
  );
  if (wizardFoe === undefined || !isNecromancerWizardFoe(wizardFoe)) {
    throw new Error("expected Wizard Foe for event collection");
  }
  const escaped = applyEscapeNecromancerWizardFoe(
    state,
    WIZ_B,
    "deceased",
    wizardFoe,
    "sage",
  );
  state = escaped.nextState;
  events.push(...escaped.events);

  const escapedFoe = state.necromancer.foes.find(
    (foe) => foe.subject.kind === "wizard" && foe.subject.wizardId === WIZ_B,
  );
  if (escapedFoe === undefined || !isNecromancerWizardFoe(escapedFoe)) {
    throw new Error("expected escaped Wizard Foe for event collection");
  }
  const removedTruth = applyRemoveNecromancerWizardFoeTruth(state, WIZ_B, TRUTH_1, escapedFoe.truths[0]);
  events.push(...removedTruth.events);
  return events;
}

function coherenceInput(commandType: CanonicalCommitInput["commandType"], events: CanonicalCommitInput["events"]): CanonicalCommitInput {
  return {
    campaignDocId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId: CAMPAIGN_A,
    currentRevision: 4,
    currentState: baseV5(),
    commandId: COMMAND_1,
    commandType,
    commandFingerprint: `${commandType}:v1:test`,
    nextState: baseV5(),
    events,
    historyControlUpdate: { kind: "logical_state_append" },
  };
}

function campaignOf(campaignId: string, state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCampaign["docId"],
    campaignId,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null;
  snapshot?: unknown | null;
}) {
  const calls: string[] = [];
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() { calls.push("assertNotDeleting"); },
    async loadCanonicalCampaign() {
      calls.push("loadCanonicalCampaign");
      return options.campaign;
    },
    async findAcceptedCommand() {
      calls.push("findAcceptedCommand");
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      calls.push("loadCommittedSnapshot");
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      calls.push("commit");
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, calls, commits };
}

describe("Necromancer Phase 2B persistence contracts", () => {
  describe("command registry", () => {
    it("registers all 28 Necromancer commands as active logical-state types and omits remove-Gate", () => {
      expect(NECROMANCER_COMMAND_TYPES).toHaveLength(28);
      for (const commandType of NECROMANCER_COMMAND_TYPES) {
        expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
        expect(isLogicalStateCommandType(commandType)).toBe(true);
      }
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).not.toContain("remove_necromancer_gate");
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).not.toContain("remove_necromancer_campaign_gate");
      expect(Domain).not.toHaveProperty("applyRemoveNecromancerCampaignGate");
    });
  });

  describe("fingerprints", () => {
    it("exposes a v1 helper for every Necromancer command and is deterministic", () => {
      const helpers: Record<(typeof NECROMANCER_COMMAND_TYPES)[number], string> = {
        initialize_necromancer: initializeNecromancerFingerprint(CAMPAIGN_A, quietInput()),
        set_necromancer_depth: setNecromancerDepthFingerprint(CAMPAIGN_A, { wizardId: WIZ_A, value: 0 }, { wizardId: WIZ_A, value: 2 }),
        set_selected_death_laws: setSelectedDeathLawsFingerprint(CAMPAIGN_A, [{ lawId: "first", visibility: "revealed" }], []),
        set_necromancer_gate_status: setNecromancerGateStatusFingerprint(CAMPAIGN_A, "deep", "ordinary", "hostile"),
        set_necromancer_soul_count: setNecromancerSoulCountFingerprint(CAMPAIGN_A, { kind: "path", pathSpaceId: "edge_sage" }, 1, 3),
        move_necromancer_souls: moveNecromancerSoulsFingerprint(
          CAMPAIGN_A,
          { kind: "path", pathSpaceId: "edge_sage" },
          { kind: "path", pathSpaceId: "edge_hierophant" },
          1,
          1,
          1,
        ),
        add_necromancer_foe: addNecromancerFoeFingerprint(CAMPAIGN_A, { subject: { kind: "denizen", denizenId: DEN_3 }, location: { kind: "gate", gateId: "bronze" } }),
        update_necromancer_foe: updateNecromancerFoeFingerprint(CAMPAIGN_A, { kind: "denizen", denizenId: DEN_1 }, {
          location: { expected: { kind: "gate", gateId: "deep" }, value: { kind: "gate", gateId: "amber" } },
        }),
        remove_necromancer_foe: removeNecromancerFoeFingerprint(CAMPAIGN_A, { kind: "denizen", denizenId: DEN_1 }, {
          subject: { kind: "denizen", denizenId: DEN_1 },
          location: { kind: "gate", gateId: "deep" },
        }),
        escape_necromancer_wizard_foe: escapeNecromancerWizardFoeFingerprint(CAMPAIGN_A, WIZ_B, "deceased", {
          subject: { kind: "wizard", wizardId: WIZ_B },
          location: { kind: "gate", gateId: "amber" },
          truths: [],
        }, "sage"),
        add_necromancer_wizard_foe_truth: addNecromancerWizardFoeTruthFingerprint(CAMPAIGN_A, WIZ_B, TRUTH_1, "The Edge remembers his name"),
        update_necromancer_wizard_foe_truth: updateNecromancerWizardFoeTruthFingerprint(CAMPAIGN_A, WIZ_B, TRUTH_1, "The Edge remembers his name", "The Edge still remembers his name"),
        remove_necromancer_wizard_foe_truth: removeNecromancerWizardFoeTruthFingerprint(CAMPAIGN_A, WIZ_B, TRUTH_1, {
          truthId: TRUTH_1,
          text: "The Edge still remembers his name",
          origin: "campaign",
        }),
        add_necromancer_wizard_traversal: addNecromancerWizardTraversalFingerprint(CAMPAIGN_A, {
          wizardId: WIZ_B,
          kind: "living_katabasis",
          location: { kind: "gate", gateId: "amber" },
        }),
        update_necromancer_wizard_traversal: updateNecromancerWizardTraversalFingerprint(CAMPAIGN_A, WIZ_B, {
          location: { expected: { kind: "gate", gateId: "amber" }, value: { kind: "gate", gateId: "bronze" } },
        }),
        remove_necromancer_wizard_traversal: removeNecromancerWizardTraversalFingerprint(CAMPAIGN_A, WIZ_B, {
          wizardId: WIZ_B,
          kind: "living_katabasis",
          location: { kind: "gate", gateId: "amber" },
        }),
        add_necromancer_ally: addNecromancerAllyFingerprint(CAMPAIGN_A, { denizenId: DEN_3, location: { kind: "gate", gateId: "lead" } }),
        update_necromancer_ally: updateNecromancerAllyFingerprint(CAMPAIGN_A, DEN_5, {
          location: { expected: { kind: "gate", gateId: "amber" }, value: { kind: "gate", gateId: "ivory" } },
        }),
        remove_necromancer_ally: removeNecromancerAllyFingerprint(CAMPAIGN_A, DEN_5, {
          denizenId: DEN_5,
          location: { kind: "gate", gateId: "amber" },
        }),
        add_necromancer_ghoul_caller: addNecromancerGhoulCallerFingerprint(CAMPAIGN_A, {
          denizenId: DEN_6,
          location: { kind: "path", pathSpaceId: "edge_sage" },
          pettyDeadCount: 0,
          primaryElement: "fire",
          aesthetic: "ash-stained funeral silks",
          strangeQuirk: "counts backwards from thirteen",
          ageYears: 47,
        }),
        update_necromancer_ghoul_caller: updateNecromancerGhoulCallerFingerprint(CAMPAIGN_A, DEN_6, {
          pettyDeadCount: { expected: 0, value: 1 },
          primaryElement: { expected: "fire", value: "water" },
        }),
        remove_necromancer_ghoul_caller: removeNecromancerGhoulCallerFingerprint(CAMPAIGN_A, DEN_6, {
          denizenId: DEN_6,
          location: { kind: "path", pathSpaceId: "edge_sage" },
          pettyDeadCount: 0,
          primaryElement: "fire",
          aesthetic: "ash-stained funeral silks",
          strangeQuirk: "counts backwards from thirteen",
          ageYears: 47,
        }),
        create_necromancer_campaign_gate: createNecromancerCampaignGateFingerprint(CAMPAIGN_A, {
          gateId: CAMPAIGN_GATE,
          name: "Ossuary",
          band: "far",
        }),
        update_necromancer_campaign_gate: updateNecromancerCampaignGateFingerprint(CAMPAIGN_A, CAMPAIGN_GATE, {
          name: { expected: "Ossuary", value: "Black Ossuary" },
        }),
        create_necromancer_campaign_path_space: createNecromancerCampaignPathSpaceFingerprint(CAMPAIGN_A, {
          pathSpaceId: CAMPAIGN_PATH,
          region: "abyss",
        }),
        remove_necromancer_campaign_path_space: removeNecromancerCampaignPathSpaceFingerprint(CAMPAIGN_A, CAMPAIGN_PATH, {
          origin: "campaign",
          pathSpaceId: CAMPAIGN_PATH,
          region: "abyss",
        }),
        add_necromancer_step: addNecromancerStepFingerprint(CAMPAIGN_A, {
          from: { kind: "gate", gateId: "deep" },
          to: { kind: "path", pathSpaceId: "edge_sage" },
        }),
        remove_necromancer_step: removeNecromancerStepFingerprint(CAMPAIGN_A, {
          from: { kind: "gate", gateId: "deep" },
          to: { kind: "path", pathSpaceId: "edge_sage" },
        }),
      };
      for (const commandType of NECROMANCER_COMMAND_TYPES) {
        expect(helpers[commandType]).toContain(`${commandType}:v1:`);
      }
      expect(initializeNecromancerFingerprint(CAMPAIGN_A, quietInput()))
        .toBe(initializeNecromancerFingerprint(CAMPAIGN_A, quietInput()));
      expect(initializeNecromancerFingerprint(CAMPAIGN_B, quietInput()))
        .not.toBe(initializeNecromancerFingerprint(CAMPAIGN_A, quietInput()));
      expect(setNecromancerGateStatusFingerprint(CAMPAIGN_A, "deep", "ordinary", "hostile"))
        .not.toBe(setNecromancerGateStatusFingerprint(CAMPAIGN_A, "deep", "hostile", "hostile"));
    });

    it("fingerprints the canonical campaign Gate name used by the transition while preserving expected name bytes", () => {
      const padded = canonicalizeCreateNecromancerCampaignGateInput({
        gateId: CAMPAIGN_GATE,
        name: "  Ossuary  ",
        band: "far",
      });
      const trimmed = canonicalizeCreateNecromancerCampaignGateInput({
        gateId: CAMPAIGN_GATE,
        name: "Ossuary",
        band: "far",
      });
      expect(padded.name).toBe("Ossuary");
      expect(createNecromancerCampaignGateFingerprint(CAMPAIGN_A, padded))
        .toBe(createNecromancerCampaignGateFingerprint(CAMPAIGN_A, trimmed));
      const createdGate = applyCreateNecromancerCampaignGate(applyInitializeNecromancer(baseV5(), quietInput()).nextState, {
        gateId: CAMPAIGN_GATE,
        name: "  Ossuary  ",
        band: "far",
      }).nextState.necromancer.gates.find((gate) => gate.gateId === CAMPAIGN_GATE);
      expect(createdGate?.origin).toBe("campaign");
      if (createdGate?.origin === "campaign") {
        expect(createdGate.name).toBe("Ossuary");
      }

      const fieldsPadded = canonicalizeUpdateNecromancerCampaignGateFields({
        name: { expected: "Ossuary", value: "  Black Ossuary  " },
      });
      const fieldsTrimmed = canonicalizeUpdateNecromancerCampaignGateFields({
        name: { expected: "Ossuary", value: "Black Ossuary" },
      });
      expect(fieldsPadded.name?.expected).toBe("Ossuary");
      expect(fieldsPadded.name?.value).toBe("Black Ossuary");
      expect(updateNecromancerCampaignGateFingerprint(CAMPAIGN_A, CAMPAIGN_GATE, fieldsPadded))
        .toBe(updateNecromancerCampaignGateFingerprint(CAMPAIGN_A, CAMPAIGN_GATE, fieldsTrimmed));
      expect(updateNecromancerCampaignGateFingerprint(CAMPAIGN_A, CAMPAIGN_GATE, {
        name: { expected: "  Ossuary  ", value: "Black Ossuary" },
      })).not.toBe(updateNecromancerCampaignGateFingerprint(CAMPAIGN_A, CAMPAIGN_GATE, fieldsTrimmed));
    });

    it("fingerprints canonical Ghoul-Caller profile text for initialize, add, update, and remove", () => {
      const paddedBinding = {
        denizenId: DEN_6,
        pathSpaceId: "edge_sage" as const,
        primaryElement: "fire" as const,
        aesthetic: "  ash-stained funeral silks  ",
        strangeQuirk: "  counts backwards from thirteen  ",
        ageYears: 47,
      };
      const trimmedBinding = {
        ...paddedBinding,
        aesthetic: "ash-stained funeral silks",
        strangeQuirk: "counts backwards from thirteen",
      };
      const explosivePadded = canonicalizeInitializeNecromancerInput({
        arrangementId: "explosive",
        selectedLawIds: ["fifth", "sixth"],
        arrangementFoes: [
          { denizenId: DEN_1, gateId: "deep" },
          { denizenId: DEN_2, gateId: "terminus" },
          { denizenId: DEN_3, gateId: "marching" },
          { denizenId: DEN_4, gateId: "churning" },
        ],
        arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
        arrangementGhoulCaller: paddedBinding,
      });
      const explosiveTrimmed = canonicalizeInitializeNecromancerInput({
        arrangementId: "explosive",
        selectedLawIds: ["fifth", "sixth"],
        arrangementFoes: [
          { denizenId: DEN_1, gateId: "deep" },
          { denizenId: DEN_2, gateId: "terminus" },
          { denizenId: DEN_3, gateId: "marching" },
          { denizenId: DEN_4, gateId: "churning" },
        ],
        arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
        arrangementGhoulCaller: trimmedBinding,
      });
      expect(initializeNecromancerFingerprint(CAMPAIGN_A, explosivePadded))
        .toBe(initializeNecromancerFingerprint(CAMPAIGN_A, explosiveTrimmed));
      expect(initializeNecromancerFingerprint(CAMPAIGN_A, {
        ...explosiveTrimmed,
        arrangementGhoulCaller: { ...trimmedBinding, ageYears: 48 },
      })).not.toBe(initializeNecromancerFingerprint(CAMPAIGN_A, explosiveTrimmed));

      const paddedGhoul = canonicalizeNecromancerGhoulCaller({
        denizenId: DEN_6,
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "air",
        aesthetic: "  pale linen  ",
        strangeQuirk: "  never blinks  ",
        ageYears: 33,
      });
      const trimmedGhoul = canonicalizeNecromancerGhoulCaller({
        denizenId: DEN_6,
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "air",
        aesthetic: "pale linen",
        strangeQuirk: "never blinks",
        ageYears: 33,
      });
      expect(addNecromancerGhoulCallerFingerprint(CAMPAIGN_A, paddedGhoul))
        .toBe(addNecromancerGhoulCallerFingerprint(CAMPAIGN_A, trimmedGhoul));
      expect(removeNecromancerGhoulCallerFingerprint(CAMPAIGN_A, DEN_6, paddedGhoul))
        .toBe(removeNecromancerGhoulCallerFingerprint(CAMPAIGN_A, DEN_6, trimmedGhoul));
      const fieldsPadded = canonicalizeUpdateNecromancerGhoulCallerFields({
        aesthetic: { expected: "pale linen", value: "  river silt  " },
      });
      const fieldsTrimmed = canonicalizeUpdateNecromancerGhoulCallerFields({
        aesthetic: { expected: "pale linen", value: "river silt" },
      });
      expect(updateNecromancerGhoulCallerFingerprint(CAMPAIGN_A, DEN_6, fieldsPadded))
        .toBe(updateNecromancerGhoulCallerFingerprint(CAMPAIGN_A, DEN_6, fieldsTrimmed));
    });

    it("rejects a malformed Ghoul-Caller Primary Element on campaignEventValidator", () => {
      const malformed = {
        type: "necromancer_ghoul_caller_added",
        version: 1,
        data: {
          ghoulCaller: {
            denizenId: DEN_6,
            location: { kind: "path", pathSpaceId: "edge_sage" },
            pettyDeadCount: 0,
            primaryElement: "void",
            aesthetic: "pale linen",
            strangeQuirk: "never blinks",
            ageYears: 33,
          },
        },
      };
      expect(matchesValidator(campaignEventValidator, malformed)).toBe(false);
    });
  });

  describe("event serialization", () => {
    it("accepts all 28 real Phase-2A Necromancer events on campaignEventValidator", () => {
      expectTypeOf<NecromancerInitializedEventV1>().toMatchTypeOf<CampaignEvent>();
      expectTypeOf<NecromancerEvent>().toMatchTypeOf<CampaignEvent>();
      const events = collectRealNecromancerEvents();
      const types = new Set(events.map((event) => event.type));
      expect(types.size).toBe(28);
      for (const [, eventType] of NECROMANCER_COMMAND_EVENT_PAIRS) {
        expect(types.has(eventType)).toBe(true);
        expect(findValidatorMembers(campaignEventValidator, eventType, 1).length).toBe(1);
      }
      for (const event of events) {
        expect(event.version).toBe(1);
        expect(matchesValidator(campaignEventValidator, event), event.type).toBe(true);
      }
    });

    it("rejects a malformed terminal step event", () => {
      const malformed = {
        type: "necromancer_step_added",
        version: 1,
        data: {
          step: {
            from: { kind: "gate", gateId: "howling" },
            to: { kind: "terminal", terminalId: "void_beyond" },
          },
        },
      };
      expect(matchesValidator(campaignEventValidator, malformed)).toBe(false);
    });
  });

  describe("command/event coherence", () => {
    it("maps each Necromancer command to its exact version-1 event and uses logical_state_append", () => {
      const eventsByType = new Map(collectRealNecromancerEvents().map((event) => [event.type, event]));
      for (const [commandType, eventType] of NECROMANCER_COMMAND_EVENT_PAIRS) {
        const event = eventsByType.get(eventType);
        expect(event).toBeDefined();
        expect(() => validateEventCoherenceForTest(
          coherenceInput(commandType as CanonicalCommitInput["commandType"], [event!]),
          5,
        )).not.toThrow();
      }
    });

    it("rejects a representative wrong command/event pairing", () => {
      const initialized = applyInitializeNecromancer(baseV5(), quietInput()).events[0];
      expect(() => validateEventCoherenceForTest(
        coherenceInput("set_necromancer_depth", [initialized]),
        5,
      )).toThrow(DomainError);
    });
  });

  describe("ordinary logical-command path", () => {
    it("initializes Necromancer through the ordinary executor with identity, snapshot, events, and idempotency", async () => {
      const state = baseV5();
      const input = quietInput();
      const fingerprint = initializeNecromancerFingerprint(CAMPAIGN_A, input);
      const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
        commandType: "initialize_necromancer",
        commandFingerprint: fingerprint,
        apply: (current) => applyInitializeNecromancer(current, input),
      });

      const wrongCampaign = recordingIo({ campaign: campaignOf(CAMPAIGN_B, state) });
      await expect(executeOrdinaryLogicalCommand(
        wrongCampaign.io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        prepare,
      )).rejects.toMatchObject({ code: "STALE_COMMAND_PRECONDITION" });
      expect(wrongCampaign.commits).toHaveLength(0);

      const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
      const receipt = await executeOrdinaryLogicalCommand(
        accepted.io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        prepare,
      );
      expect(receipt).toEqual({ revision: 5 });
      expect(accepted.calls).toEqual(["assertNotDeleting", "loadCanonicalCampaign", "findAcceptedCommand", "commit"]);
      expect(accepted.commits[0]?.nextState.necromancer.foes).toHaveLength(2);
      expect(accepted.commits[0]?.events[0]?.type).toBe("necromancer_initialized");
      expect(accepted.commits[0]?.historyControlUpdate).toEqual({ kind: "logical_state_append" });
      expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 5)).not.toThrow();

      const replay = recordingIo({
        campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
        accepted: { commandType: "initialize_necromancer", commandFingerprint: fingerprint, campaignRevision: 5 },
        snapshot: accepted.commits[0]!.nextState,
      });
      const replayReceipt = await executeOrdinaryLogicalCommand(
        replay.io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        prepare,
      );
      expect(replayReceipt).toEqual({ revision: 5 });
      expect(replay.commits).toHaveLength(0);
      expect(replay.calls).toContain("loadCommittedSnapshot");

      const conflict = recordingIo({
        campaign: campaignOf(CAMPAIGN_A, state),
        accepted: { commandType: "initialize_necromancer", commandFingerprint: fingerprint, campaignRevision: 5 },
      });
      await expect(executeOrdinaryLogicalCommand(
        conflict.io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => ({
          commandType: "initialize_necromancer",
          commandFingerprint: initializeNecromancerFingerprint(CAMPAIGN_A, {
            ...input,
            selectedLawIds: ["third", "fourth"],
          }),
          apply: (current) => applyInitializeNecromancer(current, {
            ...input,
            selectedLawIds: ["third", "fourth"],
          }),
        }),
      )).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
      expect(conflict.commits).toHaveLength(0);
    });

    it("commits move_necromancer_souls through the ordinary executor with expected-current concurrency", async () => {
      const initialized = applyInitializeNecromancer(baseV5(), quietInput()).nextState;
      const from = { kind: "path" as const, pathSpaceId: "edge_sage" as const };
      const to = { kind: "path" as const, pathSpaceId: "edge_hierophant" as const };
      const fingerprint = moveNecromancerSoulsFingerprint(CAMPAIGN_A, from, to, 1, 1, 1);
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, initialized, 8) });
      const receipt = await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => ({
          commandType: "move_necromancer_souls",
          commandFingerprint: fingerprint,
          apply: (current) => applyMoveNecromancerSouls(current, from, to, 1, 1, 1),
        }),
      );
      expect(receipt).toEqual({ revision: 9 });
      expect(commits[0]?.events[0]?.type).toBe("necromancer_souls_moved");
      expect(commits[0]?.nextState.necromancer.souls.find((soul) =>
        soul.location.kind === "path" && soul.location.pathSpaceId === "edge_sage",
      )).toBeUndefined();
      expect(() => validateEventCoherenceForTest(commits[0]!, 9)).not.toThrow();
    });
  });

  describe("mutation arg path", () => {
    const source = readFileSync(join(__dirname, "..", "convex", "m3Commands.ts"), "utf8");

    it("registers all 28 mutations on the ordinary executor with expectedCampaignId and no remove-Gate", () => {
      expect(MUTATION_NAMES).toHaveLength(28);
      for (const name of MUTATION_NAMES) {
        const exportIdx = source.indexOf(`export const ${name} = mutation({`);
        expect(exportIdx, `${name} mutation not found`).toBeGreaterThan(-1);
        const argsStart = source.indexOf("args: {", exportIdx);
        const handlerIdx = source.indexOf("handler: async (ctx, args) => {", exportIdx);
        const argsBlock = source.slice(argsStart, handlerIdx);
        expect(argsBlock).toContain("commandId: v.string()");
        expect(argsBlock).toContain("expectedCampaignId: v.string()");
        const handlerEnd = source.indexOf("\n  },\n});", handlerIdx);
        const handler = source.slice(handlerIdx, handlerEnd);
        expect(handler).toContain("executeConvexOrdinaryLogicalCommand");
      }
      expect(source).not.toContain("export const removeNecromancerGate");
      expect(source).not.toContain("export const removeNecromancerCampaignGate");
    });

    it("keeps step args occupiable-only and canonicalizes campaign Gate names before fingerprint/apply", () => {
      const occupiableIdx = source.indexOf("const necromancerOccupiableArg = v.union(");
      expect(occupiableIdx).toBeGreaterThan(-1);
      const occupiableBlock = source.slice(occupiableIdx, source.indexOf("const necromancerFoeLocationArg", occupiableIdx));
      expect(occupiableBlock).toContain('kind: v.literal("gate")');
      expect(occupiableBlock).toContain('kind: v.literal("path")');
      expect(occupiableBlock).not.toContain("terminal");

      const addStepIdx = source.indexOf("export const addNecromancerStep = mutation({");
      const addStepBlock = source.slice(addStepIdx, source.indexOf("export const removeNecromancerStep", addStepIdx));
      expect(addStepBlock).toContain("necromancerDirectedStepArg");
      expect(addStepBlock).not.toContain("terminal");

      const createIdx = source.indexOf("export const createNecromancerCampaignGate = mutation({");
      const createBlock = source.slice(createIdx, source.indexOf("export const updateNecromancerCampaignGate", createIdx));
      expect(createBlock).toContain("canonicalizeCreateNecromancerCampaignGateInput");
      expect(createBlock).toContain("createNecromancerCampaignGateFingerprint");
      expect(createBlock).toContain("applyCreateNecromancerCampaignGate");

      const updateIdx = source.indexOf("export const updateNecromancerCampaignGate = mutation({");
      const updateBlock = source.slice(updateIdx, source.indexOf("export const createNecromancerCampaignPathSpace", updateIdx));
      expect(updateBlock).toContain("canonicalizeUpdateNecromancerCampaignGateFields");
      expect(updateBlock).toContain("updateNecromancerCampaignGateFingerprint");
    });
  });
});
