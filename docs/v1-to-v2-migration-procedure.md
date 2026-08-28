# V1 to V2 Campaign State Migration — Staged Deployment Procedure

**Status:** Ready for execution  
**Prerequisite:** This document, all M3 code changes, and the EXPAND-phase schema
must be merged and deployed before running the migration.

---

## Background

Campaign state evolved from V1 (calendar only) to V2 (calendar + configuration
+ players + wizards + pactSeats). Historical snapshots remain V1 indefinitely;
only the authoritative **current** campaign document must be V2 for M3 commands
to function.

### Design Principles

- Current-state migration is **explicit and admin-only**.
- Historical-state in-memory migration is allowed (at read boundaries).
- Ordinary reads/writes **never** silently migrate authoritative current state.
- M3 commands/queries fail closed with `MIGRATION_REQUIRED` until the admin
  migration has been run.

---

## Phase 1: EXPAND (deploy)

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

1. Merge the M3 PR containing all code changes.
2. Deploy to **Preview/Development** environment first.
3. Verify deployment succeeds (Convex schema push does not reject existing data).
4. M2 commands (move_month, undo, redo, checkpoint, backup) continue to work
   normally regardless of V1/V2 state.
5. M3 commands return `MIGRATION_REQUIRED` error until Phase 2 completes.

---

## Phase 2: MIGRATE (explicit admin action)

**What happens:** The admin migration function atomically upgrades the current
campaign document from V1 to V2.

**Procedure:**

1. **Disposable environment first:** Run on a cloned or development environment
   before touching production.
2. Invoke the mutation via Convex Dashboard or CLI:

   ```
   npx convex run adminMigration:migrateCurrentStateToV2
   ```

3. Verify the response:
   - `{ migrated: true, campaignId: "...", campaignRevision: N, schemaVersion: 2 }`
     means migration succeeded.
   - `{ migrated: false, ... }` means the state was already V2 (idempotent).

4. After migration, verify M3 commands now work:
   - `getCampaignSetup` query returns setup data.
   - `addPlayer` / `createWizard` commands succeed.

5. Verify M2 commands still work (move_month, undo, redo).

**Migration guarantees:**
- `campaignId` and `campaignRevision` are preserved exactly.
- Historical snapshots, audit records, checkpoints are NOT touched.
- No new revision is created; this is infrastructure bookkeeping only.
- Idempotent: safe to run multiple times.
- Does NOT create audit events or change history control.

---

## Phase 3: CONTRACT (optional follow-up deploy)

**What changes:** Narrow the campaign record validator back to V2-only so the
schema enforces V2 at the persistence layer.

**Procedure:**

1. Confirm migration has completed on ALL environments (development, preview,
   production) that share this schema.
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

**This phase is optional but recommended.** It adds defense-in-depth: any future
code bug that tries to write V1 state to the campaign document will be rejected
at the validator level.

---

## Rollback

If Phase 2 causes problems:

- The migration is a simple field patch. To reverse it, write a
  `revertCurrentStateToV1` admin mutation that strips V2-only fields and sets
  `schemaVersion: 1`. This should never be needed since the migration only adds
  empty collections and null configuration.
- Phase 1 (EXPAND) is always safe to deploy and revert — it only widens the
  validator.

---

## Checklist

- [ ] M3 code merged with EXPAND-phase schema
- [ ] Deployed to development/preview
- [ ] Verified existing M2 commands still work
- [ ] Ran `adminMigration:migrateCurrentStateToV2` on development
- [ ] Verified M3 commands work on development
- [ ] Ran migration on preview (if applicable)
- [ ] Ran migration on production
- [ ] Verified M3 commands work on production
- [ ] (Optional) CONTRACT: narrowed validator and deployed
