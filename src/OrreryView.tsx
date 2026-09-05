import { useState, useMemo } from "react";
import { buildOrreryDisplayModel, arcSvgAngles, centidegreesToSvgAngle, sunDisplaySvgAngle, bodiesConjunctWith, occupiedHousesOfBody, buildBodyHoverSummary } from "./orrery-view-model";
import type { OrreryDisplayModel, BodyHoverSummary } from "./orrery-view-model";
import { MOVABLE_PLANET_IDS, PLANET_DEFINITIONS, FULL_CIRCLE_CENTIDEGREES, HOUSE_WIDTH_CENTIDEGREES, HOUSE_NAMES, legalPositionsForPlanet } from "../shared/domain/orrery";
import type { MovablePlanetId, CentidegreePosition, HouseIndex, CelestialBodyId } from "../shared/domain/orrery";
import type { MonthOrdinal } from "../shared/domain/calendar";

const PLANET_COLORS: Record<MovablePlanetId, string> = {
  saturn: "#8b6f47",
  jupiter: "#d4a843",
  mars: "#c44536",
  venus: "#5b9aa0",
  mercury: "#a8a8a8",
};

const PLANET_LABELS: Record<MovablePlanetId, string> = {
  saturn: "Saturn",
  jupiter: "Jupiter",
  mars: "Mars",
  venus: "Venus",
  mercury: "Mercury",
};

const PLANET_SYMBOLS: Record<MovablePlanetId, string> = {
  saturn: "♄",
  jupiter: "♃",
  mars: "♂",
  venus: "♀",
  mercury: "☿",
};

const SVG_VIEWBOX = 520;
const SVG_CENTER = SVG_VIEWBOX / 2;
const HOUSE_OUTER_R = 245;
const HOUSE_INNER_R = 205;
const LABEL_R = 225;
const SUN_R = 238;
const TRACK_BAND_WIDTH = 30;
const TRACK_GAP = 2;
const PLANET_TRACK_BASE_R = 190;
const PLANET_TRACK_MIN_R = PLANET_TRACK_BASE_R - (MOVABLE_PLANET_IDS.length - 1) * (TRACK_BAND_WIDTH + TRACK_GAP);

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, largeArc: boolean) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const sweep = endAngle > startAngle;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc ? 1 : 0} ${sweep ? 0 : 1} ${end.x} ${end.y}`;
}

function describeWedgePath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > 180;
  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc ? 1 : 0} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc ? 1 : 0} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function trackRadii(idx: number): { innerR: number; outerR: number; midR: number } {
  const outerR = PLANET_TRACK_BASE_R - idx * (TRACK_BAND_WIDTH + TRACK_GAP);
  const innerR = outerR - TRACK_BAND_WIDTH;
  const midR = (innerR + outerR) / 2;
  return { innerR, outerR, midR };
}

export default function OrreryView({
  monthOrdinal,
  orreryPositions,
}: {
  monthOrdinal: number;
  orreryPositions: Record<string, number>;
}) {
  const positions = {} as Record<MovablePlanetId, CentidegreePosition>;
  for (const p of MOVABLE_PLANET_IDS) {
    positions[p] = orreryPositions[p] as CentidegreePosition;
  }

  const model = useMemo(
    () => buildOrreryDisplayModel(monthOrdinal as MonthOrdinal, positions),
    [monthOrdinal, orreryPositions],
  );

  const [hoveredBody, setHoveredBody] = useState<CelestialBodyId | null>(null);

  const conjunctWithHovered = useMemo(() => {
    if (hoveredBody === null) return new Set<CelestialBodyId>();
    return new Set(bodiesConjunctWith(model.conjunctions, hoveredBody));
  }, [hoveredBody, model.conjunctions]);

  const conjunctHousesForHovered = useMemo(() => {
    if (hoveredBody === null) return new Set<HouseIndex>();
    const houses = new Set<HouseIndex>();
    for (const c of model.conjunctions) {
      if (c.bodyA === hoveredBody || c.bodyB === hoveredBody) {
        for (const name of c.sharedHouseNames) {
          const idx = HOUSE_NAMES.indexOf(name);
          if (idx >= 0) houses.add(idx as HouseIndex);
        }
      }
    }
    return houses;
  }, [hoveredBody, model.conjunctions]);

  const occupiedHousesForHovered = useMemo(() => {
    if (hoveredBody === null) return new Set<HouseIndex>();
    return new Set(occupiedHousesOfBody(model, hoveredBody));
  }, [hoveredBody, model]);

  const hoverSummary = useMemo(() => {
    if (hoveredBody === null) return null;
    return buildBodyHoverSummary(model, hoveredBody);
  }, [hoveredBody, model]);

  const sunAngle = sunDisplaySvgAngle(monthOrdinal as MonthOrdinal);
  const sunPoint = polarToCartesian(SVG_CENTER, SVG_CENTER, SUN_R, sunAngle);

  const isBodyEmphasized = (bodyId: CelestialBodyId): boolean => {
    if (hoveredBody === null) return true;
    return hoveredBody === bodyId || conjunctWithHovered.has(bodyId);
  };

  const isHouseConjunction = (houseIndex: HouseIndex): boolean => {
    if (hoveredBody === null) return false;
    return conjunctHousesForHovered.has(houseIndex);
  };

  const isHouseOccupied = (houseIndex: HouseIndex): boolean => {
    if (hoveredBody === null) return false;
    return occupiedHousesForHovered.has(houseIndex);
  };

  const bodyOpacity = (bodyId: CelestialBodyId): number => {
    if (hoveredBody === null) return 1;
    return isBodyEmphasized(bodyId) ? 1 : 0.25;
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Orrery
      </h3>
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SVG_VIEWBOX} ${SVG_VIEWBOX}`}
          className="w-full max-w-[560px] aspect-square"
          role="img"
          aria-label="Orrery showing the 12 Houses, Sun position, and planet Arcs"
        >
          {/* House ring sectors */}
          {model.houses.map((house) => {
            const startAngle = centidegreesToSvgAngle(house.index * HOUSE_WIDTH_CENTIDEGREES);
            const endAngle = centidegreesToSvgAngle((house.index + 1) * HOUSE_WIDTH_CENTIDEGREES);
            const isSunHouse = house.hasSun;
            const isConjunction = isHouseConjunction(house.index);
            const isOccupied = isHouseOccupied(house.index);
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(SVG_CENTER, SVG_CENTER, LABEL_R, midAngle);

            const fillColor = isOccupied
              ? "#e0f2fe"
              : isSunHouse && hoveredBody === null
                ? "#fef3c7"
                : house.index % 2 === 0
                  ? "#f8fafc"
                  : "#f1f5f9";

            return (
              <g key={house.index}>
                <path
                  d={describeWedgePath(SVG_CENTER, SVG_CENTER, HOUSE_INNER_R, HOUSE_OUTER_R, startAngle, endAngle)}
                  fill={fillColor}
                  stroke="#cbd5e1"
                  strokeWidth={0.75}
                  className="dark:stroke-slate-600"
                />
                {isConjunction && (
                  <path
                    d={describeWedgePath(SVG_CENTER, SVG_CENTER, HOUSE_INNER_R, HOUSE_OUTER_R, startAngle, endAngle)}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={3}
                    pointerEvents="none"
                  />
                )}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-600 dark:fill-slate-300"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  <tspan x={labelPos.x} dy="-0.35em">{house.name}</tspan>
                  <tspan
                    x={labelPos.x}
                    dy="1.2em"
                    className="fill-slate-400 dark:fill-slate-500"
                    style={{ fontSize: 8, fontWeight: 500 }}
                  >
                    {house.monthDisplayName}
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Planet track bands with subdivision ticks */}
          {MOVABLE_PLANET_IDS.map((planetId, idx) => {
            const { innerR, outerR, midR } = trackRadii(idx);
            const legalPositions = legalPositionsForPlanet(planetId);
            const bandPath = describeWedgePath(
              SVG_CENTER, SVG_CENTER, innerR, outerR,
              0, 360,
            );
            return (
              <g key={`band-${planetId}`}>
                {/* Band fill */}
                <path
                  d={bandPath}
                  fill={idx % 2 === 0 ? "#f8fafc" : "#f1f5f9"}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                  className="dark:fill-slate-800 dark:stroke-slate-700"
                  opacity={hoveredBody === null ? 1 : 0.5}
                />
                {/* Subdivision ticks at legal positions */}
                {legalPositions.map((pos, pi) => {
                  const tickAngle = centidegreesToSvgAngle(pos);
                  const tickStart = polarToCartesian(SVG_CENTER, SVG_CENTER, innerR, tickAngle);
                  const tickEnd = polarToCartesian(SVG_CENTER, SVG_CENTER, outerR, tickAngle);
                  return (
                    <line
                      key={`tick-${planetId}-${pi}`}
                      x1={tickStart.x}
                      y1={tickStart.y}
                      x2={tickEnd.x}
                      y2={tickEnd.y}
                      stroke="#cbd5e1"
                      strokeWidth={0.4}
                      className="dark:stroke-slate-600"
                      opacity={hoveredBody === null ? 0.6 : 0.3}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Innermost circle (center boundary) */}
          <circle
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={PLANET_TRACK_MIN_R - 4}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={0.5}
            className="dark:stroke-slate-800"
          />

          {/* Planet arcs with hover targets */}
          {model.planets.map((planet, idx) => {
            const { midR } = trackRadii(idx);
            const { startAngle, endAngle, largeArc } = arcSvgAngles(planet.arcStart, planet.arcLength);
            const opacity = bodyOpacity(planet.planetId);
            const isEmphasized = isBodyEmphasized(planet.planetId);
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(SVG_CENTER, SVG_CENTER, midR, midAngle);
            const arcStartPoint = polarToCartesian(SVG_CENTER, SVG_CENTER, midR, startAngle);
            return (
              <g
                key={planet.planetId}
                opacity={opacity}
                onMouseEnter={() => setHoveredBody(planet.planetId)}
                onMouseLeave={() => setHoveredBody(null)}
                onFocus={() => setHoveredBody(planet.planetId)}
                onBlur={() => setHoveredBody(null)}
                tabIndex={0}
                role="button"
                aria-label={`${PLANET_LABELS[planet.planetId]} arc in ${planet.occupiedHouseNames.join(", ")}`}
                style={{ cursor: "pointer" }}
              >
                {/* Invisible wider hit target */}
                <path
                  d={describeArcPath(SVG_CENTER, SVG_CENTER, midR, startAngle, endAngle, largeArc)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  pointerEvents="stroke"
                />
                {/* Visible arc */}
                <path
                  d={describeArcPath(SVG_CENTER, SVG_CENTER, midR, startAngle, endAngle, largeArc)}
                  fill="none"
                  stroke={PLANET_COLORS[planet.planetId]}
                  strokeWidth={isEmphasized && hoveredBody !== null ? 6 : 4.5}
                  strokeLinecap="round"
                />
                {/* Arc start dot */}
                <circle
                  cx={arcStartPoint.x}
                  cy={arcStartPoint.y}
                  r={3.5}
                  fill={PLANET_COLORS[planet.planetId]}
                />
                {/* Planet symbol on track */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-700 dark:fill-slate-200"
                  style={{ fontSize: 11, fontWeight: 700, paintOrder: "stroke" }}
                  stroke="white"
                  strokeWidth={2.5}
                >
                  {PLANET_SYMBOLS[planet.planetId]}
                </text>
              </g>
            );
          })}

          {/* Sun indicator */}
          <g
            onMouseEnter={() => setHoveredBody("sun")}
            onMouseLeave={() => setHoveredBody(null)}
            onFocus={() => setHoveredBody("sun")}
            onBlur={() => setHoveredBody(null)}
            tabIndex={0}
            role="button"
            aria-label={`Sun in ${model.sun.houseName}`}
            style={{ cursor: "pointer" }}
            opacity={bodyOpacity("sun")}
          >
            <circle
              cx={sunPoint.x}
              cy={sunPoint.y}
              r={isBodyEmphasized("sun") && hoveredBody !== null ? 11 : 9}
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth={2}
            />
            <circle
              cx={sunPoint.x}
              cy={sunPoint.y}
              r={isBodyEmphasized("sun") && hoveredBody !== null ? 15 : 13}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1}
              opacity={0.4}
            />
            <text
              x={sunPoint.x}
              y={sunPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-amber-900"
              style={{ fontSize: 9, fontWeight: 700 }}
            >
              ☉
            </text>
          </g>
        </svg>
      </div>

      {/* Planet legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {model.planets.map((planet) => (
          <div key={planet.planetId} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: PLANET_COLORS[planet.planetId] }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {PLANET_LABELS[planet.planetId]}
            </span>
            <span className="text-xs text-slate-400">
              ({planet.occupiedHouseNames.join(", ")})
            </span>
          </div>
        ))}
      </div>

      {/* Hover/focus summary or conjunction list */}
      {hoveredBody !== null && hoverSummary !== null ? (
        <HoverSummary summary={hoverSummary} />
      ) : (
        <ConjunctionSummary conjunctions={model.conjunctions} />
      )}
    </section>
  );
}

function HoverSummary({ summary }: { summary: BodyHoverSummary }) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
      <p className="text-xs text-slate-600 dark:text-slate-300">
        <span className="font-medium">{summary.bodyName}</span> occupies {summary.occupiedHouseNames.join(", ")}.
      </p>
      {summary.conjunctions.length > 0 ? (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-0.5">
            Conjunct with:
          </p>
          <div className="flex flex-col gap-0.5">
            {summary.conjunctions.map((c, i) => (
              <p key={i} className="text-xs text-slate-600 dark:text-slate-400">
                {c.otherBodyName} in {c.sharedHouseNames.join(", ")}
              </p>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          No current conjunctions.
        </p>
      )}
    </div>
  );
}

function ConjunctionSummary({
  conjunctions,
}: {
  conjunctions: readonly { bodyA: CelestialBodyId; bodyB: CelestialBodyId; sharedHouseNames: readonly string[] }[];
}) {
  if (conjunctions.length === 0) {
    return (
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          No current conjunctions
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        Conjunctions:
      </p>
      <div className="flex flex-col gap-0.5">
        {conjunctions.map((c, i) => (
          <p key={i} className="text-xs text-slate-500 dark:text-slate-400">
            {PLANET_LABELS[c.bodyA as MovablePlanetId] ?? c.bodyA} — {PLANET_LABELS[c.bodyB as MovablePlanetId] ?? c.bodyB} in {c.sharedHouseNames.join(", ")}
          </p>
        ))}
      </div>
    </div>
  );
}
