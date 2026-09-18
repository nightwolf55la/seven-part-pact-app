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
  "text-xs font-medium rounded-lg px-2.5 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

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
        <span className="block text-[0.6rem] text-slate-600 dark:text-amber-200/80 mt-1">
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
    return <p className="text-[0.65rem] text-slate-400">None</p>;
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
  className = "",
}: {
  readonly title: string;
  readonly zone: string;
  readonly children: React.ReactNode;
  readonly attention?: string | null;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly className?: string;
}) {
  return (
    <section
      data-faustian-zone={zone}
      data-faustian-attention={attention ?? undefined}
      className={`rounded-md bg-emerald-950/20 dark:bg-emerald-950/30 p-3 space-y-2 ${
        selected ? "ring-2 ring-teal-500" : ""
      } ${attention !== null ? "ring-1 ring-amber-500/80" : ""} ${className}`}
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
      <div className="absolute inset-0 rounded-md border border-slate-950 bg-slate-800 text-slate-100 text-[0.65rem] px-1.5 py-1 shadow-sm">
        <span className="font-semibold block">Facedown</span>
        <span className="block mt-1">{count}</span>
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

      <FaustianLifecycleActions
        faustian={faustian}
        campaignId={campaignId}
        lifecycleKind={lifecycleKind}
        wizards={wizards}
        selectedCommunityId={selection?.kind === "community" ? selection.communityId : null}
        presentation={presentation}
      />

      <FaustianAdvancedActions
        faustian={faustian}
        campaignId={campaignId}
        wizards={wizards}
        denizens={world?.denizens ?? []}
        monthOrdinal={monthOrdinal}
      />

      <div
        data-faustian-table
        className={`space-y-3 ${play.dragging ? "select-none" : ""}`}
      >
        {presentation.obligationCues.filter((cue) => cue.imminent).length > 0 && (
          <div className="flex flex-wrap gap-1" data-faustian-zone="obligations">
            {presentation.obligationCues.filter((cue) => cue.imminent).map((cue) => (
              <span
                key={cue.key}
                className="rounded-full bg-amber-700 text-white text-[0.65rem] font-medium px-2 py-0.5"
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
                    className={`rounded-xl border p-3 space-y-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 select-none ${
                      selected ? "border-teal-600 bg-teal-50/40 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    } ${play.dragging ? "ring-1 ring-teal-400/70" : ""} ${hovering ? "bg-teal-100/80 dark:bg-teal-900/40 ring-2 ring-teal-500" : ""}`}
                  >
                    <header className="border-b border-slate-200 dark:border-slate-700 pb-2">
                      <p className="text-sm font-semibold">{community.zodiacLabel}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{community.populace}</p>
                      <p className="text-xs text-slate-500">{community.associatedWizardLabel}</p>
                    </header>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                          Schemes · {community.schemeFaceUpCount} up / {community.schemeFaceDownCount} down
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
                        <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">Accomplices</p>
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
                      <div className="flex flex-wrap items-center gap-1">
                        {Array.from({ length: Math.min(community.pawnCount, 6) }, (_, index) => (
                          <span
                            key={index}
                            className="inline-block h-3 w-3 rounded-full bg-stone-700 border border-stone-900"
                            aria-hidden="true"
                          />
                        ))}
                        <p className="text-xs font-medium" aria-label={community.pawnLabel}>{community.pawnLabel}</p>
                      </div>
                      {community.conspiracies.length > 0 && (
                        <ul className="text-xs space-y-0.5">
                          {community.conspiracies.map((conspiracy) => (
                            <li key={conspiracy.denizenId} className="inline-flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-800" aria-hidden="true" />
                              Conspiracy: {conspiracy.name}
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
            className={layout === "narrow" ? "w-full" : "w-[16.5rem] shrink-0"}
          >
            {presentation.twists.length === 0 ? (
              <p className="text-xs text-slate-400">No Active Twist</p>
            ) : (
              <div className="space-y-1">
                {presentation.twists.map((spotlight) => (
                  <div key={spotlight.machinationInstanceKey} className="space-y-1">
                    <p className="text-xs" aria-label={spotlight.ariaLabel}>{spotlight.publicLabel}</p>
                    <p className="text-[0.65rem] text-slate-500">{spotlight.relationshipLabel}</p>
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
              {presentation.machinations.map((entry) => (
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
                />
              ))}
              {presentation.machinations.length === 0 && <p className="text-xs text-slate-400">None</p>}
            </div>
            {presentation.pendingChallenges.length > 0 && (
              <ul className="text-xs space-y-1">
                {presentation.pendingChallenges.map((challenge) => (
                  <li key={challenge.challengeId} className="rounded bg-amber-950/40 px-2 py-1">
                    {challenge.kindLabel}
                    {" · "}
                    {challenge.scheduleLabel.replace(/_/g, " ")}
                    {" · "}
                    {challenge.groups.filter((group) => group.status === "pending").length} pending
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
              <p className="text-[0.65rem] text-amber-800 dark:text-amber-200">
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
              className="cursor-grab active:cursor-grabbing select-none text-left"
            >
              <DeckStack count={presentation.devilDeckCount} emptyLabel="Empty" />
            </button>
            <p className="text-[0.65rem] text-slate-500">Drag a facedown Scheme onto a Community.</p>
          </PhysicalZone>
          <PhysicalZone
            zone="defeated"
            title="Defeated Schemes"
            selected={selection?.kind === "supporting" && selection.area === "defeated"}
            onSelect={() => setSelection({ kind: "supporting", area: "defeated" })}
          >
            <div className="flex flex-wrap gap-2">
              {presentation.defeatedSchemes.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
              {presentation.defeatedSchemes.length === 0 && <p className="text-xs text-slate-400">Empty pile</p>}
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

      <PhysicalZone
        zone="lore"
        title="Lore"
        selected={selection?.kind === "supporting" && selection.area === "lore"}
        onSelect={() => setSelection({ kind: "supporting", area: "lore" })}
      >
        {loreSubjects.length === 0 ? (
          <p className="text-xs text-slate-400">No existing Faustian Lore subject is bound for this campaign.</p>
        ) : (
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
        )}
      </PhysicalZone>

      <FaustianTableContextMenu play={play} />
      <FaustianSchemeSupplyGhost visual={play.dragVisual} />
    </div>
  );
}
