import type { MonthDirection, MonthOrdinal } from "./calendar";

export interface MonthChangedDataV1 {
  readonly direction: MonthDirection;
  readonly fromOrdinal: MonthOrdinal;
  readonly toOrdinal: MonthOrdinal;
}

export interface MonthChangedEventV1 {
  readonly type: "month_changed";
  readonly version: 1;
  readonly data: MonthChangedDataV1;
}

export type CampaignEvent = MonthChangedEventV1;
