import { v } from "convex/values";
import {
  MONTH_DISPLAY_NAMES,
  CAMPAIGN_COMMAND_TYPES,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_HISTORY_CONTROL_VERSION,
  CURRENT_CHECKPOINT_VERSION,
  PACT_SEAT_IDS,
  MOVABLE_PLANET_IDS,
  LUNAR_PHASES,
} from "../shared/domain";

export const monthDirectionValidator = v.union(
  v.literal("forward"),
  v.literal("backward"),
);

export const monthDisplayNameValidator = v.union(
  ...MONTH_DISPLAY_NAMES.map((name) => v.literal(name)),
);

export const campaignCommandTypeValidator = v.union(
  ...CAMPAIGN_COMMAND_TYPES.map((t) => v.literal(t)),
);

// Historical command types that may exist in persisted revision records but are
// no longer created by active runtime code (M4 retirement).
export const persistedCommandTypeValidator = v.union(
  ...CAMPAIGN_COMMAND_TYPES.map((t) => v.literal(t)),
  v.literal("move_month"),
  v.literal("legacy_month_change"),
);

export const undoAppliedEventV1Validator = v.object({
  type: v.literal("undo_applied"),
  version: v.literal(1),
  data: v.object({
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
});

export const redoAppliedEventV1Validator = v.object({
  type: v.literal("redo_applied"),
  version: v.literal(1),
  data: v.object({
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
});

export const checkpointRestoredEventV1Validator = v.object({
  type: v.literal("checkpoint_restored"),
  version: v.literal(1),
  data: v.object({
    checkpointId: v.string(),
    sourceRevision: v.number(),
    labelAtRestore: v.string(),
  }),
});

export const backupImportedEventV1Validator = v.object({
  type: v.literal("backup_imported"),
  version: v.literal(1),
  data: v.object({
    backupFormatVersion: v.literal(1),
    sourceCampaignId: v.string(),
    sourceCampaignRevision: v.number(),
    sourceLogicalRevision: v.number(),
    exportedAtMs: v.number(),
    payloadDigest: v.string(),
  }),
});

export const playerAddedEventV1Validator = v.object({
  type: v.literal("player_added"),
  version: v.literal(1),
  data: v.object({ playerId: v.string(), name: v.string() }),
});

export const playerRenamedEventV1Validator = v.object({
  type: v.literal("player_renamed"),
  version: v.literal(1),
  data: v.object({ playerId: v.string(), previousName: v.string(), newName: v.string() }),
});

export const playerRemovedEventV1Validator = v.object({
  type: v.literal("player_removed"),
  version: v.literal(1),
  data: v.object({ playerId: v.string(), name: v.string() }),
});

export const campaignAgeChangedEventV1Validator = v.object({
  type: v.literal("campaign_age_changed"),
  version: v.literal(1),
  data: v.object({
    previousAgeId: v.union(v.string(), v.null()),
    newAgeId: v.union(v.string(), v.null()),
  }),
});

export const facilitatorAssignmentChangedEventV1Validator = v.object({
  type: v.literal("facilitator_assignment_changed"),
  version: v.literal(1),
  data: v.object({
    previousPlayerId: v.union(v.string(), v.null()),
    newPlayerId: v.union(v.string(), v.null()),
  }),
});

export const wizardCreatedEventV1Validator = v.object({
  type: v.literal("wizard_created"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    name: v.string(),
    portrayedByPlayerId: v.union(v.string(), v.null()),
    assignedToSeatId: v.string(),
  }),
});

export const wizardNameChangedEventV1Validator = v.object({
  type: v.literal("wizard_name_changed"),
  version: v.literal(1),
  data: v.object({ wizardId: v.string(), previousName: v.string(), newName: v.string() }),
});

export const wizardPortrayalChangedEventV1Validator = v.object({
  type: v.literal("wizard_portrayal_changed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousPlayerId: v.union(v.string(), v.null()),
    newPlayerId: v.union(v.string(), v.null()),
  }),
});

export const pactSeatWizardChangedEventV1Validator = v.object({
  type: v.literal("pact_seat_wizard_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previousWizardId: v.union(v.string(), v.null()),
    newWizardId: v.union(v.string(), v.null()),
  }),
});

export const pactSeatStatusChangedEventV1Validator = v.object({
  type: v.literal("pact_seat_status_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previousStatus: v.union(v.string(), v.null()),
    newStatus: v.union(v.string(), v.null()),
  }),
});

export const watcherAssignmentChangedEventV1Validator = v.object({
  type: v.literal("watcher_assignment_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previousPlayerId: v.union(v.string(), v.null()),
    newPlayerId: v.union(v.string(), v.null()),
  }),
});

export const setupMonthChangedEventV1Validator = v.object({
  type: v.literal("setup_month_changed"),
  version: v.literal(1),
  data: v.object({
    previousMonthOrdinal: v.union(v.number(), v.null()),
    newMonthOrdinal: v.union(v.number(), v.null()),
  }),
});

export const setupOrreryPositionChangedEventV1Validator = v.object({
  type: v.literal("setup_orrery_position_changed"),
  version: v.literal(1),
  data: v.object({
    planetId: v.string(),
    previousPosition: v.union(v.number(), v.null()),
    newPosition: v.union(v.number(), v.null()),
  }),
});

export const beginPlayEventV1Validator = v.object({
  type: v.literal("begin_play"),
  version: v.literal(1),
  data: v.object({
    fromMonthOrdinal: v.number(),
    toMonthOrdinal: v.number(),
    eligibleWizardIds: v.array(v.string()),
  }),
});

export const phaseAdvancedEventV1Validator = v.object({
  type: v.literal("phase_advanced"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    fromPhase: v.string(),
    toPhase: v.string(),
  }),
});

export const phaseAdvancedEventV2Validator = v.object({
  type: v.literal("phase_advanced"),
  version: v.literal(2),
  data: v.object({
    monthOrdinal: v.number(),
    fromPhase: v.string(),
    toPhase: v.string(),
    acknowledgedWarningKeys: v.array(v.string()),
  }),
});

export const wizardmootAttendanceAdjustedEventV1Validator = v.object({
  type: v.literal("wizardmoot_attendance_adjusted"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    wizardId: v.string(),
    previousAttended: v.boolean(),
    previousExceptionReason: v.union(v.string(), v.null()),
    newAttended: v.boolean(),
    newExceptionReason: v.union(v.string(), v.null()),
  }),
});

export const meetingCompletedEventV1Validator = v.object({
  type: v.literal("meeting_completed"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    meetingAllocationsSpent: v.array(v.string()),
  }),
});

export const monthBegunEventV1Validator = v.object({
  type: v.literal("month_begun"),
  version: v.literal(1),
  data: v.object({
    fromMonthOrdinal: v.number(),
    toMonthOrdinal: v.number(),
    acknowledgedWarningKeys: v.array(v.string()),
    eligibleWizardIds: v.array(v.string()),
  }),
});

// --- V3 Campaign State Validators ---

const pactSeatStateValidator = v.object({
  status: v.union(v.literal("present"), v.literal("silent"), v.literal("absent"), v.null()),
  wizardId: v.union(v.string(), v.null()),
  watcherPlayerId: v.union(v.string(), v.null()),
});

const playerValidator = v.object({
  playerId: v.string(),
  name: v.string(),
});

const wizardElementScoresValidator = v.object({
  air: v.number(),
  fire: v.number(),
  earth: v.number(),
  water: v.number(),
});

const wizardCompanionDescriptionsValidator = v.object({
  air: v.union(v.string(), v.null()),
  fire: v.union(v.string(), v.null()),
  earth: v.union(v.string(), v.null()),
  water: v.union(v.string(), v.null()),
});

const wizardCharacterDataValidator = v.object({
  elements: v.union(wizardElementScoresValidator, v.null()),
  pactFragmentPersonalForm: v.union(v.string(), v.null()),
  familiarDescription: v.union(v.string(), v.null()),
  ageYears: v.union(v.number(), v.null()),
  publicChangesOfMagic: v.array(v.string()),
  importantNotes: v.union(v.string(), v.null()),
  companionDescriptions: wizardCompanionDescriptionsValidator,
});

const wizardValidator = v.object({
  wizardId: v.string(),
  name: v.string(),
  portrayedByPlayerId: v.union(v.string(), v.null()),
  character: wizardCharacterDataValidator,
});

const pactSeatsValidator = v.object(
  Object.fromEntries(PACT_SEAT_IDS.map((id) => [id, pactSeatStateValidator])) as Record<string, typeof pactSeatStateValidator>,
);

const participantRefValidator = v.object({
  kind: v.literal("wizard"),
  wizardId: v.string(),
});

const devilParticipantRefValidator = v.object({
  kind: v.literal("devil"),
});

const participantRefV5Validator = v.union(participantRefValidator, devilParticipantRefValidator);

const timeDestinationValidator = v.union(
  v.object({ kind: v.literal("companion"), element: v.string() }),
  v.object({ kind: v.literal("map_isle_sanctum") }),
  v.object({ kind: v.literal("familiar") }),
  v.object({ kind: v.literal("orrery") }),
  v.object({ kind: v.literal("meeting") }),
  v.object({ kind: v.literal("domain") }),
  v.object({ kind: v.literal("engagement"), engagementId: v.string() }),
  v.object({ kind: v.literal("special_use"), description: v.string() }),
);

const devilTimeDestinationValidator = v.union(
  v.object({ kind: v.literal("devil_community"), communityId: v.string() }),
  v.object({ kind: v.literal("devil_schemes"), cardIds: v.array(v.string()) }),
  v.object({ kind: v.literal("devil_companion"), companionRelationshipId: v.string() }),
  v.object({ kind: v.literal("devil_grimoire") }),
  v.object({ kind: v.literal("devil_wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("devil_denizen"), denizenId: v.string() }),
  v.object({ kind: v.literal("devil_seized_domain"), seatId: v.string() }),
);

export const timeDestinationV5Validator = v.union(timeDestinationValidator, devilTimeDestinationValidator);

const timeAllocationValidator = v.object({
  allocationId: v.string(),
  destination: v.union(timeDestinationValidator, v.null()),
  note: v.union(v.string(), v.null()),
  resolution: v.union(v.literal("pending"), v.literal("spent"), v.literal("wasted")),
});

const timeAllocationV5Validator = v.object({
  allocationId: v.string(),
  destination: v.union(timeDestinationV5Validator, v.null()),
  note: v.union(v.string(), v.null()),
  resolution: v.union(v.literal("pending"), v.literal("spent"), v.literal("wasted")),
});

const timeParticipantValidator = v.object({
  participant: participantRefValidator,
  effectiveBudget: v.number(),
  rescheduleAllowance: v.number(),
  reschedulesUsed: v.number(),
  allocations: v.array(timeAllocationValidator),
});

const timeParticipantV5Validator = v.object({
  participant: participantRefV5Validator,
  effectiveBudget: v.number(),
  rescheduleAllowance: v.number(),
  reschedulesUsed: v.number(),
  allocations: v.array(timeAllocationV5Validator),
});

const engagementTargetValidator = v.union(
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("self") }),
  v.object({ kind: v.literal("familiar") }),
  v.object({ kind: v.literal("named_character"), name: v.string() }),
);

const engagementRecordValidator = v.object({
  engagementId: v.string(),
  actingWizardId: v.string(),
  target: v.union(engagementTargetValidator, v.null()),
  resolution: v.union(v.literal("pending"), v.literal("resolved")),
  linkedTimeAllocationId: v.union(v.string(), v.null()),
});

const wizardmootAttendanceValidator = v.object({
  wizardId: v.string(),
  attended: v.boolean(),
  exceptionReason: v.union(v.string(), v.null()),
});

const monthlyPlayStateValidator = v.object({
  timeParticipants: v.array(timeParticipantValidator),
  engagements: v.array(engagementRecordValidator),
  wizardmootAttendance: v.union(v.array(wizardmootAttendanceValidator), v.null()),
});

const centidegreeOrNull = v.union(v.number(), v.null());

const setupOrreryValidator = v.object({
  saturn: centidegreeOrNull,
  jupiter: centidegreeOrNull,
  mars: centidegreeOrNull,
  venus: centidegreeOrNull,
  mercury: centidegreeOrNull,
});

const completeOrreryValidator = v.object({
  saturn: v.number(),
  jupiter: v.number(),
  mars: v.number(),
  venus: v.number(),
  mercury: v.number(),
});

const lunarPhaseValidator = v.union(
  ...LUNAR_PHASES.map((p) => v.literal(p)),
);

const setupLifecycleValidator = v.object({
  kind: v.literal("setup"),
  orrery: setupOrreryValidator,
});

const playLifecycleValidator = v.object({
  kind: v.literal("play"),
  phase: lunarPhaseValidator,
  orrery: completeOrreryValidator,
  currentMonth: monthlyPlayStateValidator,
});

const lifecycleValidator = v.union(setupLifecycleValidator, playLifecycleValidator);

const wizardmootHistoryEntryValidator = v.object({
  monthOrdinal: v.number(),
  attendance: v.array(v.object({
    wizardId: v.string(),
    attended: v.boolean(),
  })),
});

export const campaignStateV3Validator = v.object({
  schemaVersion: v.literal(3),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.union(v.number(), v.null()),
  }),
  configuration: v.object({
    ageId: v.union(v.string(), v.null()),
    facilitatorPlayerId: v.union(v.string(), v.null()),
  }),
  players: v.array(playerValidator),
  wizards: v.array(v.object({
    wizardId: v.string(),
    name: v.string(),
    portrayedByPlayerId: v.union(v.string(), v.null()),
  })),
  pactSeats: pactSeatsValidator,
  lifecycle: lifecycleValidator,
  wizardmootHistory: v.array(wizardmootHistoryEntryValidator),
});

export const campaignStateV4Validator = v.object({
  schemaVersion: v.literal(4),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.union(v.number(), v.null()),
  }),
  configuration: v.object({
    ageId: v.union(v.string(), v.null()),
    facilitatorPlayerId: v.union(v.string(), v.null()),
  }),
  players: v.array(playerValidator),
  wizards: v.array(wizardValidator),
  pactSeats: pactSeatsValidator,
  lifecycle: lifecycleValidator,
  wizardmootHistory: v.array(wizardmootHistoryEntryValidator),
});

export const timeAllocationScheduledEventV1Validator = v.object({
  type: v.literal("time_allocation_scheduled"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    previousDestination: v.union(timeDestinationV5Validator, v.null()),
    newDestination: v.union(timeDestinationV5Validator, v.null()),
    note: v.union(v.string(), v.null()),
  }),
});

export const engagementTargetChangedEventV1Validator = v.object({
  type: v.literal("engagement_target_changed"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    actingWizardId: v.string(),
    previousTarget: v.union(engagementTargetValidator, v.null()),
    newTarget: v.union(engagementTargetValidator, v.null()),
  }),
});

export const timeRescheduledEventV1Validator = v.object({
  type: v.literal("time_rescheduled"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    previousDestination: v.union(timeDestinationV5Validator, v.null()),
    newDestination: v.union(timeDestinationV5Validator, v.null()),
    note: v.union(v.string(), v.null()),
  }),
});

export const timeSpentEventV1Validator = v.object({
  type: v.literal("time_spent"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    destination: timeDestinationV5Validator,
  }),
});

export const timeWastedEventV1Validator = v.object({
  type: v.literal("time_wasted"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    destination: v.union(timeDestinationV5Validator, v.null()),
    note: v.union(v.string(), v.null()),
  }),
});

export const orreryTimeSpentEventV1Validator = v.object({
  type: v.literal("orrery_time_spent"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    planetId: v.string(),
    direction: v.string(),
    previousPosition: v.number(),
    newPosition: v.number(),
  }),
});

export const engagementTimeCommittedEventV1Validator = v.object({
  type: v.literal("engagement_time_committed"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    engagementId: v.string(),
    previousDestination: v.union(timeDestinationV5Validator, v.null()),
  }),
});

export const engagementResolvedEventV1Validator = v.object({
  type: v.literal("engagement_resolved"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    linkedAllocationId: v.union(v.string(), v.null()),
  }),
});

export const engagementRescheduledEventV1Validator = v.object({
  type: v.literal("engagement_rescheduled"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    previousTarget: v.union(engagementTargetValidator, v.null()),
    newTarget: engagementTargetValidator,
  }),
});

export const wizardCharacterUpdatedEventV1Validator = v.object({
  type: v.literal("wizard_character_updated"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousCharacter: wizardCharacterDataValidator,
    newCharacter: wizardCharacterDataValidator,
  }),
});

// Historical event validators for persisted data (M4 retirement). These event
// shapes may exist in campaignEvents rows but are no longer created at runtime.
const historicalMonthChangedEventV1Validator = v.object({
  type: v.literal("month_changed"),
  version: v.literal(1),
  data: v.object({
    direction: monthDirectionValidator,
    fromOrdinal: v.number(),
    toOrdinal: v.number(),
  }),
});

const wizardCharacterDataV5Validator = v.object({
  elements: v.union(wizardElementScoresValidator, v.null()),
  pactFragmentPersonalForm: v.union(v.string(), v.null()),
  familiarDescription: v.union(v.string(), v.null()),
  ageYears: v.union(v.number(), v.null()),
  publicChangesOfMagic: v.array(v.string()),
  importantNotes: v.union(v.string(), v.null()),
});

const wizardV5Validator = v.object({
  wizardId: v.string(),
  name: v.string(),
  portrayedByPlayerId: v.union(v.string(), v.null()),
  character: wizardCharacterDataV5Validator,
  homeIsleId: v.union(v.string(), v.null()),
  sanctumPlaceId: v.union(v.string(), v.null()),
  mortalityState: v.union(v.literal("not_deceased"), v.literal("deceased")),
});

const engagementTargetV5Validator = v.union(
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("self") }),
  v.object({ kind: v.literal("familiar") }),
  v.object({ kind: v.literal("named_character"), name: v.string() }),
  v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
);

const engagementRecordV5Validator = v.object({
  engagementId: v.string(),
  actingWizardId: v.string(),
  target: v.union(engagementTargetV5Validator, v.null()),
  resolution: v.union(v.literal("pending"), v.literal("resolved")),
  linkedTimeAllocationId: v.union(v.string(), v.null()),
});

const monthlyPlayStateV5Validator = v.object({
  timeParticipants: v.array(timeParticipantV5Validator),
  engagements: v.array(engagementRecordV5Validator),
  wizardmootAttendance: v.union(v.array(wizardmootAttendanceValidator), v.null()),
});

const playLifecycleV5Validator = v.object({
  kind: v.literal("play"),
  phase: lunarPhaseValidator,
  orrery: completeOrreryValidator,
  currentMonth: monthlyPlayStateV5Validator,
});

const lifecycleV5Validator = v.union(setupLifecycleValidator, playLifecycleV5Validator);

const wizardOrDenizenSubjectRefValidator = v.union(
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
);

const powerfulDenizenTaxonomyRefValidator = v.union(
  v.object({ kind: v.literal("builtin"), taxonomyId: v.string() }),
  v.object({ kind: v.literal("campaign"), taxonomyId: v.string() }),
);

const powerfulDenizenStatusValidator = v.union(
  v.object({
    kind: v.literal("standard"),
    value: v.union(
      v.literal("companion"),
      v.literal("reliable"),
      v.literal("disruptive"),
      v.literal("malignant"),
    ),
  }),
  v.object({ kind: v.literal("other"), label: v.string() }),
);

const powerfulDenizenMethodDefinitionValidator = v.union(
  v.object({
    kind: v.literal("standard"),
    method: v.union(
      v.literal("rampaging"),
      v.literal("manipulating"),
      v.literal("conjuring"),
      v.literal("occupying"),
    ),
  }),
  v.object({
    kind: v.literal("named"),
    name: v.string(),
    description: v.union(v.string(), v.null()),
  }),
);

const powerfulDenizenMethodEntryValidator = v.object({
  methodEntryId: v.string(),
  definition: powerfulDenizenMethodDefinitionValidator,
  origin: v.union(v.literal("source"), v.literal("campaign")),
});

const powerfulDenizenTruthEntryValidator = v.object({
  truthId: v.string(),
  text: v.string(),
  origin: v.union(v.literal("source"), v.literal("campaign")),
});

const powerfulDenizenProfileValidator = v.object({
  taxonomies: v.array(powerfulDenizenTaxonomyRefValidator),
  status: powerfulDenizenStatusValidator,
  goal: v.union(v.string(), v.null()),
  methods: v.array(powerfulDenizenMethodEntryValidator),
  truths: v.array(powerfulDenizenTruthEntryValidator),
});

const denizenValidator = v.object({
  denizenId: v.string(),
  name: v.string(),
  representation: v.union(v.literal("individual"), v.literal("collective")),
  description: v.union(v.string(), v.null()),
  mortalityState: v.union(v.literal("not_deceased"), v.literal("deceased"), v.null()),
  powerfulProfile: v.union(powerfulDenizenProfileValidator, v.null()),
});

const denizenCreatedEventV1Validator = v.object({
  type: v.literal("denizen_created"),
  version: v.literal(1),
  data: v.object({
    denizen: denizenValidator,
  }),
});

const denizenUpdatedEventV1Validator = v.object({
  type: v.literal("denizen_updated"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previous: denizenValidator,
    updated: denizenValidator,
  }),
});

const isleValidator = v.object({
  isleId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
});

const isleCreatedEventV1Validator = v.object({
  type: v.literal("isle_created"),
  version: v.literal(1),
  data: v.object({
    isle: isleValidator,
  }),
});

const isleUpdatedEventV1Validator = v.object({
  type: v.literal("isle_updated"),
  version: v.literal(1),
  data: v.object({
    isleId: v.string(),
    previous: isleValidator,
    updated: isleValidator,
  }),
});

const placePlacementValidator = v.union(
  v.object({ kind: v.literal("unspecified") }),
  v.object({ kind: v.literal("on_isle"), isleId: v.string() }),
  v.object({ kind: v.literal("mobile"), associatedIsleId: v.union(v.string(), v.null()) }),
);

const placeValidator = v.object({
  placeId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
  placement: placePlacementValidator,
});

const placeCreatedEventV1Validator = v.object({
  type: v.literal("place_created"),
  version: v.literal(1),
  data: v.object({
    place: placeValidator,
  }),
});

const placeUpdatedEventV1Validator = v.object({
  type: v.literal("place_updated"),
  version: v.literal(1),
  data: v.object({
    placeId: v.string(),
    previous: placeValidator,
    updated: placeValidator,
  }),
});

const wizardHomeIsleChangedEventV1Validator = v.object({
  type: v.literal("wizard_home_isle_changed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousHomeIsleId: v.union(v.string(), v.null()),
    newHomeIsleId: v.union(v.string(), v.null()),
  }),
});

const wizardSanctumChangedEventV1Validator = v.object({
  type: v.literal("wizard_sanctum_changed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousSanctumPlaceId: v.union(v.string(), v.null()),
    newSanctumPlaceId: v.union(v.string(), v.null()),
  }),
});

const elementIdValidator = v.union(
  v.literal("air"),
  v.literal("fire"),
  v.literal("earth"),
  v.literal("water"),
);

const companionRelationshipValidator = v.object({
  companionRelationshipId: v.string(),
  wizardId: v.string(),
  element: elementIdValidator,
  denizenId: v.string(),
  description: v.union(v.string(), v.null()),
  status: v.union(v.literal("current"), v.literal("ended")),
});

const wizardCompanionChangedEventV1Validator = v.object({
  type: v.literal("wizard_companion_changed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    element: v.union(
      v.literal("air"),
      v.literal("fire"),
      v.literal("earth"),
      v.literal("water"),
    ),
    previousCurrentRelationship: v.union(
      companionRelationshipValidator,
      v.null(),
    ),
    newCurrentRelationship: v.union(
      companionRelationshipValidator,
      v.null(),
    ),
  }),
});

const companionDescriptionChangedEventV1Validator = v.object({
  type: v.literal("companion_description_changed"),
  version: v.literal(1),
  data: v.object({
    companionRelationshipId: v.string(),
    previous: companionRelationshipValidator,
    updated: companionRelationshipValidator,
  }),
});

const campaignPowerfulDenizenTaxonomyValidator = v.object({
  taxonomyId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
});

const treasureCustodyValidator = v.union(
  v.object({ kind: v.literal("subject"), subject: wizardOrDenizenSubjectRefValidator }),
  v.object({ kind: v.literal("place"), placeId: v.string() }),
  v.object({ kind: v.literal("unlocated") }),
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("devil") }),
);

const treasureValidator = v.object({
  treasureId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
  condition: v.union(v.literal("intact"), v.literal("destroyed")),
  custody: treasureCustodyValidator,
});

const sharedWorldStateValidator = v.object({
  denizens: v.array(denizenValidator),
  isles: v.array(isleValidator),
  places: v.array(placeValidator),
  companionRelationships: v.array(companionRelationshipValidator),
  campaignPowerfulDenizenTaxonomies: v.array(campaignPowerfulDenizenTaxonomyValidator),
  treasures: v.array(treasureValidator),
});

const ordinaryTempleDoctrineValidator = v.union(
  v.object({ kind: v.literal("unset") }),
  v.object({ kind: v.literal("doctrine"), doctrineId: v.string() }),
  v.object({ kind: v.literal("blasphemy"), blasphemyId: v.string() }),
);

const ordinaryTempleValidator = v.object({
  templeId: v.string(),
  kind: v.literal("ordinary"),
  placeId: v.string(),
  hostSeatId: v.string(),
  status: v.union(v.literal("active"), v.literal("collapsed")),
  abundance: v.number(),
  conviction: v.number(),
  doctrine: ordinaryTempleDoctrineValidator,
});

const hestarTempleValidator = v.object({
  templeId: v.literal("hestar"),
  kind: v.literal("hestar"),
  placeId: v.string(),
  hostSeatId: v.string(),
  status: v.union(v.literal("active"), v.literal("collapsed")),
  abundance: v.number(),
  conviction: v.number(),
});

const hierophantInitializedEventV1Validator = v.object({
  type: v.literal("hierophant_initialized"),
  version: v.literal(1),
  data: v.object({
    selectedFlameLawIds: v.array(v.string()),
    temples: v.array(v.union(ordinaryTempleValidator, hestarTempleValidator)),
  }),
});

const templeResourcesAdjustedEventV1Validator = v.object({
  type: v.literal("temple_resources_adjusted"),
  version: v.literal(1),
  data: v.object({
    templeId: v.string(),
    previousAbundance: v.number(),
    newAbundance: v.number(),
    previousConviction: v.number(),
    newConviction: v.number(),
  }),
});

const hierophantTempleAreaValidator = v.union(
  v.literal("courtyard"),
  v.literal("agiary"),
  v.null(),
);

const supplicantHostValidator = v.union(
  v.object({
    kind: v.literal("temple"),
    templeId: v.string(),
    area: hierophantTempleAreaValidator,
  }),
  v.object({
    kind: v.literal("cult"),
    cultDenizenId: v.string(),
  }),
);

const prophetHostValidator = v.union(
  v.object({
    kind: v.literal("temple"),
    templeId: v.string(),
  }),
  v.object({
    kind: v.literal("cult"),
    cultDenizenId: v.string(),
  }),
);

const hierophantSupplicantValidator = v.object({
  denizenId: v.string(),
  classId: v.string(),
  woe: v.number(),
  host: supplicantHostValidator,
});

const hierophantProphetValidator = v.object({
  denizenId: v.string(),
  host: prophetHostValidator,
});

const hierophantCultDogmaValidator = v.union(
  v.object({
    dogmaEntryId: v.string(),
    kind: v.literal("builtin"),
    dogmaId: v.string(),
  }),
  v.object({
    dogmaEntryId: v.string(),
    kind: v.literal("custom"),
    category: v.union(
      v.literal("apocalyptic"),
      v.literal("ascetic"),
      v.literal("delirious"),
      v.literal("perverse"),
      v.literal("vain"),
      v.literal("custom"),
    ),
    text: v.string(),
  }),
);

const hierophantCultValidator = v.object({
  cultDenizenId: v.string(),
  hostSeatId: v.string(),
  anchorPlaceId: v.union(v.string(), v.null()),
  leaderDenizenId: v.union(v.string(), v.null()),
  blasphemyId: v.string(),
  abundance: v.number(),
  conviction: v.number(),
  dogmas: v.array(hierophantCultDogmaValidator),
});

const campaignBlasphemyValidator = v.object({
  blasphemyId: v.string(),
  text: v.string(),
});

const hierophantStateValidator = v.object({
  selectedFlameLawIds: v.array(v.string()),
  campaignClasses: v.array(v.object({
    classId: v.string(),
    name: v.string(),
  })),
  campaignDoctrines: v.array(v.object({
    doctrineId: v.string(),
    orthodoxText: v.union(v.string(), v.null()),
    blasphemy: v.union(campaignBlasphemyValidator, v.null()),
    supportedClassIds: v.array(v.string()),
  })),
  temples: v.array(v.union(ordinaryTempleValidator, hestarTempleValidator)),
  supplicants: v.array(hierophantSupplicantValidator),
  prophets: v.array(hierophantProphetValidator),
  cults: v.array(hierophantCultValidator),
  holidayTempleIds: v.array(v.string()),
});

const marinerRouteEndpointValidator = v.union(
  v.object({
    kind: v.literal("board_isle"),
    boardIsleId: v.string(),
  }),
  v.object({
    kind: v.literal("external_land"),
    externalLandId: v.string(),
  }),
);

const marinerRouteOccupancyValidator = v.union(
  v.object({ kind: v.literal("empty") }),
  v.object({ kind: v.literal("ship") }),
  v.object({
    kind: v.literal("raider"),
    toward: marinerRouteEndpointValidator,
  }),
);

const marinerIsleMarketValidator = v.union(
  v.object({ present: v.literal(false) }),
  v.object({
    present: v.literal(true),
    rarity: v.union(v.string(), v.null()),
  }),
);

const marinerBeastLocationValidator = v.union(
  v.object({
    kind: v.literal("sea_region"),
    regionId: v.string(),
  }),
  v.object({
    kind: v.literal("board_isle"),
    boardIsleId: v.string(),
  }),
  v.object({ kind: v.literal("off_map") }),
  v.object({
    kind: v.literal("other_domain"),
    seatId: v.union(...PACT_SEAT_IDS.map((id) => v.literal(id))),
  }),
);

const marinerBeastStateValidator = v.object({
  denizenId: v.string(),
  element: v.string(),
  definitionId: v.union(v.string(), v.null()),
  condition: v.string(),
  location: marinerBeastLocationValidator,
});

const marinerStateValidator = v.object({
  shipPlaceId: v.union(v.string(), v.null()),
  selectedLawOfSeaIds: v.array(v.string()),
  boardIsles: v.array(v.object({
    boardIsleId: v.string(),
    worldIsleId: v.string(),
    market: marinerIsleMarketValidator,
    ravageStormCount: v.number(),
  })),
  routes: v.array(v.object({
    routeId: v.string(),
    occupancy: marinerRouteOccupancyValidator,
  })),
  seaRegions: v.array(v.object({
    regionId: v.string(),
    stormCount: v.number(),
  })),
  beasts: v.array(marinerBeastStateValidator),
});

const necromancerOccupiableSpaceRefValidator = v.union(
  v.object({
    kind: v.literal("gate"),
    gateId: v.string(),
  }),
  v.object({
    kind: v.literal("path"),
    pathSpaceId: v.string(),
  }),
);

const necromancerGateStateValidator = v.union(
  v.object({
    origin: v.literal("builtin"),
    gateId: v.string(),
    status: v.string(),
  }),
  v.object({
    origin: v.literal("campaign"),
    gateId: v.string(),
    name: v.string(),
    band: v.string(),
    status: v.string(),
  }),
);

const necromancerPathSpaceStateValidator = v.union(
  v.object({
    origin: v.literal("builtin"),
    pathSpaceId: v.string(),
  }),
  v.object({
    origin: v.literal("campaign"),
    pathSpaceId: v.string(),
    region: v.string(),
  }),
);

const necromancerFoeLocationValidator = v.union(
  necromancerOccupiableSpaceRefValidator,
  v.object({
    kind: v.literal("escaped"),
    seatId: v.union(...PACT_SEAT_IDS.map((id) => v.literal(id))),
    abominationKind: v.string(),
  }),
);

const necromancerFoeValidator = v.union(
  v.object({
    subject: v.object({
      kind: v.literal("denizen"),
      denizenId: v.string(),
    }),
    location: necromancerFoeLocationValidator,
  }),
  v.object({
    subject: v.object({
      kind: v.literal("wizard"),
      wizardId: v.string(),
    }),
    location: necromancerFoeLocationValidator,
    truths: v.array(powerfulDenizenTruthEntryValidator),
  }),
);

const necromancerWizardTraversalValidator = v.object({
  wizardId: v.string(),
  kind: v.string(),
  location: necromancerOccupiableSpaceRefValidator,
});

const necromancerStateValidator = v.object({
  gates: v.array(necromancerGateStateValidator),
  pathSpaces: v.array(necromancerPathSpaceStateValidator),
  steps: v.array(v.object({
    from: necromancerOccupiableSpaceRefValidator,
    to: necromancerOccupiableSpaceRefValidator,
  })),
  souls: v.array(v.object({
    location: necromancerOccupiableSpaceRefValidator,
    count: v.number(),
  })),
  foes: v.array(necromancerFoeValidator),
  allies: v.array(v.object({
    denizenId: v.string(),
    location: necromancerOccupiableSpaceRefValidator,
  })),
  ghoulCallers: v.array(v.object({
    denizenId: v.string(),
    location: v.object({
      kind: v.literal("path"),
      pathSpaceId: v.string(),
    }),
    pettyDeadCount: v.number(),
    primaryElement: elementIdValidator,
    aesthetic: v.string(),
    strangeQuirk: v.string(),
    ageYears: v.number(),
  })),
  selectedLaws: v.array(v.object({
    lawId: v.string(),
    visibility: v.string(),
  })),
  depth: v.union(
    v.null(),
    v.object({
      wizardId: v.string(),
      value: v.number(),
    }),
  ),
  wizardTraversals: v.array(necromancerWizardTraversalValidator),
});

const faustianCardFacingValidator = v.union(v.literal("face_down"), v.literal("face_up"));
const faustianSchemeValidator = v.object({
  cardId: v.string(),
  facing: faustianCardFacingValidator,
});
const faustianCommunityValidator = v.object({
  communityId: v.string(),
  pawnCount: v.number(),
  schemes: v.array(faustianSchemeValidator),
  accompliceCardIds: v.array(v.string()),
});
const faustianPossessionRepresentationValidator = v.union(
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
  v.object({ kind: v.literal("treasure"), treasureId: v.string() }),
);
const faustianDemonOccupancyValidator = v.union(
  v.object({ kind: v.literal("isha") }),
  v.object({ kind: v.literal("pact_domain"), seatId: v.string() }),
);
const faustianDemonBindingValidator = v.union(
  v.object({ kind: v.literal("bound") }),
  v.object({ kind: v.literal("unbound"), malignance: v.string() }),
);
const faustianDevilObligationValidator = v.union(
  v.object({ kind: v.literal("wizard_owes_week_next_month"), wizardId: v.string() }),
  v.object({
    kind: v.literal("wizard_owes_week_monthly_while_denizen_alive"),
    wizardId: v.string(),
    denizenId: v.string(),
  }),
  v.object({ kind: v.literal("monthly_card_drain_while_powerful_in_isha"), denizenId: v.string() }),
  v.object({ kind: v.literal("recurring_devil_time_while_magic_trace"), traceDescription: v.string() }),
  v.object({
    kind: v.literal("recurring_devil_time_in_domain_while_companion_care"),
    wizardId: v.string(),
    companionRelationshipId: v.string(),
  }),
  v.object({ kind: v.literal("monthly_card_drain_while_wizard_alive"), wizardId: v.string() }),
  v.object({
    kind: v.literal("permanent_devil_time_from_wizard"),
    wizardId: v.string(),
    weeks: v.number(),
  }),
);
const sageCharacterRefValidator = v.union(
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
);
const sageOmenLocationValidator = v.union(
  v.object({ kind: v.literal("future_of_the_pact") }),
  v.object({ kind: v.literal("destiny"), destinyInstanceId: v.string() }),
  v.object({ kind: v.literal("character"), characterRef: sageCharacterRefValidator }),
  v.object({ kind: v.literal("dreamscape"), segmentId: v.string() }),
  v.object({ kind: v.literal("warlock_court") }),
  v.object({ kind: v.literal("warlock_rebellion"), rebellionId: v.string() }),
);
const sageFairyNameValidator = v.union(
  v.object({ kind: v.literal("ordinary"), name: v.string(), glyph: v.string() }),
  v.object({ kind: v.literal("true"), name: v.string() }),
);
const sageLostDreamerValidator = v.union(
  v.object({ kind: v.literal("lost"), wizardId: v.string() }),
  v.object({
    kind: v.literal("returned_recovering"),
    wizardId: v.string(),
    recoveryWeeksRemaining: v.number(),
  }),
);
const sageStateValidator = v.object({
  selectedDreamingLawIds: v.array(v.string()),
  dreamingCondition: v.union(
    v.literal("calm"),
    v.literal("uncertain"),
    v.literal("chaotic"),
    v.null(),
  ),
  futureCondition: v.union(v.literal("certain"), v.literal("bleak"), v.null()),
  destinyInstances: v.array(v.object({
    destinyInstanceId: v.string(),
    definitionId: v.string(),
  })),
  destinyDeck: v.array(v.string()),
  setAsideDestinyInstanceIds: v.array(v.string()),
  assignedDestinies: v.array(v.object({
    destinyInstanceId: v.string(),
    characterRef: sageCharacterRefValidator,
    status: v.union(v.literal("hidden"), v.literal("accepted"), v.literal("rejected")),
  })),
  omenLedger: v.array(v.object({
    location: sageOmenLocationValidator,
    count: v.number(),
  })),
  dreamscapeAssociations: v.array(v.object({
    denizenId: v.string(),
    segmentIds: v.array(v.string()),
  })),
  earnedCycles: v.array(v.string()),
  fairies: v.array(v.object({
    denizenId: v.string(),
    form: v.union(v.literal("cadre"), v.literal("individual")),
    ordinaryNames: v.array(v.object({
      name: v.string(),
      glyph: v.string(),
    })),
    trueName: v.union(v.null(), v.object({ name: v.string() })),
  })),
  druids: v.array(v.object({
    denizenId: v.string(),
    grade: v.union(v.literal("ovate"), v.literal("eremite"), v.literal("archdruid")),
    fairyNames: v.array(sageFairyNameValidator),
    changesOfMagic: v.array(v.string()),
    familiarDescription: v.union(v.string(), v.null()),
  })),
  lostDreamers: v.array(sageLostDreamerValidator),
});

const warlockCharacterRefValidator = v.union(
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
);
const warlockCourtLawRefValidator = v.union(
  v.object({ kind: v.literal("source"), lawId: v.string() }),
  v.object({ kind: v.literal("campaign"), lawId: v.string() }),
);
const warlockErrantHeraldryValidator = v.union(
  v.object({ kind: v.literal("source_clan"), clanId: v.string() }),
  v.object({ kind: v.literal("custom"), description: v.string() }),
);
const warlockErrantClaimValidator = v.union(
  v.object({ kind: v.literal("necromancer_edge"), pathSpaceId: v.string() }),
  v.object({ kind: v.literal("hierophant_temple"), templeId: v.string() }),
  v.object({ kind: v.literal("mariner_sea_region"), seaRegionId: v.string() }),
  v.object({ kind: v.literal("mariner_beast"), denizenId: v.string() }),
  v.object({ kind: v.literal("faustian_community"), communityId: v.string() }),
  v.object({ kind: v.literal("sage_dreamscape"), segmentId: v.string() }),
  v.object({ kind: v.literal("sorcerer_research_position"), positionId: v.string() }),
  v.object({ kind: v.literal("sorcerer_tower"), placeId: v.string() }),
);
const warlockAuthorityTargetValidator = v.union(
  v.object({ kind: v.literal("king") }),
  v.object({ kind: v.literal("ideology"), ideologyId: v.string() }),
  v.object({ kind: v.literal("clan"), clanId: v.string() }),
  v.object({ kind: v.literal("lord"), titleId: v.string() }),
  v.object({ kind: v.literal("noble"), denizenId: v.string() }),
  v.object({ kind: v.literal("garrison"), garrisonId: v.string() }),
  v.object({ kind: v.literal("army"), denizenId: v.string() }),
  v.object({ kind: v.literal("hierophant_temple"), templeId: v.string() }),
  v.object({ kind: v.literal("mariner_market"), isleId: v.string() }),
  v.object({ kind: v.literal("relocated_market"), relocatedMarketId: v.string() }),
  v.object({ kind: v.literal("orrery") }),
);
const warlockArmySponsorValidator = v.union(
  v.object({ kind: v.literal("king") }),
  v.object({ kind: v.literal("clan"), clanId: v.string() }),
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
);
const warlockPartnershipValidator = v.union(
  v.object({ kind: v.literal("mercantilism"), wizardId: v.string(), partnerName: v.string() }),
  v.object({ kind: v.literal("piracy"), wizardId: v.string(), partnerName: v.string() }),
  v.object({
    kind: v.literal("monarchy"),
    wizardId: v.string(),
    kingRef: warlockCharacterRefValidator,
  }),
);
const warlockClanCountValidator = v.object({
  clanId: v.string(),
  count: v.number(),
});
const warlockStateValidator = v.object({
  clans: v.array(v.object({
    clanId: v.string(),
    active: v.boolean(),
    favor: v.number(),
  })),
  campaignCourtLaws: v.array(v.object({
    lawId: v.string(),
    text: v.string(),
  })),
  activeCourtLawRefs: v.array(warlockCourtLawRefValidator),
  titles: v.array(v.object({
    titleId: v.string(),
    occupantDenizenId: v.union(v.string(), v.null()),
    currentClanId: v.union(v.string(), v.null()),
    distracted: v.boolean(),
  })),
  clanDecks: v.array(v.object({
    clanId: v.string(),
    titleIds: v.array(v.string()),
  })),
  kingsAgenda: v.array(v.string()),
  setAsideTitleIds: v.array(v.string()),
  unclaimedTitleIds: v.array(v.string()),
  questTitles: v.array(v.object({
    titleId: v.string(),
    currentDomainSeatId: v.string(),
    visitedDomainSeatIds: v.array(v.string()),
  })),
  faustianAccompliceTitles: v.array(v.object({
    titleId: v.string(),
    communityId: v.string(),
  })),
  devilTakenTitleIds: v.array(v.string()),
  king: v.union(
    v.null(),
    v.object({
      occupant: v.union(warlockCharacterRefValidator, v.null()),
      regnalName: v.union(v.string(), v.null()),
      clanId: v.union(v.string(), v.null()),
      sunSign: v.union(v.number(), v.null()),
      moonSign: v.union(v.number(), v.null()),
      risingSign: v.union(v.number(), v.null()),
      healthCondition: v.union(v.literal("healthy"), v.literal("deathly_ill")),
    }),
  ),
  courtCondition: v.union(v.literal("ordinary"), v.literal("civil_war"), v.null()),
  ladies: v.array(v.object({
    denizenId: v.string(),
    clanId: v.string(),
  })),
  kingsFamilyLadyIds: v.array(v.string()),
  kingsConfidantLadyIds: v.array(v.string()),
  errantLadies: v.array(v.object({
    denizenId: v.string(),
    clanId: v.string(),
    heraldry: warlockErrantHeraldryValidator,
    personalityQuirk: v.string(),
    currentDomainSeatId: v.string(),
    claimedComponent: warlockErrantClaimValidator,
    controlledLordTitleIds: v.array(v.string()),
  })),
  authority: v.array(v.object({
    target: warlockAuthorityTargetValidator,
    amount: v.number(),
  })),
  garrisons: v.array(v.object({
    garrisonId: v.string(),
    domainSeatId: v.string(),
  })),
  armies: v.array(v.object({
    denizenId: v.string(),
    currentDomainSeatId: v.string(),
    favor: v.number(),
    sponsor: warlockArmySponsorValidator,
    alignedIdeologyId: v.union(v.string(), v.null()),
    lifecycle: v.union(v.literal("active"), v.literal("dissolved"), v.literal("destroyed")),
  })),
  heroes: v.array(v.object({
    denizenId: v.string(),
    currentDomainSeatId: v.string(),
    fame: v.union(v.literal("local"), v.literal("great"), v.literal("mythic")),
    heroicTitles: v.array(v.object({
      glyph: v.string(),
      title: v.string(),
    })),
  })),
  rebellions: v.array(v.object({
    rebellionId: v.string(),
    domainSeatId: v.string(),
    lordTitleIds: v.array(v.string()),
  })),
  marketHeraldry: v.array(v.object({
    isleId: v.string(),
    clanCounts: v.array(warlockClanCountValidator),
  })),
  relocatedMarkets: v.array(v.object({
    relocatedMarketId: v.string(),
    originIsleId: v.union(v.string(), v.null()),
    currentDomainSeatId: v.string(),
    clanCounts: v.array(warlockClanCountValidator),
  })),
  partnerships: v.array(warlockPartnershipValidator),
});

const faustianStateValidator = v.object({
  faustianDeck: v.array(v.string()),
  devilDeck: v.array(v.string()),
  communities: v.array(faustianCommunityValidator),
  machinations: v.array(faustianSchemeValidator),
  defeatedSchemes: v.array(v.string()),
  entrustedCards: v.array(v.object({
    cardId: v.string(),
    wizardId: v.string(),
  })),
  beneathAntagonists: v.array(v.object({
    cardId: v.string(),
    denizenId: v.string(),
  })),
  possessions: v.array(v.object({
    cardId: v.string(),
    wizardId: v.string(),
    represented: faustianPossessionRepresentationValidator,
  })),
  setAsideHand: v.array(v.string()),
  domainPlacements: v.array(v.object({
    cardId: v.string(),
    seatId: v.string(),
    represented: faustianPossessionRepresentationValidator,
  })),
  activeTwistCardIds: v.array(v.string()),
  conspiracies: v.array(v.object({
    denizenId: v.string(),
    communityId: v.string(),
  })),
  antagonists: v.array(v.object({
    denizenId: v.string(),
    seatId: v.string(),
    chipCount: v.number(),
  })),
  demons: v.array(v.object({
    denizenId: v.string(),
    binding: faustianDemonBindingValidator,
    form: v.string(),
    hellOfOrigin: v.string(),
    magicalSymbol: v.string(),
    occupancy: v.union(faustianDemonOccupancyValidator, v.null()),
    monthsInCurrentDomain: v.number(),
    condition: v.union(
      v.literal("active"),
      v.literal("destroyed_reforming"),
      v.literal("imprisoned"),
      v.literal("banished"),
    ),
  })),
  domainSeizures: v.array(v.object({
    seatId: v.string(),
    conduitDenizenId: v.string(),
  })),
  selectedDevilLawIds: v.array(v.string()),
  selectedDevilForms: v.object({
    casual: v.array(v.string()),
    special: v.array(v.string()),
    duress: v.array(v.string()),
  }),
  originClaims: v.array(v.object({
    claimId: v.string(),
    status: v.string(),
  })),
  customOriginClaim: v.union(
    v.null(),
    v.object({
      claim: v.string(),
      secretName: v.union(v.string(), v.null()),
      status: v.string(),
    }),
  ),
  devilObligations: v.array(faustianDevilObligationValidator),
  resolvedFlushSuits: v.array(v.string()),
  persistentMachinationEffects: v.array(v.union(
    v.object({ kind: v.literal("flush"), suit: v.string() }),
    v.object({ kind: v.literal("full_house"), rank: v.string() }),
  )),
});

const marinerIsleBindingValidator = v.object({
  boardIsleId: v.string(),
  worldIsleId: v.string(),
});

const marinerRarityDescriptionValidator = v.object({
  boardIsleId: v.string(),
  description: v.string(),
});

const marinerInitializedEventV1Validator = v.object({
  type: v.literal("mariner_initialized"),
  version: v.literal(1),
  data: v.object({
    arrangementId: v.string(),
    shipPlaceId: v.string(),
    selectedLawOfSeaIds: v.array(v.string()),
    isleBindings: v.array(marinerIsleBindingValidator),
    arrangementBeasts: v.array(marinerBeastStateValidator),
    rarityDescriptions: v.array(marinerRarityDescriptionValidator),
    mariner: marinerStateValidator,
  }),
});

const marinerShipChangedEventV1Validator = v.object({
  type: v.literal("mariner_ship_changed"),
  version: v.literal(1),
  data: v.object({
    previousShipPlaceId: v.string(),
    newShipPlaceId: v.string(),
  }),
});

const marinerSeaLawsChangedEventV1Validator = v.object({
  type: v.literal("mariner_sea_laws_changed"),
  version: v.literal(1),
  data: v.object({
    previousSelectedLawOfSeaIds: v.array(v.string()),
    newSelectedLawOfSeaIds: v.array(v.string()),
  }),
});

const marinerRouteOccupancyChangedEventV1Validator = v.object({
  type: v.literal("mariner_route_occupancy_changed"),
  version: v.literal(1),
  data: v.object({
    routeId: v.string(),
    previousOccupancy: marinerRouteOccupancyValidator,
    newOccupancy: marinerRouteOccupancyValidator,
  }),
});

const marinerSeaStormCountChangedEventV1Validator = v.object({
  type: v.literal("mariner_sea_storm_count_changed"),
  version: v.literal(1),
  data: v.object({
    regionId: v.string(),
    previousStormCount: v.number(),
    newStormCount: v.number(),
  }),
});

const marinerIsleMarketChangedEventV1Validator = v.object({
  type: v.literal("mariner_isle_market_changed"),
  version: v.literal(1),
  data: v.object({
    boardIsleId: v.string(),
    previousMarket: marinerIsleMarketValidator,
    newMarket: marinerIsleMarketValidator,
  }),
});

const marinerIsleRavageChangedEventV1Validator = v.object({
  type: v.literal("mariner_isle_ravage_changed"),
  version: v.literal(1),
  data: v.object({
    boardIsleId: v.string(),
    previousRavageStormCount: v.number(),
    newRavageStormCount: v.number(),
  }),
});

const marinerBeastAddedEventV1Validator = v.object({
  type: v.literal("mariner_beast_added"),
  version: v.literal(1),
  data: v.object({ beast: marinerBeastStateValidator }),
});

const marinerBeastUpdatedEventV1Validator = v.object({
  type: v.literal("mariner_beast_updated"),
  version: v.literal(1),
  data: v.object({
    previous: marinerBeastStateValidator,
    updated: marinerBeastStateValidator,
  }),
});

const marinerBeastRemovedEventV1Validator = v.object({
  type: v.literal("mariner_beast_removed"),
  version: v.literal(1),
  data: v.object({ beast: marinerBeastStateValidator }),
});

const necromancerDepthValidator = v.union(
  v.null(),
  v.object({
    wizardId: v.string(),
    value: v.number(),
  }),
);

const necromancerSelectedLawValidator = v.object({
  lawId: v.string(),
  visibility: v.string(),
});

const necromancerAllyValidator = v.object({
  denizenId: v.string(),
  location: necromancerOccupiableSpaceRefValidator,
});

const necromancerGhoulCallerValidator = v.object({
  denizenId: v.string(),
  location: v.object({
    kind: v.literal("path"),
    pathSpaceId: v.string(),
  }),
  pettyDeadCount: v.number(),
  primaryElement: elementIdValidator,
  aesthetic: v.string(),
  strangeQuirk: v.string(),
  ageYears: v.number(),
});

const necromancerCampaignGateValidator = v.object({
  origin: v.literal("campaign"),
  gateId: v.string(),
  name: v.string(),
  band: v.string(),
  status: v.string(),
});

const necromancerCampaignPathSpaceValidator = v.object({
  origin: v.literal("campaign"),
  pathSpaceId: v.string(),
  region: v.string(),
});

const necromancerDirectedStepValidator = v.object({
  from: necromancerOccupiableSpaceRefValidator,
  to: necromancerOccupiableSpaceRefValidator,
});

const necromancerArrangementFoeBindingValidator = v.object({
  denizenId: v.string(),
  gateId: v.string(),
});

const necromancerArrangementAllyBindingValidator = v.object({
  denizenId: v.string(),
  gateId: v.string(),
});

const necromancerArrangementGhoulCallerBindingValidator = v.union(
  v.null(),
  v.object({
    denizenId: v.string(),
    pathSpaceId: v.string(),
    primaryElement: elementIdValidator,
    aesthetic: v.string(),
    strangeQuirk: v.string(),
    ageYears: v.number(),
  }),
);

const necromancerInitializedEventV1Validator = v.object({
  type: v.literal("necromancer_initialized"),
  version: v.literal(1),
  data: v.object({
    arrangementId: v.string(),
    selectedLawIds: v.array(v.string()),
    arrangementFoes: v.array(necromancerArrangementFoeBindingValidator),
    arrangementAlly: necromancerArrangementAllyBindingValidator,
    arrangementGhoulCaller: necromancerArrangementGhoulCallerBindingValidator,
    necromancer: necromancerStateValidator,
  }),
});

const necromancerDepthChangedEventV1Validator = v.object({
  type: v.literal("necromancer_depth_changed"),
  version: v.literal(1),
  data: v.object({
    previousDepth: necromancerDepthValidator,
    newDepth: necromancerDepthValidator,
  }),
});

const necromancerLawsChangedEventV1Validator = v.object({
  type: v.literal("necromancer_laws_changed"),
  version: v.literal(1),
  data: v.object({
    previousSelectedLaws: v.array(necromancerSelectedLawValidator),
    newSelectedLaws: v.array(necromancerSelectedLawValidator),
  }),
});

const necromancerGateStatusChangedEventV1Validator = v.object({
  type: v.literal("necromancer_gate_status_changed"),
  version: v.literal(1),
  data: v.object({
    gateId: v.string(),
    previousStatus: v.string(),
    newStatus: v.string(),
  }),
});

const necromancerSoulCountChangedEventV1Validator = v.object({
  type: v.literal("necromancer_soul_count_changed"),
  version: v.literal(1),
  data: v.object({
    location: necromancerOccupiableSpaceRefValidator,
    previousCount: v.number(),
    newCount: v.number(),
  }),
});

const necromancerSoulsMovedEventV1Validator = v.object({
  type: v.literal("necromancer_souls_moved"),
  version: v.literal(1),
  data: v.object({
    from: necromancerOccupiableSpaceRefValidator,
    to: necromancerOccupiableSpaceRefValidator,
    amount: v.number(),
    previousFromCount: v.number(),
    newFromCount: v.number(),
    previousToCount: v.number(),
    newToCount: v.number(),
  }),
});

const necromancerFoeAddedEventV1Validator = v.object({
  type: v.literal("necromancer_foe_added"),
  version: v.literal(1),
  data: v.object({ foe: necromancerFoeValidator }),
});

const necromancerFoeUpdatedEventV1Validator = v.object({
  type: v.literal("necromancer_foe_updated"),
  version: v.literal(1),
  data: v.object({
    previous: necromancerFoeValidator,
    updated: necromancerFoeValidator,
  }),
});

const necromancerFoeRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_foe_removed"),
  version: v.literal(1),
  data: v.object({ foe: necromancerFoeValidator }),
});

const necromancerWizardFoeEscapedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_foe_escaped"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousMortalityState: v.literal("deceased"),
    newMortalityState: v.literal("not_deceased"),
    previous: necromancerFoeValidator,
    updated: necromancerFoeValidator,
  }),
});

const necromancerWizardFoeTruthAddedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_foe_truth_added"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    truth: powerfulDenizenTruthEntryValidator,
  }),
});

const necromancerWizardFoeTruthUpdatedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_foe_truth_updated"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previous: powerfulDenizenTruthEntryValidator,
    updated: powerfulDenizenTruthEntryValidator,
  }),
});

const necromancerWizardFoeTruthRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_foe_truth_removed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    truth: powerfulDenizenTruthEntryValidator,
  }),
});

const necromancerWizardTraversalAddedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_traversal_added"),
  version: v.literal(1),
  data: v.object({ traversal: necromancerWizardTraversalValidator }),
});

const necromancerWizardTraversalUpdatedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_traversal_updated"),
  version: v.literal(1),
  data: v.object({
    previous: necromancerWizardTraversalValidator,
    updated: necromancerWizardTraversalValidator,
  }),
});

const necromancerWizardTraversalRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_wizard_traversal_removed"),
  version: v.literal(1),
  data: v.object({ traversal: necromancerWizardTraversalValidator }),
});

const necromancerAllyAddedEventV1Validator = v.object({
  type: v.literal("necromancer_ally_added"),
  version: v.literal(1),
  data: v.object({ ally: necromancerAllyValidator }),
});

const necromancerAllyUpdatedEventV1Validator = v.object({
  type: v.literal("necromancer_ally_updated"),
  version: v.literal(1),
  data: v.object({
    previous: necromancerAllyValidator,
    updated: necromancerAllyValidator,
  }),
});

const necromancerAllyRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_ally_removed"),
  version: v.literal(1),
  data: v.object({ ally: necromancerAllyValidator }),
});

const necromancerGhoulCallerAddedEventV1Validator = v.object({
  type: v.literal("necromancer_ghoul_caller_added"),
  version: v.literal(1),
  data: v.object({ ghoulCaller: necromancerGhoulCallerValidator }),
});

const necromancerGhoulCallerUpdatedEventV1Validator = v.object({
  type: v.literal("necromancer_ghoul_caller_updated"),
  version: v.literal(1),
  data: v.object({
    previous: necromancerGhoulCallerValidator,
    updated: necromancerGhoulCallerValidator,
  }),
});

const necromancerGhoulCallerRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_ghoul_caller_removed"),
  version: v.literal(1),
  data: v.object({ ghoulCaller: necromancerGhoulCallerValidator }),
});

const necromancerCampaignGateCreatedEventV1Validator = v.object({
  type: v.literal("necromancer_campaign_gate_created"),
  version: v.literal(1),
  data: v.object({ gate: necromancerCampaignGateValidator }),
});

const necromancerCampaignGateUpdatedEventV1Validator = v.object({
  type: v.literal("necromancer_campaign_gate_updated"),
  version: v.literal(1),
  data: v.object({
    previous: necromancerCampaignGateValidator,
    updated: necromancerCampaignGateValidator,
  }),
});

const necromancerCampaignPathSpaceCreatedEventV1Validator = v.object({
  type: v.literal("necromancer_campaign_path_space_created"),
  version: v.literal(1),
  data: v.object({ pathSpace: necromancerCampaignPathSpaceValidator }),
});

const necromancerCampaignPathSpaceRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_campaign_path_space_removed"),
  version: v.literal(1),
  data: v.object({ pathSpace: necromancerCampaignPathSpaceValidator }),
});

const necromancerStepAddedEventV1Validator = v.object({
  type: v.literal("necromancer_step_added"),
  version: v.literal(1),
  data: v.object({ step: necromancerDirectedStepValidator }),
});

const necromancerStepRemovedEventV1Validator = v.object({
  type: v.literal("necromancer_step_removed"),
  version: v.literal(1),
  data: v.object({ step: necromancerDirectedStepValidator }),
});

const templeCreatedEventV1Validator = v.object({
  type: v.literal("temple_created"),
  version: v.literal(1),
  data: v.object({ temple: ordinaryTempleValidator }),
});

const templeUpdatedEventV1Validator = v.object({
  type: v.literal("temple_updated"),
  version: v.literal(1),
  data: v.object({
    previous: v.union(ordinaryTempleValidator, hestarTempleValidator),
    updated: v.union(ordinaryTempleValidator, hestarTempleValidator),
  }),
});

const templeHolidayChangedEventV1Validator = v.object({
  type: v.literal("temple_holiday_changed"),
  version: v.literal(1),
  data: v.object({
    templeId: v.string(),
    previousMarked: v.boolean(),
    newMarked: v.boolean(),
  }),
});

const flameLawsChangedEventV1Validator = v.object({
  type: v.literal("flame_laws_changed"),
  version: v.literal(1),
  data: v.object({
    previousSelectedFlameLawIds: v.array(v.string()),
    newSelectedFlameLawIds: v.array(v.string()),
  }),
});

const supplicantAddedEventV1Validator = v.object({
  type: v.literal("supplicant_added"),
  version: v.literal(1),
  data: v.object({ supplicant: hierophantSupplicantValidator }),
});

const supplicantUpdatedEventV1Validator = v.object({
  type: v.literal("supplicant_updated"),
  version: v.literal(1),
  data: v.object({
    previous: hierophantSupplicantValidator,
    updated: hierophantSupplicantValidator,
  }),
});

const supplicantRemovedEventV1Validator = v.object({
  type: v.literal("supplicant_removed"),
  version: v.literal(1),
  data: v.object({ denizenId: v.string() }),
});

const prophetAddedEventV1Validator = v.object({
  type: v.literal("prophet_added"),
  version: v.literal(1),
  data: v.object({ prophet: hierophantProphetValidator }),
});

const prophetUpdatedEventV1Validator = v.object({
  type: v.literal("prophet_updated"),
  version: v.literal(1),
  data: v.object({
    previous: hierophantProphetValidator,
    updated: hierophantProphetValidator,
  }),
});

const prophetRemovedEventV1Validator = v.object({
  type: v.literal("prophet_removed"),
  version: v.literal(1),
  data: v.object({ denizenId: v.string() }),
});

const cultEstablishedEventV1Validator = v.object({
  type: v.literal("cult_established"),
  version: v.literal(1),
  data: v.object({ cult: hierophantCultValidator }),
});

const cultUpdatedEventV1Validator = v.object({
  type: v.literal("cult_updated"),
  version: v.literal(1),
  data: v.object({
    previous: hierophantCultValidator,
    updated: hierophantCultValidator,
  }),
});

const cultRemovedEventV1Validator = v.object({
  type: v.literal("cult_removed"),
  version: v.literal(1),
  data: v.object({ cultDenizenId: v.string() }),
});

const cultDogmaAddedEventV1Validator = v.object({
  type: v.literal("cult_dogma_added"),
  version: v.literal(1),
  data: v.object({
    cultDenizenId: v.string(),
    dogma: hierophantCultDogmaValidator,
  }),
});

const cultDogmaUpdatedEventV1Validator = v.object({
  type: v.literal("cult_dogma_updated"),
  version: v.literal(1),
  data: v.object({
    cultDenizenId: v.string(),
    previous: hierophantCultDogmaValidator,
    updated: hierophantCultDogmaValidator,
  }),
});

const cultDogmaRemovedEventV1Validator = v.object({
  type: v.literal("cult_dogma_removed"),
  version: v.literal(1),
  data: v.object({
    cultDenizenId: v.string(),
    dogmaEntryId: v.string(),
  }),
});

const campaignClassCreatedEventV1Validator = v.object({
  type: v.literal("campaign_class_created"),
  version: v.literal(1),
  data: v.object({ campaignClass: v.object({ classId: v.string(), name: v.string() }) }),
});

const campaignClassUpdatedEventV1Validator = v.object({
  type: v.literal("campaign_class_updated"),
  version: v.literal(1),
  data: v.object({
    previous: v.object({ classId: v.string(), name: v.string() }),
    updated: v.object({ classId: v.string(), name: v.string() }),
  }),
});

const campaignDoctrineRecordValidator = v.object({
  doctrineId: v.string(),
  orthodoxText: v.union(v.string(), v.null()),
  blasphemy: v.union(campaignBlasphemyValidator, v.null()),
  supportedClassIds: v.array(v.string()),
});

const campaignDoctrineCreatedEventV1Validator = v.object({
  type: v.literal("campaign_doctrine_created"),
  version: v.literal(1),
  data: v.object({ campaignDoctrine: campaignDoctrineRecordValidator }),
});

const campaignDoctrineUpdatedEventV1Validator = v.object({
  type: v.literal("campaign_doctrine_updated"),
  version: v.literal(1),
  data: v.object({
    previous: campaignDoctrineRecordValidator,
    updated: campaignDoctrineRecordValidator,
  }),
});

const pactFragmentOperationalStateValidator = v.object({
  condition: v.union(v.literal("intact"), v.literal("damaged"), v.literal("destroyed")),
  custody: v.union(
    v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
    v.object({ kind: v.literal("devil") }),
    v.object({ kind: v.literal("unlocated") }),
    v.object({ kind: v.literal("none") }),
  ),
});

const pactFragmentOperationalMapValidator = v.object(
  Object.fromEntries(
    PACT_SEAT_IDS.map((id) => [id, pactFragmentOperationalStateValidator]),
  ) as Record<string, typeof pactFragmentOperationalStateValidator>,
);

const magicSchoolRefValidator = v.union(
  v.object({ kind: v.literal("source"), schoolId: v.string() }),
  v.object({ kind: v.literal("campaign"), schoolId: v.string() }),
);
const magicConsumableCustodyValidator = v.union(
  v.object({ kind: v.literal("sorcerer_tower") }),
  v.object({
    kind: v.literal("subject"),
    subject: v.union(
      v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
      v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
    ),
  }),
);
const magicConsumablesStateValidator = v.object({
  tomes: v.array(v.object({
    school: magicSchoolRefValidator,
    custody: magicConsumableCustodyValidator,
    count: v.number(),
  })),
  reagents: v.array(v.object({
    reagentId: v.string(),
    custody: magicConsumableCustodyValidator,
    count: v.number(),
  })),
});

const sorcererRecipeRefValidator = v.union(
  v.object({ kind: v.literal("builtin"), recipeId: v.string() }),
  v.object({ kind: v.literal("campaign"), recipeId: v.string() }),
);
const sorcererAcademicRoleValidator = v.union(
  v.object({ kind: v.literal("student") }),
  v.object({ kind: v.literal("professor") }),
  v.object({ kind: v.literal("librarian"), school: magicSchoolRefValidator }),
  v.object({ kind: v.literal("alchemist"), recipe: sorcererRecipeRefValidator }),
  v.object({ kind: v.literal("campaign"), academicKindId: v.string() }),
);
const sorcererResearchPositionTargetValidator = v.union(
  v.object({ kind: v.literal("orrery_house"), house: v.number() }),
  v.object({ kind: v.literal("hierophant_temple"), templeId: v.string() }),
  v.object({ kind: v.literal("warlock_ideology"), ideologyId: v.string() }),
  v.object({ kind: v.literal("mariner_sea_region"), seaRegionId: v.string() }),
  v.object({ kind: v.literal("sage_future_of_pact") }),
  v.object({ kind: v.literal("faustian_devils_schemes") }),
  v.object({ kind: v.literal("necromancer_final_death") }),
  v.object({ kind: v.literal("campaign_knowledge_method"), knowledgeMethodId: v.string() }),
);
const sorcererArcanistPlacementValidator = v.union(
  v.object({ kind: v.literal("tower") }),
  v.object({ kind: v.literal("other_domain"), seatId: v.string() }),
);
const sorcererDisruptiveProfileValidator = v.object({
  primaryElement: v.string(),
  rank: v.union(v.literal("prentice"), v.literal("journeyman"), v.literal("master")),
  changesOfMagic: v.array(v.string()),
  quirk: v.string(),
  prenticeSpellIds: v.array(v.string()),
});
const sorcererStateValidator = v.object({
  initialized: v.boolean(),
  spyrholmIsleId: v.union(v.string(), v.null()),
  towerPlaceId: v.union(v.string(), v.null()),
  universityPlaceId: v.union(v.string(), v.null()),
  activeLawIds: v.array(v.string()),
  unrevealedLawIds: v.array(v.string()),
  campaignSchools: v.array(v.object({
    schoolId: v.string(),
    name: v.string(),
    description: v.string(),
  })),
  campaignAcademicKinds: v.array(v.object({
    academicKindId: v.string(),
    name: v.string(),
    action: v.string(),
  })),
  campaignRecipes: v.array(v.object({
    recipeId: v.string(),
    name: v.string(),
    recipeText: v.string(),
  })),
  campaignKnowledgeMethods: v.array(v.object({
    knowledgeMethodId: v.string(),
    name: v.string(),
    description: v.string(),
  })),
  researchPositions: v.array(v.object({
    positionId: v.string(),
    target: sorcererResearchPositionTargetValidator,
  })),
  researchers: v.array(v.object({
    denizenId: v.string(),
    positionId: v.string(),
    operationalThisMonth: v.boolean(),
  })),
  academics: v.array(v.object({
    denizenId: v.string(),
    role: sorcererAcademicRoleValidator,
  })),
  towerOrder: v.array(v.string()),
  knowledge: v.object({
    researchOrigin: v.number(),
    other: v.number(),
    nextMonthResearchOrigin: v.number(),
    researcherProductionMultiplierCurrent: v.number(),
    researcherProductionMultiplierNextMonth: v.number(),
  }),
  arcanists: v.array(v.object({
    denizenId: v.string(),
    school: magicSchoolRefValidator,
    placement: sorcererArcanistPlacementValidator,
    disruptiveProfile: v.union(sorcererDisruptiveProfileValidator, v.null()),
  })),
  constructs: v.array(v.object({
    denizenId: v.string(),
    instructions: v.array(v.object({
      condition: v.string(),
      result: v.string(),
    })),
  })),
  innovations: v.array(v.object({
    innovationId: v.string(),
    spellId: v.string(),
    text: v.string(),
  })),
  archivesOpen: v.boolean(),
});

const sorcererInitializedEventV1Validator = v.object({
  type: v.literal("sorcerer_initialized"),
  version: v.literal(1),
  data: v.object({
    arrangementId: v.string(),
    sorcerer: sorcererStateValidator,
  }),
});

const loreSubjectRefValidator = v.union(
  v.object({ kind: v.literal("isle"), isleId: v.string() }),
  v.object({ kind: v.literal("place"), placeId: v.string() }),
  v.object({ kind: v.literal("necromancer_gate"), gateId: v.string() }),
  v.object({ kind: v.literal("hierophant_temple"), templeId: v.string() }),
  v.object({ kind: v.literal("warlock_clan"), clanId: v.string() }),
  v.object({ kind: v.literal("element"), elementId: v.string() }),
  v.object({ kind: v.literal("pact_domain"), pactSeatId: v.string() }),
  v.object({ kind: v.literal("mariner_horizon"), cardinalGroupId: v.string() }),
  v.object({ kind: v.literal("source_topic"), topicId: v.string() }),
);

const loreEntryAddedEventV1Validator = v.object({
  type: v.literal("lore_entry_added"),
  version: v.literal(1),
  data: v.object({
    collection: v.union(
      v.object({
        kind: v.literal("source"),
        sourceCollectionId: v.string(),
        boundSubject: loreSubjectRefValidator,
      }),
      v.object({
        kind: v.literal("campaign"),
        collectionId: v.string(),
        subject: loreSubjectRefValidator,
      }),
    ),
    loreEntryId: v.string(),
    text: v.string(),
    collectionCreated: v.boolean(),
  }),
});

const loreEntryRevisedEventV1Validator = v.object({
  type: v.literal("lore_entry_revised"),
  version: v.literal(1),
  data: v.object({
    target: v.union(
      v.object({
        kind: v.literal("source_entry"),
        sourceCollectionId: v.string(),
        sourceEntryId: v.string(),
        boundSubject: loreSubjectRefValidator,
      }),
      v.object({
        kind: v.literal("source_addition"),
        sourceCollectionId: v.string(),
        loreEntryId: v.string(),
        boundSubject: loreSubjectRefValidator,
      }),
      v.object({
        kind: v.literal("campaign_entry"),
        collectionId: v.string(),
        loreEntryId: v.string(),
        subject: loreSubjectRefValidator,
      }),
    ),
    previousText: v.string(),
    text: v.string(),
    sourceCollectionBound: v.boolean(),
  }),
});

const campaignAuthoredLoreEntryValidator = v.object({
  loreEntryId: v.string(),
  text: v.string(),
});

const loreStateValidator = v.object({
  sourceCollections: v.array(v.object({
    sourceCollectionId: v.string(),
    boundSubject: loreSubjectRefValidator,
    overrides: v.array(v.object({
      sourceEntryId: v.string(),
      currentText: v.string(),
    })),
    additions: v.array(campaignAuthoredLoreEntryValidator),
  })),
  campaignCollections: v.array(v.object({
    collectionId: v.string(),
    subject: loreSubjectRefValidator,
    entries: v.array(campaignAuthoredLoreEntryValidator),
  })),
});

export const campaignStateV5Validator = v.object({
  schemaVersion: v.literal(5),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.union(v.number(), v.null()),
  }),
  configuration: v.object({
    ageId: v.union(v.string(), v.null()),
    facilitatorPlayerId: v.union(v.string(), v.null()),
  }),
  players: v.array(playerValidator),
  wizards: v.array(wizardV5Validator),
  pactSeats: pactSeatsValidator,
  pactFragmentOperationalState: pactFragmentOperationalMapValidator,
  lifecycle: lifecycleV5Validator,
  wizardmootHistory: v.array(wizardmootHistoryEntryValidator),
  world: sharedWorldStateValidator,
  hierophant: hierophantStateValidator,
  mariner: marinerStateValidator,
  necromancer: necromancerStateValidator,
  faustian: faustianStateValidator,
  sage: sageStateValidator,
  warlock: warlockStateValidator,
  magicConsumables: magicConsumablesStateValidator,
  sorcerer: sorcererStateValidator,
  lore: loreStateValidator,
});

export const wizardCharacterUpdatedEventV2Validator = v.object({
  type: v.literal("wizard_character_updated"),
  version: v.literal(2),
  data: v.object({
    wizardId: v.string(),
    previousCharacter: wizardCharacterDataV5Validator,
    newCharacter: wizardCharacterDataV5Validator,
  }),
});

export const engagementTargetChangedEventV2Validator = v.object({
  type: v.literal("engagement_target_changed"),
  version: v.literal(2),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    actingWizardId: v.string(),
    previousTarget: v.union(engagementTargetV5Validator, v.null()),
    newTarget: v.union(engagementTargetV5Validator, v.null()),
  }),
});

export const engagementRescheduledEventV2Validator = v.object({
  type: v.literal("engagement_rescheduled"),
  version: v.literal(2),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    previousTarget: v.union(engagementTargetV5Validator, v.null()),
    newTarget: engagementTargetV5Validator,
  }),
});

const wizardMortalityStateChangedEventV1Validator = v.object({
  type: v.literal("wizard_mortality_state_changed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousMortalityState: v.union(v.literal("not_deceased"), v.literal("deceased")),
    newMortalityState: v.union(v.literal("not_deceased"), v.literal("deceased")),
  }),
});

const denizenMortalityStateChangedEventV1Validator = v.object({
  type: v.literal("denizen_mortality_state_changed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previousMortalityState: v.union(v.literal("not_deceased"), v.literal("deceased")),
    newMortalityState: v.union(v.literal("not_deceased"), v.literal("deceased")),
  }),
});

const powerfulDenizenProfileCreatedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_profile_created"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    profile: powerfulDenizenProfileValidator,
  }),
});

const powerfulDenizenProfileRemovedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_profile_removed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    profile: powerfulDenizenProfileValidator,
  }),
});

const powerfulDenizenTaxonomiesChangedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_taxonomies_changed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previous: v.array(powerfulDenizenTaxonomyRefValidator),
    updated: v.array(powerfulDenizenTaxonomyRefValidator),
  }),
});

const powerfulDenizenStatusChangedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_status_changed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previous: powerfulDenizenStatusValidator,
    updated: powerfulDenizenStatusValidator,
  }),
});

const powerfulDenizenGoalChangedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_goal_changed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previousGoal: v.union(v.string(), v.null()),
    newGoal: v.union(v.string(), v.null()),
  }),
});

const powerfulDenizenMethodAddedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_method_added"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    method: powerfulDenizenMethodEntryValidator,
  }),
});

const powerfulDenizenMethodUpdatedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_method_updated"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previous: powerfulDenizenMethodEntryValidator,
    updated: powerfulDenizenMethodEntryValidator,
  }),
});

const powerfulDenizenMethodRemovedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_method_removed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    method: powerfulDenizenMethodEntryValidator,
  }),
});

const powerfulDenizenTruthAddedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_truth_added"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    truth: powerfulDenizenTruthEntryValidator,
  }),
});

const powerfulDenizenTruthUpdatedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_truth_updated"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    previous: powerfulDenizenTruthEntryValidator,
    updated: powerfulDenizenTruthEntryValidator,
  }),
});

const powerfulDenizenTruthRemovedEventV1Validator = v.object({
  type: v.literal("powerful_denizen_truth_removed"),
  version: v.literal(1),
  data: v.object({
    denizenId: v.string(),
    truth: powerfulDenizenTruthEntryValidator,
  }),
});

const campaignPowerfulDenizenTaxonomyCreatedEventV1Validator = v.object({
  type: v.literal("campaign_powerful_denizen_taxonomy_created"),
  version: v.literal(1),
  data: v.object({ taxonomy: campaignPowerfulDenizenTaxonomyValidator }),
});

const campaignPowerfulDenizenTaxonomyUpdatedEventV1Validator = v.object({
  type: v.literal("campaign_powerful_denizen_taxonomy_updated"),
  version: v.literal(1),
  data: v.object({
    previous: campaignPowerfulDenizenTaxonomyValidator,
    updated: campaignPowerfulDenizenTaxonomyValidator,
  }),
});

const campaignPowerfulDenizenTaxonomyRemovedEventV1Validator = v.object({
  type: v.literal("campaign_powerful_denizen_taxonomy_removed"),
  version: v.literal(1),
  data: v.object({ taxonomy: campaignPowerfulDenizenTaxonomyValidator }),
});

const treasureCreatedEventV1Validator = v.object({
  type: v.literal("treasure_created"),
  version: v.literal(1),
  data: v.object({ treasure: treasureValidator }),
});

const treasureDetailsUpdatedEventV1Validator = v.object({
  type: v.literal("treasure_details_updated"),
  version: v.literal(1),
  data: v.object({
    treasureId: v.string(),
    previous: treasureValidator,
    updated: treasureValidator,
  }),
});

const treasureStateUpdatedEventV1Validator = v.object({
  type: v.literal("treasure_state_updated"),
  version: v.literal(1),
  data: v.object({
    treasureId: v.string(),
    previous: treasureValidator,
    updated: treasureValidator,
  }),
});

const pactFragmentOperationalStateChangedEventV1Validator = v.object({
  type: v.literal("pact_fragment_operational_state_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previous: pactFragmentOperationalStateValidator,
    updated: pactFragmentOperationalStateValidator,
  }),
});

const faustianCommunityInvestigatedEventV1Validator = v.object({
  type: v.literal("faustian_community_investigated"),
  version: v.literal(1),
  data: v.object({
    communityId: v.string(),
    schemeCardId: v.string(),
    revealedSchemeCardIds: v.array(v.string()),
  }),
});

const faustianCommunityBlackmailedEventV1Validator = v.object({
  type: v.literal("faustian_community_blackmailed"),
  version: v.literal(1),
  data: v.object({
    communityId: v.string(),
    drawnCardId: v.string(),
  }),
});

const faustianAccompliceDirectedEventV1Validator = v.object({
  type: v.literal("faustian_accomplice_directed"),
  version: v.literal(1),
  data: v.object({
    accompliceCardId: v.string(),
    sourceCommunityId: v.string(),
    destinationCommunityId: v.string(),
    revealedSchemeCardIds: v.array(v.string()),
    returnedSchemeCardIds: v.array(v.string()),
  }),
});

const faustianPawnDisruptedEventV1Validator = v.object({
  type: v.literal("faustian_pawn_disrupted"),
  version: v.literal(1),
  data: v.object({
    communityId: v.string(),
    accompliceCardId: v.string(),
  }),
});

export const campaignEventValidator = v.union(
  historicalMonthChangedEventV1Validator,
  undoAppliedEventV1Validator,
  redoAppliedEventV1Validator,
  checkpointRestoredEventV1Validator,
  backupImportedEventV1Validator,
  playerAddedEventV1Validator,
  playerRenamedEventV1Validator,
  playerRemovedEventV1Validator,
  campaignAgeChangedEventV1Validator,
  facilitatorAssignmentChangedEventV1Validator,
  wizardCreatedEventV1Validator,
  wizardNameChangedEventV1Validator,
  wizardPortrayalChangedEventV1Validator,
  pactSeatWizardChangedEventV1Validator,
  pactSeatStatusChangedEventV1Validator,
  watcherAssignmentChangedEventV1Validator,
  setupMonthChangedEventV1Validator,
  setupOrreryPositionChangedEventV1Validator,
  beginPlayEventV1Validator,
  phaseAdvancedEventV1Validator,
  phaseAdvancedEventV2Validator,
  timeAllocationScheduledEventV1Validator,
  engagementTargetChangedEventV1Validator,
  engagementTargetChangedEventV2Validator,
  timeRescheduledEventV1Validator,
  timeSpentEventV1Validator,
  timeWastedEventV1Validator,
  orreryTimeSpentEventV1Validator,
  engagementTimeCommittedEventV1Validator,
  engagementResolvedEventV1Validator,
  engagementRescheduledEventV1Validator,
  engagementRescheduledEventV2Validator,
  wizardmootAttendanceAdjustedEventV1Validator,
  meetingCompletedEventV1Validator,
  monthBegunEventV1Validator,
  wizardCharacterUpdatedEventV1Validator,
  wizardCharacterUpdatedEventV2Validator,
  denizenCreatedEventV1Validator,
  denizenUpdatedEventV1Validator,
  isleCreatedEventV1Validator,
  isleUpdatedEventV1Validator,
  placeCreatedEventV1Validator,
  placeUpdatedEventV1Validator,
  wizardHomeIsleChangedEventV1Validator,
  wizardSanctumChangedEventV1Validator,
  wizardCompanionChangedEventV1Validator,
  companionDescriptionChangedEventV1Validator,
  hierophantInitializedEventV1Validator,
  templeResourcesAdjustedEventV1Validator,
  templeCreatedEventV1Validator,
  templeUpdatedEventV1Validator,
  templeHolidayChangedEventV1Validator,
  flameLawsChangedEventV1Validator,
  supplicantAddedEventV1Validator,
  supplicantUpdatedEventV1Validator,
  supplicantRemovedEventV1Validator,
  prophetAddedEventV1Validator,
  prophetUpdatedEventV1Validator,
  prophetRemovedEventV1Validator,
  cultEstablishedEventV1Validator,
  cultUpdatedEventV1Validator,
  cultRemovedEventV1Validator,
  cultDogmaAddedEventV1Validator,
  cultDogmaUpdatedEventV1Validator,
  cultDogmaRemovedEventV1Validator,
  campaignClassCreatedEventV1Validator,
  campaignClassUpdatedEventV1Validator,
  campaignDoctrineCreatedEventV1Validator,
  campaignDoctrineUpdatedEventV1Validator,
  marinerInitializedEventV1Validator,
  marinerShipChangedEventV1Validator,
  marinerSeaLawsChangedEventV1Validator,
  marinerRouteOccupancyChangedEventV1Validator,
  marinerSeaStormCountChangedEventV1Validator,
  marinerIsleMarketChangedEventV1Validator,
  marinerIsleRavageChangedEventV1Validator,
  marinerBeastAddedEventV1Validator,
  marinerBeastUpdatedEventV1Validator,
  marinerBeastRemovedEventV1Validator,
  necromancerInitializedEventV1Validator,
  necromancerDepthChangedEventV1Validator,
  necromancerLawsChangedEventV1Validator,
  necromancerGateStatusChangedEventV1Validator,
  necromancerSoulCountChangedEventV1Validator,
  necromancerSoulsMovedEventV1Validator,
  necromancerFoeAddedEventV1Validator,
  necromancerFoeUpdatedEventV1Validator,
  necromancerFoeRemovedEventV1Validator,
  necromancerWizardFoeEscapedEventV1Validator,
  necromancerWizardFoeTruthAddedEventV1Validator,
  necromancerWizardFoeTruthUpdatedEventV1Validator,
  necromancerWizardFoeTruthRemovedEventV1Validator,
  necromancerWizardTraversalAddedEventV1Validator,
  necromancerWizardTraversalUpdatedEventV1Validator,
  necromancerWizardTraversalRemovedEventV1Validator,
  necromancerAllyAddedEventV1Validator,
  necromancerAllyUpdatedEventV1Validator,
  necromancerAllyRemovedEventV1Validator,
  necromancerGhoulCallerAddedEventV1Validator,
  necromancerGhoulCallerUpdatedEventV1Validator,
  necromancerGhoulCallerRemovedEventV1Validator,
  necromancerCampaignGateCreatedEventV1Validator,
  necromancerCampaignGateUpdatedEventV1Validator,
  necromancerCampaignPathSpaceCreatedEventV1Validator,
  necromancerCampaignPathSpaceRemovedEventV1Validator,
  necromancerStepAddedEventV1Validator,
  necromancerStepRemovedEventV1Validator,
  wizardMortalityStateChangedEventV1Validator,
  denizenMortalityStateChangedEventV1Validator,
  powerfulDenizenProfileCreatedEventV1Validator,
  powerfulDenizenProfileRemovedEventV1Validator,
  powerfulDenizenTaxonomiesChangedEventV1Validator,
  powerfulDenizenStatusChangedEventV1Validator,
  powerfulDenizenGoalChangedEventV1Validator,
  powerfulDenizenMethodAddedEventV1Validator,
  powerfulDenizenMethodUpdatedEventV1Validator,
  powerfulDenizenMethodRemovedEventV1Validator,
  powerfulDenizenTruthAddedEventV1Validator,
  powerfulDenizenTruthUpdatedEventV1Validator,
  powerfulDenizenTruthRemovedEventV1Validator,
  campaignPowerfulDenizenTaxonomyCreatedEventV1Validator,
  campaignPowerfulDenizenTaxonomyUpdatedEventV1Validator,
  campaignPowerfulDenizenTaxonomyRemovedEventV1Validator,
  treasureCreatedEventV1Validator,
  treasureDetailsUpdatedEventV1Validator,
  treasureStateUpdatedEventV1Validator,
  pactFragmentOperationalStateChangedEventV1Validator,
  faustianCommunityInvestigatedEventV1Validator,
  faustianCommunityBlackmailedEventV1Validator,
  faustianAccompliceDirectedEventV1Validator,
  faustianPawnDisruptedEventV1Validator,
  sorcererInitializedEventV1Validator,
  loreEntryAddedEventV1Validator,
  loreEntryRevisedEventV1Validator,
);

export const anyCampaignStateValidator = campaignStateV5Validator;
export const currentCampaignStateValidator = campaignStateV5Validator;

export const newCampaignRecordValidator = v.object({
  campaignKey: v.literal("default"),
  campaignId: v.string(),
  campaignRevision: v.number(),
  state: currentCampaignStateValidator,
});

export const campaignRevisionRecordValidator = v.object({
  campaignId: v.string(),
  campaignRevision: v.number(),
  commandId: v.string(),
  commandType: persistedCommandTypeValidator,
  commandFingerprint: v.string(),
});

export const campaignEventRecordValidator = v.object({
  campaignId: v.string(),
  campaignRevision: v.number(),
  eventIndex: v.number(),
  event: campaignEventValidator,
});

export const campaignSnapshotRecordValidator = v.object({
  campaignId: v.string(),
  campaignRevision: v.number(),
  state: anyCampaignStateValidator,
});

export const campaignHistoryControlValidator = v.object({
  historyControlVersion: v.literal(CURRENT_HISTORY_CONTROL_VERSION),
  campaignId: v.string(),
  undoStack: v.array(v.number()),
  redoStack: v.array(v.number()),
});

export const campaignCheckpointValidator = v.object({
  checkpointVersion: v.literal(CURRENT_CHECKPOINT_VERSION),
  checkpointId: v.string(),
  campaignId: v.string(),
  label: v.string(),
  sourceRevision: v.number(),
  createdAtMs: v.number(),
});

export const activityEntryValidator = v.union(
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("undo_applied"),
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("redo_applied"),
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("checkpoint_restored"),
    checkpointId: v.string(),
    labelAtRestore: v.string(),
    sourceRevision: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("backup_imported"),
    sourceCampaignRevision: v.number(),
    sourceLogicalRevision: v.number(),
    exportedAtMs: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("campaign_configuration"),
    description: v.string(),
  }),
);

// ============================================================
// Campaign Deletion Operation
// ============================================================

const deletionPhaseValidator = v.union(
  v.literal("campaignEvents"),
  v.literal("campaignSnapshots"),
  v.literal("campaignRevisions"),
  v.literal("campaignCheckpoints"),
  v.literal("campaignHistoryControl"),
  v.literal("campaign"),
  v.literal("verify"),
);

export const campaignDeletionOperationValidator = v.object({
  campaignKey: v.string(),
  campaignId: v.string(),
  status: v.literal("deleting"),
  phase: deletionPhaseValidator,
  startedAt: v.number(),
  lastProgressAt: v.number(),
});
