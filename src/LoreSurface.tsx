import { useMemo, useState } from "react";
import LoreContextPanel from "./LoreContextPanel";
import type { LoreCompendiumReference } from "../shared/domain";
import {
  browseCompendiumSubjects,
  compendiumShelfOptions,
  compendiumSubjectIndexLabel,
  findPresentationSubjectByKey,
  type LoreBrowseFilters,
  type LoreCompendiumUiState,
} from "./lore-view-model";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
const ghostBtn =
  "text-xs rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

function LoreSurfaceReady({
  campaignId,
  presentation,
  layout,
}: {
  readonly campaignId: string;
  readonly presentation: Extract<LoreCompendiumReference, { ok: true }>;
  readonly layout: "full" | "narrow";
}) {
  const [search, setSearch] = useState("");
  const [shelfId, setShelfId] = useState<LoreBrowseFilters["shelfId"]>("all");
  const [changedAndAddedOnly, setChangedAndAddedOnly] = useState(false);
  const [includeEmptyEligible, setIncludeEmptyEligible] = useState(false);
  const [selectedPresentationKey, setSelectedPresentationKey] = useState<string | null>(null);

  const filters: LoreBrowseFilters = {
    search,
    shelfId,
    changedAndAddedOnly,
    includeEmptyEligible,
  };
  const browseSubjects = useMemo(
    () => browseCompendiumSubjects(presentation, filters),
    [presentation, search, shelfId, changedAndAddedOnly, includeEmptyEligible],
  );
  const shelves = useMemo(() => compendiumShelfOptions(presentation), [presentation]);
  const selectedSubject = selectedPresentationKey === null
    ? null
    : findPresentationSubjectByKey(presentation, selectedPresentationKey) ?? null;

  const browseColumn = (
    <div className="space-y-4 min-w-0">
      <header>
        <h1 className="text-2xl font-serif font-semibold text-slate-900 dark:text-slate-50">Compendium</h1>
        <p className="text-sm text-slate-500 mt-1">
          Campaign reference Lore — what your table has established and what the books provide.
        </p>
      </header>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
          Search Lore
          <input
            type="search"
            aria-label="Search Compendium"
            className={fieldClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Shelf
            <select
              aria-label="Filter by shelf"
              className={`${fieldClass} ml-1 inline-block w-auto min-w-[8rem]`}
              value={shelfId}
              onChange={(event) => setShelfId(event.target.value as LoreBrowseFilters["shelfId"])}
            >
              <option value="all">All shelves</option>
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>{shelf.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Changed and added only"
              checked={changedAndAddedOnly}
              onChange={(event) => setChangedAndAddedOnly(event.target.checked)}
            />
            Changed &amp; added
          </label>
        </div>
        <button
          type="button"
          className={ghostBtn}
          aria-pressed={includeEmptyEligible}
          onClick={() => setIncludeEmptyEligible((value) => !value)}
        >
          {includeEmptyEligible ? "Hide subjects without Lore" : "Show subjects available for Lore"}
        </button>
      </div>
      <nav aria-label="Compendium subjects">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {browseSubjects.length === 0 && (
            <li className="px-3 py-4 text-sm text-slate-500">No subjects match these filters.</li>
          )}
          {browseSubjects.map((subject) => (
            <li key={subject.presentationKey}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
                  selectedPresentationKey === subject.presentationKey ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""
                }`}
                onClick={() => setSelectedPresentationKey(subject.presentationKey)}
              >
                <span className="font-serif">{compendiumSubjectIndexLabel(subject)}</span>
                <span className="block text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">{subject.shelf.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  const readingColumn = selectedSubject === null ? (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
      Select a subject to read its Lore.
    </div>
  ) : (
    <LoreContextPanel subject={selectedSubject} campaignId={campaignId} compact={layout === "narrow"} />
  );

  if (layout === "narrow") {
    return (
      <div className="space-y-6" aria-label="Compendium">
        {browseColumn}
        {readingColumn}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" aria-label="Compendium">
      {browseColumn}
      {readingColumn}
    </div>
  );
}

export default function LoreSurface({
  campaignId,
  uiState,
  layout = "full",
}: {
  readonly campaignId: string;
  readonly uiState: LoreCompendiumUiState;
  readonly layout?: "full" | "narrow";
}) {
  if (uiState.status === "loading") {
    return <div className="py-12 text-center text-sm text-slate-400">Loading Compendium…</div>;
  }
  if (uiState.status === "unavailable") {
    return <div className="py-12 text-center text-sm text-slate-400">Compendium unavailable.</div>;
  }
  if (uiState.status === "unsupported_ruleset") {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Compendium is not available for this campaign ruleset.
      </div>
    );
  }
  return (
    <LoreSurfaceReady
      campaignId={campaignId}
      presentation={uiState.presentation}
      layout={layout}
    />
  );
}
