import type {
  CampaignEvent,
  InfrastructureEvent,
  MonthChangedEventV1,
} from "./events";
import { displayNameFromOrdinal } from "./calendar";

export type ActivityEntry =
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "undo_applied";
      readonly fromRevision: number;
      readonly targetRevision: number;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "redo_applied";
      readonly fromRevision: number;
      readonly targetRevision: number;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "checkpoint_restored";
      readonly checkpointId: string;
      readonly labelAtRestore: string;
      readonly sourceRevision: number;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "backup_imported";
      readonly sourceCampaignRevision: number;
      readonly sourceLogicalRevision: number;
      readonly exportedAtMs: number;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "campaign_configuration";
      readonly description: string;
    };

function describeConfigEvent(event: CampaignEvent): string {
  switch (event.type) {
    case "player_added":
      return `Added player "${event.data.name}"`;
    case "player_renamed":
      return `Renamed player "${event.data.previousName}" to "${event.data.newName}"`;
    case "player_removed":
      return `Removed player "${event.data.name}"`;
    case "campaign_age_changed":
      return event.data.newAgeId
        ? `Set campaign age to ${event.data.newAgeId}`
        : "Cleared campaign age";
    case "facilitator_assignment_changed":
      return event.data.newPlayerId
        ? "Assigned facilitator"
        : "Cleared facilitator";
    case "wizard_created":
      return `Created wizard "${event.data.name}" for ${event.data.assignedToSeatId} seat`;
    case "wizard_name_changed":
      return `Renamed wizard "${event.data.previousName}" to "${event.data.newName}"`;
    case "wizard_portrayal_changed":
      return event.data.newPlayerId
        ? "Changed wizard portrayal"
        : "Cleared wizard portrayal";
    case "pact_seat_wizard_changed":
      return event.data.newWizardId
        ? `Assigned wizard to ${event.data.seatId} seat`
        : `Unassigned wizard from ${event.data.seatId} seat`;
    case "pact_seat_status_changed":
      return event.data.newStatus
        ? `Set ${event.data.seatId} seat status to ${event.data.newStatus}`
        : `Cleared ${event.data.seatId} seat status`;
    case "watcher_assignment_changed":
      return event.data.newPlayerId
        ? `Assigned watcher to ${event.data.seatId} seat`
        : `Cleared watcher from ${event.data.seatId} seat`;
    case "setup_month_changed":
      return event.data.newMonthOrdinal !== null
        ? `Set starting month to ordinal ${event.data.newMonthOrdinal}`
        : "Cleared starting month";
    case "setup_orrery_position_changed":
      return event.data.newPosition !== null
        ? `Set ${event.data.planetId} Orrery position to ${event.data.newPosition}`
        : `Cleared ${event.data.planetId} Orrery position`;
    case "begin_play":
      return "Began Play";
    case "time_rescheduled":
      return "Rescheduled Time allocation";
    case "time_spent":
      return "Spent Time allocation";
    case "time_wasted":
      return "Wasted Time allocation";
    case "orrery_time_spent":
      return "Spent Orrery Time";
    case "engagement_time_committed":
      return "Committed Time to Engagement";
    case "engagement_resolved":
      return "Resolved Engagement";
    case "engagement_rescheduled":
      return "Rescheduled Engagement target";
    case "wizardmoot_attendance_adjusted":
      return "Adjusted Wizardmoot attendance";
    case "meeting_completed":
      return "Completed Meeting";
    case "month_begun":
      return "Began Next Month";
    case "wizard_character_updated":
      return "Updated wizard character";
    case "denizen_created":
      return `Created denizen "${event.data.denizen.name}"`;
    case "denizen_updated":
      return `Updated denizen "${event.data.updated.name}"`;
    case "isle_created":
      return `Created isle "${event.data.isle.name}"`;
    case "isle_updated":
      return `Updated isle "${event.data.updated.name}"`;
    case "place_created":
      return `Created place "${event.data.place.name}"`;
    case "place_updated":
      return `Updated place "${event.data.updated.name}"`;
    case "wizard_home_isle_changed":
      return `Changed wizard home Isle`;
    case "wizard_sanctum_changed":
      return `Changed wizard Sanctum`;
    case "wizard_companion_changed":
      return "Changed wizard Companion";
    case "companion_description_changed":
      return "Updated Companion description";
    case "wizard_mortality_state_changed":
      return event.data.newMortalityState === "deceased" ? "Marked wizard deceased" : "Marked wizard not deceased";
    case "denizen_mortality_state_changed":
      return event.data.newMortalityState === "deceased" ? "Marked denizen deceased" : "Marked denizen not deceased";
    case "powerful_denizen_profile_created":
      return "Created Powerful Denizen profile";
    case "powerful_denizen_profile_removed":
      return "Removed Powerful Denizen profile";
    case "powerful_denizen_taxonomies_changed":
      return "Changed Powerful Denizen taxonomies";
    case "powerful_denizen_status_changed":
      return "Changed Powerful Denizen status";
    case "powerful_denizen_goal_changed":
      return "Changed Powerful Denizen goal";
    case "powerful_denizen_method_added":
      return "Added Powerful Denizen method";
    case "powerful_denizen_method_updated":
      return "Updated Powerful Denizen method";
    case "powerful_denizen_method_removed":
      return "Removed Powerful Denizen method";
    case "powerful_denizen_truth_added":
      return "Added Powerful Denizen Truth";
    case "powerful_denizen_truth_updated":
      return "Updated Powerful Denizen Truth";
    case "powerful_denizen_truth_removed":
      return "Removed Powerful Denizen Truth";
    case "campaign_powerful_denizen_taxonomy_created":
      return `Created campaign taxonomy "${event.data.taxonomy.name}"`;
    case "campaign_powerful_denizen_taxonomy_updated":
      return `Updated campaign taxonomy "${event.data.updated.name}"`;
    case "campaign_powerful_denizen_taxonomy_removed":
      return `Removed campaign taxonomy "${event.data.taxonomy.name}"`;
    case "treasure_created":
      return `Created treasure "${event.data.treasure.name}"`;
    case "treasure_details_updated":
      return `Updated treasure "${event.data.updated.name}"`;
    case "treasure_state_updated":
      return `Updated treasure state "${event.data.updated.name}"`;
    case "pact_fragment_operational_state_changed":
      return `Updated ${event.data.seatId} Pact-Fragment operational state`;
    case "hierophant_initialized":
      return "Initialized Hierophant Temples";
    case "temple_resources_adjusted":
      return "Adjusted Temple resources";
    case "temple_created":
      return "Created Temple";
    case "temple_updated":
      return "Updated Temple";
    case "temple_holiday_changed":
      return "Changed Temple Holiday marker";
    case "flame_laws_changed":
      return "Changed selected Laws of the Flame";
    case "hierophant_supplicant_created":
      return `Received Supplicant "${event.data.denizenName}"`;
    case "supplicant_added":
      return "Added Supplicant";
    case "supplicant_updated":
      return "Updated Supplicant";
    case "supplicant_removed":
      return "Removed Supplicant";
    case "prophet_added":
      return "Added Prophet";
    case "prophet_updated":
      return "Updated Prophet";
    case "prophet_removed":
      return "Removed Prophet";
    case "cult_established":
      return "Established Cult";
    case "cult_updated":
      return "Updated Cult";
    case "cult_removed":
      return "Removed Cult";
    case "cult_dogma_added":
      return "Added Cult Dogma";
    case "cult_dogma_updated":
      return "Updated Cult Dogma";
    case "cult_dogma_removed":
      return "Removed Cult Dogma";
    case "campaign_class_created":
      return "Created campaign Class";
    case "campaign_class_updated":
      return "Updated campaign Class";
    case "campaign_doctrine_created":
      return "Created campaign Doctrine";
    case "campaign_doctrine_updated":
      return "Updated campaign Doctrine";
    case "mariner_initialized":
      return "Initialized Mariner";
    case "mariner_ship_changed":
      return "Changed Mariner ship Place";
    case "mariner_sea_laws_changed":
      return "Changed selected Laws of the Sea";
    case "mariner_route_occupancy_changed":
      return "Changed Mariner Route occupancy";
    case "mariner_sea_storm_count_changed":
      return "Changed Mariner sea Storm count";
    case "mariner_isle_market_changed":
      return "Changed Mariner Isle Market";
    case "mariner_isle_ravage_changed":
      return "Changed Mariner Isle Ravage";
    case "mariner_beast_added":
      return "Added Mariner Beast";
    case "mariner_beast_updated":
      return "Updated Mariner Beast";
    case "mariner_beast_removed":
      return "Removed Mariner Beast";
    case "necromancer_initialized":
      return "Initialized Necromancer";
    case "necromancer_depth_changed":
      return "Changed Necromancer Depth";
    case "necromancer_laws_changed":
      return "Changed selected Laws of Death";
    case "necromancer_gate_status_changed":
      return "Changed Necromancer Gate status";
    case "necromancer_soul_count_changed":
      return "Changed Necromancer Soul count";
    case "necromancer_souls_moved":
      return "Moved Necromancer Souls";
    case "necromancer_foe_added":
      return "Added Necromancer Foe";
    case "necromancer_foe_updated":
      return "Updated Necromancer Foe";
    case "necromancer_foe_removed":
      return "Removed Necromancer Foe";
    case "necromancer_wizard_foe_escaped":
      return "Escaped Necromancer Wizard Foe";
    case "necromancer_wizard_foe_truth_added":
      return "Added Necromancer Wizard Foe Truth";
    case "necromancer_wizard_foe_truth_updated":
      return "Updated Necromancer Wizard Foe Truth";
    case "necromancer_wizard_foe_truth_removed":
      return "Removed Necromancer Wizard Foe Truth";
    case "necromancer_wizard_traversal_added":
      return "Added Necromancer Wizard traversal";
    case "necromancer_wizard_traversal_updated":
      return "Updated Necromancer Wizard traversal";
    case "necromancer_wizard_traversal_removed":
      return "Removed Necromancer Wizard traversal";
    case "necromancer_soul_transformed_into_ally":
      return `Transformed Soul into Ally "${event.data.denizenName}"`;
    case "necromancer_ally_added":
      return "Added Necromancer Ally";
    case "necromancer_ally_updated":
      return "Updated Necromancer Ally";
    case "necromancer_ally_removed":
      return "Removed Necromancer Ally";
    case "necromancer_ghoul_caller_added":
      return "Added Necromancer Ghoul-Caller";
    case "necromancer_ghoul_caller_updated":
      return "Updated Necromancer Ghoul-Caller";
    case "necromancer_ghoul_caller_removed":
      return "Removed Necromancer Ghoul-Caller";
    case "necromancer_campaign_gate_created":
      return "Created Necromancer campaign Gate";
    case "necromancer_campaign_gate_updated":
      return "Updated Necromancer campaign Gate";
    case "necromancer_campaign_path_space_created":
      return "Created Necromancer campaign path space";
    case "necromancer_campaign_path_space_removed":
      return "Removed Necromancer campaign path space";
    case "necromancer_step_added":
      return "Added Necromancer step";
    case "necromancer_step_removed":
      return "Removed Necromancer step";
    case "faustian_community_investigated":
      return "Investigated Faustian Community";
    case "faustian_community_blackmailed":
      return "Blackmailed Faustian Community";
    case "faustian_accomplice_directed":
      return "Directed Faustian Accomplice";
    case "faustian_pawn_disrupted":
      return "Disrupted Faustian Pawn";
    case "sorcerer_initialized":
      return "Initialized Sorcerer";
    case "sorcerer_personnel_recruited":
      return `Recruited ${event.data.destination.kind} "${event.data.denizenName}"`;
    case "sorcerer_researcher_refocused":
      return event.data.destination.kind === "research_position"
        ? `Refocused Researcher from ${event.data.previousPositionId} to ${event.data.destination.positionId}`
        : `Refocused Researcher ${event.data.previousPositionId} into ${event.data.destination.kind}`;
    case "sorcerer_student_tutored":
      return event.data.destination.kind === "researcher"
        ? `Tutored Student into Researcher at ${event.data.destination.positionId}`
        : `Tutored Student into ${event.data.destination.kind}`;
    case "sorcerer_tower_rearranged":
      return "Rearranged Sorcerer Tower";
    case "sorcerer_researcher_operational_this_month_changed":
      return event.data.operationalThisMonth
        ? "Set Researcher Working this month"
        : "Set Researcher Unavailable this month";
    case "sorcerer_knowledge_adjusted":
      return `Adjusted Sorcerer Knowledge ${event.data.pool} from ${event.data.previousAmount} to ${event.data.amount}`;
    case "sorcerer_archives_open_changed":
      return event.data.archivesOpen ? "Opened Sorcerer Archives" : "Closed Sorcerer Archives";
    case "sorcerer_tower_magic_consumable_moved":
      return event.data.direction === "tower_to_wizard"
        ? "Moved Tower Tome/Reagent to Wizard"
        : "Moved Wizard Tome/Reagent to Tower";
    case "sorcerer_researcher_production_multipliers_set":
      return `Corrected Researcher production multipliers to ×${event.data.current} / next ×${event.data.nextMonth}`;
    case "sorcerer_laws_set":
      return "Corrected Laws of Magic";
    case "sorcerer_campaign_definition_created":
      return `Recorded campaign ${event.data.definition.kind.replace("_", " ")}`;
    case "sorcerer_campaign_definition_updated":
      return `Revised campaign ${event.data.definition.kind.replace("_", " ")}`;
    case "sorcerer_arcanist_added":
      return `Recorded Arcanist "${event.data.denizenName}"`;
    case "sorcerer_arcanist_updated":
      return "Corrected Arcanist placement or profile";
    case "sorcerer_construct_added":
      return `Recorded Construct "${event.data.denizenName}"`;
    case "sorcerer_construct_instructions_set":
      return "Corrected Construct If/Then instructions";
    case "sorcerer_innovation_added":
      return "Recorded Innovation";
    case "sorcerer_innovation_revised":
      return "Revised Innovation";
    case "sorcerer_innovation_removed":
      return "Removed Innovation";
    case "lore_entry_added":
      return "Added Lore entry";
    case "lore_entry_revised":
      return "Revised Lore entry";
    default:
      return "Campaign configuration changed";
  }
}

function mapInfrastructureEvent(
  id: string,
  revision: number,
  event: InfrastructureEvent,
): ActivityEntry {
  switch (event.type) {
    case "undo_applied": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported undo_applied event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "undo_applied",
        fromRevision: event.data.fromRevision,
        targetRevision: event.data.targetRevision,
      };
    }
    case "redo_applied": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported redo_applied event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "redo_applied",
        fromRevision: event.data.fromRevision,
        targetRevision: event.data.targetRevision,
      };
    }
    case "checkpoint_restored": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported checkpoint_restored event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "checkpoint_restored",
        checkpointId: event.data.checkpointId,
        labelAtRestore: event.data.labelAtRestore,
        sourceRevision: event.data.sourceRevision,
      };
    }
    case "backup_imported": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported backup_imported event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "backup_imported",
        sourceCampaignRevision: event.data.sourceCampaignRevision,
        sourceLogicalRevision: event.data.sourceLogicalRevision,
        exportedAtMs: event.data.exportedAtMs,
      };
    }
  }
}

export function mapEventToActivityEntry(
  id: string,
  revision: number,
  event: CampaignEvent | MonthChangedEventV1,
): ActivityEntry {
  switch (event.type) {
    case "month_changed":
      return {
        id,
        revision,
        type: "campaign_configuration",
        description: `${displayNameFromOrdinal(event.data.fromOrdinal)} → ${displayNameFromOrdinal(event.data.toOrdinal)}`,
      };
    case "undo_applied":
    case "redo_applied":
    case "checkpoint_restored":
    case "backup_imported":
      return mapInfrastructureEvent(id, revision, event as InfrastructureEvent);
    case "player_added":
    case "player_renamed":
    case "player_removed":
    case "campaign_age_changed":
    case "facilitator_assignment_changed":
    case "wizard_created":
    case "wizard_name_changed":
    case "wizard_portrayal_changed":
    case "pact_seat_wizard_changed":
    case "pact_seat_status_changed":
    case "watcher_assignment_changed":
    case "setup_month_changed":
    case "setup_orrery_position_changed":
    case "begin_play":
    case "phase_advanced":
    case "time_allocation_scheduled":
    case "engagement_target_changed":
    case "time_rescheduled":
    case "time_spent":
    case "time_wasted":
    case "orrery_time_spent":
    case "engagement_time_committed":
    case "engagement_resolved":
    case "engagement_rescheduled":
    case "wizardmoot_attendance_adjusted":
    case "meeting_completed":
    case "month_begun":
    case "wizard_character_updated":
    case "denizen_created":
    case "denizen_updated":
    case "isle_created":
    case "isle_updated":
    case "place_created":
    case "place_updated":
    case "wizard_home_isle_changed":
    case "wizard_sanctum_changed":
    case "wizard_companion_changed":
    case "companion_description_changed":
    case "wizard_mortality_state_changed":
    case "denizen_mortality_state_changed":
    case "powerful_denizen_profile_created":
    case "powerful_denizen_profile_removed":
    case "powerful_denizen_taxonomies_changed":
    case "powerful_denizen_status_changed":
    case "powerful_denizen_goal_changed":
    case "powerful_denizen_method_added":
    case "powerful_denizen_method_updated":
    case "powerful_denizen_method_removed":
    case "powerful_denizen_truth_added":
    case "powerful_denizen_truth_updated":
    case "powerful_denizen_truth_removed":
    case "campaign_powerful_denizen_taxonomy_created":
    case "campaign_powerful_denizen_taxonomy_updated":
    case "campaign_powerful_denizen_taxonomy_removed":
    case "treasure_created":
    case "treasure_details_updated":
    case "treasure_state_updated":
    case "pact_fragment_operational_state_changed":
    case "hierophant_initialized":
    case "temple_resources_adjusted":
    case "temple_created":
    case "temple_updated":
    case "temple_holiday_changed":
    case "flame_laws_changed":
    case "hierophant_supplicant_created":
    case "supplicant_added":
    case "supplicant_updated":
    case "supplicant_removed":
    case "prophet_added":
    case "prophet_updated":
    case "prophet_removed":
    case "cult_established":
    case "cult_updated":
    case "cult_removed":
    case "cult_dogma_added":
    case "cult_dogma_updated":
    case "cult_dogma_removed":
    case "campaign_class_created":
    case "campaign_class_updated":
    case "campaign_doctrine_created":
    case "campaign_doctrine_updated":
    case "mariner_initialized":
    case "mariner_ship_changed":
    case "mariner_sea_laws_changed":
    case "mariner_route_occupancy_changed":
    case "mariner_sea_storm_count_changed":
    case "mariner_isle_market_changed":
    case "mariner_isle_ravage_changed":
    case "mariner_beast_added":
    case "mariner_beast_updated":
    case "mariner_beast_removed":
    case "necromancer_initialized":
    case "necromancer_depth_changed":
    case "necromancer_laws_changed":
    case "necromancer_gate_status_changed":
    case "necromancer_soul_count_changed":
    case "necromancer_souls_moved":
    case "necromancer_foe_added":
    case "necromancer_foe_updated":
    case "necromancer_foe_removed":
    case "necromancer_wizard_foe_escaped":
    case "necromancer_wizard_foe_truth_added":
    case "necromancer_wizard_foe_truth_updated":
    case "necromancer_wizard_foe_truth_removed":
    case "necromancer_wizard_traversal_added":
    case "necromancer_wizard_traversal_updated":
    case "necromancer_wizard_traversal_removed":
    case "necromancer_soul_transformed_into_ally":
    case "necromancer_ally_added":
    case "necromancer_ally_updated":
    case "necromancer_ally_removed":
    case "necromancer_ghoul_caller_added":
    case "necromancer_ghoul_caller_updated":
    case "necromancer_ghoul_caller_removed":
    case "necromancer_campaign_gate_created":
    case "necromancer_campaign_gate_updated":
    case "necromancer_campaign_path_space_created":
    case "necromancer_campaign_path_space_removed":
    case "necromancer_step_added":
    case "necromancer_step_removed":
    case "faustian_community_investigated":
    case "faustian_community_blackmailed":
    case "faustian_accomplice_directed":
    case "faustian_pawn_disrupted":
    case "sorcerer_initialized":
    case "sorcerer_personnel_recruited":
    case "sorcerer_researcher_refocused":
    case "sorcerer_student_tutored":
    case "sorcerer_tower_rearranged":
    case "sorcerer_researcher_operational_this_month_changed":
    case "sorcerer_knowledge_adjusted":
    case "sorcerer_archives_open_changed":
    case "sorcerer_tower_magic_consumable_moved":
    case "sorcerer_researcher_production_multipliers_set":
    case "sorcerer_laws_set":
    case "sorcerer_campaign_definition_created":
    case "sorcerer_campaign_definition_updated":
    case "sorcerer_arcanist_added":
    case "sorcerer_arcanist_updated":
    case "sorcerer_construct_added":
    case "sorcerer_construct_instructions_set":
    case "sorcerer_innovation_added":
    case "sorcerer_innovation_revised":
    case "sorcerer_innovation_removed":
    case "lore_entry_added":
    case "lore_entry_revised": {
      return {
        id,
        revision,
        type: "campaign_configuration",
        description: describeConfigEvent(event),
      };
    }
  }
}

export function describeActivityEntry(entry: ActivityEntry): string {
  switch (entry.type) {
    case "undo_applied":
      return `Revision ${entry.revision} — Undo: revision ${entry.fromRevision} → ${entry.targetRevision}`;
    case "redo_applied":
      return `Revision ${entry.revision} — Redo: revision ${entry.fromRevision} → ${entry.targetRevision}`;
    case "checkpoint_restored":
      return `Revision ${entry.revision} — Restored "${entry.labelAtRestore}" from revision ${entry.sourceRevision}`;
    case "backup_imported":
      return `Revision ${entry.revision} — Imported backup from logical revision ${entry.sourceLogicalRevision}`;
    case "campaign_configuration":
      return `Revision ${entry.revision} — ${entry.description}`;
  }
}
