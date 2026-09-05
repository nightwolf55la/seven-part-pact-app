import type { WizardId } from "./ids";

export interface WizardParticipantRef {
  readonly kind: "wizard";
  readonly wizardId: WizardId;
}

export type TimeParticipantRef = WizardParticipantRef;
