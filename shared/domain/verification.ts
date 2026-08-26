import type { MonthDirection } from "./calendar";
import { advanceOrdinal } from "./calendar";
import type { CurrentCampaignState } from "./campaign-state";
import type { CampaignCommandType } from "./commands";
import { moveMonthFingerprint } from "./command-ids";
import type { PersistableCampaignState } from "./state-equality";

/**
 * SerializableCampaignState is the persistence-level representation of campaign
 * state as stored in Convex documents and used by verification interfaces.
 *
 * It is defined as PersistableCampaignState — structurally identical to
 * AnyCampaignState but without branded types (which don't survive persistence).
 * Adding a required field to a supported CampaignState schema requires updating
 * PersistableCampaignState, which propagates here automatically.
 */
export type SerializableCampaignState = PersistableCampaignState;

export interface RevisionRecord {
  readonly campaignRevision: number;
  readonly commandType: CampaignCommandType;
  readonly commandFingerprint: string;
}

export interface EventRecord {
  readonly campaignRevision: number;
  readonly eventIndex: number;
  readonly event: {
    readonly type: string;
    readonly version: number;
    readonly data: object;
  };
}

export interface SnapshotRecord {
  readonly campaignRevision: number;
  readonly state: SerializableCampaignState;
}

export interface VerificationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface CampaignDocument {
  readonly campaignKey: string;
  readonly campaignId: string;
  readonly campaignRevision: number;
  readonly state: SerializableCampaignState;
}

export interface MigrationVerificationInput {
  readonly campaignRevision: number;
  readonly revisions: readonly RevisionRecord[];
  readonly events: readonly EventRecord[];
  readonly snapshots: readonly SnapshotRecord[];
  readonly campaignDocuments: readonly CampaignDocument[];
}

interface MonthChangedEventData {
  readonly direction: MonthDirection;
  readonly fromOrdinal: number;
  readonly toOrdinal: number;
}

function isMonthChangedEventV1(evt: EventRecord["event"]): evt is EventRecord["event"] & { data: MonthChangedEventData } {
  return evt.type === "month_changed" && evt.version === 1;
}

export function validateMoveMonthTransaction(
  currentState: CurrentCampaignState,
  events: readonly EventRecord["event"][],
  nextState: CurrentCampaignState,
  commandFingerprint: string,
): string[] {
  const errors: string[] = [];

  if (events.length !== 1) {
    errors.push(
      `move_month requires exactly one event, got ${events.length}`,
    );
    return errors;
  }

  const evt = events[0];
  if (!isMonthChangedEventV1(evt)) {
    errors.push(
      `move_month event must be month_changed version 1, got type="${evt.type}" version=${evt.version}`,
    );
    return errors;
  }

  const fromOrdinal = evt.data.fromOrdinal as number;
  const toOrdinal = evt.data.toOrdinal as number;
  const direction = evt.data.direction as MonthDirection;

  if (fromOrdinal !== currentState.calendar.monthOrdinal as number) {
    errors.push(
      `Event fromOrdinal ${fromOrdinal} does not match current state monthOrdinal ${currentState.calendar.monthOrdinal}`,
    );
  }

  const expectedTo = advanceOrdinal(fromOrdinal, direction) as number;
  if (toOrdinal !== expectedTo) {
    errors.push(
      `Event toOrdinal ${toOrdinal} is inconsistent with direction "${direction}" from ${fromOrdinal}`,
    );
  }

  if (nextState.calendar.monthOrdinal as number !== toOrdinal) {
    errors.push(
      `Next state monthOrdinal ${nextState.calendar.monthOrdinal} does not match event toOrdinal ${toOrdinal}`,
    );
  }

  const expectedFingerprint = moveMonthFingerprint(direction);
  if (commandFingerprint !== expectedFingerprint) {
    errors.push(
      `commandFingerprint "${commandFingerprint}" does not match expected "${expectedFingerprint}" for direction "${direction}"`,
    );
  }

  return errors;
}

export function verifyMigrationInvariants(
  input: MigrationVerificationInput,
): VerificationResult {
  const errors: string[] = [];
  const N = input.campaignRevision;

  if (!Number.isSafeInteger(N) || N < 0) {
    return { valid: false, errors: [`Invalid campaignRevision: ${N}`] };
  }

  const revisionSet = new Map<number, RevisionRecord>();
  for (const rev of input.revisions) {
    if (rev.campaignRevision < 1 || rev.campaignRevision > N) {
      errors.push(
        `Revision record outside range 1..${N}: revision ${rev.campaignRevision}`,
      );
      continue;
    }
    if (revisionSet.has(rev.campaignRevision)) {
      errors.push(`Duplicate revision record: ${rev.campaignRevision}`);
    }
    revisionSet.set(rev.campaignRevision, rev);
  }

  for (let r = 1; r <= N; r++) {
    if (!revisionSet.has(r)) {
      errors.push(`Missing revision record: ${r}`);
    }
  }

  if (revisionSet.size !== N) {
    errors.push(
      `Expected ${N} revision records, found ${revisionSet.size}`,
    );
  }

  const eventsByRev = new Map<number, EventRecord[]>();
  for (const evt of input.events) {
    const list = eventsByRev.get(evt.campaignRevision) ?? [];
    list.push(evt);
    eventsByRev.set(evt.campaignRevision, list);
  }

  for (const [rev, evts] of eventsByRev) {
    if (rev < 1 || rev > N) {
      errors.push(
        `Event at revision ${rev} is outside range 1..${N}`,
      );
      continue;
    }
    if (!revisionSet.has(rev)) {
      errors.push(
        `Event at revision ${rev} has no matching revision record`,
      );
    }
  }

  for (let r = 1; r <= N; r++) {
    const evts = eventsByRev.get(r);
    if (!evts || evts.length === 0) {
      errors.push(`Revision ${r} has no events`);
    }
  }

  for (const [rev, evts] of eventsByRev) {
    const sorted = [...evts].sort((a, b) => a.eventIndex - b.eventIndex);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].eventIndex !== i) {
        errors.push(
          `Revision ${rev}: eventIndex gap at position ${i}, found ${sorted[i].eventIndex}`,
        );
        break;
      }
    }
  }

  const snapshotSet = new Map<number, SnapshotRecord>();
  for (const snap of input.snapshots) {
    if (snap.campaignRevision < 0 || snap.campaignRevision > N) {
      errors.push(
        `Snapshot outside range 0..${N}: revision ${snap.campaignRevision}`,
      );
      continue;
    }
    if (snapshotSet.has(snap.campaignRevision)) {
      errors.push(
        `Duplicate snapshot for revision: ${snap.campaignRevision}`,
      );
    }
    snapshotSet.set(snap.campaignRevision, snap);
  }

  for (let r = 0; r <= N; r++) {
    if (!snapshotSet.has(r)) {
      errors.push(`Missing snapshot for revision ${r}`);
    }
  }

  if (snapshotSet.size !== N + 1) {
    errors.push(
      `Expected ${N + 1} snapshots, found ${snapshotSet.size}`,
    );
  }

  const canonicalDocs = input.campaignDocuments.filter(
    (d) => d.campaignKey === "default",
  );
  if (canonicalDocs.length !== 1) {
    errors.push(
      `Expected exactly one canonical campaign document, found ${canonicalDocs.length}`,
    );
  }

  const legacyDocs = input.campaignDocuments.filter(
    (d) => d.campaignKey !== "default",
  );
  if (legacyDocs.length > 0) {
    errors.push(
      `Found ${legacyDocs.length} non-canonical campaign document(s) remaining`,
    );
  }

  if (canonicalDocs.length === 1) {
    const doc = canonicalDocs[0];
    if (doc.campaignRevision !== N) {
      errors.push(
        `Campaign document revision ${doc.campaignRevision} does not match expected ${N}`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
