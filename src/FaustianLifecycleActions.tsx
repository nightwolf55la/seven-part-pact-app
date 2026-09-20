import { useLayoutEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type {
  FaustianCardId,
  FaustianCommunityId,
  FaustianPendingHoldingDisposition,
  FaustianSchemeOccurrenceDestination,
  FaustianState,
  FaustianTwistDispositionDestination,
  PactSeatId,
  WizardId,
} from "../shared/domain";
import {
  PACT_SEAT_IDS,
  eligibleFaustianMachinationCleanupCardIds,
  faustianFaceUpIdentityLabel,
  isFaustianSchemeOccurrenceTargetValid,
  isFaustianTwistReserved,
  pactSeatDisplayName,
  previewFaustianSchemeOccurrence,
} from "../shared/domain";
import type { FaustianTablePresentation, NamedWizardRef } from "./faustian-view-model";
import {
  SHARED_TIME_BOUNDARY_COPY,
  buildFaustianMachinationOutcomeResult,
  cloneFaustianState,
  isFaustianMachinationOutcomeDraftReady,
  isFaustianSchemeOccurrenceConfirmReady,
} from "./faustian-view-model";

const btn =
  "text-xs font-medium rounded-lg px-2.5 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

function commandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function rejectionText(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return "The action was rejected.";
}

type DestinationKind = FaustianSchemeOccurrenceDestination["kind"];
type ResultKind = "one_pair" | "two_pair" | "three_of_a_kind" | "flush" | "full_house" | "table_resolved";

type Draft =
  | {
    readonly kind: "scheme_occurred";
    readonly communityId: FaustianCommunityId;
    readonly expectedFaustian: FaustianState;
    readonly expectedLocalAccompliceCardIds: readonly FaustianCardId[];
    schemeCardId: FaustianCardId | "";
    destinationKind: DestinationKind;
    holderWizardId: string;
    seatId: PactSeatId;
    selectedDirect: readonly FaustianCardId[];
  }
  | {
    readonly kind: "disclose_twist";
    readonly expectedFaustian: FaustianState;
    twistCardId: FaustianCardId | "";
  }
  | {
    readonly kind: "twist_occurred";
    readonly expectedFaustian: FaustianState;
    twistCardId: FaustianCardId | "";
  }
  | {
    readonly kind: "machination_outcome";
    readonly expectedFaustian: FaustianState;
    readonly expectedCleanupCardIds: readonly FaustianCardId[];
    selectedScoring: readonly FaustianCardId[];
    resultKind: ResultKind;
    outcomeTwists: readonly FaustianCardId[];
    twoPairA: readonly FaustianCardId[];
    twoPairB: readonly FaustianCardId[];
    wizardA: string;
    wizardB: string;
    wizardC: string;
    threeA: FaustianCardId | "";
    threeB: FaustianCardId | "";
    threeC: FaustianCardId | "";
    twistDestination: FaustianTwistDispositionDestination;
  }
  | {
    readonly kind: "complete_response";
    readonly challengeId: string;
    readonly groupId: string;
    completedByWizardId: string;
  }
  | {
    readonly kind: "finalize_challenge";
    readonly challengeId: string;
    pendingHoldingDisposition: FaustianPendingHoldingDisposition;
    twistDestination: FaustianTwistDispositionDestination;
  };

export type FaustianLifecycleLaunch =
  | { readonly kind: "machination_outcome" }
  | { readonly kind: "finalize_challenge"; readonly challengeId: string };

export default function FaustianLifecycleActions({
  faustian,
  campaignId,
  lifecycleKind,
  wizards,
  selectedCommunityId,
  presentation,
  launch = null,
  onLaunchConsumed,
}: {
  readonly faustian: FaustianState;
  readonly campaignId: string;
  readonly lifecycleKind: "setup" | "play";
  readonly wizards: readonly NamedWizardRef[];
  readonly selectedCommunityId: FaustianCommunityId | null;
  readonly presentation: FaustianTablePresentation;
  readonly launch?: FaustianLifecycleLaunch | null;
  readonly onLaunchConsumed?: () => void;
}) {
  const recordScheme = useMutation(api.m3Commands.recordFaustianSchemeOccurred);
  const discloseTwist = useMutation(api.m3Commands.discloseFaustianTwist);
  const recordTwist = useMutation(api.m3Commands.recordFaustianTwistOccurred);
  const recordOutcome = useMutation(api.m3Commands.recordFaustianMachinationOutcome);
  const completeResponse = useMutation(api.m3Commands.completeFaustianMachinationResponse);
  const finalizeChallenge = useMutation(api.m3Commands.finalizeFaustianMachinationChallenge);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedLive = selectedCommunityId === null
    ? null
    : faustian.communities.find((community) => community.communityId === selectedCommunityId) ?? null;
  const faceUpSchemes = selectedLive?.schemes.filter((scheme) => scheme.facing === "face_up") ?? [];
  const unreservedTwists = faustian.activeTwistCardIds.filter((cardId) => !isFaustianTwistReserved(faustian, cardId));
  const faceUpMachinations = faustian.machinations.filter((card) => card.facing === "face_up");
  const preview = draft?.kind === "scheme_occurred" && draft.schemeCardId !== ""
    ? previewFaustianSchemeOccurrence(
      draft.expectedFaustian,
      draft.communityId,
      draft.schemeCardId,
      draft.selectedDirect,
    )
    : null;
  const schemeStale = draft?.kind === "scheme_occurred"
    && (
      !isFaustianSchemeOccurrenceTargetValid(faustian, draft.communityId, draft.schemeCardId as FaustianCardId)
      || JSON.stringify(faustian.communities.find((community) => community.communityId === draft.communityId)?.accompliceCardIds ?? [])
        !== JSON.stringify(draft.expectedLocalAccompliceCardIds)
    );
  const cleanupStale = draft?.kind === "machination_outcome"
    && JSON.stringify(eligibleFaustianMachinationCleanupCardIds(faustian))
      !== JSON.stringify(draft.expectedCleanupCardIds);

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

  useLayoutEffect(() => {
    if (launch === null || lifecycleKind !== "play") return;
    const faceUp = faustian.machinations.filter((card) => card.facing === "face_up");
    if (launch.kind === "machination_outcome") {
      setError(null);
      setDraft({
        kind: "machination_outcome",
        expectedFaustian: cloneFaustianState(faustian),
        expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(faustian),
        selectedScoring: faceUp.slice(0, 5).map((card) => card.cardId),
        resultKind: "one_pair",
        outcomeTwists: [],
        twoPairA: [],
        twoPairB: [],
        wizardA: wizards[0]?.wizardId ?? "",
        wizardB: wizards[1]?.wizardId ?? wizards[0]?.wizardId ?? "",
        wizardC: wizards[2]?.wizardId ?? wizards[0]?.wizardId ?? "",
        threeA: "",
        threeB: "",
        threeC: "",
        twistDestination: "remain_face_up_in_machinations",
      });
    } else {
      setError(null);
      setDraft({
        kind: "finalize_challenge",
        challengeId: launch.challengeId,
        pendingHoldingDisposition: "shuffle_into_faustian_deck",
        twistDestination: "remain_face_up_in_machinations",
      });
    }
    onLaunchConsumed?.();
  }, [launch, faustian, wizards, onLaunchConsumed, lifecycleKind]);

  if (lifecycleKind !== "play") return null;

  const attached = draft?.kind === "machination_outcome" || draft?.kind === "finalize_challenge" || draft?.kind === "complete_response";

  return (
    <section
      className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3"
      aria-label="Faustian lifecycle actions"
      data-faustian-attached-lifecycle={attached ? "true" : undefined}
    >
      <details className="rounded-lg border border-slate-200 dark:border-slate-700 p-3" data-faustian-lifecycle-less-common>
        <summary className="text-sm font-semibold cursor-pointer">Less-common Scheme destinations and lifecycle</summary>
        <div className="mt-3 space-y-3">
      <p className="text-xs text-slate-500">{SHARED_TIME_BOUNDARY_COPY}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          disabled={pending || draft !== null || selectedCommunityId === null || faceUpSchemes.length === 0}
          onClick={() => {
            if (selectedCommunityId === null || selectedLive === null) return;
            setError(null);
            setDraft({
              kind: "scheme_occurred",
              communityId: selectedCommunityId,
              expectedFaustian: cloneFaustianState(faustian),
              expectedLocalAccompliceCardIds: [...selectedLive.accompliceCardIds],
              schemeCardId: faceUpSchemes[0]?.cardId ?? "",
              destinationKind: "ordinary_machinations",
              holderWizardId: wizards[0]?.wizardId ?? "",
              seatId: "hierophant",
              selectedDirect: [],
            });
          }}
        >
          Start Record Scheme Occurred
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending || draft !== null || unreservedTwists.length === 0}
          onClick={() => {
            setError(null);
            setDraft({
              kind: "disclose_twist",
              expectedFaustian: cloneFaustianState(faustian),
              twistCardId: unreservedTwists[0] ?? "",
            });
          }}
        >
          Start Disclose / Replace Twist
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending || draft !== null || unreservedTwists.length === 0}
          onClick={() => {
            setError(null);
            setDraft({
              kind: "twist_occurred",
              expectedFaustian: cloneFaustianState(faustian),
              twistCardId: unreservedTwists[0] ?? "",
            });
          }}
        >
          Start Record Twist Occurred
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending || draft !== null || faceUpMachinations.length === 0}
          onClick={() => {
            setError(null);
            setDraft({
              kind: "machination_outcome",
              expectedFaustian: cloneFaustianState(faustian),
              expectedCleanupCardIds: eligibleFaustianMachinationCleanupCardIds(faustian),
              selectedScoring: faceUpMachinations.slice(0, 5).map((card) => card.cardId),
              resultKind: "one_pair",
              outcomeTwists: [],
              twoPairA: [],
              twoPairB: [],
              wizardA: wizards[0]?.wizardId ?? "",
              wizardB: wizards[1]?.wizardId ?? wizards[0]?.wizardId ?? "",
              wizardC: wizards[2]?.wizardId ?? wizards[0]?.wizardId ?? "",
              threeA: "",
              threeB: "",
              threeC: "",
              twistDestination: "remain_face_up_in_machinations",
            });
          }}
        >
          Start Record Machination Outcome
        </button>
      </div>

      {presentation.pendingChallenges.length > 0 && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Pending Machination challenges</p>
          {presentation.pendingChallenges.map((challenge) => (
            <div key={challenge.challengeId} className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-1">
              <p>
                {challenge.kindLabel} · source month {challenge.sourceMonthOrdinal} · due month {challenge.dueMonthOrdinal} · {challenge.scheduleLabel.replace(/_/g, " ")}
              </p>
              {challenge.reservedTwistCount > 0 && (
                <p>Reserved active Twist{challenge.reservedTwistCount === 1 ? "" : "s"}: {challenge.reservedTwistCount}. The physical card stays in Machinations.</p>
              )}
              <ul className="space-y-1">
                {challenge.groups.map((group) => (
                  <li key={group.groupId}>
                    {group.status === "pending" ? "Pending" : "Completed"}
                    {group.responsibleWizardName !== null ? ` · ${group.responsibleWizardName}` : ""}
                    {group.completedByWizardName !== null ? ` · completed by ${group.completedByWizardName}` : ""}
                    {group.status === "pending" && (
                      <button
                        type="button"
                        className={`${btn} ml-2`}
                        disabled={pending || draft !== null}
                        onClick={() => {
                          setError(null);
                          setDraft({
                            kind: "complete_response",
                            challengeId: challenge.challengeId,
                            groupId: group.groupId,
                            completedByWizardId: wizards[0]?.wizardId ?? "",
                          });
                        }}
                      >
                        Start Complete Response
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={btn}
                disabled={pending || draft !== null}
                onClick={() => {
                  setError(null);
                  setDraft({
                    kind: "finalize_challenge",
                    challengeId: challenge.challengeId,
                    pendingHoldingDisposition: "shuffle_into_faustian_deck",
                    twistDestination: "remain_face_up_in_machinations",
                  });
                }}
              >
                Start Finalize Challenge
              </button>
            </div>
          ))}
        </div>
      )}
        </div>
      </details>

      {(schemeStale || cleanupStale) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          The live table changed after this action started. Confirmation still uses the captured intent and will reject if those preconditions no longer match.
        </p>
      )}
      {error !== null && <p className="text-xs text-red-700 dark:text-red-300" role="alert">{error}</p>}

      {draft?.kind === "scheme_occurred" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Record Scheme Occurred</p>
          <label className="block">Face-up Scheme
            <select className="ml-2 border rounded px-1" value={draft.schemeCardId} onChange={(event) => setDraft({ ...draft, schemeCardId: event.target.value as FaustianCardId })}>
              {draft.expectedFaustian.communities.find((community) => community.communityId === draft.communityId)?.schemes.filter((scheme) => scheme.facing === "face_up").map((scheme) => (
                <option key={scheme.cardId} value={scheme.cardId}>{faustianFaceUpIdentityLabel(scheme.cardId)}</option>
              ))}
            </select>
          </label>
          <label className="block">Destination
            <select className="ml-2 border rounded px-1" value={draft.destinationKind} onChange={(event) => setDraft({ ...draft, destinationKind: event.target.value as DestinationKind })}>
              <option value="ordinary_machinations">Ordinary — face-up Devil&apos;s Machinations</option>
              <option value="possession">Existing possession</option>
              <option value="domain_placement">Existing Domain placement</option>
            </select>
          </label>
          {draft.destinationKind === "possession" && (
            <label className="block">Holder
              <select className="ml-2 border rounded px-1" value={draft.holderWizardId} onChange={(event) => setDraft({ ...draft, holderWizardId: event.target.value })}>
                {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
              </select>
            </label>
          )}
          {draft.destinationKind === "domain_placement" && (
            <label className="block">Domain
              <select className="ml-2 border rounded px-1" value={draft.seatId} onChange={(event) => setDraft({ ...draft, seatId: event.target.value as PactSeatId })}>
                {PACT_SEAT_IDS.map((seatId) => <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>)}
              </select>
            </label>
          )}
          {preview?.requiresExplicitDirectSet && (
            <fieldset>
              <legend>Direct local Accomplices</legend>
              {preview.localAccompliceCardIds.map((cardId) => (
                <label key={cardId} className="block">
                  <input
                    type="checkbox"
                    checked={draft.selectedDirect.includes(cardId)}
                    onChange={(event) => setDraft({
                      ...draft,
                      selectedDirect: event.target.checked
                        ? [...draft.selectedDirect, cardId]
                        : draft.selectedDirect.filter((id) => id !== cardId),
                    })}
                  />
                  {" "}{faustianFaceUpIdentityLabel(cardId)}
                </label>
              ))}
            </fieldset>
          )}
          {preview !== null && preview.requiresExplicitDirectSet && draft.selectedDirect.length === 0 && (
            <p>
              Select at least one current local Accomplice as directly affected. Confirmation is blocked until that nonempty set is chosen. A zero-fall outcome cannot be confirmed when multiple locals exist.
            </p>
          )}
          {preview !== null && !(preview.requiresExplicitDirectSet && draft.selectedDirect.length === 0) && (
            <p>
              Server-derived consequence from the captured table: {preview.fallenAccompliceCardIds.length} Accomplice{preview.fallenAccompliceCardIds.length === 1 ? "" : "s"} fall
              {preview.cascadedAccompliceCardIds.length > 0 ? `, including ${preview.cascadedAccompliceCardIds.length} cascade` : ""}.
              Each fallen card adds one Pawn in its original Community. Hidden cards are not shown.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending || !isFaustianSchemeOccurrenceConfirmReady({
                schemeCardId: draft.schemeCardId,
                requiresExplicitDirectSet: preview?.requiresExplicitDirectSet === true,
                selectedDirectCount: draft.selectedDirect.length,
              })}
              onClick={() => void run(async () => {
                const destination: FaustianSchemeOccurrenceDestination = draft.destinationKind === "possession"
                  ? { kind: "possession", wizardId: draft.holderWizardId as WizardId, represented: { kind: "none" } }
                  : draft.destinationKind === "domain_placement"
                    ? { kind: "domain_placement", seatId: draft.seatId, represented: { kind: "none" } }
                    : { kind: "ordinary_machinations" };
                await recordScheme({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  communityId: draft.communityId,
                  schemeCardId: draft.schemeCardId,
                  destination,
                  directAccompliceCardIds: [...draft.selectedDirect],
                  expectedLocalAccompliceCardIds: [...draft.expectedLocalAccompliceCardIds],
                });
              })}
            >
              Confirm Scheme Occurred
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "disclose_twist" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Disclose / Replace Twist</p>
          <p>The server chooses the replacement from Faustian&apos;s Deck. A reserved Twist cannot be independently replaced.</p>
          <label className="block">Active Twist
            <select className="ml-2 border rounded px-1" value={draft.twistCardId} onChange={(event) => setDraft({ ...draft, twistCardId: event.target.value as FaustianCardId })}>
              {draft.expectedFaustian.activeTwistCardIds.filter((cardId) => !isFaustianTwistReserved(draft.expectedFaustian, cardId)).map((cardId, index) => (
                <option key={cardId} value={cardId}>Active Twist {index + 1}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={pending || draft.twistCardId === ""} onClick={() => void run(async () => {
              await discloseTwist({ commandId: commandId(), expectedCampaignId: campaignId, twistCardId: draft.twistCardId });
            })}>Confirm Disclose / Replace Twist</button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "twist_occurred" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Record Twist Occurred</p>
          <p>This reveals the Twist and moves the current Devil&apos;s Deck into Machinations. It does not choose a Machination result.</p>
          <label className="block">Active Twist
            <select className="ml-2 border rounded px-1" value={draft.twistCardId} onChange={(event) => setDraft({ ...draft, twistCardId: event.target.value as FaustianCardId })}>
              {draft.expectedFaustian.activeTwistCardIds.filter((cardId) => !isFaustianTwistReserved(draft.expectedFaustian, cardId)).map((cardId, index) => (
                <option key={cardId} value={cardId}>Active Twist {index + 1}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={pending || draft.twistCardId === ""} onClick={() => void run(async () => {
              await recordTwist({ commandId: commandId(), expectedCampaignId: campaignId, twistCardId: draft.twistCardId });
            })}>Confirm Twist Occurred</button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "machination_outcome" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Record Machination Outcome</p>
          <p>The table selects the scoring cards and declared result. The server validates the closed pattern and cleanup basis.</p>
          <fieldset>
            <legend>Scoring cards</legend>
            {draft.expectedFaustian.machinations.filter((card) => card.facing === "face_up").map((card) => (
              <label key={card.cardId} className="block">
                <input
                  type="checkbox"
                  checked={draft.selectedScoring.includes(card.cardId)}
                  onChange={(event) => {
                    const selectedScoring = event.target.checked
                      ? [...draft.selectedScoring, card.cardId]
                      : draft.selectedScoring.filter((id) => id !== card.cardId);
                    setDraft({
                      ...draft,
                      selectedScoring,
                      twoPairA: draft.twoPairA.filter((id) => selectedScoring.includes(id)),
                      twoPairB: draft.twoPairB.filter((id) => selectedScoring.includes(id)),
                      threeA: selectedScoring.includes(draft.threeA as FaustianCardId) ? draft.threeA : "",
                      threeB: selectedScoring.includes(draft.threeB as FaustianCardId) ? draft.threeB : "",
                      threeC: selectedScoring.includes(draft.threeC as FaustianCardId) ? draft.threeC : "",
                    });
                  }}
                />
                {" "}{faustianFaceUpIdentityLabel(card.cardId)}
              </label>
            ))}
          </fieldset>
          <label className="block">Declared result
            <select className="ml-2 border rounded px-1" value={draft.resultKind} onChange={(event) => setDraft({ ...draft, resultKind: event.target.value as ResultKind })}>
              <option value="one_pair">One Pair — delayed challenge</option>
              <option value="two_pair">Two Pair — delayed challenge</option>
              <option value="three_of_a_kind">Three of a Kind — delayed challenge</option>
              <option value="flush">Flush — persistent consequence</option>
              <option value="full_house">Full House — persistent consequence</option>
              <option value="table_resolved">Table-resolved immediate result</option>
            </select>
          </label>
          {(draft.resultKind === "two_pair" || draft.resultKind === "three_of_a_kind") && (
            <div className="space-y-1">
              <label className="block">Wizard A
                <select className="ml-2 border rounded px-1" value={draft.wizardA} onChange={(event) => setDraft({ ...draft, wizardA: event.target.value })}>
                  {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
                </select>
              </label>
              <label className="block">Wizard B
                <select className="ml-2 border rounded px-1" value={draft.wizardB} onChange={(event) => setDraft({ ...draft, wizardB: event.target.value })}>
                  {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
                </select>
              </label>
              {draft.resultKind === "three_of_a_kind" && (
                <label className="block">Wizard C
                  <select className="ml-2 border rounded px-1" value={draft.wizardC} onChange={(event) => setDraft({ ...draft, wizardC: event.target.value })}>
                    {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          {draft.resultKind === "two_pair" && (
            <div className="space-y-2">
              <p>Assign each selected pair to a different Wizard. Scoring-selection order is not used.</p>
              {(["twoPairA", "twoPairB"] as const).map((field) => (
                <fieldset key={field}>
                  <legend>{field === "twoPairA" ? "Pair for Wizard A" : "Pair for Wizard B"}</legend>
                  {draft.selectedScoring.map((cardId) => (
                    <label key={`${field}-${cardId}`} className="block">
                      <input
                        type="checkbox"
                        checked={draft[field].includes(cardId)}
                        onChange={(event) => {
                          const otherField = field === "twoPairA" ? "twoPairB" : "twoPairA";
                          const next = event.target.checked
                            ? [...draft[field].filter((id) => id !== cardId), cardId].slice(-2)
                            : draft[field].filter((id) => id !== cardId);
                          setDraft({
                            ...draft,
                            [field]: next,
                            [otherField]: draft[otherField].filter((id) => id !== cardId),
                          });
                        }}
                      />
                      {" "}{faustianFaceUpIdentityLabel(cardId)}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          )}
          {draft.resultKind === "three_of_a_kind" && (
            <div className="space-y-1">
              <p>Assign each matching card to a different Wizard.</p>
              {([
                ["threeA", "Wizard A card"],
                ["threeB", "Wizard B card"],
                ["threeC", "Wizard C card"],
              ] as const).map(([field, label]) => (
                <label key={field} className="block">{label}
                  <select className="ml-2 border rounded px-1" value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}>
                    <option value="">Select card</option>
                    {draft.selectedScoring.map((cardId) => (
                      <option key={cardId} value={cardId}>{faustianFaceUpIdentityLabel(cardId)}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          <fieldset>
            <legend>Outcome-dependent active Twists</legend>
            {draft.expectedFaustian.activeTwistCardIds.map((cardId, index) => (
              <label key={cardId} className="block">
                <input
                  type="checkbox"
                  checked={draft.outcomeTwists.includes(cardId)}
                  onChange={(event) => setDraft({
                    ...draft,
                    outcomeTwists: event.target.checked
                      ? [...draft.outcomeTwists, cardId]
                      : draft.outcomeTwists.filter((id) => id !== cardId),
                  })}
                />
                {" "}Active Twist {index + 1}{isFaustianTwistReserved(draft.expectedFaustian, cardId) ? " (already reserved)" : ""}
              </label>
            ))}
          </fieldset>
          {(draft.resultKind === "flush" || draft.resultKind === "full_house" || draft.resultKind === "table_resolved") && (
            <label className="block">Twist disposition
              <select className="ml-2 border rounded px-1" value={draft.twistDestination} onChange={(event) => setDraft({ ...draft, twistDestination: event.target.value as FaustianTwistDispositionDestination })}>
                <option value="remain_face_up_in_machinations">Remain face-up in Machinations</option>
                <option value="recycle_into_faustian_deck">Recycle into Faustian&apos;s Deck</option>
                <option value="move_to_defeated_schemes">Move to Defeated Schemes</option>
              </select>
            </label>
          )}
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={pending || !isFaustianMachinationOutcomeDraftReady({
              ...draft,
              activeTwistCardIds: draft.expectedFaustian.activeTwistCardIds,
            })} onClick={() => void run(async () => {
              const result = buildFaustianMachinationOutcomeResult({
                ...draft,
                activeTwistCardIds: draft.expectedFaustian.activeTwistCardIds,
              });
              await recordOutcome({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                scoringHandCardIds: [...draft.selectedScoring],
                result: result as never,
                expectedCleanupCardIds: [...draft.expectedCleanupCardIds],
                outcomeDependentTwistCardIds: [...draft.outcomeTwists],
              });
            })}>Confirm Machination Outcome</button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "complete_response" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Complete Response</p>
          <p>Records the table result of the Wizard&apos;s action. Shared Time is handled separately.</p>
          <label className="block">Completing Wizard
            <select className="ml-2 border rounded px-1" value={draft.completedByWizardId} onChange={(event) => setDraft({ ...draft, completedByWizardId: event.target.value })}>
              {wizards.map((wizard) => <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={pending || draft.completedByWizardId === ""} onClick={() => void run(async () => {
              await completeResponse({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                challengeId: draft.challengeId,
                groupId: draft.groupId,
                completedByWizardId: draft.completedByWizardId,
              });
            })}>Confirm Complete Response</button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "finalize_challenge" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Finalize Challenge</p>
          <p>A completed challenge still exists until this explicit final result. Choose the closed Twist disposition; there is no automatic Devil-success rule.</p>
          <label className="block">Remaining holding destination
            <select className="ml-2 border rounded px-1" value={draft.pendingHoldingDisposition} onChange={(event) => setDraft({ ...draft, pendingHoldingDisposition: event.target.value as FaustianPendingHoldingDisposition })}>
              <option value="shuffle_into_faustian_deck">Shuffle into Faustian&apos;s Deck</option>
              <option value="shuffle_into_devil_deck">Shuffle into Devil&apos;s Deck</option>
              <option value="move_to_defeated_schemes">Move to Defeated Schemes</option>
            </select>
          </label>
          <label className="block">Reserved Twist disposition
            <select className="ml-2 border rounded px-1" value={draft.twistDestination} onChange={(event) => setDraft({ ...draft, twistDestination: event.target.value as FaustianTwistDispositionDestination })}>
              <option value="remain_face_up_in_machinations">Remain face-up in Machinations</option>
              <option value="recycle_into_faustian_deck">Recycle into Faustian&apos;s Deck</option>
              <option value="move_to_defeated_schemes">Move to Defeated Schemes</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={pending} onClick={() => void run(async () => {
              const challenge = faustian.pendingMachinationChallenges.find((entry) => entry.challengeId === draft.challengeId);
              await finalizeChallenge({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                challengeId: draft.challengeId,
                pendingHoldingDisposition: draft.pendingHoldingDisposition,
                twistDispositions: (challenge?.outcomeDependentTwistCardIds ?? []).map((cardId) => ({
                  cardId,
                  destination: draft.twistDestination,
                })),
              });
            })}>Confirm Finalize Challenge</button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
