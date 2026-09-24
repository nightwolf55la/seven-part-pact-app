/** Shared visible pending contract for map pieces (deterministic tests + player feedback). */
export const MARINER_BOARD_ACTION_PENDING_CLASS = "mariner-board-action-pending";

export function marinerBoardPendingPresentation(
  pending: boolean,
): {
  className?: string;
  "aria-busy"?: true;
  "data-board-action-pending"?: "true";
} {
  if (!pending) {
    return {};
  }
  return {
    className: MARINER_BOARD_ACTION_PENDING_CLASS,
    "aria-busy": true,
    "data-board-action-pending": "true",
  };
}

export function MarinerBoardPendingRing({ radius = 16 }: { radius?: number }) {
  return (
    <circle
      className="mariner-board-action-pending-ring"
      r={radius}
      cx={0}
      cy={0}
    />
  );
}
