import type { KeyboardEvent } from "react";
import type { NecromancerState, SorcererExternalPresence } from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
import {
  NECROMANCER_BOARD_BAND_LABELS,
  NECROMANCER_BOARD_VIEWBOX,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_GATE_MAP_POINTS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_BUILTIN_PATH_MAP_POINTS,
  NECROMANCER_STATIC_TERMINAL_PRESENTATIONS,
  builtinInternalStepPresentation,
  canTransformSoulIntoAlly,
  finalDeathResearchers,
  fivePlusSoulWarning,
  gateBoardAriaLabel,
  gateBoardTitle,
  namedOccupantTokens,
  necromancerDomainDisruptiveArcanists,
  occupantSummaryLabel,
  piecesAtSpace,
  researcherOperationalLabel,
  visibleOccupantTokens,
  visibleSoulBeadCount,
  type BoardOccupantToken,
  type NecromancerWizardNameRef,
} from "./necromancer-view-model";

type Selection =
  | { readonly kind: "gate"; readonly gateId: string }
  | { readonly kind: "path"; readonly pathSpaceId: string };

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function occupantFill(kind: BoardOccupantToken["kind"]): string {
  if (kind === "foe") return "#7f1d1d";
  if (kind === "ally") return "#1e3a8a";
  if (kind === "ghoul_caller") return "#4a044e";
  return "#334155";
}

export default function NecromancerGatesBoard({
  necromancer,
  world,
  wizards,
  selection,
  onSelect,
  sorcererPresence,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
  wizards: readonly NecromancerWizardNameRef[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  sorcererPresence: readonly SorcererExternalPresence[];
}) {
  const finalDeath = NECROMANCER_STATIC_TERMINAL_PRESENTATIONS.find((exit) => exit.terminalId === "final_death");
  const researchers = finalDeathResearchers(sorcererPresence);
  const disruptive = necromancerDomainDisruptiveArcanists(sorcererPresence);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 overflow-x-auto">
        <svg
          role="img"
          aria-label="Gates of Death board"
          viewBox={`0 0 ${NECROMANCER_BOARD_VIEWBOX.width} ${NECROMANCER_BOARD_VIEWBOX.height}`}
          className="w-full min-w-[640px] h-auto text-slate-800 dark:text-slate-100"
        >
          <defs>
            <marker id="nec-step-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="nec-terminal-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
            <pattern id="nec-hostile-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#fff7ed" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#9a3412" strokeWidth="3" />
            </pattern>
            <pattern id="nec-destroyed-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
              <rect width="6" height="6" fill="#0f172a" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="#64748b" strokeWidth="2" />
            </pattern>
          </defs>
          {NECROMANCER_BOARD_BAND_LABELS.map((label) => (
            <text key={label.text} x={label.x} y={label.y} fontSize={16} fill="currentColor">{label.text}</text>
          ))}
          {necromancer.steps.map((step, index) => {
            const path = builtinInternalStepPresentation(step);
            if (path === null) return null;
            return (
              <line
                key={`step-${index}`}
                x1={path.a.x}
                y1={path.a.y}
                x2={path.b.x}
                y2={path.b.y}
                stroke="#64748b"
                strokeWidth={2}
                markerEnd="url(#nec-step-arrow)"
              />
            );
          })}
          {NECROMANCER_STATIC_TERMINAL_PRESENTATIONS.map((exit) => (
            <g key={exit.terminalId}>
              <line
                x1={exit.fromPoint.x}
                y1={exit.fromPoint.y}
                x2={exit.toPoint.x}
                y2={exit.toPoint.y}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 5"
                markerEnd="url(#nec-terminal-arrow)"
              />
              <rect
                x={exit.toPoint.x - 54}
                y={exit.toPoint.y - 16}
                width={108}
                height={32}
                rx={6}
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeDasharray={exit.terminalId === "void_beyond" ? "4 3" : undefined}
              />
              <text x={exit.toPoint.x} y={exit.toPoint.y + 4} textAnchor="middle" fontSize={11} fill="#334155">
                {exit.label}
              </text>
            </g>
          ))}
          {finalDeath !== undefined && researchers.map((researcher, index) => (
            <g
              key={researcher.denizenId}
              data-researcher-target="necromancer_final_death"
              aria-label={`${researcher.name} at Final Death, ${researcherOperationalLabel(researcher.operationalThisMonth)}`}
            >
              <rect
                x={finalDeath.toPoint.x - 70}
                y={finalDeath.toPoint.y + 22 + index * 34}
                width={140}
                height={30}
                rx={6}
                fill="#eef2ff"
                stroke="#4338ca"
                strokeWidth={1.5}
              />
              <text x={finalDeath.toPoint.x} y={finalDeath.toPoint.y + 34 + index * 34} textAnchor="middle" fontSize={9} fill="#312e81">
                {researcher.name}
              </text>
              <text x={finalDeath.toPoint.x} y={finalDeath.toPoint.y + 46 + index * 34} textAnchor="middle" fontSize={8} fill="#4338ca">
                {researcherOperationalLabel(researcher.operationalThisMonth)}
              </text>
            </g>
          ))}
          {NECROMANCER_BUILTIN_PATH_SPACE_IDS.map((pathSpaceId) => {
            const point = NECROMANCER_BUILTIN_PATH_MAP_POINTS[pathSpaceId];
            const location = { kind: "path" as const, pathSpaceId };
            const pieces = piecesAtSpace(necromancer, location);
            const tokens = namedOccupantTokens(pieces, world.denizens, wizards);
            const { visible, overflowCount } = visibleOccupantTokens(tokens);
            const selected = selection?.kind === "path" && selection.pathSpaceId === pathSpaceId;
            const definition = NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.find((path) => path.pathSpaceId === pathSpaceId);
            const label = definition?.applicationLabel ?? pathSpaceId;
            const warning = fivePlusSoulWarning(pieces.souls);
            return (
              <g
                key={pathSpaceId}
                role="button"
                tabIndex={0}
                aria-label={`${label}. ${occupantSummaryLabel(tokens, pieces.souls)}`}
                onClick={() => onSelect({ kind: "path", pathSpaceId })}
                onKeyDown={(event) => activate(event, () => onSelect({ kind: "path", pathSpaceId }))}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={28}
                  fill={selected ? "#ddd6fe" : "#e2e8f0"}
                  stroke="#4c1d95"
                  strokeWidth={selected ? 3 : 1.5}
                />
                <text x={point.x} y={point.y - 6} textAnchor="middle" fontSize={9} fill="#0f172a">
                  {label.replace(" Edge of Life", "").replace(" Far Lands", " Far").replace(" Abyss", "")}
                </text>
                <SpaceTokens
                  originX={point.x}
                  originY={point.y + 10}
                  souls={pieces.souls}
                  visible={visible}
                  overflowCount={overflowCount}
                />
                {warning !== null && (
                  <text x={point.x} y={point.y + 38} textAnchor="middle" fontSize={7} fill="#9a3412">5+ Souls pending</text>
                )}
              </g>
            );
          })}
          {NECROMANCER_BUILTIN_GATE_IDS.map((gateId) => {
            const point = NECROMANCER_BUILTIN_GATE_MAP_POINTS[gateId];
            const gate = necromancer.gates.find((candidate) => candidate.gateId === gateId);
            if (gate === undefined) return null;
            const location = { kind: "gate" as const, gateId };
            const pieces = piecesAtSpace(necromancer, location);
            const tokens = namedOccupantTokens(pieces, world.denizens, wizards);
            const { visible, overflowCount } = visibleOccupantTokens(tokens);
            const selected = selection?.kind === "gate" && selection.gateId === gateId;
            const status = gate.status;
            const fill = status === "destroyed"
              ? "url(#nec-destroyed-hatch)"
              : status === "hostile"
                ? "url(#nec-hostile-hatch)"
                : selected ? "#ddd6fe" : "#f5f3ff";
            const textFill = status === "destroyed" ? "#e2e8f0" : "#0f172a";
            const stroke = status === "destroyed" ? "#94a3b8" : status === "hostile" ? "#9a3412" : selected ? "#5b21b6" : "#4c1d95";
            const warning = fivePlusSoulWarning(pieces.souls);
            const transformEligible = canTransformSoulIntoAlly(gate, pieces.souls);
            return (
              <g
                key={gateId}
                role="button"
                tabIndex={0}
                aria-label={gateBoardAriaLabel(gate) + `. ${occupantSummaryLabel(tokens, pieces.souls)}${transformEligible ? ". Transform Soul into Ally available." : ""}`}
                onClick={() => onSelect({ kind: "gate", gateId })}
                onKeyDown={(event) => activate(event, () => onSelect({ kind: "gate", gateId }))}
              >
                <rect
                  x={point.x - 48}
                  y={point.y - 30}
                  width={96}
                  height={58}
                  rx={4}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={selected ? 3 : 2}
                  strokeDasharray={status === "destroyed" ? "5 4" : undefined}
                />
                <rect
                  x={point.x - 42}
                  y={point.y - 24}
                  width={84}
                  height={48}
                  rx={2}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1}
                  strokeDasharray={status === "destroyed" ? "3 3" : undefined}
                />
                <text x={point.x} y={point.y - 8} textAnchor="middle" fontSize={11} fill={textFill}>
                  {gateBoardTitle(gate)}
                </text>
                <text x={point.x} y={point.y + 6} textAnchor="middle" fontSize={8} fill={textFill}>
                  {status === "ordinary" ? "ordinary" : status === "hostile" ? "Hostile" : "Destroyed"}
                </text>
                <SpaceTokens
                  originX={point.x}
                  originY={point.y + 18}
                  souls={pieces.souls}
                  visible={visible}
                  overflowCount={overflowCount}
                  light={status === "destroyed"}
                />
                {warning !== null && (
                  <text x={point.x} y={point.y + 40} textAnchor="middle" fontSize={7} fill={status === "destroyed" ? "#fecaca" : "#9a3412"}>
                    5+ Souls pending
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {disruptive.length > 0 && (
        <section aria-label="In this Domain" className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">In this Domain</h3>
          <ul className="mt-1 text-sm space-y-1">
            {disruptive.map((arcanist) => (
              <li key={arcanist.denizenId}>
                {arcanist.name}
                <span className="block text-xs text-slate-500">
                  {arcanist.school.schoolId}
                  {" · Domain presence; seat is not a Gate sublocation"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SpaceTokens({
  originX,
  originY,
  souls,
  visible,
  overflowCount,
  light = false,
}: {
  originX: number;
  originY: number;
  souls: number;
  visible: readonly BoardOccupantToken[];
  overflowCount: number;
  light?: boolean;
}) {
  const beads = visibleSoulBeadCount(souls);
  const fill = light ? "#e2e8f0" : "#4c1d95";
  return (
    <g data-soul-beads={souls}>
      {Array.from({ length: beads }, (_, index) => (
        <circle
          key={`bead-${index}`}
          cx={originX - 18 + index * 5}
          cy={originY}
          r={2}
          fill={fill}
        />
      ))}
      {souls > 0 && (
        <text x={originX + 22} y={originY + 3} textAnchor="start" fontSize={8} fill={fill}>
          {souls}
        </text>
      )}
      {visible.map((token, index) => (
        <g key={token.key}>
          <rect
            x={originX - 40 + index * 28}
            y={originY + 6}
            width={26}
            height={10}
            rx={2}
            fill={occupantFill(token.kind)}
          />
          <text x={originX - 27 + index * 28} y={originY + 14} textAnchor="middle" fontSize={6} fill="#f8fafc">
            {token.name.length > 4 ? `${token.name.slice(0, 4)}…` : token.name}
          </text>
        </g>
      ))}
      {overflowCount > 0 && (
        <text x={originX + 40} y={originY + 14} textAnchor="start" fontSize={7} fill={fill}>
          +{overflowCount}
        </text>
      )}
    </g>
  );
}
