import { PACT_SEAT_IDS, pactSeatDisplayName } from "../shared/domain/pact-seats";
import type { PactSeatId } from "../shared/domain/pact-seats";
import type { PactSeatStatus } from "../shared/domain/campaign-state";

export interface PlayerRef {
  readonly playerId: string;
  readonly name: string;
}

export interface WizardRef {
  readonly wizardId: string;
  readonly name: string;
  readonly portrayedByPlayerId: string | null;
}

export interface SeatRef {
  readonly status: string | null;
  readonly wizardId: string | null;
  readonly watcherPlayerId: string | null;
}

export interface SeatDisplayRow {
  readonly seatId: PactSeatId;
  readonly seatName: string;
  readonly statusLabel: string;
  readonly wizardName: string | null;
  readonly portrayedByPlayerName: string | null;
  readonly watcherPlayerName: string | null;
}

function statusLabel(status: string | null): string {
  if (status === "present") return "Present";
  if (status === "silent") return "Silent";
  if (status === "absent") return "Absent";
  return "Not configured";
}

export function buildTableWizardsRows(
  pactSeats: Readonly<Record<string, SeatRef>>,
  players: readonly PlayerRef[],
  wizards: readonly WizardRef[],
): readonly SeatDisplayRow[] {
  const playerMap = new Map(players.map((p) => [p.playerId, p.name]));
  const wizardMap = new Map(wizards.map((w) => [w.wizardId, { name: w.name, portrayedBy: w.portrayedByPlayerId }]));

  return PACT_SEAT_IDS.map((seatId) => {
    const seat = pactSeats[seatId] ?? { status: null, wizardId: null, watcherPlayerId: null };
    const wizard = seat.wizardId !== null ? wizardMap.get(seat.wizardId) ?? null : null;
    const portrayedByPlayerName = wizard?.portrayedBy ?? null;
    return {
      seatId,
      seatName: pactSeatDisplayName(seatId),
      statusLabel: statusLabel(seat.status),
      wizardName: wizard?.name ?? null,
      portrayedByPlayerName: portrayedByPlayerName !== null ? playerMap.get(portrayedByPlayerName) ?? null : null,
      watcherPlayerName: seat.watcherPlayerId !== null ? playerMap.get(seat.watcherPlayerId) ?? null : null,
    };
  });
}
