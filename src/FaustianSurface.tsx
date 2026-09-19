import { useMemo, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import {
  type FaustianCardId,
  type FaustianCommunityId,
  type FaustianState,
  type SorcererExternalPresence,
} from "../shared/domain";
import LoreContextPanel from "./LoreContextPanel";
import type { LoreCompendiumUiState } from "./lore-view-model";
import type { WorldReference } from "./WorldSurface";
import FaustianActions from "./FaustianActions";
import FaustianAdvancedActions from "./FaustianAdvancedActions";
import FaustianLifecycleActions from "./FaustianLifecycleActions";
import {
  FaustianOccurrenceChooser,
  FaustianSchemeSupplyGhost,
  FaustianTableContextMenu,
  useFaustianTablePlay,
} from "./FaustianTableInteraction";
import {
  FAUSTIAN_TABLE_MIN_WIDTH_PX,
  FACEDOWN_ACCOMPLICE_SUPPLY_LABEL,
  FACEDOWN_SCHEME_SUPPLY_LABEL,
  FACEDOWN_TWIST_LABEL,
  PRIVATE_TWIST_INSPECT_HINT,
  PRIVATE_TWIST_INSPECT_LABEL,
  buildFaustianTablePresentation,
  communityAllAccomplices,
  communityAllSchemes,
  faustianLoreSubjects,
  privateTwistInspection,
  type FaustianPublicCardPresentation,
  type FaustianTablePresentation,
  type FaustianWizardRef,
  type NamedWizardRef,
} from "./faustian-view-model";

export type { FaustianWizardRef };

type InspectorTarget =
  | { readonly kind: "community"; readonly communityId: FaustianCommunityId }
  | { readonly kind: "card"; readonly card: FaustianPublicCardPresentation; readonly communityId?: FaustianCommunityId }
  | { readonly kind: "private_twist"; readonly index: number }
  | { readonly kind: "faustian_deck" }
  | { readonly kind: "devil_deck" };

type Selection =
  | { readonly kind: "community"; readonly communityId: FaustianCommunityId }
  | { readonly kind: "card"; readonly instanceKey: string }
  | { readonly kind: "twist"; readonly index: number }
  | { readonly kind: "supporting"; readonly area: SupportingArea };

type SupportingArea =
  | "faustian_deck"
  | "devil_deck"
  | "twists"
  | "machinations"
  | "defeated"
  | "held"
  | "entrusted"
  | "possession"
  | "domain"
  | "sorcerer"
  | "lore";

const ghostBtn =
  "text-[0.65rem] font-medium rounded-md px-2 py-0.5 border border-amber-200/40 text-amber-100 hover:bg-emerald-800 cursor-pointer disabled:opacity-40";

function cardFaceClass(card: FaustianPublicCardPresentation): string {
  if (card.facing === "face_down") {
    return "bg-slate-800 text-slate-100 border-slate-950";
  }
  return "bg-white text-slate-950 border-slate-800";
}

function suitGlyphClass(card: FaustianPublicCardPresentation): string {
  if (card.facing === "face_down") return "text-slate-100";
  const suit = card.cardId.slice(0, card.cardId.indexOf("_"));
  if (suit === "hearts" || suit === "diamonds") return "text-red-800";
  return "text-slate-950";
}

function PlayingCardToken({
  card,
  selected = false,
  onSelect,
  treatmentLabel = null,
  onContextMenu,
  foilAvailable = false,
}: {
  readonly card: FaustianPublicCardPresentation;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly treatmentLabel?: string | null;
  readonly onContextMenu?: (event: ReactMouseEvent) => void;
  readonly foilAvailable?: boolean;
}) {
  const interactive = onSelect !== undefined || onContextMenu !== undefined;
  const revealed = card.facing === "face_up";
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onContextMenu={onContextMenu}
      data-faustian-card={card.kind}
      aria-label={card.ariaLabel}
      title={card.facing === "face_down" ? card.publicLabel : `${card.publicLabel} ${card.identityLabel}`}
      className={`relative shrink-0 w-[4.5rem] h-[6.25rem] rounded-md border leading-tight px-1.5 py-1 text-left shadow-sm select-none ${cardFaceClass(card)} ${
        selected ? "ring-2 ring-teal-500" : ""
      } ${treatmentLabel !== null ? "ring-2 ring-amber-500" : ""} ${interactive ? "cursor-pointer" : "cursor-default"}`}
    >
      {treatmentLabel !== null && (
        <span className="absolute -top-2 left-1 rounded bg-amber-700 px-1 text-[0.55rem] font-semibold text-white">
          {treatmentLabel}
        </span>
      )}
      {revealed ? (
        <>
          <span className={`block text-lg font-bold leading-none ${suitGlyphClass(card)}`}>{card.publicLabel}</span>
          <span className="block mt-1 text-[0.58rem] font-semibold uppercase tracking-wide text-slate-700">{card.roleKindLabel}</span>
          <span className="block text-[0.58rem] leading-tight text-slate-800 whitespace-pre-line">{card.glanceLine}</span>
        </>
      ) : (
        <span className="font-semibold block text-[0.65rem]">{card.publicLabel}</span>
      )}
      {foilAvailable && (
        <span className="absolute bottom-1 left-1 right-1 rounded bg-teal-800 px-1 text-[0.55rem] font-semibold text-white">
          Foil
        </span>
      )}
    </button>
  );
}

function FannedPile({
  cards,
  overflowLabel,
  onInspect,
  onCardSelect,
  selectedInstanceKey,
  onCardContextMenu,
  foilEligible,
}: {
  readonly cards: FaustianTablePresentation["communities"][number]["schemes"];
  readonly overflowLabel: string | null;
  readonly onInspect?: () => void;
  readonly onCardSelect?: (card: FaustianPublicCardPresentation) => void;
  readonly selectedInstanceKey?: string | null;
  readonly onCardContextMenu?: (card: FaustianPublicCardPresentation, event: ReactMouseEvent) => void;
  readonly foilEligible?: (card: FaustianPublicCardPresentation) => boolean;
}) {
  if (cards.totalCount === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex">
        {cards.visible.map((card, index) => (
          <div key={card.instanceKey} className={index === 0 ? "" : "-ml-6"}>
            <PlayingCardToken
              card={card}
              selected={selectedInstanceKey === card.instanceKey}
              onSelect={onCardSelect === undefined ? undefined : () => onCardSelect(card)}
              onContextMenu={onCardContextMenu === undefined ? undefined : (event) => onCardContextMenu(card, event)}
              foilAvailable={foilEligible?.(card) === true}
            />
          </div>
        ))}
      </div>
      {overflowLabel !== null && (
        <button type="button" className={ghostBtn} onClick={onInspect} aria-label={overflowLabel}>
          {overflowLabel}
        </button>
      )}
    </div>
  );
}

function PhysicalZone({
  title,
  zone,
  children,
  attention = null,
  selected = false,
  onSelect,
  onContextMenu,
  className = "",
}: {
  readonly title: string;
  readonly zone: string;
  readonly children: React.ReactNode;
  readonly attention?: string | null;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly onContextMenu?: (event: ReactMouseEvent) => void;
  readonly className?: string;
}) {
  return (
    <section
      data-faustian-zone={zone}
      data-faustian-attention={attention ?? undefined}
      onContextMenu={onContextMenu}
      className={`rounded-md bg-emerald-950/50 p-2.5 space-y-2 border border-emerald-900/80 ${
        selected ? "ring-2 ring-amber-400/80" : ""
      } ${attention !== null ? "ring-1 ring-amber-400/90" : ""} ${className}`}
    >
      <h3 className="text-sm font-semibold tracking-wide">
        {onSelect !== undefined ? (
          <button type="button" className="cursor-pointer text-left" onClick={onSelect}>
            {title}
          </button>
        ) : title}
      </h3>
      {children}
    </section>
  );
}

function DeckStack({ count, emptyLabel }: { readonly count: number; readonly emptyLabel: string }) {
  if (count === 0) {
    return (
      <div className="w-[4.5rem] h-[6.25rem] rounded-md border border-dashed border-amber-500/80 bg-emerald-950/10 text-[0.65rem] text-amber-200 flex items-center justify-center text-center px-1">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="relative w-[4.5rem] h-[6.25rem]">
      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-md border border-slate-950 bg-slate-900" />
      <div className="absolute inset-0 rounded-md border border-slate-950 bg-slate-800 text-slate-100 text-[0.65rem] px-1.5 py-1 shadow-md">
        <span className="font-semibold block">Facedown</span>
        <span className="block mt-1 tabular-nums">{count}</span>
      </div>
    </div>
  );
}

function InspectedCardDetail({
  card,
  community,
  onClose,
}: {
  readonly card: FaustianPublicCardPresentation;
  readonly community: FaustianTablePresentation["communities"][number] | null;
  readonly onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Card detail</h3>
        <button type="button" className={ghostBtn} onClick={onClose}>Close inspector</button>
      </div>
      <PlayingCardToken card={card} selected />
      {card.facing === "face_up" ? (
        <div className="space-y-1 text-xs text-emerald-50">
          <p className="text-lg font-bold leading-none">{card.rankSuitGlyph}</p>
          <p>{card.identityLabel}</p>
          <p>{card.roleKindLabel}</p>
          <p className="whitespace-pre-line">{card.glanceLine}</p>
          {community !== null && (
            <p data-faustian-inspector-location>{community.zodiacLabel}</p>
          )}
          {card.kind === "accomplice" && (
            <p>{card.syndicateLabel ?? "Accomplice syndicate wording is not transcribed here."}</p>
          )}
          <p className="text-emerald-200/80">{card.sourceOmission}</p>
        </div>
      ) : (
        <div className="space-y-1 text-xs text-emerald-50">
          <p>{card.publicLabel}</p>
          {community !== null && (
            <p data-faustian-inspector-location>{community.zodiacLabel}</p>
          )}
          <p className="text-emerald-200/80">Identity stays hidden unless private inspection is allowed.</p>
        </div>
      )}
    </>
  );
}

export default function FaustianSurface({
  faustian,
  campaignId,
  world = null,
  sorcererPresence = [],
  loreCompendium,
  faustianWizard = null,
  wizards = [],
  layout = "full",
  lifecycleKind = "play",
  ageId = null,
  monthOrdinal = 0,
}: {
  readonly faustian: FaustianState;
  readonly campaignId: string;
  readonly world?: WorldReference | null;
  readonly sorcererPresence?: readonly SorcererExternalPresence[];
  readonly loreCompendium?: LoreCompendiumUiState;
  readonly faustianWizard?: FaustianWizardRef | null;
  readonly wizards?: readonly NamedWizardRef[];
  readonly layout?: "full" | "narrow";
  readonly lifecycleKind?: "setup" | "play";
  readonly ageId?: string | null;
  readonly monthOrdinal?: number;
}) {
  const presentation = useMemo(
    () => buildFaustianTablePresentation({
      faustian,
      sorcererPresence,
      denizens: world?.denizens ?? [],
      wizards,
      currentMonthOrdinal: monthOrdinal,
    }),
    [faustian, sorcererPresence, world, wizards, monthOrdinal],
  );
  const loreSubjects = useMemo(
    () => faustianLoreSubjects(loreCompendium, faustianWizard),
    [loreCompendium, faustianWizard],
  );
  const play = useFaustianTablePlay({ faustian, campaignId, wizards, lifecycleKind });

  const [selection, setSelection] = useState<Selection | null>(null);
  const [inspector, setInspector] = useState<InspectorTarget | null>(null);

  const inspectorCommunityId = inspector?.kind === "community" ? inspector.communityId : inspector?.kind === "card" ? inspector.communityId : undefined;
  const inspectorCommunity = inspectorCommunityId === undefined
    ? null
    : presentation.communities.find((community) => community.communityId === inspectorCommunityId) ?? null;
  const inspectorSchemes = inspectorCommunityId === undefined ? [] : communityAllSchemes(faustian, inspectorCommunityId);
  const inspectorAccomplices = inspectorCommunityId === undefined ? [] : communityAllAccomplices(faustian, inspectorCommunityId);
  const privateTwist = inspector?.kind === "private_twist" ? privateTwistInspection(faustian, inspector.index) : null;

  function inspectCommunity(communityId: FaustianCommunityId): void {
    setSelection({ kind: "community", communityId });
    setInspector({ kind: "community", communityId });
  }

  function inspectCard(card: FaustianPublicCardPresentation, communityId?: FaustianCommunityId): void {
    setSelection({ kind: "card", instanceKey: card.instanceKey });
    setInspector({ kind: "card", card, communityId });
  }

  function selectCommunity(communityId: FaustianCommunityId): void {
    inspectCommunity(communityId);
  }

  function onCommunityKey(event: KeyboardEvent<HTMLElement>, communityId: FaustianCommunityId): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCommunity(communityId);
    }
  }

  function schemeCardId(card: FaustianPublicCardPresentation): FaustianCardId | null {
    return card.facing === "face_up" && "cardId" in card ? card.cardId : null;
  }

  const dropReady = play.dragVisual?.hoveringCommunityId ?? null;

  return (
    <div className={`space-y-4 ${layout === "narrow" ? "text-sm" : ""}`}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Faustian Card Table</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Left-click inspects. Right-click acts. Drag Devil&apos;s Deck to place a Scheme, Faustian&apos;s Deck to Blackmail.
        </p>
      </header>

      {play.error !== null && (
        <p className="text-xs text-red-700 dark:text-red-300" role="alert">{play.error}</p>
      )}
      <FaustianOccurrenceChooser play={play} />

      <div
        data-faustian-table
        className={`rounded-xl bg-emerald-950 text-emerald-50 p-3 space-y-3 shadow-inner ${play.dragging ? "select-none" : ""}`}
      >
        {presentation.obligationCues.filter((cue) => cue.imminent).length > 0 && (
          <div className="flex flex-wrap gap-1" data-faustian-zone="obligations">
            {presentation.obligationCues.filter((cue) => cue.imminent).map((cue) => (
              <span
                key={cue.key}
                data-faustian-obligation={cue.key}
                className="inline-block rounded-full bg-amber-800/90 text-amber-50 text-[0.65rem] font-medium px-2 py-0.5 cursor-pointer"
                onContextMenu={(event) => play.openObligationMenu(cue.wizardId, cue.dueMonthOrdinal, cue.weeks, event)}
              >
                {cue.label}
              </span>
            ))}
          </div>
        )}

        <div className={`flex items-start gap-3 ${layout === "narrow" ? "flex-col" : "flex-row"}`}>
          <div className="overflow-x-auto min-w-0 flex-1">
            <div
              data-faustian-zone="community-tableau"
              className="grid grid-cols-3 gap-3"
              style={{ minWidth: FAUSTIAN_TABLE_MIN_WIDTH_PX }}
              aria-label="Faustian Community tableau"
            >
              {presentation.communities.map((community) => {
                const selected = selection?.kind === "community" && selection.communityId === community.communityId;
                const hovering = dropReady === community.communityId;
                return (
                  <article
                    key={community.communityId}
                    tabIndex={0}
                    data-faustian-community={community.communityId}
                    data-faustian-community-drop={community.communityId}
                    onClick={() => selectCommunity(community.communityId)}
                    onKeyDown={(event) => onCommunityKey(event, community.communityId)}
                    onContextMenu={(event) => play.openCommunityMenu(community.communityId, event)}
                    aria-label={community.headerLabel}
                    className={`rounded-lg border p-2.5 space-y-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/80 select-none ${
                      selected ? "border-amber-400 bg-emerald-900/80" : "border-emerald-800/80 bg-emerald-950/70"
                    } ${play.dragging ? "ring-1 ring-amber-300/40" : ""} ${hovering ? "bg-emerald-800 ring-2 ring-amber-400" : ""}`}
                  >
                    <header className="space-y-0.5">
                      <p className="text-sm font-semibold tracking-wide text-amber-100">{community.zodiacLabel}</p>
                      <p className="text-[0.7rem] text-emerald-100/80">{community.populace}</p>
                      <p className="text-[0.65rem] text-emerald-200/60">{community.associatedWizardLabel}</p>
                    </header>
                    <div className="space-y-2">
                      <div>
                        <p className="sr-only">
                          {community.schemeFaceUpCount} revealed, {community.schemeFaceDownCount} facedown Schemes
                        </p>
                        <FannedPile
                          cards={community.schemes}
                          overflowLabel={community.schemes.overflowLabel}
                          selectedInstanceKey={selection?.kind === "card" ? selection.instanceKey : null}
                          onInspect={() => inspectCommunity(community.communityId)}
                          onCardSelect={(card) => inspectCard(card, community.communityId)}
                          onCardContextMenu={(card, event) => {
                            play.openSchemeMenu(community.communityId, schemeCardId(card), card.facing, event);
                          }}
                          foilEligible={(card) => play.foilEligible(community.communityId, schemeCardId(card))}
                        />
                      </div>
                      <div>
                        <p className="sr-only">Accomplices</p>
                        <FannedPile
                          cards={community.accomplices}
                          overflowLabel={community.accomplices.overflowLabel}
                          selectedInstanceKey={selection?.kind === "card" ? selection.instanceKey : null}
                          onInspect={() => inspectCommunity(community.communityId)}
                          onCardSelect={(card) => inspectCard(card, community.communityId)}
                          onCardContextMenu={(card, event) => {
                            const cardId = schemeCardId(card);
                            if (cardId !== null) play.openAccompliceMenu(community.communityId, cardId, event);
                          }}
                        />
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-1"
                        data-faustian-pawn-tray={community.communityId}
                        aria-label={community.pawnLabel}
                        onContextMenu={(event) => play.openPawnMenu(community.communityId, event)}
                      >
                        {Array.from({ length: Math.min(community.pawnCount, 6) }, (_, index) => (
                          <span
                            key={index}
                            data-faustian-pawn
                            className="inline-block h-4 w-4 rounded-full bg-stone-300 border border-stone-900 shadow-sm"
                            aria-hidden="true"
                          />
                        ))}
                        {community.pawnCount > 6 && (
                          <span className="text-[0.65rem] text-emerald-100/80">+{community.pawnCount - 6}</span>
                        )}
                        {community.pawnCount > 0 && (
                          <span className="text-[0.65rem] text-emerald-100/80">{community.pawnLabel}</span>
                        )}
                      </div>
                      {community.conspiracies.length > 0 && (
                        <ul className="text-xs space-y-0.5">
                          {community.conspiracies.map((conspiracy) => (
                            <li key={conspiracy.denizenId} className="inline-flex items-center gap-1 text-rose-100">
                              <span className="inline-block h-3 w-3 rounded-sm bg-rose-700 border border-rose-950 shadow-sm" aria-hidden="true" />
                              {conspiracy.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div
            data-faustian-primary-rail
            className={`space-y-3 ${layout === "narrow" ? "w-full" : "w-[19rem] shrink-0"}`}
          >
            <div className="grid grid-cols-2 gap-2">
              <PhysicalZone
                zone="faustian-deck"
                title={`Faustian's Deck (${presentation.faustianDeckCount})`}
                selected={selection?.kind === "supporting" && selection.area === "faustian_deck"}
                onSelect={() => {
                  setSelection({ kind: "supporting", area: "faustian_deck" });
                  setInspector({ kind: "faustian_deck" });
                }}
              >
                <button
                  type="button"
                  data-faustian-blackmail-supply
                  aria-label={FACEDOWN_ACCOMPLICE_SUPPLY_LABEL}
                  onPointerDown={play.startBlackmailSupplyDrag}
                  className="cursor-grab active:cursor-grabbing select-none text-left touch-none"
                >
                  <DeckStack count={presentation.faustianDeckCount} emptyLabel="Empty" />
                </button>
                {presentation.missingSuits.length > 0 && (
                  <p className="text-[0.65rem] text-amber-200">
                    Missing suit pressure: {presentation.missingSuits.map((suit) => suit.label).join(", ")}
                  </p>
                )}
              </PhysicalZone>
              <PhysicalZone
                zone="devil-deck"
                title={`Devil's Deck (${presentation.devilDeckCount})`}
                attention={presentation.devilDeckEmpty ? "empty-deck" : null}
                selected={selection?.kind === "supporting" && selection.area === "devil_deck"}
                onSelect={() => {
                  setSelection({ kind: "supporting", area: "devil_deck" });
                  setInspector({ kind: "devil_deck" });
                }}
              >
                <button
                  type="button"
                  data-faustian-scheme-supply
                  aria-label={FACEDOWN_SCHEME_SUPPLY_LABEL}
                  onPointerDown={play.startSchemeSupplyDrag}
                  className="cursor-grab active:cursor-grabbing select-none text-left touch-none"
                >
                  <DeckStack count={presentation.devilDeckCount} emptyLabel="Empty" />
                </button>
              </PhysicalZone>
            </div>

            <PhysicalZone
              zone="machinations"
              title="Devil's Machinations"
              selected={selection?.kind === "supporting" && selection.area === "machinations"}
              onSelect={() => setSelection({ kind: "supporting", area: "machinations" })}
              onContextMenu={(event) => play.openMachinationsMenu(event)}
              attention={presentation.pendingChallenges.some((challenge) => challenge.groups.some((group) => group.status === "pending")) ? "pending-challenge" : null}
            >
              {presentation.twists.length === 0 ? (
                <p className="text-xs text-emerald-200/50">No Active Twist</p>
              ) : (
                <div className="space-y-1">
                  {presentation.twists.map((spotlight) => (
                    <div key={spotlight.machinationInstanceKey} className="space-y-1" aria-label={spotlight.ariaLabel}>
                      <p className="text-[0.65rem] text-emerald-100/70">{spotlight.relationshipLabel}</p>
                      {spotlight.inspectablePrivately && (
                        <button
                          type="button"
                          className={ghostBtn}
                          aria-label={PRIVATE_TWIST_INSPECT_LABEL}
                          onClick={() => {
                            setSelection({ kind: "twist", index: spotlight.index });
                            setInspector({ kind: "private_twist", index: spotlight.index });
                          }}
                        >
                          {PRIVATE_TWIST_INSPECT_LABEL}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {presentation.machinations.map((entry, index) => {
                  const live = faustian.machinations[index];
                  return (
                    <PlayingCardToken
                      key={entry.card.instanceKey}
                      card={entry.card}
                      treatmentLabel={entry.treatmentLabel}
                      selected={
                        (selection?.kind === "card" && selection.instanceKey === entry.card.instanceKey)
                        || (selection?.kind === "twist" && presentation.twists.some((spotlight) => spotlight.machinationInstanceKey === entry.card.instanceKey && selection.index === spotlight.index))
                      }
                      onSelect={() => inspectCard(entry.card)}
                      onContextMenu={entry.isActiveTwist && live !== undefined
                        ? (event) => play.openTwistMenu(live.cardId, live.facing, entry.isReservedTwist, event)
                        : undefined}
                    />
                  );
                })}
                {presentation.machinations.length === 0 && <p className="text-xs text-emerald-200/50">None</p>}
              </div>
              {presentation.pendingChallenges.length > 0 && (
                <ul className="text-xs space-y-1">
                  {presentation.pendingChallenges.map((challenge) => (
                    <li
                      key={challenge.challengeId}
                      data-faustian-challenge={challenge.challengeId}
                      className="rounded bg-amber-950/70 px-2 py-1 text-amber-100"
                    >
                      {challenge.kindLabel}
                      {" · "}
                      {challenge.scheduleLabel.replace(/_/g, " ")}
                      {" · "}
                      {challenge.groups.filter((group) => group.status === "pending").length} pending
                      {challenge.groups.filter((group) => group.status === "pending").map((group) => (
                        <button
                          key={group.groupId}
                          type="button"
                          className={`${ghostBtn} ml-1 mt-1`}
                          data-context-action="complete-response"
                          onClick={(event) => {
                            event.stopPropagation();
                            play.onCompleteResponse(challenge.challengeId, group.groupId, group.responsibleWizardId, event.clientX, event.clientY);
                          }}
                        >
                          Complete Response
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`${ghostBtn} ml-1 mt-1`}
                        data-context-action="finalize-challenge"
                        onClick={(event) => {
                          event.stopPropagation();
                          play.onFinalizeChallenge(challenge.challengeId);
                        }}
                      >
                        Finalize…
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </PhysicalZone>

            <section
              data-faustian-inspector
              aria-label={inspectorCommunity !== null ? `${inspectorCommunity.zodiacLabel} inspector` : "Faustian inspector"}
              className="rounded-md bg-emerald-950/50 p-2.5 space-y-2 border border-emerald-800"
            >
              {inspector?.kind === "private_twist" && privateTwist !== null && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Private Twist inspection</h3>
                    <button type="button" className={ghostBtn} onClick={() => setInspector(null)}>Close private view</button>
                  </div>
                  <p className="text-[0.7rem] text-emerald-100/80">{PRIVATE_TWIST_INSPECT_HINT}</p>
                  <PlayingCardToken card={privateTwist} />
                  <p className="text-xs text-emerald-50">{privateTwist.rankSuitGlyph} · {privateTwist.identityLabel}</p>
                  <p className="text-[0.65rem] text-emerald-200/80">{privateTwist.glanceLine}</p>
                  <p className="text-[0.65rem] text-emerald-200/70">{privateTwist.sourceOmission}</p>
                  <p className="text-[0.65rem] text-emerald-200/60">Ordinary table still shows: {FACEDOWN_TWIST_LABEL}</p>
                </>
              )}
              {inspector?.kind === "community" && inspectorCommunity !== null && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{inspectorCommunity.headerLabel} — full inspector</h3>
                    <button type="button" className={ghostBtn} onClick={() => setInspector(null)}>Close inspector</button>
                  </div>
                  <p className="text-[0.7rem] text-emerald-100/80">
                    {inspectorCommunity.schemeFaceUpCount} revealed Schemes · {inspectorCommunity.schemeFaceDownCount} facedown · {inspectorCommunity.pawnLabel}
                  </p>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-emerald-200/70 mb-1">Schemes</p>
                    <div className="flex flex-wrap gap-2">
                      {inspectorSchemes.map((card) => (
                        <PlayingCardToken
                          key={card.instanceKey}
                          card={card}
                          selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey}
                          onSelect={() => inspectCard(card, inspectorCommunity.communityId)}
                          onContextMenu={(event) => play.openSchemeMenu(inspectorCommunity.communityId, schemeCardId(card), card.facing, event)}
                          foilAvailable={play.foilEligible(inspectorCommunity.communityId, schemeCardId(card))}
                        />
                      ))}
                      {inspectorSchemes.length === 0 && <p className="text-xs text-emerald-200/50">None</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-emerald-200/70 mb-1">Accomplices</p>
                    <div className="flex flex-wrap gap-2">
                      {inspectorAccomplices.map((card) => (
                        <PlayingCardToken
                          key={card.instanceKey}
                          card={card}
                          selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey}
                          onSelect={() => inspectCard(card, inspectorCommunity.communityId)}
                          onContextMenu={(event) => {
                            const cardId = schemeCardId(card);
                            if (cardId !== null) play.openAccompliceMenu(inspectorCommunity.communityId, cardId, event);
                          }}
                        />
                      ))}
                      {inspectorAccomplices.length === 0 && <p className="text-xs text-emerald-200/50">None</p>}
                    </div>
                  </div>
                  {inspectorCommunity.conspiracies.length > 0 && (
                    <p className="text-xs text-rose-100">
                      Conspiracy: {inspectorCommunity.conspiracies.map((entry) => entry.name).join(", ")}
                    </p>
                  )}
                </>
              )}
              {inspector?.kind === "card" && (
                <InspectedCardDetail
                  card={inspector.card}
                  community={inspectorCommunity}
                  onClose={() => setInspector(null)}
                />
              )}
              {inspector?.kind === "faustian_deck" && (
                <>
                  <h3 className="text-sm font-semibold">Faustian&apos;s Deck</h3>
                  <p className="text-xs text-emerald-50">{presentation.faustianDeckCount} cards remaining</p>
                  <ul className="text-xs space-y-0.5">
                    {presentation.suitSummaries.map((suit) => (
                      <li key={suit.suit}>{suit.label}: {suit.faustianDeckCount}</li>
                    ))}
                  </ul>
                  {presentation.missingSuits.length > 0 && (
                    <p className="text-[0.7rem] text-amber-200">
                      Missing suit pressure: {presentation.missingSuits.map((suit) => suit.label).join(", ")}
                    </p>
                  )}
                  <p className="text-[0.65rem] text-emerald-200/70">Composition only. Top-card order is not shown.</p>
                </>
              )}
              {inspector?.kind === "devil_deck" && (
                <>
                  <h3 className="text-sm font-semibold">Devil&apos;s Deck</h3>
                  <p className="text-xs text-emerald-50">{presentation.devilDeckCount} facedown Schemes</p>
                  <p className="text-[0.65rem] text-emerald-200/70">Supply for placing Schemes. Identities stay hidden.</p>
                </>
              )}
              {inspector === null && (
                <p className="text-xs text-emerald-100/80">Left-click a Community or card to inspect. Right-click to act.</p>
              )}
            </section>

            <PhysicalZone
                zone="defeated"
                title="Defeated Schemes"
                selected={selection?.kind === "supporting" && selection.area === "defeated"}
                onSelect={() => setSelection({ kind: "supporting", area: "defeated" })}
              >
                {presentation.defeatedSchemes.length === 0 ? (
                  <p className="text-xs text-emerald-200/60">None</p>
                ) : (
                  <div className="relative h-[6.25rem]">
                    {presentation.defeatedSchemes.map((card, index) => (
                      <div
                        key={card.instanceKey}
                        className="absolute top-0"
                        style={{ left: `${Math.min(index, 4) * 10}px`, zIndex: index }}
                      >
                        <PlayingCardToken card={card} selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey} onSelect={() => inspectCard(card)} />
                      </div>
                    ))}
                  </div>
                )}
              </PhysicalZone>
            {presentation.heldCards.length > 0 && (
              <PhysicalZone
                zone="held"
                title="Held cards"
                selected={selection?.kind === "supporting" && selection.area === "held"}
                onSelect={() => setSelection({ kind: "supporting", area: "held" })}
              >
                <div className="flex flex-wrap gap-2">
                  {presentation.heldCards.map((card) => (
                    <PlayingCardToken key={card.instanceKey} card={card} selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey} onSelect={() => inspectCard(card)} />
                  ))}
                </div>
              </PhysicalZone>
            )}
            {presentation.entrustedCards.length > 0 && (
              <PhysicalZone
                zone="entrusted"
                title="Entrusted cards"
                selected={selection?.kind === "supporting" && selection.area === "entrusted"}
                onSelect={() => setSelection({ kind: "supporting", area: "entrusted" })}
              >
                <ul className="space-y-2">
                  {presentation.entrustedCards.map((card) => (
                    <li key={card.instanceKey} className="flex items-center gap-2">
                      <PlayingCardToken card={card} selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey} onSelect={() => inspectCard(card)} />
                      <span className="text-xs">{card.locationLabel}</span>
                    </li>
                  ))}
                </ul>
              </PhysicalZone>
            )}
            {presentation.possessionCards.length > 0 && (
              <PhysicalZone
                zone="possession"
                title="Possession cards"
                selected={selection?.kind === "supporting" && selection.area === "possession"}
                onSelect={() => setSelection({ kind: "supporting", area: "possession" })}
              >
                <ul className="space-y-2">
                  {presentation.possessionCards.map((card) => (
                    <li key={card.instanceKey} className="flex items-center gap-2">
                      <PlayingCardToken card={card} selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey} onSelect={() => inspectCard(card)} />
                      <span className="text-xs">{card.locationLabel}</span>
                    </li>
                  ))}
                </ul>
              </PhysicalZone>
            )}
            {presentation.domainPlacements.length > 0 && (
              <PhysicalZone
                zone="domain"
                title="Domain-placement cards"
                selected={selection?.kind === "supporting" && selection.area === "domain"}
                onSelect={() => setSelection({ kind: "supporting", area: "domain" })}
              >
                <ul className="space-y-2">
                  {presentation.domainPlacements.map((card) => (
                    <li key={card.instanceKey} className="flex items-center gap-2">
                      <PlayingCardToken card={card} selected={selection?.kind === "card" && selection.instanceKey === card.instanceKey} onSelect={() => inspectCard(card)} />
                      <span className="text-xs">{card.locationLabel}</span>
                    </li>
                  ))}
                </ul>
              </PhysicalZone>
            )}
          </div>
        </div>
      </div>


      {(presentation.devilSchemeResearchers.length > 0 || presentation.disruptiveArcanists.length > 0) && (
        <PhysicalZone
          zone="sorcerer"
          title="Sorcerer presence"
          selected={selection?.kind === "supporting" && selection.area === "sorcerer"}
          onSelect={() => setSelection({ kind: "supporting", area: "sorcerer" })}
        >
          <div className="space-y-2">
            <p className="text-xs font-medium">Researchers at Devil's Schemes</p>
            {presentation.devilSchemeResearchers.length === 0 ? (
              <p className="text-xs text-slate-400">None</p>
            ) : (
              <ul className="text-xs space-y-1">
                {presentation.devilSchemeResearchers.map((researcher) => (
                  <li key={researcher.denizenId}>
                    {researcher.name} — {researcher.operationalLabel}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs font-medium">Disruptive Arcanists (Faustian Domain)</p>
            {presentation.disruptiveArcanists.length === 0 ? (
              <p className="text-xs text-slate-400">None</p>
            ) : (
              <ul className="text-xs space-y-1">
                {presentation.disruptiveArcanists.map((arcanist) => (
                  <li key={arcanist.denizenId}>
                    {arcanist.name} — {arcanist.schoolLabel}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PhysicalZone>
      )}


      {loreSubjects.length > 0 && (
        <PhysicalZone
          zone="lore"
          title="Lore"
          selected={selection?.kind === "supporting" && selection.area === "lore"}
          onSelect={() => setSelection({ kind: "supporting", area: "lore" })}
        >
          <div className="space-y-3">
            {loreSubjects.map((subject) => (
              <LoreContextPanel
                key={subject.presentationKey}
                subject={subject}
                campaignId={campaignId}
                compact
                contextConstraint={{ kind: "any" }}
              />
            ))}
          </div>
        </PhysicalZone>
      )}

      {lifecycleKind === "setup" ? (
        <FaustianActions
          faustian={faustian}
          campaignId={campaignId}
          lifecycleKind={lifecycleKind}
          ageId={ageId}
          faustianWizard={faustianWizard}
          denizens={world?.denizens ?? []}
          selectedCommunityId={selection?.kind === "community" ? selection.communityId : null}
          presentation={presentation}
        />
      ) : (
        <details className="rounded-lg border border-slate-200 dark:border-slate-700 p-3" data-faustian-less-common>
          <summary className="text-sm font-semibold cursor-pointer">Less-common board actions</summary>
          <div className="mt-3">
            <FaustianActions
              faustian={faustian}
              campaignId={campaignId}
              lifecycleKind={lifecycleKind}
              ageId={ageId}
              faustianWizard={faustianWizard}
              denizens={world?.denizens ?? []}
              selectedCommunityId={selection?.kind === "community" ? selection.communityId : null}
              presentation={presentation}
            />
          </div>
        </details>
      )}

      {lifecycleKind === "play" && (
        <FaustianLifecycleActions
          faustian={faustian}
          campaignId={campaignId}
          lifecycleKind={lifecycleKind}
          wizards={wizards}
          selectedCommunityId={selection?.kind === "community" ? selection.communityId : null}
          presentation={presentation}
          launch={play.lifecycleLaunch}
          onLaunchConsumed={play.clearLifecycleLaunch}
        />
      )}

      <FaustianAdvancedActions
        faustian={faustian}
        campaignId={campaignId}
        wizards={wizards}
        denizens={world?.denizens ?? []}
        monthOrdinal={monthOrdinal}
      />

      <FaustianTableContextMenu play={play} />
      <FaustianSchemeSupplyGhost visual={play.dragVisual} />
    </div>
  );
}
