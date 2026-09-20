import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  powerfulStatusLabel,
  type DenizenId,
  type HierophantProphet,
  type HierophantState,
  type HierophantSupplicant,
  type HierophantTemple,
  type HierophantTempleId,
  type HierophantVisionsChoices,
  type HierophantVisionsPlan,
  type HierophantVisionsRequiredChoice,
  type HierophantVisionsResource,
  type HierophantVisionsSupplicantPreview,
  type HierophantVisionsTemplePreview,
  type SorcererExternalPresence,
  type HierophantBuiltinClassId,
} from "../shared/domain";
import type { NamedDenizen, NamedPlace } from "./hierophant-view-model";
import {
  classLabel,
  denizenLabel,
  formatVisionsDemand,
  formatVisionsResourceName,
  formatVisionsTempleWarnings,
  hostedProphets,
  hostedSupplicants,
  researcherOperationalLabel,
  startingOrdinaryTempleIds,
  supplementaryTemples,
  personPieceName,
  supplicantGivenName,
  templeDisplayName,
  templeDoctrineSummary,
  templeResearchers,
  templeSupportedClassIds,
  shortTempleBoardLabel,
  woeThresholdCueLabel,
} from "./hierophant-view-model";
import { formatVisionsPreviewChoiceSummary } from "./hierophant-visions-preview";
import HierophantClassBadge from "./hierophant-class-badge";
import type { HierophantResourceKind, HierophantResourcePoolView } from "./hierophant-resource-intent";
import {
  HIEROPHANT_SUPPLY_CLASS_IDS,
  beginHierophantSupplyDrag,
  endHierophantSupplyDrag,
  hierophantSupplyDragIsActive,
  liveHierophantSupplyClass,
  readHierophantSupplyDragClass,
  resolveHierophantSupplyDestination,
  writeHierophantSupplyDragData,
  type HierophantSupplyClassId,
  type HierophantSupplyZone,
} from "./hierophant-supply";

export interface HierophantVisionsBoardChoices {
  readonly plan: HierophantVisionsPlan;
  readonly openChoices: readonly HierophantVisionsRequiredChoice[];
  readonly previewChoices: HierophantVisionsChoices;
  readonly orderDraft: readonly DenizenId[];
  readonly onArtisanPayment: (denizenId: DenizenId, resource: HierophantVisionsResource) => void;
  readonly onHestarFallback: (denizenId: DenizenId, useHestar: boolean) => void;
  readonly onHestarDonor: (denizenId: DenizenId, templeId: HierophantTempleId) => void;
  readonly onOrderSelect: (denizenId: DenizenId) => void;
  readonly onOrderUndo: () => void;
  readonly onOrderReset: () => void;
  readonly resolveAvailable: boolean;
  readonly resolvePending: boolean;
  readonly resolveGuidance: string | null;
  readonly onResolveVisions: () => void;
}

export interface HierophantSupplyBoardInteraction {
  readonly activeClassId: string | null;
  readonly hoverKey: string | null;
  readonly blockNotice: { readonly templeId: string; readonly reason: string } | null;
  readonly peekActiveClassId: () => string | null;
  readonly onBegin: (classId: HierophantBuiltinClassId) => void;
  readonly onHover: (key: string | null) => void;
  readonly onDeliver: (
    temple: HierophantTemple,
    zone: HierophantSupplyZone,
    classIdFromDrag?: string | null,
  ) => void;
  readonly onCancel: () => void;
}

export interface HierophantPieceControls {
  readonly selectedSupplicantId: string | null;
  readonly onSelectSupplicant: (denizenId: string) => void;
  readonly onSetWoe: (denizenId: string, currentWoe: number, nextWoe: number) => void;
  readonly onAdjustResource: (
    templeId: string,
    resource: HierophantResourceKind,
    delta: 1 | -1,
  ) => void;
  readonly resourceView: (
    templeId: string,
    resource: HierophantResourceKind,
    authoritative: number,
  ) => HierophantResourcePoolView;
  readonly transferBusy: boolean;
  readonly onTransferHestarResource: (
    resource: HierophantResourceKind,
    sourceTempleId: string,
    destinationTempleId: string,
  ) => void;
}

function SupplyClassPiece({
  classId,
  label,
  pressed,
  supply,
}: {
  readonly classId: HierophantSupplyClassId;
  readonly label: string;
  readonly pressed: boolean;
  readonly supply: HierophantSupplyBoardInteraction;
}) {
  const ignoreClickRef = useRef(false);
  function toggle(): void {
    if (pressed) supply.onCancel();
    else supply.onBegin(classId);
  }
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-supply-class={classId}
      aria-label={`${label} supply`}
      aria-pressed={pressed}
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
        pressed
          ? "border-amber-800 bg-amber-800 text-amber-50 dark:border-amber-200 dark:bg-amber-200 dark:text-amber-950"
          : "border-amber-800/40 bg-amber-50 text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-50"
      }`}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        ignoreClickRef.current = true;
        beginHierophantSupplyDrag(classId);
        writeHierophantSupplyDragData(event.dataTransfer, classId);
        supply.onBegin(classId);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          endHierophantSupplyDrag();
          supply.onCancel();
          ignoreClickRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (ignoreClickRef.current) {
          ignoreClickRef.current = false;
          return;
        }
        toggle();
      }}
      onKeyDown={(event) => activate(event, toggle)}
    >
      <HierophantClassBadge classId={classId} label={label} />
      <span>{label}</span>
    </div>
  );
}

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function ChoiceButton({
  label,
  pressed,
  recommended = false,
  onChoose,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly recommended?: boolean;
  readonly onChoose: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`rounded-md px-2 py-1 text-xs font-semibold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
        pressed
          ? "border-2 border-amber-800 bg-amber-800 text-amber-50 dark:border-amber-200 dark:bg-amber-200 dark:text-amber-950"
          : recommended
            ? "border-2 border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-300 dark:bg-amber-900/60 dark:text-amber-50"
            : "border border-amber-800/40 bg-white text-amber-950 dark:border-amber-500/50 dark:bg-slate-900 dark:text-amber-50"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onChoose();
      }}
      onKeyDown={(event) => activate(event, onChoose)}
    >
      {label}
    </button>
  );
}

function supplyHighlightClass(highlight: "recommended" | "alternative" | "reject" | null): string {
  if (highlight === "recommended") return "ring-2 ring-amber-600 bg-amber-100/80 dark:ring-amber-300 dark:bg-amber-900/50";
  if (highlight === "alternative") return "ring-1 ring-amber-400 bg-amber-50/70 dark:ring-amber-500 dark:bg-amber-950/40";
  if (highlight === "reject") return "ring-2 ring-rose-600 bg-rose-100/80 dark:ring-rose-400 dark:bg-rose-950/50";
  return "";
}

function SupplyDropZone({
  temple,
  zone,
  supply,
  children,
  className = "",
}: {
  readonly temple: HierophantTemple;
  readonly zone: HierophantSupplyZone;
  readonly supply: HierophantSupplyBoardInteraction | null;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const dest = resolveHierophantSupplyDestination(temple, zone);
  const key = `${temple.templeId}:${zone}`;
  const renderedActive = supply !== null && supply.activeClassId !== null;
  const hovering = renderedActive && supply.hoverKey === key;
  const highlight = hovering && dest !== null ? dest.highlight : null;
  const idleHint = renderedActive && dest !== null && dest.highlight === "recommended" && !hovering
    ? "ring-1 ring-amber-300/80 dark:ring-amber-700/80"
    : renderedActive && dest !== null && dest.highlight === "alternative" && !hovering
      ? "ring-1 ring-amber-200/70 dark:ring-amber-800/70"
      : "";
  function dragIsLive(dataTransfer: DataTransfer | null | undefined): boolean {
    if (supply === null) return false;
    return hierophantSupplyDragIsActive(dataTransfer, supply.peekActiveClassId, supply.activeClassId);
  }
  function deliver(dataTransfer?: DataTransfer | null): void {
    if (supply === null) return;
    if (!dragIsLive(dataTransfer ?? null)) return;
    supply.onDeliver(
      temple,
      zone,
      readHierophantSupplyDragClass(dataTransfer ?? null) ?? liveHierophantSupplyClass(),
    );
  }
  return (
    <div
      data-supply-drop={zone}
      className={`${className} ${supplyHighlightClass(highlight)} ${idleHint} rounded-md transition-shadow`}
      onDragEnter={(event) => {
        if (supply === null || !dragIsLive(event.dataTransfer)) return;
        event.preventDefault();
        supply.onHover(key);
      }}
      onDragOver={(event) => {
        if (supply === null || !dragIsLive(event.dataTransfer)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        supply.onHover(key);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        if (supply?.hoverKey === key) supply.onHover(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        deliver(event.dataTransfer);
      }}
      onClick={(event) => {
        if (!renderedActive || dest === null) return;
        event.stopPropagation();
        deliver();
      }}
    >
      {children}
    </div>
  );
}

function boardStatus(temple: HierophantTemple): { readonly label: string; readonly kind: "active" | "blasphemous" | "collapsed" } {
  if (temple.status === "collapsed") return { label: "Collapsed", kind: "collapsed" };
  if (temple.kind === "ordinary" && temple.doctrine.kind === "blasphemy") {
    return { label: "Blasphemous", kind: "blasphemous" };
  }
  return { label: "Active", kind: "active" };
}

function doctrineStateLabel(temple: HierophantTemple, campaignDoctrines: HierophantState["campaignDoctrines"]): string {
  if (temple.kind === "hestar") return "No Doctrine — supports all Classes";
  if (temple.doctrine.kind === "unset") return "Doctrine unset";
  if (temple.doctrine.kind === "blasphemy") return `Blasphemous: ${templeDoctrineSummary(temple, campaignDoctrines)}`;
  return templeDoctrineSummary(temple, campaignDoctrines);
}

function areaGroups(supplicants: readonly HierophantSupplicant[], isHestar: boolean) {
  if (isHestar) {
    return [{ key: "hestar", label: "Hosted at Hestar", people: [...supplicants] }];
  }
  return [
    { key: "courtyard", label: "Courtyard", people: supplicants.filter((person) => person.host.kind === "temple" && person.host.area === "courtyard") },
    { key: "agiary", label: "Agiary", people: supplicants.filter((person) => person.host.kind === "temple" && person.host.area === "agiary") },
    { key: "unresolved", label: "Area unresolved", people: supplicants.filter((person) => person.host.kind === "temple" && person.host.area === null) },
  ];
}

function prophetStatusText(denizens: readonly NamedDenizen[], denizenId: string): string {
  const status = denizens.find((denizen) => denizen.denizenId === denizenId)?.powerfulProfile?.status;
  return status === undefined || status === null ? "Shared status unset" : powerfulStatusLabel(status);
}

function ResourceCounter({
  label,
  after,
  delta,
  templeId,
  templeName,
  view,
  onAdjust,
  share,
}: {
  readonly label: "Abundance" | "Conviction";
  readonly before: number;
  readonly after: number | null;
  readonly delta: number | null;
  readonly templeId: string;
  readonly templeName: string;
  readonly view: HierophantResourcePoolView;
  readonly onAdjust: (resource: HierophantResourceKind, delta: 1 | -1) => void;
  readonly share: {
    readonly role: "ordinary" | "hestar";
    readonly blasphemous: boolean;
    readonly canToHestar: boolean;
    readonly canFromHestar: boolean;
    readonly canSend: boolean;
    readonly canTake: boolean;
    readonly candidates: readonly {
      readonly templeId: string;
      readonly name: string;
      readonly blasphemous: boolean;
      readonly canSendTo: boolean;
      readonly canTakeFrom: boolean;
    }[];
    readonly busy: boolean;
    readonly onToHestar: () => void;
    readonly onFromHestar: () => void;
    readonly onSendTo: (templeId: string) => void;
    readonly onTakeFrom: (templeId: string) => void;
  };
}) {
  const resource: HierophantResourceKind = label === "Abundance" ? "abundance" : "conviction";
  const shown = view.displayed;
  const forecast = after !== null && delta !== null && delta !== 0
    ? `${delta > 0 ? "+" : ""}${delta} → ${after}`
    : null;
  const restLabel = `${label} ${shown}`;
  const [revealed, setRevealed] = useState(false);
  const [chooser, setChooser] = useState<null | "send" | "take">(null);
  const shareVisible = revealed || chooser !== null;
  const shareAttr = shareVisible ? "revealed" : "hidden";
  const controlClass = `h-5 w-5 rounded border border-stone-600/40 text-xs font-bold transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
    revealed || chooser !== null ? "opacity-100" : "opacity-0"
  }`;
  const shareButtonClass = `rounded border border-stone-600/40 px-1 py-0 text-[10px] font-semibold leading-tight transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-50 ${
    shareVisible ? "opacity-100" : "opacity-0"
  }`;
  return (
    <div
      data-resource-counter={resource}
      data-temple-resource={templeId}
      data-resource-controls={shareVisible ? "revealed" : "hidden"}
      data-resource-pending={view.pending ? "true" : "false"}
      aria-busy={view.pending}
      className={`relative flex min-w-[4.75rem] flex-col items-center rounded-lg border-2 px-2 py-1 shadow-sm ${
        view.pending ? "ring-1 ring-amber-700/40 dark:ring-amber-300/30" : ""
      } ${
        label === "Abundance"
          ? "border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950/70 dark:text-amber-50"
          : "border-indigo-700 bg-indigo-100 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-50"
      }`}
      aria-label={forecast === null ? restLabel : `${restLabel}, Next Visions ${forecast}`}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => {
        setRevealed(false);
        if (chooser === null) return;
      }}
      onFocusCapture={() => setRevealed(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setRevealed(false);
          setChooser(null);
        }
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${controlClass} disabled:pointer-events-none`}
          aria-label={`Decrease ${templeName} ${label}`}
          disabled={shown <= 0 || share.busy}
          onClick={(event) => {
            event.stopPropagation();
            if (shown <= 0 || share.busy) return;
            onAdjust(resource, -1);
          }}
        >
          −
        </button>
        <span className="relative inline-flex items-center justify-center">
          <span data-resource-value="" className="text-xl font-bold tabular-nums leading-none">{shown}</span>
          {view.pending && (
            <span
              className="absolute -right-1.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-800 dark:bg-amber-200"
              aria-hidden="true"
            />
          )}
        </span>
        <button
          type="button"
          className={controlClass}
          aria-label={`Increase ${templeName} ${label}`}
          disabled={share.busy}
          onClick={(event) => {
            event.stopPropagation();
            if (share.busy) return;
            onAdjust(resource, 1);
          }}
        >
          +
        </button>
      </div>
      <div className="mt-0.5 flex min-h-[1.1rem] flex-col items-center gap-0.5">
        {share.role === "ordinary" && (
          <>
            {!share.blasphemous && (
              <div className="flex flex-wrap justify-center gap-0.5">
                <button
                  type="button"
                  className={shareButtonClass}
                  data-hestar-share={shareAttr}
                  disabled={!share.canToHestar}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!share.canToHestar) return;
                    share.onToHestar();
                  }}
                >
                  To Hestar
                </button>
                <button
                  type="button"
                  className={shareButtonClass}
                  data-hestar-share={shareAttr}
                  disabled={!share.canFromHestar}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!share.canFromHestar) return;
                    share.onFromHestar();
                  }}
                >
                  From Hestar
                </button>
              </div>
            )}
            {share.blasphemous && (
              <span
                className={`max-w-[9rem] text-center text-[9px] font-medium leading-tight text-rose-800 dark:text-rose-200 ${
                  shareVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                Cannot share with Hestar while Blasphemous
              </span>
            )}
          </>
        )}
        {share.role === "hestar" && (
          <>
            <div className="flex flex-wrap justify-center gap-0.5">
              <button
                type="button"
                className={shareButtonClass}
                data-hestar-share={shareAttr}
                aria-haspopup="menu"
                aria-expanded={chooser === "send"}
                disabled={!share.canSend}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!share.canSend && chooser !== "send") return;
                  setChooser((current) => current === "send" ? null : "send");
                }}
              >
                Send to...
              </button>
              <button
                type="button"
                className={shareButtonClass}
                data-hestar-share={shareAttr}
                aria-haspopup="menu"
                aria-expanded={chooser === "take"}
                disabled={!share.canTake}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!share.canTake && chooser !== "take") return;
                  setChooser((current) => current === "take" ? null : "take");
                }}
              >
                Take from...
              </button>
            </div>
            {chooser !== null && (
              <div
                role="menu"
                data-hestar-share-chooser={chooser}
                className="absolute left-1/2 top-full z-20 mt-1 w-44 -translate-x-1/2 rounded-md border border-stone-500 bg-stone-50 p-1 text-left shadow-md dark:border-stone-400 dark:bg-stone-900"
              >
                {share.candidates.map((candidate) => {
                  const enabled = chooser === "send" ? candidate.canSendTo : candidate.canTakeFrom;
                  return (
                    <button
                      key={candidate.templeId}
                      type="button"
                      role="menuitem"
                      disabled={!enabled}
                      className="flex w-full flex-col rounded px-1.5 py-1 text-left text-[11px] font-medium hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-amber-950/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!enabled) return;
                        if (chooser === "send") share.onSendTo(candidate.templeId);
                        else share.onTakeFrom(candidate.templeId);
                        setChooser(null);
                      }}
                    >
                      <span>{candidate.name}</span>
                      {candidate.blasphemous && (
                        <span className="text-[9px] font-medium text-rose-800 dark:text-rose-200">
                          Cannot share with Hestar while Blasphemous
                        </span>
                      )}
                      {!candidate.blasphemous && !enabled && chooser === "send" && (
                        <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300">
                          Hestar has none
                        </span>
                      )}
                      {!candidate.blasphemous && !enabled && chooser === "take" && (
                        <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300">
                          {candidate.name} has none
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {view.pending && <span className="sr-only">Saving {label}</span>}
      {view.error !== null && (
        <span data-resource-error="" className="mt-0.5 text-[10px] font-medium text-rose-800 dark:text-rose-200">
          {view.error}
        </span>
      )}
      {forecast !== null && (
        <span className="mt-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300" data-resource-forecast="">
          Next Visions {forecast}
        </span>
      )}
    </div>
  );
}

function WoePips({
  woe,
  denizenId,
  subjectLabel,
  onSet,
}: {
  readonly woe: number;
  readonly denizenId: string;
  readonly subjectLabel: string;
  readonly onSet: (nextWoe: number) => void;
}) {
  const visualRange = 5;
  const filled = Math.min(woe, visualRange);
  const pipClass = (filledPip: boolean) =>
    `inline-flex h-3 w-3 items-center justify-center rounded-full border border-stone-700 dark:border-stone-200 ${
      filledPip ? "bg-stone-800 dark:bg-stone-100" : "bg-transparent"
    }`;
  return (
    <div className="inline-flex items-center gap-1" data-woe-pips={denizenId} aria-label={`Woe ${woe}`}>
      <button
        type="button"
        data-woe-target="0"
        aria-label={`Set ${subjectLabel} Woe to 0`}
        aria-pressed={woe === 0}
        className={`inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-sm border px-0.5 text-[10px] font-semibold tabular-nums cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
          woe === 0
            ? "border-stone-800 bg-stone-800 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
            : "border-stone-400/80 bg-white text-stone-700 dark:border-stone-500 dark:bg-slate-900 dark:text-stone-200"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onSet(0);
        }}
      >
        0
      </button>
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: visualRange }, (_, index) => {
          const target = index + 1;
          const filledPip = index < filled;
          return (
            <button
              key={target}
              type="button"
              data-woe-target={target}
              data-woe-filled={filledPip ? "true" : "false"}
              aria-label={`Set ${subjectLabel} Woe to ${target}`}
              aria-pressed={woe === target}
              className={`${pipClass(filledPip)} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700`}
              onClick={(event) => {
                event.stopPropagation();
                onSet(target);
              }}
            />
          );
        })}
      </span>
      <span className="text-xs tabular-nums font-medium">Woe {woe}</span>
    </div>
  );
}

function PersonPieceHeader({
  type,
  name,
  typeClassName,
}: {
  readonly type: string;
  readonly name: string | null;
  readonly typeClassName: string;
}) {
  return (
    <div data-piece-header="" className="flex items-baseline justify-between gap-2">
      <span data-piece-type="" className={`text-[10px] font-bold uppercase tracking-wide ${typeClassName}`}>
        {type}
      </span>
      {name !== null && (
        <span data-piece-name="" className="min-w-0 truncate text-[11px] leading-tight text-slate-600 dark:text-slate-300">
          {name}
        </span>
      )}
    </div>
  );
}

function SupplicantPiece({
  person,
  preview,
  denizens,
  campaignClasses,
  artisanChoice,
  artisanSelected,
  hestarFallback,
  hestarFallbackSelected,
  orderIndex,
  orderSelectable,
  selected,
  onSelect,
  onSetWoe,
  onArtisanPayment,
  onHestarFallback,
  onOrderSelect,
}: {
  readonly person: HierophantSupplicant;
  readonly preview: HierophantVisionsSupplicantPreview | undefined;
  readonly denizens: readonly NamedDenizen[];
  readonly campaignClasses: HierophantState["campaignClasses"];
  readonly artisanChoice: Extract<HierophantVisionsRequiredChoice, { kind: "artisan_payment" }> | undefined;
  readonly artisanSelected: HierophantVisionsResource | undefined;
  readonly hestarFallback: Extract<HierophantVisionsRequiredChoice, { kind: "hestar_fallback" }> | undefined;
  readonly hestarFallbackSelected: boolean | undefined;
  readonly orderIndex: number | null;
  readonly orderSelectable: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onSetWoe: (nextWoe: number) => void;
  readonly onArtisanPayment: (resource: HierophantVisionsResource) => void;
  readonly onHestarFallback: (useHestar: boolean) => void;
  readonly onOrderSelect: () => void;
}) {
  const storedName = denizenLabel(denizens, person.denizenId);
  const klass = classLabel(person.classId, campaignClasses);
  const givenName = supplicantGivenName(storedName, klass);
  const support = preview === undefined ? null : preview.support === "supported" ? "Supported" : preview.support === "unsupported" ? "Unsupported" : null;
  const demand = preview === undefined ? null : formatVisionsDemand(preview.demand);
  const projectedTo = preview?.woeProjection.kind === "determined" ? preview.woeProjection.to : null;
  const threshold = woeThresholdCueLabel(person.woe);
  const danger = person.woe >= 5 || preview?.blockerKind !== null;
  const accessible = [
    "Supplicant",
    givenName,
    klass,
    `Woe ${person.woe}`,
    support,
    demand,
    threshold,
    projectedTo === null ? null : `Next Visions Woe ${person.woe} → ${projectedTo}`,
    orderIndex === null ? null : `Visions order ${orderIndex}`,
  ].filter((part): part is string => part !== null && part !== "").join(", ");
  const primaryAction = () => {
    onSelect();
    if (orderSelectable && orderIndex === null) onOrderSelect();
  };
  const subjectLabel = givenName ?? klass;
  const primaryLabel = orderSelectable && orderIndex === null
    ? `Add ${klass}${givenName === null ? "" : ` ${givenName}`} to Visions order`
    : accessible;
  return (
    <li>
      <div
        data-supplicant-piece={person.denizenId}
        className={`relative rounded-md border px-2 py-1 shadow-sm ${
          danger
            ? "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40"
            : "border-amber-800/40 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-950/30"
        } ${selected ? "ring-1 ring-amber-700 dark:ring-amber-300" : ""}`}
      >
        <button
          type="button"
          className="w-full text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          aria-label={primaryLabel}
          aria-pressed={selected}
          onClick={primaryAction}
          onKeyDown={(event) => activate(event, primaryAction)}
        >
          <PersonPieceHeader
            type="Supplicant"
            name={givenName}
            typeClassName="text-amber-900 dark:text-amber-200"
          />
          {orderIndex !== null && (
            <span
              className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-800 px-1 text-[11px] font-bold text-amber-50 dark:bg-amber-200 dark:text-amber-950"
              aria-label={`Visions order ${orderIndex}`}
            >
              {orderIndex}
            </span>
          )}
        </button>
        <div data-supplicant-identity="" className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <HierophantClassBadge classId={person.classId} label={klass} />
            {support !== null && (
              <span
                data-support-badge={preview?.support}
                className={`text-[11px] leading-tight ${
                  support === "Supported"
                    ? "font-semibold text-emerald-900 dark:text-emerald-100"
                    : "font-medium text-stone-600 dark:text-stone-300"
                }`}
              >
                {support}
              </span>
            )}
          </div>
          <WoePips
            woe={person.woe}
            denizenId={person.denizenId}
            subjectLabel={subjectLabel}
            onSet={onSetWoe}
          />
        </div>
        {(projectedTo !== null && projectedTo !== person.woe) || demand !== null || threshold !== null || preview?.thresholdCue.kind === "ready_for_benefaction" || (preview?.thresholdCue.kind === "cult_departure_due" && person.woe < 5) ? (
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
            {projectedTo !== null && projectedTo !== person.woe && (
              <p className="text-[10px] text-slate-600 dark:text-slate-300" data-woe-forecast={person.denizenId} aria-label={`Next Visions: Woe ${person.woe} → ${projectedTo}`}>
                Next Visions: {person.woe} → {projectedTo}
              </p>
            )}
            {preview?.thresholdCue.kind === "ready_for_benefaction" && person.woe !== 0 && (
              <p className="text-[10px] text-slate-600 dark:text-slate-300">
                Next Visions: Ready for Benefaction
              </p>
            )}
            {preview?.thresholdCue.kind === "cult_departure_due" && person.woe < 5 && (
              <p className="text-[10px] text-slate-600 dark:text-slate-300">
                Next Visions: Cult departure due
              </p>
            )}
            {demand !== null && (
              <p className="text-[11px] text-slate-700 dark:text-slate-200">{demand}</p>
            )}
            {threshold !== null && (
              <p
                className="text-[11px] font-semibold text-rose-900 dark:text-rose-100"
                data-woe-threshold={person.woe === 0 ? "benefaction" : "cult"}
              >
                {threshold}
              </p>
            )}
          </div>
        ) : null}
        {artisanChoice !== undefined && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium">Pay with:</span>
            {artisanChoice.options.map((resource) => (
              <ChoiceButton
                key={resource}
                label={formatVisionsResourceName(resource)}
                pressed={artisanSelected === resource}
                onChoose={() => onArtisanPayment(resource)}
              />
            ))}
          </div>
        )}
        {hestarFallback !== undefined && (
          <div className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-medium">
              Use Hestar's {formatVisionsResourceName(hestarFallback.resource)}?
            </span>
            <div className="flex flex-wrap gap-1.5">
              <ChoiceButton
                label="Use Hestar"
                recommended
                pressed={hestarFallbackSelected === true}
                onChoose={() => onHestarFallback(true)}
              />
              <ChoiceButton
                label="Don't"
                pressed={hestarFallbackSelected === false}
                onChoose={() => onHestarFallback(false)}
              />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function TemplePiece({
  temple,
  hierophant,
  denizens,
  places,
  presence,
  plan,
  selected,
  onSelect,
  choices,
  supply,
  pieces,
}: {
  readonly temple: HierophantTemple;
  readonly hierophant: HierophantState;
  readonly denizens: readonly NamedDenizen[];
  readonly places: readonly NamedPlace[];
  readonly presence: readonly SorcererExternalPresence[];
  readonly plan: HierophantVisionsPlan;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly choices: HierophantVisionsBoardChoices;
  readonly supply: HierophantSupplyBoardInteraction | null;
  readonly pieces: HierophantPieceControls;
}) {
  const isHestar = temple.kind === "hestar";
  const hosted = hostedSupplicants(hierophant.supplicants, { kind: "temple", templeId: temple.templeId });
  const prophets = hostedProphets(hierophant.prophets, { kind: "temple", templeId: temple.templeId });
  const researchers = templeResearchers(presence, temple.templeId);
  const holiday = hierophant.holidayTempleIds.includes(temple.templeId);
  const groups = areaGroups(hosted, isHestar);
  const status = boardStatus(temple);
  const name = templeDisplayName(temple, places);
  const hestarTemple = hierophant.temples.find((entry) => entry.kind === "hestar" || entry.templeId === "hestar");
  const ordinaryTemples = hierophant.temples.filter((entry) => entry.kind === "ordinary");
  function resourceCount(entry: HierophantTemple, resource: HierophantResourceKind): number {
    return resource === "abundance" ? entry.abundance : entry.conviction;
  }
  function shareFor(resource: HierophantResourceKind) {
    const hestarCount = hestarTemple === undefined ? 0 : resourceCount(hestarTemple, resource);
    const ownCount = resourceCount(temple, resource);
    const blasphemous = temple.kind === "ordinary" && temple.doctrine.kind === "blasphemy";
    return {
      role: (temple.kind === "hestar" ? "hestar" : "ordinary") as "ordinary" | "hestar",
      blasphemous,
      canToHestar: !pieces.transferBusy && !blasphemous && ownCount >= 1,
      canFromHestar: !pieces.transferBusy && !blasphemous && hestarCount >= 1,
      canSend: !pieces.transferBusy && hestarCount >= 1,
      canTake: !pieces.transferBusy && ordinaryTemples.some((entry) => (
        entry.doctrine.kind !== "blasphemy" && resourceCount(entry, resource) >= 1
      )),
      candidates: ordinaryTemples.map((entry) => ({
        templeId: entry.templeId,
        name: templeDisplayName(entry, places),
        blasphemous: entry.doctrine.kind === "blasphemy",
        canSendTo: !pieces.transferBusy && hestarCount >= 1 && entry.doctrine.kind !== "blasphemy",
        canTakeFrom: !pieces.transferBusy && entry.doctrine.kind !== "blasphemy" && resourceCount(entry, resource) >= 1,
      })),
      busy: pieces.transferBusy,
      onToHestar: () => pieces.onTransferHestarResource(resource, temple.templeId, "hestar"),
      onFromHestar: () => pieces.onTransferHestarResource(resource, "hestar", temple.templeId),
      onSendTo: (templeId: string) => pieces.onTransferHestarResource(resource, "hestar", templeId),
      onTakeFrom: (templeId: string) => pieces.onTransferHestarResource(resource, templeId, "hestar"),
    };
  }
  const templePreview: HierophantVisionsTemplePreview | undefined = plan.temples.find((entry) => entry.templeId === temple.templeId);
  const fallbackChoice = choices.openChoices.find(
    (choice) => choice.kind === "hestar_fallback" && choice.templeId === temple.templeId,
  );
  const donorChoices = choices.openChoices.filter(
    (choice): choice is Extract<HierophantVisionsRequiredChoice, { kind: "hestar_donor" }> =>
      choice.kind === "hestar_donor" && choice.templeId === temple.templeId,
  );
  const donorLabels = donorChoices.flatMap((choice) =>
    choice.eligibleDonorTempleIds.map((templeId) => {
      const donor = hierophant.temples.find((entry) => entry.templeId === templeId);
      return shortTempleBoardLabel(donor === undefined ? templeId : templeDisplayName(donor, places));
    }),
  );
  const warnings = templePreview === undefined
    ? []
    : formatVisionsTempleWarnings(templePreview, {
        hestarFallbackResource: fallbackChoice?.kind === "hestar_fallback" ? fallbackChoice.resource : undefined,
        donorAmount: donorChoices[0]?.amount,
        donorResource: donorChoices[0]?.resource,
        donorLabels: [...new Set(donorLabels)],
      });
  const supportedClassIds = templeSupportedClassIds(temple, hierophant.campaignDoctrines);
  const previews = new Map(plan.supplicants.map((entry) => [entry.denizenId, entry]));
  const orderChoice = choices.openChoices.find((choice) => choice.kind === "supplicant_order");
  const orderParticipants = orderChoice?.kind === "supplicant_order" ? orderChoice.participantIds : [];
  return (
    <article
      data-temple-id={temple.templeId}
      aria-label={`${name} board`}
      className={`rounded-xl border-2 p-3 flex flex-col gap-2 min-w-0 shadow-md ${
        isHestar
          ? "border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/40"
          : status.kind === "collapsed"
            ? "border-stone-700 bg-stone-200 dark:border-stone-400 dark:bg-stone-900"
            : status.kind === "blasphemous"
              ? "border-rose-600 dark:border-rose-400 bg-rose-50 dark:bg-rose-950/40"
              : "border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900"
      } ${selected ? "ring-2 ring-amber-600 dark:ring-amber-300" : ""}`}
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="text-left cursor-pointer min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            aria-pressed={selected}
            aria-label={`${name}, ${status.label}`}
            onClick={onSelect}
            onKeyDown={(event) => activate(event, onSelect)}
          >
            <h3 className="font-semibold text-amber-950 dark:text-amber-100">
              {name}
              {isHestar ? " · Hestar" : ""}
            </h3>
          </button>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              status.kind === "collapsed"
                ? "bg-stone-800 text-stone-100"
                : status.kind === "blasphemous"
                  ? "bg-rose-700 text-white"
                  : "bg-emerald-800 text-emerald-50"
            }`}
          >
            {status.label}
          </span>
        </div>
        {holiday && (
          <p
            className="self-start rounded-full border-2 border-amber-600 bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-950 dark:border-amber-300 dark:bg-amber-700 dark:text-amber-50"
            aria-label="Holiday marked"
          >
            Holiday
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <ResourceCounter
            label="Abundance"
            before={temple.abundance}
            after={templePreview?.abundance.after ?? null}
            delta={templePreview?.abundance.delta ?? null}
            templeId={temple.templeId}
            templeName={name}
            view={pieces.resourceView(temple.templeId, "abundance", temple.abundance)}
            onAdjust={(resource, delta) => pieces.onAdjustResource(temple.templeId, resource, delta)}
            share={shareFor("abundance")}
          />
          <ResourceCounter
            label="Conviction"
            before={temple.conviction}
            after={templePreview?.conviction.after ?? null}
            delta={templePreview?.conviction.delta ?? null}
            templeId={temple.templeId}
            templeName={name}
            view={pieces.resourceView(temple.templeId, "conviction", temple.conviction)}
            onAdjust={(resource, delta) => pieces.onAdjustResource(temple.templeId, resource, delta)}
            share={shareFor("conviction")}
          />
        </div>
        <div className="rounded-md border border-amber-900/20 bg-amber-50/80 px-2 py-1 dark:border-amber-200/20 dark:bg-amber-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Doctrine</p>
          <p className={`text-sm ${temple.kind === "ordinary" && temple.doctrine.kind === "unset" ? "italic text-slate-600 dark:text-slate-300" : ""}`}>
            {doctrineStateLabel(temple, hierophant.campaignDoctrines)}
          </p>
          {isHestar ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500" aria-label="Supports all Classes">
              Supports all
            </p>
          ) : supportedClassIds.length > 0 ? (
            <div className="mt-1" aria-label={`Supports ${supportedClassIds.map((classId) => classLabel(classId, hierophant.campaignClasses)).join(", ")}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Supports</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {supportedClassIds.map((classId) => (
                  <HierophantClassBadge
                    key={classId}
                    classId={classId}
                    label={classLabel(classId, hierophant.campaignClasses)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {warnings.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label="Visions warnings">
            {warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-md border border-rose-400 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900 dark:border-rose-500 dark:bg-rose-950/50 dark:text-rose-100"
              >
                {warning}
              </li>
            ))}
          </ul>
        )}
        {donorChoices.map((choice) => (
          <div key={choice.denizenId} className="flex flex-col gap-1">
            <span className="text-xs font-medium">
              Take {choice.amount} {formatVisionsResourceName(choice.resource)} from:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {choice.eligibleDonorTempleIds.map((templeId) => {
                const donor = hierophant.temples.find((entry) => entry.templeId === templeId);
                const label = shortTempleBoardLabel(donor === undefined ? templeId : templeDisplayName(donor, places));
                return (
                  <ChoiceButton
                    key={templeId}
                    label={label}
                    pressed={choices.previewChoices.hestarDonors?.[choice.denizenId] === templeId}
                    onChoose={() => choices.onHestarDonor(choice.denizenId, templeId)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </header>
      {status.kind === "collapsed" && (
        <SupplyDropZone
          temple={temple}
          zone="blocked"
          supply={supply}
          className={supply?.activeClassId !== null ? "min-h-[1.75rem]" : ""}
        >
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
            {supply?.blockNotice?.templeId === temple.templeId ? supply.blockNotice.reason : null}
          </p>
        </SupplyDropZone>
      )}
      {supply?.blockNotice?.templeId === temple.templeId && status.kind !== "collapsed" && (
        <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">{supply.blockNotice.reason}</p>
      )}
      {groups.filter((group) => group.people.length > 0 || group.key === "courtyard" || group.key === "agiary" || group.key === "hestar").map((group) => {
        const zone: HierophantSupplyZone | null =
          group.key === "courtyard" || group.key === "agiary" || group.key === "hestar"
            ? group.key
            : null;
        const section = (
        <section aria-label={group.label} className="text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h4>
          {group.people.length === 0 ? (
            <div
              className="mt-1 min-h-[2.25rem] rounded-md border border-dashed border-amber-900/20 bg-amber-50/40 dark:border-amber-200/15 dark:bg-amber-950/20"
              aria-hidden="true"
            />
          ) : (
            <ul className="flex flex-col gap-1.5 mt-1">
              {group.people.map((person) => (
                <SupplicantPiece
                  key={person.denizenId}
                  person={person}
                  preview={previews.get(person.denizenId)}
                  denizens={denizens}
                  campaignClasses={hierophant.campaignClasses}
                  artisanChoice={choices.openChoices.find((choice): choice is Extract<HierophantVisionsRequiredChoice, { kind: "artisan_payment" }> =>
                    choice.kind === "artisan_payment" && choice.denizenId === person.denizenId
                  )}
                  artisanSelected={choices.previewChoices.artisanPayments?.[person.denizenId]}
                  hestarFallback={choices.openChoices.find((choice): choice is Extract<HierophantVisionsRequiredChoice, { kind: "hestar_fallback" }> =>
                    choice.kind === "hestar_fallback" && choice.denizenId === person.denizenId
                  )}
                  hestarFallbackSelected={choices.previewChoices.hestarFallback?.[person.denizenId]}
                  orderIndex={(() => {
                    const index = choices.orderDraft.indexOf(person.denizenId);
                    return index === -1 ? null : index + 1;
                  })()}
                  orderSelectable={orderParticipants.includes(person.denizenId)}
                  selected={pieces.selectedSupplicantId === person.denizenId}
                  onSelect={() => {
                    onSelect();
                    pieces.onSelectSupplicant(person.denizenId);
                  }}
                  onSetWoe={(nextWoe) => pieces.onSetWoe(person.denizenId, person.woe, nextWoe)}
                  onArtisanPayment={(resource) => choices.onArtisanPayment(person.denizenId, resource)}
                  onHestarFallback={(useHestar) => choices.onHestarFallback(person.denizenId, useHestar)}
                  onOrderSelect={() => choices.onOrderSelect(person.denizenId)}
                />
              ))}
            </ul>
          )}
        </section>
        );
        if (zone === null) return <div key={group.key}>{section}</div>;
        return (
          <SupplyDropZone key={group.key} temple={temple} zone={zone} supply={supply}>
            {section}
          </SupplyDropZone>
        );
      })}
      {prophets.length > 0 && (
      <section aria-label="Prophets" className="text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prophets</h4>
        <ul className="flex flex-col gap-1 mt-1">
            {prophets.map((prophet: HierophantProphet) => {
              const prophetName = personPieceName(denizenLabel(denizens, prophet.denizenId));
              return (
              <li key={prophet.denizenId}>
                <button
                  type="button"
                  data-prophet-piece={prophet.denizenId}
                  className="w-full text-left rounded-lg border-2 border-violet-600 bg-violet-50 px-2 py-1 shadow-sm cursor-pointer dark:border-violet-400 dark:bg-violet-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                  aria-label={`${prophetName ?? "Prophet"}, Prophet`}
                  onClick={onSelect}
                  onKeyDown={(event) => activate(event, onSelect)}
                >
                  <PersonPieceHeader
                    type="Prophet"
                    name={prophetName}
                    typeClassName="text-violet-800 dark:text-violet-200"
                  />
                  <div className="text-[11px] leading-tight text-slate-600 dark:text-slate-300">{prophetStatusText(denizens, prophet.denizenId)} · Temple host</div>
                </button>
              </li>
              );
            })}
        </ul>
      </section>
      )}
      {researchers.length > 0 && (
      <section aria-label="Sorcerer Researcher" className="text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Researcher</h4>
        <ul className="flex flex-col gap-1 mt-1">
            {researchers.map((researcher) => {
              const researcherName = personPieceName(researcher.name);
              return (
              <li
                key={researcher.denizenId}
                data-researcher-piece={researcher.denizenId}
                className="rounded-lg border-2 border-dashed border-slate-500 bg-slate-50 px-2 py-1 dark:border-slate-400 dark:bg-slate-900"
              >
                <PersonPieceHeader
                  type="Researcher"
                  name={researcherName}
                  typeClassName="text-slate-500"
                />
                <div className="text-[11px] leading-tight text-slate-600 dark:text-slate-300">
                  {researcherOperationalLabel(researcher.operationalThisMonth)}
                  <span className="sr-only">
                    {researcher.operationalThisMonth ? " operational" : " not operational this month"}
                  </span>
                </div>
              </li>
              );
            })}
        </ul>
      </section>
      )}
    </article>
  );
}

export default function HierophantTempleBoard({
  hierophant,
  denizens,
  places,
  presence,
  selectedTempleId,
  onSelectTemple,
  choices,
  supply,
  pieces,
}: {
  readonly hierophant: HierophantState;
  readonly denizens: readonly NamedDenizen[];
  readonly places: readonly NamedPlace[];
  readonly presence: readonly SorcererExternalPresence[];
  readonly selectedTempleId: string | null;
  readonly onSelectTemple: (templeId: string) => void;
  readonly choices: HierophantVisionsBoardChoices;
  readonly supply: HierophantSupplyBoardInteraction;
  readonly pieces: HierophantPieceControls;
}) {
  const plan = choices.plan;
  const byId = new Map(hierophant.temples.map((temple) => [temple.templeId, temple]));
  const hestar = byId.get("hestar");
  const extras = supplementaryTemples(hierophant.temples);
  const orderChoice = choices.openChoices.find((choice) => choice.kind === "supplicant_order");
  const summary = formatVisionsPreviewChoiceSummary(choices.openChoices, {
    ...choices.previewChoices,
    supplicantOrder: choices.orderDraft,
  }, {
    denizenName: (id) => denizenLabel(denizens, id),
    templeName: (id) => {
      const temple = byId.get(id as HierophantTempleId);
      return temple === undefined ? id : templeDisplayName(temple, places);
    },
  });
  function renderTemple(temple: HierophantTemple) {
    return (
      <TemplePiece
        temple={temple}
        hierophant={hierophant}
        denizens={denizens}
        places={places}
        presence={presence}
        plan={plan}
        selected={selectedTempleId === temple.templeId}
        onSelect={() => onSelectTemple(temple.templeId)}
        choices={choices}
        supply={supply}
        pieces={pieces}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {orderChoice?.kind === "supplicant_order" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <span className="font-medium">Choose Visions order</span>
          <span className="text-xs text-slate-600 dark:text-slate-300">Click the marked pieces in sequence.</span>
          <button
            type="button"
            className="text-xs font-medium rounded-md px-2 py-1 border border-amber-800/40 cursor-pointer"
            aria-label="Undo last Visions order"
            onClick={choices.onOrderUndo}
          >
            Undo last
          </button>
          <button
            type="button"
            className="text-xs font-medium rounded-md px-2 py-1 border border-amber-800/40 cursor-pointer"
            aria-label="Reset Visions order"
            onClick={choices.onOrderReset}
          >
            Reset
          </button>
        </div>
      )}
      <div
        className="grid gap-3 md:grid-cols-[1fr_1.15fr_1fr] md:grid-rows-2"
        aria-label="Temples of the Hierophant"
      >
        {startingOrdinaryTempleIds().slice(0, 2).map((templeId, index) => {
          const temple = byId.get(templeId);
          if (temple === undefined) return null;
          return (
            <div key={temple.templeId} className={index === 0 ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"}>
              {renderTemple(temple)}
            </div>
          );
        })}
        {hestar !== undefined && (
          <div className="md:col-start-2 md:row-start-1 md:row-span-2">
            {renderTemple(hestar)}
          </div>
        )}
        {startingOrdinaryTempleIds().slice(2).map((templeId, index) => {
          const temple = byId.get(templeId);
          if (temple === undefined) return null;
          return (
            <div key={temple.templeId} className={index === 0 ? "md:col-start-1 md:row-start-2" : "md:col-start-3 md:row-start-2"}>
              {renderTemple(temple)}
            </div>
          );
        })}
      </div>
      {summary.length > 0 && (
        <p
          className="text-xs text-slate-600 dark:text-slate-300"
          aria-label="Visions preview choices"
        >
          {summary.join(" · ")}
        </p>
      )}
      <section aria-label="Resolve Visions" className="flex flex-col gap-2">
        {choices.resolveGuidance !== null && (
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
            {choices.resolveGuidance}
          </p>
        )}
        {choices.resolveAvailable && (
          <button
            type="button"
            className="self-start text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer bg-amber-800 dark:bg-amber-200 text-white dark:text-amber-950 hover:bg-amber-700 dark:hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={choices.resolvePending}
            onClick={choices.onResolveVisions}
          >
            Resolve Visions
          </button>
        )}
      </section>
      <section
        aria-label="Supplicant supply"
        className="rounded-lg border border-dashed border-amber-800/30 bg-amber-50/40 px-3 py-2 dark:border-amber-500/25 dark:bg-amber-950/20"
      >
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Supplicant supply
        </h3>
        <ul className="flex flex-wrap gap-2">
          {HIEROPHANT_SUPPLY_CLASS_IDS.map((classId) => {
            const label = classLabel(classId, hierophant.campaignClasses);
            const pressed = supply.activeClassId === classId;
            return (
              <li key={classId}>
                <SupplyClassPiece
                  classId={classId}
                  label={label}
                  pressed={pressed}
                  supply={supply}
                />
              </li>
            );
          })}
        </ul>
      </section>
      {extras.length > 0 && (
        <section aria-label="Additional Temples" className="grid gap-3 md:grid-cols-2">
          {extras.map((temple) => (
            <TemplePiece
              key={temple.templeId}
              temple={temple}
              hierophant={hierophant}
              denizens={denizens}
              places={places}
              presence={presence}
              plan={plan}
              selected={selectedTempleId === temple.templeId}
              onSelect={() => onSelectTemple(temple.templeId)}
              choices={choices}
              supply={supply}
              pieces={pieces}
            />
          ))}
        </section>
      )}
    </div>
  );
}
