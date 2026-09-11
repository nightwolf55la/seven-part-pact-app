# M5.3 — Knowledge & Compendium

**Status:** IN PROGRESS — design approved; Body A structural foundation implemented; Body B not started  
**Schema:** CampaignState V5 remains PRE-ACTIVATION. This work adds Lore in place. It does not create V6.

## Purpose

M5.3 establishes a shared durable model for mutable Lore / Compendium knowledge used across actual Seven-Part-Pact systems.

Lore is durable mutable human-readable game information. It is not:

- Sorcerer numeric Knowledge;
- a normalized objective fact graph;
- a generic wiki/notes platform;
- Truth-Watcher precedent/rulings notes;
- a generic visibility/ACL system;
- duplicate audit/revision history;
- a generic TTRPG entity framework.

Changing Lore prose never automatically mutates structural game state, numeric Elements, Orrery calculations, spell mechanics, Temple/Clan/Gate status, or other Domain mechanics.

## SOURCE / INFERENCE / APPLICATION DESIGN

When rules/source and application policy differ, keep the distinction explicit:

- **SOURCE** — what the written game states.
- **INFERENCE** — what reasonably follows but is not explicit.
- **APPLICATION DESIGN** — what the application deliberately represents, enforces, or defers.

## Exact ruleset baseline

The sole persisted source-Lore compatibility identity is `CampaignState.ruleset.id/version`.

Current baseline:

```text
id      = seven_part_pact_draft4
version = 1
```

There is no `loreVersion`, catalog version, content hash, or other persisted Lore compatibility field.

Every read of persisted campaign Lore resolves the exact catalog for the campaign's stored ruleset. It never falls back to `CURRENT_RULESET`, the latest catalog, or any implicit baseline.

Unsupported ruleset/baseline fails closed.

A golden catalog digest may be used in deterministic tests as a regression alarm. It is not a persisted compatibility identity.

Do not mutate the semantic Draft4/v1 catalog under the same ruleset key after persisted use without a later explicit Master compatibility/disposal decision. V5 being PRE-ACTIVATION does not by itself make two otherwise-identical same-key saved artifacts distinguishable.

Exact source collection IDs, source-entry IDs, membership, normalized source text, printed order, and subject/binding definitions live in `shared/domain/lore-catalog-collections.ts`.

The Mariner delegation/context mapping lives in `shared/domain/lore-state.ts`.

Exact ruleset catalog lookup and the non-persisted semantic catalog manifest live in `shared/domain/lore-catalog.ts`.

The delegation mapping is baseline-semantic Draft4/v1 data and is guarded by deterministic regression coverage. It is not a persisted compatibility identifier.

## No staged source activation

There is no source-entry activation model.

Do not introduce `initial` / `addable_template` roles, `activatedSourceEntries`, reveal/activate state, activation commands, or activation validators.

Every listed Draft4/v1 source entry is part of that fixed source collection baseline. Runtime campaign state for an instantiated source collection stores only:

- its concrete stable subject binding;
- sparse source-entry current-text overrides;
- ordered campaign-authored additions.

Baseline membership does **not** assert objective truth, truth priority, universal Wizard knowledge, visibility, or player permission.

The Faustian Hells and Necromancer History are included exactly as printed baseline, including attribution and uncertainty/context.

## Collections versus subjects

Keep these separate:

1. **Static source collection availability** — catalog definition belonging to an exact ruleset baseline.
2. **Instantiated source collection** — persisted campaign instance created only on first authoritative write/use (Body B).
3. **Stable subject binding** — concrete subject persisted on first authoritative use and never silently retargeted.
4. **Campaign-created collection** — one canonical campaign-authored collection per exact eligible campaign subject.
5. **Presentation/editing context selection** — pure derived selection; never a persisted active-pointer.

Source collections and campaign collections are not collapsed into one generic CRUD/wiki record.

Identity:

- Source collection identity is a stable `SourceLoreCollectionId`.
- One instantiated campaign instance per source collection ID.
- `SourceLoreEntryId` (`e01`, `e02`, …) is scoped to its source collection. The durable source-entry reference is `(sourceCollectionId, sourceEntryId)`.
- Campaign collection identity is a generated `LoreCollectionId` (`lcol_<uuid>`).
- Campaign-authored `LoreEntryId` (`lore_<uuid>`) is globally unique across campaign-authored Lore entries in CampaignState.

## Source collection lifecycle

Empty or partially initialized campaigns are valid. Whole-state validation validates instantiated references. It does not try to bind or resolve every static catalog definition.

A static source definition may be previewed without persistence. Preview is distinct from a bound campaign collection and must never cause read-time state creation or repair.

If a source-backed context is unavailable or ambiguous at first use, fail with zero persisted change. Do not silently create a generic campaign collection fallback.

No read-time creation, repair, rebinding, or migration.

## Stable first-use binding

Static source definitions describe how a source context resolves to a campaign subject. The actual concrete subject is persisted on first authoritative write (Body B) and never rebound merely because names, ownership, home pointers, Wizard succession, or status change.

Use existing canonical mappings/IDs. Never bind by display-name matching.

Implemented binding strategies:

| Family | Strategy | Canonical mapping |
|---|---|---|
| Sorcerer Spyrholm | `sorcerer_spyrholm_isle` | `sorcerer.spyrholmIsleId` |
| Sorcerer Tower | `sorcerer_tower_place` | `sorcerer.towerPlaceId` |
| Other owner Isles | `wizard_home_isle` | Pact-seat Wizard `homeIsleId` at first bind |
| Other owner Sanctums | `wizard_sanctum_place` | Pact-seat Wizard `sanctumPlaceId` at first bind |
| Mariner Isles, including Far Reach and delegated Isles | `mariner_board_isle` | `MarinerBoardIsleState.worldIsleId` |
| Mariner Ship | `mariner_ship_place` | `mariner.shipPlaceId` |
| Necromancer Gates | `necromancer_builtin_gate` | existing stable Gate identity |
| Hierophant Temples | `hierophant_starting_temple` | existing stable Temple identity |
| Warlock Clans | `warlock_clan` | existing stable Clan identity |
| Elements | `element` | existing `ElementId` |
| Distant directions | `mariner_horizon` | existing `MarinerHorizonCardinalGroupId` |
| Finite source topics | `source_topic` | exact registered topic ID |

An ownership/home association is used only to locate the intended concrete ID on first binding when no stronger established mapping exists. The persisted collection then retains that concrete ID forever and does not re-resolve dynamically on reads.

Before required runtime identity exists:

- the source definition may be previewed statically;
- binding resolution reports `not_ready`;
- CampaignState remains valid if the collection was never instantiated.

## Subject union

Approved consumers only:

- `isle` -> `IsleId`
- `place` -> `PlaceId` (including legitimate `placement: unspecified`; Place is not a universal entity abstraction)
- `necromancer_gate` -> stable `NecromancerGateId`
- `hierophant_temple` -> stable `HierophantTempleId`
- `warlock_clan` -> stable `WarlockClanId`
- `element` -> existing `ElementId`
- `pact_domain` -> `PactSeatId` for campaign-created whole-Domain Lore
- `mariner_horizon` -> existing `MarinerHorizonCardinalGroupId`
- `source_topic` -> finite static source-topic ID from the Draft4/v1 catalog

Campaign-created Isles, Places, and Necromancer Gates may acquire canonical campaign collections even when they have no printed source collection.

Do not add generic Wizard/Denizen/spell/entity/actor subjects without a concrete source consumer in this contract.

## Effective Lore

For an instantiated source collection:

1. use `CampaignState.ruleset` to resolve the exact supported source baseline;
2. locate the source collection by ID;
3. verify the persisted concrete binding matches the collection's approved subject kind/meaning;
4. return baseline entries in fixed order, substituting sparse override text in place;
5. append campaign-authored additions in persisted order.

No reordering or deletion subsystem.

For an uninstantiated source collection, a pure static preview may return the baseline definition for the campaign's exact supported ruleset but must not create/bind campaign state.

For campaign-created collections, return persisted campaign entries in order.

A read never creates or repairs state.

Body A does not add a dedicated Convex query. Existing CampaignState reads already expose the new `lore` field.

## Mariner Present / Silent / Absent / null

**SOURCE:** Mariner Part VI says, for another Wizard's Isle, to use the Mariner's presented Lore if that Wizard is absent, and to trust the owner's Lore when that Wizard is present. The source does not define Silent behavior or a database merge policy.

**APPLICATION DESIGN:** derive the selected context from actual Pact-seat status only:

```text
present -> owner source context
silent  -> owner source context
absent  -> Mariner delegated source context
null    -> no status-based delegation decision
```

Never treat these as equivalent: Silent, Absent, null status, missing Wizard, uninitialized Domain, disconnected/browser-absent player.

Selection is distinct from availability. If the selected collection cannot be bound/read because prerequisites are absent, return unavailable/not-ready. Never fall back to the other collection.

The owner and Mariner source collections remain separate even when both bind to the same `IsleId`.

No persisted active collection pointer. No merge, transfer, reseed, copy, erase, or reconciliation on status changes.

Far Reach has only the Mariner owner source collection `mariner.home.far_reach`. Part VI points back to it. There is no second delegated Far Reach collection.

## Source discrepancies

Preserve these explicitly. Do not invent a Marble Isle entity. Do not reopen the established Sage-atoll mapping.

- Mariner Part VI Spyrholm owner-present wording says to trust the Sorcerer's Lore of **"the Marble Isle"**. Application maps `mariner.delegated.spyrholm` to canonical Spyrholm.
- Mariner Part VI uses **"The Starlit Atoll"** and **"If the Watcher is present"** in the Sage delegation. Application uses the established `sage_atoll` mapping and actual Sage Pact-seat status.
- Sage owner Lore calls the Isle **Moonlit Atoll**. Collection `sage.home.moonlit_atoll` preserves that owner wording.

## Validation invariants

Validation rejects representative structural corruption, including:

- duplicate instantiated `SourceLoreCollectionId`;
- instantiated unknown source collection for the campaign's exact ruleset;
- subject kind incompatible with that source definition;
- malformed/dangling concrete instantiated subject reference;
- duplicate sparse override for the same source entry;
- override referencing a nonexistent/wrong source entry;
- blank override or campaign-authored entry text;
- duplicate `LoreCollectionId`;
- duplicate canonical campaign collection for the exact same subject;
- malformed/dangling campaign subject;
- duplicate campaign-authored `LoreEntryId` anywhere in Lore state;
- invalid finite source topic / cardinal / static identity.

Validation does **not** judge fictional truth, contradiction, plausibility, prose meaning, or whether two current Lore entries disagree.

Empty and partial campaign setup remain valid. Instantiated collections must contain and validate their actual concrete binding.

Generic persistence already operates on complete CampaignState. Lore is not special-cased in `canonicalCommit`, snapshots, Undo/Redo, checkpoints, backup/import, audit, or full-state equality.

## Source inventory

Committed Draft4/v1 coverage:

- **99** source collections
- **384** nonempty fixed source entries
- **4** zero-baseline source contexts (`mariner.distant.north|east|south|west`)

Subject-kind distribution: isle 21, place 7, necromancer_gate 11, hierophant_temple 5, warlock_clan 5, element 4, mariner_horizon 4, source_topic 42, pact_domain 0 source collections.

Exact entry IDs and normalized source text are the in-repository baseline in `shared/domain/lore-catalog-collections.ts`. Do not reconstruct that prose from PDFs.

### Owner home / sanctum

| Collection | Source | Kind | Binding |
|---|---|---|---|
| `necromancer.home.graven_isle` | Codex 1, pp. 10-11, Secrets of the Graven Isle | isle | Wizard home `necromancer` |
| `necromancer.sanctum.crypt` | Codex 1, pp. 10-11, The Necromancer's Crypt sits | place | Wizard sanctum `necromancer` |
| `hierophant.home.ishana` | Codex 2, pp. 11-12, Secrets of Ishana | isle | Wizard home `hierophant` |
| `hierophant.sanctum.hall` | Codex 2, pp. 11-12, The Hierophant's Hall sits | place | Wizard sanctum `hierophant` |
| `warlock.home.halcyon_isles` | Codex 3, pp. 10-11, Secrets of the Halcyon Isles | isle | Wizard home `warlock` |
| `warlock.sanctum.keep` | Codex 3, pp. 10-11, The Warlock's Keep is | place | Wizard sanctum `warlock` |
| `mariner.home.far_reach` | Codex 4, pp. 10-11, Secrets of Far Reach | isle | Mariner board `far_reach` |
| `mariner.sanctum.ship` | Codex 4, pp. 10-11, The Mariner's Ship docks | place | `mariner.shipPlaceId` |
| `faustian.home.scuttleport` | Codex 5, pp. 10-11, Secrets of Scuttleport | isle | Wizard home `faustian` |
| `faustian.sanctum.bilgewater_inn` | Codex 5, pp. 10-11, The Faustian's Inn sits | place | Wizard sanctum `faustian` |
| `sage.home.moonlit_atoll` | Codex 6, pp. 10-11, Secrets of the Moonlit Atoll | isle | Wizard home `sage` |
| `sage.sanctum.grotto` | Codex 6, pp. 10-11, The Sage's Grotto | place | Wizard sanctum `sage` |
| `sorcerer.home.spyrholm` | Codex 7, pp. 11-12, Secrets of Spyrholm | isle | `sorcerer.spyrholmIsleId` |
| `sorcerer.sanctum.tower` | Codex 7, pp. 11-12, The Sorcerer's Tower sits | place | `sorcerer.towerPlaceId` |

### Necromancer Gates and History

Gates `necromancer.gate.{amber,bronze,lead,ivory,antimony,marching,churning,weeping,howling,deep,terminus}` bind to the matching builtin Gate identity. Codex 1, pp. 40-44.

History topics `necromancer.history.{present_age,restoration,age_of_darkness,age_of_silks,golden_age,foundation,tragedies,time_before}` are finite `source_topic` IDs `history.*`. Codex 1, pp. 45-51.

### Hierophant Temples and faiths

Temples `hierophant.temple.{hestar,krolis,notor,zephon,ushin}` bind to starting Temple IDs. Codex 2, pp. 44-46.

Faiths `hierophant.faith.{western_pyrism,urite_polytheism,hecarian_philosophism,faith_of_the_nameless,druji_pseudofaith,ymosites}` are `source_topic` IDs `faith.*`. Codex 2, pp. 51-54.

### Warlock Clans and foreign powers

Clans `warlock.clan.{uroch,lark,caravel,waine,ix}` bind to Clan IDs. Codex 3, pp. 46-48.

Foreign topics `warlock.foreign.{triarchy_of_ur,elpenors_kingdom,hrotingmen,druj_lands}` are `source_topic` IDs `foreign.*`. Codex 3, pp. 48-50. These are not force-mapped to Mariner external-land identity.

### Mariner delegated, Isles, and distant directions

Delegated Isles `mariner.delegated.{graven_isle,ishana,halcyon_isles,scuttleport,spyrholm,sage_atoll}` bind through Mariner board-Isle World IDs. Codex 4, pp. 45-47.

Other Mariner Isles `mariner.isle.{tahv,thyras,druntyr,koire,caravesse,izor,yeraine,orrery}` bind through the same board mapping. Codex 4, pp. 47-50.

Distant directions `mariner.distant.{north,east,south,west}` bind to `MarinerHorizonCardinalGroupId`. They are legitimate Lore contexts because the Mariner instructs the table to change the Lore of the direction a Beast exits. Their mutable source baseline entries are **empty**. Printed Distant Lands location lists remain static reference material outside Lore. Codex 4, pp. 51-54.

### Faustian Hells, Sage mythic lands, Sorcerer Elements and celestial topics

Hells `faustian.hell.{mutterheep,paradise,carceri,eternity_forge,mirasta,toyland,old_college,anselion,misery}` are `source_topic` IDs `hell.*`. Codex 5, pp. 54-57. All printed Lore is fixed baseline; no staged activation.

Mythic lands `sage.mythic.{hundred_handed_isle,castle_in_sky,court_of_king_typhon,bottom_of_world,twin_goblin_courts,kingdom_of_simple_jon}` are `source_topic` IDs `mythic.*`. Codex 6, pp. 49-51.

Elements `sorcerer.element.{air,fire,earth,water}` bind to `ElementId`. Codex 7, pp. 52-53. Lore prose changes never mutate numeric Element values.

Celestial topics `sorcerer.celestial.{saturn,jupiter,mars,venus,mercury,luna,neptune,sol,sulfur}` are `source_topic` IDs `celestial.*`. They are not Orrery-body identities. Codex 7, pp. 54-57.

## Exclusions

Body A and Body B do not implement:

- UI / Compendium browsing;
- Time-cost enforcement or scheduling automation;
- Sorcerer Research resolution or numeric Knowledge redesign;
- spellcasting or M6 magic;
- generic ACL/visibility/known-by;
- generic notes or Truth-Watcher rulings;
- delete/reorder/retire/supersession;
- arbitrary/multiple Domain instance architecture;
- Wicker-Ways;
- Pact-Law sanctions;
- migration or recovery redesign;
- automatic synchronization from Lore prose into structural mechanics;
- V6;
- production/deployment changes;
- campaign data cleanup;
- raw Convex inserts.

`The Legends of the Immortal Flame` are intentionally outside this catalog: they have bespoke single-word retranslation/change procedures and are not established as Lore-entry add/revise semantics.

## Body A / Body B boundaries

**Body A (this checkpoint):** shared Lore state/types, Draft4/v1 catalog, IDs, subject union, binding resolvers, effective-Lore helpers, Mariner selector, empty V5 `lore` initialization, Convex validator, fail-closed validation, focused tests, and this contract document.

**Body B (approved, not implemented here):** canonical `add_lore_entry` / `revise_lore_entry`, atomic first-use source binding or campaign-collection creation as necessary, focused command/event tests. A source entry may be revised on first use, atomically binding its source collection. `add_lore_entry` only adds campaign-authored text; it does not activate source templates.

Body B must use existing server-authoritative canonical transactional persistence, expected-revision/context checks, command idempotency, complete snapshots, immutable audit, and fail-closed validation.

## PRE-ACTIVATION V5 impact

`CampaignStateV5` gained `lore: LoreState`. `initialCampaignState()` initializes it empty.

This is approved PRE-ACTIVATION V5 evolution. Do not create V6. Do not migrate. Do not assume any existing deployment is disposable. Do not delete V5 data.

## Conceptual persisted shape

```ts
lore: {
  sourceCollections: Array<{
    sourceCollectionId;
    boundSubject; // LoreSubjectRef
    overrides: Array<{ sourceEntryId; currentText }>;
    additions: Array<{ loreEntryId; text }>;
  }>;
  campaignCollections: Array<{
    collectionId;
    subject; // LoreSubjectRef
    entries: Array<{ loreEntryId; text }>;
  }>;
}
```

No timestamps, revision copies, actor IDs, previous-text history, supersession links, or audit data inside Lore records. Existing campaign audit/snapshots own technical history.

## Verification / closure

Body A is verified by focused Lore/V5 tests plus `npm run check` and `git diff --check`.

Final M5.3 closure later uses a fresh explicitly confirmed disposable Convex Development deployment and actual Body B canonical commands. No raw inserts or temporary seed mutations.
