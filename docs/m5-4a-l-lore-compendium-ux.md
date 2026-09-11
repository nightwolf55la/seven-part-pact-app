# M5.4A-L — Lore & Compendium UX

**Status:** COMPLETE — Pass 1 presentation/read-model and Pass 2 Compendium/contextual UI are implemented. Real browser/Convex Development closure succeeded. M5.4A-L is complete. ALL OF M5.4 is NOT complete.
**Workstream boundary:** Lore presentation only. This document does **not** mark all of M5.4 complete.
**Schema:** CampaignState V5 remains PRE-ACTIVATION. This Workstream adds no persisted Lore fields and does not create V6.

## Implemented / closure

- First-class PlayShell **Compendium** destination with subject-oriented effective Lore, human labels, and source attribution.
- **Add Lore** / **Revise** through existing canonical commands, including stale-conflict draft preservation.
- Reusable `LoreContextPanel`.
- Necromancer Gate representative integration in the existing Gate inspector.
- Fresh disposable Convex Development + real browser proof: Compendium write → campaign state → shared presentation → Necromancer contextual consumer, including refresh persistence.

## Purpose

M5.4A-L turns the settled M5.3 Lore persistence/effective-Lore machinery into a **derived human-facing presentation read model** so later Domain UX Workstreams, including Sorcerer, do not reconstruct:

- exact-ruleset source catalogs;
- effective Lore;
- subject labels;
- context labels;
- bindings/readiness;
- Mariner context information;
- write-target identity.

Pass 1 is presentation-contract / read-model only. React, PlayShell, Necromancer UI, and Domain boards are Pass 2+.

The sole representative UI integration for this Workstream is **Necromancer Gate**, in Pass 2.

## Effective-current-Lore principle

Effective **current** Lore is always the primary statement.

Printed/source wording is supporting provenance for a revised fixed entry, not a competing current text and not a revision history.

## Human vocabulary vs storage vocabulary

Ordinary users must not be expected to understand:

- source collections;
- campaign collections;
- instantiation;
- sparse overrides;
- binding records;
- internal Lore IDs.

Those may exist on typed internal descriptors. They are not intended UI copy.

Game-facing labels use source/catalog/world names, for example:

- Graven Isle — Necromancer
- Graven Isle — Mariner
- Campaign Lore

Approved visible provenance:

- **Changed in play**
- **Added in play**
- **Printed wording**

## Subject-oriented Compendium IA

The Compendium is organized by **subject**, with restrained shelf grouping (Isles, Places, Gates, History, Temples, Faiths, Clans, Foreign Powers, Distant Lands, Hells, Mythic Lands, Elements, Celestial, Domains).

Default order follows source/game catalog order within a shelf. It does not force alphabetical sorting.

Each subject provides:

- stable `LoreSubjectRef` when known;
- a human subject label (never a raw ID);
- shelf grouping;
- every distinct legitimate Lore context;
- whether it currently has effective Lore;
- whether it is eligible to receive Lore.

## Distinct context semantics

One subject may have multiple legitimate Lore contexts. They stay separate.

“All for subject” means: discover all distinct contexts. It does **not** mean merge their Lore into one body.

Source-backed contexts and campaign Lore contexts are both representable without collapsing them.

## Source / Changed in play / Added in play

Uses existing M5.3 `composeEffectiveSourceLore` / exact-ruleset lookup.

- Uninstantiated source-backed context: readable from the exact ruleset baseline. No persistence is created.
- Unchanged fixed source entry: current text is printed wording.
- Fixed source entry revised in play: current text is the override; printed/base wording is also exposed so Pass 2 can offer **Printed wording**.
- Campaign-authored addition on a source context or campaign collection: **Added in play**.

Do not invent generic revision history.

## Printed wording behavior

For a changed fixed entry, Pass 2 may show Printed wording as supporting provenance beside the effective current text.

There is no Lore-local history log, actor attribution, or supersession chain.

## Campaign-Lore first-add and parallel-campaign-Lore UX rule

If no applicable source-backed context exists, first campaign Lore is the ordinary add path.

If an applicable source-backed context exists, that source context is the ordinary add/revise path.

M5.3 still permits a parallel campaign Lore collection on a source-backed subject. Pass 1 **presents any existing such collection** and may expose a secondary/advanced create-or-add descriptor so Pass 2 can preserve the M5.3 operation.

Pass 1 does **not** make creating that parallel Campaign Lore context the primary ordinary path.

Pass 1 does **not** change M5.3 write semantics to enforce this UX preference.

## Empty eligible subject behavior

Subjects with no Lore yet that are legitimate Lore subjects remain discoverable so Pass 2 can offer first Add Lore.

The model distinguishes:

- `hasEffectiveLore`
- `eligibleToReceiveLore`
- `compendiumPresence`: `has_lore` | `empty_eligible`

The default future Compendium should prioritize actual Lore rather than looking like dozens of empty chapters. This distinction is derived. It is not persisted.

## Presentation read-model responsibility

Implemented as:

- `shared/domain/lore-presentation.ts` — `readLoreCompendiumReference`
- `m3Queries:getLoreCompendiumReference`

`m3Queries:getLoreReference` remains the narrow persisted Lore/ruleset read. It is not turned into a UI-specific blob.

The presentation layer is **derived state only**. It is not a second source of truth, a persisted Lore structure, or a new CampaignState field.

Unsupported ruleset/source inconsistency fails closed. There is no fall-forward to `CURRENT_RULESET` or a latest catalog. `CampaignState.ruleset` is the sole compatibility identity for presentation lookup.

Each source context carries the catalog's `SourceLoreAttribution` (`work`, `pages`, `anchor`) so Pass 2 never reconstructs or reopens the source catalog. Attribution is per context, because one subject may have multiple contexts from different source material. Campaign Lore contexts do not invent printed-source attribution.

## Contextual Lore panel contract

A future contextual panel is **subject-aware** and **context-preserving**.

It may select a default context using derived Mariner/play information. It must still be able to show other legitimate contexts for that subject. It must never silently redirect an edit to a different Lore context.

## Mariner delegation boundary

Established M5.3 APPLICATION DESIGN is unchanged and is exposed as derived context information:

```text
present -> owner context
silent  -> owner context
absent  -> Mariner delegated context
null    -> no status-based delegation decision
```

Do not merge contexts, transfer Lore, reseed Lore, fall back from one context to another, or silently redirect explicit edits.

Do not place Mariner-specific delegation policy in a future generic React component. Pass 2 should consume the derived selector/context fields.

Far Reach remains owner-only. There is no second delegated Far Reach collection.

## Add / Revise Save / Cancel concept

Pass 2 editing is an explicit editor over one context:

- Add Lore and Revise Lore are the only writes, using existing canonical commands.
- Save commits through `add_lore_entry` / `revise_lore_entry`.
- Cancel discards the in-progress editor and does not write.

Operation descriptors on the presentation model are implementation data, not visible copy. Pass 2 must pass them through rather than reconstructing identity/binding rules.

## expectedText stale / realtime conflict and “Use latest as base”

`expectedText` semantics are unchanged from M5.3.

If another accepted write changed the current text, Save fails closed with the existing stale-precondition behavior. Pass 2 must treat that as a realtime/server conflict:

- preserve the user's current draft;
- expose the latest effective server text for review;
- ordinary Save remains blocked while conflicted;
- **Use latest as base** updates the editor's captured/base `expectedText` to the latest server text;
- the user's draft text remains intact;
- a subsequent Save attempts that preserved draft against the newly accepted base;
- never silently overwrite the user's draft;
- never auto-merge prose.

Do not invent a new command.

## Modest search / filter direction

Pass 2 may filter the derived subject list by human subject/context labels and current entry text.

Keep this modest: shelf + presence (`has_lore` vs `empty_eligible`) + simple text filter. Do not add a search index, knowledge graph, or generic wiki query language in this Workstream.

## Necromancer Gate representative integration

This Workstream’s sole representative Domain-board integration is Necromancer Gate, in Pass 2.

M5.4A-L Pass 2 itself owns:

- the first-class PlayShell Compendium destination;
- the subject-oriented Compendium surface;
- LoreContextPanel;
- Add/Revise interaction;
- Necromancer Gate representative integration.

Later Domain Workstreams should reuse/refine that common Lore pattern in their own Domain boards. Sorcerer Research resolution remains later work. Do not invent a second Lore presentation model.

## Explicit exclusions

Pass 1 does not implement or change:

- React / PlayShell / Necromancer UI / any Domain board;
- CampaignState shape/version or any persisted Lore field;
- Lore commands, transitions, or `expectedText` semantics;
- snapshots, audit, Undo/Redo, backup/import, checkpoints/recovery;
- Lore subject kinds;
- generic visibility/ACL/known-by;
- generic Notes;
- delete/reorder/supersession/history;
- Mariner delegation semantics;
- spellcasting;
- Sorcerer Research resolution;
- multi-Domain-instance architecture.

## Pass-2 expectations

Pass 2 should:

1. consume `getLoreCompendiumReference` / `readLoreCompendiumReference`;
2. add a first-class PlayShell Compendium destination;
3. render a subject-oriented Compendium that can hide `empty_eligible` by default;
4. render a subject-aware, context-preserving `LoreContextPanel`;
5. wire Add/Revise Save/Cancel through the provided operation descriptors;
6. handle stale `expectedText` with explicit **Use latest as base** without overwriting the user's draft;
7. integrate Necromancer Gate as the representative Domain-board consumer.

Do not begin reconstructing catalogs, effective Lore, labels, bindings, Mariner policy, or write targets in React.

## M5.4 completeness

This document is the approved Lore presentation contract for later Domain UX Workstreams.

It does **not** mark all of M5.4 complete.
