import type { MonthDirection, MonthOrdinal } from "./calendar";
import {
  advanceOrdinal,
  displayNameFromOrdinal,
  INITIAL_MONTH_ORDINAL,
} from "./calendar";
import type { CampaignRevision } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import type { CampaignStateV1 } from "./campaign-state";
import type { MonthChangedEventV1 } from "./events";

export interface LegacyCampaignInput {
  readonly monthOrdinal: number;
  readonly revision: number;
}

export interface LegacyEventInput {
  readonly type: string;
  readonly revision: number;
  readonly direction: string;
  readonly previousMonthOrdinal: number;
  readonly newMonthOrdinal: number;
  readonly previousMonth: string;
  readonly newMonth: string;
}

export interface MigrationSnapshotPlan {
  readonly campaignRevision: number;
  readonly state: CampaignStateV1;
}

export interface MigrationRevisionPlan {
  readonly campaignRevision: number;
  readonly commandType: "move_month" | "legacy_month_change";
  readonly event: MonthChangedEventV1;
}

export interface MigrationNotNeeded {
  readonly status: "not_needed";
}

export interface MigrationReady {
  readonly status: "ready";
  readonly legacyCampaignRevision: number;
  readonly initialMonthOrdinal: number;
  readonly finalMonthOrdinal: number;
  readonly legacyEventCount: number;
  readonly revisionRecordCount: number;
  readonly newEventRecordCount: number;
  readonly snapshotCount: number;
  readonly snapshots: readonly MigrationSnapshotPlan[];
  readonly revisions: readonly MigrationRevisionPlan[];
  readonly migrationCommandType: "move_month" | "legacy_month_change";
  readonly idsDeferred: true;
}

export interface MigrationInvalid {
  readonly status: "invalid";
  readonly reason: string;
}

export type MigrationAnalysisResult =
  | MigrationNotNeeded
  | MigrationReady
  | MigrationInvalid;

function buildStateForOrdinal(monthOrdinal: number): CampaignStateV1 {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: {
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    },
    calendar: {
      monthOrdinal: monthOrdinal as MonthOrdinal,
    },
  };
}

export function analyzeLegacyMigration(
  campaigns: readonly LegacyCampaignInput[],
  events: readonly LegacyEventInput[],
): MigrationAnalysisResult {
  if (campaigns.length === 0 && events.length === 0) {
    return { status: "not_needed" };
  }

  if (campaigns.length === 0 && events.length > 0) {
    return { status: "invalid", reason: "Events exist but no campaign record found" };
  }

  if (campaigns.length > 1) {
    return { status: "invalid", reason: `Expected at most 1 campaign, found ${campaigns.length}` };
  }

  const campaign = campaigns[0];
  const revision = campaign.revision;

  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { status: "invalid", reason: `Campaign revision is not a valid non-negative integer: ${revision}` };
  }

  if (!Number.isSafeInteger(campaign.monthOrdinal)) {
    return { status: "invalid", reason: `Campaign monthOrdinal is not a safe integer: ${campaign.monthOrdinal}` };
  }

  if (revision === 0) {
    if (events.length > 0) {
      return { status: "invalid", reason: `Campaign is at revision 0 but ${events.length} events exist` };
    }

    if (campaign.monthOrdinal !== INITIAL_MONTH_ORDINAL) {
      return { status: "invalid", reason: `Campaign at revision 0 has monthOrdinal ${campaign.monthOrdinal}, expected ${INITIAL_MONTH_ORDINAL}` };
    }

    const snapshot: MigrationSnapshotPlan = {
      campaignRevision: 0,
      state: buildStateForOrdinal(INITIAL_MONTH_ORDINAL),
    };

    return {
      status: "ready",
      legacyCampaignRevision: 0,
      initialMonthOrdinal: INITIAL_MONTH_ORDINAL,
      finalMonthOrdinal: INITIAL_MONTH_ORDINAL,
      legacyEventCount: 0,
      revisionRecordCount: 0,
      newEventRecordCount: 0,
      snapshotCount: 1,
      snapshots: [snapshot],
      revisions: [],
      migrationCommandType: "legacy_month_change",
      idsDeferred: true,
    };
  }

  if (events.length !== revision) {
    return {
      status: "invalid",
      reason: `Campaign revision is ${revision} but found ${events.length} events (expected exactly ${revision})`,
    };
  }

  const sortedEvents = [...events].sort((a, b) => a.revision - b.revision);

  const seenRevisions = new Set<number>();
  for (const evt of sortedEvents) {
    if (!Number.isSafeInteger(evt.revision)) {
      return { status: "invalid", reason: `Event has non-safe-integer revision: ${evt.revision}` };
    }
    if (seenRevisions.has(evt.revision)) {
      return { status: "invalid", reason: `Duplicate event revision: ${evt.revision}` };
    }
    seenRevisions.add(evt.revision);
  }

  for (let i = 0; i < sortedEvents.length; i++) {
    const expected = i + 1;
    if (sortedEvents[i].revision !== expected) {
      return {
        status: "invalid",
        reason: `Expected contiguous revision ${expected}, found ${sortedEvents[i].revision}`,
      };
    }
  }

  const snapshots: MigrationSnapshotPlan[] = [];
  const revisions: MigrationRevisionPlan[] = [];

  let currentOrdinal: number = INITIAL_MONTH_ORDINAL;

  snapshots.push({
    campaignRevision: 0,
    state: buildStateForOrdinal(currentOrdinal),
  });

  for (const evt of sortedEvents) {
    if (evt.type !== "month_changed") {
      return { status: "invalid", reason: `Event at revision ${evt.revision} has unexpected type "${evt.type}"` };
    }

    if (!Number.isSafeInteger(evt.previousMonthOrdinal)) {
      return { status: "invalid", reason: `Event revision ${evt.revision}: previousMonthOrdinal is not a safe integer` };
    }
    if (!Number.isSafeInteger(evt.newMonthOrdinal)) {
      return { status: "invalid", reason: `Event revision ${evt.revision}: newMonthOrdinal is not a safe integer` };
    }

    if (evt.previousMonthOrdinal !== currentOrdinal) {
      return {
        status: "invalid",
        reason: `Event revision ${evt.revision}: previousMonthOrdinal is ${evt.previousMonthOrdinal}, expected ${currentOrdinal}`,
      };
    }

    if (evt.direction !== "forward" && evt.direction !== "backward") {
      return {
        status: "invalid",
        reason: `Event revision ${evt.revision}: direction "${evt.direction}" is not "forward" or "backward"`,
      };
    }

    const direction: MonthDirection = evt.direction;
    const expectedNew = advanceOrdinal(currentOrdinal, direction) as number;

    if (evt.newMonthOrdinal !== expectedNew) {
      return {
        status: "invalid",
        reason: `Event revision ${evt.revision}: newMonthOrdinal is ${evt.newMonthOrdinal}, expected ${expectedNew} for direction "${direction}"`,
      };
    }

    const expectedPrevDisplayName = displayNameFromOrdinal(evt.previousMonthOrdinal);
    if (evt.previousMonth !== expectedPrevDisplayName) {
      return {
        status: "invalid",
        reason: `Event revision ${evt.revision}: previousMonth is "${evt.previousMonth}", expected "${expectedPrevDisplayName}"`,
      };
    }

    const expectedNewDisplayName = displayNameFromOrdinal(evt.newMonthOrdinal);
    if (evt.newMonth !== expectedNewDisplayName) {
      return {
        status: "invalid",
        reason: `Event revision ${evt.revision}: newMonth is "${evt.newMonth}", expected "${expectedNewDisplayName}"`,
      };
    }

    currentOrdinal = evt.newMonthOrdinal;

    const normalizedEvent: MonthChangedEventV1 = {
      type: "month_changed",
      version: 1,
      data: {
        direction,
        fromOrdinal: evt.previousMonthOrdinal as MonthOrdinal,
        toOrdinal: evt.newMonthOrdinal as MonthOrdinal,
      },
    };

    revisions.push({
      campaignRevision: evt.revision,
      commandType: "legacy_month_change",
      event: normalizedEvent,
    });

    snapshots.push({
      campaignRevision: evt.revision,
      state: buildStateForOrdinal(currentOrdinal),
    });
  }

  if (campaign.revision !== revision) {
    return {
      status: "invalid",
      reason: `Campaign revision ${campaign.revision} does not match event count ${revision}`,
    };
  }

  if (campaign.monthOrdinal !== currentOrdinal) {
    return {
      status: "invalid",
      reason: `Campaign monthOrdinal is ${campaign.monthOrdinal}, but chain produces ${currentOrdinal}`,
    };
  }

  return {
    status: "ready",
    legacyCampaignRevision: revision,
    initialMonthOrdinal: INITIAL_MONTH_ORDINAL,
    finalMonthOrdinal: currentOrdinal,
    legacyEventCount: events.length,
    revisionRecordCount: revision,
    newEventRecordCount: revision,
    snapshotCount: revision + 1,
    snapshots,
    revisions,
    migrationCommandType: "legacy_month_change",
    idsDeferred: true,
  };
}
