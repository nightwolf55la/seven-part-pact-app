# V1 to V2 Campaign State Migration — Staged Deployment Procedure

**Status:** COMPLETE — Production EXPAND + MIGRATE + CONTRACT deployed and verified
**Prerequisite:** This document, all M3 code changes, and the EXPAND-phase schema
must be deployed before running the migration.

### Rehearsal Record

A realistic disposable EXPAND + MIGRATE rehearsal was completed successfully
before merge:

- Rehearsal used genuine persisted V1 current state plus V1 historical
  snapshots and checkpoint/history-control structures.
- Explicit current-state migration (`adminMigration:migrateCurrentStateToV2`)
  preserved campaign identity and revision exactly.
- Historical V1 snapshots remained physically immutable after migration.
- Mixed-history verification and normal runtime behavior (M2 moveMonth, M3
  addPlayer/createWizard, undo/redo) were exercised on the migrated state.
- Defects discovered during rehearsal (ensureCampaign revision-0 V1/V2
  coherence, getUndoRedoState/listCheckpoints raw-snapshot loading) were
  corrected before merge.
- Campaign health verifier (`verifyMigration:verifyMigration`) returned
  `status: "valid"` after normal runtime/undo/redo smoke activity.

### Completed

- Disposable rehearsal (EXPAND + MIGRATE on disposable deployment with realistic
  V1 data): verified successfully.
- Production EXPAND deployed.
- Production MIGRATE completed (`adminMigration:migrateCurrentStateToV2 --prod`):
  - `migrated: true`, current state is V2, `campaignRevision` remained 0.
  - Historical revision-0 V1 snapshot remains physically immutable.
- Production verifier (`verifyMigration:verifyMigration --prod`):
  - `status: "valid"`
  - `historyControlStatus: "valid"`
  - `checkpointStatus: "valid"`
  - `revisionRecordCount: 0`
  - `eventRecordCount: 0`
  - `snapshotCount: 1`
  - `checkpointCount: 0`
- Production browser smoke: no unexpected behavior.
- Retained dev/bolt and dev/vercel deployments reseeded from fresh valid
  production V2 export (old development histories were disposable).
- Disposable dev/m3-rehearsal and preview/bolt-milestone-3 deployments removed.
- CONTRACT code implemented in dedicated PR (narrows authoritative campaign record
  validator to V2-only; historical V1 support intentionally retained for
  snapshots/recovery/undo-redo/checkpoints/legacy backup import/verifier paths).

### CONTRACT completion

- CONTRACT was successfully pushed and verified against a retained V2 development deployment.
- PR #4 was merged and production CONTRACT deployed at
  `577fb30a9bcfc22ad0d12f10b96ddfc9da1308a6`.
- Production Convex schema accepted the existing authoritative V2 campaign record.
- Post-CONTRACT production verifier:
  - `status: "valid"`
  - `historyControlStatus: "valid"`
  - `checkpointStatus: "valid"`
  - `campaignRevision: 0`
  - `revisionRecordCount: 0`
  - `eventRecordCount: 0`
  - `snapshotCount: 1`
  - `checkpointCount: 0`
- Post-CONTRACT production browser smoke completed with no unexpected behavior.
- No further V1-to-V2 migration action remains. Historical V1 compatibility is intentionally retained where documented.

---

## Background

Campaign state evolved from V1 (calendar only) to V2 (calendar + configuration
+ players + wizards + pactSeats). Historical snapshots remain V1 indefinitely;
only the authoritative **current** campaign document must be V2 for M3 commands
to function.

### Design Principles

- Current-state migration is **explicit and admin-only**
  (`adminMigration:migrateCurrentStateToV2`, an internalMutation).
- Historical-state in-memory migration is allowed at read boundaries
  (via `loadHistoricalState`).
- Ordinary reads/writes **never** silently migrate the authoritative current
  campaign document.
- M3 commands/queries fail closed with `MIGRATION_REQUIRED` if current state
  is still V1.

---

## Pre-Migration Requirements

Before beginning this procedure:

1. **Full Convex export:** Take and verify a complete Convex data export of
   the target environment. See [Recovery Runbook](recovery-runbook.md) for the
   standard export procedure.
2. **Disposable rehearsal is mandatory:** Deploy the EXPAND branch to a
   disposable Convex deployment containing realistic V1 campaign data and
   rehearse the full procedure end-to-end before touching production. An empty
   new deployment does not prove migration safety.

---

## Phase 1: EXPAND (deploy to disposable deployment)

**What ships:** Schema validator accepts both V1 and V2 for the campaign record's
`state` field (`anyCampaignStateValidator`). M3 commands fail closed on V1 state.
Admin migration function is available but not yet invoked.

**Deploy action:**

1. Create (or select) a **disposable** Convex development deployment and push
   the M3 branch code to it:

   ```
   npx convex deployment create dev/m3-rehearsal --type dev --select
   npx convex dev --once
   ```

   Or, if the deployment already exists:

   ```
   npx convex deployment select dev/m3-rehearsal
   npx convex dev --once
   ```

2. Verify deployment succeeds (Convex schema push does not reject existing data).

**Important:** While the EXPAND schema is deployed but the migration has not
been run, **all commands that validate current state will fail closed** because
current state is still V1 and `validateCampaignState` rejects V1. This is
intentional fail-closed behavior. The application is not usable in this window.
Proceed immediately to Phase 2.

Schema widening itself does not destroy data, but the M3 branch's fail-closed
behavior means reverting after migration requires the full recovery contract
(Convex export restore). This is not a "safe to revert at any time" deploy.

---

## Phase 2: MIGRATE (controlled maintenance window)

**What happens:** The admin migration function atomically upgrades the current
campaign document from V1 to V2.

### Disposable/Preview Rehearsal

Run against the disposable deployment:

```
npx convex run adminMigration:migrateCurrentStateToV2 \
  --deployment dev/m3-rehearsal
```

Verify the response:
- `{ migrated: true, campaignId: "...", campaignRevision: N, schemaVersion: 2 }`
  means migration succeeded.
- `{ migrated: false, ... }` means the state was already V2 (idempotent).

Run the campaign health verifier:

```
npx convex run verifyMigration:verifyMigration \
  --deployment dev/m3-rehearsal
```

Expect `{ status: "valid", ... }`.

Verify M3 commands work (addPlayer, createWizard, getCampaignSetup).
Verify M2 commands still work (moveMonth, undo, redo).

### Production (only after successful rehearsal and human approval)

Only after disposable rehearsal succeeds and a human explicitly approves:

```
npx convex run adminMigration:migrateCurrentStateToV2 --prod
```

Then verify:

```
npx convex run verifyMigration:verifyMigration --prod
```

Expect `{ status: "valid", ... }`.

**Migration guarantees:**
- `campaignId` and `campaignRevision` are preserved exactly.
- Historical snapshots, audit records, checkpoints are NOT touched.
- No new revision is created; this is infrastructure bookkeeping only.
- Idempotent: safe to run multiple times.
- Does NOT create audit events or change history control.

---

## Phase 3: CONTRACT (required follow-up deployment)

**What changes:** Narrow the campaign record validator back to V2-only so the
schema enforces V2 at the persistence layer. This is a **required** follow-up
once every applicable environment is confirmed V2.

**Procedure:**

1. Confirm migration has completed and verified on ALL environments that share
   this schema (development, preview, production).
2. Change `convex/validators.ts`:

   ```ts
   export const newCampaignRecordValidator = v.object({
     campaignKey: v.literal("default"),
     campaignId: v.string(),
     campaignRevision: v.number(),
     state: currentCampaignStateValidator, // V2 only
   });
   ```

3. Deploy. Convex schema push will verify the existing document matches V2.
   If it fails, the migration was not run on that environment — go back to
   Phase 2.

**This should be a separate commit/deployment from the EXPAND phase.**

---

## Recovery / Rollback

If Phase 2 causes problems:

- **Do NOT attempt to strip V2 fields back to V1.** That would destroy any M3
  campaign data (players, wizards, seats) that may have been created.
- Use the repository's standard full-fidelity recovery procedure:
  restore from the Convex export taken before the migration. See
  [Recovery Runbook](recovery-runbook.md).
- Alternatively, apply a forward fix: diagnose and correct the specific issue
  while preserving the V2 state.

---

## Checklist

- [x] Full Convex export taken and verified
- [x] Disposable deployment created with realistic V1 campaign data
- [x] Deployed EXPAND to disposable deployment
- [x] Ran migration on disposable — confirmed `migrated: true`
- [x] Ran verifier on disposable — confirmed `status: "valid"`
- [x] Verified M3 commands work on disposable
- [x] Verified M2 commands (moveMonth, undo, redo) still work on disposable
- [x] Defects found during rehearsal corrected before merge
- [x] Human approval obtained for production migration
- [x] Ran `adminMigration:migrateCurrentStateToV2 --prod`
- [x] Ran `verifyMigration:verifyMigration --prod` — status "valid"
- [ ] Verified M3 + M2 commands work in production — intentionally not performed;
      command paths were exercised on the disposable integration deployment and
      production verification used a read-only smoke.
- [x] Retained dev deployments reseeded from production V2 export
- [x] Disposable rehearsal/preview deployments removed
- [x] CONTRACT code implemented (validator narrowed, tests added)
- [x] CONTRACT PR reviewed and merged
- [x] CONTRACT deployed to production
- [x] Post-CONTRACT verifier re-run on production
