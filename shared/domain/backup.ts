import type { CampaignId } from "./ids";
import type { CampaignRevision, CampaignStateV1 } from "./campaign-state";
import { isValidCampaignId } from "./ids";
import { validateCampaignState } from "./state-validation";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import { SEVEN_PART_PACT_DRAFT4_ID, SEVEN_PART_PACT_DRAFT4_VERSION } from "./ruleset";
import { canonicalJsonStringify, computeDigestFromCanonicalJson } from "./canonical-json";
import { DomainError } from "./errors";
import type { DomainErrorCode } from "./errors";

export const BACKUP_FORMAT_TYPE = "seven_part_pact_campaign_backup" as const;
export const CURRENT_BACKUP_FORMAT_VERSION = 1 as const;
export const MAX_PORTABLE_BACKUP_BYTES = 512 * 1024;

const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;

export interface CampaignBackupProvenanceV1 {
  readonly sourceCampaignId: CampaignId;
  readonly sourceCampaignRevision: CampaignRevision;
  readonly sourceLogicalRevision: CampaignRevision;
  readonly exportedAtMs: number;
}

export interface CampaignBackupIntegrityV1 {
  readonly algorithm: "sha256";
  readonly digest: string;
}

export interface CampaignBackupV1 {
  readonly formatType: typeof BACKUP_FORMAT_TYPE;
  readonly backupFormatVersion: 1;
  readonly provenance: CampaignBackupProvenanceV1;
  readonly state: CampaignStateV1;
  readonly integrity: CampaignBackupIntegrityV1;
}

export interface BackupIntegrityPayload {
  readonly formatType: typeof BACKUP_FORMAT_TYPE;
  readonly backupFormatVersion: 1;
  readonly provenance: CampaignBackupProvenanceV1;
  readonly state: CampaignStateV1;
}

export function buildIntegrityPayload(backup: Omit<CampaignBackupV1, "integrity">): BackupIntegrityPayload {
  return {
    formatType: backup.formatType,
    backupFormatVersion: backup.backupFormatVersion,
    provenance: backup.provenance,
    state: backup.state,
  };
}

export function buildIntegrityPayloadFromParts(
  provenance: CampaignBackupProvenanceV1,
  state: CampaignStateV1,
): BackupIntegrityPayload {
  return {
    formatType: BACKUP_FORMAT_TYPE,
    backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    provenance,
    state,
  };
}

export async function computeBackupPayloadDigest(payload: BackupIntegrityPayload): Promise<string> {
  const canonical = canonicalJsonStringify(payload);
  return computeDigestFromCanonicalJson(canonical);
}

export interface BackupValidationError {
  readonly code: DomainErrorCode;
  readonly message: string;
}

function validationError(code: DomainErrorCode, message: string): BackupValidationError {
  return { code, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function parseAndValidateBackupStructure(parsed: unknown): BackupValidationError | null {
  if (!isPlainObject(parsed)) {
    return validationError("INVALID_BACKUP_FORMAT", "Backup must be a JSON object");
  }

  if (parsed.formatType !== BACKUP_FORMAT_TYPE) {
    return validationError("INVALID_BACKUP_FORMAT", `Expected formatType "${BACKUP_FORMAT_TYPE}", got ${JSON.stringify(parsed.formatType)}`);
  }

  if (parsed.backupFormatVersion !== CURRENT_BACKUP_FORMAT_VERSION) {
    if (typeof parsed.backupFormatVersion === "number" && Number.isSafeInteger(parsed.backupFormatVersion) && parsed.backupFormatVersion > CURRENT_BACKUP_FORMAT_VERSION) {
      return validationError("UNSUPPORTED_BACKUP_VERSION", `Backup format version ${parsed.backupFormatVersion} is not supported (max supported: ${CURRENT_BACKUP_FORMAT_VERSION})`);
    }
    return validationError("INVALID_BACKUP_FORMAT", `Expected backupFormatVersion ${CURRENT_BACKUP_FORMAT_VERSION}, got ${JSON.stringify(parsed.backupFormatVersion)}`);
  }

  // Validate provenance
  if (!isPlainObject(parsed.provenance)) {
    return validationError("INVALID_BACKUP_FORMAT", "Missing or invalid provenance object");
  }

  const prov = parsed.provenance;

  if (typeof prov.sourceCampaignId !== "string" || !isValidCampaignId(prov.sourceCampaignId)) {
    return validationError("INVALID_BACKUP_FORMAT", `Invalid sourceCampaignId: ${JSON.stringify(prov.sourceCampaignId)}`);
  }

  if (typeof prov.sourceCampaignRevision !== "number" || !Number.isSafeInteger(prov.sourceCampaignRevision) || prov.sourceCampaignRevision < 0) {
    return validationError("INVALID_BACKUP_FORMAT", `sourceCampaignRevision must be a non-negative safe integer, got ${JSON.stringify(prov.sourceCampaignRevision)}`);
  }

  if (typeof prov.sourceLogicalRevision !== "number" || !Number.isSafeInteger(prov.sourceLogicalRevision) || prov.sourceLogicalRevision < 0) {
    return validationError("INVALID_BACKUP_FORMAT", `sourceLogicalRevision must be a non-negative safe integer, got ${JSON.stringify(prov.sourceLogicalRevision)}`);
  }

  if (prov.sourceLogicalRevision > prov.sourceCampaignRevision) {
    return validationError("INVALID_BACKUP_FORMAT", `sourceLogicalRevision (${prov.sourceLogicalRevision}) must not exceed sourceCampaignRevision (${prov.sourceCampaignRevision})`);
  }

  if (typeof prov.exportedAtMs !== "number" || !Number.isSafeInteger(prov.exportedAtMs) || prov.exportedAtMs < 0) {
    return validationError("INVALID_BACKUP_FORMAT", `exportedAtMs must be a non-negative safe integer, got ${JSON.stringify(prov.exportedAtMs)}`);
  }

  // Reject extra provenance keys
  const allowedProvenanceKeys = new Set(["sourceCampaignId", "sourceCampaignRevision", "sourceLogicalRevision", "exportedAtMs"]);
  for (const key of Object.keys(prov)) {
    if (!allowedProvenanceKeys.has(key)) {
      return validationError("INVALID_BACKUP_FORMAT", `Unexpected provenance field: "${key}"`);
    }
  }

  // Validate integrity
  if (!isPlainObject(parsed.integrity)) {
    return validationError("INVALID_BACKUP_FORMAT", "Missing or invalid integrity object");
  }

  const integrity = parsed.integrity;

  if (integrity.algorithm !== "sha256") {
    return validationError("INVALID_BACKUP_FORMAT", `Expected integrity.algorithm "sha256", got ${JSON.stringify(integrity.algorithm)}`);
  }

  if (typeof integrity.digest !== "string" || !SHA256_HEX_REGEX.test(integrity.digest)) {
    return validationError("INVALID_BACKUP_FORMAT", "integrity.digest must be a lowercase 64-character hex string");
  }

  // Reject extra integrity keys
  const allowedIntegrityKeys = new Set(["algorithm", "digest"]);
  for (const key of Object.keys(integrity)) {
    if (!allowedIntegrityKeys.has(key)) {
      return validationError("INVALID_BACKUP_FORMAT", `Unexpected integrity field: "${key}"`);
    }
  }

  // Validate state structure
  if (!isPlainObject(parsed.state)) {
    return validationError("INVALID_BACKUP_FORMAT", "Missing or invalid state object");
  }

  // Reject extra top-level keys
  const allowedTopKeys = new Set(["formatType", "backupFormatVersion", "provenance", "state", "integrity"]);
  for (const key of Object.keys(parsed)) {
    if (!allowedTopKeys.has(key)) {
      return validationError("INVALID_BACKUP_FORMAT", `Unexpected top-level field: "${key}"`);
    }
  }

  return null;
}

export function validateBackupState(state: unknown): BackupValidationError | null {
  try {
    validateCampaignState(state);
    return null;
  } catch (e: unknown) {
    if (e instanceof DomainError) {
      if (e.message.includes("schemaVersion")) {
        return validationError("BACKUP_INCOMPATIBLE", `Backup state has unsupported schema: ${e.message}`);
      }
      if (e.message.includes("ruleset")) {
        return validationError("BACKUP_INCOMPATIBLE", `Backup state has incompatible ruleset: ${e.message}`);
      }
      return validationError("INVALID_BACKUP_FORMAT", `Backup state validation failed: ${e.message}`);
    }
    return validationError("INVALID_BACKUP_FORMAT", `Backup state validation failed: ${String(e)}`);
  }
}

export function validateBackupCompatibility(
  backupState: CampaignStateV1,
  targetState: CampaignStateV1,
): BackupValidationError | null {
  if (backupState.schemaVersion !== targetState.schemaVersion) {
    return validationError("BACKUP_INCOMPATIBLE", `Backup schemaVersion ${backupState.schemaVersion} does not match target schemaVersion ${targetState.schemaVersion}`);
  }
  if (backupState.ruleset.id !== targetState.ruleset.id) {
    return validationError("BACKUP_INCOMPATIBLE", `Backup ruleset id "${backupState.ruleset.id}" does not match target ruleset id "${targetState.ruleset.id}"`);
  }
  if (backupState.ruleset.version !== targetState.ruleset.version) {
    return validationError("BACKUP_INCOMPATIBLE", `Backup ruleset version ${backupState.ruleset.version} does not match target ruleset version ${targetState.ruleset.version}`);
  }
  return null;
}

export interface ValidatedBackupV1 {
  readonly formatType: typeof BACKUP_FORMAT_TYPE;
  readonly backupFormatVersion: 1;
  readonly provenance: {
    readonly sourceCampaignId: string;
    readonly sourceCampaignRevision: number;
    readonly sourceLogicalRevision: number;
    readonly exportedAtMs: number;
  };
  readonly state: CampaignStateV1;
  readonly integrity: {
    readonly algorithm: "sha256";
    readonly digest: string;
  };
}

/**
 * Result of structural + integrity authentication WITHOUT CampaignState domain
 * validation. The `state` field is an unvalidated plain JSON object — callers
 * must NOT treat it as a CampaignStateV1 until fullyValidateBackup has run.
 */
export interface IntegrityVerifiedBackupV1 {
  readonly formatType: typeof BACKUP_FORMAT_TYPE;
  readonly backupFormatVersion: 1;
  readonly provenance: CampaignBackupProvenanceV1;
  readonly state: Record<string, unknown>;
  readonly integrity: {
    readonly algorithm: "sha256";
    readonly digest: string;
  };
}

export async function fullyValidateBackup(
  rawJson: string,
  targetState: CampaignStateV1 | null,
): Promise<{ backup: ValidatedBackupV1; serverDigest: string } | { error: BackupValidationError }> {
  // UTF-8 byte length check
  const encoder = new TextEncoder();
  const bytes = encoder.encode(rawJson);
  if (bytes.length > MAX_PORTABLE_BACKUP_BYTES) {
    return { error: validationError("INVALID_BACKUP_FORMAT", `Backup exceeds maximum size of ${MAX_PORTABLE_BACKUP_BYTES} bytes (got ${bytes.length})`) };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e: unknown) {
    return { error: validationError("INVALID_BACKUP_FORMAT", `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`) };
  }

  // Structural validation
  const structError = parseAndValidateBackupStructure(parsed);
  if (structError !== null) return { error: structError };

  const obj = parsed as Record<string, unknown>;
  const provObj = obj.provenance as Record<string, unknown>;
  const integrityObj = obj.integrity as Record<string, unknown>;

  // Build integrity payload from parsed data and compute server-side digest
  const provenance: CampaignBackupProvenanceV1 = {
    sourceCampaignId: provObj.sourceCampaignId as CampaignId,
    sourceCampaignRevision: provObj.sourceCampaignRevision as CampaignRevision,
    sourceLogicalRevision: provObj.sourceLogicalRevision as CampaignRevision,
    exportedAtMs: provObj.exportedAtMs as number,
  };

  // Validate state as CampaignState
  const stateError = validateBackupState(obj.state);
  if (stateError !== null) return { error: stateError };

  const state = obj.state as CampaignStateV1;

  // Compute server-side digest
  const integrityPayload = buildIntegrityPayloadFromParts(provenance, state);
  const serverDigest = await computeBackupPayloadDigest(integrityPayload);

  // Verify claimed digest matches server-computed
  const claimedDigest = integrityObj.digest as string;
  if (serverDigest !== claimedDigest) {
    return { error: validationError("BACKUP_INTEGRITY_FAILED", `Integrity check failed: computed digest does not match claimed digest`) };
  }

  // Compatibility check against target
  if (targetState !== null) {
    const compatError = validateBackupCompatibility(state, targetState);
    if (compatError !== null) return { error: compatError };
  }

  const validated: ValidatedBackupV1 = {
    formatType: BACKUP_FORMAT_TYPE,
    backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    provenance,
    state,
    integrity: {
      algorithm: "sha256",
      digest: serverDigest,
    },
  };

  return { backup: validated, serverDigest };
}

/**
 * Performs strict structural validation and integrity verification sufficient
 * to derive a trustworthy server-computed fingerprint. Does NOT perform
 * CampaignState domain validation (validateCampaignState) — that happens
 * after idempotency via fullyValidateBackup with a target state.
 *
 * Returns an IntegrityVerifiedBackupV1 whose `state` is an unvalidated plain
 * JSON object. Callers must NOT treat it as CampaignStateV1 until
 * fullyValidateBackup has run.
 *
 * This allows a compatible retry of an already-committed command to be
 * identified before current domain/schema compatibility checks.
 */
export async function parseAndVerifyBackupIntegrityForFingerprint(
  rawJson: string,
): Promise<{ backup: IntegrityVerifiedBackupV1; serverDigest: string } | { error: BackupValidationError }> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(rawJson);
  if (bytes.length > MAX_PORTABLE_BACKUP_BYTES) {
    return { error: validationError("INVALID_BACKUP_FORMAT", `Backup exceeds maximum size of ${MAX_PORTABLE_BACKUP_BYTES} bytes (got ${bytes.length})`) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e: unknown) {
    return { error: validationError("INVALID_BACKUP_FORMAT", `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`) };
  }

  const structError = parseAndValidateBackupStructure(parsed);
  if (structError !== null) return { error: structError };

  const obj = parsed as Record<string, unknown>;
  const provObj = obj.provenance as Record<string, unknown>;
  const integrityObj = obj.integrity as Record<string, unknown>;

  const provenance: CampaignBackupProvenanceV1 = {
    sourceCampaignId: provObj.sourceCampaignId as CampaignId,
    sourceCampaignRevision: provObj.sourceCampaignRevision as CampaignRevision,
    sourceLogicalRevision: provObj.sourceLogicalRevision as CampaignRevision,
    exportedAtMs: provObj.exportedAtMs as number,
  };

  // State must be a plain object sufficient for canonical hashing — but we do
  // NOT call validateCampaignState here.
  if (!isPlainObject(obj.state)) {
    return { error: validationError("INVALID_BACKUP_FORMAT", "state must be a JSON object") };
  }

  const state = obj.state as Record<string, unknown>;

  // Build integrity payload using the plain-object state for canonical hashing
  const integrityPayload = buildIntegrityPayloadFromParts(provenance, state as unknown as CampaignStateV1);
  const serverDigest = await computeBackupPayloadDigest(integrityPayload);

  const claimedDigest = integrityObj.digest as string;
  if (serverDigest !== claimedDigest) {
    return { error: validationError("BACKUP_INTEGRITY_FAILED", "Integrity check failed: computed digest does not match claimed digest") };
  }

  const verified: IntegrityVerifiedBackupV1 = {
    formatType: BACKUP_FORMAT_TYPE,
    backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    provenance,
    state,
    integrity: {
      algorithm: "sha256",
      digest: serverDigest,
    },
  };

  return { backup: verified, serverDigest };
}

export interface ExportSourceData {
  readonly sourceCampaignId: string;
  readonly sourceCampaignRevision: number;
  readonly sourceLogicalRevision: number;
  readonly state: CampaignStateV1;
}

export async function buildExportBackup(
  source: ExportSourceData,
  exportedAtMs: number,
): Promise<CampaignBackupV1> {
  const provenance: CampaignBackupProvenanceV1 = {
    sourceCampaignId: source.sourceCampaignId as CampaignId,
    sourceCampaignRevision: source.sourceCampaignRevision as CampaignRevision,
    sourceLogicalRevision: source.sourceLogicalRevision as CampaignRevision,
    exportedAtMs,
  };

  const integrityPayload = buildIntegrityPayloadFromParts(provenance, source.state);
  const digest = await computeBackupPayloadDigest(integrityPayload);

  return {
    formatType: BACKUP_FORMAT_TYPE,
    backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    provenance,
    state: source.state,
    integrity: {
      algorithm: "sha256",
      digest,
    },
  };
}
