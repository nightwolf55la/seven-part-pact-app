import type { WizardId } from "./ids";
import type { MonthOrdinal } from "./calendar";

export interface WizardmootAttendance {
  readonly wizardId: WizardId;
  readonly attended: boolean;
  readonly exceptionReason: string | null;
}

export interface WizardmootHistoryEntry {
  readonly monthOrdinal: MonthOrdinal;
  readonly attendance: readonly {
    readonly wizardId: WizardId;
    readonly attended: boolean;
  }[];
}
