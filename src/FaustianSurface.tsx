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

type Selection =
  | { readonly kind: "community"; readonly communityId: FaustianCommunityId }
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
  return "bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-amber-50 border-amber-700/40";
}

function PlayingCardToken({
  card,
  selected = false,
  onSelect,
  treatmentLabel = null,
  onContextMenu,
  foilAvailable = false,
  onFoil,
}: {
  readonly card: FaustianPublicCardPresentation;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly treatmentLabel?: string | null;
  readonly onContextMenu?: (event: ReactMouseEvent) => void;
  readonly foilAvailable?: boolean;
  readonly onFoil?: () => void;
}) {
  const interactive = onSelect !== undefined || onContextMenu !== undefined || onFoil !== undefined;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => {
        if (onFoil !== undefined) onFoil();
        else onSelect?.();
      }}
      onContextMenu={onContextMenu}
      data-faustian-card={card.kind}
      aria-label={card.ariaLabel}
      title={card.publicLabel}
      className={`relative shrink-0 w-[4.5rem] h-[6.25rem] rounded-md border text-[0.65rem] leading-tight px-1.5 py-1 text-left shadow-sm select-none ${cardFaceClass(card)} ${
        selected ? "ring-2 ring-teal-500" : ""
      } ${treatmentLabel !== null ? "ring-2 ring-amber-500" : ""} ${interactive ? "cursor-pointer" : "cursor-default"}`}
    >
      {treatmentLabel !== null && (
        <span className="absolute -top-2 left-1 rounded bg-amber-600 px-1 text-[0.55rem] font-semibold text-white">
          {treatmentLabel}
        </span>
      )}
      <span className="font-semibold block">{card.publicLabel}</span>
      {card.facing === "face_up" && card.kind === "accomplice" && (
        <span className="block text-[0.6rem] text-amber-200/80 mt-1">
          {card.syndicateLabel ?? "Accomplice syndicate not transcribed"}
        </span>
      )}
      {foilAvailable && (
        <span className="absolute bottom-1 left-1 right-1 rounded bg-teal-700 px-1 text-[0.55rem] font-semibold text-white">
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
  onCardContextMenu,
  foilEligible,
  onFoil,
}: {
  readonly cards: FaustianTablePresentation["communities"][number]["schemes"];
  readonly overflowLabel: string | null;
  readonly onInspect?: () => void;
  readonly onCardContextMenu?: (card: FaustianPublicCardPresentation, event: ReactMouseEvent) => void;
  readonly foilEligible?: (card: FaustianPublicCardPresentation) => boolean;
  readonly onFoil?: (card: FaustianPublicCardPresentation) => void;
}) {
  if (cards.totalCount === 0) {
    return (
      <div
        className="w-[2.75rem] h-[3.75rem] rounded-sm border border-dashed border-emerald-700/50 bg-emerald-950/20"
        aria-hidden="true"
      />
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex">
        {cards.visible.map((card, index) => (
          <div key={card.instanceKey} className={index === 0 ? "" : "-ml-6"}>
            <PlayingCardToken
              card={card}
              onContextMenu={onCardContextMenu === undefined ? undefined : (event) => onCardContextMenu(card, event)}
              foilAvailable={foilEligible?.(card) === true}
              onFoil={foilEligible?.(card) === true && onFoil !== undefined ? () => onFoil(card) : undefined}
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
  const [inspectorCommunityId, setInspectorCommunityId] = useState<FaustianCommunityId | null>(null);
  const [privateTwistIndex, setPrivateTwistIndex] = useState<number | null>(null);

  const inspectorCommunity = inspectorCommunityId === null
    ? null
    : presentation.communities.find((community) => community.communityId === inspectorCommunityId) ?? null;
  const inspectorSchemes = inspectorCommunityId === null ? [] : communityAllSchemes(faustian, inspectorCommunityId);
  const inspectorAccomplices = inspectorCommunityId === null ? [] : communityAllAccomplices(faustian, inspectorCommunityId);
  const privateTwist = privateTwistIndex === null ? null : privateTwistInspection(faustian, privateTwistIndex);

  function selectCommunity(communityId: FaustianCommunityId): void {
    setSelection({ kind: "community", communityId });
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
          Left-click inspects. Right-click acts on that Community or card. Drag a facedown Scheme from Devil&apos;s Deck onto a Community to place one.
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
                          onInspect={() => {
                            selectCommunity(community.communityId);
                            setInspectorCommunityId(community.communityId);
                          }}
                          onCardContextMenu={(card, event) => {
                            play.openSchemeMenu(community.communityId, schemeCardId(card), card.facing, event);
                          }}
                          foilEligible={(card) => play.foilEligible(community.communityId, schemeCardId(card))}
                          onFoil={(card) => {
                            const cardId = schemeCardId(card);
                            if (cardId !== null) play.onFoil(community.communityId, cardId);
                          }}
                        />
                      </div>
                      <div>
                        <p className="sr-only">Accomplices</p>
                        <FannedPile
                          cards={community.accomplices}
                          overflowLabel={community.accomplices.overflowLabel}
                          onInspect={() => {
                            selectCommunity(community.communityId);
                            setInspectorCommunityId(community.communityId);
                          }}
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
                        {community.pawnCount === 0 && (
                          <span className="text-[0.65rem] text-emerald-200/40">No Pawns</span>
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

          <PhysicalZone
            zone="machinations"
            title="Devil's Machinations"
            selected={selection?.kind === "supporting" && selection.area === "machinations"}
            onSelect={() => setSelection({ kind: "supporting", area: "machinations" })}
            onContextMenu={(event) => play.openMachinationsMenu(event)}
            attention={presentation.pendingChallenges.some((challenge) => challenge.groups.some((group) => group.status === "pending")) ? "pending-challenge" : null}
            className={layout === "narrow" ? "w-full" : "w-[16.5rem] shrink-0"}
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
                        onClick={() => setPrivateTwistIndex(spotlight.index)}
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
                    selected={selection?.kind === "twist" && presentation.twists.some((spotlight) => spotlight.machinationInstanceKey === entry.card.instanceKey && selection.index === spotlight.index)}
                    onSelect={entry.isActiveTwist
                      ? () => {
                        const spotlight = presentation.twists.find((item) => item.machinationInstanceKey === entry.card.instanceKey);
                        if (spotlight !== undefined) setSelection({ kind: "twist", index: spotlight.index });
                      }
                      : undefined}
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
        </div>

        <div className={`grid gap-3 ${layout === "narrow" ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
          <PhysicalZone
            zone="faustian-deck"
            title={`Faustian's Deck (${presentation.faustianDeckCount})`}
            selected={selection?.kind === "supporting" && selection.area === "faustian_deck"}
            onSelect={() => setSelection({ kind: "supporting", area: "faustian_deck" })}
          >
            <DeckStack count={presentation.faustianDeckCount} emptyLabel="Empty" />
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
            onSelect={() => setSelection({ kind: "supporting", area: "devil_deck" })}
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
            <p className="text-[0.65rem] text-emerald-100/70">Drag a facedown Scheme onto a Community.</p>
          </PhysicalZone>
          <PhysicalZone
            zone="defeated"
            title="Defeated Schemes"
            selected={selection?.kind === "supporting" && selection.area === "defeated"}
            onSelect={() => setSelection({ kind: "supporting", area: "defeated" })}
          >
            <div className="relative h-[6.25rem]">
              {presentation.defeatedSchemes.length === 0 && (
                <div className="w-[4.5rem] h-[6.25rem] rounded-md border border-dashed border-emerald-700/60 text-[0.65rem] text-emerald-200/60 flex items-center justify-center text-center px-1">
                  Empty pile
                </div>
              )}
              {presentation.defeatedSchemes.map((card, index) => (
                <div
                  key={card.instanceKey}
                  className="absolute top-0"
                  style={{ left: `${Math.min(index, 4) * 10}px`, zIndex: index }}
                >
                  <PlayingCardToken card={card} />
                </div>
              ))}
            </div>
          </PhysicalZone>
          {presentation.heldCards.length > 0 && (
            <PhysicalZone
              zone="held"
              title="Held cards"
              selected={selection?.kind === "supporting" && selection.area === "held"}
              onSelect={() => setSelection({ kind: "supporting", area: "held" })}
            >
              <div className="flex flex-wrap gap-2">
                {presentation.heldCards.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
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
                    <PlayingCardToken card={card} />
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
                    <PlayingCardToken card={card} />
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
                    <PlayingCardToken card={card} />
                    <span className="text-xs">{card.locationLabel}</span>
                  </li>
                ))}
              </ul>
            </PhysicalZone>
          )}
        </div>
      </div>

      {inspectorCommunity !== null && (
        <section className="rounded-lg border border-slate-300 dark:border-slate-600 p-3 space-y-3" aria-label={`${inspectorCommunity.zodiacLabel} inspector`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{inspectorCommunity.headerLabel} — full inspector</h3>
            <button type="button" className={ghostBtn} onClick={() => setInspectorCommunityId(null)}>Close inspector</button>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Schemes</p>
            <div className="flex flex-wrap gap-2">
              {inspectorSchemes.map((card) => (
                <PlayingCardToken
                  key={card.instanceKey}
                  card={card}
                  onContextMenu={(event) => play.openSchemeMenu(inspectorCommunity.communityId, schemeCardId(card), card.facing, event)}
                  foilAvailable={play.foilEligible(inspectorCommunity.communityId, schemeCardId(card))}
                  onFoil={() => {
                    const cardId = schemeCardId(card);
                    if (cardId !== null) play.onFoil(inspectorCommunity.communityId, cardId);
                  }}
                />
              ))}
              {inspectorSchemes.length === 0 && <p className="text-xs text-slate-400">None</p>}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Accomplices</p>
            <div className="flex flex-wrap gap-2">
              {inspectorAccomplices.map((card) => (
                <PlayingCardToken
                  key={card.instanceKey}
                  card={card}
                  onContextMenu={(event) => {
                    const cardId = schemeCardId(card);
                    if (cardId !== null) play.openAccompliceMenu(inspectorCommunity.communityId, cardId, event);
                  }}
                />
              ))}
              {inspectorAccomplices.length === 0 && <p className="text-xs text-slate-400">None</p>}
            </div>
          </div>
        </section>
      )}

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

      {privateTwist !== null && (
        <section className="rounded-lg border border-amber-700 p-3 space-y-2" aria-label="Private Twist inspection">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Private Twist inspection</h3>
            <button type="button" className={ghostBtn} onClick={() => setPrivateTwistIndex(null)}>Close private view</button>
          </div>
          <p className="text-xs text-slate-500">{PRIVATE_TWIST_INSPECT_HINT}</p>
          <PlayingCardToken card={privateTwist} />
          <p className="text-xs">{privateTwist.identityLabel}</p>
          <p className="text-xs text-slate-500">{privateTwist.sourceOmission}</p>
          <p className="text-xs text-slate-400">Ordinary table still shows: {FACEDOWN_TWIST_LABEL}</p>
        </section>
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
