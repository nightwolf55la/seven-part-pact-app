# Persistence Release Checklist

**Status:** Accepted  
**Applies Beginning With:** Milestone 2G Phase 2

Short enough to actually use. Pick the category that matches the change.

---

## A. UI-only / Non-persistent Release

- [ ] CI passes.
- [ ] Preview smoke test.

No operational backup ceremony required.

---

## B. Additive Gameplay / Persistent-state Feature

- [ ] CI passes.
- [ ] Persistence-evolution checklist reviewed
      ([persistence-evolution-contract.md](persistence-evolution-contract.md)
      section D).
- [ ] Validator / state changes covered by automated tests.
- [ ] Recovery mechanisms considered (Undo/Redo, checkpoint, backup import).
- [ ] Small real integration test if a storage boundary changed.
- [ ] If `CampaignState` structure changes, explicitly determine whether
      `stateSchemaVersion` should increment.

Do **not** automatically increment `stateSchemaVersion` for every new additive
field. The decision depends on compatibility with already-persisted historical
state. If old snapshots/backups can still be read and restored without
ambiguity, an increment may not be required. If the meaning of an existing
field changes, increment and add an explicit migration.

---

## C. CampaignState Schema / Semantic Evolution

- [ ] Explicit compatibility / migration design documented.
- [ ] Historical snapshot compatibility verified.
- [ ] Undo/Redo/Checkpoint impact analyzed.
- [ ] Portable backup compatibility verified.
- [ ] Convex operational export taken before release.
- [ ] Disposable rehearsal performed.
- [ ] Campaign health verifier run after the change.

---

## D. Persistence Migration / Recovery Change

Strongest procedure:

- [ ] Convex operational export taken.
- [ ] Exact or relevant disposable clone prepared.
- [ ] Migration / recovery rehearsal performed on the clone.
- [ ] Verifier run before and after.
- [ ] Rollback / recovery plan documented.
- [ ] **Stop if the verifier becomes invalid at any point.**

---

## Manual Test Policy

Manual testing is for **integration boundaries** that automated tests cannot
fully prove.

Worth manually testing:

- real Convex persistence / serialization;
- true concurrent transactions;
- browser file download / upload (backup export/import);
- deployment / environment wiring;
- schema deployment;
- explicit migration on realistic cloned data;
- refresh / persistence round-trip.

Do **not** manually repeat:

- malformed-input matrices;
- every command ID permutation;
- every Undo/Redo sequence;
- every validator case;
- other behavior already thoroughly covered by automated tests.

Use the smallest manual test that proves the unique real boundary.
