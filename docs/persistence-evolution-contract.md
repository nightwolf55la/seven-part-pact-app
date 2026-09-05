# Persistence Evolution Contract

**Status:** Accepted
**Applies Beginning With:** Milestone 2G Phase 2

This is a practical developer contract for evolving persistent campaign state.
It complements [architecture/state-model.md](architecture/state-model.md).

---
## A. CampaignState vs Operational Metadata

`CampaignState` contains canonical game-world facts. Valid additive
`CampaignState` fields automatically participate in:

- authoritative persistence (canonicalCommit);
- full snapshots;
- Undo;
- Redo;
- Checkpoint Restore;
- portable Backup;
- portable Import;
- canonical full-state equality.

This participation is **generic** and MUST remain generic. Do not special-case
individual fields in the commit/snapshot/backup/equality machinery.
Operational metadata **outside** `CampaignState` (revision records, event
records, snapshots, checkpoint records, undo/redo cursor, backup-import
history, verifier output, etc.) must explicitly define, per record type:

- lifecycle (creation, immutability, deletion policy);
- Undo/Redo semantics;
- checkpoint semantics;
- portable-backup semantics (included or excluded);
- operational-backup semantics (included in Convex export);
- verifier behavior;
- versioning where appropriate.
If a new operational record type is introduced, document its semantics here or
in a linked section before relying on it.

---
## B. CampaignState Schema Evolution

Adding or changing the persisted shape or meaning of `CampaignState` is **not**
automatically compatible with old data. Before merging such a change, explicitly
consider:
- `stateSchemaVersion` — should it increment?
- Convex validators — do they accept old and new shapes?
- `validateCampaignState` — does it accept the new shape and reject invalid ones?
- old snapshots — can historical snapshots still be read/restored?
- Undo/Redo into historical snapshots — does navigation still work?
- Checkpoint Restore from historical snapshots — does migration apply?
- old portable backups — can they still be imported?
- explicit migration path — is one needed, and is it documented?
- verifier support — does `verifyMigration:verifyMigration` cover the new shape?
Rules:

- No silent read migration. Reads must not rewrite persisted data.
- No silent write migration. Writes must not opportunistically rewrite old data.
- No deploy-time gameplay-data migration. Gameplay state changes go through
  canonicalCommit as normal revisions.

When in doubt, increment `stateSchemaVersion` and add an explicit, tested
migration. See [architecture/state-model.md](architecture/state-model.md)
sections 18 and 28.
### M4 V3 Boundary Exception

M4 introduces V3 and retires V1/V2 as a one-time pre-release compatibility
break. This means:

- V3 is the minimum supported version for current AND historical state.
- No V1->V3 or V2->V3 migration path is implemented.
- V1/V2 snapshots, checkpoints, and portable backups fail closed.
- Pre-M4 campaign data are explicitly disposable.
- The retired `move_month`, `legacy_month_change`, and `month_changed`
  identifiers are not part of the active current-runtime/new-write contract.
  Historical command/event shapes and helpers may remain readable internally
  where required for immutable audit/history compatibility or historical
  migration/analysis tooling.
- This does NOT establish a precedent for future casual retirement.
- Future evolution from V3 returns to the normal rules above.
See [M4 Shared Monthly Play Loop](m4-shared-monthly-play-loop.md) for the
full rationale and retirement details.

---
## G. Campaign Deletion Contract

Campaign deletion is **persistence infrastructure outside CampaignState**.
The following rules apply to any campaign-deletion mechanism:
- Deletion is administrative, **eventless**, **revisionless**, and
  **non-Undo-able**. It does not produce a revision, event, or snapshot.
- A **durable deletion barrier** (a persisted operational marker distinct
  from `CampaignState`) is established before removing campaign-owned data.
- While the barrier exists, normal gameplay writes, recovery mutations
  (Undo/Redo, checkpoint restore), portable backup import, and Start New
  Campaign are **rejected**.
- Campaign-owned tables must support **efficient campaign-scoped** bounded
  cleanup (by `campaignId` or equivalent index). Cleanup must not depend on
  unbounded table scans.
- Cleanup proceeds in **bounded, idempotent batches**. Each batch is safe to
  re-run for the same table and campaign.
- Cleanup is **resumable**. If interrupted, the durable marker survives
  redeploy/restart and cleanup resumes without the initiating
  browser/session.
- Before finalization, **verify** that every campaign-owned collection is
  empty for that campaign.
- The **canonical campaign** record is deleted **near the end**.
- The **deletion marker** is removed **last**. Its removal implies complete
  verified absence of the campaign-owned graph.
- New campaign-owned persisted collections introduced in future schema
  evolution must be included in deletion enumeration and verification.
- Deletion mechanics remain **generic and Seven-Part-Pact-agnostic**.
---
## C. Portable JSON Contract

`CampaignState` must remain composed exclusively of portable JSON values:

- `null`
- booleans
- finite numbers
- strings
- arrays
- plain objects

Do **not** introduce into `CampaignState` without an explicit architecture
change:

- `undefined`
- `bigint`
- `Map`
- `Set`
- functions
- custom class instances
- non-finite numbers (`NaN`, `Infinity`, `-Infinity`)
This ensures snapshots, backups, and Convex serialization remain lossless and
deterministic. Canonical JSON ordering (see `canonical-json.ts`) must continue
to produce stable hashes for backup integrity.

---
## D. New Command/Event Checklist

For every new persisted gameplay command, consider:
- [ ] command type defined in the shared command union (single source of truth);
- [ ] logical-state vs history-navigation classification
      (gameplay vs undo/redo/restore/import);
- [ ] stable request fingerprint / idempotency policy (`commandId`);
- [ ] `expectedRevision` / CAS if context-sensitive;
- [ ] versioned event (discriminated union, independent `event.version`);
- [ ] Convex validators for the command and resulting events;
- [ ] canonicalCommit validation (state + events) before persistence;
- [ ] snapshot produced for the new revision;
- [ ] history-control behavior (undo/redo cursor impact);
- [ ] verifier handling (does `verifyMigration:verifyMigration` cover it?);
- [ ] Activity History handling (normalized read model);
- [ ] automated tests (domain logic + persistence boundary where practical).
---
## E. Invariant

Clients send intent. The server decides authoritative resulting state.

No normal gameplay write bypasses `canonicalCommit`. Every accepted command
produces exactly one revision, one snapshot, and one or more ordered events,
committed atomically. A failed transaction performs zero persistent writes.

---
## F. Convex Generated-Code Policy

`convex/_generated/` is committed source generated by Convex tooling.

- Do NOT manually edit files under `convex/_generated/`.
- Do NOT require a Convex deployment key merely to regenerate it in CI.

After changes affecting Convex function/schema generated types:

1. run `npx convex codegen` locally;
2. inspect the generated diff;
3. commit the generated changes together with the source change.
CI's TypeScript/build gate then verifies that source compiles against the
committed generated API. If `npm run build` fails in CI with a generated-API
mismatch, run `npx convex codegen` locally and commit the result.
