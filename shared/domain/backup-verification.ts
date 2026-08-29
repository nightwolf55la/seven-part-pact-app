import { isValidCampaignId } from "./ids";
import { backupImportFingerprint } from "./command-ids";
import { validateAnyCampaignState } from "./state-validation";
import { canonicalJsonStringify, computeDigestFromCanonicalJson } from "./canonical-json";
import { BACKUP_FORMAT_TYPE, CURRENT_BACKUP_FORMAT_VERSION, buildIntegrityPayloadFromParts } from "./backup";
import type { SerializableCampaignState } from "./verification";
import type { CampaignCommandType } from "./commands";

export interface BackupImportRevisionVerificationInput {
  readonly campaignRevision: number;
  readonly commandFingerprint: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly eventData: {
    readonly backupFormatVersion: number;
    readonly sourceCampaignId: string;
    readonly sourceCampaignRevision: number;
    readonly sourceLogicalRevision: number;
    readonly exportedAtMs: number;
    readonly payloadDigest: string;
  };
  readonly resultSnapshotExists: boolean;
  readonly resultSnapshotState: SerializableCampaignState | null;
}

export function verifyBackupImportRevisionStructure(input: BackupImportRevisionVerificationInput): string[] {
  const errors: string[] = [];
  const rev = input.campaignRevision;

  if (input.eventType !== "backup_imported") {
    errors.push(`Revision ${rev}: expected event type "backup_imported", got "${input.eventType}"`);
    return errors;
  }

  if (input.eventVersion !== 1) {
    errors.push(`Revision ${rev}: expected event version 1, got ${input.eventVersion}`);
    return errors;
  }

  const data = input.eventData;

  if (data.backupFormatVersion !== CURRENT_BACKUP_FORMAT_VERSION) {
    errors.push(`Revision ${rev}: backupFormatVersion ${data.backupFormatVersion} is not supported`);
  }

  if (typeof data.sourceCampaignId !== "string" || !isValidCampaignId(data.sourceCampaignId)) {
    errors.push(`Revision ${rev}: invalid sourceCampaignId: "${data.sourceCampaignId}"`);
  }

  if (!Number.isSafeInteger(data.sourceCampaignRevision) || data.sourceCampaignRevision < 0) {
    errors.push(`Revision ${rev}: sourceCampaignRevision ${data.sourceCampaignRevision} is not a non-negative safe integer`);
  }

  if (!Number.isSafeInteger(data.sourceLogicalRevision) || data.sourceLogicalRevision < 0) {
    errors.push(`Revision ${rev}: sourceLogicalRevision ${data.sourceLogicalRevision} is not a non-negative safe integer`);
  }

  if (data.sourceLogicalRevision > data.sourceCampaignRevision) {
    errors.push(`Revision ${rev}: sourceLogicalRevision (${data.sourceLogicalRevision}) exceeds sourceCampaignRevision (${data.sourceCampaignRevision})`);
  }

  if (!Number.isSafeInteger(data.exportedAtMs) || data.exportedAtMs < 0) {
    errors.push(`Revision ${rev}: exportedAtMs ${data.exportedAtMs} is not a non-negative safe integer`);
  }

  if (typeof data.payloadDigest !== "string" || !/^[0-9a-f]{64}$/.test(data.payloadDigest)) {
    errors.push(`Revision ${rev}: payloadDigest is not a valid lowercase 64-char hex sha256`);
  }

  // Fingerprint verification
  if (/^[0-9a-f]{64}$/.test(data.payloadDigest)) {
    const expectedFingerprint = backupImportFingerprint(rev - 1, data.payloadDigest);
    if (input.commandFingerprint !== expectedFingerprint) {
      errors.push(`Revision ${rev}: commandFingerprint "${input.commandFingerprint}" does not match expected "${expectedFingerprint}"`);
    }
  }

  // Result snapshot checks
  if (!input.resultSnapshotExists) {
    errors.push(`Revision ${rev}: result snapshot does not exist`);
  }

  if (input.resultSnapshotState !== null) {
    try {
      validateAnyCampaignState(input.resultSnapshotState);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Revision ${rev}: result snapshot state invalid: ${msg}`);
    }
  }

  return errors;
}

export async function verifyBackupImportRevisionDigest(input: BackupImportRevisionVerificationInput): Promise<string[]> {
  const errors: string[] = [];
  const rev = input.campaignRevision;

  if (input.eventType !== "backup_imported" || input.eventVersion !== 1) {
    return errors;
  }

  if (input.resultSnapshotState === null) {
    errors.push(`Revision ${rev}: cannot verify digest without result snapshot state`);
    return errors;
  }

  const data = input.eventData;

  // Reconstruct the integrity payload from event provenance + result snapshot
  const integrityPayload = buildIntegrityPayloadFromParts(
    {
      sourceCampaignId: data.sourceCampaignId as any,
      sourceCampaignRevision: data.sourceCampaignRevision as any,
      sourceLogicalRevision: data.sourceLogicalRevision as any,
      exportedAtMs: data.exportedAtMs,
    },
    input.resultSnapshotState as any,
  );

  const canonical = canonicalJsonStringify(integrityPayload);
  const recomputedDigest = await computeDigestFromCanonicalJson(canonical);

  if (recomputedDigest !== data.payloadDigest) {
    errors.push(`Revision ${rev}: recomputed digest "${recomputedDigest}" does not match event payloadDigest "${data.payloadDigest}"`);
  }

  return errors;
}
