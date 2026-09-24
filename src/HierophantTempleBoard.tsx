import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  powerfulStatusLabel,
  type DenizenId,
  type HierophantProphet,
  type HierophantState,
  type HierophantSupplicant,
  type HierophantSupplicantHost,
  type HierophantTemple,
  type HierophantTempleId,
  type HierophantTempleStatus,
  type HierophantVisionsChoices,
  type HierophantVisionsPlan,
  type HierophantVisionsRequiredChoice,
  type HierophantVisionsResource,
  type HierophantVisionsSupplicantPreview,
  type HierophantVisionsTemplePreview,
  type OrdinaryTempleDoctrineState,
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
  baseBenefactionReference,
  supplicantBenefactionValue,
  supplicantClassCostValue,
  blasphemyText,
  doctrineText,
  hierophantDoctrineChoices,
  pairedOrdinaryDoctrineState,
} from "./hierophant-view-model";
import { formatVisionsPreviewChoiceSummary } from "./hierophant-visions-preview";
import HierophantClassBadge from "./hierophant-class-badge";
import type { HierophantResourceKind, HierophantResourcePoolView } from "./hierophant-resource-intent";
import {
  hestarDestinationResource,
  hierophantHestarConversionAriaLabel,
  hierophantHestarConversionVisibleLabel,
} from "./hierophant-hestar-conversion";
import {
  HIEROPHANT_SUPPLY_CLASS_IDS,
  beginHierophantSupplyDrag,
  endHierophantSupplyDrag,
  hierophantSupplyDragIsActive,
  liveHierophantSupplyClass,
  readHierophantSupplyDragClass,
  resolveHierophantSupplyDestination,
  writeHierophantSupplyDragData,
  type HierophantPendingSupplyCreate,
  type HierophantSupplyClassId,
  type HierophantSupplyZone,
} from "./hierophant-supply";
import {
  beginHierophantSupplicantHostDrag,
  endHierophantSupplicantHostDrag,
  hierophantSupplicantHostDragIsActive,
  liveHierophantSupplicantHostDenizenId,
  readHierophantSupplicantHostDragDenizenId,
  writeHierophantSupplicantHostDragData,
} from "./hierophant-supplicant-move";

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
  readonly pendingCreates: readonly HierophantPendingSupplyCreate[];
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

export interface HierophantHostMoveBoardInteraction {
  readonly draggingDenizenId: string | null;
  readonly hoverKey: string | null;
  readonly notice: { readonly denizenId: string; readonly reason: string } | null;
  readonly peekDraggingDenizenId: () => string | null;
  readonly onBegin: (denizenId: string) => void;
  readonly onHover: (key: string | null) => void;
  readonly onDeliver: (
    temple: HierophantTemple,
    zone: HierophantSupplyZone,
    denizenIdFromDrag?: string | null,
  ) => void;
  readonly onCancel: () => void;
}

export interface HierophantPieceControls {
  readonly selectedSupplicantId: string | null;
  readonly onSelectSupplicant: (denizenId: string) => void;
  readonly onAdjustWoe: (denizenId: string, delta: 1 | -1) => void;
  readonly onSetWoe: (denizenId: string, nextWoe: number) => void;
  readonly onAdjustResource: (
    templeId: string,
    resource: HierophantResourceKind,
    delta: 1 | -1,
  ) => void;
  readonly onConvertHestarResource: (
    templeId: string,
    sourceResource: HierophantResourceKind,
  ) => void;
  readonly resourceView: (
    templeId: string,
    resource: HierophantResourceKind,
    authoritative: number,
  ) => HierophantResourcePoolView;
  readonly benefactionPendingDenizenIds: ReadonlySet<string>;
  readonly onBenefactionDepart: (denizenId: string) => void;
  readonly timeScheduledDenizenIds: ReadonlySet<string>;
  readonly woeView: (
    denizenId: string,
    authoritativeWoe: number,
  ) => {
    readonly displayed: number;
    readonly pending: boolean;
    readonly authoritative: number;
    readonly error: string | null;
  };
  readonly hostView: (
    denizenId: string,
    authoritativeHost: HierophantSupplicantHost,
  ) => {
    readonly displayed: HierophantSupplicantHost;
    readonly pending: boolean;
  };
  readonly onRecordDoctrine: (templeId: string, next: OrdinaryTempleDoctrineState) => void;
  readonly onRecordTempleStatus: (templeId: string, next: HierophantTempleStatus) => void;
  readonly onRecordProphetStatus: (denizenId: string, next: "reliable" | "disruptive") => void;
  readonly onToggleHoliday: (templeId: string, marked: boolean) => void;
  readonly doctrinePendingTempleIds: ReadonlySet<string>;
  readonly statusPendingTempleIds: ReadonlySet<string>;
  readonly prophetPendingDenizenIds: ReadonlySet<string>;
  readonly holidayView: (
    templeId: string,
    authoritativeMarked: boolean,
  ) => {
    readonly marked: boolean;
    readonly pending: boolean;
  };
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
        endHierophantSupplicantHostDrag();
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
  hostMove,
  children,
  className = "",
}: {
  readonly temple: HierophantTemple;
  readonly zone: HierophantSupplyZone;
  readonly supply: HierophantSupplyBoardInteraction | null;
  readonly hostMove: HierophantHostMoveBoardInteraction | null;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const dest = resolveHierophantSupplyDestination(temple, zone);
  const key = `${temple.templeId}:${zone}`;
  const renderedSupplyActive = supply !== null && supply.activeClassId !== null;
  const renderedHostActive = hostMove !== null && hostMove.draggingDenizenId !== null;
  const hoveringSupply = renderedSupplyActive && supply.hoverKey === key;
  const hoveringHost = renderedHostActive && hostMove.hoverKey === key;
  const highlight = hoveringSupply && dest !== null ? dest.highlight : hoveringHost ? "recommended" : null;
  const idleHint = renderedSupplyActive && dest !== null && dest.highlight === "recommended" && !hoveringSupply
    ? "ring-1 ring-amber-300/80 dark:ring-amber-700/80"
    : renderedSupplyActive && dest !== null && dest.highlight === "alternative" && !hoveringSupply
      ? "ring-1 ring-amber-200/70 dark:ring-amber-800/70"
      : renderedHostActive && !hoveringHost
        ? "ring-1 ring-amber-300/80 dark:ring-amber-700/80"
        : "";
  function supplyIsLive(dataTransfer: DataTransfer | null | undefined): boolean {
    if (supply === null) return false;
    return hierophantSupplyDragIsActive(dataTransfer, supply.peekActiveClassId, supply.activeClassId);
  }
  function hostMoveIsLive(dataTransfer: DataTransfer | null | undefined): boolean {
    if (hostMove === null) return false;
    return hierophantSupplicantHostDragIsActive(
      dataTransfer,
      hostMove.peekDraggingDenizenId,
      hostMove.draggingDenizenId,
    );
  }
  function deliverSupply(dataTransfer?: DataTransfer | null): void {
    if (supply === null) return;
    if (!supplyIsLive(dataTransfer ?? null)) return;
    supply.onDeliver(
      temple,
      zone,
      readHierophantSupplyDragClass(dataTransfer ?? null) ?? liveHierophantSupplyClass(),
    );
  }
  function deliverHost(dataTransfer?: DataTransfer | null): void {
    if (hostMove === null) return;
    if (!hostMoveIsLive(dataTransfer ?? null)) return;
    const denizenId = readHierophantSupplicantHostDragDenizenId(dataTransfer ?? null)
      ?? liveHierophantSupplicantHostDenizenId();
    endHierophantSupplicantHostDrag();
    hostMove.onDeliver(temple, zone, denizenId);
  }
  return (
    <div
      data-supply-drop={zone}
      data-host-drop={zone}
      className={`${className} ${supplyHighlightClass(highlight)} ${idleHint} rounded-md transition-shadow`}
      onDragEnter={(event) => {
        if (hostMoveIsLive(event.dataTransfer)) {
          event.preventDefault();
          hostMove?.onHover(key);
          return;
        }
        if (supply === null || !supplyIsLive(event.dataTransfer)) return;
        event.preventDefault();
        supply.onHover(key);
      }}
      onDragOver={(event) => {
        if (hostMoveIsLive(event.dataTransfer)) {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          hostMove?.onHover(key);
          return;
        }
        if (supply === null || !supplyIsLive(event.dataTransfer)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        supply.onHover(key);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        if (hostMove?.hoverKey === key) hostMove.onHover(null);
        if (supply?.hoverKey === key) supply.onHover(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (hostMoveIsLive(event.dataTransfer)) {
          deliverHost(event.dataTransfer);
          return;
        }
        if (supplyIsLive(event.dataTransfer)) {
          deliverSupply(event.dataTransfer);
        }
      }}
      onClick={(event) => {
        if (renderedSupplyActive && dest !== null) {
          event.stopPropagation();
          deliverSupply();
          return;
        }
        if (renderedHostActive) {
          event.stopPropagation();
          deliverHost();
        }
      }}
    >
      {children}
    </div>
  );
}

function templePhysicalStatus(temple: HierophantTemple): { readonly label: string; readonly kind: "active" | "collapsed" } {
  if (temple.status === "collapsed") return { label: "Collapsed", kind: "collapsed" };
  return { label: "Active", kind: "active" };
}

function doctrineStateLabel(temple: HierophantTemple, campaignDoctrines: HierophantState["campaignDoctrines"]): string {
  if (temple.kind === "hestar") return "No Doctrine — supports all Classes";
  if (temple.doctrine.kind === "unset") return "Doctrine unset";
  if (temple.doctrine.kind === "blasphemy") return `Blasphemous: ${templeDoctrineSummary(temple, campaignDoctrines)}`;
  return templeDoctrineSummary(temple, campaignDoctrines);
}

function pendingCreatesForZone(
  pending: readonly HierophantPendingSupplyCreate[] | undefined,
  templeId: string,
  groupKey: string,
): readonly HierophantPendingSupplyCreate[] {
  if (pending === undefined) return [];
  return pending.filter((item) => {
    if (item.templeId !== templeId) return false;
    if (groupKey === "courtyard") return item.area === "courtyard";
    if (groupKey === "agiary") return item.area === "agiary";
    if (groupKey === "hestar") return item.area === null;
    return false;
  });
}

function PendingSupplyGhost({ item }: { readonly item: HierophantPendingSupplyCreate }) {
  return (
    <li data-supply-create-pending={item.denizenId} aria-busy="true">
      <div className="rounded-md border border-dashed border-amber-700/40 bg-amber-50/70 px-2 py-1 text-[11px] font-medium text-amber-950 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-50">
        {`Adding ${item.classLabel}…`}
      </div>
    </li>
  );
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
  conversion,
}: {
  readonly label: "Abundance" | "Conviction";
  readonly before: number;
  readonly after: number | null;
  readonly delta: number | null;
  readonly templeId: string;
  readonly templeName: string;
  readonly view: HierophantResourcePoolView;
  readonly onAdjust: (resource: HierophantResourceKind, delta: 1 | -1) => void;
  readonly conversion: {
    readonly enabled: boolean;
    readonly onConvert: () => void;
  } | null;
}) {
  const resource: HierophantResourceKind = label === "Abundance" ? "abundance" : "conviction";
  const shown = view.displayed;
  const forecast = after !== null && delta !== null && delta !== 0
    ? `${delta > 0 ? "+" : ""}${delta} → ${after}`
    : null;
  const restLabel = `${label} ${shown}`;
  const [revealed, setRevealed] = useState(false);
  const controlClass = `h-5 w-5 rounded border border-stone-600/40 text-xs font-bold transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
    revealed ? "opacity-100" : "opacity-0"
  }`;
  const convertAvailable = shown > 0;
  const convertDisabled = conversion !== null && !conversion.enabled;
  const convertAria = conversion === null
    ? null
    : hierophantHestarConversionAriaLabel({
      templeName,
      sourceResource: resource,
      available: convertAvailable && !convertDisabled ? shown : 0,
    });
  return (
    <div
      data-resource-counter={resource}
      data-temple-resource={templeId}
      data-resource-controls={revealed ? "revealed" : "hidden"}
      data-resource-pending={view.pending ? "true" : "false"}
      aria-busy={view.pending}
      className={`relative flex min-w-[3.75rem] flex-col items-center rounded-md border px-1.5 py-0.5 shadow-sm ${
        view.pending ? "ring-1 ring-amber-700/40 dark:ring-amber-300/30" : ""
      } ${
        label === "Abundance"
          ? "border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950/70 dark:text-amber-50"
          : "border-indigo-700 bg-indigo-100 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-50"
      }`}
      aria-label={forecast === null ? restLabel : `${restLabel}, Next Visions ${forecast}`}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocusCapture={() => setRevealed(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setRevealed(false);
        }
      }}
    >
      <div className="flex w-full items-start justify-between gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">{label}</span>
        {conversion !== null && convertAria !== null && (
          <button
            type="button"
            data-hestar-convert={resource}
            data-hestar-convert-target={hestarDestinationResource(resource)}
            data-hestar-convert-placement="inside"
            className={`absolute right-0.5 top-0.5 z-10 whitespace-nowrap rounded px-0.5 py-px text-[9px] font-bold leading-none tracking-tight text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-100 ${
              revealed ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label={convertAria}
            title={convertAria}
            disabled={!convertAvailable || convertDisabled}
            onMouseDown={stopNestedControlPointer}
            onPointerDown={stopNestedControlPointer}
            onClick={(event) => {
              event.stopPropagation();
              if (!convertAvailable || convertDisabled) return;
              conversion.onConvert();
            }}
          >
            {hierophantHestarConversionVisibleLabel(resource)}
          </button>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={`${controlClass} disabled:pointer-events-none`}
          aria-label={`Decrease ${templeName} ${label}`}
          disabled={shown <= 0}
          onClick={(event) => {
            event.stopPropagation();
            if (shown <= 0) return;
            onAdjust(resource, -1);
          }}
        >
          −
        </button>
        <span className="relative inline-flex items-center justify-center">
          <span data-resource-value="" className="text-lg font-bold tabular-nums leading-none">{shown}</span>
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
          onClick={(event) => {
            event.stopPropagation();
            onAdjust(resource, 1);
          }}
        >
          +
        </button>
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

function stopNestedControlPointer(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

function useDismissibleOpen(
  open: boolean,
  onClose: () => void,
  rootRef: { readonly current: HTMLElement | null },
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    }
    function onPointer(event: MouseEvent): void {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, rootRef]);
}

function WoePips({
  displayWoe,
  authoritativeWoe,
  pending,
  denizenId,
  subjectLabel,
  onSet,
  onStep,
}: {
  readonly displayWoe: number;
  readonly authoritativeWoe: number;
  readonly pending: boolean;
  readonly denizenId: string;
  readonly subjectLabel: string;
  readonly onSet: (nextWoe: number) => void;
  readonly onStep: (delta: 1 | -1) => void;
}) {
  const visualRange = 5;
  const overflow = displayWoe > visualRange;
  const filledCount = overflow ? visualRange - 1 : Math.min(displayWoe, visualRange);
  const [revealed, setRevealed] = useState(false);
  const stepsVisible = revealed;
  const stepShellClass = `inline-flex items-center gap-0.5 transition-[opacity,visibility] ${
    stepsVisible ? "visible opacity-100" : "invisible opacity-0"
  } group-focus-within:visible group-focus-within:opacity-100`;
  const stepButtonClass =
    "h-5 w-5 rounded border border-stone-600/50 text-[11px] font-bold leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-40";
  const pipClass = (filledPip: boolean) =>
    `inline-flex h-3 w-3 items-center justify-center rounded-full border border-stone-700 dark:border-stone-200 ${
      filledPip ? "bg-stone-800 dark:bg-stone-100" : "bg-transparent"
    } ${pending ? "ring-1 ring-amber-700/50 dark:ring-amber-300/40" : ""}`;
  const ariaLabel = pending
    ? `Woe ${authoritativeWoe}, pending request ${displayWoe}`
    : `Current Woe ${authoritativeWoe}`;
  return (
    <div
      data-woe-pips={denizenId}
      data-woe-pending={pending ? "true" : "false"}
      className="group inline-flex min-w-0 items-center justify-center gap-0.5"
      aria-label={ariaLabel}
      aria-busy={pending}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocusCapture={() => setRevealed(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setRevealed(false);
        }
      }}
    >
      <div className={stepShellClass} data-woe-steps="">
        <button
          type="button"
          data-woe-step="decrement"
          aria-label={`Decrease ${subjectLabel} Woe by 1`}
          disabled={displayWoe <= 0}
          className={stepButtonClass}
          onMouseDown={stopNestedControlPointer}
          onPointerDown={stopNestedControlPointer}
          onClick={(event) => {
            event.stopPropagation();
            if (displayWoe <= 0) return;
            onStep(-1);
          }}
        >
          −
        </button>
      </div>
      <span className="inline-flex items-center gap-0.5" data-woe-pip-row="">
        {Array.from({ length: visualRange }, (_, index) => {
          const target = index + 1;
          if (overflow && index === visualRange - 1) {
            return (
              <button
                key="overflow"
                type="button"
                data-woe-overflow=""
                data-woe-target={visualRange}
              aria-label={`Set ${subjectLabel} Woe to ${visualRange} (current ${displayWoe})`}
              className="inline-flex h-3 min-w-[1.1rem] items-center justify-center rounded-sm border border-stone-700 bg-stone-800 px-0.5 text-[9px] font-bold tabular-nums text-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:border-stone-200 dark:bg-stone-100 dark:text-stone-900"
              onMouseDown={stopNestedControlPointer}
              onPointerDown={stopNestedControlPointer}
              onClick={(event) => {
                event.stopPropagation();
                onSet(visualRange);
              }}
            >
              {displayWoe}
            </button>
            );
          }
          const filledPip = index < filledCount;
          return (
            <button
              key={target}
              type="button"
              data-woe-target={target}
              data-woe-filled={filledPip ? "true" : "false"}
              aria-label={`Set ${subjectLabel} Woe to ${target}`}
              aria-pressed={!overflow && displayWoe === target}
              className={`${pipClass(filledPip)} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700`}
              onMouseDown={stopNestedControlPointer}
              onPointerDown={stopNestedControlPointer}
              onClick={(event) => {
                event.stopPropagation();
                onSet(target);
              }}
            />
          );
        })}
      </span>
      <div className={stepShellClass}>
        <button
          type="button"
          data-woe-step="increment"
          aria-label={`Increase ${subjectLabel} Woe by 1`}
          className={stepButtonClass}
          onMouseDown={stopNestedControlPointer}
          onPointerDown={stopNestedControlPointer}
          onClick={(event) => {
            event.stopPropagation();
            onStep(1);
          }}
        >
          +
        </button>
      </div>
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
  onAdjustWoe,
  onArtisanPayment,
  onHestarFallback,
  onOrderSelect,
  hostMove,
  timeScheduled,
  hostPending,
  benefactionPending,
  onBenefactionDepart,
  woeView,
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
  readonly onAdjustWoe: (delta: 1 | -1) => void;
  readonly onArtisanPayment: (resource: HierophantVisionsResource) => void;
  readonly onHestarFallback: (useHestar: boolean) => void;
  readonly onOrderSelect: () => void;
  readonly hostMove: HierophantHostMoveBoardInteraction | null;
  readonly timeScheduled: boolean;
  readonly hostPending: boolean;
  readonly benefactionPending: boolean;
  readonly onBenefactionDepart: () => void;
  readonly woeView: {
    readonly displayed: number;
    readonly pending: boolean;
    readonly authoritative: number;
    readonly error: string | null;
  };
}) {
  const storedName = denizenLabel(denizens, person.denizenId);
  const klass = classLabel(person.classId, campaignClasses);
  const givenName = supplicantGivenName(storedName, klass);
  const pieceName = givenName;
  const support = preview === undefined ? null : preview.support === "supported" ? "Supported" : preview.support === "unsupported" ? "Unsupported" : null;
  const classCostValue = supplicantClassCostValue(person.classId);
  const benefactionValue = supplicantBenefactionValue(person.classId);
  const threshold = woeThresholdCueLabel(person.woe);
  const danger = person.woe >= 5 || preview?.blockerKind !== null;
  const accessible = [
    "Supplicant",
    pieceName,
    klass,
    `Woe ${person.woe}`,
    support,
    classCostValue === null ? null : `Cost ${classCostValue}`,
    benefactionValue === null ? null : `Benefaction ${benefactionValue}`,
    threshold,
    orderIndex === null ? null : `Visions order ${orderIndex}`,
  ].filter((part): part is string => part !== null && part !== "").join(", ");
  const primaryAction = () => {
    onSelect();
    if (orderSelectable && orderIndex === null) onOrderSelect();
  };
  const subjectLabel = pieceName ?? klass;
  const benefactionEligible = person.woe === 0
    && person.host.kind === "temple"
    && baseBenefactionReference(person.classId).kind !== "not_determined";
  const primaryLabel = orderSelectable && orderIndex === null
    ? `Add ${klass}${givenName === null ? "" : ` ${givenName}`} to Visions order`
    : accessible;
  const ignoreClickRef = useRef(false);
  return (
    <li>
      <div
        data-supplicant-piece={person.denizenId}
        data-host-draggable="true"
        data-host-pending={hostPending ? "true" : "false"}
        data-steer-time={timeScheduled ? "pending" : "none"}
        draggable
        className={`relative rounded-md border px-2 py-1 shadow-sm cursor-grab active:cursor-grabbing ${
          danger
            ? "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40"
            : "border-amber-800/40 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-950/30"
        } ${selected ? "ring-1 ring-amber-700 dark:ring-amber-300" : ""} ${
          hostPending ? "ring-1 ring-amber-700/40 dark:ring-amber-300/30" : ""
        }`}
        onDragStart={(event: DragEvent<HTMLDivElement>) => {
          ignoreClickRef.current = true;
          endHierophantSupplyDrag();
          beginHierophantSupplicantHostDrag(person.denizenId);
          writeHierophantSupplicantHostDragData(event.dataTransfer, person.denizenId);
          hostMove?.onBegin(person.denizenId);
        }}
        onDragEnd={() => {
          window.setTimeout(() => {
            endHierophantSupplicantHostDrag();
            hostMove?.onCancel();
            ignoreClickRef.current = false;
          }, 0);
        }}
      >
        <button
          type="button"
          className="w-full text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          aria-label={primaryLabel}
          aria-pressed={selected}
          onClick={() => {
            if (ignoreClickRef.current) {
              ignoreClickRef.current = false;
              return;
            }
            primaryAction();
          }}
          onKeyDown={(event) => activate(event, primaryAction)}
        >
          <PersonPieceHeader
            type="Supplicant"
            name={pieceName}
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
        <div data-supplicant-identity="" className="mt-0.5 flex min-w-0 items-center justify-between gap-1">
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
          {timeScheduled && (
            <span
              data-steer-time-badge=""
              className="shrink-0 rounded border border-amber-700/50 bg-amber-100/90 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-400/60 dark:bg-amber-900/50 dark:text-amber-50"
              aria-label={`Time scheduled on ${subjectLabel}`}
            >
              Time
            </span>
          )}
        </div>
        <div
          data-supplicant-stable=""
          className="mt-0.5 grid grid-cols-1 gap-x-3 gap-y-1 min-[18rem]:grid-cols-3"
        >
          {classCostValue !== null && (
            <div data-supplicant-cost="" className="min-w-0">
              <p className="font-semibold uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">Cost</p>
              <p data-supplicant-cost-value="" className="text-[11px] font-medium leading-snug text-stone-900 dark:text-stone-100">
                {classCostValue}
              </p>
            </div>
          )}
          <div data-supplicant-woe-row="" data-woe-centered="" className="flex min-w-0 flex-col items-center text-center">
            <p
              data-woe-label=""
              className="w-full text-center font-semibold uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400"
            >
              Woe
            </p>
            <div data-supplicant-current-woe="" className="flex w-full justify-center">
              <WoePips
                displayWoe={woeView.displayed}
                authoritativeWoe={woeView.authoritative}
                pending={woeView.pending}
                denizenId={person.denizenId}
                subjectLabel={subjectLabel}
                onSet={onSetWoe}
                onStep={onAdjustWoe}
              />
            </div>
            {woeView.error !== null && (
              <p data-woe-error="" className="text-[10px] font-medium text-rose-800 dark:text-rose-200">
                {woeView.error}
              </p>
            )}
          </div>
          {benefactionValue !== null && (
            <div data-supplicant-benefaction="" className="min-w-0 min-[18rem]:text-right">
              <p className="font-semibold uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">Benefaction</p>
              <p data-supplicant-benefaction-value="" className="text-[11px] font-medium leading-snug text-stone-900 dark:text-stone-100">
                {benefactionValue}
              </p>
            </div>
          )}
        </div>
        {threshold !== null && (
          <p
            className="mt-0.5 text-[11px] font-semibold text-rose-900 dark:text-rose-100"
            data-woe-threshold={person.woe === 0 ? "benefaction" : "cult"}
          >
            {threshold}
          </p>
        )}
        {benefactionEligible && (
          <div className="mt-1" data-piece-benefaction="">
            <button
              type="button"
              className="w-full rounded-md border border-emerald-800/50 bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-200/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/40 dark:bg-emerald-950/50 dark:text-emerald-50 dark:hover:bg-emerald-900/60"
              aria-label={`Benefaction & Depart ${subjectLabel}`}
              aria-busy={benefactionPending}
              disabled={benefactionPending}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (benefactionPending) return;
                onBenefactionDepart();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                }
                activate(event, () => {
                  if (benefactionPending) return;
                  onBenefactionDepart();
                });
              }}
            >
              {benefactionPending ? "Benefaction & Depart…" : "Benefaction & Depart"}
            </button>
          </div>
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

function TempleStatusControl({
  temple,
  pending,
  onRecord,
}: {
  readonly temple: HierophantTemple;
  readonly pending: boolean;
  readonly onRecord: (next: HierophantTempleStatus) => void;
}) {
  const status = templePhysicalStatus(temple);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismissibleOpen(menuOpen, () => setMenuOpen(false), rootRef);
  return (
    <div ref={rootRef} className="relative" data-temple-status-control="">
      <button
        type="button"
        data-temple-status={status.kind}
        data-temple-status-pending={pending ? "true" : "false"}
        aria-busy={pending}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Temple status ${status.label}`}
        className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
          status.kind === "collapsed"
            ? "bg-stone-800 text-stone-100"
            : "bg-emerald-800 text-emerald-50"
        } ${pending ? "ring-1 ring-amber-700/40 dark:ring-amber-300/30" : ""}`}
        onMouseDown={stopNestedControlPointer}
        onPointerDown={stopNestedControlPointer}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
      >
        {status.label}
        <span aria-hidden="true">▾</span>
      </button>
      {menuOpen && (
        <div
          role="menu"
          data-temple-status-menu=""
          data-board-overlay=""
          className="absolute right-0 z-40 mt-1 min-w-[7.5rem] rounded-md border border-stone-500/40 bg-white p-1 shadow-lg dark:border-stone-300/30 dark:bg-slate-900"
        >
          {(["active", "collapsed"] as const).map((choice) => {
            const selected = status.kind === choice;
            const label = choice === "collapsed" ? "Collapsed" : "Active";
            return (
              <button
                key={choice}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                data-temple-status-choice={choice}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/60"
                onMouseDown={stopNestedControlPointer}
                onPointerDown={stopNestedControlPointer}
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  if (pending || selected) return;
                  onRecord(choice);
                }}
              >
                <span className="inline-block w-3 text-[10px]" aria-hidden="true">{selected ? "✓" : ""}</span>
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DoctrineSideControl({
  currentKind,
  pairPreviewLabel,
  pairPreviewText,
  pending,
  onFlip,
}: {
  readonly currentKind: "doctrine" | "blasphemy";
  readonly pairPreviewLabel: string;
  readonly pairPreviewText: string;
  readonly pending: boolean;
  readonly onFlip: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const orthodox = currentKind === "doctrine";
  return (
    <div
      className="relative"
      onMouseEnter={() => setPreviewOpen(true)}
      onMouseLeave={() => setPreviewOpen(false)}
      onFocusCapture={() => setPreviewOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPreviewOpen(false);
        }
      }}
    >
      <button
        type="button"
        data-doctrine-side={orthodox ? "orthodox" : "blasphemous"}
        data-doctrine-pair-action=""
        aria-busy={pending}
        aria-label={orthodox ? "Mark this Doctrine Blasphemous" : "Restore paired Orthodox Doctrine"}
        className={`inline-flex items-center gap-0.5 rounded border px-1 py-px text-[9px] font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
          orthodox
            ? "border-emerald-700/50 text-emerald-950 dark:text-emerald-50"
            : "border-rose-700/50 text-rose-950 dark:text-rose-50"
        }`}
        onMouseDown={stopNestedControlPointer}
        onPointerDown={stopNestedControlPointer}
        onClick={(event) => {
          event.stopPropagation();
          onFlip();
        }}
      >
        {orthodox ? "Orthodox" : "Blasphemous"}
        <span aria-hidden="true">↔</span>
      </button>
      {previewOpen && (
        <div
          data-doctrine-pair-preview=""
          role="tooltip"
          className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-stone-500/40 bg-white p-1.5 text-left text-[11px] leading-snug shadow-lg dark:border-stone-300/30 dark:bg-slate-900"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{pairPreviewLabel}</p>
          <p>{pairPreviewText}</p>
        </div>
      )}
    </div>
  );
}

function OrdinaryDoctrineObject({
  temple,
  hierophant,
  denizens,
  pending,
  onRecord,
}: {
  readonly temple: Extract<HierophantTemple, { kind: "ordinary" }>;
  readonly hierophant: HierophantState;
  readonly denizens: readonly NamedDenizen[];
  readonly pending: boolean;
  readonly onRecord: (next: OrdinaryTempleDoctrineState) => void;
}) {
  const [controlsRevealed, setControlsRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismissibleOpen(menuOpen, () => setMenuOpen(false), rootRef);
  const pair = pairedOrdinaryDoctrineState(temple.doctrine, hierophant.campaignDoctrines);
  const choices = hierophantDoctrineChoices(hierophant.campaignDoctrines);
  const reliableProphet = hostedProphets(hierophant.prophets, { kind: "temple", templeId: temple.templeId })
    .some((prophet) => {
      const status = denizens.find((denizen) => denizen.denizenId === prophet.denizenId)?.powerfulProfile?.status;
      return status?.kind === "standard" && status.value === "reliable";
    });
  const pairPreview = pair === null
    ? null
    : pair.kind === "blasphemy"
      ? { label: "Blasphemy", text: blasphemyText(pair.blasphemyId, hierophant.campaignDoctrines) }
      : pair.kind === "doctrine"
        ? { label: "Doctrine", text: doctrineText(pair.doctrineId, hierophant.campaignDoctrines) }
        : null;
  const chevronVisible = controlsRevealed || menuOpen;
  const supportedClassIds = templeSupportedClassIds(temple, hierophant.campaignDoctrines);
  return (
    <div
      ref={rootRef}
      data-doctrine-object=""
      data-doctrine-pending={pending ? "true" : "false"}
      className="relative rounded-md border border-amber-900/20 bg-amber-50/80 px-2 py-1 dark:border-amber-200/20 dark:bg-amber-950/30"
      onMouseEnter={() => setControlsRevealed(true)}
      onMouseLeave={() => setControlsRevealed(false)}
      onFocusCapture={() => setControlsRevealed(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setControlsRevealed(false);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Doctrine</p>
        <div className="flex items-center gap-1">
          {pair !== null && pairPreview !== null && (temple.doctrine.kind === "doctrine" || temple.doctrine.kind === "blasphemy") && (
            <DoctrineSideControl
              currentKind={temple.doctrine.kind}
              pairPreviewLabel={pairPreview.label}
              pairPreviewText={pairPreview.text}
              pending={pending}
              onFlip={() => onRecord(pair)}
            />
          )}
          <button
            type="button"
            data-doctrine-change=""
            className={`rounded border border-amber-800/40 px-1 py-px text-[10px] font-semibold leading-none text-amber-950 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-amber-50 ${
              chevronVisible ? "opacity-100" : "opacity-0"
            }`}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-label="Change Doctrine"
            aria-busy={pending}
            onMouseDown={stopNestedControlPointer}
            onPointerDown={stopNestedControlPointer}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            ▾
          </button>
        </div>
      </div>
      <p
        data-doctrine-current=""
        className={`text-sm ${temple.doctrine.kind === "unset" ? "italic text-slate-600 dark:text-slate-300" : ""}`}
      >
        {templeDoctrineSummary(temple, hierophant.campaignDoctrines)}
      </p>
      {supportedClassIds.length > 0 ? (
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
      {menuOpen && (
        <div
          role="listbox"
          data-doctrine-menu=""
          data-board-overlay=""
          className="absolute left-0 right-0 z-40 mt-1 max-h-40 overflow-auto rounded border border-amber-800/30 bg-white p-1 text-left shadow-lg dark:border-amber-500/30 dark:bg-slate-900"
        >
          {reliableProphet && (
            <p data-doctrine-prophet-warning="" className="mb-1 px-1.5 py-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
              Reliable Prophet here — changing Doctrine is associated with Prophet disruption, Cult creation, and the former Doctrine becoming Blasphemous.
            </p>
          )}
          {choices.map((choice) => {
            const selected = temple.doctrine.kind === "doctrine" && temple.doctrine.doctrineId === choice.doctrineId;
            return (
              <div key={choice.doctrineId} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-doctrine-choice={choice.doctrineId}
                  className="w-full rounded px-1.5 py-1 text-left text-[11px] font-medium hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-60"
                  disabled={selected}
                  onMouseDown={stopNestedControlPointer}
                  onPointerDown={stopNestedControlPointer}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (selected) return;
                    onRecord({ kind: "doctrine", doctrineId: choice.doctrineId as never });
                    setMenuOpen(false);
                  }}
                >
                  {choice.text}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HolidayChip({
  templeName,
  marked,
  pending,
  onToggle,
}: {
  readonly templeName: string;
  readonly marked: boolean;
  readonly pending: boolean;
  readonly onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      data-holiday-chip=""
      data-holiday-marked={marked ? "true" : "false"}
      data-holiday-pending={pending ? "true" : "false"}
      aria-pressed={marked}
      aria-busy={pending}
      aria-label={
        marked
          ? `Clear Holiday marker from ${templeName}`
          : `Mark ${templeName} as celebrating a Holiday`
      }
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
        marked
          ? "border-2 border-amber-600 bg-amber-200 text-amber-950 dark:border-amber-300 dark:bg-amber-700 dark:text-amber-50"
          : "border border-dashed border-amber-700/50 bg-transparent text-amber-900/80 dark:border-amber-400/50 dark:text-amber-100/80"
      } ${pending ? "ring-1 ring-amber-700/40 dark:ring-amber-300/30" : ""}`}
      onMouseDown={stopNestedControlPointer}
      onPointerDown={stopNestedControlPointer}
      onClick={(event) => {
        event.stopPropagation();
        if (pending) return;
        onToggle(!marked);
      }}
    >
      {marked ? "Holiday" : "+ Holiday"}
    </button>
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
  hostMove,
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
  readonly hostMove: HierophantHostMoveBoardInteraction | null;
  readonly pieces: HierophantPieceControls;
}) {
  const isHestar = temple.kind === "hestar";
  const hosted = hierophant.supplicants.filter((person) => {
    const host = pieces.hostView(person.denizenId, person.host).displayed;
    return host.kind === "temple" && host.templeId === temple.templeId;
  }).map((person) => {
    const host = pieces.hostView(person.denizenId, person.host).displayed;
    return host.kind === "temple" ? { ...person, host } : person;
  });
  const prophets = hostedProphets(hierophant.prophets, { kind: "temple", templeId: temple.templeId });
  const researchers = templeResearchers(presence, temple.templeId);
  const holidayView = pieces.holidayView(temple.templeId, hierophant.holidayTempleIds.includes(temple.templeId));
  const groups = areaGroups(hosted, isHestar);
  const status = templePhysicalStatus(temple);
  const blasphemousDoctrine = temple.kind === "ordinary" && temple.doctrine.kind === "blasphemy";
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
            : blasphemousDoctrine
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
          <div className="flex shrink-0 items-start gap-1.5">
            <HolidayChip
              templeName={name}
              marked={holidayView.marked}
              pending={holidayView.pending}
              onToggle={(next) => pieces.onToggleHoliday(temple.templeId, next)}
            />
            <TempleStatusControl
              temple={temple}
              pending={pieces.statusPendingTempleIds.has(temple.templeId)}
              onRecord={(next) => pieces.onRecordTempleStatus(temple.templeId, next)}
            />
          </div>
        </div>
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
            conversion={isHestar ? null : {
              enabled: true,
              onConvert: () => pieces.onConvertHestarResource(temple.templeId, "abundance"),
            }}
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
            conversion={isHestar ? null : {
              enabled: true,
              onConvert: () => pieces.onConvertHestarResource(temple.templeId, "conviction"),
            }}
          />
        </div>
        {temple.kind === "ordinary" ? (
          <>
            <OrdinaryDoctrineObject
              temple={temple}
              hierophant={hierophant}
              denizens={denizens}
              pending={pieces.doctrinePendingTempleIds.has(temple.templeId)}
              onRecord={(next) => pieces.onRecordDoctrine(temple.templeId, next)}
            />
          </>
        ) : (
          <div className="rounded-md border border-amber-900/20 bg-amber-50/80 px-2 py-1 dark:border-amber-200/20 dark:bg-amber-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Doctrine</p>
            <p className="text-sm">{doctrineStateLabel(temple, hierophant.campaignDoctrines)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500" aria-label="Supports all Classes">
              Supports all
            </p>
          </div>
        )}
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
          hostMove={hostMove}
          className={supply?.activeClassId !== null || hostMove?.draggingDenizenId !== null ? "min-h-[1.75rem]" : ""}
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
        const pendingCreates = pendingCreatesForZone(supply?.pendingCreates, temple.templeId, group.key);
        const section = (
        <section aria-label={group.label} className="text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h4>
          {group.people.length === 0 && pendingCreates.length === 0 ? (
            <div
              className="mt-1 min-h-[2.25rem] rounded-md border border-dashed border-amber-900/20 bg-amber-50/40 dark:border-amber-200/15 dark:bg-amber-950/20"
              aria-hidden="true"
            />
          ) : (
            <ul className="flex flex-col gap-1.5 mt-1">
              {pendingCreates.map((item) => (
                <PendingSupplyGhost key={item.denizenId} item={item} />
              ))}
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
                  onSetWoe={(nextWoe) => pieces.onSetWoe(person.denizenId, nextWoe)}
                  onAdjustWoe={(delta) => pieces.onAdjustWoe(person.denizenId, delta)}
                  onArtisanPayment={(resource) => choices.onArtisanPayment(person.denizenId, resource)}
                  onHestarFallback={(useHestar) => choices.onHestarFallback(person.denizenId, useHestar)}
                  onOrderSelect={() => choices.onOrderSelect(person.denizenId)}
                  hostMove={hostMove}
                  timeScheduled={pieces.timeScheduledDenizenIds.has(person.denizenId)}
                  hostPending={pieces.hostView(person.denizenId, person.host).pending}
                  benefactionPending={pieces.benefactionPendingDenizenIds.has(person.denizenId)}
                  onBenefactionDepart={() => pieces.onBenefactionDepart(person.denizenId)}
                  woeView={pieces.woeView(person.denizenId, person.woe)}
                />
              ))}
            </ul>
          )}
        </section>
        );
        if (zone === null) return <div key={group.key}>{section}</div>;
        return (
          <SupplyDropZone key={group.key} temple={temple} zone={zone} supply={supply} hostMove={hostMove}>
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
              const statusValue = denizens.find((denizen) => denizen.denizenId === prophet.denizenId)?.powerfulProfile?.status;
              const reliableOrDisruptive = statusValue?.kind === "standard"
                && (statusValue.value === "reliable" || statusValue.value === "disruptive")
                ? statusValue.value
                : null;
              const nextStatus = reliableOrDisruptive === "reliable" ? "disruptive" : "reliable";
              const prophetPending = pieces.prophetPendingDenizenIds.has(prophet.denizenId);
              return (
              <li key={prophet.denizenId}>
                <div
                  data-prophet-piece={prophet.denizenId}
                  className="w-full text-left rounded-lg border-2 border-violet-600 bg-violet-50 px-2 py-1 shadow-sm dark:border-violet-400 dark:bg-violet-950/40"
                >
                  <button
                    type="button"
                    className="w-full text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                    aria-label={`${prophetName ?? "Prophet"}, Prophet`}
                    onClick={onSelect}
                    onKeyDown={(event) => activate(event, onSelect)}
                  >
                    <PersonPieceHeader
                      type="Prophet"
                      name={prophetName}
                      typeClassName="text-violet-800 dark:text-violet-200"
                    />
                  </button>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] leading-tight text-slate-600 dark:text-slate-300">
                      {prophetStatusText(denizens, prophet.denizenId)} · Temple host
                    </span>
                    {reliableOrDisruptive !== null && (
                      <button
                        type="button"
                        data-prophet-status={reliableOrDisruptive}
                        data-prophet-status-pending={prophetPending ? "true" : "false"}
                        aria-busy={prophetPending}
                        aria-label={`Record ${nextStatus === "reliable" ? "Reliable" : "Disruptive"}`}
                        className="rounded border border-violet-700/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:opacity-60 dark:text-violet-50"
                        disabled={prophetPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          pieces.onRecordProphetStatus(prophet.denizenId, nextStatus);
                        }}
                      >
                        {reliableOrDisruptive === "reliable" ? "Reliable" : "Disruptive"}
                      </button>
                    )}
                  </div>
                </div>
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
  hostMove,
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
  readonly hostMove: HierophantHostMoveBoardInteraction;
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
        hostMove={hostMove}
        pieces={pieces}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {hostMove.notice !== null && (
        <p
          data-host-notice=""
          className="rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
        >
          {hostMove.notice.reason}
        </p>
      )}
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
              hostMove={hostMove}
              pieces={pieces}
            />
          ))}
        </section>
      )}
    </div>
  );
}
