/**
 * Derived Sorcerer board presentation and external-presence projection.
 *
 * APPLICATION DESIGN: compact read model for later Working Tower UI.
 * No CampaignState field. No persisted placement copy.
 */

import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId, IsleId, PlaceId, WizardId } from "./ids";
import type { HouseIndex } from "./orrery";
import { HOUSE_NAMES } from "./orrery";
import type { PactSeatId } from "./pact-seats";
import { pactSeatDisplayName } from "./pact-seats";
import {
  hierophantStartingTempleDisplayName,
  isValidHierophantStartingTempleId,
} from "./hierophant-catalogs";
import { WARLOCK_IDEOLOGY_DEFINITIONS } from "./warlock-catalogs";
import { MARINER_SEA_REGION_DEFINITIONS } from "./mariner-catalogs";
import type { MagicSchoolRef } from "./magic-consumables";
import {
  sorcererBuiltinAlchemicalRecipeDefinition,
  sorcererLawOfMagicDefinition,
  sorcererSourceReagentDefinition,
  sorcererSourceSchoolDefinition,
  type SorcererLawOfMagicId,
  type SorcererSourceReagentId,
} from "./sorcerer-catalogs";
import { grimoireSpellDefinition } from "./grimoire-catalog";
import type { GrimoireSpellId } from "./grimoire-catalog";
import type {
  SorcererAcademicRole,
  SorcererArcanistPlacement,
  SorcererArcanist,
  SorcererCampaignAcademicKindDefinition,
  SorcererCampaignAcademicKindId,
  SorcererCampaignKnowledgeMethodDefinition,
  SorcererCampaignRecipeDefinition,
  SorcererCampaignSchoolDefinition,
  SorcererConstructInstruction,
  SorcererDisruptiveArcanistProfile,
  SorcererInnovationId,
  SorcererKnowledgeState,
  SorcererRecipeRef,
  SorcererResearchPositionId,
  SorcererResearchPositionTarget,
} from "./sorcerer-state";

export interface SorcererBoardIsleRef {
  readonly isleId: IsleId;
  readonly name: string;
}

export interface SorcererBoardPlaceRef {
  readonly placeId: PlaceId;
  readonly name: string;
}

export type SorcererBoardOccupantRole =
  | { readonly kind: "student" }
  | { readonly kind: "professor" }
  | {
      readonly kind: "librarian";
      readonly school: MagicSchoolRef;
      readonly schoolLabel: string;
    }
  | {
      readonly kind: "alchemist";
      readonly recipe: SorcererRecipeRef;
      readonly recipeLabel: string;
    }
  | {
      readonly kind: "campaign_academic";
      readonly academicKindId: SorcererCampaignAcademicKindId;
      readonly academicKindName: string;
    }
  | {
      readonly kind: "reliable_tower_arcanist";
      readonly school: MagicSchoolRef;
      readonly schoolLabel: string;
    };

export interface SorcererBoardTowerOccupant {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly role: SorcererBoardOccupantRole;
}

export interface SorcererBoardResearchPosition {
  readonly positionId: SorcererResearchPositionId;
  readonly target: SorcererResearchPositionTarget;
  readonly targetLabel: string;
  readonly occupant: {
    readonly denizenId: DenizenId;
    readonly name: string;
    readonly operationalThisMonth: boolean;
  } | null;
}

export interface SorcererBoardTomeStack {
  readonly school: MagicSchoolRef;
  readonly schoolLabel: string;
  readonly count: number;
}

export interface SorcererBoardReagentStack {
  readonly reagentId: SorcererSourceReagentId;
  readonly reagentLabel: string;
  readonly count: number;
}

export interface SorcererBoardWizardConsumables {
  readonly wizardId: WizardId;
  readonly wizardName: string;
  readonly tomes: readonly SorcererBoardTomeStack[];
  readonly reagents: readonly SorcererBoardReagentStack[];
}

export interface SorcererBoardLaw {
  readonly lawId: SorcererLawOfMagicId;
  readonly applicationLabel: string;
  readonly text: string;
  readonly status: "active" | "unrevealed";
}

export interface SorcererBoardArcanist {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly school: MagicSchoolRef;
  readonly schoolLabel: string;
  readonly placement: SorcererArcanistPlacement;
  readonly disruptiveProfile: SorcererDisruptiveArcanistProfile | null;
}

export interface SorcererBoardConstruct {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly instructions: readonly SorcererConstructInstruction[];
}

export interface SorcererBoardInnovation {
  readonly innovationId: SorcererInnovationId;
  readonly spellId: GrimoireSpellId;
  readonly spellName: string;
  readonly text: string;
}

export type SorcererExternalPresence =
  | {
      readonly kind: "researcher";
      readonly denizenId: DenizenId;
      readonly name: string;
      readonly operationalThisMonth: boolean;
      readonly positionId: SorcererResearchPositionId;
      readonly target: SorcererResearchPositionTarget;
    }
  | {
      readonly kind: "disruptive_arcanist";
      readonly denizenId: DenizenId;
      readonly name: string;
      readonly school: MagicSchoolRef;
      readonly seatId: PactSeatId;
    };

export interface SorcererOrreryHouseMarkerPresentation {
  readonly kind: "researcher";
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly operationalThisMonth: boolean;
  readonly positionId: SorcererResearchPositionId;
  readonly house: HouseIndex;
}

export interface SorcererBoardReference {
  readonly initialized: boolean;
  readonly spyrholm: SorcererBoardIsleRef | null;
  readonly tower: SorcererBoardPlaceRef | null;
  readonly university: SorcererBoardPlaceRef | null;
  readonly towerOrder: readonly DenizenId[];
  readonly towerOccupants: readonly SorcererBoardTowerOccupant[];
  readonly researchPositions: readonly SorcererBoardResearchPosition[];
  readonly knowledge: SorcererKnowledgeState;
  readonly archivesOpen: boolean;
  readonly archivesSourceTiming: "wizardmoot";
  readonly towerTomes: readonly SorcererBoardTomeStack[];
  readonly towerReagents: readonly SorcererBoardReagentStack[];
  readonly wizardConsumables: readonly SorcererBoardWizardConsumables[];
  readonly laws: readonly SorcererBoardLaw[];
  readonly arcanists: readonly SorcererBoardArcanist[];
  readonly constructs: readonly SorcererBoardConstruct[];
  readonly innovations: readonly SorcererBoardInnovation[];
  readonly campaignSchools: readonly SorcererCampaignSchoolDefinition[];
  readonly campaignAcademicKinds: readonly SorcererCampaignAcademicKindDefinition[];
  readonly campaignRecipes: readonly SorcererCampaignRecipeDefinition[];
  readonly campaignKnowledgeMethods: readonly SorcererCampaignKnowledgeMethodDefinition[];
  readonly externalPresence: readonly SorcererExternalPresence[];
}

function denizenName(state: CampaignStateV5, denizenId: DenizenId): string {
  return state.world.denizens.find((denizen) => denizen.denizenId === denizenId)?.name ?? denizenId;
}

function schoolLabel(state: CampaignStateV5, school: MagicSchoolRef): string {
  if (school.kind === "source") {
    return sorcererSourceSchoolDefinition(school.schoolId).name;
  }
  return state.sorcerer.campaignSchools.find((entry) => entry.schoolId === school.schoolId)?.name
    ?? school.schoolId;
}

function recipeLabel(state: CampaignStateV5, recipe: SorcererRecipeRef): string {
  if (recipe.kind === "builtin") {
    return sorcererBuiltinAlchemicalRecipeDefinition(recipe.recipeId).applicationLabel;
  }
  return state.sorcerer.campaignRecipes.find((entry) => entry.recipeId === recipe.recipeId)?.name
    ?? recipe.recipeId;
}

function occupantRole(
  state: CampaignStateV5,
  role: SorcererAcademicRole,
): Exclude<SorcererBoardOccupantRole, { kind: "reliable_tower_arcanist" }> {
  if (role.kind === "student") {
    return { kind: "student" };
  }
  if (role.kind === "professor") {
    return { kind: "professor" };
  }
  if (role.kind === "librarian") {
    return {
      kind: "librarian",
      school: role.school,
      schoolLabel: schoolLabel(state, role.school),
    };
  }
  if (role.kind === "alchemist") {
    return {
      kind: "alchemist",
      recipe: role.recipe,
      recipeLabel: recipeLabel(state, role.recipe),
    };
  }
  return {
    kind: "campaign_academic",
    academicKindId: role.academicKindId,
    academicKindName:
      state.sorcerer.campaignAcademicKinds.find((kind) => kind.academicKindId === role.academicKindId)?.name
      ?? role.academicKindId,
  };
}

export function sorcererResearchPositionTargetLabel(
  state: CampaignStateV5,
  target: SorcererResearchPositionTarget,
): string {
  switch (target.kind) {
    case "orrery_house":
      return HOUSE_NAMES[target.house] ?? `House ${target.house}`;
    case "hierophant_temple":
      if (isValidHierophantStartingTempleId(target.templeId)) {
        return hierophantStartingTempleDisplayName(target.templeId);
      }
      {
        const temple = state.hierophant.temples.find((entry) => entry.templeId === target.templeId);
        if (temple !== undefined) {
          const place = state.world.places.find((candidate) => candidate.placeId === temple.placeId);
          if (place !== undefined) {
            return place.name;
          }
        }
        return `Campaign Temple ${target.templeId}`;
      }
    case "warlock_ideology":
      return WARLOCK_IDEOLOGY_DEFINITIONS.find((ideology) => ideology.ideologyId === target.ideologyId)?.name
        ?? target.ideologyId;
    case "mariner_sea_region":
      return MARINER_SEA_REGION_DEFINITIONS.find((region) => region.regionId === target.seaRegionId)?.displayName
        ?? target.seaRegionId;
    case "sage_future_of_pact":
      return "Future of the Pact";
    case "faustian_devils_schemes":
      return "Devils' Schemes";
    case "necromancer_final_death":
      return "Final Death";
    case "campaign_knowledge_method":
      return state.sorcerer.campaignKnowledgeMethods.find(
        (method) => method.knowledgeMethodId === target.knowledgeMethodId,
      )?.name ?? target.knowledgeMethodId;
  }
}

export function projectSorcererExternalPresence(state: CampaignStateV5): readonly SorcererExternalPresence[] {
  if (!state.sorcerer.initialized) {
    return [];
  }
  const presence: SorcererExternalPresence[] = [];
  for (const researcher of state.sorcerer.researchers) {
    const position = state.sorcerer.researchPositions.find(
      (candidate) => candidate.positionId === researcher.positionId,
    );
    if (position === undefined) {
      continue;
    }
    presence.push({
      kind: "researcher",
      denizenId: researcher.denizenId,
      name: denizenName(state, researcher.denizenId),
      operationalThisMonth: researcher.operationalThisMonth,
      positionId: researcher.positionId,
      target: position.target,
    });
  }
  for (const arcanist of state.sorcerer.arcanists) {
    if (arcanist.placement.kind !== "other_domain") {
      continue;
    }
    presence.push({
      kind: "disruptive_arcanist",
      denizenId: arcanist.denizenId,
      name: denizenName(state, arcanist.denizenId),
      school: arcanist.school,
      seatId: arcanist.placement.seatId,
    });
  }
  return presence;
}

export function sorcererOrreryHouseMarkerFromExternalPresence(
  presence: SorcererExternalPresence,
): SorcererOrreryHouseMarkerPresentation | null {
  if (presence.kind !== "researcher" || presence.target.kind !== "orrery_house") {
    return null;
  }
  return {
    kind: "researcher",
    denizenId: presence.denizenId,
    name: presence.name,
    operationalThisMonth: presence.operationalThisMonth,
    positionId: presence.positionId,
    house: presence.target.house,
  };
}

function emptyBoard(): SorcererBoardReference {
  return {
    initialized: false,
    spyrholm: null,
    tower: null,
    university: null,
    towerOrder: [],
    towerOccupants: [],
    researchPositions: [],
    knowledge: {
      researchOrigin: 0,
      other: 0,
      nextMonthResearchOrigin: 0,
      researcherProductionMultiplierCurrent: 1,
      researcherProductionMultiplierNextMonth: 1,
    },
    archivesOpen: false,
    archivesSourceTiming: "wizardmoot",
    towerTomes: [],
    towerReagents: [],
    wizardConsumables: [],
    laws: [],
    arcanists: [],
    constructs: [],
    innovations: [],
    campaignSchools: [],
    campaignAcademicKinds: [],
    campaignRecipes: [],
    campaignKnowledgeMethods: [],
    externalPresence: [],
  };
}

export function readSorcererBoardReference(state: CampaignStateV5): SorcererBoardReference {
  const sorcerer = state.sorcerer;
  if (!sorcerer.initialized) {
    return emptyBoard();
  }

  const academicsById = new Map(sorcerer.academics.map((academic) => [academic.denizenId, academic]));
  const towerArcanistsById = new Map(
    sorcerer.arcanists
      .filter((arcanist) => arcanist.placement.kind === "tower")
      .map((arcanist) => [arcanist.denizenId, arcanist]),
  );

  const towerOccupants: SorcererBoardTowerOccupant[] = sorcerer.towerOrder.map((denizenId) => {
    const academic = academicsById.get(denizenId);
    if (academic !== undefined) {
      return {
        denizenId,
        name: denizenName(state, denizenId),
        role: occupantRole(state, academic.role),
      };
    }
    const arcanist = towerArcanistsById.get(denizenId);
    if (arcanist !== undefined) {
      return {
        denizenId,
        name: denizenName(state, denizenId),
        role: {
          kind: "reliable_tower_arcanist",
          school: arcanist.school,
          schoolLabel: schoolLabel(state, arcanist.school),
        },
      };
    }
    return {
      denizenId,
      name: denizenName(state, denizenId),
      role: { kind: "student" },
    };
  });

  const occupantByPosition = new Map(
    sorcerer.researchers.map((researcher) => [researcher.positionId, researcher]),
  );
  const researchPositions: SorcererBoardResearchPosition[] = sorcerer.researchPositions.map((position) => {
    const occupant = occupantByPosition.get(position.positionId) ?? null;
    return {
      positionId: position.positionId,
      target: position.target,
      targetLabel: sorcererResearchPositionTargetLabel(state, position.target),
      occupant: occupant === null
        ? null
        : {
            denizenId: occupant.denizenId,
            name: denizenName(state, occupant.denizenId),
            operationalThisMonth: occupant.operationalThisMonth,
          },
    };
  });

  const laws: SorcererBoardLaw[] = [
    ...sorcerer.activeLawIds.map((lawId) => {
      const definition = sorcererLawOfMagicDefinition(lawId);
      return {
        lawId,
        applicationLabel: definition.applicationLabel,
        text: definition.text,
        status: "active" as const,
      };
    }),
    ...sorcerer.unrevealedLawIds.map((lawId) => {
      const definition = sorcererLawOfMagicDefinition(lawId);
      return {
        lawId,
        applicationLabel: definition.applicationLabel,
        text: definition.text,
        status: "unrevealed" as const,
      };
    }),
  ];

  const arcanists: SorcererBoardArcanist[] = sorcerer.arcanists.map((arcanist: SorcererArcanist) => ({
    denizenId: arcanist.denizenId,
    name: denizenName(state, arcanist.denizenId),
    school: arcanist.school,
    schoolLabel: schoolLabel(state, arcanist.school),
    placement: arcanist.placement,
    disruptiveProfile: arcanist.disruptiveProfile,
  }));

  return {
    initialized: true,
    spyrholm: sorcerer.spyrholmIsleId === null
      ? null
      : {
          isleId: sorcerer.spyrholmIsleId,
          name: state.world.isles.find((isle) => isle.isleId === sorcerer.spyrholmIsleId)?.name
            ?? sorcerer.spyrholmIsleId,
        },
    tower: sorcerer.towerPlaceId === null
      ? null
      : {
          placeId: sorcerer.towerPlaceId,
          name: state.world.places.find((place) => place.placeId === sorcerer.towerPlaceId)?.name
            ?? sorcerer.towerPlaceId,
        },
    university: sorcerer.universityPlaceId === null
      ? null
      : {
          placeId: sorcerer.universityPlaceId,
          name: state.world.places.find((place) => place.placeId === sorcerer.universityPlaceId)?.name
            ?? sorcerer.universityPlaceId,
        },
    towerOrder: sorcerer.towerOrder,
    towerOccupants,
    researchPositions,
    knowledge: sorcerer.knowledge,
    archivesOpen: sorcerer.archivesOpen,
    archivesSourceTiming: "wizardmoot",
    towerTomes: state.magicConsumables.tomes
      .filter((stack) => stack.custody.kind === "sorcerer_tower")
      .map((stack) => ({
        school: stack.school,
        schoolLabel: schoolLabel(state, stack.school),
        count: stack.count,
      })),
    towerReagents: state.magicConsumables.reagents
      .filter((stack) => stack.custody.kind === "sorcerer_tower")
      .map((stack) => ({
        reagentId: stack.reagentId,
        reagentLabel: sorcererSourceReagentDefinition(stack.reagentId).name,
        count: stack.count,
      })),
    wizardConsumables: state.wizards.map((wizard) => ({
      wizardId: wizard.wizardId,
      wizardName: wizard.name,
      tomes: state.magicConsumables.tomes
        .filter((stack) => (
          stack.custody.kind === "subject"
          && stack.custody.subject.kind === "wizard"
          && stack.custody.subject.wizardId === wizard.wizardId
        ))
        .map((stack) => ({
          school: stack.school,
          schoolLabel: schoolLabel(state, stack.school),
          count: stack.count,
        })),
      reagents: state.magicConsumables.reagents
        .filter((stack) => (
          stack.custody.kind === "subject"
          && stack.custody.subject.kind === "wizard"
          && stack.custody.subject.wizardId === wizard.wizardId
        ))
        .map((stack) => ({
          reagentId: stack.reagentId,
          reagentLabel: sorcererSourceReagentDefinition(stack.reagentId).name,
          count: stack.count,
        })),
    })),
    laws,
    arcanists,
    constructs: sorcerer.constructs.map((construct) => ({
      denizenId: construct.denizenId,
      name: denizenName(state, construct.denizenId),
      instructions: construct.instructions,
    })),
    innovations: sorcerer.innovations.map((innovation) => ({
      innovationId: innovation.innovationId,
      spellId: innovation.spellId,
      spellName: grimoireSpellDefinition(innovation.spellId).name,
      text: innovation.text,
    })),
    campaignSchools: sorcerer.campaignSchools,
    campaignAcademicKinds: sorcerer.campaignAcademicKinds,
    campaignRecipes: sorcerer.campaignRecipes,
    campaignKnowledgeMethods: sorcerer.campaignKnowledgeMethods,
    externalPresence: projectSorcererExternalPresence(state),
  };
}

export function pactSeatLabelForSorcererPresence(seatId: PactSeatId): string {
  return pactSeatDisplayName(seatId);
}
