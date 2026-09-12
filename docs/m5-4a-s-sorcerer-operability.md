# M5.4A-S — Sorcerer Operability & Tower Board

**Status:** COMPLETE — Bodies A, B, C1, C2A, and C2B are implemented. Real disposable Convex Development + browser/realtime/refresh closure succeeded. M5.4A-S is complete. ALL OF M5.4 is NOT complete.
**Schema:** CampaignState V5 remains PRE-ACTIVATION. This Workstream adds no CampaignState fields and does not create V6.
**Workstream boundary:** Sorcerer ordinary operability, Working Tower, and bounded Advanced / Correct Board recording. This document does **not** mark all of M5.4 complete.

## Scope

M5.4A-S makes the Sorcerer genuinely usable for ordinary play while preserving the existing structural CampaignState representation.

Three implementation bodies:

| Body | Responsibility |
|---|---|
| **A** | Semantic operability + presentation contract (this checkpoint) |
| **B** | Working Tower board (React) |
| **C1** | Bounded Advanced / Correct Board recording + missing semantic operations for already-represented advanced state |
| **C2** | Orrery Researcher marker rendering, Sun-house visual clearance, full repository closure gate, fresh real Convex/browser integration, closure documentation |

Body A owns common state transitions, fingerprints, Convex canonical mutations, events/audit, atomic Denizen + Sorcerer personnel composition, Researcher Position/refocus/availability, hierarchy-constrained Tower order, provenance-aware Knowledge adjustment, Archives Open/Closed maintenance, narrow Tower-centric Tome/Reagent movement, a derived Sorcerer board read model, and a pure derived external-presence projection.

Body A does **not** implement React presentation, redesign the Orrery, or modify another Domain board.

## Settled primary UX direction

- Working Tower, not dashboard/CRUD.
- Exact `towerOrder` is authoritative.
- Academics and Reliable Tower Arcanists are Tower occupants.
- Researchers are external outposts attached to authoritative typed Research Positions.
- Knowledge retains current/delayed/provenance distinctions.
- Tomes/Reagents remain physical-feeling shared resources using the existing narrow ledger.
- Spyrholm/Tower Lore will reuse M5.4A-L.
- Advanced state will use progressive disclosure.

## Settled ordinary personnel direction

Common UX later will favor:

Recruit Student → Tutor / Promote → Researcher or Academic

Underlying atomic machinery may support direct creation of Researcher, Professor, Librarian, Alchemist, or campaign Academic kinds for Advanced/Impact/exact correction.

No World-page detour.

## Settled Researcher semantics

- One authoritative Sorcerer Researcher record.
- Exact `positionId` and typed Research Position target remain authoritative.
- Working / Unavailable this month is explicit persisted `operationalThisMonth`.
- No automatic monthly reset.
- Refocus may move to another legal open Research Position or perform the source-supported promotion into a non-Student Academic.
- Preserve existing occupancy/reference invariants.

## Settled Tower order semantics

`towerOrder` remains the complete bottom-to-top persisted sequence of Academics, then Reliable Tower Arcanists. No CampaignState field was added for rank.

### SOURCE

- Academics are ranked and lower ranks act first.
- Students are the lowliest Academics.
- Tutoring a Student permits promoting that Student into a Researcher or Academic **and** rearranging the Academics in the Tower.
- Reliable Arcanists operate at the top of the Tower hierarchy and resolve separately during the Quiet Phase.
- Other source procedures and Impacts may create Students, Academics, or Reliable Arcanists without explicitly granting a general Tower rearrangement.

### INFERENCE

- The source does not define a rigid Professor / Librarian / Alchemist / campaign-Academic tier order.
- Adding a new Academic necessarily requires choosing a legal rank, but does not imply permission to reshuffle everyone else.

### APPLICATION DESIGN — HUMAN APPROVED

These two outer constraints are now application canon. Validation must reject any `towerOrder` that violates them:

1. Every Student ranks below every non-Student Academic.
2. Every Academic ranks below every Reliable Tower Arcanist.

Relative order is otherwise unconstrained within:

- the Student group;
- the non-Student Academic group;
- the Reliable Arcanist group.

Do **not** invent a finer role hierarchy such as Student < Professor < Librarian < Alchemist < Arcanist.

| Operation | Placement / order rule |
|---|---|
| Ordinary Recruit Student | New Student enters the Student band automatically after existing Students and before every non-Student Academic. Existing occupants keep their relative order. Caller does not choose a rank. |
| Direct non-Student Academic recruit (Impact / Advanced / exact correction) | Caller supplies `nextAcademicOrder`: insertion of the new Academic only. Pre-existing Academic relative order is preserved. Reliable Arcanist order is unchanged. |
| Researcher → Academic refocus | Same insertion semantics as direct higher-role recruitment. |
| Recruit Researcher / Researcher Position → Position | Tower membership is untouched. Unrelated `towerOrder` CAS is not required. |
| Tutor Student | The one ordinary action that grants Academic rearrangement. Same command performs the promotion and applies `nextAcademicOrder`. Reliable Arcanists stay at the top in their existing relative order and cannot be moved. |
| `rearrange_sorcerer_tower` | **Advanced / Correct Board** — exact Tower ordering correction. Not an ordinary always-available Sorcerer action. May reorder seats within the three legal bands. Must still enforce the two outer hierarchy constraints. Body B must not offer this as a permanently available "rearrange everything" control. |

### Reliable Arcanist addition (Body C1)

When a Reliable Arcanist is added without a special rearrangement rule:

- it enters the Reliable-Arcanist / top band;
- all Academics remain below it;
- existing Tower occupants retain their relative order;
- adding the Arcanist does not itself authorize rearranging Academics.

If multiple Reliable Arcanists exist, their relative order matters because they proceed in order during the Quiet Phase. Discovery automation is not implemented here.

## Settled Knowledge semantics

Keep distinct:

- current Research-origin Knowledge;
- other current Knowledge;
- delayed next-month Research-origin Knowledge;
- current/next Researcher production multiplier state.

Do not merge numeric Knowledge with Lore.

## Settled Archives semantics

- Source timing is Wizardmoot.
- UI later should explain that.
- Canonical state-maintenance operation remains available outside that phase for correction.
- No phase policing.
- No automatic open/close.

## Settled consumable boundary

Use existing `magicConsumables` only.

M5.4A-S movement is Tower-centric.

At minimum support:

Sorcerer's Tower → selected Wizard for a chosen amount of one Tome School stack or one Reagent stack.

A narrow Wizard → Sorcerer Tower correction direction may be included when it falls naturally out of the same closed implementation.

Do **not** introduce:

- Item;
- inventory;
- possession framework;
- arbitrary subject-to-subject transfer;
- generic magic-user taxonomy.

If Denizen eligibility would require deciding who counts as a source-valid magic-user, do not invent that rule. Leave Denizen transfer unsupported here unless already provable from existing accepted modeling.

**Body A decision:** Denizen transfer is unsupported in M5.4A-S. Note for M6.

## Settled external-presence contract

Pure derived Sorcerer presentation data only.

Researcher presence includes:

- Denizen identity/name;
- exact Research Position identity;
- exact typed target;
- operational state.

Disruptive Arcanist presence includes:

- Denizen identity/name;
- School;
- Pact Domain seat placement.

No new CampaignState field.
No duplicated placement.
No generic cross-Domain Piece/Actor framework.

## Persistence invariants

All ordinary accepted writes continue through the established canonical logical-command path with:

- authoritative CampaignState;
- server-computed resulting state;
- complete resulting-state validation;
- command fingerprints/idempotency;
- stale/current preconditions;
- canonical transactional persistence;
- complete snapshots;
- immutable audit;
- whole-state Undo/Redo compatibility.

No client-side sequencing for compound game actions.

A compound operation must start from one authoritative valid CampaignState, compute the full candidate purely, perform all relevant role/Denizen/Tower/Position changes in that candidate, pass full current CampaignState validation, and only then be accepted by canonical persistence. A failure anywhere produces no partial accepted state.

## Explicit exclusions

- CampaignState shape change
- migration
- spellcasting
- Research resolution automation
- automatic monthly Researcher procedures
- Student/Academic monthly automation
- Reliable Arcanist Discovery resolution
- generic inventory
- generic magic-user model
- generic Actor/GameEntity
- generic cross-Domain piece system
- generic Domain-board framework
- new Lore subjects
- Notes
- Wicker-Ways
- Pact-Law sanctions
- multi-Domain-instance architecture
- production access

## Body A semantic operations

Exact names follow repository conventions. These are game-language operations, not generic CRUD.

| Command | Meaning |
|---|---|
| `recruit_sorcerer_personnel` | Add a Denizen-backed Sorcerer worker. Ordinary UI will primarily call this as Recruit Student (automatic Student-band placement). Closed destinations: Student; Researcher at a chosen Position (no Tower CAS); Professor / Librarian / Alchemist / campaign Academic with `nextAcademicOrder` insertion. May create a new Denizen atomically or assign an existing valid Denizen. |
| `refocus_sorcerer_researcher` | Researcher → another legal vacant Position (no Tower CAS), or Researcher → non-Student Academic with insertion-only `nextAcademicOrder`. Not Student. Same Denizen identity. |
| `tutor_sorcerer_student` | Student → Researcher at a legal vacant Position, or Student → non-Student Academic. Same Denizen identity. Atomic promotion **and** authorized Academic rearrangement via `expectedAcademicOrder` + `nextAcademicOrder`. Does not move Reliable Arcanists. |
| `rearrange_sorcerer_tower` | Advanced / Correct Board — exact Tower ordering correction. Same current membership; each member exactly once; settled outer hierarchy required. Not an ordinary always-available action. |
| `set_sorcerer_researcher_operational_this_month` | Working / Unavailable this month. Updates only `operationalThisMonth`. |
| `adjust_sorcerer_knowledge` | Provenance-aware pool adjustment. Distinct pools: `researchOrigin`, `other`, `nextMonthResearchOrigin`. Expected/new amount. Never negative. |
| `set_sorcerer_archives_open` | Open/Closed state maintenance. No phase rejection. |
| `move_sorcerer_tower_magic_consumable` | Closed Tower ↔ Wizard movement of one Tome School stack or one Reagent stack. |

## Body A presentation contract

Derived only. Preferred module: `shared/domain/sorcerer-presentation.ts`.

The read model must make available at minimum:

- whether Sorcerer is initialized;
- Spyrholm Isle / Tower / University references with useful names when available;
- exact Tower order and ordered Tower occupants (Students, then non-Student Academics in chosen order, then Reliable Tower Arcanists; not Researchers); role kinds already make those bands unambiguous for Body B;
- all Research Positions with exact typed targets, human labels, occupied/vacant state, Researcher identity/name, operational status;
- Knowledge provenance/time buckets and Researcher production multipliers;
- Archives state;
- Tower-held Tomes and Reagents only;
- currently represented Laws/Arcanists/Constructs/Innovations/custom definitions in a shape suitable for later advanced presentation, without inventing persisted data.

Convex query: `getSorcererReference` — validate authoritative current CampaignState and return the derived presentation contract plus campaign identity/revision metadata.

External presence is the same derived projection, usable later by the Sorcerer board, an Orrery adapter, and other Domain presentation code. Body A does not modify those boards.

A pure Orrery House-marker adapter may exist in Body A. Actual Orrery rendering belongs to Body C2.

## Body C1 semantic operations

These are Advanced / Correct Board recording/correction operations. They do **not** automate monthly procedures, Research resolution, Discovery, or spellcasting.

| Command | Meaning |
|---|---|
| `set_sorcerer_researcher_production_multipliers` | Exact CAS correction of current and next-month Researcher production multipliers. Positive safe integers. Does not roll next-month into current. |
| `set_sorcerer_laws` | Exact CAS correction of `activeLawIds` / `unrevealedLawIds` from the canonical Law catalog. Unique and disjoint. Not a reveal procedure. |
| `create_sorcerer_campaign_definition` | Closed create for campaign School, Academic kind, Recipe, or Knowledge method. Knowledge method atomically creates its paired `campaign_knowledge_method` Research Position. School create does **not** invent an Arcanist. |
| `update_sorcerer_campaign_definition` | Closed revise of human text for the same four definition kinds. Stable IDs and Knowledge-method Research Position identity are preserved. |
| `add_sorcerer_arcanist` | Atomic Denizen + Powerful arcanist profile + Sorcerer overlay. Reliable Tower Arcanists append at the top of the Reliable-Arcanist band. Disruptive Arcanists require another Pact Domain and a Disruptive profile. |
| `update_sorcerer_arcanist` | Closed correction including Reliable Tower → Disruptive Domain and the reverse. Synchronizes overlay, Powerful status, `towerOrder` membership, and `disruptiveProfile`. Does not resolve Discoveries. |
| `add_sorcerer_construct` | Atomic Denizen + Reliable Construct Powerful profile + campaign-origin Truths + If/Then overlay. |
| `set_sorcerer_construct_instructions` | Exact CAS replacement of Construct If/Then instructions. Truth edits reuse shared Powerful-Denizen truth commands. |
| `add_sorcerer_innovation` | Create an Innovation on an existing non-Great-Work Grimoire spell. School remains derived. |
| `revise_sorcerer_innovation` | CAS correction of Innovation spell and/or text. Continues to reject Great Works. |
| `remove_sorcerer_innovation` | CAS removal of an exact current Innovation. |

Direct specialized personnel and exact Tower-order correction reuse Body A `recruit_sorcerer_personnel` and `rearrange_sorcerer_tower`. They are exposed only inside Advanced / Correct Board.

## Body C1 product boundaries

- Advanced / Correct Board is collapsed by default and visually subordinate to the Working Tower.
- No raw JSON editor, generic state inspector, or arbitrary path/value patch.
- Campaign School Impact reminder is UI-only: the table must still record the matching Arcanist separately.
- No delete semantics for campaign definitions in C1.
- No Orrery rendering change, no Convex deployment, and no Workstream closure in C1.

## Body C2A Orrery marker proof

- Orrery Researcher markers render from `presentation.externalPresence` via the existing House-marker adapter.
- No duplicated Researcher placement state and no Orrery celestial-mechanics / occupancy / command change.
- Primary and secondary Orrery surfaces share the same current marker presentation from `getSorcererReference`.
- Orrery continues to render normally when Sorcerer presentation is loading, unavailable, uninitialized, or has no Orrery Researcher.

## Body C2B closure

M5.4A-S is complete. Final semantic/common command surface is the Body A + Body C1 tables above. No CampaignState shape, migration, or persistence/recovery semantic change.

**Working Tower.** Ordinary play is the Tower-centric board: Recruit Student, Tutor/Promote with Academic-order control, Researcher Refocus / Working / Unavailable this month, Knowledge adjustment, Archives Open/Closed, and vacant Research Positions. There is no standing ordinary Rearrange Tower action.

**Tower hierarchy interpretation.** Exact `towerOrder` remains authoritative. Students occupy the visual bottom; non-Student Academics occupy the middle; Reliable Tower Arcanists occupy the visual top. The two outer constraints remain application canon: every Student ranks below every non-Student Academic, and every Academic ranks below every Reliable Tower Arcanist.

**Researcher external-presence contract.** One authoritative Researcher record per Denizen. Exact typed `positionId` is the placement. `operationalThisMonth` is explicit persisted Working / Unavailable this month. Orrery markers consume the derived external-presence projection only.

**Advanced / Correct Board.** Collapsed and visually subordinate by default. Closed recording for Laws, production multipliers, specialized personnel, exact Tower-order correction, campaign definitions (including Knowledge method + paired Research Position), Arcanists, Constructs (Truths distinct from If/Then), and Innovations. No generic state editor.

**Orrery marker proof.** Working and Unavailable markers show House, name, status text, and a non-color unavailable distinction (dashed stroke + slash). Markers are keyboard-focusable with meaningful `aria-label`s. They do not cover House names, month labels, or planet tracks. Primary and secondary panes show the same authoritative current data.

**Sun-house clearance.** When a Researcher occupies the Sun's House, markers keep radius 248 and take a deterministic +8° angular offset so Sun halo + badge + margin do not collide. Multi-marker fan behavior is unchanged, only shifted as a group. Proven by geometry regression (`orrerySunMarkerMinSeparation`). Real April closure campaign had the Sun in Aries with Researchers in Pisces and Leo, so live Sun-house occupancy was not forced.

**Patreon Materials PPTX.** The editable/vector source is available and is likely particularly useful for later: Mariner structured map/geography; Faustian card-table presentation; Necromancer/Hierophant visual refinements. Those Domains are not in this Workstream.

**Fresh disposable Convex closure.** Development deployment purpose `dev/m5-4a-s-closure`, slug `kindred-tern-983`, type `dev` — not Production and not Preview. Empty proof before seed: `verifyMigration` returned `no_canonical_campaign`. Seed and representative writes used existing public commands only. Closure campaign `cmp_961756c4-0f2c-4e8f-a969-710425f15a5c` initialized at revision 41; final health-valid revision 55.

**Real browser / realtime / refresh.** Vite against that Development deployment — not the local fixture preview. Full-width and narrow Working Tower, Spyrholm/Tower Lore via existing M5.4A-L subjects, primary/secondary Orrery, and one realtime Researcher availability write observed in a second live tab without refresh, then confirmed after reload.

**Deterministic full gate.** `npm run check` and `git diff --check` at final HEAD.

## Deferred / out of this Workstream

- Denizen Tome/Reagent transfer is unsupported here because it would require a new definition of source-valid magic-user. Fresh valid M5.4A-S initialization leaves the shared `magicConsumables` ledger empty, and this Workstream has no source operation that creates a Tome/Reagent. Deterministic transition/UI tests cover the movement contract.
- Source Archives timing is Wizardmoot; the UI explains that without adding phase policing.
- No automatic Research, Academic monthly procedure, Discovery automation, or spellcasting.
- Undo/Redo, Checkpoint Restore, Backup/Import, and recovery architecture were not changed and were not replayed.
- High-level milestone roadmap updates remain with the Master after handoff.
