# V1 to V2 Campaign State Migration — Staged Deployment Procedure

**Status:** Ready for execution  
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
  (via `validateAnyCampaignState` + `migrateToCurrentVersion`).
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
2. **Disposable rehearsal:** Deploy the EXPAND branch to a disposable/preview
   Convex deployment and rehearse the full procedure end-to-end before touching
   production.

---

## Phase 1: EXPAND (deploy from branch — no merge to main required)

**What ships:** Schema validator accepts both V1 and V2 for the campaign record's
`state` field (`anyCampaignStateValidator`). M3 commands fail closed on V1 state.
Admin migration function is available but not yet invoked.

**Validator (current in `convex/validators.ts`):**

```ts
export const newCampaignRecordValidator = v.object({
  campaignKey: v.literal("default"),
  campaignId: v.string(),
  campaignRevision: v.number(),
  state: anyCampaignStateValidator, // V1 or V2
});
```

**Deploy action:**

1. Deploy the M3 branch to a **disposable or preview** Convex deployment first.
2. Verify deployment succeeds (Convex schema push does not reject existing data).
3. M2 commands (move_month, undo, redo, checkpoint) continue to work normally —
   they use `validateCampaignState` on the current campaign document, which must
   be V2 post-migration, and `validateAnyCampaignState` + `migrateToCurrentVersion`
   on historical snapshots.

**Important:** During the EXPAND window before migration, if the environment
still has V1 current state, M3 commands will return `MIGRATION_REQUIRED`. M2
commands that only read `campaign.state` directly (moveMonth) will also fail
because `validateCampaignState` rejects V1. This is intentional fail-closed
behavior. Proceed immediately to Phase 2.

---

## Phase 2: MIGRATE (controlled maintenance window)

**What happens:** The admin migration function atomically upgrades the current
campaign document from V1 to V2.

**Procedure:**

1. Confirm the Convex export from the pre-migration step is valid.
2. Invoke the internal mutation via Convex Dashboard (Functions tab → Internal
   Functions → `adminMigration:migrateCurrentStateToV2` → Run):

   ```
   npx convex run --prod adminMigration:migrateCurrentStateToV2
   ```

   (Or via Dashboard for environments without CLI access.)

3. Verify the response:
   - `{ migrated: true, campaignId: "...", campaignRevision: N, schemaVersion: 2 }`
     means migration succeeded.
   - `{ migrated: false, ... }` means the state was already V2 (idempotent).

4. Run the campaign health verifier:

   ```
   npx convex run verifyMigration:verifyMigration
   ```

   Expect `{ status: "valid", ... }`.

5. Verify M3 commands now work:
   - `getCampaignSetup` query returns setup data.
   - `addPlayer` / `createWizard` commands succeed.

6. Verify M2 commands still work (move_month, undo, redo).

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
once every applicable environment is confirmed V2 — not an optional permanent
weakening.

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

**This should be a separate commit/deployment from the EXPAND phase** if they
cannot both be safely represented in one deploy.

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

Phase 1 (EXPAND) is always safe to deploy and revert since it only widens the
validator.

---

## Checklist

- [ ] Full Convex export taken and verified
- [ ] Rehearsed on disposable/preview deployment
- [ ] Deployed EXPAND to target environment
- [ ] Ran `adminMigration:migrateCurrentStateToV2`
- [ ] Ran `verifyMigration:verifyMigration` — status "valid"
- [ ] Verified M3 commands work
- [ ] Verified M2 commands (move_month, undo, redo) still work
- [ ] (After all environments) CONTRACT: narrowed validator and deployed
