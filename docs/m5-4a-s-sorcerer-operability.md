# M5.4A-S — Sorcerer Operability & Tower Board

**Status:** Body A in progress — semantic operability + presentation contract
**Schema:** CampaignState V5 remains PRE-ACTIVATION. This Workstream adds no CampaignState fields and does not create V6.
**Workstream boundary:** Sorcerer ordinary operability and Working Tower. This document does **not** mark all of M5.4 complete.

## Scope

M5.4A-S makes the Sorcerer genuinely usable for ordinary play while preserving the existing structural CampaignState representation.

Three implementation bodies:

| Body | Responsibility |
|---|---|
| **A** | Semantic operability + presentation contract (this checkpoint) |
| **B** | Working Tower board (React) |
| **C** | Bounded advanced UX + Orrery proof + closure |

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

### Future Reliable Arcanist addition (Body C)

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

A pure Orrery House-marker adapter may exist in Body A. Actual Orrery rendering belongs to Body C.

## Advanced state deferred to Body C

Body A does **not** automate rare represented Sorcerer state. Deferred:

- Law reveal/change
- campaign School / Academic-kind / Recipe / Knowledge-method authoring
- Reliable/Disruptive Arcanist create/update
- Construct instruction editing
- Innovation authoring
- campaign Research Position creation
- Researcher production-multiplier exact correction
- React Working Tower
- Orrery visual marker integration
- Spyrholm/Tower Lore panel wiring (reuse M5.4A-L)

## Notes for later bodies / M6

- Denizen Tome/Reagent transfer is unsupported here because it would require a new definition of source-valid magic-user.
- Source Archives timing is Wizardmoot; Body B UI should explain that without adding phase policing.
- Body C owns advanced UX and Orrery consumption of the Body A presence adapter.
