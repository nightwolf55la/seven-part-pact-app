import { useMemo, useState, type KeyboardEvent } from "react";
import {
  type FaustianCommunityId,
  type FaustianState,
  type SorcererExternalPresence,
} from "../shared/domain";
import LoreContextPanel from "./LoreContextPanel";
import type { LoreCompendiumUiState } from "./lore-view-model";
import type { WorldReference } from "./WorldSurface";
import {
  FAUSTIAN_TABLE_MIN_WIDTH_PX,
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
  | "suits"
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
}: {
  readonly card: FaustianPublicCardPresentation;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
}) {
  const interactive = onSelect !== undefined;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onSelect}
      aria-label={card.ariaLabel}
      title={card.publicLabel}
      className={`relative shrink-0 w-[4.5rem] h-[6.25rem] rounded-md border text-[0.65rem] leading-tight px-1.5 py-1 text-left shadow-sm ${cardFaceClass(card)} ${
        selected ? "ring-2 ring-teal-500" : ""
      } ${interactive ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className="font-semibold block">{card.publicLabel}</span>
      {card.facing === "face_up" && card.kind === "accomplice" && (
        <span className="block text-[0.6rem] text-slate-600 dark:text-amber-200/80 mt-1">
          {card.syndicateLabel ?? "Accomplice syndicate not transcribed"}
        </span>
      )}
    </button>
  );
}

function FannedPile({
  cards,
  overflowLabel,
  onInspect,
}: {
  readonly cards: FaustianTablePresentation["communities"][number]["schemes"];
  readonly overflowLabel: string | null;
  readonly onInspect?: () => void;
}) {
  if (cards.totalCount === 0) {
    return <p className="text-[0.65rem] text-slate-400">None</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex">
        {cards.visible.map((card, index) => (
          <div key={card.instanceKey} className={index === 0 ? "" : "-ml-6"}>
            <PlayingCardToken card={card} />
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

function Area({
  title,
  children,
  selected = false,
  onSelect,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
}) {
  return (
    <section
      className={`rounded-lg border p-3 space-y-2 ${
        selected ? "border-teal-600 dark:border-teal-400" : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <h3 className="text-sm font-semibold">
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

export default function FaustianSurface({
  faustian,
  campaignId,
  world = null,
  sorcererPresence = [],
  loreCompendium,
  faustianWizard = null,
  wizards = [],
  layout = "full",
}: {
  readonly faustian: FaustianState;
  readonly campaignId: string;
  readonly world?: WorldReference | null;
  readonly sorcererPresence?: readonly SorcererExternalPresence[];
  readonly loreCompendium?: LoreCompendiumUiState;
  readonly faustianWizard?: FaustianWizardRef | null;
  readonly wizards?: readonly NamedWizardRef[];
  readonly layout?: "full" | "narrow";
}) {
  const presentation = useMemo(
    () => buildFaustianTablePresentation({
      faustian,
      sorcererPresence,
      denizens: world?.denizens ?? [],
      wizards,
    }),
    [faustian, sorcererPresence, world, wizards],
  );
  const loreSubjects = useMemo(
    () => faustianLoreSubjects(loreCompendium, faustianWizard),
    [loreCompendium, faustianWizard],
  );

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

  return (
    <div className={`space-y-4 ${layout === "narrow" ? "text-sm" : ""}`}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Faustian Card Table</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Selecting a Community or card inspects it. It does not start an action.
        </p>
      </header>

      <div className="overflow-x-auto">
        <div
          className="grid grid-cols-3 gap-3"
          style={{ minWidth: FAUSTIAN_TABLE_MIN_WIDTH_PX }}
          aria-label="Faustian Community tableau"
        >
          {presentation.communities.map((community) => {
            const selected = selection?.kind === "community" && selection.communityId === community.communityId;
            return (
              <article
                key={community.communityId}
                tabIndex={0}
                onClick={() => selectCommunity(community.communityId)}
                onKeyDown={(event) => onCommunityKey(event, community.communityId)}
                aria-label={community.headerLabel}
                className={`rounded-xl border p-3 space-y-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                  selected ? "border-teal-600 bg-teal-50/40 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <header className="border-b border-slate-200 dark:border-slate-700 pb-2">
                  <p className="text-sm font-semibold">{community.zodiacLabel}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{community.populace}</p>
                  <p className="text-xs text-slate-500">{community.associatedWizardLabel}</p>
                </header>
                <div className="space-y-2">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">Schemes</p>
                    <FannedPile
                      cards={community.schemes}
                      overflowLabel={community.schemes.overflowLabel}
                      onInspect={() => {
                        selectCommunity(community.communityId);
                        setInspectorCommunityId(community.communityId);
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
                    />
                  </div>
                  <p className="text-xs font-medium" aria-label={community.pawnLabel}>{community.pawnLabel}</p>
                  {community.conspiracies.length > 0 && (
                    <ul className="text-xs space-y-0.5">
                      {community.conspiracies.map((conspiracy) => (
                        <li key={conspiracy.denizenId}>Conspiracy: {conspiracy.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
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
              {inspectorSchemes.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
              {inspectorSchemes.length === 0 && <p className="text-xs text-slate-400">None</p>}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Accomplices</p>
            <div className="flex flex-wrap gap-2">
              {inspectorAccomplices.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
              {inspectorAccomplices.length === 0 && <p className="text-xs text-slate-400">None</p>}
            </div>
          </div>
        </section>
      )}

      <div className={`grid gap-3 ${layout === "narrow" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        <Area title={`Faustian's Deck (${presentation.faustianDeckCount})`} selected={selection?.kind === "supporting" && selection.area === "faustian_deck"} onSelect={() => setSelection({ kind: "supporting", area: "faustian_deck" })}>
          <p className="text-xs text-slate-500">Unrevealed draw pile. Identities are not shown.</p>
        </Area>
        <Area title={`Devil's Deck (${presentation.devilDeckCount})`} selected={selection?.kind === "supporting" && selection.area === "devil_deck"} onSelect={() => setSelection({ kind: "supporting", area: "devil_deck" })}>
          <p className="text-xs text-slate-500">Unrevealed draw pile. Identities are not shown.</p>
        </Area>
        <Area title="Suit summary" selected={selection?.kind === "supporting" && selection.area === "suits"} onSelect={() => setSelection({ kind: "supporting", area: "suits" })}>
          <ul className="text-xs grid grid-cols-2 gap-1">
            {presentation.suitSummaries.map((suit) => (
              <li key={suit.suit}>{suit.label}: {suit.faustianDeckCount} in Faustian's Deck</li>
            ))}
          </ul>
        </Area>
        <Area title="Active Twist(s)" selected={selection?.kind === "supporting" && selection.area === "twists"} onSelect={() => setSelection({ kind: "supporting", area: "twists" })}>
          {presentation.twists.length === 0 ? (
            <p className="text-xs text-slate-400">None</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {presentation.twists.map((card, index) => (
                <div key={card.instanceKey} className="space-y-1">
                  <PlayingCardToken
                    card={card}
                    selected={selection?.kind === "twist" && selection.index === index}
                    onSelect={() => setSelection({ kind: "twist", index })}
                  />
                  {card.facing === "face_down" && (
                    <button
                      type="button"
                      className={ghostBtn}
                      aria-label={PRIVATE_TWIST_INSPECT_LABEL}
                      onClick={() => setPrivateTwistIndex(index)}
                    >
                      {PRIVATE_TWIST_INSPECT_LABEL}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Area>
        <Area title="Devil's Machinations" selected={selection?.kind === "supporting" && selection.area === "machinations"} onSelect={() => setSelection({ kind: "supporting", area: "machinations" })}>
          <div className="flex flex-wrap gap-2">
            {presentation.machinations.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
            {presentation.machinations.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </div>
        </Area>
        <Area title="Defeated Schemes" selected={selection?.kind === "supporting" && selection.area === "defeated"} onSelect={() => setSelection({ kind: "supporting", area: "defeated" })}>
          <div className="flex flex-wrap gap-2">
            {presentation.defeatedSchemes.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
            {presentation.defeatedSchemes.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </div>
        </Area>
        <Area title="Held cards" selected={selection?.kind === "supporting" && selection.area === "held"} onSelect={() => setSelection({ kind: "supporting", area: "held" })}>
          <div className="flex flex-wrap gap-2">
            {presentation.heldCards.map((card) => <PlayingCardToken key={card.instanceKey} card={card} />)}
            {presentation.heldCards.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </div>
        </Area>
        <Area title="Entrusted cards" selected={selection?.kind === "supporting" && selection.area === "entrusted"} onSelect={() => setSelection({ kind: "supporting", area: "entrusted" })}>
          <ul className="space-y-2">
            {presentation.entrustedCards.map((card) => (
              <li key={card.instanceKey} className="flex items-center gap-2">
                <PlayingCardToken card={card} />
                <span className="text-xs">{card.locationLabel}</span>
              </li>
            ))}
            {presentation.entrustedCards.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </ul>
        </Area>
        <Area title="Possession cards" selected={selection?.kind === "supporting" && selection.area === "possession"} onSelect={() => setSelection({ kind: "supporting", area: "possession" })}>
          <ul className="space-y-2">
            {presentation.possessionCards.map((card) => (
              <li key={card.instanceKey} className="flex items-center gap-2">
                <PlayingCardToken card={card} />
                <span className="text-xs">{card.locationLabel}</span>
              </li>
            ))}
            {presentation.possessionCards.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </ul>
        </Area>
        <Area title="Domain-placement cards" selected={selection?.kind === "supporting" && selection.area === "domain"} onSelect={() => setSelection({ kind: "supporting", area: "domain" })}>
          <ul className="space-y-2">
            {presentation.domainPlacements.map((card) => (
              <li key={card.instanceKey} className="flex items-center gap-2">
                <PlayingCardToken card={card} />
                <span className="text-xs">{card.locationLabel}</span>
              </li>
            ))}
            {presentation.domainPlacements.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </ul>
        </Area>
        <Area title="Sorcerer presence" selected={selection?.kind === "supporting" && selection.area === "sorcerer"} onSelect={() => setSelection({ kind: "supporting", area: "sorcerer" })}>
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
        </Area>
      </div>

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

      <Area title="Lore" selected={selection?.kind === "supporting" && selection.area === "lore"} onSelect={() => setSelection({ kind: "supporting", area: "lore" })}>
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
      </Area>
    </div>
  );
}
