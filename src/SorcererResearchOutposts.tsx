import { useState } from "react";
import type { DenizenId } from "../shared/domain";
import type {
  SorcererBoardReference,
  SorcererBoardResearchPosition,
  SorcererResearcherRefocusDestination,
} from "../shared/domain";
import {
  SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS,
  SORCERER_SOURCE_SCHOOL_IDS,
  sorcererBuiltinAlchemicalRecipeDefinition,
} from "../shared/domain";
import LoreContextPanel from "./LoreContextPanel";
import { findPresentationSubjectByRef, type LoreCompendiumUiState } from "./lore-view-model";
import {
  academicInsertionChoices,
  destinationSystemLabel,
  groupResearchPositions,
  LEFT_RESEARCH_OUTPOST_GROUPS,
  researcherOperationalLabel,
  RIGHT_RESEARCH_OUTPOST_GROUPS,
  schoolPresentation,
  vacantResearchPositions,
  type ResearchOutpostGroupId,
} from "./sorcerer-view-model";

const btnClass =
  "text-xs font-medium rounded-md px-2.5 py-1.5 bg-[#7F6000] text-[#FFF8E7] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const ghostBtn =
  "text-xs rounded-md px-2 py-1 border border-[#BF9000]/70 bg-[#FFF8E7] text-[#3d2a00] hover:bg-[#FFE599] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const fieldClass =
  "mt-1 w-full rounded-md border border-[#BF9000]/50 bg-[#FFFDF5] px-2 py-1.5 text-sm text-[#3d2a00]";

const DESTINATION_ACCENT: Record<ResearchOutpostGroupId, string> = {
  orrery: "#475569",
  temple: "#B45F06",
  court: "#990000",
  sea: "#38761D",
  future: "#1155CC",
  devil: "#674EA7",
  death: "#000000",
  campaign: "#7F6000",
};

function ResearcherCard({
  position,
  campaignId,
  loreCompendium,
  pending,
  actionError,
  onSetOperational,
  onRefocusPosition,
  onPromoteAcademic,
  presentation,
}: {
  readonly position: SorcererBoardResearchPosition;
  readonly campaignId: string;
  readonly loreCompendium: LoreCompendiumUiState;
  readonly pending: boolean;
  readonly actionError: string | null;
  readonly onSetOperational: (denizenId: DenizenId, expected: boolean, next: boolean) => Promise<void>;
  readonly onRefocusPosition: (
    denizenId: DenizenId,
    expectedPositionId: SorcererBoardResearchPosition["positionId"],
    destinationPositionId: SorcererBoardResearchPosition["positionId"],
  ) => Promise<void>;
  readonly onPromoteAcademic: (
    denizenId: DenizenId,
    expectedPositionId: SorcererBoardResearchPosition["positionId"],
    destination: Exclude<SorcererResearcherRefocusDestination, { kind: "research_position" }>,
    insertionIndex: number,
  ) => Promise<void>;
  readonly presentation: SorcererBoardReference;
}) {
  const groupId = destinationSystemLabel(position.target);
  const accent = DESTINATION_ACCENT[
    position.target.kind === "orrery_house" ? "orrery"
      : position.target.kind === "hierophant_temple" ? "temple"
        : position.target.kind === "warlock_ideology" ? "court"
          : position.target.kind === "mariner_sea_region" ? "sea"
            : position.target.kind === "sage_future_of_pact" ? "future"
              : position.target.kind === "faustian_devils_schemes" ? "devil"
                : position.target.kind === "necromancer_final_death" ? "death"
                  : "campaign"
  ];
  const [panel, setPanel] = useState<"none" | "refocus" | "promote">("none");
  const [destPositionId, setDestPositionId] = useState("");
  const [promoteKind, setPromoteKind] = useState<"professor" | "librarian" | "alchemist" | "campaign_academic">("professor");
  const [schoolKind, setSchoolKind] = useState<"source" | "campaign">("source");
  const [schoolId, setSchoolId] = useState("enchantment");
  const [recipeKind, setRecipeKind] = useState<"builtin" | "campaign">("builtin");
  const [recipeId, setRecipeId] = useState("first");
  const [academicKindId, setAcademicKindId] = useState<string>(presentation.campaignAcademicKinds[0]?.academicKindId ?? "");
  const [insertionIndex, setInsertionIndex] = useState(0);
  const vacant = vacantResearchPositions(presentation.researchPositions);
  const insertions = academicInsertionChoices(presentation.towerOccupants);
  const templeLore = position.target.kind === "hierophant_temple" && loreCompendium.status === "ready"
    ? findPresentationSubjectByRef(loreCompendium.presentation, {
        kind: "hierophant_temple",
        templeId: position.target.templeId,
      })
    : undefined;
  const sourceSchools = SORCERER_SOURCE_SCHOOL_IDS;
  const builtinRecipes = SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS;

  if (position.occupant === null) {
    return (
      <article
        className="min-h-[4.75rem] rounded-md border-2 border-dashed bg-[#FFFDF5]/80 px-2.5 py-2"
        style={{ borderColor: accent }}
        aria-label={`Vacant research position ${position.targetLabel}`}
      >
        <p className="text-[11px] uppercase tracking-wide" style={{ color: accent }}>{groupId}</p>
        <h3 className="text-sm font-semibold text-[#3d2a00]">{position.targetLabel}</h3>
        <p className="text-xs text-[#5c4300] mt-1">Vacant position</p>
      </article>
    );
  }

  const occupant = position.occupant;
  const unavailable = !occupant.operationalThisMonth;

  function promoteDestination(): Exclude<SorcererResearcherRefocusDestination, { kind: "research_position" }> | null {
    if (promoteKind === "professor") return { kind: "professor" };
    if (promoteKind === "librarian") {
      return {
        kind: "librarian",
        school: schoolKind === "source"
          ? { kind: "source", schoolId: schoolId as never }
          : { kind: "campaign", schoolId: schoolId as never },
      };
    }
    if (promoteKind === "alchemist") {
      return {
        kind: "alchemist",
        recipe: recipeKind === "builtin"
          ? { kind: "builtin", recipeId: recipeId as never }
          : { kind: "campaign", recipeId: recipeId as never },
      };
    }
    if (academicKindId.length === 0) return null;
    return { kind: "campaign_academic", academicKindId: academicKindId as never };
  }

  return (
      <article
        className={`min-w-0 rounded-md border-2 bg-[#FFF8E7] px-2.5 py-2 ${unavailable ? "opacity-80" : ""}`}
        style={{ borderColor: accent, filter: unavailable ? "grayscale(0.25)" : undefined }}
      >
      <p className="text-[11px] uppercase tracking-wide" style={{ color: accent }}>{groupId}</p>
      <h3 className="text-sm font-semibold text-[#3d2a00]">{occupant.name}</h3>
      <p className="text-xs text-[#3d2a00]">{position.targetLabel}</p>
      <p className="text-xs text-[#5c4300]">{destinationSystemLabel(position.target)}</p>
      <p className="text-xs font-medium mt-1">{researcherOperationalLabel(occupant.operationalThisMonth)}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className={ghostBtn}
          disabled={pending}
          onClick={() => onSetOperational(occupant.denizenId, occupant.operationalThisMonth, !occupant.operationalThisMonth)}
        >
          {occupant.operationalThisMonth ? "Mark unavailable this month" : "Return to work"}
        </button>
        <button type="button" className={ghostBtn} disabled={pending} onClick={() => setPanel(panel === "refocus" ? "none" : "refocus")}>
          Refocus
        </button>
        <button type="button" className={ghostBtn} disabled={pending} onClick={() => setPanel(panel === "promote" ? "none" : "promote")}>
          Promote into Tower
        </button>
      </div>
      {panel === "refocus" && (
        <div className="mt-2 space-y-2 border-t border-[#BF9000]/30 pt-2">
          <label className="block text-xs">
            Move to vacant position
            <select className={fieldClass} value={destPositionId} onChange={(event) => setDestPositionId(event.target.value)}>
              <option value="">Choose a destination</option>
              {groupResearchPositions(vacant).map((group) => (
                <optgroup key={group.groupId} label={group.label}>
                  {group.positions.map((candidate) => (
                    <option key={candidate.positionId} value={candidate.positionId}>
                      {candidate.targetLabel}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {actionError !== null && <p className="text-xs text-[#990000]" role="alert">{actionError}</p>}
          <button
            type="button"
            className={btnClass}
            disabled={pending || destPositionId.length === 0}
            onClick={async () => {
              try {
                await onRefocusPosition(occupant.denizenId, position.positionId, destPositionId as never);
                setPanel("none");
              } catch {
                // Keep the refocus draft open after a failed mutation.
              }
            }}
          >
            Save refocus
          </button>
        </div>
      )}
      {panel === "promote" && (
        <div className="mt-2 space-y-2 border-t border-[#BF9000]/30 pt-2">
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium">Promote into Tower</legend>
            {(["professor", "librarian", "alchemist"] as const).map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-xs">
                <input type="radio" checked={promoteKind === kind} onChange={() => setPromoteKind(kind)} />
                {kind[0]!.toUpperCase() + kind.slice(1)}
              </label>
            ))}
            {presentation.campaignAcademicKinds.map((kind) => (
              <label key={kind.academicKindId} className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  checked={promoteKind === "campaign_academic" && academicKindId === kind.academicKindId}
                  onChange={() => {
                    setPromoteKind("campaign_academic");
                    setAcademicKindId(kind.academicKindId);
                  }}
                />
                {kind.name}
              </label>
            ))}
          </fieldset>
          {promoteKind === "librarian" && (
            <label className="block text-xs">
              School
              <select
                className={fieldClass}
                value={`${schoolKind}:${schoolId}`}
                onChange={(event) => {
                  const [kind, id] = event.target.value.split(":");
                  setSchoolKind(kind as "source" | "campaign");
                  setSchoolId(id ?? "enchantment");
                }}
              >
                {sourceSchools.map((id) => (
                  <option key={id} value={`source:${id}`}>{schoolPresentation({ kind: "source", schoolId: id }, id).name}</option>
                ))}
                {presentation.campaignSchools.map((school) => (
                  <option key={school.schoolId} value={`campaign:${school.schoolId}`}>{school.name}</option>
                ))}
              </select>
            </label>
          )}
          {promoteKind === "alchemist" && (
            <label className="block text-xs">
              Recipe
              <select
                className={fieldClass}
                value={`${recipeKind}:${recipeId}`}
                onChange={(event) => {
                  const [kind, id] = event.target.value.split(":");
                  setRecipeKind(kind as "builtin" | "campaign");
                  setRecipeId(id ?? "first");
                }}
              >
                {builtinRecipes.map((id) => (
                  <option key={id} value={`builtin:${id}`}>
                    {sorcererBuiltinAlchemicalRecipeDefinition(id).applicationLabel}
                  </option>
                ))}
                {presentation.campaignRecipes.map((recipe) => (
                  <option key={recipe.recipeId} value={`campaign:${recipe.recipeId}`}>{recipe.name}</option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium">Insert among Academics</legend>
            {insertions.map((choice) => (
              <label key={choice.insertionIndex} className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  checked={insertionIndex === choice.insertionIndex}
                  onChange={() => setInsertionIndex(choice.insertionIndex)}
                />
                {choice.label}
              </label>
            ))}
          </fieldset>
          {actionError !== null && <p className="text-xs text-[#990000]" role="alert">{actionError}</p>}
          <button
            type="button"
            className={btnClass}
            disabled={pending || promoteDestination() === null}
            onClick={async () => {
              const destination = promoteDestination();
              if (destination === null) return;
              try {
                await onPromoteAcademic(occupant.denizenId, position.positionId, destination, insertionIndex);
                setPanel("none");
              } catch {
                // Keep the promotion draft open after a failed mutation.
              }
            }}
          >
            Save promotion
          </button>
        </div>
      )}
      {templeLore !== undefined && (
        <details className="mt-2">
          <summary className="text-xs cursor-pointer">Temple Lore</summary>
          <LoreContextPanel subject={templeLore} campaignId={campaignId} compact />
        </details>
      )}
    </article>
  );
}

export default function SorcererResearchOutposts({
  presentation,
  campaignId,
  loreCompendium,
  layout,
  pending,
  actionError,
  onSetOperational,
  onRefocusPosition,
  onPromoteAcademic,
  groupIds,
}: {
  readonly presentation: SorcererBoardReference;
  readonly campaignId: string;
  readonly loreCompendium: LoreCompendiumUiState;
  readonly layout: "full" | "narrow";
  readonly pending: boolean;
  readonly actionError: string | null;
  readonly onSetOperational: (denizenId: DenizenId, expected: boolean, next: boolean) => Promise<void>;
  readonly onRefocusPosition: (
    denizenId: DenizenId,
    expectedPositionId: SorcererBoardResearchPosition["positionId"],
    destinationPositionId: SorcererBoardResearchPosition["positionId"],
  ) => Promise<void>;
  readonly onPromoteAcademic: (
    denizenId: DenizenId,
    expectedPositionId: SorcererBoardResearchPosition["positionId"],
    destination: Exclude<SorcererResearcherRefocusDestination, { kind: "research_position" }>,
    insertionIndex: number,
  ) => Promise<void>;
  readonly groupIds?: readonly ResearchOutpostGroupId[];
}) {
  const groups = groupResearchPositions(presentation.researchPositions)
    .filter((group) => groupIds === undefined || groupIds.includes(group.groupId));
  return (
    <section aria-label="Research outposts" className={layout === "narrow" ? "space-y-4" : "space-y-5"}>
      {groups.map((group) => (
        <div key={group.groupId}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5c4300] mb-2">{group.label}</h3>
          <div className="space-y-2">
            {group.positions.map((position) => (
              <ResearcherCard
                key={position.positionId}
                position={position}
                campaignId={campaignId}
                loreCompendium={loreCompendium}
                pending={pending}
                actionError={actionError}
                onSetOperational={onSetOperational}
                onRefocusPosition={onRefocusPosition}
                onPromoteAcademic={onPromoteAcademic}
                presentation={presentation}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export { LEFT_RESEARCH_OUTPOST_GROUPS, RIGHT_RESEARCH_OUTPOST_GROUPS };
