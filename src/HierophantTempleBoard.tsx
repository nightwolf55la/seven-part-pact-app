import type { KeyboardEvent } from "react";
import type { HierophantProphet, HierophantState, HierophantSupplicant, HierophantTemple, SorcererExternalPresence } from "../shared/domain";
import { powerfulStatusLabel } from "../shared/domain";
import type { NamedDenizen, NamedPlace } from "./hierophant-view-model";
import {
  benefactionReferenceLabel,
  baseBenefactionReference,
  classLabel,
  denizenLabel,
  deriveSupplicantSupport,
  hostedProphets,
  hostedSupplicants,
  researcherOperationalLabel,
  startingOrdinaryTempleIds,
  supplementaryTemples,
  supportDisplayLabel,
  templeDisplayName,
  templeDoctrineSummary,
  templeResearchers,
} from "./hierophant-view-model";

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function doctrineStateLabel(temple: HierophantTemple, campaignDoctrines: HierophantState["campaignDoctrines"]): string {
  if (temple.kind === "hestar") return "No Doctrine — supports all Classes";
  if (temple.doctrine.kind === "unset") return "Doctrine unset";
  if (temple.doctrine.kind === "blasphemy") return `Blasphemous: ${templeDoctrineSummary(temple, campaignDoctrines)}`;
  return templeDoctrineSummary(temple, campaignDoctrines);
}

function statusLabel(temple: HierophantTemple): string {
  return temple.status === "collapsed" ? "Collapsed" : "Active";
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

function TemplePiece({
  temple,
  hierophant,
  denizens,
  places,
  presence,
  selected,
  onSelect,
}: {
  readonly temple: HierophantTemple;
  readonly hierophant: HierophantState;
  readonly denizens: readonly NamedDenizen[];
  readonly places: readonly NamedPlace[];
  readonly presence: readonly SorcererExternalPresence[];
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const isHestar = temple.kind === "hestar";
  const hosted = hostedSupplicants(hierophant.supplicants, { kind: "temple", templeId: temple.templeId });
  const prophets = hostedProphets(hierophant.prophets, { kind: "temple", templeId: temple.templeId });
  const researchers = templeResearchers(presence, temple.templeId);
  const holiday = hierophant.holidayTempleIds.includes(temple.templeId);
  const groups = areaGroups(hosted, isHestar);
  return (
    <article
      className={`rounded-xl border p-3 flex flex-col gap-2 min-w-0 ${
        isHestar
          ? "border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/40"
          : temple.status === "collapsed"
            ? "border-stone-500 bg-stone-100 dark:bg-stone-900"
            : temple.kind === "ordinary" && temple.doctrine.kind === "blasphemy"
              ? "border-rose-400 dark:border-rose-500 bg-rose-50/70 dark:bg-rose-950/30"
              : "border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900"
      } ${selected ? "ring-2 ring-amber-600 dark:ring-amber-300" : ""}`}
    >
      <header className="flex flex-col gap-1">
        <button
          type="button"
          className="text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          aria-pressed={selected}
          aria-label={`${templeDisplayName(temple, places)}, ${statusLabel(temple)}`}
          onClick={onSelect}
          onKeyDown={(event) => activate(event, onSelect)}
        >
          <h3 className="font-semibold text-amber-950 dark:text-amber-100">
            {templeDisplayName(temple, places)}
            {isHestar ? " · Hestar" : ""}
          </h3>
        </button>
        <p className="text-xs uppercase tracking-wide">
          <span className={temple.status === "collapsed" ? "font-semibold" : ""}>{statusLabel(temple)}</span>
          {holiday ? " · Holiday marked" : ""}
        </p>
        <p className="text-sm">Abundance {temple.abundance} · Conviction {temple.conviction}</p>
        <p className={`text-sm ${temple.kind === "ordinary" && temple.doctrine.kind === "unset" ? "italic text-slate-600 dark:text-slate-300" : ""}`}>
          {doctrineStateLabel(temple, hierophant.campaignDoctrines)}
        </p>
      </header>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h4>
          {group.people.length === 0 ? (
            <p className="text-xs text-slate-500">None</p>
          ) : (
            <ul className="flex flex-col gap-1 mt-1">
              {group.people.map((person) => {
                const support = deriveSupplicantSupport(temple, person.classId, hierophant.campaignDoctrines);
                const benefaction = baseBenefactionReference(person.classId);
                return (
                  <li
                    key={person.denizenId}
                    className="rounded-md border border-amber-100 dark:border-amber-900 px-2 py-1 break-words"
                  >
                    <div className="font-medium">{denizenLabel(denizens, person.denizenId)}</div>
                    <div className="text-xs">
                      {classLabel(person.classId, hierophant.campaignClasses)} · Woe {person.woe} · {supportDisplayLabel(support)}
                    </div>
                    <div className="text-xs text-slate-500">{benefactionReferenceLabel(benefaction)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
      <section aria-label="Prophets" className="text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prophets</h4>
        {prophets.length === 0 ? (
          <p className="text-xs text-slate-500">None</p>
        ) : (
          <ul className="flex flex-col gap-1 mt-1">
            {prophets.map((prophet: HierophantProphet) => (
              <li key={prophet.denizenId} className="rounded-md border border-amber-200 dark:border-amber-800 px-2 py-1 break-words">
                <div className="font-medium">{denizenLabel(denizens, prophet.denizenId)}</div>
                <div className="text-xs">{prophetStatusText(denizens, prophet.denizenId)} · Temple host</div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Sorcerer Researcher" className="text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Researcher</h4>
        {researchers.length === 0 ? (
          <p className="text-xs text-slate-500">No Researcher at this Temple</p>
        ) : (
          <ul className="flex flex-col gap-1 mt-1">
            {researchers.map((researcher) => (
              <li key={researcher.denizenId} className="rounded-md border border-dashed border-slate-300 dark:border-slate-600 px-2 py-1">
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
        )}
      </section>
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
              selected={selectedTempleId === temple.templeId}
              onSelect={() => onSelectTemple(temple.templeId)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
