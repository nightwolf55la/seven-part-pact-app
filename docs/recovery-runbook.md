# Recovery Runbook

**Status:** Accepted  
**Applies Beginning With:** Milestone 2G Phase 2

This is an operational runbook for campaign state recovery. It complements
[architecture/state-model.md](architecture/state-model.md) and
[persistence-evolution-contract.md](persistence-evolution-contract.md).

---

## Safety Rule

**If corruption is suspected: STOP MUTATING THE AFFECTED DEPLOYMENT.**

Do not attempt fixes, migrations, or recovery directly against valuable
production data. Take an export first, then work on a disposable clone.

---

## Recovery Mechanism Distinctions

### Undo / Redo

- Interactive navigation through committed game states.
- Creates new audit revisions; history remains immutable.
- Uses compare-and-set (`expectedRevision`).
- Not a disaster-recovery mechanism.

### Checkpoint

- In-campaign bookmark pointing to an existing historical logical state.
- Restore creates a **new** revision; later revisions are preserved.
- Not a disaster backup — it is a convenience bookmark within live history.

### Portable JSON Backup

- Contains **current** `CampaignState` only.
- No historical revisions, events, snapshots, or checkpoint metadata.
- Integrity protected by SHA-256 over canonical JSON.
- Importing creates a new undoable revision on the destination campaign.
- Source campaign identity is provenance only; it does not replace the
  destination campaign's identity.

> **M4 Note:** After V3 retirement, portable backups containing V1 or V2
> CampaignState are no longer importable. The import path rejects unsupported
> schema versions with a clear error. Only supported CampaignState schema
> versions are importable. At the M4 baseline, the supported version is V3.

### Convex Operational Export

- Deployment-level export of all persisted data.
- Includes history, snapshots, checkpoint metadata, revision records, events,
  backup-import history, etc.
- Primary disaster-recovery and cloning mechanism.
- Taken via the Convex dashboard or CLI export tooling.

---

## Procedures

### A. Accidental Gameplay Change

1. Use Undo in the UI to navigate back to the prior logical state.
2. Undo creates a new revision; the accidental change remains in audit history.
3. If the change is complex, verify the resulting state with the campaign health
   verifier (see below).
4. If Undo is insufficient, consider restoring a checkpoint or importing a
   portable backup.

### B. Restoring a Checkpoint

1. Select the checkpoint in the UI and restore it.
2. This creates a new revision whose snapshot is the checkpoint's source state.
3. Later revisions remain preserved in immutable history.
4. Verify the resulting state if the checkpoint is old or spans a schema change.

### C. Portable Backup Recovery

1. Obtain the portable JSON backup file (`.json`).
2. Use the import flow in the UI.
3. The import validates the backup format, state schema, ruleset, and complete
   resulting state before committing.
4. A rejected import performs **zero** persistent changes.
5. A successful import creates a new undoable revision on the destination
   campaign.

### D. Suspected Corruption

1. **Stop mutations** on the affected deployment.
2. Take a Convex operational export if possible.
3. Run the campaign health verifier:
   ```
   npx convex run verifyMigration:verifyMigration '{}' --deployment <deployment>
   ```
   `verifyMigration` is migration-era naming but currently serves as the
   **permanent explicit campaign-health verifier**. Do not be misled by the
   name; it verifies the full campaign state, history control, checkpoints,
   and backup-import history.
4. Preserve the verifier output and the backup/export.
5. Reproduce and recover on a **disposable** deployment, never directly against
   valuable production data.
6. If the verifier reports invalid status, history-control errors, checkpoint
   errors, or any error arrays, treat the campaign as corrupted and proceed to
   catastrophic recovery.

### E. Catastrophic Deployment / Data Loss

1. Obtain the most recent Convex operational export.
2. Provision a fresh Convex deployment.
3. Import/restore the operational export into the fresh deployment.
4. Run the campaign health verifier on the restored deployment.
5. If the verifier passes, repoint the application to the restored deployment.
6. If no operational export exists, fall back to the most recent portable JSON
   backup and import it into a fresh campaign.

### F. Risky Persistence Release / Migration Rehearsal

1. Take a Convex operational export of the target deployment.
2. Create or identify a disposable clone of the deployment.
3. Run the migration or persistence change on the disposable clone.
4. Run the campaign health verifier before and after the change.
5. If the verifier becomes invalid at any point, **stop** — do not proceed to
   production.
6. Only after the disposable rehearsal passes, consider the production change,
   with a fresh operational export taken immediately before.

---

## Campaign Health Verifier

The explicit campaign-health verifier is:

```
verifyMigration:verifyMigration
```

The name is historical (from the v0.1 migration era) but it is now the
**permanent** verifier. It is **not** being renamed.

Conceptual invocation:

```
npx convex run verifyMigration:verifyMigration '{}' --deployment <deployment>
```

Replace `<deployment>` with the specific deployment you intend to verify.
Before running any command with `--deployment`, visually verify its target.

Healthy output has:

- `status`: valid;
- history control: valid;
- checkpoint verification: valid;
- no error arrays populated.

Backup-import history is included in verification.

---

## Backup Discipline

### When to take a Convex operational export

Before:

- persistence or schema releases;
- explicit migrations;
- risky recovery work.

### Ongoing policy (once production is real)

- Retain a handful of recent operational exports.
- Encourage portable user backups at meaningful campaign milestones.
- Occasionally rehearse restore/import on a disposable deployment.

Do not prescribe enterprise backup infrastructure. Do not store production
credentials or deploy keys in Bolt.

### What not to commit

Never commit to source control:

- `.env` files;
- backup ZIP or JSON files;
- temporary import payloads;
- secrets or deploy keys.
