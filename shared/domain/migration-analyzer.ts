import type { MonthOrdinal, MonthDirection, MonthDisplayName } from "./calendar";
import {
  INITIAL_MONTH_ORDINAL,
  advanceOrdinal,
  displayNameFromOrdinal,
} from "./calendar";
import type { CampaignStateV1 } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import type { MonthChangedEventV1 } from "./events";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";

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
  readonly previousMonth: MonthDisplayName;
  readonly newMonth: MonthDisplayName;
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

function makeState(monthOrdinal: MonthOrdinal): CampaignStateV1 {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: {
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    },
    calendar: {
      monthOrdinal,
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
    return {
      status: "invalid",
      reason: `Found ${events.length} legacy event(s) but no campaign document`,
    };
  }

  if (campaigns.length > 1) {
    return {
      status: "invalid",
      reason: `Expected 0 or 1 legacy campaigns, found ${campaigns.length}`,
    };
  }

  const campaign = campaigns[0];

  if (
    !Number.isSafeInteger(campaign.revision) ||
    campaign.revision < 0
  ) {
    return {
      status: "invalid",
      reason: `Campaign revision is not a non-negative safe integer: ${campaign.revision}`,
    };
  }

  if (!Number.isSafeInteger(campaign.monthOrdinal)) {
    return {
      status: "invalid",
      reason: `Campaign monthOrdinal ${campaign.monthOrdinal} is not a safe integer`,
    };
  }

  if (campaign.revision === 0 && events.length === 0) {
    if (campaign.monthOrdinal as number !== INITIAL_MONTH_ORDINAL as number) {
      return {
        status: "invalid",
        reason: `Campaign at revision 0 has monthOrdinal ${campaign.monthOrdinal} but expected initial ${INITIAL_MONTH_ORDINAL}`,
      };
    }
    return {
      status: "ready",
      legacyCampaignRevision: 0,
      initialMonthOrdinal: INITIAL_MONTH_ORDINAL as number,
      finalMonthOrdinal: INITIAL_MONTH_ORDINAL as number,
      legacyEventCount: 0,
      revisionRecordCount: 0,
      newEventRecordCount: 0,
      snapshotCount: 1,
      snapshots: [{ campaignRevision: 0, state: makeState(INITIAL_MONTH_ORDINAL) }],
      revisions: [],
      migrationCommandType: "legacy_month_change",
      idsDeferred: true,
    };
  }

  if (events.length !== campaign.revision) {
    return {
      status: "invalid",
      reason: `Event count ${events.length} does not match campaign revision ${campaign.revision}`,
    };
  }

  const sorted = [...events].sort((a, b) => a.revision - b.revision);

  const seenRevisions = new Set<number>();
  for (const evt of sorted) {
    if (seenRevisions.has(evt.revision)) {
      return {
        status: "invalid",
        reason: `Duplicate revision ${evt.revision}`,
      };
    }
    seenRevisions.add(evt.revision);
  }

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].revision !== i + 1) {
      return {
        status: "invalid",
        reason: `Events are not contiguous: expected revision ${i + 1} at position ${i}, got ${sorted[i].revision}`,
      };
    }
  }

  const snapshots: MigrationSnapshotPlan[] = [];
  const revisions: MigrationRevisionPlan[] = [];

  let currentOrdinal: MonthOrdinal = INITIAL_MONTH_ORDINAL;
  snapshots.push({
    campaignRevision: 0,
    state: makeState(currentOrdinal),
  });

  for (let i = 0; i < sorted.length; i++) {
    const evt = sorted[i];
    const expectedRevision = i + 1;

    if (evt.type !== "month_changed") {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} has unexpected type "${evt.type}"`,
      };
    }

    if (!Number.isSafeInteger(evt.previousMonthOrdinal)) {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} has invalid previousMonthOrdinal ${evt.previousMonthOrdinal}`,
      };
    }

    if (!Number.isSafeInteger(evt.newMonthOrdinal)) {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} has invalid newMonthOrdinal ${evt.newMonthOrdinal}`,
      };
    }

    if (evt.previousMonthOrdinal as number !== currentOrdinal as number) {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} previousMonthOrdinal ${evt.previousMonthOrdinal} does not match expected current ordinal ${currentOrdinal}`,
      };
    }

    if (evt.direction !== "forward" && evt.direction !== "backward") {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} has invalid direction "${evt.direction}"`,
      };
    }

    const direction = evt.direction as MonthDirection;
    const fromOrdinal = evt.previousMonthOrdinal as MonthOrdinal;
    const expectedNewOrdinal = advanceOrdinal(fromOrdinal, direction);

    if (evt.newMonthOrdinal as number !== expectedNewOrdinal as number) {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} newMonthOrdinal ${evt.newMonthOrdinal} is inconsistent with direction "${direction}" from ${evt.previousMonthOrdinal}`,
      };
    }

    const expectedPreviousMonth = displayNameFromOrdinal(evt.previousMonthOrdinal);
    if (evt.previousMonth !== expectedPreviousMonth) {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} previousMonth "${evt.previousMonth}" does not match expected "${expectedPreviousMonth}" for ordinal ${evt.previousMonthOrdinal}`,
      };
    }

    const expectedNewMonth = displayNameFromOrdinal(evt.newMonthOrdinal);
    if (evt.newMonth !== expectedNewMonth) {
      return {
        status: "invalid",
        reason: `Event at revision ${expectedRevision} newMonth "${evt.newMonth}" does not match expected "${expectedNewMonth}" for ordinal ${evt.newMonthOrdinal}`,
      };
    }

    const toOrdinal = evt.newMonthOrdinal as MonthOrdinal;

    const newEvent: MonthChangedEventV1 = {
      type: "month_changed",
      version: 1,
      data: {
        direction,
        fromOrdinal,
        toOrdinal,
      },
    };

    revisions.push({
      campaignRevision: expectedRevision,
      commandType: "legacy_month_change",
      event: newEvent,
    });

    currentOrdinal = toOrdinal;

    snapshots.push({
      campaignRevision: expectedRevision,
      state: makeState(currentOrdinal),
    });
  }

  if (currentOrdinal as number !== campaign.monthOrdinal) {
    return {
      status: "invalid",
      reason: `Replayed events end at ordinal ${currentOrdinal}, but campaign document has monthOrdinal ${campaign.monthOrdinal}`,
    };
  }

  return {
    status: "ready",
    legacyCampaignRevision: campaign.revision,
    initialMonthOrdinal: INITIAL_MONTH_ORDINAL as number,
    finalMonthOrdinal: currentOrdinal as number,
    legacyEventCount: events.length,
    revisionRecordCount: revisions.length,
    newEventRecordCount: revisions.length,
    snapshotCount: snapshots.length,
    snapshots,
    revisions,
    migrationCommandType: "legacy_month_change",
    idsDeferred: true,
  };
}
