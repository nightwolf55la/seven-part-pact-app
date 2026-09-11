import type { WizardId } from "./ids";

export interface WizardParticipantRef {
  readonly kind: "wizard";
  readonly wizardId: WizardId;
}

export interface DevilParticipantRef {
  readonly kind: "devil";
}

export type TimeParticipantRef = WizardParticipantRef | DevilParticipantRef;

export function isWizardParticipantRef(ref: TimeParticipantRef): ref is WizardParticipantRef {
  return ref.kind === "wizard";
}

export function isDevilParticipantRef(ref: TimeParticipantRef): ref is DevilParticipantRef {
  return ref.kind === "devil";
}

export function wizardIdOfParticipant(ref: TimeParticipantRef): WizardId | null {
  return ref.kind === "wizard" ? ref.wizardId : null;
}
