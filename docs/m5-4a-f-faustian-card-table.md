# M5.4A-F — Faustian Card Table & Operability

**Status:** Body A/B CANDIDATE. Not complete. Body C not implemented. Not all of M5.4 complete.
**Schema:** CampaignState V5 remains PRE-ACTIVATION. No CampaignState fields, no V6, no migration, no `pending-challenge`, no `wizard-next-month-obligation`.
**Branch:** `m5-4a/faustian-card-table`
**BASE_SHA:** `ba32e19cafea37e148eb9bb3f0dc8db56625941f` (`origin/main`, Mariner merge prefix `ba32e19`)

## Approved direction

Deliver a source-shaped Faustian card table (Body A) plus setup and ordinary intervention/protection (Body B) as a usable PlayShell/Setup surface.

Do **not**:

- implement Body C Scheme-occurrence / Machination lifecycle;
- add persisted Investigation entitlement;
- evolve CampaignState;
- build a generic card engine, scheduler, Notes, ACL, or entity framework;
- rasterize the physical board or parse PPTX at runtime;
- spend shared Time from Faustian board operations.

## Body checklist

| Body | Status |
|---|---|
| A Passive card table | candidate committed `a68d919588202df3b465f55544b72a35872de3cd` |
| B Setup + ordinary intervention/protection | candidate committed `34519b6c2970f3d602771b179ebab4f3c8309b00` |
| C Scheme-occurrence / Machination lifecycle | NOT IMPLEMENTED — pending-challenge schema need is approved in direction only |
| Combined `npm run check` | COMPLETE locally — 136 files / 2593 tests; `tsc -b` + `vite build` green |
| Convex Development integration | SKIPPED — no isolated disposable Development deployment could be selected non-interactively; review deployment `wry-boar-766` was not used |

## Implemented Body A surface

- typed static card reference keyed by canonical playing-card identity (`shared/domain/faustian-card-reference.ts`); Scheme/Twist/Accomplice wording is honestly omitted (`source_not_transcribed`);
- pure presentation read model (`src/faustian-view-model.ts`) plus bounded `getFaustianReference` query;
- first-class Faustian PlayShell surface and Setup-hosted table;
- source-shaped 3-column × 4-row Community tableau with Scheme / Accomplice / Pawn / Conspiracy areas, fanned/capped cards, overflow inspector;
- supporting areas: Faustian's Deck, Devil's Deck, suit summary, Twists, Machinations, Defeated Schemes, held/entrusted/possession/Domain-placement cards, derived Sorcerer presence;
- facedown cards do not leak rank/suit/effect through ordinary labels, tooltips, or aria text;
- private Twist inspection is local-only (no mutation/command/event/facing change);
- Lore reuses `LoreContextPanel` and existing subjects only;
- Researchers show **Working** / **Unavailable this month**; Disruptive Arcanists are Domain-wide, not Community-assigned.

Selecting a Community or card inspects it. It does not start an action.

## Implemented Body B operations

| Command | Event | Notes |
|---|---|---|
| `arrange_faustian_table` | `faustian_table_arranged` v1 (+ optional `faustian_conspiracy_established` v1 for Calamity) | Quiet / Dynamic / Explosive; server-random |
| `complete_faustian_structural_placeholder` | `faustian_structural_placeholder_completed` v1 | Setup-only exact helper signature |
| `reveal_faustian_community_schemes` | `faustian_community_schemes_revealed` v1 | Investigation Stage 1 |
| `foil_faustian_community_scheme` | `faustian_community_scheme_foiled` v1 | Investigation Stage 2 |
| `blackmail_faustian_community` | `faustian_community_blackmailed` **v2** | Immediate protection; V1 remains decodable |
| `place_faustian_schemes` | `faustian_schemes_placed` v1 | No clamp / partial deal / recycle |
| `add_faustian_pawn` / `remove_faustian_pawn` | `faustian_pawn_count_changed` v1 | Count-based; no person per Pawn |
| `establish_faustian_conspiracy` | `faustian_conspiracy_established` v1 | One atomic compound write |
| existing `direct_faustian_accomplice` | unchanged | Exposed from Accomplice UI |
| existing `disrupt_faustian_pawn` | unchanged | Exposed from Pawn/Accomplice UI |

Historical combined `investigate_faustian_community` / `faustian_community_investigated` v1 remains for decode. Body B UI does not use it for Stage 2.

## Shared-Time boundary

Board operations record Faustian board consequences. They do **not** spend a Wizard week.

UI copy for Time-associated play operations:

> Records the Faustian board result; shared Time is handled separately.

No Faustian client mutation chains a Time command. Devil-only Time destinations are not used for the Faustian Wizard.

## Investigation contract

1. Stage 1 Reveal (Community): reveal every currently facedown Scheme in that Community. Already face-up Schemes stay face-up. Eligible Stage-2 IDs are **all face-up Schemes present at reveal**, including those already face-up. A Community that is already all face-up is a no-op reveal; the UI may still continue with the captured eligible set.
2. Stage 2 Chosen foil: move **only** the selected card to Defeated Schemes. The selected card must still be a face-up Scheme in the same Community. Stage 2 never reveals later arrivals or substitutes another Scheme.
3. **No persisted Investigation entitlement.** Cancel/reload after accepted Stage 1 leaves reveals in place and does not auto-foil.
4. Explicit action start captures eligible IDs and expected Faustian state. Realtime display may update; captured intent is not silently rebased. Stale confirmation rejects.

## Blackmail immediate-protection contract

New accepted operations emit **v2**:

1. take current top Faustian Deck card (server-selected);
2. install it as an Accomplice;
3. reveal all current local Schemes;
4. evaluate protection using **all** local Accomplices including the new one;
5. established equal-or-lower comparison and existing Ace behavior;
6. each qualifying Scheme prevented exactly once;
7. prevented Schemes append to the **bottom** of Devil's Deck in Community order;
8. no shuffle for ordinary protection.

Existing accepted V1 Blackmail events remain decodable with historical meaning. New operations do not re-execute old V1 commands under V2 behavior.

## Setup recipes and Age rules

**APPLICATION DESIGN** (Sorcerer analog for Age eligibility):

| Age | Permitted arrangements |
|---|---|
| Awakening | Quiet, Dynamic — player chooses which Two is the Twist; that Two is reserved before any random draw |
| Dominion | Dynamic, Explosive |
| Calamity | Explosive — requires explicit valid Antagonist/Conspiracy choices; existing incompatible Powerful profiles are not overwritten |

**Quiet:** low A/2/3/4, mid 5–8, high 9–K. Random 4 low + 2 mid → Devil's Deck; remaining low → Twist (or reserved Two); remaining mid → Accomplice in favorite Community; remainder shuffled → Faustian's Deck. Counts: Devil 6, Twist 1, Accomplice 1, Faustian 44. No Pawns.

**Dynamic:** `devilCount = 3 + 2 * floor(ageYears / 20)` from the Faustian Wizard. Reject before mutation if capacity cannot leave Twist + Accomplice. One Pawn in a Community other than the Accomplice Community.

**Explosive:** 2 Spades per Air, 2 Clubs per Fire, 2 Diamonds per Earth, 2 Hearts per Water. Reject if any per-suit request exceeds capacity or remainder cannot supply Twist + Accomplice. Both Pawns in **one** Community different from the Accomplice Community.

Arrange Table is allowed only during **setup**, only on the exact unarranged baseline, with captured expected age/Elements/Faustian that are not silently recalculated. An empty-looking in-play table is not reset.

**Complete Structural Placeholder** is a separately labeled setup-only conversion of the exact unused helper signature. Matching shape is not historical proof of unused play. In-play helper-shaped state is left alone.

All selection/shuffling is server-authoritative. Same accepted command ID returns the original result and does not reroll.

## Concealment boundary

Ordinary UI, activity labels, errors, success text, aria, and action previews introduced here must not leak hidden rank/suit/effect.

This is not adversarial secrecy against raw CampaignState, audit payloads, backups, or developer tools. No authentication/ACL redesign.

Private Twist inspection remains local-only.

## Source vs application

- **SOURCE:** physical Faustian cards carry Scheme/Twist/Accomplice wording; that text is not transcribed here.
- **APPLICATION DESIGN:** reference layer records `source_not_transcribed` rather than inventing effects.
- **APPLICATION DESIGN:** Ace Accomplices defeat every Scheme except a 2; otherwise equal-or-lower. Existing Direct/Disrupt semantics were preserved, not opportunistically “fixed”.
- **APPLICATION DESIGN:** Age arrangement eligibility follows the table above; Calamity antagonist setup must be explicit.
- **INFERENCE:** Quiet leftover-low after a reserved Awakening Two stays in the Faustian Deck; the reserved Two is the Twist overlay on Machinations, not a second physical copy.

Active Twists are overlays on Machination cards. Every canonical playing card has exactly one physical location.

## Explicit deferrals

- Body C Scheme-occurrence / Machination lifecycle;
- persisted Investigation entitlement / `pending-challenge` CampaignState;
- `wizard-next-month-obligation` schema;
- monthly Pawn/Conspiracy/Watching-the-Stars automation;
- full Antagonist automation;
- generic Notes / Community Notes / new Lore subject types;
- generic card engine, drag/physics, PPTX parser, board raster hotspots;
- Production deployment, PR, merge.

## Body C

The pending-challenge schema need is **approved in direction** and is **not implemented**. Do not treat Body A/B candidate status as Faustian or M5.4 completion.

## Verification

Focused Body A/B tests plus combined `npm run check` (136 files / 2593 tests) and `git diff --check` were run locally.

Convex codegen/`npx convex dev --once` was skipped: no isolated disposable Development deployment was available non-interactively. The review Development deployment was not synchronized.
