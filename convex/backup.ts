import { v } from "convex/values";
import { mutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  validateCampaignState,
  DomainError,
  isLogicalStateCommandType,
  CURRENT_HISTORY_CONTROL_VERSION,
  validateHistoryControlStructure,
  statesDeepEqual,
  parseLiveCommandId,
  backupImportFingerprint,
  displayNameFromOrdinal,
  BACKUP_FORMAT_TYPE,
  CURRENT_BACKUP_FORMAT_VERSION,
  MAX_PORTABLE_BACKUP_BYTES,
  parseAndVerifyBackupIntegrityForFingerprint,
  fullyValidateBackup,
  buildExportBackup,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  CampaignHistoryControlV1,
  BackupImportedEventV1,
  CampaignBackupV1,
  ExportSourceData,
} from "../shared/domain";
import { canonicalCommit } from "./canonicalCommit";
import { campaignStateV1Validator, monthDisplayNameValidator } from "./validators";

// ============================================================
// Return validators
// ============================================================

const exportSourceValidator = v.object({
  sourceCampaignId: v.string(),
  sourceCampaignRevision: v.number(),
  sourceLogicalRevision: v.number(),
  state: campaignStateV1Validator,
});

const campaignBackupV1Validator = v.object({
  formatType: v.literal(BACKUP_FORMAT_TYPE),
  backupFormatVersion: v.literal(CURRENT_BACKUP_FORMAT_VERSION),
  provenance: v.object({
    sourceCampaignId: v.string(),
    sourceCampaignRevision: v.number(),
    sourceLogicalRevision: v.number(),
    exportedAtMs: v.number(),
  }),
  state: campaignStateV1Validator,
  integrity: v.object({
    algorithm: v.literal("sha256"),
    digest: v.string(),
  }),
});

// ============================================================
// Internal query: consistent read for export source
// ============================================================

export const getPortableBackupSource = internalQuery({
  args: {},
  returns: exportSourceValidator,
  handler: async (ctx): Promise<ExportSourceData> => {
    const campaign = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (campaign === null || !("campaignKey" in campaign) || (campaign as any).campaignKey !== "default") {
      throw new DomainError("CAMPAIGN_NOT_FOUND", "No canonical campaign found");
    }

    const campaignId = (campaign as any).campaignId as string;
    const campaignRevision = (campaign as any).campaignRevision as number;
    const state = (campaign as any).state;

    validateCampaignState(state);

    const controlDocs = await ctx.db
      .query("campaignHistoryControl")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .collect();

    if (controlDocs.length === 0) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", "History control document missing");
    }
    if (controlDocs.length > 1) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Found ${controlDocs.length} history control documents — expected exactly 1`);
    }

    const controlDoc = controlDocs[0];
    if (controlDoc.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unrecognized historyControlVersion: ${controlDoc.historyControlVersion}`);
    }

    const control: CampaignHistoryControlV1 = {
      historyControlVersion: controlDoc.historyControlVersion as 1,
      campaignId: controlDoc.campaignId,
      undoStack: controlDoc.undoStack,
      redoStack: controlDoc.redoStack,
    };

    const structErrors = validateHistoryControlStructure({
      control,
      campaignId,
      campaignRevision,
    });
    if (structErrors.length > 0) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `History control structural validation failed: ${structErrors.join("; ")}`);
    }

    const sourceLogicalRevision = control.undoStack[control.undoStack.length - 1];

    const snapshot = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", campaignId).eq("campaignRevision", sourceLogicalRevision),
      )
      .unique();

    if (snapshot === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot for logical revision ${sourceLogicalRevision}`);
    }

    validateCampaignState(snapshot.state);

    if (!statesDeepEqual(snapshot.state, state)) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot at logical revision ${sourceLogicalRevision} does not match authoritative campaign state`);
    }

    if (sourceLogicalRevision > 0) {
      const revRec = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", campaignId).eq("campaignRevision", sourceLogicalRevision),
        )
        .unique();

      if (revRec === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Logical revision ${sourceLogicalRevision} has no revision record`);
      }
      if (!isLogicalStateCommandType(revRec.commandType)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Logical revision ${sourceLogicalRevision} has non-logical-state commandType "${revRec.commandType}"`);
      }
    }

    return {
      sourceCampaignId: campaignId,
      sourceCampaignRevision: campaignRevision,
      sourceLogicalRevision,
      state: state as CurrentCampaignState,
    };
  },
});

// ============================================================
// Public action: export portable backup (zero writes)
// ============================================================

export const exportPortableBackup = action({
  args: {},
  returns: campaignBackupV1Validator,
  handler: async (ctx): Promise<CampaignBackupV1> => {
    const source: ExportSourceData = await ctx.runQuery(internal.backup.getPortableBackupSource, {});
    const exportedAtMs = Date.now();
    return buildExportBackup(source, exportedAtMs);
  },
});

// ============================================================
// Public mutation: import portable backup
// ============================================================

type CanonicalCampaignDoc = {
  _id: any;
  _creationTime: number;
  campaignKey: "default";
  campaignId: string;
  campaignRevision: number;
  state: { schemaVersion: 1; ruleset: { id: "seven_part_pact_draft4"; version: 1 }; calendar: { monthOrdinal: number } };
};

function isCanonical(doc: unknown): doc is CanonicalCampaignDoc {
  return doc !== null && typeof doc === "object" && "campaignKey" in (doc as any) && (doc as any).campaignKey === "default";
}

export const importPortableBackup = mutation({
  args: {
    commandId: v.string(),
    expectedRevision: v.number(),
    backupJson: v.string(),
  },
  returns: v.object({
    revision: v.number(),
    monthOrdinal: v.number(),
    month: monthDisplayNameValidator,
    alreadyApplied: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // STEP 1: Validate commandId
    const commandId = parseLiveCommandId(args.commandId);

    // STEP 2: Validate expectedRevision shape
    if (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `expectedRevision must be a non-negative safe integer, got ${args.expectedRevision}`);
    }

    // STEPS 3-7: Strict structural validation + server-side integrity verification
    // (byte limit, JSON parse, exact V1 envelope, provenance, integrity fields,
    //  canonical SHA-256 recomputation, claimed digest verification)
    // This does NOT check target compatibility yet.
    const integrityResult = await parseAndVerifyBackupIntegrityForFingerprint(args.backupJson);
    if ("error" in integrityResult) {
      throw new DomainError(integrityResult.error.code, integrityResult.error.message);
    }

    const { backup: validatedBackup, serverDigest } = integrityResult;

    // STEP 8: Construct fingerprint from SERVER-COMPUTED digest
    const fingerprint = backupImportFingerprint(args.expectedRevision, serverDigest);

    // STEP 9: Load campaign for idempotency lookup
    const campaign = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (campaign === null || !isCanonical(campaign)) {
      throw new DomainError("CAMPAIGN_NOT_FOUND", "No canonical campaign found");
    }

    const campaignId = campaign.campaignId;

    // STEP 10: Idempotency lookup BEFORE CAS and BEFORE full target compatibility
    const existingCommand = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_commandId", (q) =>
        q.eq("campaignId", campaignId).eq("commandId", commandId as string),
      )
      .unique();

    if (existingCommand !== null) {
      // STEP 10a: Compatible duplicate -> return original committed result
      if (existingCommand.commandType === "backup_import" && existingCommand.commandFingerprint === fingerprint) {
        const snap = await ctx.db
          .query("campaignSnapshots")
          .withIndex("by_campaign_revision", (q) =>
            q.eq("campaignId", campaignId).eq("campaignRevision", existingCommand.campaignRevision),
          )
          .unique();
        if (snap === null) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${existingCommand.campaignRevision}`);
        }
        validateCampaignState(snap.state);
        return {
          revision: existingCommand.campaignRevision,
          monthOrdinal: (snap.state as any).calendar.monthOrdinal as number,
          month: displayNameFromOrdinal((snap.state as any).calendar.monthOrdinal),
          alreadyApplied: true,
        };
      }

      // STEP 11: Incompatible reuse
      throw new DomainError(
        "COMMAND_ID_REUSED",
        `CommandId "${commandId}" already committed with type="${existingCommand.commandType}" fingerprint="${existingCommand.commandFingerprint}", cannot reuse for type="backup_import" fingerprint="${fingerprint}"`,
      );
    }

    // STEP 12: CAS check
    if (campaign.campaignRevision !== args.expectedRevision) {
      throw new DomainError(
        "STALE_CAMPAIGN_REVISION",
        `Expected revision ${args.expectedRevision}, current is ${campaign.campaignRevision}`,
      );
    }

    // STEP 13: Full CampaignState + target schema/ruleset compatibility validation
    const currentState = validateCampaignState(campaign.state);
    const importedState = validatedBackup.state;

    if (importedState.schemaVersion !== currentState.schemaVersion) {
      throw new DomainError("BACKUP_INCOMPATIBLE", `Backup schemaVersion ${importedState.schemaVersion} does not match target ${currentState.schemaVersion}`);
    }
    if (importedState.ruleset.id !== currentState.ruleset.id) {
      throw new DomainError("BACKUP_INCOMPATIBLE", `Backup ruleset "${importedState.ruleset.id}" does not match target "${currentState.ruleset.id}"`);
    }
    if (importedState.ruleset.version !== currentState.ruleset.version) {
      throw new DomainError("BACKUP_INCOMPATIBLE", `Backup ruleset version ${importedState.ruleset.version} does not match target ${currentState.ruleset.version}`);
    }

    // Build event
    const event: BackupImportedEventV1 = {
      type: "backup_imported",
      version: 1,
      data: {
        backupFormatVersion: validatedBackup.backupFormatVersion,
        sourceCampaignId: validatedBackup.provenance.sourceCampaignId,
        sourceCampaignRevision: validatedBackup.provenance.sourceCampaignRevision as number,
        sourceLogicalRevision: validatedBackup.provenance.sourceLogicalRevision as number,
        exportedAtMs: validatedBackup.provenance.exportedAtMs,
        payloadDigest: serverDigest,
      },
    };

    // STEP 14: Commit via canonicalCommit (performs its own independent full validation)
    const receipt = await canonicalCommit(ctx, {
      campaignDocId: campaign._id,
      campaignId,
      currentRevision: campaign.campaignRevision,
      currentState,
      commandId: commandId as string,
      commandType: "backup_import",
      commandFingerprint: fingerprint,
      nextState: importedState,
      events: [event],
      historyControlUpdate: { kind: "logical_state_append" },
      commandContext: { kind: "backup_import", backupJson: args.backupJson },
    });

    return {
      revision: receipt.newRevision,
      monthOrdinal: receipt.state.calendar.monthOrdinal as number,
      month: displayNameFromOrdinal(receipt.state.calendar.monthOrdinal),
      alreadyApplied: receipt.alreadyApplied,
    };
  },
});
