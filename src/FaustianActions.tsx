import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type {
  AgeDefinitionId,
  FaustianAntagonistChipCount,
  FaustianAntagonistGoal,
  FaustianArrangementId,
  FaustianCardId,
  FaustianCommunityId,
  FaustianState,
  PactSeatId,
} from "../shared/domain";
import {
  FAUSTIAN_ANTAGONIST_CHIP_COUNTS,
  FAUSTIAN_ANTAGONIST_GOALS,
  FAUSTIAN_SUITS,
  allowedFaustianArrangementsForAge,
  faustianCardId,
  faustianCommunityHeader,
  faustianFaceUpIdentityLabel,
  faustianStatesEqual,
  isValidAgeDefinitionId,
  pactSeatDisplayName,
  PACT_SEAT_IDS,
} from "../shared/domain";
import type { DenizenRef } from "./WorldSurface";
import type { FaustianTablePresentation, FaustianWizardRef } from "./faustian-view-model";
import {
  SHARED_TIME_BOUNDARY_COPY,
  cloneFaustianState,
  communityAllAccomplices,
  isExactStructuralHelperFaustian,
  isExactUnarrangedFaustianBaseline,
  synthesizeFaustianAfterSchemeReveal,
} from "./faustian-view-model";

const btn =
  "text-xs font-medium rounded-lg px-2.5 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

const TWOS: readonly FaustianCardId[] = FAUSTIAN_SUITS.map((suit) => faustianCardId(suit, "2"));

function commandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function communityLabel(communityId: FaustianCommunityId): string {
  return faustianCommunityHeader(communityId).zodiacLabel;
}

type Draft =
  | {
    readonly kind: "arrange";
    readonly expectedFaustian: FaustianState;
    readonly expectedAgeId: AgeDefinitionId;
    readonly expectedAgeYears: number | null;
    readonly expectedElements: FaustianWizardRef["elements"];
    arrangementId: FaustianArrangementId;
    favoriteCommunityId: FaustianCommunityId;
    pawnCommunityId: FaustianCommunityId | "";
    reservedTwistCardId: FaustianCardId | "";
    calamityName: string;
    calamityCommunityId: FaustianCommunityId;
    calamitySeatId: PactSeatId;
    calamityChipCount: FaustianAntagonistChipCount;
    calamityGoal: FaustianAntagonistGoal;
    calamityExistingId: string;
  }
  | { readonly kind: "placeholder"; readonly expectedFaustian: FaustianState }
  | {
    readonly kind: "investigate";
    stage: "reveal" | "foil";
    readonly communityId: FaustianCommunityId;
    expectedFaustian: FaustianState;
    readonly eligibleSchemeCardIds: readonly FaustianCardId[];
    selectedSchemeCardId: FaustianCardId | "";
  }
  | { readonly kind: "blackmail"; readonly communityId: FaustianCommunityId; readonly expectedFaustian: FaustianState }
  | {
    readonly kind: "place_schemes";
    readonly communityId: FaustianCommunityId;
    readonly expectedFaustian: FaustianState;
    requestedQuantity: number;
  }
  | {
    readonly kind: "pawn";
    readonly communityId: FaustianCommunityId;
    readonly expectedFaustian: FaustianState;
    readonly expectedPawnCount: number;
    readonly delta: 1 | -1;
  }
  | {
    readonly kind: "conspiracy";
    readonly communityId: FaustianCommunityId;
    readonly expectedFaustian: FaustianState;
    subjectKind: "existing" | "create";
    existingDenizenId: string;
    createName: string;
    seatId: PactSeatId;
    chipCount: FaustianAntagonistChipCount;
    goal: FaustianAntagonistGoal;
  }
  | {
    readonly kind: "direct";
    readonly accompliceCardId: FaustianCardId;
    readonly sourceCommunityId: FaustianCommunityId;
    destinationCommunityId: FaustianCommunityId | "";
  }
  | {
    readonly kind: "disrupt";
    readonly communityId: FaustianCommunityId;
    accompliceCardId: FaustianCardId | "";
  };

function asConvexFaustian(faustian: FaustianState): never {
  return faustian as never;
}

function rejectionText(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "The action was rejected.";
}

export default function FaustianActions({
  faustian,
  campaignId,
  lifecycleKind,
  ageId,
  faustianWizard,
  denizens,
  selectedCommunityId,
  presentation,
}: {
  readonly faustian: FaustianState;
  readonly campaignId: string;
  readonly lifecycleKind: "setup" | "play";
  readonly ageId: string | null;
  readonly faustianWizard: FaustianWizardRef | null;
  readonly denizens: readonly DenizenRef[];
  readonly selectedCommunityId: FaustianCommunityId | null;
  readonly presentation: FaustianTablePresentation;
}) {
  const arrangeTable = useMutation(api.m3Commands.arrangeFaustianTable);
  const completePlaceholder = useMutation(api.m3Commands.completeFaustianStructuralPlaceholder);
  const revealSchemes = useMutation(api.m3Commands.revealFaustianCommunitySchemes);
  const foilScheme = useMutation(api.m3Commands.foilFaustianCommunityScheme);
  const blackmail = useMutation(api.m3Commands.blackmailFaustianCommunity);
  const placeSchemes = useMutation(api.m3Commands.placeFaustianSchemes);
  const addPawn = useMutation(api.m3Commands.addFaustianPawn);
  const removePawn = useMutation(api.m3Commands.removeFaustianPawn);
  const establishConspiracy = useMutation(api.m3Commands.establishFaustianConspiracy);
  const directAccomplice = useMutation(api.m3Commands.directFaustianAccomplice);
  const disruptPawn = useMutation(api.m3Commands.disruptFaustianPawn);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parsedAgeId = ageId !== null && isValidAgeDefinitionId(ageId) ? ageId : null;
  const allowedArrangements = allowedFaustianArrangementsForAge(parsedAgeId);
  const unarranged = isExactUnarrangedFaustianBaseline(faustian);
  const helperSignature = isExactStructuralHelperFaustian(faustian);
  const selectedLive = selectedCommunityId === null
    ? null
    : faustian.communities.find((community) => community.communityId === selectedCommunityId) ?? null;
  const collectiveDenizens = denizens.filter((denizen) => denizen.representation === "collective");

  const staleFaustian = draft !== null
    && "expectedFaustian" in draft
    && !faustianStatesEqual(draft.expectedFaustian, faustian);

  const communityOptions = presentation.communities.map((community) => (
    <option key={community.communityId} value={community.communityId}>{community.headerLabel}</option>
  ));

  async function run(action: () => Promise<unknown>, onSuccess?: () => void): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await action();
      onSuccess?.();
    } catch (caught) {
      setError(rejectionText(caught));
    } finally {
      setPending(false);
    }
  }

  const startCommunity = selectedCommunityId;

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3" aria-label="Faustian actions">
      <h3 className="text-sm font-semibold">Ordinary Faustian actions</h3>
      <p className="text-xs text-slate-500">
        Selecting a Community inspects it. Start an action explicitly, then confirm or cancel.
        Captured intent is not rewritten when the table updates in realtime.
      </p>

      {lifecycleKind === "setup" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null || parsedAgeId === null || !unarranged || allowedArrangements.length === 0}
            onClick={() => {
              if (parsedAgeId === null) return;
              setError(null);
              setDraft({
                kind: "arrange",
                expectedFaustian: cloneFaustianState(faustian),
                expectedAgeId: parsedAgeId,
                expectedAgeYears: faustianWizard?.ageYears ?? null,
                expectedElements: faustianWizard?.elements ?? null,
                arrangementId: allowedArrangements[0]!,
                favoriteCommunityId: "aries",
                pawnCommunityId: "leo",
                reservedTwistCardId: parsedAgeId === "awakening" ? TWOS[0]! : "",
                calamityName: "",
                calamityCommunityId: "aries",
                calamitySeatId: "faustian",
                calamityChipCount: 1,
                calamityGoal: FAUSTIAN_ANTAGONIST_GOALS[0],
                calamityExistingId: "",
              });
            }}
          >
            Start Arrange Table
          </button>
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null || !helperSignature}
            onClick={() => {
              setError(null);
              setDraft({ kind: "placeholder", expectedFaustian: cloneFaustianState(faustian) });
            }}
          >
            Start Complete Structural Placeholder
          </button>
        </div>
      )}

      {startCommunity !== null && selectedLive !== null && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null}
            onClick={() => {
              setError(null);
              setDraft({
                kind: "investigate",
                stage: "reveal",
                communityId: startCommunity,
                expectedFaustian: cloneFaustianState(faustian),
                eligibleSchemeCardIds: selectedLive.schemes.map((scheme) => scheme.cardId),
                selectedSchemeCardId: "",
              });
            }}
          >
            Start Investigate
          </button>
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null}
            onClick={() => {
              setError(null);
              setDraft({
                kind: "blackmail",
                communityId: startCommunity,
                expectedFaustian: cloneFaustianState(faustian),
              });
            }}
          >
            Start Blackmail
          </button>
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null}
            onClick={() => {
              setError(null);
              setDraft({
                kind: "place_schemes",
                communityId: startCommunity,
                expectedFaustian: cloneFaustianState(faustian),
                requestedQuantity: 1,
              });
            }}
          >
            Start Place Schemes
          </button>
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null}
            onClick={() => {
              setError(null);
              setDraft({
                kind: "pawn",
                communityId: startCommunity,
                expectedFaustian: cloneFaustianState(faustian),
                expectedPawnCount: selectedLive.pawnCount,
                delta: 1,
              });
            }}
          >
            Start add Pawn
          </button>
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null || selectedLive.pawnCount < 1}
            onClick={() => {
              setError(null);
              setDraft({
                kind: "pawn",
                communityId: startCommunity,
                expectedFaustian: cloneFaustianState(faustian),
                expectedPawnCount: selectedLive.pawnCount,
                delta: -1,
              });
            }}
          >
            Start remove Pawn
          </button>
          <button
            type="button"
            className={btn}
            disabled={pending || draft !== null}
            onClick={() => {
              setError(null);
              setDraft({
                kind: "conspiracy",
                communityId: startCommunity,
                expectedFaustian: cloneFaustianState(faustian),
                subjectKind: "create",
                existingDenizenId: collectiveDenizens[0]?.denizenId ?? "",
                createName: "",
                seatId: "faustian",
                chipCount: 1,
                goal: FAUSTIAN_ANTAGONIST_GOALS[0],
              });
            }}
          >
            Start establish Conspiracy
          </button>
          {communityAllAccomplices(faustian, startCommunity).map((card) => (
            card.facing === "face_up" ? (
              <button
                key={card.cardId}
                type="button"
                className={btn}
                disabled={pending || draft !== null}
                onClick={() => {
                  setError(null);
                  setDraft({
                    kind: "direct",
                    accompliceCardId: card.cardId,
                    sourceCommunityId: startCommunity,
                    destinationCommunityId: "",
                  });
                }}
              >
                Start Direct {card.identityLabel}
              </button>
            ) : null
          ))}
          {selectedLive.pawnCount > 0 && selectedLive.accompliceCardIds.length > 0 && (
            <button
              type="button"
              className={btn}
              disabled={pending || draft !== null}
              onClick={() => {
                setError(null);
                setDraft({
                  kind: "disrupt",
                  communityId: startCommunity,
                  accompliceCardId: selectedLive.accompliceCardIds[0] ?? "",
                });
              }}
            >
              Start Disrupt Pawn
            </button>
          )}
        </div>
      )}

      {draft === null && startCommunity === null && lifecycleKind === "play" && (
        <p className="text-xs text-slate-400">Select a Community to see ordinary board actions.</p>
      )}

      {staleFaustian && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          The live table changed after this action started. Confirmation still uses the captured intent and will reject if those preconditions no longer match.
        </p>
      )}
      {error !== null && (
        <p className="text-xs text-red-700 dark:text-red-300" role="alert">{error}</p>
      )}

      {draft?.kind === "arrange" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Arrange Table</p>
          <p>Random selection is server-authoritative. The client does not supply shuffled cards.</p>
          <label className="block">Arrangement
            <select
              className="ml-2 border rounded px-1"
              value={draft.arrangementId}
              onChange={(event) => setDraft({ ...draft, arrangementId: event.target.value as FaustianArrangementId })}
            >
              {allowedArrangements.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="block">Favorite Community
            <select
              className="ml-2 border rounded px-1"
              value={draft.favoriteCommunityId}
              onChange={(event) => setDraft({ ...draft, favoriteCommunityId: event.target.value as FaustianCommunityId })}
            >
              {communityOptions}
            </select>
          </label>
          {(draft.arrangementId === "dynamic" || draft.arrangementId === "explosive") && (
            <label className="block">Pawn Community
              <select
                className="ml-2 border rounded px-1"
                value={draft.pawnCommunityId}
                onChange={(event) => setDraft({ ...draft, pawnCommunityId: event.target.value as FaustianCommunityId })}
              >
                {communityOptions}
              </select>
            </label>
          )}
          {draft.expectedAgeId === "awakening" && (
            <label className="block">Reserved Twist Two
              <select
                className="ml-2 border rounded px-1"
                value={draft.reservedTwistCardId}
                onChange={(event) => setDraft({ ...draft, reservedTwistCardId: event.target.value as FaustianCardId })}
              >
                {TWOS.map((cardId) => <option key={cardId} value={cardId}>{faustianFaceUpIdentityLabel(cardId)}</option>)}
              </select>
            </label>
          )}
          {draft.expectedAgeId === "calamity" && (
            <div className="space-y-1">
              <p>Age of Calamity requires explicit Antagonist/Conspiracy choices. This does not invent another Domain&apos;s fiction.</p>
              <label className="block">New collective name
                <input className="ml-2 border rounded px-1" value={draft.calamityName} onChange={(event) => setDraft({ ...draft, calamityName: event.target.value })} />
              </label>
              <label className="block">Goal
                <select className="ml-2 border rounded px-1" value={draft.calamityGoal} onChange={(event) => setDraft({ ...draft, calamityGoal: event.target.value as FaustianAntagonistGoal })}>
                  {FAUSTIAN_ANTAGONIST_GOALS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
                </select>
              </label>
              <label className="block">Seat
                <select className="ml-2 border rounded px-1" value={draft.calamitySeatId} onChange={(event) => setDraft({ ...draft, calamitySeatId: event.target.value as PactSeatId })}>
                  {PACT_SEAT_IDS.map((seatId) => <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>)}
                </select>
              </label>
              <label className="block">Chips
                <select className="ml-2 border rounded px-1" value={draft.calamityChipCount} onChange={(event) => setDraft({ ...draft, calamityChipCount: Number(event.target.value) as FaustianAntagonistChipCount })}>
                  {FAUSTIAN_ANTAGONIST_CHIP_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => void run(async () => {
                await arrangeTable({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  arrangementId: draft.arrangementId,
                  favoriteCommunityId: draft.favoriteCommunityId,
                  pawnCommunityId: draft.arrangementId === "quiet" ? null : (draft.pawnCommunityId || null),
                  reservedTwistCardId: draft.expectedAgeId === "awakening" ? (draft.reservedTwistCardId || null) : null,
                  expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                  expectedAgeId: draft.expectedAgeId,
                  expectedAgeYears: draft.expectedAgeYears,
                  expectedElements: draft.expectedElements,
                  calamityAntagonist: draft.expectedAgeId === "calamity"
                    ? {
                      denizenId: `den_${crypto.randomUUID()}`,
                      create: { name: draft.calamityName },
                      communityId: draft.calamityCommunityId,
                      seatId: draft.calamitySeatId,
                      chipCount: draft.calamityChipCount,
                      goal: draft.calamityGoal,
                    }
                    : null,
                });
              }, () => setDraft(null))}
            >
              Confirm Arrange Table
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "placeholder" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Complete Structural Placeholder</p>
          <p>Matching the unused helper signature is not proof that this campaign was historically unused. This is only available during setup.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => void run(async () => {
                await completePlaceholder({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                });
              }, () => setDraft(null))}
            >
              Confirm Complete Structural Placeholder
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "investigate" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Investigate {communityLabel(draft.communityId)}</p>
          <p>{SHARED_TIME_BOUNDARY_COPY}</p>
          {draft.stage === "reveal" ? (
            <>
              <p>Stage 1 reveals every currently facedown Scheme in this Community. Already face-up Schemes stay face-up. Eligible foil targets include both.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btn}
                  disabled={pending}
                  onClick={() => void run(async () => {
                    await revealSchemes({
                      commandId: commandId(),
                      expectedCampaignId: campaignId,
                      communityId: draft.communityId,
                      expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                    });
                    const after = synthesizeFaustianAfterSchemeReveal(draft.expectedFaustian, draft.communityId);
                    const eligible = after.communities.find((community) => community.communityId === draft.communityId)?.schemes.map((scheme) => scheme.cardId) ?? [];
                    setDraft({
                      ...draft,
                      stage: "foil",
                      expectedFaustian: after,
                      eligibleSchemeCardIds: eligible,
                      selectedSchemeCardId: eligible[0] ?? "",
                    });
                  })}
                >
                  Confirm Investigate reveal
                </button>
                <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p>Stage 2 foils only the selected captured Scheme. Later arrivals are not eligible. Reload or cancel does not auto-foil.</p>
              <label className="block">Eligible Scheme
                <select
                  className="ml-2 border rounded px-1"
                  value={draft.selectedSchemeCardId}
                  onChange={(event) => setDraft({ ...draft, selectedSchemeCardId: event.target.value as FaustianCardId })}
                >
                  {draft.eligibleSchemeCardIds.map((cardId) => (
                    <option key={cardId} value={cardId}>{faustianFaceUpIdentityLabel(cardId)}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btn}
                  disabled={pending || draft.selectedSchemeCardId === ""}
                  onClick={() => void run(async () => {
                    await foilScheme({
                      commandId: commandId(),
                      expectedCampaignId: campaignId,
                      communityId: draft.communityId,
                      schemeCardId: draft.selectedSchemeCardId,
                      expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                    });
                  }, () => setDraft(null))}
                >
                  Confirm foil
                </button>
                <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {draft?.kind === "blackmail" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Blackmail {communityLabel(draft.communityId)}</p>
          <p>{SHARED_TIME_BOUNDARY_COPY}</p>
          <p>The server draws the current top Faustian Deck card. The client does not supply that card.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => void run(async () => {
                await blackmail({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  communityId: draft.communityId,
                  expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                });
              }, () => setDraft(null))}
            >
              Confirm Blackmail
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "place_schemes" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Place Schemes in {communityLabel(draft.communityId)}</p>
          <p>{SHARED_TIME_BOUNDARY_COPY}</p>
          <p>If Devil&apos;s Deck has fewer cards than requested, zero cards move. Quantity is not clamped.</p>
          <label className="block">Requested quantity
            <input
              type="number"
              min={1}
              className="ml-2 border rounded px-1 w-16"
              value={draft.requestedQuantity}
              onChange={(event) => setDraft({ ...draft, requestedQuantity: Number(event.target.value) })}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => void run(async () => {
                await placeSchemes({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  communityId: draft.communityId,
                  requestedQuantity: draft.requestedQuantity,
                  expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                });
              }, () => setDraft(null))}
            >
              Confirm Place Schemes
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "pawn" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">{draft.delta === 1 ? "Add" : "Remove"} Pawn in {communityLabel(draft.communityId)}</p>
          <p>Pawns are count-based. This does not create a person.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => void run(async () => {
                const args = {
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  communityId: draft.communityId,
                  expectedPawnCount: draft.expectedPawnCount,
                  expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                };
                if (draft.delta === 1) await addPawn(args);
                else await removePawn(args);
              }, () => setDraft(null))}
            >
              Confirm {draft.delta === 1 ? "add" : "remove"} Pawn
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "conspiracy" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Establish Conspiracy in {communityLabel(draft.communityId)}</p>
          <p>{SHARED_TIME_BOUNDARY_COPY}</p>
          <label className="block">Subject
            <select className="ml-2 border rounded px-1" value={draft.subjectKind} onChange={(event) => setDraft({ ...draft, subjectKind: event.target.value as "existing" | "create" })}>
              <option value="create">Create collective Denizen</option>
              <option value="existing">Existing collective Denizen</option>
            </select>
          </label>
          {draft.subjectKind === "create" ? (
            <label className="block">Name
              <input className="ml-2 border rounded px-1" value={draft.createName} onChange={(event) => setDraft({ ...draft, createName: event.target.value })} />
            </label>
          ) : (
            <label className="block">Collective Denizen
              <select className="ml-2 border rounded px-1" value={draft.existingDenizenId} onChange={(event) => setDraft({ ...draft, existingDenizenId: event.target.value })}>
                {collectiveDenizens.map((denizen) => <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>)}
              </select>
            </label>
          )}
          <label className="block">Goal
            <select className="ml-2 border rounded px-1" value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value as FaustianAntagonistGoal })}>
              {FAUSTIAN_ANTAGONIST_GOALS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
            </select>
          </label>
          <label className="block">Seat
            <select className="ml-2 border rounded px-1" value={draft.seatId} onChange={(event) => setDraft({ ...draft, seatId: event.target.value as PactSeatId })}>
              {PACT_SEAT_IDS.map((seatId) => <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>)}
            </select>
          </label>
          <label className="block">Chips
            <select className="ml-2 border rounded px-1" value={draft.chipCount} onChange={(event) => setDraft({ ...draft, chipCount: Number(event.target.value) as FaustianAntagonistChipCount })}>
              {FAUSTIAN_ANTAGONIST_CHIP_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => void run(async () => {
                await establishConspiracy({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  communityId: draft.communityId,
                  expectedFaustian: asConvexFaustian(draft.expectedFaustian),
                  subjectKind: draft.subjectKind,
                  denizenId: draft.subjectKind === "create" ? `den_${crypto.randomUUID()}` : draft.existingDenizenId,
                  createName: draft.subjectKind === "create" ? draft.createName : null,
                  seatId: draft.seatId,
                  chipCount: draft.chipCount,
                  goal: draft.goal,
                });
              }, () => setDraft(null))}
            >
              Confirm establish Conspiracy
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "direct" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Direct Accomplice</p>
          <p>{SHARED_TIME_BOUNDARY_COPY}</p>
          <label className="block">Destination Community
            <select className="ml-2 border rounded px-1" value={draft.destinationCommunityId} onChange={(event) => setDraft({ ...draft, destinationCommunityId: event.target.value as FaustianCommunityId })}>
              <option value="">Select</option>
              {communityOptions}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending || draft.destinationCommunityId === ""}
              onClick={() => void run(async () => {
                await directAccomplice({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  accompliceCardId: draft.accompliceCardId,
                  destinationCommunityId: draft.destinationCommunityId,
                });
              }, () => setDraft(null))}
            >
              Confirm Direct Accomplice
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {draft?.kind === "disrupt" && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">Disrupt Pawn in {communityLabel(draft.communityId)}</p>
          <p>{SHARED_TIME_BOUNDARY_COPY}</p>
          <label className="block">Accomplice
            <select className="ml-2 border rounded px-1" value={draft.accompliceCardId} onChange={(event) => setDraft({ ...draft, accompliceCardId: event.target.value as FaustianCardId })}>
              {(selectedLive?.accompliceCardIds ?? []).map((cardId) => (
                <option key={cardId} value={cardId}>{faustianFaceUpIdentityLabel(cardId)}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending || draft.accompliceCardId === ""}
              onClick={() => void run(async () => {
                await disruptPawn({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  communityId: draft.communityId,
                  accompliceCardId: draft.accompliceCardId,
                });
              }, () => setDraft(null))}
            >
              Confirm Disrupt Pawn
            </button>
            <button type="button" className={btn} disabled={pending} onClick={() => { setDraft(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
