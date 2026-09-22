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
  SpaceOccupants,
  useNecromancerBoardDrag,
  type NecromancerBoardDirectMove,
} from "./necromancer-board-pieces";
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
  occupiableRefKey,
  occupantSummaryLabel,
  piecesAtSpace,
  researcherOperationalLabel,
  visibleOccupantTokens,
  type NecromancerLocalFeedback,
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

const INTERACTIVE_FOCUS_CLASS =
  "outline-none focus:outline-none focus-visible:outline-none [&_[data-focus-ring]]:opacity-0 [&:focus-visible_[data-focus-ring]]:opacity-100";

function gateFramePresentation(status: "ordinary" | "hostile" | "destroyed", selected: boolean): {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: string | undefined;
} {
  if (status === "destroyed") {
    return {
      fill: "url(#nec-destroyed-hatch)",
      stroke: selected ? "#e2e8f0" : "#94a3b8",
      strokeWidth: selected ? 4 : 3,
      dash: "6 5",
    };
  }
  if (status === "hostile") {
    return {
      fill: "url(#nec-hostile-hatch)",
      stroke: selected ? "#7c2d12" : "#c2410c",
      strokeWidth: selected ? 4 : 3,
      dash: undefined,
    };
  }
  return {
    fill: selected ? "rgba(221,214,254,0.35)" : "transparent",
    stroke: selected ? "#5b21b6" : "transparent",
    strokeWidth: selected ? 3 : 2,
    dash: undefined,
  };
}

export default function NecromancerGatesBoard({
  necromancer,
  world,
  wizards,
  selection,
  onSelect,
  sorcererPresence,
  localFeedback = null,
  onDirectMove,
  onLocalReject,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
  wizards: readonly NecromancerWizardNameRef[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  sorcererPresence: readonly SorcererExternalPresence[];
  localFeedback?: NecromancerLocalFeedback | null;
  onDirectMove: (move: NecromancerBoardDirectMove) => void;
  onLocalReject: (key: string, kind: "rejected" | "stale", message: string) => void;
}) {
  const finalDeath = NECROMANCER_STATIC_TERMINAL_PRESENTATIONS.find((exit) => exit.terminalId === "final_death");
  const researchers = finalDeathResearchers(sorcererPresence);
  const disruptive = necromancerDomainDisruptiveArcanists(sorcererPresence);
  const { dragKey, hintKeys, pointerHandlers } = useNecromancerBoardDrag({
    necromancer,
    onSelect,
    onDirectMove,
    onLocalReject,
  });

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-2 overflow-hidden">
        {localFeedback !== null && (
          <p
            data-board-local-feedback
            role={localFeedback.kind === "pending" ? "status" : "alert"}
            className="px-2 pb-1 text-xs text-amber-800 dark:text-amber-200"
          >
            {localFeedback.message}
          </p>
        )}
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
            const occupiableKey = occupiableRefKey(location);
            const dropHint = hintKeys.has(occupiableKey);
            const select = () => onSelect({ kind: "path", pathSpaceId });
            return (
              <g key={pathSpaceId} data-occupiable-cluster={occupiableKey}>
                <g
                  role="button"
                  tabIndex={0}
                  data-occupiable-key={occupiableKey}
                  data-drop-hint={dropHint ? "true" : undefined}
                  aria-label={`${label}. ${occupantSummaryLabel(tokens, pieces.souls)}`}
                  className={INTERACTIVE_FOCUS_CLASS}
                  style={{ outline: "none" }}
                  onClick={select}
                  onKeyDown={(event) => activate(event, select)}
                >
                  {sourceHref !== null && symbolId !== null ? (
                    <>
                      <circle cx={point.x} cy={point.y} r={14} fill="transparent" stroke="transparent" />
                      <use
                        href={sourceHref}
                        fill={selected ? "#ddd6fe" : dropHint ? "rgba(167,139,250,0.35)" : "transparent"}
                        stroke={selected ? "#4c1d95" : dropHint ? "#6d28d9" : "transparent"}
                        strokeWidth={selected || dropHint ? 3 : 0}
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
                      <use
                        href={sourceHref}
                        data-focus-ring
                        data-source-geometry={symbolId}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth={5}
                        pointerEvents="none"
                      />
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
                      <circle
                        data-focus-ring
                        cx={point.x}
                        cy={point.y}
                        r={18}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth={5}
                        pointerEvents="none"
                      />
                    </>
                  )}
                </g>
                <SpaceOccupants
                  originX={point.x}
                  originY={point.y + 10}
                  from={location}
                  souls={pieces.souls}
                  visible={visible}
                  overflowCount={overflowCount}
                  feedback={localFeedback}
                  dragKey={dragKey}
                  onSelectSpace={select}
                  piecePointerHandlers={(token) => pointerHandlers({
                    pieceKey: token.key,
                    kind: token.move.kind === "none" ? "foe" : token.move.kind,
                    from: location,
                    subject: token.move.kind === "foe" ? token.move.subject : undefined,
                    denizenId: token.move.kind === "ally" || token.move.kind === "ghoul_caller" ? token.move.denizenId : undefined,
                  })}
                  soulPointerHandlers={(pieceKey) => pointerHandlers({
                    pieceKey,
                    kind: "soul",
                    from: location,
                  })}
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
            const frame = gateFramePresentation(status, selected);
            const textFill = status === "destroyed" ? "#e2e8f0" : status === "hostile" ? "#7c2d12" : "#0f172a";
            const warning = fivePlusSoulWarning(pieces.souls);
            const transformEligible = canTransformSoulIntoAlly(gate, pieces.souls);
            const builtin = isValidNecromancerBuiltinGateId(gateId);
            const symbolId = builtin ? necromancerGateSymbolId(gateId) : null;
            const sourceHref = symbolId !== null ? `#${symbolId}` : null;
            const occupiableKey = occupiableRefKey(location);
            const dropHint = hintKeys.has(occupiableKey);
            const select = () => onSelect({ kind: "gate", gateId });
            return (
              <g key={gateId} data-occupiable-cluster={occupiableKey}>
                <g
                  role="button"
                  tabIndex={0}
                  data-occupiable-key={occupiableKey}
                  data-gate-status={status}
                  data-gate-frame={status}
                  data-drop-hint={dropHint ? "true" : undefined}
                  aria-label={gateBoardAriaLabel(gate) + `. ${occupantSummaryLabel(tokens, pieces.souls)}${transformEligible ? ". Transform Soul into Ally available." : ""}`}
                  className={INTERACTIVE_FOCUS_CLASS}
                  style={{ outline: "none" }}
                  onClick={select}
                  onKeyDown={(event) => activate(event, select)}
                >
                  {sourceHref !== null && symbolId !== null ? (
                    <>
                      {status === "hostile" && (
                        <use
                          href={sourceHref}
                          data-gate-frame-halo="hostile"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth={8}
                          opacity={0.55}
                          pointerEvents="none"
                        />
                      )}
                      {status === "destroyed" && (
                        <use
                          href={sourceHref}
                          data-gate-frame-halo="destroyed"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth={7}
                          strokeDasharray="7 6"
                          opacity={0.9}
                          pointerEvents="none"
                        />
                      )}
                      <use
                        href={sourceHref}
                        fill={dropHint && status === "ordinary" ? "rgba(167,139,250,0.35)" : frame.fill}
                        stroke={frame.stroke}
                        strokeWidth={frame.strokeWidth}
                        strokeDasharray={frame.dash}
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
                      <use
                        href={sourceHref}
                        data-focus-ring
                        data-source-geometry={symbolId}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth={6}
                        pointerEvents="none"
                      />
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
                        fill={frame.fill}
                        stroke={frame.stroke}
                        strokeWidth={frame.strokeWidth}
                        strokeDasharray={frame.dash}
                      />
                      <ellipse
                        data-focus-ring
                        cx={point.x}
                        cy={point.y}
                        rx={56}
                        ry={68}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth={6}
                        pointerEvents="none"
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
                  {status !== "ordinary" && (
                    <g data-gate-status-chip={status} pointerEvents="none">
                      <rect
                        x={point.x - 34}
                        y={point.y - 2}
                        width={68}
                        height={14}
                        rx={3}
                        fill={status === "hostile" ? "#9a3412" : "#1e293b"}
                        stroke={status === "hostile" ? "#fdba74" : "#cbd5e1"}
                        strokeWidth={status === "destroyed" ? 1.25 : 1}
                        strokeDasharray={status === "destroyed" ? "3 2" : undefined}
                      />
                      <text
                        x={point.x}
                        y={point.y + 8}
                        textAnchor="middle"
                        fontSize={8}
                        fontWeight={700}
                        fill={status === "hostile" ? "#fff7ed" : "#e2e8f0"}
                      >
                        {status === "hostile" ? "Hostile" : "Destroyed"}
                      </text>
                    </g>
                  )}
                </g>
                <SpaceOccupants
                  originX={point.x}
                  originY={point.y + 18}
                  from={location}
                  souls={pieces.souls}
                  visible={visible}
                  overflowCount={overflowCount}
                  light={status === "destroyed"}
                  feedback={localFeedback}
                  dragKey={dragKey}
                  onSelectSpace={select}
                  piecePointerHandlers={(token) => pointerHandlers({
                    pieceKey: token.key,
                    kind: token.move.kind === "none" ? "foe" : token.move.kind,
                    from: location,
                    subject: token.move.kind === "foe" ? token.move.subject : undefined,
                    denizenId: token.move.kind === "ally" || token.move.kind === "ghoul_caller" ? token.move.denizenId : undefined,
                  })}
                  soulPointerHandlers={(pieceKey) => pointerHandlers({
                    pieceKey,
                    kind: "soul",
                    from: location,
                  })}
                />
                {warning !== null && (
                  <text x={point.x} y={point.y + 52} textAnchor="middle" fontSize={7} fill={status === "destroyed" ? "#fecaca" : "#9a3412"}>
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
