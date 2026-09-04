import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { useState } from "react";
import { MOVABLE_PLANET_IDS } from "../shared/domain/orrery";
import type { MovablePlanetId } from "../shared/domain/orrery";
import {
  getFixedAgeSetupSummary,
  dominionSeasonToMonthOrdinal,
  dominionSeasonFromMonthOrdinal,
  buildPlanetPositionSelector,
} from "./setup-view-model";
import type { DominionSeasonId } from "./setup-view-model";

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

const PLANET_DISPLAY_NAMES: Record<MovablePlanetId, string> = {
  saturn: "Saturn",
  jupiter: "Jupiter",
  mars: "Mars",
  venus: "Venus",
  mercury: "Mercury",
};

const SEASONS: { value: DominionSeasonId; label: string }[] = [
  { value: "spring", label: "Spring (March)" },
  { value: "summer", label: "Summer (June)" },
  { value: "autumn", label: "Autumn (September)" },
  { value: "winter", label: "Winter (December)" },
];

export default function SetupCompletion() {
  const setup = useQuery(api.m3Queries.getCampaignSetup, {});
  const setSetupMonth = useMutation(api.m3Commands.setSetupMonth);
  const setSetupOrreryPosition = useMutation(api.m3Commands.setSetupOrreryPosition);
  const beginPlay = useMutation(api.m3Commands.beginPlay);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (setup === undefined) {
    return (
      <div className="p-4 text-sm text-slate-400">Loading setup completion…</div>
    );
  }
  if (setup === null) {
    return null;
  }

  const ageId = setup.configuration.ageId;
  const orreryPositions = setup.orreryPositions as Record<MovablePlanetId, number | null>;
  const monthOrdinal = setup.monthOrdinal as number | null;

  async function applyFixedPreset(summary: ReturnType<typeof getFixedAgeSetupSummary>) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await setSetupMonth({
        commandId: generateCommandId(),
        monthOrdinal: summary.requiredMonthOrdinal,
      });
      for (const planetId of MOVABLE_PLANET_IDS) {
        await setSetupOrreryPosition({
          commandId: generateCommandId(),
          planetId,
          positionIndex: summary.presetIndices[planetId],
        });
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not apply the preset. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDominionSeasonChange(season: DominionSeasonId) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const ordinal = dominionSeasonToMonthOrdinal(season);
      await setSetupMonth({
        commandId: generateCommandId(),
        monthOrdinal: ordinal,
      });
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not set the season. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handlePlanetPositionChange(planetId: MovablePlanetId, positionIndex: number) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await setSetupOrreryPosition({
        commandId: generateCommandId(),
        planetId,
        positionIndex,
      });
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not set the planet position. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleBeginPlay() {
    if (pending) return;
    if (setup === null || setup === undefined) return;
    const expectedRevision = setup.campaignRevision;
    setPending(true);
    setError(null);
    try {
      await beginPlay({
        commandId: generateCommandId(),
        expectedRevision,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not begin play.";
      if (msg.includes("STALE_CAMPAIGN_REVISION")) {
        setError(
          "Setup changed since you reviewed it. Review the current setup and try Begin Play again.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setPending(false);
    }
  }

  const readiness = setup.readiness;
  const ready = readiness.ready;

  return (
    <div className="flex flex-col gap-6">
      {error !== null && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Age-Specific Orrery Setup */}
      {ageId === "awakening" && (
        <AwakeningSetup
          pending={pending}
          orreryPositions={orreryPositions}
          onApply={() => applyFixedPreset(getFixedAgeSetupSummary("awakening"))}
        />
      )}
      {ageId === "calamity" && (
        <CalamitySetup
          pending={pending}
          orreryPositions={orreryPositions}
          onApply={() => applyFixedPreset(getFixedAgeSetupSummary("calamity"))}
        />
      )}
      {ageId === "dominion" && (
        <DominionSetup
          pending={pending}
          monthOrdinal={monthOrdinal}
          orreryPositions={orreryPositions}
          onSeasonChange={handleDominionSeasonChange}
          onPlanetChange={handlePlanetPositionChange}
        />
      )}
      {ageId === null && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select an Age in Campaign Setup above to configure the Orrery.
          </p>
        </section>
      )}

      {/* Opening Wizardmoot Guidance */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Opening Wizardmoot
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The table should hold the opening Wizardmoot before beginning Play.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          This is a manual game obligation. The application does not track its completion.
          Choosing Begin Play below is the table's acknowledgement that opening preparation is complete.
        </p>
      </section>

      {/* Readiness + Begin Play */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Readiness
        </h3>
        {ready ? (
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Setup is ready to begin Play.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Setup incomplete
            </p>
            <ul className="flex flex-col gap-1">
              {readiness.issues.map((issue, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          disabled={!ready || pending}
          onClick={handleBeginPlay}
          className="w-full bg-slate-800 dark:bg-slate-100 border border-slate-800 dark:border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Beginning Play…" : "Begin Play"}
        </button>
      </section>
    </div>
  );
}

function AwakeningSetup({
  pending,
  orreryPositions,
  onApply,
}: {
  pending: boolean;
  orreryPositions: Record<MovablePlanetId, number | null>;
  onApply: () => void;
}) {
  const summary = getFixedAgeSetupSummary("awakening");
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Age of Awakening Orrery
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The required starting month is <span className="font-medium">{summary.requiredMonthDisplayName}</span>.
        All five planet positions are fixed by the source.
      </p>
      <div className="flex flex-col gap-1">
        {MOVABLE_PLANET_IDS.map((p) => {
          const current = orreryPositions[p];
          const target = summary.presetIndices[p];
          const matches = current !== null && current === target;
          return (
            <div
              key={p}
              className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
            >
              <span>{PLANET_DISPLAY_NAMES[p]}</span>
              <span className={matches ? "text-green-600 dark:text-green-400" : "text-slate-400"}>
                {matches ? "Set" : `Track position ${target + 1}`}
              </span>
            </div>
          );
        })}
      </div>
      <button
        disabled={pending}
        onClick={onApply}
        className="self-start rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Applying…" : "Apply Awakening Orrery Setup"}
      </button>
    </section>
  );
}

function CalamitySetup({
  pending,
  orreryPositions,
  onApply,
}: {
  pending: boolean;
  orreryPositions: Record<MovablePlanetId, number | null>;
  onApply: () => void;
}) {
  const summary = getFixedAgeSetupSummary("calamity");
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Age of Calamity Orrery
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The required starting month is <span className="font-medium">{summary.requiredMonthDisplayName}</span>.
        All five planet positions are fixed by the source.
      </p>
      <div className="flex flex-col gap-1">
        {MOVABLE_PLANET_IDS.map((p) => {
          const current = orreryPositions[p];
          const target = summary.presetIndices[p];
          const matches = current !== null && current === target;
          return (
            <div
              key={p}
              className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
            >
              <span>{PLANET_DISPLAY_NAMES[p]}</span>
              <span className={matches ? "text-green-600 dark:text-green-400" : "text-slate-400"}>
                {matches ? "Set" : `Track position ${target + 1}`}
              </span>
            </div>
          );
        })}
      </div>
      <button
        disabled={pending}
        onClick={onApply}
        className="self-start rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Applying…" : "Apply Calamity Orrery Setup"}
      </button>
    </section>
  );
}

function DominionSetup({
  pending,
  monthOrdinal,
  orreryPositions,
  onSeasonChange,
  onPlanetChange,
}: {
  pending: boolean;
  monthOrdinal: number | null;
  orreryPositions: Record<MovablePlanetId, number | null>;
  onSeasonChange: (season: DominionSeasonId) => void;
  onPlanetChange: (planetId: MovablePlanetId, positionIndex: number) => void;
}) {
  const currentSeason = dominionSeasonFromMonthOrdinal(monthOrdinal as any);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Age of Dominion Orrery
      </h3>

      {/* Season selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Season
        </label>
        <select
          value={currentSeason ?? ""}
          disabled={pending}
          onChange={(e) => {
            const val = e.target.value as DominionSeasonId;
            if (val) onSeasonChange(val);
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Not selected</option>
          {SEASONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {currentSeason === null && monthOrdinal !== null && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Current month is not a valid Dominion season month. Select a season to correct.
          </p>
        )}
      </div>

      {/* Planet position selectors */}
      <div className="flex flex-col gap-3">
        {MOVABLE_PLANET_IDS.map((planetId) => {
          const selector = buildPlanetPositionSelector(
            planetId,
            orreryPositions[planetId] as any,
          );
          return (
            <div key={planetId} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {PLANET_DISPLAY_NAMES[planetId]}
              </label>
              {selector.offGrid ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Current position is off-grid. Select a legal track position to correct.
                </p>
              ) : null}
              <select
                value={selector.currentIndex ?? ""}
                disabled={pending}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  if (!Number.isNaN(idx)) onPlanetChange(planetId, idx);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Not set</option>
                {selector.legalPositions.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Track position {idx + 1}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
