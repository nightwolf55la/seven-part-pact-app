import { useState } from "react";

export interface DenizenRef {
  readonly denizenId: string;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly description: string | null;
}

export interface IsleRef {
  readonly isleId: string;
  readonly name: string;
  readonly description: string | null;
}

export type PlacementRef =
  | { readonly kind: "unspecified" }
  | { readonly kind: "on_isle"; readonly isleId: string }
  | { readonly kind: "mobile"; readonly associatedIsleId: string | null };

export interface PlaceRef {
  readonly placeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly placement: PlacementRef;
}

export interface WorldReference {
  readonly denizens: readonly DenizenRef[];
  readonly isles: readonly IsleRef[];
  readonly places: readonly PlaceRef[];
}

type WorldTab = "denizens" | "isles" | "places";

const TAB_LABELS: Record<WorldTab, string> = {
  denizens: "Denizens",
  isles: "Isles",
  places: "Places",
};

function representationLabel(rep: "individual" | "collective"): string {
  return rep === "individual" ? "Individual" : "Collective";
}

function isleName(isles: readonly IsleRef[], isleId: string): string {
  const isle = isles.find((i) => i.isleId === isleId);
  return isle ? isle.name : "Unknown Isle";
}

function placementLabel(placement: PlacementRef, isles: readonly IsleRef[]): string {
  switch (placement.kind) {
    case "unspecified":
      return "Unspecified";
    case "on_isle":
      return `On ${isleName(isles, placement.isleId)}`;
    case "mobile":
      if (placement.associatedIsleId !== null) {
        return `Mobile — associated with ${isleName(isles, placement.associatedIsleId)}`;
      }
      return "Mobile";
  }
}

function matchesFilter(text: string, filter: string): boolean {
  return text.toLowerCase().includes(filter.toLowerCase());
}

export default function WorldSurface({ world }: { world: WorldReference }) {
  const [activeTab, setActiveTab] = useState<WorldTab>("denizens");
  const [filter, setFilter] = useState("");

  const trimmedFilter = filter.trim();

  const filteredDenizens = trimmedFilter
    ? world.denizens.filter(
        (d) =>
          matchesFilter(d.name, trimmedFilter) ||
          (d.description !== null && matchesFilter(d.description, trimmedFilter)),
      )
    : world.denizens;

  const filteredIsles = trimmedFilter
    ? world.isles.filter(
        (i) =>
          matchesFilter(i.name, trimmedFilter) ||
          (i.description !== null && matchesFilter(i.description, trimmedFilter)),
      )
    : world.isles;

  const filteredPlaces = trimmedFilter
    ? world.places.filter(
        (p) =>
          matchesFilter(p.name, trimmedFilter) ||
          (p.description !== null && matchesFilter(p.description, trimmedFilter)),
      )
    : world.places;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">World</h2>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(Object.keys(TAB_LABELS) as WorldTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeTab === tab
                ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter world…"
          className="ml-auto text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
        />
      </div>

      {activeTab === "denizens" && (
        <div className="flex flex-col gap-3">
          {filteredDenizens.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No Denizens.</p>
          ) : (
            filteredDenizens.map((d) => (
              <div
                key={d.denizenId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{d.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {representationLabel(d.representation)}
                  </span>
                </div>
                {d.description !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{d.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "isles" && (
        <div className="flex flex-col gap-3">
          {filteredIsles.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No Isles.</p>
          ) : (
            filteredIsles.map((i) => (
              <div
                key={i.isleId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">{i.name}</span>
                {i.description !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{i.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "places" && (
        <div className="flex flex-col gap-3">
          {filteredPlaces.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No Places.</p>
          ) : (
            filteredPlaces.map((p) => (
              <div
                key={p.placeId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                {p.description !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{p.description}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {placementLabel(p.placement, world.isles)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
