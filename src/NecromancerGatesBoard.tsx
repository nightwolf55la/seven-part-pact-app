import type { KeyboardEvent } from "react";
import {
  isValidNecromancerBuiltinGateId,
  isValidNecromancerBuiltinPathSpaceId,
  type NecromancerState,
  type SorcererExternalPresence,
} from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
import { NecromancerGateShape } from "./NecromancerGateShape";
import { NECROMANCER_SOURCE_BOARD } from "./source-board-assets";
import {
  NECROMANCER_INTERACTION_GEOMETRY_RAW,
  SourceGeometrySprite,
  necromancerGateSymbolId,
  necromancerPathSymbolId,
} from "./source-interaction-geometry";
import {
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_GATE_MAP_POINTS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_BUILTIN_PATH_MAP_POINTS,
  NECROMANCER_STATIC_TERMINAL_PRESENTATIONS,
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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-2 overflow-hidden">
        <svg
          role="img"
          aria-label="Gates of Death board"
          data-necromancer-board
          viewBox={`0 0 ${NECROMANCER_SOURCE_BOARD.width} ${NECROMANCER_SOURCE_BOARD.height}`}
          className="mx-auto block h-auto w-full max-w-[min(100%,calc(100vh-18rem))] text-slate-800 dark:text-slate-100"
        >
          <defs>
            <pattern id="nec-hostile-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#fff7ed" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#9a3412" strokeWidth="3" />
            </pattern>
            <pattern id="nec-destroyed-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
              <rect width="6" height="6" fill="#0f172a" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="#64748b" strokeWidth="2" />
            </pattern>
          </defs>
          <image
            data-necromancer-source-board
            href={NECROMANCER_SOURCE_BOARD.href}
            x={0}
            y={0}
            width={NECROMANCER_SOURCE_BOARD.width}
            height={NECROMANCER_SOURCE_BOARD.height}
            aria-hidden="true"
          />
          <SourceGeometrySprite raw={NECROMANCER_INTERACTION_GEOMETRY_RAW} label="necromancer" />
          {finalDeath !== undefined && researchers.map((researcher, index) => (
            <g
              key={researcher.denizenId}
              data-researcher-target="necromancer_final_death"
              aria-label={`${researcher.name} at Final Death, ${researcherOperationalLabel(researcher.operationalThisMonth)}`}
            >
              <rect
                x={finalDeath.toPoint.x - 70}
                y={finalDeath.toPoint.y + 8 + index * 34}
                width={140}
                height={30}
                rx={6}
                fill="#eef2ff"
                stroke="#4338ca"
                strokeWidth={1.5}
              />
              <text x={finalDeath.toPoint.x} y={finalDeath.toPoint.y + 20 + index * 34} textAnchor="middle" fontSize={9} fill="#312e81">
                {researcher.name}
              </text>
              <text x={finalDeath.toPoint.x} y={finalDeath.toPoint.y + 32 + index * 34} textAnchor="middle" fontSize={8} fill="#4338ca">
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
            const sourceHref = isValidNecromancerBuiltinPathSpaceId(pathSpaceId)
              ? `#${necromancerPathSymbolId(pathSpaceId)}`
              : null;
            const symbolId = isValidNecromancerBuiltinPathSpaceId(pathSpaceId)
              ? necromancerPathSymbolId(pathSpaceId)
              : null;
            return (
              <g
                key={pathSpaceId}
                role="button"
                tabIndex={0}
                aria-label={`${label}. ${occupantSummaryLabel(tokens, pieces.souls)}`}
                onClick={() => onSelect({ kind: "path", pathSpaceId })}
                onKeyDown={(event) => activate(event, () => onSelect({ kind: "path", pathSpaceId }))}
              >
                {sourceHref !== null && symbolId !== null ? (
                  <>
                    <circle cx={point.x} cy={point.y} r={14} fill="transparent" stroke="transparent" />
                    <use
                      href={sourceHref}
                      fill={selected ? "#ddd6fe" : "transparent"}
                      stroke={selected ? "#4c1d95" : "transparent"}
                      strokeWidth={selected ? 3 : 0}
                    />
                    {selected && (
                      <use
                        href={sourceHref}
                        data-selection-halo
                        data-source-geometry={symbolId}
                        fill="none"
                        stroke="#6d28d9"
                        strokeWidth={4}
                        opacity={0.45}
                        pointerEvents="none"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={14}
                      fill={selected ? "#ddd6fe" : "transparent"}
                      stroke={selected ? "#4c1d95" : "transparent"}
                      strokeWidth={selected ? 3 : 0}
                    />
                    {selected && (
                      <circle
                        data-selection-halo
                        cx={point.x}
                        cy={point.y}
                        r={18}
                        fill="none"
                        stroke="#6d28d9"
                        strokeWidth={4}
                        opacity={0.4}
                        pointerEvents="none"
                      />
                    )}
                  </>
                )}
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
                : selected ? "rgba(221,214,254,0.35)" : "transparent";
            const textFill = status === "destroyed" ? "#e2e8f0" : "#0f172a";
            const stroke = status === "destroyed" ? "#94a3b8" : status === "hostile" ? "#9a3412" : selected ? "#5b21b6" : "transparent";
            const warning = fivePlusSoulWarning(pieces.souls);
            const transformEligible = canTransformSoulIntoAlly(gate, pieces.souls);
            const builtin = isValidNecromancerBuiltinGateId(gateId);
            const symbolId = builtin ? necromancerGateSymbolId(gateId) : null;
            const sourceHref = symbolId !== null ? `#${symbolId}` : null;
            return (
              <g
                key={gateId}
                role="button"
                tabIndex={0}
                aria-label={gateBoardAriaLabel(gate) + `. ${occupantSummaryLabel(tokens, pieces.souls)}${transformEligible ? ". Transform Soul into Ally available." : ""}`}
                onClick={() => onSelect({ kind: "gate", gateId })}
                onKeyDown={(event) => activate(event, () => onSelect({ kind: "gate", gateId }))}
              >
                {sourceHref !== null && symbolId !== null ? (
                  <>
                    <use
                      href={sourceHref}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={selected ? 3 : 2}
                      strokeDasharray={status === "destroyed" ? "5 4" : undefined}
                    />
                    {selected && (
                      <use
                        href={sourceHref}
                        data-selection-halo
                        data-source-geometry={symbolId}
                        fill="none"
                        stroke="#6d28d9"
                        strokeWidth={5}
                        opacity={0.45}
                        pointerEvents="none"
                      />
                    )}
                  </>
                ) : (
                  <>
                    {selected && (
                      <ellipse
                        data-selection-halo
                        cx={point.x}
                        cy={point.y}
                        rx={56}
                        ry={68}
                        fill="none"
                        stroke="#6d28d9"
                        strokeWidth={5}
                        opacity={0.4}
                        pointerEvents="none"
                      />
                    )}
                    <NecromancerGateShape
                      x={point.x}
                      y={point.y}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={selected ? 3 : 2}
                      strokeDasharray={status === "destroyed" ? "5 4" : undefined}
                    />
                  </>
                )}
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={gate.origin === "builtin" ? "transparent" : textFill}
                >
                  {gateBoardTitle(gate)}
                </text>
                <text x={point.x} y={point.y + 8} textAnchor="middle" fontSize={8} fill={textFill}>
                  {status === "ordinary" ? "" : status === "hostile" ? "Hostile" : "Destroyed"}
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
