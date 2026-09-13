# M5.4A-F — Faustian Card Table & Operability

**Status:** COMPLETE / READY FOR PR. Real Convex Development closure succeeded on disposable `dev/m5-4a-f-closure` (`patient-pheasant-353`). Not M5.4-complete. Not V5-activated. Warlock/Sage remain deferred. Authoritative Faustian Codex transcription remains deferred.
**Schema:** CampaignState V5 remains PRE-ACTIVATION. Approved in-place current-V5 evolution for pending Machination challenges and due-month Wizard-week obligations. No migration. No silent compatibility. No optional old current-V5 shape.
**Branch:** `m5-4a/faustian-card-table`
**BASE_SHA:** `ba32e19cafea37e148eb9bb3f0dc8db56625941f` (`origin/main`, Mariner merge prefix `ba32e19`)
**Overnight start HEAD:** `12c575a52c92bd9a8b19d2c0adf88abaabf424a3`

PR, merge, Production, and V5 activation remain pending. The review Development deployment `dev:wry-boar-766` was not used.

## Approved direction

Deliver a source-shaped Faustian card table, setup/ordinary intervention, Body C Scheme-occurrence / Machination lifecycle, and Body D typed Advanced / Correct Table coverage.

Do **not**:

- build a generic card engine, scheduler, Notes, ACL, or entity framework;
- rasterize the physical board or parse PPTX at runtime;
- spend shared Time from Faustian board operations;
- automatically resolve Machinations or spend Time at month boundaries;
- activate V5 or migrate from an old current-V5 shape.

## Body checklist

| Body | Status |
|---|---|
| A Passive card table | implemented |
| B Setup + ordinary intervention/protection | implemented; A/B actual-diff corrections applied |
| C Scheme-occurrence / Machination lifecycle | implemented as approved PRE-ACTIVATION V5 evolution |
| D Advanced / Correct Table operability | implemented as typed game-specific recorders |
| Combined `npm run check` | 140 files / 2660 tests; `tsc -b` + Vite pass after `fd01193` |
| Convex Development integration | COMPLETE on disposable Development `patient-pheasant-353` (`dev/m5-4a-f-closure`). Review deployment `dev:wry-boar-766` was not used. |
| Workstream actual-diff review | empty multi-local direct set fixed; real-integration gates proved on `patient-pheasant-353` |
| V5 activation | NOT DONE |

## A/B actual-diff corrections

1. **Investigation Stage 2 is narrow.** Foil confirmation requires only that the selected card still exist, still be that exact card, still be a face-up Scheme, and still be in the captured Community. Unrelated later Faustian changes, including a new facedown Scheme arrival, do not themselves invalidate the foil. If the selected card moved or became ineligible, reject with no retarget and no unrelated movement.
2. **Investigation Stage 1 is a true no-op** when a Community has no facedown Schemes: no gameplay revision/event is created merely to establish an entitlement. The UI may continue with all currently face-up Schemes as Stage-2 choices. No persisted Investigation entitlement exists.
3. **Calamity Arrange Table** attaches an **existing eligible world Denizen** as the generic Faustian Antagonist. It does not create a Conspiracy merely because setup needs an Antagonist, and it does not overwrite an incompatible Powerful profile. Representational limit: Denizen records have no creating-Wizard field; eligibility uses existing authoritative provenance (existing world Denizen, not already Antagonist/Conspiracy/Demon, not deceased, Powerful Goal already in the Faustian Antagonist goals). Event: `faustian_antagonist_established` v1.
4. **Static Faustian source reference.** The authoritative Faustian Codex contains List of Schemes / Card Meanings, Twist text, Accomplices & Syndicates, and related headings. That Codex was **not available on the local filesystem** of this implementation environment. Status is `source_transcription_deferred`, not “source lacks the material.” No internet substitute was fetched. No wording was invented. Genuine draft/omission markers remain visible.
5. **Twist / Machinations presentation.** An active Twist is one physical Machinations card plus an overlay. The Twist panel is a spotlight/reference, not a second physical copy.

## Body C — approved in-place PRE-ACTIVATION V5 evolution

### Pending Machination challenges

Mandatory current-V5 field:

`faustian.pendingMachinationChallenges: FaustianPendingMachinationChallenge[]`

Kinds: `one_pair` | `two_pair` | `three_of_a_kind`.

- Challenge and group IDs are server-generated (`fpmc_…`, `fpmg_…`).
- Challenge references are **metadata only**. They are never physical card locations.
- **One Pair:** one group; `responsibleWizardId` initially null; pending non-Twist cards use `setAsideHand`.
- **Two Pair:** two groups; distinct responsible Wizards; each pair uses `entrustedCards`. The table assigns each pair to a Wizard; scoring-selection order is not used.
- **Three of a Kind:** three groups; three distinct Wizards; matching cards use `entrustedCards`. The table assigns each matching card to a Wizard.
- Kickers belong to `scoringHandCardIds` but are not pending holdings.
- Completed `originalCardIds` are historical metadata only. They do not reserve cards. Later movement and later challenge participation are valid.
- Multiple pending challenges may coexist. No pending physical-holding overlap. No active Twist reserved by two unresolved challenges.

### Active-Twist reservation

Every `activeTwistCardId` remains physically in Machinations. `outcomeDependentTwistCardIds` is plural. Each reserved Twist must be a current active Twist. Reservation is metadata, not a second physical location. A reserved Twist cannot be independently replaced, cleaned up, moved, deactivated, or resolved by an unrelated operation. Completing a response group does not move a reserved Twist and does not keep the group pending.

### Due-month Wizard-week obligation

Old temporally ambiguous `wizard_owes_week_next_month` is **not** accepted in current V5.

Authoritative durable shape:

`{ kind: "wizard_owes_week_due_month", wizardId, dueMonthOrdinal, weeks }`

- `MonthOrdinal`, not month name or wall-clock date.
- Positive remaining weeks.
- Same Wizard + same due MonthOrdinal accumulate.
- Explicit fulfillment decrements and removes at zero.
- No automatic shared-Time spending. No scheduler.

### Lifecycle commands / events

| Command | Event |
|---|---|
| `record_faustian_scheme_occurred` | `faustian_scheme_occurred` v1 |
| `disclose_faustian_twist` | `faustian_twist_disclosed` v1 |
| `record_faustian_twist_occurred` | `faustian_twist_occurred` v1 |
| `record_faustian_machination_outcome` | `faustian_machination_outcome_recorded` v1 |
| `complete_faustian_machination_response` | `faustian_machination_response_completed` v1 |
| `finalize_faustian_machination_challenge` | `faustian_machination_challenge_finalized` v1 |

Scheme occurrence: captured Community + face-up Scheme; 0/1/many local Accomplice rule; global lower-value same-suit cascade from the pre-event state; Ace falls if directly affected but never cascades and never falls via cascade; +1 Pawn in each fallen card's original Community; fallen cards shuffle into Devil's Deck once. Destinations: ordinary Machinations, existing possession, existing Domain placement. Narrative Scheme prose is not executed.

Twist disclose: unreserved active Twist; server-random replacement from Faustian's Deck; empty deck rejects with no mutation; replay does not reroll. Twist occurrence: reveal; move current Devil's Deck into Machinations face-up; no automatic Machination result.

Machination outcomes are table-directed. Delayed challenges create holdings/reservations and recycle only the server-computed eligible cleanup set captured at draft start. Immediate Flush / Full House / table-resolved results send Twist dispositions for the union of explicitly selected outcome-dependent Twists and any scoring-hand active Twist. Full House rank is derived from the three-of-a-kind, not selection order. Month advancement never resolves a challenge, fails a response, moves retained cards, spends Time, or triggers Devil triumph. A completed-groups challenge still exists until explicit finalize.

## Body D — Advanced / Correct Table

Typed commands only. No raw CampaignState editor, JSON patcher, or arbitrary path/value UI.

| Command | Event |
|---|---|
| `correct_faustian_card` | `faustian_card_corrected` v1 |
| `correct_faustian_antagonist` | `faustian_antagonist_corrected` v1 |
| `correct_faustian_demon` | `faustian_demon_corrected` v1 |
| `correct_faustian_domain_seizure` | `faustian_domain_seizure_corrected` v1 |
| `correct_faustian_devil_profile` | `faustian_devil_profile_corrected` v1 |
| `record_faustian_due_month_obligation` | `faustian_due_month_obligation_recorded` v1 |
| `fulfill_faustian_due_month_obligation` | `faustian_due_month_obligation_fulfilled` v1 |
| `correct_faustian_persistent_effect` | `faustian_persistent_effect_corrected` v1 |

Reserved Twists and pending holdings cannot be independently moved. Removing an Antagonist requires an explicit destination for every card beneath it and does not delete the world Denizen. Domain seizure records Faustian seizure state only; external Domain special rules remain table-resolved unless already implemented.

## State / action coverage

| State family | Coverage |
|---|---|
| Faustian's Deck / Devil's Deck | Ordinary count UI; Advanced deck-order correction by position |
| Community Schemes / facing | Ordinary table + inspector; Body B Investigate/Place; Body C occurrence; Advanced facing/placement |
| Community Accomplices | Ordinary table; Body B Direct/Blackmail; Body C cascade; Advanced placement |
| Pawn counts | Ordinary table; Body B add/remove/Disrupt |
| Conspiracies | Ordinary Community label; existing `establish_faustian_conspiracy` |
| Machinations / Defeated Schemes | Ordinary table; Body C outcome/cleanup; Advanced facing/placement |
| Active Twist overlay | Ordinary Machinations treatment + spotlight panel (not a second copy); Body C disclose/occur; reserved-Twist treatment |
| Held / set-aside / entrusted / possession / Domain placement | Ordinary supporting areas; Body C holdings and destinations; Advanced placement |
| Cards beneath Antagonists | Advanced inspection + destination-required removal/placement |
| Antagonists | Calamity Arrange (existing Denizen); Advanced attach/update/remove |
| Demons | Advanced record/update/remove on existing world Denizen + Powerful Demon taxonomy |
| Domain seizures | Advanced set/clear |
| Pending Machination challenges | Body C ordinary lifecycle UI |
| Devil Laws / Forms / origin claims / custom origin | Advanced typed profile correction |
| Due-month Wizard-week obligations | Advanced record/fulfill; due/overdue is a read-model label |
| Other durable Devil-obligation kinds | **Explicit deferral** — represented state remains; no generic obligation editor this Workstream |
| Persistent Flush / Full House | Body C immediate result + Advanced add/remove |
| Sorcerer Researchers / Disruptive Arcanists | Ordinary derived presence (`Working` / `Unavailable this month`); Faustian commands do not move Sorcerer placement |
| Lore | Existing `LoreContextPanel` / bound subjects only; no per-Community Lore; no Community Notes |
| Investigation entitlement | **Not persisted** — captured draft only |
| Static Scheme/Twist/Accomplice Codex wording | **Transcription deferred** — Codex not on local filesystem; status is not “source lacks material” |
| Interpretive Scheme/Twist prose / Wicker-Ways / Pact-Law sanctions | Table-resolved; not a software defect |
| Monthly Pawn/Conspiracy/Watching-the-Stars automation | Explicit deferral |
| Warlock / Sage | Workstream-deferred |
| Real Convex deployment integration | COMPLETE on `patient-pheasant-353` |
| V5 activation / migration | Not done; not authorized |

## Shared-Time and month-boundary boundary

Board operations record Faustian board consequences. They do **not** spend a Wizard week and do **not** schedule Devil Time.

UI copy:

> Records the Faustian board result; shared Time is handled separately.

Month advancement never resolves a pending challenge.

## Concealment boundary

Ordinary UI, Advanced labels, activity summaries, errors, aria, and action previews must not leak hidden rank/suit/effect. Facedown deck-order correction uses positions, not identities. Private Twist inspection remains local-only.

This is not adversarial secrecy against raw CampaignState, audit payloads, backups, or developer tools.

## Source vs application

- **SOURCE:** physical Faustian cards carry Scheme/Twist/Accomplice wording; authoritative Codex headings exist. Local transcription is deferred because the Codex file was unavailable here.
- **APPLICATION DESIGN:** reference layer records deferred transcription rather than inventing effects. Age arrangement eligibility, Investigation no-op, Calamity existing-Denizen Antagonist, cascade rules, and Machination cleanup conventions are application design over represented state.
- **INFERENCE:** Quiet leftover-low after a reserved Awakening Two stays in the Faustian Deck; the reserved Two is the Twist overlay on Machinations, not a second physical copy. Denizen “created by another Wizard” is not an exact stored field.

Active Twists are overlays on Machination cards. Every canonical playing card has exactly one physical location.

## Post-overnight audit

Actual-diff review of HEAD `827639d` confirmed the approved A/B contracts, mandatory current-V5 challenge/obligation fields, persistence consumers, Body C lifecycle invariants, Body D typed-only scope, and concealment labels. One bounded UI/lifecycle confirm-path defect was corrected: Two Pair / Three of a Kind group assignment and immediate Twist disposition / Full House rank derivation.

## Workstream empty-direct-set fix

`resolveDirectAccomplices()` now rejects `directAccompliceCardIds: []` when more than one local Accomplice exists. Zero locals still produce no direct fall. Exactly one local still auto-falls. Nonlocal selected cards still reject. Confirm is disabled until a nonempty local subset is chosen. Preview with zero selected says confirmation is blocked; it does not treat a zero-fall outcome as confirmable.

Code HEAD after this fix: `fd011937d3413b728467f65067f48acb10772dc7`.

## Real Convex closure

Disposable Development deployment `dev/m5-4a-f-closure` / cloud slug `patient-pheasant-353`. Human-provisioned. Worktree `.env.local` selects that deployment. Schema/functions were accepted by a prior `npx convex dev --once` (`Convex functions ready!`). No later source change required a resync. No Production. `npx convex deploy` was not run. Review deployment `dev:wry-boar-766` was not used. No raw writes, temporary seed mutation, silent migration, or V5 activation.

Empty baseline before seed: `verifyMigration:verifyMigration` → `no_canonical_campaign`. Campaign created with public `campaign:startNewCampaign`. Seed and proofs used only public canonical mutations/commands plus typed Faustian Correct Table placements where needed to assemble a One Pair hand and a Scheme-fall table.

| Proof | Result |
|---|---|
| Campaign | `cmp_cc1e3585-c833-4078-a5a4-ea8a53e4f326` |
| Setup | Awakening; March ordinal 11; Faustian present; other seats absent |
| Starting / final revision | 0 → 51 |
| Pending challenge | `fpmc_dabb570e-4761-4331-a7fb-43e909f03a5a` / group `fpmg_99955758-be2d-4ebb-a974-58ad93e5de6d` |
| Challenge schedule | One Pair; source MonthOrdinal 12; due MonthOrdinal 13 |
| Holdings | `setAsideHand` = hearts_9, spades_9, hearts_ace, hearts_8, clubs_7; 52 physical cards remain coherent |
| Live query | `m3Queries:getFaustianReference` serialized the mandatory V5 pending-challenge shape |
| Due-month obligation | 1 → 2 accumulated → 1 fulfilled for Wizard `wiz_953f7b83-11eb-4ea6-8aa9-6a4edbdcc020` at due MonthOrdinal 13 |
| Time | Portable-backup fingerprint of New Moon allocations unchanged across record/fulfill; no shared-Time command |
| Twist disclose replay | `cmd_54fd0354-a86a-4bc8-a3a6-518ca7dc7f71` stayed at revision 34; replacement `diamonds_9` did not reroll |
| Scheme-fall shuffle replay | `cmd_eda344c4-f6fe-42d1-bd40-276628795f53` stayed at revision 48; Devil's Deck order unchanged |
| Undo / Redo | Undo restored weeks=2 + same pending challenge; Redo restored weeks=1 + same holdings |
| Checkpoint / restore | `chk_c3b0f7aa-85e4-458f-ac9e-ab38503c731e` (`Before Ritual`); restore kept challenge + 1-week obligation and wiped the later Scheme fall |
| Backup / import | `backup:exportPortableBackup` / `backup:importPortableBackup` restored the same challenge, holdings, and 1-week obligation |
| Browser / refresh | Vite `:5180` against `VITE_CONVEX_URL=https://patient-pheasant-353.convex.cloud`. Faustian surface showed `One Pair · source month 12 · due month 13` and held cards. Reload preserved that pending state. |
| Final health | `verifyMigration` `valid`; revision 51; history/checkpoint valid; 1 checkpoint; 52 events |

Suggested PR title: `M5.4A-F: add Faustian card-table operability`.

## Explicit remaining work after this Workstream

- Static Faustian Codex transcription once the local source is available. Authoritative Codex material exists; only application transcription is deferred.
- Other durable Devil-obligation kinds beyond due-month weeks.
- Interpretive / table-resolved narrative consequences.
- Warlock and Sage.
- PR, merge, Production, V5 activation. Do not mark all of M5.4 complete.
