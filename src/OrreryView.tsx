import { buildOrreryDisplayModel, arcSvgAngles, centidegreesToSvgAngle } from "./orrery-view-model";
import type { OrreryDisplayModel, PlanetDisplayInfo } from "./orrery-view-model";
import { MOVABLE_PLANET_IDS, PLANET_DEFINITIONS, FULL_CIRCLE_CENTIDEGREES } from "../shared/domain/orrery";
import type { MovablePlanetId, CentidegreePosition, HouseIndex } from "../shared/domain/orrery";
import type { MonthOrdinal } from "../shared/domain/calendar";
import { HOUSE_NAMES } from "../shared/domain/orrery";

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

const SVG_SIZE = 320;
const SVG_CENTER = SVG_SIZE / 2;
const HOUSE_OUTER_R = 150;
const HOUSE_INNER_R = 130;
const PLANET_TRACK_BASE_R = 120;
const PLANET_TRACK_GAP = 18;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, largeArc: boolean) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const sweep = endAngle > startAngle;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc ? 1 : 0} ${sweep ? 0 : 1} ${end.x} ${end.y}`;
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

  const model = buildOrreryDisplayModel(monthOrdinal as MonthOrdinal, positions);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Orrery
      </h3>
      <div className="flex justify-center">
        <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="max-w-full">
          {/* House sectors */}
          {model.houses.map((house) => {
            const startAngle = centidegreesToSvgAngle(house.index * 3000);
            const endAngle = centidegreesToSvgAngle((house.index + 1) * 3000);
            const isSunHouse = house.hasSun;
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(SVG_CENTER, SVG_CENTER, HOUSE_OUTER_R + 12, midAngle);
            return (
              <g key={house.index}>
                <path
                  d={describeArc(SVG_CENTER, SVG_CENTER, HOUSE_OUTER_R, startAngle, endAngle, false)}
                  fill={isSunHouse ? "#fef3c7" : "#f8fafc"}
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-500 dark:fill-slate-400"
                  style={{ fontSize: 8, fontWeight: 600 }}
                >
                  {house.name}
                </text>
              </g>
            );
          })}

          {/* Inner circle */}
          <circle cx={SVG_CENTER} cy={SVG_CENTER} r={HOUSE_INNER_R} fill="none" stroke="#e2e8f0" strokeWidth={0.5} />

          {/* Sun indicator */}
          <circle
            cx={polarToCartesian(SVG_CENTER, SVG_CENTER, (HOUSE_OUTER_R + HOUSE_INNER_R) / 2, centidegreesToSvgAngle(centidegreesToSvgAngle(model.sun.position))).x}
            cy={polarToCartesian(SVG_CENTER, SVG_CENTER, (HOUSE_OUTER_R + HOUSE_INNER_R) / 2, centidegreesToSvgAngle(centidegreesToSvgAngle(model.sun.position))).y}
            r={5}
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth={1}
          />
          <text
            x={polarToCartesian(SVG_CENTER, SVG_CENTER, (HOUSE_OUTER_R + HOUSE_INNER_R) / 2, centidegreesToSvgAngle(model.sun.position)).x}
            y={polarToCartesian(SVG_CENTER, SVG_CENTER, (HOUSE_OUTER_R + HOUSE_INNER_R) / 2, centidegreesToSvgAngle(model.sun.position)).y - 8}
            textAnchor="middle"
            className="fill-amber-700 dark:fill-amber-400"
            style={{ fontSize: 7, fontWeight: 700 }}
          >
            Sun
          </text>

          {/* Planet arcs */}
          {model.planets.map((planet, idx) => {
            const trackR = PLANET_TRACK_BASE_R - idx * PLANET_TRACK_GAP;
            const { startAngle, endAngle, largeArc } = arcSvgAngles(planet.arcStart, planet.arcLength);
            return (
              <g key={planet.planetId}>
                <path
                  d={describeArc(SVG_CENTER, SVG_CENTER, trackR, startAngle, endAngle, largeArc)}
                  fill="none"
                  stroke={PLANET_COLORS[planet.planetId]}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <circle
                  cx={polarToCartesian(SVG_CENTER, SVG_CENTER, trackR, startAngle).x}
                  cy={polarToCartesian(SVG_CENTER, SVG_CENTER, trackR, startAngle).y}
                  r={2.5}
                  fill={PLANET_COLORS[planet.planetId]}
                />
              </g>
            );
          })}
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

      {/* Conjunction summary */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        {model.conjunctions.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            No current conjunctions
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Conjunctions:
            </p>
            {model.conjunctions.map((c, i) => (
              <p key={i} className="text-xs text-slate-500 dark:text-slate-400">
                {PLANET_LABELS[c.bodyA as MovablePlanetId] ?? c.bodyA} — {PLANET_LABELS[c.bodyB as MovablePlanetId] ?? c.bodyB} in {c.sharedHouseNames.join(", ")}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
