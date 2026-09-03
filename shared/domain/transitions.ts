import type { MonthDirection, MonthOrdinal } from "./calendar";
import { advanceOrdinal } from "./calendar";
import type { CurrentCampaignState } from "./campaign-state";
import type { MonthChangedEventV1 } from "./events";
import { DomainError } from "./errors";

export interface MoveMonthTransitionResult {
  readonly nextState: CurrentCampaignState;
  readonly events: readonly [MonthChangedEventV1];
}

export function applyMoveMonth(
  state: CurrentCampaignState,
  direction: MonthDirection,
): MoveMonthTransitionResult {
  if (state.calendar.monthOrdinal === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Cannot move month: monthOrdinal is null (still in Setup)");
  }
  const fromOrdinal = state.calendar.monthOrdinal;
  const toOrdinal = advanceOrdinal(fromOrdinal, direction);

  const nextState: CurrentCampaignState = {
    ...state,
    calendar: { monthOrdinal: toOrdinal },
  };

  const event: MonthChangedEventV1 = {
    type: "month_changed",
    version: 1,
    data: {
      direction,
      fromOrdinal,
      toOrdinal,
    },
  };

  return { nextState, events: [event] };
}
