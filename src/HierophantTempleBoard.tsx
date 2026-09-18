import type { KeyboardEvent } from "react";
import {
  planHierophantVisions,
  powerfulStatusLabel,
  type HierophantProphet,
  type HierophantState,
  type HierophantSupplicant,
  type HierophantTemple,
  type HierophantVisionsPlan,
  type HierophantVisionsSupplicantPreview,
  type HierophantVisionsTemplePreview,
  type SorcererExternalPresence,
} from "../shared/domain";
import type { NamedDenizen, NamedPlace } from "./hierophant-view-model";
import {
  classLabel,
  denizenLabel,
  formatVisionsSupplicantLine,
  formatVisionsTempleWarnings,
  hostedProphets,
  hostedSupplicants,
  researcherOperationalLabel,
  startingOrdinaryTempleIds,
  supplementaryTemples,
  templeDisplayName,
  templeDoctrineSummary,
  templeResearchers,
  templeSupportedClassLabels,
  deriveHierophantVisionsContext,
  shortTempleBoardLabel,
} from "./hierophant-view-model";

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
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
}: {
  readonly label: "Abundance" | "Conviction";
  readonly before: number;
  readonly after: number | null;
  readonly delta: number | null;
}) {
  const forecast = after !== null && delta !== null && delta !== 0
    ? `${delta > 0 ? "+" : ""}${delta} → ${after}`
    : null;
  return (
    <div
      className={`flex min-w-[4.75rem] flex-col items-center rounded-lg border-2 px-2 py-1 shadow-sm ${
        label === "Abundance"
          ? "border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950/70 dark:text-amber-50"
          : "border-indigo-700 bg-indigo-100 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-50"
      }`}
      aria-label={forecast === null ? `${label} ${before}` : `${label} ${before}, this Visions phase ${forecast}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold tabular-nums leading-none">{before}</span>
      {forecast !== null && (
        <span className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
          this Visions phase {forecast}
        </span>
      )}
    </div>
  );
}

function WoePips({ woe, projectedTo }: { readonly woe: number; readonly projectedTo: number | null }) {
  const visualRange = 5;
  const filled = Math.min(woe, visualRange);
  const label = projectedTo === null ? `Woe ${woe}` : `Woe ${woe} → ${projectedTo}`;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: visualRange }, (_, index) => (
          <span
            key={index}
            className={`inline-block h-2.5 w-2.5 rounded-full border border-stone-700 dark:border-stone-200 ${
              index < filled ? "bg-stone-800 dark:bg-stone-100" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span className="text-xs tabular-nums font-medium">
        Woe {woe}
        {projectedTo !== null ? ` → ${projectedTo}` : ""}
      </span>
    </span>
  );
}

function SupplicantPiece({
  person,
  preview,
  denizens,
  campaignClasses,
  onSelectTemple,
}: {
  readonly person: HierophantSupplicant;
  readonly preview: HierophantVisionsSupplicantPreview | undefined;
  readonly denizens: readonly NamedDenizen[];
  readonly campaignClasses: HierophantState["campaignClasses"];
  readonly onSelectTemple: () => void;
}) {
  const name = denizenLabel(denizens, person.denizenId);
  const klass = classLabel(person.classId, campaignClasses);
  const support = preview === undefined ? null : preview.support === "supported" ? "Supported" : preview.support === "unsupported" ? "Unsupported" : null;
  const line = preview === undefined ? null : formatVisionsSupplicantLine(preview, "board");
  const projectedTo = preview?.woeProjection.kind === "determined" ? preview.woeProjection.to : null;
  const danger = preview?.departure.kind === "cult_threshold" || preview?.blockerKind !== null;
  const accessible = [
    name,
    klass,
    `Woe ${person.woe}`,
    support,
    line,
  ].filter((part): part is string => part !== null && part !== "").join(", ");
  return (
    <li>
      <button
        type="button"
        className={`w-full text-left rounded-lg border px-2 py-1.5 shadow-sm cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
          danger
            ? "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40"
            : "border-amber-800/40 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-950/30"
        }`}
        aria-label={accessible}
        onClick={onSelectTemple}
        onKeyDown={(event) => activate(event, onSelectTemple)}
      >
        <div className="font-medium leading-tight">{name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{klass}</span>
          {support !== null && (
            <span className="rounded-sm border border-amber-800/40 px-1 uppercase tracking-wide text-[10px] font-semibold">
              {support}
            </span>
          )}
        </div>
        <div className="mt-1">
          <WoePips woe={person.woe} projectedTo={projectedTo} />
        </div>
        {line !== null && (
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{line}</p>
        )}
      </button>
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
}: {
  readonly temple: HierophantTemple;
  readonly hierophant: HierophantState;
  readonly denizens: readonly NamedDenizen[];
  readonly places: readonly NamedPlace[];
  readonly presence: readonly SorcererExternalPresence[];
  readonly plan: HierophantVisionsPlan;
  readonly selected: boolean;
  readonly onSelect: () => void;
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
  const fallbackChoice = plan.requiredChoices.find(
    (choice) => choice.kind === "hestar_fallback" && choice.templeId === temple.templeId,
  );
  const donorChoice = plan.requiredChoices.find(
    (choice) => choice.kind === "hestar_donor" && choice.templeId === temple.templeId,
  );
  const donorLabels = donorChoice?.kind === "hestar_donor"
    ? donorChoice.eligibleDonorTempleIds.map((templeId) => {
        const donor = hierophant.temples.find((entry) => entry.templeId === templeId);
        return shortTempleBoardLabel(donor === undefined ? templeId : templeDisplayName(donor, places));
      })
    : [];
  const warnings = templePreview === undefined
    ? []
    : formatVisionsTempleWarnings(templePreview, {
        hestarFallbackResource: fallbackChoice?.kind === "hestar_fallback" ? fallbackChoice.resource : undefined,
        donorAmount: donorChoice?.kind === "hestar_donor" ? donorChoice.amount : undefined,
        donorResource: donorChoice?.kind === "hestar_donor" ? donorChoice.resource : undefined,
        donorLabels,
      });
  const supportedClasses = templeSupportedClassLabels(temple, hierophant.campaignDoctrines, hierophant.campaignClasses);
  const previews = new Map(plan.supplicants.map((entry) => [entry.denizenId, entry]));
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
          />
          <ResourceCounter
            label="Conviction"
            before={temple.conviction}
            after={templePreview?.conviction.after ?? null}
            delta={templePreview?.conviction.delta ?? null}
          />
        </div>
        <div className="rounded-md border border-amber-900/20 bg-amber-50/80 px-2 py-1 dark:border-amber-200/20 dark:bg-amber-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Doctrine</p>
          <p className={`text-sm ${temple.kind === "ordinary" && temple.doctrine.kind === "unset" ? "italic text-slate-600 dark:text-slate-300" : ""}`}>
            {doctrineStateLabel(temple, hierophant.campaignDoctrines)}
          </p>
          {isHestar ? (
            <p className="text-xs mt-0.5">Supports all Classes</p>
          ) : supportedClasses.length > 0 ? (
            <p className="text-xs mt-0.5" aria-label={`Supports ${supportedClasses.join(", ")}`}>
              Supports {supportedClasses.join(", ")}
            </p>
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
      </header>
      {groups.filter((group) => group.people.length > 0 || group.key === "courtyard" || group.key === "agiary" || group.key === "hestar").map((group) => (
        <section key={group.key} aria-label={group.label} className="text-sm">
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
                  onSelectTemple={onSelect}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
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
}: {
  readonly hierophant: HierophantState;
  readonly denizens: readonly NamedDenizen[];
  readonly places: readonly NamedPlace[];
  readonly presence: readonly SorcererExternalPresence[];
  readonly selectedTempleId: string | null;
  readonly onSelectTemple: (templeId: string) => void;
}) {
  const plan = planHierophantVisions(hierophant, {}, deriveHierophantVisionsContext(denizens));
  const byId = new Map(hierophant.temples.map((temple) => [temple.templeId, temple]));
  const hestar = byId.get("hestar");
  const extras = supplementaryTemples(hierophant.temples);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid gap-3 md:grid-cols-[1fr_1.15fr_1fr] md:grid-rows-2"
        aria-label="Temples of the Hierophant"
      >
        {startingOrdinaryTempleIds().slice(0, 2).map((templeId, index) => {
          const temple = byId.get(templeId);
          if (temple === undefined) return null;
          return (
            <div key={temple.templeId} className={index === 0 ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"}>
              <TemplePiece
                temple={temple}
                hierophant={hierophant}
                denizens={denizens}
                places={places}
                presence={presence}
                plan={plan}
                selected={selectedTempleId === temple.templeId}
                onSelect={() => onSelectTemple(temple.templeId)}
              />
            </div>
          );
        })}
        {hestar !== undefined && (
          <div className="md:col-start-2 md:row-start-1 md:row-span-2">
            <TemplePiece
              temple={hestar}
              hierophant={hierophant}
              denizens={denizens}
              places={places}
              presence={presence}
              plan={plan}
              selected={selectedTempleId === "hestar"}
              onSelect={() => onSelectTemple("hestar")}
            />
          </div>
        )}
        {startingOrdinaryTempleIds().slice(2).map((templeId, index) => {
          const temple = byId.get(templeId);
          if (temple === undefined) return null;
          return (
            <div key={temple.templeId} className={index === 0 ? "md:col-start-1 md:row-start-2" : "md:col-start-3 md:row-start-2"}>
              <TemplePiece
                temple={temple}
                hierophant={hierophant}
                denizens={denizens}
                places={places}
                presence={presence}
                plan={plan}
                selected={selectedTempleId === temple.templeId}
                onSelect={() => onSelectTemple(temple.templeId)}
              />
            </div>
          );
        })}
      </div>
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
            />
          ))}
        </section>
      )}
    </div>
  );
}
