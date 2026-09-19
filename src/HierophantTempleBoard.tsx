import { useRef, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
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
import {
  HIEROPHANT_SUPPLY_CLASS_IDS,
  hierophantSupplyDragIsActive,
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
  readonly onAdjustWoe: (denizenId: string, currentWoe: number, delta: 1 | -1) => void;
  readonly onAdjustResource: (
    templeId: string,
    templeName: string,
    resource: "abundance" | "conviction",
    current: number,
    delta: 1 | -1,
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
        writeHierophantSupplyDragData(event.dataTransfer, classId);
        supply.onBegin(classId);
      }}
      onDragEnd={() => {
        supply.onCancel();
        window.setTimeout(() => {
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
    supply.onDeliver(temple, zone, readHierophantSupplyDragClass(dataTransfer ?? null));
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
  before,
  after,
  delta,
  templeId,
  templeName,
  onAdjust,
}: {
  readonly label: "Abundance" | "Conviction";
  readonly before: number;
  readonly after: number | null;
  readonly delta: number | null;
  readonly templeId: string;
  readonly templeName: string;
  readonly onAdjust: (resource: "abundance" | "conviction", current: number, delta: 1 | -1) => void;
}) {
  const resource = label === "Abundance" ? "abundance" : "conviction";
  const forecast = after !== null && delta !== null && delta !== 0
    ? `${delta > 0 ? "+" : ""}${delta} → ${after}`
    : null;
  const restLabel = `${label} ${before}`;
  return (
    <div
      data-resource-counter={resource}
      data-temple-resource={templeId}
      className={`group/resource relative flex min-w-[4.75rem] flex-col items-center rounded-lg border-2 px-2 py-1 shadow-sm ${
        label === "Abundance"
          ? "border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950/70 dark:text-amber-50"
          : "border-indigo-700 bg-indigo-100 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-50"
      }`}
      aria-label={forecast === null ? restLabel : `${restLabel}, Next Visions ${forecast}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-5 w-5 rounded border border-stone-600/40 text-xs font-bold opacity-0 transition-opacity group-hover/resource:opacity-100 group-focus-within/resource:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-0"
          aria-label={`Decrease ${templeName} ${label}`}
          disabled={before <= 0}
          onClick={(event) => {
            event.stopPropagation();
            if (before <= 0) return;
            onAdjust(resource, before, -1);
          }}
        >
          −
        </button>
        <span className="text-xl font-bold tabular-nums leading-none">{before}</span>
        <button
          type="button"
          className="h-5 w-5 rounded border border-stone-600/40 text-xs font-bold opacity-0 transition-opacity group-hover/resource:opacity-100 group-focus-within/resource:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          aria-label={`Increase ${templeName} ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onAdjust(resource, before, 1);
          }}
        >
          +
        </button>
      </div>
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
  onAdjust,
}: {
  readonly woe: number;
  readonly denizenId: string;
  readonly onAdjust: (currentWoe: number, delta: 1 | -1) => void;
}) {
  const visualRange = 5;
  const filled = Math.min(woe, visualRange);
  const addIndex = woe < visualRange ? filled : null;
  const removeIndex = filled > 0 ? filled - 1 : null;
  return (
    <div className="inline-flex items-center gap-1.5" data-woe-pips={denizenId} aria-label={`Woe ${woe}`}>
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: visualRange }, (_, index) => {
          const filledPip = index < filled;
          const isAdd = addIndex !== null && index === addIndex;
          const isRemove = removeIndex !== null && index === removeIndex;
          const pipClass = `inline-flex h-3 w-3 items-center justify-center rounded-full border border-stone-700 dark:border-stone-200 ${
            filledPip ? "bg-stone-800 dark:bg-stone-100" : "bg-transparent"
          }`;
          if (isAdd || isRemove) {
            const delta: 1 | -1 = isAdd ? 1 : -1;
            const next = woe + delta;
            return (
              <button
                key={index}
                type="button"
                data-woe-pip={isAdd ? "add" : "remove"}
                className={`${pipClass} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700`}
                aria-label={isAdd ? `Increase Woe to ${next}` : `Decrease Woe to ${next}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onAdjust(woe, delta);
                }}
                onKeyDown={(event) => activate(event, () => onAdjust(woe, delta))}
              />
            );
          }
          return <span key={index} className={pipClass} aria-hidden="true" />;
        })}
      </span>
      <span className="text-xs tabular-nums font-medium">Woe {woe}</span>
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
  onAdjustWoe,
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
  readonly onAdjustWoe: (currentWoe: number, delta: 1 | -1) => void;
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
    klass,
    givenName,
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
  const primaryLabel = orderSelectable && orderIndex === null
    ? `Add ${klass}${givenName === null ? "" : ` ${givenName}`} to Visions order`
    : accessible;
  return (
    <li>
      <div
        data-supplicant-piece={person.denizenId}
        className={`rounded-md border px-2 py-1 shadow-sm ${
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <HierophantClassBadge classId={person.classId} label={klass} />
              <span className="text-sm font-medium leading-tight">{klass}</span>
            </div>
            {orderIndex !== null && (
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-800 px-1 text-[11px] font-bold text-amber-50 dark:bg-amber-200 dark:text-amber-950"
                aria-label={`Visions order ${orderIndex}`}
              >
                {orderIndex}
              </span>
            )}
          </div>
          {givenName !== null && (
            <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-slate-300">{givenName}</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {support !== null && (
              <span
                data-support-badge={preview?.support}
                className={`rounded-sm border px-1 uppercase tracking-wide text-[10px] font-semibold ${
                  support === "Supported"
                    ? "border-emerald-800/40 bg-emerald-50 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-950/40 dark:text-emerald-50"
                    : "border-stone-500/50 bg-stone-100 text-stone-800 dark:border-stone-400/40 dark:bg-stone-900 dark:text-stone-100"
                }`}
              >
                {support}
              </span>
            )}
          </div>
        </button>
        <div className="mt-1">
          <WoePips woe={person.woe} denizenId={person.denizenId} onAdjust={onAdjustWoe} />
        </div>
        {projectedTo !== null && projectedTo !== person.woe && (
          <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300" data-woe-forecast={person.denizenId} aria-label={`Next Visions: Woe ${person.woe} → ${projectedTo}`}>
            Next Visions: {person.woe} → {projectedTo}
          </p>
        )}
        {preview?.departure.kind === "benefaction" && (
          <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300">
            Next Visions: Benefaction
          </p>
        )}
        {preview?.departure.kind === "cult_threshold" && person.woe < 5 && (
          <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300">
            Next Visions: Cult departure due
          </p>
        )}
        {demand !== null && (
          <p className="mt-0.5 text-[11px] text-slate-700 dark:text-slate-200">{demand}</p>
        )}
        {threshold !== null && (
          <p
            className="mt-0.5 text-[11px] font-semibold text-rose-900 dark:text-rose-100"
            data-woe-threshold={person.woe === 0 ? "benefaction" : "cult"}
          >
            {threshold}
          </p>
        )}
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
            onAdjust={(resource, current, delta) => pieces.onAdjustResource(temple.templeId, name, resource, current, delta)}
          />
          <ResourceCounter
            label="Conviction"
            before={temple.conviction}
            after={templePreview?.conviction.after ?? null}
            delta={templePreview?.conviction.delta ?? null}
            templeId={temple.templeId}
            templeName={name}
            onAdjust={(resource, current, delta) => pieces.onAdjustResource(temple.templeId, name, resource, current, delta)}
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
                  onAdjustWoe={(currentWoe, delta) => pieces.onAdjustWoe(person.denizenId, currentWoe, delta)}
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
            {prophets.map((prophet: HierophantProphet) => (
              <li key={prophet.denizenId}>
                <button
                  type="button"
                  className="w-full text-left rounded-lg border-2 border-violet-600 bg-violet-50 px-2 py-1.5 shadow-sm cursor-pointer dark:border-violet-400 dark:bg-violet-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                  aria-label={`${denizenLabel(denizens, prophet.denizenId)}, Prophet`}
                  onClick={onSelect}
                  onKeyDown={(event) => activate(event, onSelect)}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">Prophet</div>
                  <div className="font-medium">{denizenLabel(denizens, prophet.denizenId)}</div>
                  <div className="text-xs">{prophetStatusText(denizens, prophet.denizenId)} · Temple host</div>
                </button>
              </li>
            ))}
        </ul>
      </section>
      )}
      {researchers.length > 0 && (
      <section aria-label="Sorcerer Researcher" className="text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Researcher</h4>
        <ul className="flex flex-col gap-1 mt-1">
            {researchers.map((researcher) => (
              <li
                key={researcher.denizenId}
                className="rounded-lg border-2 border-dashed border-slate-500 bg-slate-50 px-2 py-1.5 dark:border-slate-400 dark:bg-slate-900"
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Researcher</div>
                <div className="font-medium">{researcher.name}</div>
                <div className="text-xs">
                  {researcherOperationalLabel(researcher.operationalThisMonth)}
                  <span className="sr-only">
                    {researcher.operationalThisMonth ? " operational" : " not operational this month"}
                  </span>
                </div>
              </li>
            ))}
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
