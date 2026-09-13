import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type {
  FaustianCardFacing,
  FaustianCardId,
  FaustianCommunityId,
  FaustianDevilLawId,
  FaustianOriginClaimId,
  FaustianPhysicalDestination,
  FaustianState,
  FaustianSuit,
  PactSeatId,
  WizardId,
} from "../shared/domain";
import {
  FAUSTIAN_ANTAGONIST_CHIP_COUNTS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_DEMON_CONDITIONS,
  FAUSTIAN_DEVIL_FORM_DEFINITIONS,
  FAUSTIAN_DEVIL_LAW_DEFINITIONS,
  FAUSTIAN_MALIGNANCES,
  FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS,
  FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS,
  FAUSTIAN_SUITS,
  PACT_SEAT_IDS,
  faustianChallengeScheduleLabel,
  faustianFaceUpIdentityLabel,
  pactSeatDisplayName,
} from "../shared/domain";
import type { NamedWizardRef } from "./faustian-view-model";
import { SHARED_TIME_BOUNDARY_COPY } from "./faustian-view-model";

const btn =
  "text-xs font-medium rounded-lg px-2.5 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

function commandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function rejectionText(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return "The action was rejected.";
}

type NamedDenizen = { readonly denizenId: string; readonly name: string };

type DestinationKind = FaustianPhysicalDestination["kind"];

type Draft =
  | { readonly kind: "facing"; cardId: string; facing: FaustianCardFacing }
  | { readonly kind: "placement"; cardId: string; destinationKind: DestinationKind; communityId: FaustianCommunityId; destFacing: FaustianCardFacing; wizardId: string; seatId: PactSeatId; denizenId: string }
  | { readonly kind: "deck_order"; deck: "faustian" | "devil"; fromIndex: string; toIndex: string }
  | { readonly kind: "antagonist"; mode: "attach" | "update" | "remove"; denizenId: string; seatId: PactSeatId; chipCount: 1 | 2 | 3; beneathDestinationKind: DestinationKind }
  | { readonly kind: "demon"; mode: "record" | "update" | "remove"; denizenId: string; form: string; hellOfOrigin: string; magicalSymbol: string; condition: (typeof FAUSTIAN_DEMON_CONDITIONS)[number]; bindingKind: "bound" | "unbound"; malignance: (typeof FAUSTIAN_MALIGNANCES)[number] }
  | { readonly kind: "seizure"; mode: "set" | "clear"; seatId: PactSeatId; conduitDenizenId: string }
  | { readonly kind: "laws"; first: FaustianDevilLawId; second: FaustianDevilLawId }
  | { readonly kind: "forms"; casual: string; special: string; duress: string }
  | { readonly kind: "origin"; claimId: FaustianOriginClaimId; status: "open" | "disproven" }
  | { readonly kind: "custom_origin"; claim: string; secretName: string; status: "open" | "disproven" }
  | { readonly kind: "obligation_record"; wizardId: string; dueMonthOrdinal: string; weeks: string }
  | { readonly kind: "obligation_fulfill"; wizardId: string; dueMonthOrdinal: string; weeks: string }
  | { readonly kind: "flush"; mode: "add" | "remove"; suit: FaustianSuit }
  | { readonly kind: "full_house"; mode: "add" | "remove"; rank: (typeof FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS)[number] };

function isFaceUpAt(faustian: FaustianState, cardId: FaustianCardId): boolean {
  if (faustian.communities.some((community) => community.schemes.some((scheme) => scheme.cardId === cardId && scheme.facing === "face_up"))) {
    return true;
  }
  if (faustian.machinations.some((card) => card.cardId === cardId && card.facing === "face_up")) return true;
  if (faustian.communities.some((community) => community.accompliceCardIds.includes(cardId))) return true;
  if (faustian.defeatedSchemes.includes(cardId)) return true;
  if (faustian.setAsideHand.includes(cardId)) return true;
  if (faustian.entrustedCards.some((card) => card.cardId === cardId)) return true;
  if (faustian.possessions.some((card) => card.cardId === cardId)) return true;
  if (faustian.domainPlacements.some((card) => card.cardId === cardId)) return true;
  if (faustian.beneathAntagonists.some((card) => card.cardId === cardId)) return true;
  return false;
}

function publicCardChoiceLabel(faustian: FaustianState, cardId: FaustianCardId): string {
  const deckIndex = faustian.faustianDeck.indexOf(cardId);
  if (deckIndex >= 0) return `Faustian's Deck card ${deckIndex + 1}`;
  const devilIndex = faustian.devilDeck.indexOf(cardId);
  if (devilIndex >= 0) return `Devil's Deck card ${devilIndex + 1}`;
  const scheme = faustian.communities.flatMap((community) => community.schemes.map((entry) => ({ communityId: community.communityId, ...entry }))).find((entry) => entry.cardId === cardId);
  if (scheme !== undefined) {
    return scheme.facing === "face_up"
      ? `${scheme.communityId} Scheme · ${faustianFaceUpIdentityLabel(cardId)}`
      : `${scheme.communityId} facedown Scheme`;
  }
  const accompliceCommunity = faustian.communities.find((community) => community.accompliceCardIds.includes(cardId));
  if (accompliceCommunity !== undefined) return `${accompliceCommunity.communityId} Accomplice · ${faustianFaceUpIdentityLabel(cardId)}`;
  const machination = faustian.machinations.find((card) => card.cardId === cardId);
  if (machination !== undefined) {
    const reserved = faustian.pendingMachinationChallenges.some((challenge) => challenge.outcomeDependentTwistCardIds.includes(cardId));
    const active = faustian.activeTwistCardIds.includes(cardId);
    const treatment = reserved ? "Reserved Twist" : active ? "Active Twist" : "Machination";
    return machination.facing === "face_up"
      ? `${treatment} · ${faustianFaceUpIdentityLabel(cardId)}`
      : `Facedown ${treatment}`;
  }
  if (isFaceUpAt(faustian, cardId)) return faustianFaceUpIdentityLabel(cardId);
  return "Located Faustian card";
}

function allCardIds(faustian: FaustianState): FaustianCardId[] {
  return [
    ...faustian.faustianDeck,
    ...faustian.devilDeck,
    ...faustian.communities.flatMap((community) => [
      ...community.schemes.map((scheme) => scheme.cardId),
      ...community.accompliceCardIds,
    ]),
    ...faustian.machinations.map((card) => card.cardId),
    ...faustian.defeatedSchemes,
    ...faustian.setAsideHand,
    ...faustian.entrustedCards.map((card) => card.cardId),
    ...faustian.possessions.map((card) => card.cardId),
    ...faustian.domainPlacements.map((card) => card.cardId),
    ...faustian.beneathAntagonists.map((card) => card.cardId),
  ];
}

function permute(cardIds: readonly FaustianCardId[], fromIndex: number, toIndex: number): FaustianCardId[] {
  const next = [...cardIds];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return next;
  next.splice(toIndex, 0, moved);
  return next;
}

function destinationFromDraft(draft: Extract<Draft, { destinationKind: DestinationKind }>): FaustianPhysicalDestination {
  if (draft.destinationKind === "community_scheme") {
    return { kind: "community_scheme", communityId: draft.communityId, facing: draft.destFacing };
  }
  if (draft.destinationKind === "community_accomplice") return { kind: "community_accomplice", communityId: draft.communityId };
  if (draft.destinationKind === "machinations") return { kind: "machinations", facing: draft.destFacing };
  if (draft.destinationKind === "entrusted") return { kind: "entrusted", wizardId: draft.wizardId as WizardId };
  if (draft.destinationKind === "possession") {
    return { kind: "possession", wizardId: draft.wizardId as WizardId, represented: { kind: "none" } };
  }
  if (draft.destinationKind === "domain_placement") {
    return { kind: "domain_placement", seatId: draft.seatId, represented: { kind: "none" } };
  }
  if (draft.destinationKind === "beneath_antagonist") return { kind: "beneath_antagonist", denizenId: draft.denizenId as never };
  return { kind: draft.destinationKind as "faustian_deck" | "devil_deck" | "defeated_schemes" | "set_aside_hand" };
}

export default function FaustianAdvancedActions({
  faustian,
  campaignId,
  wizards,
  denizens,
  monthOrdinal,
}: {
  readonly faustian: FaustianState;
  readonly campaignId: string;
  readonly wizards: readonly NamedWizardRef[];
  readonly denizens: readonly NamedDenizen[];
  readonly monthOrdinal: number;
}) {
  const correctCard = useMutation(api.m3Commands.correctFaustianCard);
  const correctAntagonist = useMutation(api.m3Commands.correctFaustianAntagonist);
  const correctDemon = useMutation(api.m3Commands.correctFaustianDemon);
  const correctSeizure = useMutation(api.m3Commands.correctFaustianDomainSeizure);
  const correctProfile = useMutation(api.m3Commands.correctFaustianDevilProfile);
  const recordObligation = useMutation(api.m3Commands.recordFaustianDueMonthObligation);
  const fulfillObligation = useMutation(api.m3Commands.fulfillFaustianDueMonthObligation);
  const correctEffect = useMutation(api.m3Commands.correctFaustianPersistentEffect);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await action();
      setDraft(null);
    } catch (caught) {
      setError(rejectionText(caught));
    } finally {
      setPending(false);
    }
  }

  const dueMonthObligations = faustian.devilObligations.filter((obligation) => obligation.kind === "wizard_owes_week_due_month");
  const cardIds = allCardIds(faustian);
  const firstLaw = FAUSTIAN_DEVIL_LAW_DEFINITIONS[0]!.id;
  const secondLaw = FAUSTIAN_DEVIL_LAW_DEFINITIONS[1]!.id;

  return (
    <details className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <summary className="text-sm font-semibold cursor-pointer">Advanced / Correct Table</summary>
      <p className="text-xs text-slate-500">
        Typed table corrections only. This is not a raw CampaignState editor. {SHARED_TIME_BOUNDARY_COPY}
      </p>
      {error !== null && <p className="text-xs text-red-700" role="alert">{error}</p>}

      <section className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current rare state</h4>
        <ul className="text-xs space-y-1">
          {faustian.antagonists.map((entry) => (
            <li key={entry.denizenId}>
              Antagonist: {denizens.find((denizen) => denizen.denizenId === entry.denizenId)?.name ?? "named Denizen"} · {pactSeatDisplayName(entry.seatId)} · {entry.chipCount} chips
              {faustian.beneathAntagonists.filter((card) => card.denizenId === entry.denizenId).map((card) => (
                <span key={card.cardId}> · beneath: {publicCardChoiceLabel(faustian, card.cardId)}</span>
              ))}
            </li>
          ))}
          {faustian.demons.map((demon) => (
            <li key={demon.denizenId}>
              Demon: {denizens.find((denizen) => denizen.denizenId === demon.denizenId)?.name ?? "named Denizen"} · {demon.condition}
            </li>
          ))}
          {faustian.domainSeizures.map((seizure) => (
            <li key={seizure.seatId}>
              Domain seizure: {pactSeatDisplayName(seizure.seatId)}
            </li>
          ))}
          {dueMonthObligations.map((obligation) => (
            <li key={`${obligation.wizardId}:${obligation.dueMonthOrdinal}`}>
              Due-month obligation: {wizards.find((wizard) => wizard.wizardId === obligation.wizardId)?.name ?? "Wizard"} · {obligation.weeks} week(s) · {faustianChallengeScheduleLabel(obligation.dueMonthOrdinal, monthOrdinal)}
            </li>
          ))}
          {faustian.persistentMachinationEffects.map((effect) => (
            <li key={effect.kind === "flush" ? `flush:${effect.suit}` : `full:${effect.rank}`}>
              Persistent {effect.kind === "flush" ? `Flush ${effect.suit}` : `Full House ${effect.rank}`}
            </li>
          ))}
          {faustian.selectedDevilLawIds.length > 0 && (
            <li>Laws: {faustian.selectedDevilLawIds.join(", ")}</li>
          )}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "facing", cardId: cardIds[0] ?? "", facing: "face_up" })}>Start facing correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "placement", cardId: cardIds[0] ?? "", destinationKind: "defeated_schemes", communityId: "aries", destFacing: "face_up", wizardId: wizards[0]?.wizardId ?? "", seatId: "hierophant", denizenId: faustian.antagonists[0]?.denizenId ?? denizens[0]?.denizenId ?? "" })}>Start placement correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "deck_order", deck: "faustian", fromIndex: "0", toIndex: "1" })}>Start deck-order correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "antagonist", mode: "attach", denizenId: denizens[0]?.denizenId ?? "", seatId: "hierophant", chipCount: 1, beneathDestinationKind: "defeated_schemes" })}>Start Antagonist correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "demon", mode: "record", denizenId: denizens[0]?.denizenId ?? "", form: "", hellOfOrigin: "", magicalSymbol: "", condition: "active", bindingKind: "bound", malignance: "violent" })}>Start Demon recorder</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "seizure", mode: "set", seatId: "hierophant", conduitDenizenId: denizens[0]?.denizenId ?? "" })}>Start Domain seizure</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "laws", first: firstLaw, second: secondLaw })}>Start Law correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "forms", casual: FAUSTIAN_DEVIL_FORM_DEFINITIONS[0]!.id, special: FAUSTIAN_DEVIL_FORM_DEFINITIONS[1]!.id, duress: FAUSTIAN_DEVIL_FORM_DEFINITIONS[2]!.id })}>Start Form correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "origin", claimId: FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS[0]!.claimId, status: "open" })}>Start origin-claim correction</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "custom_origin", claim: faustian.customOriginClaim?.claim ?? "", secretName: faustian.customOriginClaim?.secretName ?? "", status: faustian.customOriginClaim?.status ?? "open" })}>Start custom origin claim</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "obligation_record", wizardId: wizards[0]?.wizardId ?? "", dueMonthOrdinal: String(monthOrdinal + 1), weeks: "1" })}>Start record due-month obligation</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "obligation_fulfill", wizardId: dueMonthObligations[0]?.wizardId ?? wizards[0]?.wizardId ?? "", dueMonthOrdinal: String(dueMonthObligations[0]?.dueMonthOrdinal ?? monthOrdinal), weeks: "1" })}>Start fulfill due-month obligation</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "flush", mode: "add", suit: "hearts" })}>Start Flush consequence</button>
        <button type="button" className={btn} disabled={pending || draft !== null} onClick={() => setDraft({ kind: "full_house", mode: "add", rank: "king" })}>Start Full House consequence</button>
        {draft !== null && <button type="button" className={btn} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>}
      </div>

      {draft?.kind === "facing" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.cardId} onChange={(event) => setDraft({ ...draft, cardId: event.target.value })}>
            {cardIds.map((cardId) => <option key={cardId} value={cardId}>{publicCardChoiceLabel(faustian, cardId)}</option>)}
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.facing} onChange={(event) => setDraft({ ...draft, facing: event.target.value as FaustianCardFacing })}>
            <option value="face_up">Face up</option>
            <option value="face_down">Face down</option>
          </select>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctCard({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "facing", cardId: draft.cardId, facing: draft.facing } }))}>Confirm facing correction</button>
        </div>
      )}

      {draft?.kind === "placement" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.cardId} onChange={(event) => setDraft({ ...draft, cardId: event.target.value })}>
            {cardIds.map((cardId) => <option key={cardId} value={cardId}>{publicCardChoiceLabel(faustian, cardId)}</option>)}
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.destinationKind} onChange={(event) => setDraft({ ...draft, destinationKind: event.target.value as DestinationKind })}>
            {["faustian_deck", "devil_deck", "community_scheme", "community_accomplice", "machinations", "defeated_schemes", "set_aside_hand", "entrusted", "possession", "domain_placement", "beneath_antagonist"].map((kind) => (
              <option key={kind} value={kind}>{kind}</option>
            ))}
          </select>
          {(draft.destinationKind === "community_scheme" || draft.destinationKind === "community_accomplice") && (
            <select className="text-xs border rounded px-2 py-1" value={draft.communityId} onChange={(event) => setDraft({ ...draft, communityId: event.target.value as FaustianCommunityId })}>
              {FAUSTIAN_COMMUNITY_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          )}
          {(draft.destinationKind === "community_scheme" || draft.destinationKind === "machinations") && (
            <select className="text-xs border rounded px-2 py-1" value={draft.destFacing} onChange={(event) => setDraft({ ...draft, destFacing: event.target.value as FaustianCardFacing })}>
              <option value="face_up">Face up</option>
              <option value="face_down">Face down</option>
            </select>
          )}
          {(draft.destinationKind === "entrusted" || draft.destinationKind === "possession") && (
            <select className="text-xs border rounded px-2 py-1" value={draft.wizardId} onChange={(event) => setDraft({ ...draft, wizardId: event.target.value })}>
              {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
            </select>
          )}
          {draft.destinationKind === "domain_placement" && (
            <select className="text-xs border rounded px-2 py-1" value={draft.seatId} onChange={(event) => setDraft({ ...draft, seatId: event.target.value as PactSeatId })}>
              {PACT_SEAT_IDS.map((id) => <option key={id} value={id}>{pactSeatDisplayName(id)}</option>)}
            </select>
          )}
          {draft.destinationKind === "beneath_antagonist" && (
            <select className="text-xs border rounded px-2 py-1" value={draft.denizenId} onChange={(event) => setDraft({ ...draft, denizenId: event.target.value })}>
              {faustian.antagonists.map((entry) => <option key={entry.denizenId} value={entry.denizenId}>{denizens.find((denizen) => denizen.denizenId === entry.denizenId)?.name ?? "Antagonist"}</option>)}
            </select>
          )}
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctCard({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "placement", cardId: draft.cardId, destination: destinationFromDraft(draft) } }))}>Confirm placement correction</button>
        </div>
      )}

      {draft?.kind === "deck_order" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.deck} onChange={(event) => setDraft({ ...draft, deck: event.target.value as "faustian" | "devil" })}>
            <option value="faustian">Faustian&apos;s Deck</option>
            <option value="devil">Devil&apos;s Deck</option>
          </select>
          <label className="text-xs">From position <input className="border rounded px-1 w-16" value={draft.fromIndex} onChange={(event) => setDraft({ ...draft, fromIndex: event.target.value })} /></label>
          <label className="text-xs">To position <input className="border rounded px-1 w-16" value={draft.toIndex} onChange={(event) => setDraft({ ...draft, toIndex: event.target.value })} /></label>
          <p className="text-xs text-slate-500">Positions are 1-based. Facedown deck identities are not shown.</p>
          <button
            type="button"
            className={btn}
            disabled={pending}
            onClick={() => {
              const current = draft.deck === "faustian" ? faustian.faustianDeck : faustian.devilDeck;
              const from = Number(draft.fromIndex) - 1;
              const to = Number(draft.toIndex) - 1;
              void run(() => correctCard({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                input: { kind: "deck_order", deck: draft.deck, cardIds: permute(current, from, to) },
              }));
            }}
          >
            Confirm deck-order correction
          </button>
        </div>
      )}

      {draft?.kind === "antagonist" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as "attach" | "update" | "remove" })}>
            <option value="attach">Attach existing Denizen</option>
            <option value="update">Update chips / seat</option>
            <option value="remove">Remove Antagonist role</option>
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.denizenId} onChange={(event) => setDraft({ ...draft, denizenId: event.target.value })}>
            {denizens.map((denizen) => <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>)}
          </select>
          {draft.mode !== "remove" && (
            <>
              <select className="text-xs border rounded px-2 py-1" value={draft.seatId} onChange={(event) => setDraft({ ...draft, seatId: event.target.value as PactSeatId })}>
                {PACT_SEAT_IDS.map((id) => <option key={id} value={id}>{pactSeatDisplayName(id)}</option>)}
              </select>
              <select className="text-xs border rounded px-2 py-1" value={draft.chipCount} onChange={(event) => setDraft({ ...draft, chipCount: Number(event.target.value) as 1 | 2 | 3 })}>
                {FAUSTIAN_ANTAGONIST_CHIP_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </>
          )}
          {draft.mode === "remove" && (
            <select className="text-xs border rounded px-2 py-1" value={draft.beneathDestinationKind} onChange={(event) => setDraft({ ...draft, beneathDestinationKind: event.target.value as DestinationKind })}>
              <option value="defeated_schemes">Move beneath cards to Defeated Schemes</option>
              <option value="faustian_deck">Move beneath cards to Faustian&apos;s Deck</option>
              <option value="devil_deck">Move beneath cards to Devil&apos;s Deck</option>
            </select>
          )}
          <button
            type="button"
            className={btn}
            disabled={pending}
            onClick={() => {
              if (draft.mode === "remove") {
                const beneath = faustian.beneathAntagonists.filter((card) => card.denizenId === draft.denizenId);
                void run(() => correctAntagonist({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  input: {
                    kind: "remove",
                    denizenId: draft.denizenId,
                    beneathDestinations: beneath.map((card) => ({
                      cardId: card.cardId,
                      destination: { kind: draft.beneathDestinationKind as "defeated_schemes" | "faustian_deck" | "devil_deck" },
                    })),
                  },
                }));
                return;
              }
              void run(() => correctAntagonist({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                input: { kind: draft.mode, denizenId: draft.denizenId, seatId: draft.seatId, chipCount: draft.chipCount },
              }));
            }}
          >
            Confirm Antagonist correction
          </button>
        </div>
      )}

      {draft?.kind === "demon" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as "record" | "update" | "remove" })}>
            <option value="record">Record</option>
            <option value="update">Update</option>
            <option value="remove">Remove Demon role</option>
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.denizenId} onChange={(event) => setDraft({ ...draft, denizenId: event.target.value })}>
            {denizens.map((denizen) => <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>)}
          </select>
          {draft.mode !== "remove" && (
            <>
              <input className="text-xs border rounded px-2 py-1" placeholder="Form" value={draft.form} onChange={(event) => setDraft({ ...draft, form: event.target.value })} />
              <input className="text-xs border rounded px-2 py-1" placeholder="Hell of origin" value={draft.hellOfOrigin} onChange={(event) => setDraft({ ...draft, hellOfOrigin: event.target.value })} />
              <input className="text-xs border rounded px-2 py-1" placeholder="Magical symbol" value={draft.magicalSymbol} onChange={(event) => setDraft({ ...draft, magicalSymbol: event.target.value })} />
              <select className="text-xs border rounded px-2 py-1" value={draft.condition} onChange={(event) => setDraft({ ...draft, condition: event.target.value as (typeof FAUSTIAN_DEMON_CONDITIONS)[number] })}>
                {FAUSTIAN_DEMON_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
              </select>
              <select className="text-xs border rounded px-2 py-1" value={draft.bindingKind} onChange={(event) => setDraft({ ...draft, bindingKind: event.target.value as "bound" | "unbound" })}>
                <option value="bound">Bound</option>
                <option value="unbound">Unbound</option>
              </select>
              {draft.bindingKind === "unbound" && (
                <select className="text-xs border rounded px-2 py-1" value={draft.malignance} onChange={(event) => setDraft({ ...draft, malignance: event.target.value as (typeof FAUSTIAN_MALIGNANCES)[number] })}>
                  {FAUSTIAN_MALIGNANCES.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              )}
            </>
          )}
          <button
            type="button"
            className={btn}
            disabled={pending}
            onClick={() => {
              if (draft.mode === "remove") {
                void run(() => correctDemon({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "remove", denizenId: draft.denizenId } }));
                return;
              }
              void run(() => correctDemon({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                input: {
                  kind: draft.mode,
                  denizenId: draft.denizenId,
                  binding: draft.bindingKind === "bound" ? { kind: "bound" } : { kind: "unbound", malignance: draft.malignance },
                  form: draft.form,
                  hellOfOrigin: draft.hellOfOrigin,
                  magicalSymbol: draft.magicalSymbol,
                  occupancy: null,
                  monthsInCurrentDomain: 0,
                  condition: draft.condition,
                },
              }));
            }}
          >
            Confirm Demon correction
          </button>
        </div>
      )}

      {draft?.kind === "seizure" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as "set" | "clear" })}>
            <option value="set">Set</option>
            <option value="clear">Clear</option>
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.seatId} onChange={(event) => setDraft({ ...draft, seatId: event.target.value as PactSeatId })}>
            {PACT_SEAT_IDS.filter((id) => id !== "faustian").map((id) => <option key={id} value={id}>{pactSeatDisplayName(id)}</option>)}
          </select>
          {draft.mode === "set" && (
            <select className="text-xs border rounded px-2 py-1" value={draft.conduitDenizenId} onChange={(event) => setDraft({ ...draft, conduitDenizenId: event.target.value })}>
              {denizens.map((denizen) => <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>)}
            </select>
          )}
          <p className="text-xs text-slate-500">Records Faustian seizure state only. External Domain special rules stay table-resolved unless already implemented elsewhere.</p>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctSeizure({ commandId: commandId(), expectedCampaignId: campaignId, kind: draft.mode, seatId: draft.seatId, conduitDenizenId: draft.mode === "set" ? draft.conduitDenizenId : null }))}>Confirm Domain seizure</button>
        </div>
      )}

      {draft?.kind === "laws" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.first} onChange={(event) => setDraft({ ...draft, first: event.target.value as FaustianDevilLawId })}>
            {FAUSTIAN_DEVIL_LAW_DEFINITIONS.map((law) => <option key={law.id} value={law.id}>{law.text}</option>)}
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.second} onChange={(event) => setDraft({ ...draft, second: event.target.value as FaustianDevilLawId })}>
            {FAUSTIAN_DEVIL_LAW_DEFINITIONS.map((law) => <option key={law.id} value={law.id}>{law.text}</option>)}
          </select>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctProfile({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "laws", selectedDevilLawIds: [draft.first, draft.second] } }))}>Confirm Laws</button>
        </div>
      )}

      {draft?.kind === "forms" && (
        <div className="space-y-2">
          {(["casual", "special", "duress"] as const).map((occasion) => (
            <label key={occasion} className="block text-xs">
              {occasion}
              <select className="text-xs border rounded px-2 py-1 ml-2" value={draft[occasion]} onChange={(event) => setDraft({ ...draft, [occasion]: event.target.value })}>
                {FAUSTIAN_DEVIL_FORM_DEFINITIONS.map((form) => <option key={form.id} value={form.id}>{form.description}</option>)}
              </select>
            </label>
          ))}
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctProfile({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "forms", selectedDevilForms: { casual: [draft.casual], special: [draft.special], duress: [draft.duress] } } }))}>Confirm Forms</button>
        </div>
      )}

      {draft?.kind === "origin" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.claimId} onChange={(event) => setDraft({ ...draft, claimId: event.target.value as FaustianOriginClaimId })}>
            {FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS.map((claim) => <option key={claim.claimId} value={claim.claimId}>{claim.claim}</option>)}
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as "open" | "disproven" })}>
            <option value="open">Open</option>
            <option value="disproven">Disproven</option>
          </select>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctProfile({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "origin_claim", claimId: draft.claimId, status: draft.status } }))}>Confirm origin claim</button>
        </div>
      )}

      {draft?.kind === "custom_origin" && (
        <div className="space-y-2">
          <input className="text-xs border rounded px-2 py-1 w-full" placeholder="Custom claim text" value={draft.claim} onChange={(event) => setDraft({ ...draft, claim: event.target.value })} />
          <input className="text-xs border rounded px-2 py-1 w-full" placeholder="Secret name (optional)" value={draft.secretName} onChange={(event) => setDraft({ ...draft, secretName: event.target.value })} />
          <select className="text-xs border rounded px-2 py-1" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as "open" | "disproven" })}>
            <option value="open">Open</option>
            <option value="disproven">Disproven</option>
          </select>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctProfile({ commandId: commandId(), expectedCampaignId: campaignId, input: { kind: "custom_origin_claim", customOriginClaim: draft.claim.trim() === "" ? null : { claim: draft.claim, secretName: draft.secretName.trim() === "" ? null : draft.secretName, status: draft.status } } }))}>Confirm custom origin claim</button>
        </div>
      )}

      {(draft?.kind === "obligation_record" || draft?.kind === "obligation_fulfill") && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.wizardId} onChange={(event) => setDraft({ ...draft, wizardId: event.target.value })}>
            {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
          </select>
          <label className="text-xs">Due MonthOrdinal <input className="border rounded px-1 w-20" value={draft.dueMonthOrdinal} onChange={(event) => setDraft({ ...draft, dueMonthOrdinal: event.target.value })} /></label>
          <label className="text-xs">Weeks <input className="border rounded px-1 w-16" value={draft.weeks} onChange={(event) => setDraft({ ...draft, weeks: event.target.value })} /></label>
          <p className="text-xs text-slate-500">Does not spend shared Time and does not fire at a month boundary.</p>
          <button
            type="button"
            className={btn}
            disabled={pending}
            onClick={() => {
              const args = {
                commandId: commandId(),
                expectedCampaignId: campaignId,
                wizardId: draft.wizardId,
                dueMonthOrdinal: Number(draft.dueMonthOrdinal),
                weeks: Number(draft.weeks),
              };
              void run(() => draft.kind === "obligation_record" ? recordObligation(args) : fulfillObligation(args));
            }}
          >
            Confirm obligation {draft.kind === "obligation_record" ? "record" : "fulfillment"}
          </button>
        </div>
      )}

      {draft?.kind === "flush" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as "add" | "remove" })}>
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.suit} onChange={(event) => setDraft({ ...draft, suit: event.target.value as FaustianSuit })}>
            {FAUSTIAN_SUITS.map((suit) => <option key={suit} value={suit}>{suit}</option>)}
          </select>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctEffect({ commandId: commandId(), expectedCampaignId: campaignId, kind: draft.mode, effect: { kind: "flush", suit: draft.suit } }))}>Confirm Flush consequence</button>
        </div>
      )}

      {draft?.kind === "full_house" && (
        <div className="space-y-2">
          <select className="text-xs border rounded px-2 py-1" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as "add" | "remove" })}>
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
          <select className="text-xs border rounded px-2 py-1" value={draft.rank} onChange={(event) => setDraft({ ...draft, rank: event.target.value as (typeof FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS)[number] })}>
            {FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
          </select>
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => correctEffect({ commandId: commandId(), expectedCampaignId: campaignId, kind: draft.mode, effect: { kind: "full_house", rank: draft.rank } }))}>Confirm Full House consequence</button>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Forms remain correctable through the existing Devil-profile command. Other durable Devil-obligation kinds besides due-month Wizard weeks stay table-resolved. Warlock/Sage remain deferred.
      </p>
      <p className="sr-only">{FAUSTIAN_DEVIL_FORM_DEFINITIONS.length} represented Devil Forms are available to the typed profile command.</p>
    </details>
  );
}
