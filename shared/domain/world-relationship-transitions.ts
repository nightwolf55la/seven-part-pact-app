import type { CampaignStateV5, CampaignWizardV5 } from "./campaign-state";
import type {
  CompanionRelationship,
  CompanionRelationshipStatus,
  ElementId,
  SharedWorldState,
} from "./shared-world";
import { ELEMENT_IDS } from "./shared-world";
import type { WizardId, IsleId, PlaceId, DenizenId, CompanionRelationshipId } from "./ids";
import { isValidCompanionRelationshipId } from "./ids";
import { DomainError } from "./errors";
import type { ExpectedFieldChange } from "./world-subject-transitions";
import type {
  WizardHomeIsleChangedEventV1,
  WizardSanctumChangedEventV1,
  WizardCompanionChangedEventV1,
  CompanionDescriptionChangedEventV1,
} from "./events";

export type {
  WizardHomeIsleChangedDataV1,
  WizardHomeIsleChangedEventV1,
  WizardSanctumChangedDataV1,
  WizardSanctumChangedEventV1,
  WizardCompanionChangedDataV1,
  WizardCompanionChangedEventV1,
  CompanionDescriptionChangedDataV1,
  CompanionDescriptionChangedEventV1,
} from "./events";

// ---------------------------------------------------------------------------
// Description normalization (same rules as shared-world subjects)
// ---------------------------------------------------------------------------

const MAX_DESCRIPTION_LENGTH = 8000;

function normalizeDescription(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Candidate events (NOT added to active CampaignEvent union)
// ---------------------------------------------------------------------------

export type CandidateRelationshipEvent =
  | WizardHomeIsleChangedEventV1
  | WizardSanctumChangedEventV1
  | WizardCompanionChangedEventV1
  | CompanionDescriptionChangedEventV1;

// ---------------------------------------------------------------------------
// Association result type (narrow)
// ---------------------------------------------------------------------------

export interface WizardAssociationTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (WizardHomeIsleChangedEventV1 | WizardSanctumChangedEventV1)[];
}

// ---------------------------------------------------------------------------
// Companion result type (narrow)
// ---------------------------------------------------------------------------

export interface CompanionTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (WizardCompanionChangedEventV1 | CompanionDescriptionChangedEventV1)[];
}

export interface RelationshipTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly CandidateRelationshipEvent[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findWizard(state: CampaignStateV5, wizardId: WizardId): { wizard: CampaignWizardV5; index: number } {
  const idx = state.wizards.findIndex((w) => w.wizardId === wizardId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${wizardId}`);
  }
  return { wizard: state.wizards[idx], index: idx };
}

function replaceWizard(state: CampaignStateV5, index: number, wizard: CampaignWizardV5): CampaignStateV5 {
  const wizards = [...state.wizards];
  wizards[index] = wizard;
  return { ...state, wizards };
}

function replaceWorld(state: CampaignStateV5, world: SharedWorldState): CampaignStateV5 {
  return { ...state, world };
}

function findCurrentCompanion(
  state: CampaignStateV5,
  wizardId: WizardId,
  element: ElementId,
): CompanionRelationship | null {
  return (
    state.world.companionRelationships.find(
      (r) => r.wizardId === wizardId && r.element === element && r.status === "current",
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Set Wizard Home Isle
// ---------------------------------------------------------------------------

export function applySetWizardHomeIsleV5Candidate(
  state: CampaignStateV5,
  wizardId: WizardId,
  change: ExpectedFieldChange<IsleId | null>,
): WizardAssociationTransitionResult {
  const { wizard, index } = findWizard(state, wizardId);

  if (wizard.homeIsleId !== change.expected) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `homeIsleId: expected "${change.expected}" but current is "${wizard.homeIsleId}"`,
    );
  }

  if (wizard.homeIsleId === change.value) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Home isle change produces no change");
  }

  if (change.value !== null) {
    if (!state.world.isles.some((i) => i.isleId === change.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Isle not found: ${change.value}`);
    }
  }

  const updated: CampaignWizardV5 = { ...wizard, homeIsleId: change.value };
  const nextState = replaceWizard(state, index, updated);

  const event: WizardHomeIsleChangedEventV1 = {
    type: "wizard_home_isle_changed",
    version: 1,
    data: {
      wizardId,
      previousHomeIsleId: wizard.homeIsleId,
      newHomeIsleId: change.value,
    },
  };

  return { nextState, events: [event] };
}

// ---------------------------------------------------------------------------
// Set Wizard Sanctum
// ---------------------------------------------------------------------------

export function applySetWizardSanctumV5Candidate(
  state: CampaignStateV5,
  wizardId: WizardId,
  change: ExpectedFieldChange<PlaceId | null>,
): WizardAssociationTransitionResult {
  const { wizard, index } = findWizard(state, wizardId);

  if (wizard.sanctumPlaceId !== change.expected) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `sanctumPlaceId: expected "${change.expected}" but current is "${wizard.sanctumPlaceId}"`,
    );
  }

  if (wizard.sanctumPlaceId === change.value) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sanctum change produces no change");
  }

  if (change.value !== null) {
    if (!state.world.places.some((p) => p.placeId === change.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Place not found: ${change.value}`);
    }
  }

  const updated: CampaignWizardV5 = { ...wizard, sanctumPlaceId: change.value };
  const nextState = replaceWizard(state, index, updated);

  const event: WizardSanctumChangedEventV1 = {
    type: "wizard_sanctum_changed",
    version: 1,
    data: {
      wizardId,
      previousSanctumPlaceId: wizard.sanctumPlaceId,
      newSanctumPlaceId: change.value,
    },
  };

  return { nextState, events: [event] };
}

// ---------------------------------------------------------------------------
// Set / Replace / End Wizard Companion
// ---------------------------------------------------------------------------

export interface SetWizardCompanionInput {
  readonly wizardId: WizardId;
  readonly element: ElementId;
  readonly expectedCurrentRelationshipId: CompanionRelationshipId | null;
  readonly newRelationship: {
    readonly companionRelationshipId: CompanionRelationshipId;
    readonly denizenId: DenizenId;
    readonly description: string | null;
  } | null;
}

export function applySetWizardCompanionV5Candidate(
  state: CampaignStateV5,
  input: SetWizardCompanionInput,
): CompanionTransitionResult {
  findWizard(state, input.wizardId);

  if (!(ELEMENT_IDS as readonly string[]).includes(input.element)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid element: ${input.element}`);
  }

  const currentRel = findCurrentCompanion(state, input.wizardId, input.element);
  const currentRelId = currentRel?.companionRelationshipId ?? null;

  if (currentRelId !== input.expectedCurrentRelationshipId) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Expected current relationship "${input.expectedCurrentRelationshipId}" but found "${currentRelId}"`,
    );
  }

  if (input.newRelationship === null && currentRel === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "No current relationship to end");
  }

  let relationships = [...state.world.companionRelationships];

  // Snapshot previous for event (as it existed before any mutation)
  const previousForEvent: CompanionRelationship | null = currentRel ? { ...currentRel } : null;

  // End current if it exists
  if (currentRel !== null) {
    const idx = relationships.findIndex(
      (r) => r.companionRelationshipId === currentRel.companionRelationshipId,
    );
    relationships[idx] = { ...currentRel, status: "ended" as const };
  }

  let newRelForEvent: CompanionRelationship | null = null;

  if (input.newRelationship !== null) {
    const nr = input.newRelationship;

    if (!isValidCompanionRelationshipId(nr.companionRelationshipId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid companionRelationshipId: ${nr.companionRelationshipId}`);
    }
    if (relationships.some((r) => r.companionRelationshipId === nr.companionRelationshipId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate companionRelationshipId: ${nr.companionRelationshipId}`);
    }
    if (!state.world.denizens.some((d) => d.denizenId === nr.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen not found: ${nr.denizenId}`);
    }

    const newRel: CompanionRelationship = {
      companionRelationshipId: nr.companionRelationshipId,
      wizardId: input.wizardId,
      element: input.element,
      denizenId: nr.denizenId,
      description: normalizeDescription(nr.description),
      status: "current",
    };

    relationships = [...relationships, newRel];
    newRelForEvent = newRel;
  }

  const world: SharedWorldState = { ...state.world, companionRelationships: relationships };

  const event: WizardCompanionChangedEventV1 = {
    type: "wizard_companion_changed",
    version: 1,
    data: {
      wizardId: input.wizardId,
      element: input.element,
      previousCurrentRelationship: previousForEvent,
      newCurrentRelationship: newRelForEvent,
    },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}

// ---------------------------------------------------------------------------
// Update Companion Description
// ---------------------------------------------------------------------------

export interface UpdateCompanionDescriptionInput {
  readonly companionRelationshipId: CompanionRelationshipId;
  readonly expectedStatus: CompanionRelationshipStatus;
  readonly description: ExpectedFieldChange<string | null>;
}

export function applyUpdateCompanionDescriptionV5Candidate(
  state: CampaignStateV5,
  input: UpdateCompanionDescriptionInput,
): CompanionTransitionResult {
  const idx = state.world.companionRelationships.findIndex(
    (r) => r.companionRelationshipId === input.companionRelationshipId,
  );
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Companion relationship not found: ${input.companionRelationshipId}`);
  }

  const current = state.world.companionRelationships[idx];

  if (current.status !== input.expectedStatus) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Relationship status: expected "${input.expectedStatus}" but current is "${current.status}"`,
    );
  }

  if (current.description !== input.description.expected) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `description: expected "${input.description.expected}" but current is "${current.description}"`,
    );
  }

  const normalizedDesc = normalizeDescription(input.description.value);

  if (normalizedDesc === current.description) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Description update produces no change");
  }

  const updated: CompanionRelationship = { ...current, description: normalizedDesc };

  const relationships = [...state.world.companionRelationships];
  relationships[idx] = updated;
  const world: SharedWorldState = { ...state.world, companionRelationships: relationships };

  const event: CompanionDescriptionChangedEventV1 = {
    type: "companion_description_changed",
    version: 1,
    data: {
      companionRelationshipId: input.companionRelationshipId,
      previous: current,
      updated,
    },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}
