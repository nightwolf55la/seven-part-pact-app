# V1 to V2 Campaign State Migration — Staged Deployment Procedure

**Status:** Ready for rehearsal  
**Prerequisite:** This document, all M3 code changes, and the EXPAND-phase schema
must be deployed before running the migration.

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

1. Deploy the M3 branch to a **disposable** Convex deployment:

   ```
   npx convex deploy --deployment <DISPOSABLE_DEPLOYMENT>
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
  --deployment <DISPOSABLE_DEPLOYMENT>
```

Verify the response:
- `{ migrated: true, campaignId: "...", campaignRevision: N, schemaVersion: 2 }`
  means migration succeeded.
- `{ migrated: false, ... }` means the state was already V2 (idempotent).

Run the campaign health verifier:

```
npx convex run verifyMigration:verifyMigration \
  --deployment <DISPOSABLE_DEPLOYMENT>
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

- [ ] Full Convex export taken and verified
- [ ] Disposable deployment created with realistic V1 campaign data
- [ ] Deployed EXPAND to disposable deployment
- [ ] Ran migration on disposable — confirmed `migrated: true`
- [ ] Ran verifier on disposable — confirmed `status: "valid"`
- [ ] Verified M3 commands work on disposable
- [ ] Verified M2 commands (moveMonth, undo, redo) still work on disposable
- [ ] Human approval obtained for production migration
- [ ] Ran `adminMigration:migrateCurrentStateToV2 --prod`
- [ ] Ran `verifyMigration:verifyMigration --prod` — status "valid"
- [ ] Verified M3 + M2 commands work in production
- [ ] (After all environments) CONTRACT: narrowed validator and deployed
