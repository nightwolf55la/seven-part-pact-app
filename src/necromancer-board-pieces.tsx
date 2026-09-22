import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { NecromancerFoeSubjectRef, NecromancerOccupiableSpaceRef, NecromancerState } from "../shared/domain";
import {
  GHOUL_CALLER_EDGE_CONFINEMENT_MESSAGE,
  NECROMANCER_DIRECT_MOVE_OPERATIONS,
  NECROMANCER_STALE_INTENT_MESSAGE,
  boardPieceAriaLabel,
  compactBoardNameLines,
  occupiableRefKey,
  ordinaryDirectMoveDestinations,
  parseOccupiableRefKey,
  soulBeadAriaLabel,
  soulCountAt,
  visibleSoulBeadCount,
  type BoardOccupantToken,
  type NecromancerLocalFeedback,
} from "./necromancer-view-model";

const DRAG_THRESHOLD_PX = 8;

export type NecromancerBoardDirectMove =
  | {
      readonly kind: "foe";
      readonly pieceKey: string;
      readonly subject: NecromancerFoeSubjectRef;
      readonly from: NecromancerOccupiableSpaceRef;
      readonly to: NecromancerOccupiableSpaceRef;
    }
  | {
      readonly kind: "ally";
      readonly pieceKey: string;
      readonly denizenId: string;
      readonly from: NecromancerOccupiableSpaceRef;
      readonly to: NecromancerOccupiableSpaceRef;
    }
  | {
      readonly kind: "ghoul_caller";
      readonly pieceKey: string;
      readonly denizenId: string;
      readonly from: NecromancerOccupiableSpaceRef;
      readonly to: NecromancerOccupiableSpaceRef;
    }
  | {
      readonly kind: "soul";
      readonly pieceKey: string;
      readonly from: NecromancerOccupiableSpaceRef;
      readonly to: NecromancerOccupiableSpaceRef;
      readonly expectedFromCount: number;
      readonly expectedToCount: number;
    };

type DragKind = "foe" | "ally" | "ghoul_caller" | "soul";

interface DragSession {
  readonly pieceKey: string;
  readonly kind: DragKind;
  readonly from: NecromancerOccupiableSpaceRef;
  readonly startX: number;
  readonly startY: number;
  readonly pointerId: number;
  readonly expectedFromCount: number | null;
  readonly subject: NecromancerFoeSubjectRef | null;
  readonly denizenId: string | null;
  dragging: boolean;
}

const PIECE_FOCUS_CLASS =
  "outline-none focus:outline-none focus-visible:outline-none [&_[data-piece-focus]]:opacity-0 [&:focus-visible_[data-piece-focus]]:opacity-100";

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function occupiableKeyFromPoint(clientX: number, clientY: number): string | null {
  const node = document.elementFromPoint(clientX, clientY);
  if (!(node instanceof Element)) return null;
  return node.closest("[data-occupiable-key]")?.getAttribute("data-occupiable-key") ?? null;
}

export function useNecromancerBoardDrag({
  necromancer,
  onSelect,
  onDirectMove,
  onLocalReject,
}: {
  necromancer: NecromancerState;
  onSelect: (selection: { kind: "gate"; gateId: string } | { kind: "path"; pathSpaceId: string }) => void;
  onDirectMove: (move: NecromancerBoardDirectMove) => void;
  onLocalReject: (key: string, kind: "rejected" | "stale", message: string) => void;
}): {
  dragKey: string | null;
  hintKeys: ReadonlySet<string>;
  pointerHandlers: (args: {
    pieceKey: string;
    kind: DragKind;
    from: NecromancerOccupiableSpaceRef;
    subject?: NecromancerFoeSubjectRef;
    denizenId?: string;
  }) => {
    onPointerDown: (event: ReactPointerEvent<Element>) => void;
    onPointerMove: (event: ReactPointerEvent<Element>) => void;
    onPointerUp: (event: ReactPointerEvent<Element>) => void;
    onPointerCancel: (event: ReactPointerEvent<Element>) => void;
  };
} {
  const [session, setSession] = useState<DragSession | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const stateRef = useRef(necromancer);
  stateRef.current = necromancer;

  function selectFrom(from: NecromancerOccupiableSpaceRef): void {
    onSelect(from.kind === "gate"
      ? { kind: "gate", gateId: from.gateId }
      : { kind: "path", pathSpaceId: from.pathSpaceId });
  }

  function destinationHints(kind: DragKind, from: NecromancerOccupiableSpaceRef): ReadonlySet<string> {
    return new Set(
      ordinaryDirectMoveDestinations(kind, stateRef.current, from).map((space) => occupiableRefKey(space)),
    );
  }

  function finish(event: ReactPointerEvent<Element>): void {
    const currentSession = sessionRef.current;
    if (currentSession === null || currentSession.pointerId !== event.pointerId) return;
    const target = event.currentTarget;
    if (typeof target.hasPointerCapture === "function" && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    const dragged = currentSession.dragging;
    const from = currentSession.from;
    const pieceKey = currentSession.pieceKey;
    sessionRef.current = null;
    setSession(null);
    if (!dragged) {
      selectFrom(from);
      return;
    }
    const toKey = occupiableKeyFromPoint(event.clientX, event.clientY);
    const to = toKey === null ? null : parseOccupiableRefKey(toKey);
    if (to === null || occupiableRefKey(to) === occupiableRefKey(from)) {
      selectFrom(from);
      return;
    }
    const allowed = destinationHints(currentSession.kind, from);
    if (!allowed.has(occupiableRefKey(to))) {
      onLocalReject(
        pieceKey,
        "rejected",
        currentSession.kind === "ghoul_caller" ? GHOUL_CALLER_EDGE_CONFINEMENT_MESSAGE : "That space is not an ordinary destination for this piece.",
      );
      selectFrom(from);
      return;
    }
    const current = stateRef.current;
    if (currentSession.kind === "soul") {
      const currentFrom = soulCountAt(current.souls, from);
      if (currentSession.expectedFromCount !== currentFrom) {
        onLocalReject(pieceKey, "stale", NECROMANCER_STALE_INTENT_MESSAGE);
        selectFrom(from);
        return;
      }
      onDirectMove({
        kind: "soul",
        pieceKey,
        from,
        to,
        expectedFromCount: currentSession.expectedFromCount ?? currentFrom,
        expectedToCount: soulCountAt(current.souls, to),
      });
      selectFrom(from);
      return;
    }
    if (currentSession.kind === "foe" && currentSession.subject !== null) {
      const currentFoe = current.foes.find((foe) => {
        if (currentSession.subject?.kind === "denizen") {
          return foe.subject.kind === "denizen" && foe.subject.denizenId === currentSession.subject.denizenId;
        }
        return foe.subject.kind === "wizard" && currentSession.subject?.kind === "wizard"
          && foe.subject.wizardId === currentSession.subject.wizardId;
      });
      if (currentFoe === undefined || currentFoe.location.kind === "escaped"
        || occupiableRefKey(currentFoe.location) !== occupiableRefKey(from)) {
        onLocalReject(pieceKey, "stale", NECROMANCER_STALE_INTENT_MESSAGE);
        selectFrom(from);
        return;
      }
      onDirectMove({
        kind: "foe",
        pieceKey,
        subject: currentSession.subject,
        from,
        to,
      });
      selectFrom(from);
      return;
    }
    if (currentSession.kind === "ally" && currentSession.denizenId !== null) {
      const currentAlly = current.allies.find((ally) => ally.denizenId === currentSession.denizenId);
      if (currentAlly === undefined || occupiableRefKey(currentAlly.location) !== occupiableRefKey(from)) {
        onLocalReject(pieceKey, "stale", NECROMANCER_STALE_INTENT_MESSAGE);
        selectFrom(from);
        return;
      }
      onDirectMove({
        kind: "ally",
        pieceKey,
        denizenId: currentSession.denizenId,
        from,
        to,
      });
      selectFrom(from);
      return;
    }
    if (currentSession.kind === "ghoul_caller" && currentSession.denizenId !== null) {
      const currentGhoul = current.ghoulCallers.find((ghoul) => ghoul.denizenId === currentSession.denizenId);
      if (currentGhoul === undefined || occupiableRefKey(currentGhoul.location) !== occupiableRefKey(from)) {
        onLocalReject(pieceKey, "stale", NECROMANCER_STALE_INTENT_MESSAGE);
        selectFrom(from);
        return;
      }
      onDirectMove({
        kind: "ghoul_caller",
        pieceKey,
        denizenId: currentSession.denizenId,
        from,
        to,
      });
      selectFrom(from);
    }
  }

  return {
    dragKey: session?.dragging === true ? session.pieceKey : null,
    hintKeys: session?.dragging === true ? destinationHints(session.kind, session.from) : new Set<string>(),
    pointerHandlers({ pieceKey, kind, from, subject, denizenId }) {
      return {
        onPointerDown(event) {
          if (event.button !== 0) return;
          event.stopPropagation();
        {typeof event.currentTarget.setPointerCapture === "function" && event.currentTarget.setPointerCapture(event.pointerId);}
          const next: DragSession = {
            pieceKey,
            kind,
            from,
            startX: event.clientX,
            startY: event.clientY,
            pointerId: event.pointerId,
            expectedFromCount: kind === "soul" ? soulCountAt(stateRef.current.souls, from) : null,
            subject: subject ?? null,
            denizenId: denizenId ?? null,
            dragging: false,
          };
          sessionRef.current = next;
          setSession(next);
        },
        onPointerMove(event) {
          const currentSession = sessionRef.current;
          if (currentSession === null || currentSession.pointerId !== event.pointerId || currentSession.pieceKey !== pieceKey) {
            return;
          }
          event.stopPropagation();
          const dx = event.clientX - currentSession.startX;
          const dy = event.clientY - currentSession.startY;
          if (!currentSession.dragging && (dx * dx + dy * dy) >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
            const next = { ...currentSession, dragging: true };
            sessionRef.current = next;
            setSession(next);
          }
        },
        onPointerUp(event) {
          event.stopPropagation();
          finish(event);
        },
        onPointerCancel(event) {
          event.stopPropagation();
          finish(event);
        },
      };
    },
  };
}

function pieceFill(kind: BoardOccupantToken["kind"]): { fill: string; stroke: string } {
  if (kind === "foe") return { fill: "#7f1d1d", stroke: "#fecaca" };
  if (kind === "ally") return { fill: "#1e3a8a", stroke: "#bfdbfe" };
  if (kind === "ghoul_caller") return { fill: "#4a044e", stroke: "#f5d0fe" };
  return { fill: "#334155", stroke: "#cbd5e1" };
}

export function BoardNativePiece({
  token,
  x,
  y,
  feedback,
  dragging,
  light,
  onSelectSpace,
  pointerHandlers,
}: {
  token: BoardOccupantToken;
  x: number;
  y: number;
  from: NecromancerOccupiableSpaceRef;
  feedback: NecromancerLocalFeedback | null;
  dragging: boolean;
  light: boolean;
  onSelectSpace: () => void;
  pointerHandlers?: {
    onPointerDown: (event: ReactPointerEvent<Element>) => void;
    onPointerMove: (event: ReactPointerEvent<Element>) => void;
    onPointerUp: (event: ReactPointerEvent<Element>) => void;
    onPointerCancel: (event: ReactPointerEvent<Element>) => void;
  };
}) {
  const { fill, stroke } = pieceFill(token.kind);
  const lines = compactBoardNameLines(token.name);
  const movable = token.move.kind !== "none";
  const local = feedback?.key === token.key ? feedback : null;
  const width = 42;
  const height = token.kind === "ghoul_caller" ? 28 : 24;
  return (
    <g
      data-board-piece={token.kind}
      data-piece-key={token.key}
      data-role-label={token.roleLabel}
      data-direct-move-op={token.move.kind === "none" ? undefined : token.move.op}
      data-disposition={token.dispositionKind ?? undefined}
      data-piece-pending={local?.kind === "pending" ? "true" : undefined}
      data-piece-feedback={local?.kind}
      role="button"
      tabIndex={0}
      aria-label={boardPieceAriaLabel(token)}
      className={PIECE_FOCUS_CLASS}
      opacity={dragging || local?.kind === "pending" ? 0.55 : 1}
      style={{ outline: "none", cursor: movable ? "grab" : "pointer" }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectSpace();
      }}
      onKeyDown={(event) => activate(event, onSelectSpace)}
      {...(movable ? pointerHandlers : {})}
    >
      {token.kind === "foe" && (
        <polygon
          points={`${x},${y - 12} ${x + 20},${y} ${x},${y + 12} ${x - 20},${y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      )}
      {token.kind === "ally" && (
        <ellipse cx={x} cy={y} rx={20} ry={12} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )}
      {token.kind === "ghoul_caller" && (
        <polygon
          points={`${x - 18},${y} ${x - 10},${y - 13} ${x + 10},${y - 13} ${x + 18},${y} ${x + 10},${y + 13} ${x - 10},${y + 13}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      )}
      {token.kind === "wizard_traversal" && (
        <rect x={x - 20} y={y - 10} width={40} height={20} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )}
      <rect
        data-piece-focus
        x={x - width / 2 - 2}
        y={y - height / 2 - 2}
        width={width + 4}
        height={height + 4}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={2}
        pointerEvents="none"
      />
      {lines.map((line, index) => (
        <text
          key={`${token.key}-n-${index}`}
          x={x}
          y={y - 3 + index * 7}
          textAnchor="middle"
          fontSize={6}
          fontWeight={700}
          fill="#f8fafc"
        >
          {line}
        </text>
      ))}
      <text x={x} y={y + (lines.length > 1 ? 10 : 8)} textAnchor="middle" fontSize={5} fill={light ? "#e2e8f0" : "#fde68a"}>
        {token.roleLabel}
        {token.dispositionLabel !== null ? ` · ${token.dispositionLabel}` : ""}
      </text>
    </g>
  );
}

export function SoulBeadPiece({
  index,
  souls,
  x,
  y,
  pieceKey,
  feedback,
  dragging,
  light,
  onSelectSpace,
  pointerHandlers,
}: {
  index: number;
  souls: number;
  x: number;
  y: number;
  from: NecromancerOccupiableSpaceRef;
  pieceKey: string;
  feedback: NecromancerLocalFeedback | null;
  dragging: boolean;
  light: boolean;
  onSelectSpace: () => void;
  pointerHandlers: {
    onPointerDown: (event: ReactPointerEvent<Element>) => void;
    onPointerMove: (event: ReactPointerEvent<Element>) => void;
    onPointerUp: (event: ReactPointerEvent<Element>) => void;
    onPointerCancel: (event: ReactPointerEvent<Element>) => void;
  };
}) {
  const local = feedback?.key === pieceKey ? feedback : null;
  return (
    <g
      data-board-piece="soul"
      data-piece-key={pieceKey}
      data-direct-move-op={NECROMANCER_DIRECT_MOVE_OPERATIONS.soul.command}
      data-piece-pending={local?.kind === "pending" ? "true" : undefined}
      data-piece-feedback={local?.kind}
      role="button"
      tabIndex={0}
      aria-label={soulBeadAriaLabel(index, souls)}
      className={PIECE_FOCUS_CLASS}
      opacity={dragging || local?.kind === "pending" ? 0.5 : 1}
      style={{ outline: "none", cursor: "grab" }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectSpace();
      }}
      onKeyDown={(event) => activate(event, onSelectSpace)}
      {...pointerHandlers}
    >
      <circle
        data-soul-bead
        cx={x}
        cy={y}
        r={4}
        fill={light ? "#e2e8f0" : "#5b21b6"}
        stroke={light ? "#94a3b8" : "#ddd6fe"}
        strokeWidth={1}
      />
      <circle
        data-piece-focus
        cx={x}
        cy={y}
        r={6}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={2}
        pointerEvents="none"
      />
    </g>
  );
}

export function SpaceOccupants({
  originX,
  originY,
  from,
  souls,
  visible,
  overflowCount,
  light = false,
  feedback,
  dragKey,
  onSelectSpace,
  piecePointerHandlers,
  soulPointerHandlers,
}: {
  originX: number;
  originY: number;
  from: NecromancerOccupiableSpaceRef;
  souls: number;
  visible: readonly BoardOccupantToken[];
  overflowCount: number;
  light?: boolean;
  feedback: NecromancerLocalFeedback | null;
  dragKey: string | null;
  onSelectSpace: () => void;
  piecePointerHandlers: (token: BoardOccupantToken) => {
    onPointerDown: (event: ReactPointerEvent<Element>) => void;
    onPointerMove: (event: ReactPointerEvent<Element>) => void;
    onPointerUp: (event: ReactPointerEvent<Element>) => void;
    onPointerCancel: (event: ReactPointerEvent<Element>) => void;
  };
  soulPointerHandlers: (pieceKey: string) => {
    onPointerDown: (event: ReactPointerEvent<Element>) => void;
    onPointerMove: (event: ReactPointerEvent<Element>) => void;
    onPointerUp: (event: ReactPointerEvent<Element>) => void;
    onPointerCancel: (event: ReactPointerEvent<Element>) => void;
  };
}) {
  const fill = light ? "#e2e8f0" : "#4c1d95";
  const beads = visibleSoulBeadCount(souls);
  return (
    <g data-soul-beads={souls} pointerEvents="none">
      {Array.from({ length: beads }, (_, index) => {
        const pieceKey = `soul:${occupiableRefKey(from)}:${index}`;
        return (
          <g key={pieceKey} pointerEvents="auto">
            <SoulBeadPiece
              index={index}
              souls={souls}
              x={originX - 18 + index * 9}
              y={originY}
              from={from}
              pieceKey={pieceKey}
              feedback={feedback}
              dragging={dragKey === pieceKey}
              light={light}
              onSelectSpace={onSelectSpace}
              pointerHandlers={soulPointerHandlers(pieceKey)}
            />
          </g>
        );
      })}
      {souls > 0 && (
        <text x={originX + 22} y={originY + 3} textAnchor="start" fontSize={8} fill={fill}>
          {souls}
        </text>
      )}
      {visible.map((token, index) => (
        <g key={token.key} pointerEvents="auto">
          <BoardNativePiece
            token={token}
            x={originX - 24 + index * 46}
            y={originY + 18}
            from={from}
            feedback={feedback}
            dragging={dragKey === token.key}
            light={light}
            onSelectSpace={onSelectSpace}
            pointerHandlers={piecePointerHandlers(token)}
          />
        </g>
      ))}
      {overflowCount > 0 && (
        <text x={originX + 46} y={originY + 22} textAnchor="start" fontSize={7} fill={fill}>
          +{overflowCount}
        </text>
      )}
    </g>
  );
}
