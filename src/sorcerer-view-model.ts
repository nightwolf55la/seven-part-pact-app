import type {
  DenizenId,
  PowerfulDenizenTruthId,
  WizardId,
} from "../shared/domain";
import {
  ELEMENT_IDS,
  GRIMOIRE_SPELL_DEFINITIONS,
  PACT_SEAT_IDS,
  SORCERER_BUILTIN_ALCHEMICAL_RECIPE_DEFINITIONS,
  SORCERER_LAW_OF_MAGIC_DEFINITIONS,
  SORCERER_SOURCE_SCHOOL_DEFINITIONS,
  pactSeatDisplayName,
  sorcererSourceReagentDefinition,
  sorcererSourceSchoolDefinition,
  type GrimoireSpellId,
  type MagicSchoolRef,
  type PactSeatId,
  type SorcererBoardResearchPosition,
  type SorcererBoardTowerOccupant,
  type SorcererBoardTomeStack,
  type SorcererBoardReagentStack,
  type SorcererBoardWizardConsumables,
  type SorcererKnowledgePoolId,
  type SorcererKnowledgeState,
  type SorcererPersonnelRoleDestination,
  type SorcererResearcherRefocusDestination,
  type SorcererStudentTutorDestination,
  type SorcererTowerMagicConsumableDirection,
  type SorcererTowerMagicConsumableItem,
  type SorcererResearchPositionTarget,
  type SorcererSourceReagentId,
  type SorcererSourceSchoolId,
} from "../shared/domain";

export function newCommandId(uuid: string = crypto.randomUUID()): string {
  return `cmd_${uuid}`;
}

export function newDenizenId(uuid: string = crypto.randomUUID()): DenizenId {
  return `den_${uuid}` as DenizenId;
}

export function visualTowerOccupants(
  occupants: readonly SorcererBoardTowerOccupant[],
): readonly SorcererBoardTowerOccupant[] {
  return [...occupants].reverse();
}

export function visualTowerBands(occupants: readonly SorcererBoardTowerOccupant[]): {
  readonly arcanists: readonly SorcererBoardTowerOccupant[];
  readonly academics: readonly SorcererBoardTowerOccupant[];
  readonly students: readonly SorcererBoardTowerOccupant[];
} {
  const visual = visualTowerOccupants(occupants);
  return {
    arcanists: visual.filter(isReliableArcanistOccupant),
    academics: visual.filter(isNonStudentAcademicOccupant),
    students: visual.filter(isStudentOccupant),
  };
}

export function isStudentOccupant(occupant: SorcererBoardTowerOccupant): boolean {
  return occupant.role.kind === "student";
}

export function isNonStudentAcademicOccupant(occupant: SorcererBoardTowerOccupant): boolean {
  return occupant.role.kind !== "student" && occupant.role.kind !== "reliable_tower_arcanist";
}

export function isReliableArcanistOccupant(occupant: SorcererBoardTowerOccupant): boolean {
  return occupant.role.kind === "reliable_tower_arcanist";
}

export function academicOccupants(
  occupants: readonly SorcererBoardTowerOccupant[],
): readonly SorcererBoardTowerOccupant[] {
  return occupants.filter((occupant) => !isReliableArcanistOccupant(occupant));
}

export function academicOrderFromOccupants(
  occupants: readonly SorcererBoardTowerOccupant[],
): readonly DenizenId[] {
  return academicOccupants(occupants).map((occupant) => occupant.denizenId);
}

export function reliableArcanistOccupants(
  occupants: readonly SorcererBoardTowerOccupant[],
): readonly SorcererBoardTowerOccupant[] {
  return occupants.filter(isReliableArcanistOccupant);
}

export type ResearchOutpostGroupId =
  | "orrery"
  | "temple"
  | "court"
  | "sea"
  | "future"
  | "devil"
  | "death"
  | "campaign";

export const RESEARCH_OUTPOST_GROUP_ORDER: readonly ResearchOutpostGroupId[] = [
  "orrery",
  "court",
  "sea",
  "devil",
  "temple",
  "future",
  "death",
  "campaign",
];

export const LEFT_RESEARCH_OUTPOST_GROUPS: readonly ResearchOutpostGroupId[] = [
  "orrery",
  "court",
  "sea",
  "devil",
];

export const RIGHT_RESEARCH_OUTPOST_GROUPS: readonly ResearchOutpostGroupId[] = [
  "temple",
  "future",
  "death",
  "campaign",
];

export function researchOutpostGroupId(
  target: SorcererResearchPositionTarget,
): ResearchOutpostGroupId {
  switch (target.kind) {
    case "orrery_house":
      return "orrery";
    case "hierophant_temple":
      return "temple";
    case "warlock_ideology":
      return "court";
    case "mariner_sea_region":
      return "sea";
    case "sage_future_of_pact":
      return "future";
    case "faustian_devils_schemes":
      return "devil";
    case "necromancer_final_death":
      return "death";
    case "campaign_knowledge_method":
      return "campaign";
  }
}

export function researchOutpostGroupLabel(groupId: ResearchOutpostGroupId): string {
  switch (groupId) {
    case "orrery":
      return "Orrery";
    case "temple":
      return "Temples";
    case "court":
      return "Court";
    case "sea":
      return "Seas";
    case "future":
      return "Future of the Pact";
    case "devil":
      return "Devil's Schemes";
    case "death":
      return "Final Death";
    case "campaign":
      return "Campaign Research";
  }
}

export interface ResearchOutpostGroup {
  readonly groupId: ResearchOutpostGroupId;
  readonly label: string;
  readonly positions: readonly SorcererBoardResearchPosition[];
}

export function groupResearchPositions(
  positions: readonly SorcererBoardResearchPosition[],
): readonly ResearchOutpostGroup[] {
  const buckets = new Map<ResearchOutpostGroupId, SorcererBoardResearchPosition[]>();
  for (const groupId of RESEARCH_OUTPOST_GROUP_ORDER) {
    buckets.set(groupId, []);
  }
  for (const position of positions) {
    const groupId = researchOutpostGroupId(position.target);
    buckets.get(groupId)!.push(position);
  }
  return RESEARCH_OUTPOST_GROUP_ORDER
    .map((groupId) => ({
      groupId,
      label: researchOutpostGroupLabel(groupId),
      positions: buckets.get(groupId) ?? [],
    }))
    .filter((group) => group.positions.length > 0);
}

export function vacantResearchPositions(
  positions: readonly SorcererBoardResearchPosition[],
): readonly SorcererBoardResearchPosition[] {
  return positions.filter((position) => position.occupant === null);
}

export function buildRecruitStudentPayload(args: {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly description: string;
  readonly towerOrder: readonly DenizenId[];
}): {
  readonly subject: {
    readonly kind: "create_denizen";
    readonly denizenId: DenizenId;
    readonly name: string;
    readonly representation: "individual";
    readonly description: string | null;
  };
  readonly destination: { readonly kind: "student" };
  readonly expectedTowerOrder: readonly DenizenId[];
  readonly nextAcademicOrder?: undefined;
} {
  return {
    subject: {
      kind: "create_denizen",
      denizenId: args.denizenId,
      name: args.name.trim(),
      representation: "individual",
      description: args.description.trim().length === 0 ? null : args.description.trim(),
    },
    destination: { kind: "student" },
    expectedTowerOrder: args.towerOrder,
  };
}

export function buildRefocusToPositionPayload(args: {
  readonly denizenId: DenizenId;
  readonly expectedPositionId: SorcererBoardResearchPosition["positionId"];
  readonly destinationPositionId: SorcererBoardResearchPosition["positionId"];
}): {
  readonly denizenId: DenizenId;
  readonly expectedPositionId: SorcererBoardResearchPosition["positionId"];
  readonly destination: Extract<SorcererResearcherRefocusDestination, { kind: "research_position" }>;
} {
  return {
    denizenId: args.denizenId,
    expectedPositionId: args.expectedPositionId,
    destination: { kind: "research_position", positionId: args.destinationPositionId },
  };
}

function occupantById(
  occupants: readonly SorcererBoardTowerOccupant[],
  denizenId: DenizenId,
): SorcererBoardTowerOccupant | undefined {
  return occupants.find((occupant) => occupant.denizenId === denizenId);
}

function isStudentId(
  occupants: readonly SorcererBoardTowerOccupant[],
  denizenId: DenizenId,
): boolean {
  return occupantById(occupants, denizenId)?.role.kind === "student";
}

export function insertAcademicIntoNonStudentBand(
  occupants: readonly SorcererBoardTowerOccupant[],
  newDenizenId: DenizenId,
  insertionIndex: number,
): readonly DenizenId[] {
  const academicOrder = academicOrderFromOccupants(occupants);
  const studentCount = academicOrder.filter((id) => isStudentId(occupants, id)).length;
  if (insertionIndex < 0) {
    throw new Error("Cannot insert into the Student band");
  }
  const maxIndex = academicOrder.length - studentCount;
  if (insertionIndex > maxIndex) {
    throw new Error("Cannot insert into the Student band");
  }
  const insertAt = studentCount + insertionIndex;
  return [...academicOrder.slice(0, insertAt), newDenizenId, ...academicOrder.slice(insertAt)];
}

export function academicInsertionChoices(
  occupants: readonly SorcererBoardTowerOccupant[],
): readonly { readonly insertionIndex: number; readonly label: string }[] {
  const nonStudents = occupants.filter(isNonStudentAcademicOccupant);
  const choices: { insertionIndex: number; label: string }[] = [{
    insertionIndex: 0,
    label: nonStudents.length === 0
      ? "Lowest Academic rank, just above the Students"
      : `Just above the Students, below ${nonStudents[0]!.name}`,
  }];
  nonStudents.forEach((occupant, index) => {
    choices.push({
      insertionIndex: index + 1,
      label: `Above ${occupant.name}`,
    });
  });
  return choices;
}

export function buildRefocusToAcademicPayload(args: {
  readonly denizenId: DenizenId;
  readonly expectedPositionId: SorcererBoardResearchPosition["positionId"];
  readonly destination: Exclude<SorcererResearcherRefocusDestination, { kind: "research_position" }>;
  readonly occupants: readonly SorcererBoardTowerOccupant[];
  readonly insertionIndex: number;
}): {
  readonly denizenId: DenizenId;
  readonly expectedPositionId: SorcererBoardResearchPosition["positionId"];
  readonly destination: Exclude<SorcererResearcherRefocusDestination, { kind: "research_position" }>;
  readonly expectedTowerOrder: readonly DenizenId[];
  readonly nextAcademicOrder: readonly DenizenId[];
} {
  return {
    denizenId: args.denizenId,
    expectedPositionId: args.expectedPositionId,
    destination: args.destination,
    expectedTowerOrder: args.occupants.map((occupant) => occupant.denizenId),
    nextAcademicOrder: insertAcademicIntoNonStudentBand(
      args.occupants,
      args.denizenId,
      args.insertionIndex,
    ),
  };
}

export type AcademicMoveDirection = "up" | "down";

function academicBand(
  occupants: readonly SorcererBoardTowerOccupant[],
  denizenId: DenizenId,
  treatAsNonStudentIds: readonly DenizenId[] = [],
): "student" | "non_student" {
  if (treatAsNonStudentIds.includes(denizenId)) {
    return "non_student";
  }
  return isStudentId(occupants, denizenId) ? "student" : "non_student";
}

export function canMoveAcademic(
  occupants: readonly SorcererBoardTowerOccupant[],
  academicOrder: readonly DenizenId[],
  index: number,
  direction: AcademicMoveDirection,
  treatAsNonStudentIds: readonly DenizenId[] = [],
): boolean {
  const swapWith = direction === "up" ? index + 1 : index - 1;
  if (swapWith < 0 || swapWith >= academicOrder.length) {
    return false;
  }
  const moving = academicOrder[index];
  const neighbor = academicOrder[swapWith];
  if (moving === undefined || neighbor === undefined) {
    return false;
  }
  return academicBand(occupants, moving, treatAsNonStudentIds)
    === academicBand(occupants, neighbor, treatAsNonStudentIds);
}

export function moveAcademic(
  occupants: readonly SorcererBoardTowerOccupant[],
  academicOrder: readonly DenizenId[],
  index: number,
  direction: AcademicMoveDirection,
  treatAsNonStudentIds: readonly DenizenId[] = [],
): readonly DenizenId[] {
  if (!canMoveAcademic(occupants, academicOrder, index, direction, treatAsNonStudentIds)) {
    throw new Error("That move would place a Student above a non-Student Academic");
  }
  const swapWith = direction === "up" ? index + 1 : index - 1;
  const next = [...academicOrder];
  const current = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = current;
  return next;
}

export function tutorAcademicOrderAfterDestination(
  occupants: readonly SorcererBoardTowerOccupant[],
  denizenId: DenizenId,
  destination: SorcererStudentTutorDestination,
): readonly DenizenId[] {
  const current = academicOrderFromOccupants(occupants);
  if (destination.kind === "researcher") {
    return current.filter((id) => id !== denizenId);
  }
  const without = occupants.filter((occupant) => occupant.denizenId !== denizenId);
  return insertAcademicIntoNonStudentBand(without, denizenId, 0);
}

export function buildTutorPayload(args: {
  readonly denizenId: DenizenId;
  readonly occupants: readonly SorcererBoardTowerOccupant[];
  readonly destination: SorcererStudentTutorDestination;
  readonly nextAcademicOrder: readonly DenizenId[];
}): {
  readonly denizenId: DenizenId;
  readonly expectedTowerOrder: readonly DenizenId[];
  readonly expectedAcademicOrder: readonly DenizenId[];
  readonly nextAcademicOrder: readonly DenizenId[];
  readonly destination: SorcererStudentTutorDestination;
} {
  return {
    denizenId: args.denizenId,
    expectedTowerOrder: args.occupants.map((occupant) => occupant.denizenId),
    expectedAcademicOrder: academicOrderFromOccupants(args.occupants),
    nextAcademicOrder: args.nextAcademicOrder,
    destination: args.destination,
  };
}

export interface KnowledgePoolPresentation {
  readonly pool: SorcererKnowledgePoolId;
  readonly label: string;
  readonly amount: number;
}

export function knowledgePoolPresentation(
  knowledge: SorcererKnowledgeState,
): readonly KnowledgePoolPresentation[] {
  return [
    { pool: "researchOrigin", label: "Research Knowledge — Now", amount: knowledge.researchOrigin },
    { pool: "other", label: "Other Knowledge — Now", amount: knowledge.other },
    {
      pool: "nextMonthResearchOrigin",
      label: "Incoming Research — Next Month",
      amount: knowledge.nextMonthResearchOrigin,
    },
  ];
}

export function buildAdjustKnowledgePayload(args: {
  readonly pool: SorcererKnowledgePoolId;
  readonly expectedAmount: number;
  readonly amount: number;
}): {
  readonly pool: SorcererKnowledgePoolId;
  readonly expectedAmount: number;
  readonly amount: number;
} {
  return {
    pool: args.pool,
    expectedAmount: args.expectedAmount,
    amount: args.amount,
  };
}

function sameSchool(a: MagicSchoolRef, b: MagicSchoolRef): boolean {
  return a.kind === b.kind && a.schoolId === b.schoolId;
}

export function wizardConsumableCount(
  wizardConsumables: readonly SorcererBoardWizardConsumables[],
  wizardId: WizardId,
  item: SorcererTowerMagicConsumableItem,
): number {
  const wizard = wizardConsumables.find((entry) => entry.wizardId === wizardId);
  if (wizard === undefined) {
    return 0;
  }
  if (item.kind === "tome") {
    return wizard.tomes.find((stack) => sameSchool(stack.school, item.school))?.count ?? 0;
  }
  return wizard.reagents.find((stack) => stack.reagentId === item.reagentId)?.count ?? 0;
}

export function towerConsumableCount(
  stacks: readonly (SorcererBoardTomeStack | SorcererBoardReagentStack)[],
  item: SorcererTowerMagicConsumableItem,
): number {
  if (item.kind === "tome") {
    return stacks
      .filter((stack): stack is SorcererBoardTomeStack => "school" in stack)
      .find((stack) => sameSchool(stack.school, item.school))?.count ?? 0;
  }
  return stacks
    .filter((stack): stack is SorcererBoardReagentStack => "reagentId" in stack)
    .find((stack) => stack.reagentId === item.reagentId)?.count ?? 0;
}

export function consumableItemKey(item: SorcererTowerMagicConsumableItem): string {
  return item.kind === "tome"
    ? `tome:${item.school.kind}:${item.school.schoolId}`
    : `reagent:${item.reagentId}`;
}

export interface TransferableConsumableOption {
  readonly key: string;
  readonly item: SorcererTowerMagicConsumableItem;
  readonly label: string;
  readonly count: number;
}

export function transferableConsumableOptions(args: {
  readonly direction: SorcererTowerMagicConsumableDirection;
  readonly towerTomes: readonly SorcererBoardTomeStack[];
  readonly towerReagents: readonly SorcererBoardReagentStack[];
  readonly wizardConsumables: readonly SorcererBoardWizardConsumables[];
  readonly wizardId: WizardId | string;
}): readonly TransferableConsumableOption[] {
  if (args.direction === "tower_to_wizard") {
    return [
      ...args.towerTomes.map((stack) => ({
        key: consumableItemKey({ kind: "tome", school: stack.school }),
        item: { kind: "tome" as const, school: stack.school },
        label: stack.schoolLabel,
        count: stack.count,
      })),
      ...args.towerReagents.map((stack) => ({
        key: consumableItemKey({ kind: "reagent", reagentId: stack.reagentId }),
        item: { kind: "reagent" as const, reagentId: stack.reagentId },
        label: stack.reagentLabel,
        count: stack.count,
      })),
    ];
  }
  const wizard = args.wizardConsumables.find((entry) => entry.wizardId === args.wizardId);
  if (wizard === undefined) {
    return [];
  }
  return [
    ...wizard.tomes.map((stack) => ({
      key: consumableItemKey({ kind: "tome", school: stack.school }),
      item: { kind: "tome" as const, school: stack.school },
      label: stack.schoolLabel,
      count: stack.count,
    })),
    ...wizard.reagents.map((stack) => ({
      key: consumableItemKey({ kind: "reagent", reagentId: stack.reagentId }),
      item: { kind: "reagent" as const, reagentId: stack.reagentId },
      label: stack.reagentLabel,
      count: stack.count,
    })),
  ];
}

export function resolveTransferSelection(
  options: readonly TransferableConsumableOption[],
  selectedKey: string | null,
): string | null {
  if (selectedKey === null) {
    return null;
  }
  return options.some((option) => option.key === selectedKey) ? selectedKey : null;
}

export function buildMoveConsumablePayload(args: {
  readonly direction: SorcererTowerMagicConsumableDirection;
  readonly wizardId: WizardId;
  readonly item: SorcererTowerMagicConsumableItem;
  readonly amount: number;
  readonly towerCount: number;
  readonly wizardConsumables: readonly SorcererBoardWizardConsumables[];
}): {
  readonly direction: SorcererTowerMagicConsumableDirection;
  readonly wizardId: WizardId;
  readonly item: SorcererTowerMagicConsumableItem;
  readonly amount: number;
  readonly expectedSourceCount: number;
  readonly expectedDestinationCount: number;
} {
  const wizardCount = wizardConsumableCount(args.wizardConsumables, args.wizardId, args.item);
  if (args.direction === "tower_to_wizard") {
    return {
      direction: args.direction,
      wizardId: args.wizardId,
      item: args.item,
      amount: args.amount,
      expectedSourceCount: args.towerCount,
      expectedDestinationCount: wizardCount,
    };
  }
  return {
    direction: args.direction,
    wizardId: args.wizardId,
    item: args.item,
    amount: args.amount,
    expectedSourceCount: wizardCount,
    expectedDestinationCount: args.towerCount,
  };
}

export function schoolPresentation(
  school: MagicSchoolRef,
  schoolLabel: string,
): { readonly name: string; readonly glyph: string } {
  if (school.kind === "source") {
    const definition = sorcererSourceSchoolDefinition(school.schoolId);
    return { name: definition.name, glyph: definition.glyph };
  }
  const initial = schoolLabel.trim().charAt(0).toUpperCase();
  return { name: schoolLabel, glyph: initial.length === 0 ? "?" : initial };
}

export const REAGENT_TOKEN_STYLES: Record<SorcererSourceReagentId, { readonly fill: string; readonly border: string; readonly ink: string }> = {
  salt: { fill: "#F8F8F8", border: "#5F6368", ink: "#1F1F1F" },
  tin: { fill: "#FCE5CD", border: "#B45F06", ink: "#3D1F00" },
  iron: { fill: "#F4CCCC", border: "#990000", ink: "#3D0000" },
  copper: { fill: "#D9EAD3", border: "#38761D", ink: "#1B3D0A" },
  mercury: { fill: "#D9D2E9", border: "#351C75", ink: "#1A0E3A" },
  silver: { fill: "#C9DAF8", border: "#1155CC", ink: "#06245C" },
  lead: { fill: "#434343", border: "#000000", ink: "#F5F5F5" },
  aluminum: { fill: "#D0E0E3", border: "#134F5C", ink: "#0A2A31" },
  sulfur: { fill: "#5B0F00", border: "#990000", ink: "#FFE8E0" },
  gold: { fill: "#BF9000", border: "#7F6000", ink: "#1F1400" },
};

export function reagentPresentation(reagentId: SorcererSourceReagentId): {
  readonly name: string;
  readonly glyph: string;
  readonly fill: string;
  readonly border: string;
  readonly ink: string;
} {
  const definition = sorcererSourceReagentDefinition(reagentId);
  const style = REAGENT_TOKEN_STYLES[reagentId];
  return {
    name: definition.name,
    glyph: definition.glyph,
    fill: style.fill,
    border: style.border,
    ink: style.ink,
  };
}

export function occupantRoleLabel(occupant: SorcererBoardTowerOccupant): string {
  switch (occupant.role.kind) {
    case "student":
      return "Student";
    case "professor":
      return "Professor";
    case "librarian":
      return `Librarian · ${occupant.role.schoolLabel}`;
    case "alchemist":
      return `Alchemist · ${occupant.role.recipeLabel}`;
    case "campaign_academic":
      return occupant.role.academicKindName;
    case "reliable_tower_arcanist":
      return `Reliable Arcanist · ${occupant.role.schoolLabel}`;
  }
}

export function destinationSystemLabel(target: SorcererResearchPositionTarget): string {
  return researchOutpostGroupLabel(researchOutpostGroupId(target));
}

export function isStaleSorcererCommandError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const lower = error.message.toLowerCase();
  return (
    error.message.includes("STALE_COMMAND_PRECONDITION")
    || lower.includes("does not match the expected")
    || lower.includes("expected \"") && lower.includes("but current is")
  );
}

export function sorcererMutationErrorMessage(error: unknown): string {
  if (isStaleSorcererCommandError(error)) {
    return "The board changed. Review the refreshed state before trying again.";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Could not complete that Tower action.";
}

export function researcherOperationalLabel(operationalThisMonth: boolean): string {
  return operationalThisMonth ? "Working" : "Unavailable this month";
}

export function newInnovationId(uuid: string = crypto.randomUUID()): string {
  return `sinn_${uuid}`;
}

export function newCampaignSchoolId(uuid: string = crypto.randomUUID()): string {
  return `ssch_${uuid}`;
}

export function newCampaignAcademicKindId(uuid: string = crypto.randomUUID()): string {
  return `sack_${uuid}`;
}

export function newCampaignRecipeId(uuid: string = crypto.randomUUID()): string {
  return `srec_${uuid}`;
}

export function newCampaignKnowledgeMethodId(uuid: string = crypto.randomUUID()): string {
  return `sknm_${uuid}`;
}

export function newCampaignResearchPositionId(uuid: string = crypto.randomUUID()): string {
  return `srp_${uuid}`;
}

export function newTruthId(uuid: string = crypto.randomUUID()): PowerfulDenizenTruthId {
  return `pdtru_${uuid}` as PowerfulDenizenTruthId;
}

export function innovationEligibleSpells(): readonly {
  readonly spellId: GrimoireSpellId;
  readonly name: string;
  readonly schoolId: SorcererSourceSchoolId;
  readonly schoolLabel: string;
}[] {
  return GRIMOIRE_SPELL_DEFINITIONS
    .filter((spell) => !spell.isGreatWork)
    .map((spell) => ({
      spellId: spell.spellId,
      name: spell.name,
      schoolId: spell.schoolId,
      schoolLabel: sorcererSourceSchoolDefinition(spell.schoolId).name,
    }));
}

export function sourceSchoolSpells(schoolId: SorcererSourceSchoolId): readonly {
  readonly spellId: GrimoireSpellId;
  readonly name: string;
}[] {
  return GRIMOIRE_SPELL_DEFINITIONS
    .filter((spell) => spell.schoolId === schoolId)
    .map((spell) => ({ spellId: spell.spellId, name: spell.name }));
}

export function otherPactDomainOptions(): readonly {
  readonly seatId: Exclude<PactSeatId, "sorcerer">;
  readonly label: string;
}[] {
  return PACT_SEAT_IDS
    .filter((seatId): seatId is Exclude<PactSeatId, "sorcerer"> => seatId !== "sorcerer")
    .map((seatId) => ({ seatId, label: pactSeatDisplayName(seatId) }));
}

export function sourceSchoolOptions(): readonly {
  readonly schoolId: SorcererSourceSchoolId;
  readonly name: string;
}[] {
  return SORCERER_SOURCE_SCHOOL_DEFINITIONS.map((school) => ({
    schoolId: school.schoolId,
    name: school.name,
  }));
}

export function lawCatalogOptions(): readonly {
  readonly lawId: (typeof SORCERER_LAW_OF_MAGIC_DEFINITIONS)[number]["id"];
  readonly label: string;
}[] {
  return SORCERER_LAW_OF_MAGIC_DEFINITIONS.map((law) => ({
    lawId: law.id,
    label: law.applicationLabel,
  }));
}

export function builtinRecipeOptions(): readonly {
  readonly recipeId: string;
  readonly name: string;
}[] {
  return SORCERER_BUILTIN_ALCHEMICAL_RECIPE_DEFINITIONS.map((recipe) => ({
    recipeId: recipe.recipeId,
    name: recipe.applicationLabel,
  }));
}

export function elementOptions(): readonly string[] {
  return ELEMENT_IDS;
}

export type TowerCorrectionBandId = "students" | "academics" | "arcanists";

export function towerCorrectionBands(occupants: readonly SorcererBoardTowerOccupant[]): {
  readonly students: readonly SorcererBoardTowerOccupant[];
  readonly academics: readonly SorcererBoardTowerOccupant[];
  readonly arcanists: readonly SorcererBoardTowerOccupant[];
} {
  return {
    students: occupants.filter(isStudentOccupant),
    academics: occupants.filter(isNonStudentAcademicOccupant),
    arcanists: occupants.filter(isReliableArcanistOccupant),
  };
}

export function canMoveWithinTowerBand(
  bandOrder: readonly DenizenId[],
  index: number,
  direction: AcademicMoveDirection,
): boolean {
  const swapWith = direction === "up" ? index + 1 : index - 1;
  return swapWith >= 0 && swapWith < bandOrder.length;
}

export function moveWithinTowerBand(
  bandOrder: readonly DenizenId[],
  index: number,
  direction: AcademicMoveDirection,
): readonly DenizenId[] {
  if (!canMoveWithinTowerBand(bandOrder, index, direction)) {
    throw new Error("That move would cross a Tower band boundary");
  }
  const swapWith = direction === "up" ? index + 1 : index - 1;
  const next = [...bandOrder];
  const current = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = current;
  return next;
}

export function assembleTowerOrderFromBands(args: {
  readonly students: readonly DenizenId[];
  readonly academics: readonly DenizenId[];
  readonly arcanists: readonly DenizenId[];
}): readonly DenizenId[] {
  return [...args.students, ...args.academics, ...args.arcanists];
}

export type SpecializedPersonnelKind =
  | "researcher"
  | "professor"
  | "librarian"
  | "alchemist"
  | "campaign_academic";

export function specializedPersonnelLabel(kind: SpecializedPersonnelKind): string {
  switch (kind) {
    case "researcher":
      return "Researcher";
    case "professor":
      return "Professor";
    case "librarian":
      return "Librarian";
    case "alchemist":
      return "Alchemist";
    case "campaign_academic":
      return "Campaign Academic";
  }
}

export function buildRecruitSpecializedPersonnelPayload(args: {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly description: string;
  readonly destination: Exclude<SorcererPersonnelRoleDestination, { kind: "student" }>;
  readonly occupants: readonly SorcererBoardTowerOccupant[];
  readonly insertionIndex: number;
}): {
  readonly subject: {
    readonly kind: "create_denizen";
    readonly denizenId: DenizenId;
    readonly name: string;
    readonly representation: "individual";
    readonly description: string | null;
  };
  readonly destination: Exclude<SorcererPersonnelRoleDestination, { kind: "student" }>;
  readonly expectedTowerOrder?: readonly DenizenId[];
  readonly nextAcademicOrder?: readonly DenizenId[];
} {
  const subject = {
    kind: "create_denizen" as const,
    denizenId: args.denizenId,
    name: args.name.trim(),
    representation: "individual" as const,
    description: args.description.trim().length === 0 ? null : args.description.trim(),
  };
  if (args.destination.kind === "researcher") {
    return { subject, destination: args.destination };
  }
  return {
    subject,
    destination: args.destination,
    expectedTowerOrder: args.occupants.map((occupant) => occupant.denizenId),
    nextAcademicOrder: insertAcademicIntoNonStudentBand(
      args.occupants,
      args.denizenId,
      args.insertionIndex,
    ),
  };
}
