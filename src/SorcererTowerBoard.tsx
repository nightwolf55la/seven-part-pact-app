import { useState, type ReactNode } from "react";
import type { DenizenId } from "../shared/domain";
import type { SorcererBoardReference, SorcererBoardTowerOccupant, SorcererStudentTutorDestination } from "../shared/domain";
import {
  academicOccupants,
  canMoveAcademic,
  isReliableArcanistOccupant,
  moveAcademic,
  occupantRoleLabel,
  schoolPresentation,
  tutorAcademicOrderAfterDestination,
  visualTowerBands,
  visualTowerOccupants,
} from "./sorcerer-view-model";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#BF9000]/50 bg-[#FFFDF5] px-2 py-1.5 text-sm text-[#3d2a00]";
const btnClass =
  "text-xs font-medium rounded-md px-2.5 py-1.5 bg-[#7F6000] text-[#FFF8E7] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const ghostBtn =
  "text-xs rounded-md px-2 py-1 border border-[#BF9000]/70 bg-[#FFF8E7] text-[#3d2a00] hover:bg-[#FFE599] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";

function occupantCardStyle(occupant: SorcererBoardTowerOccupant): { background: string; border: string; ornate: boolean } {
  switch (occupant.role.kind) {
    case "student":
    case "professor":
      return { background: "#FFE599", border: "#BF9000", ornate: false };
    case "librarian":
      return { background: "#D0E0E3", border: "#BF9000", ornate: false };
    case "alchemist":
      return { background: "#FFD966", border: "#BF9000", ornate: false };
    case "campaign_academic":
      return { background: "#FFE599", border: "#BF9000", ornate: false };
    case "reliable_tower_arcanist":
      return { background: "#F6E27A", border: "#7F6000", ornate: true };
  }
}

function OccupantCard({
  occupant,
  children,
}: {
  readonly occupant: SorcererBoardTowerOccupant;
  readonly children?: ReactNode;
}) {
  const style = occupantCardStyle(occupant);
  const school = occupant.role.kind === "librarian" || occupant.role.kind === "reliable_tower_arcanist"
    ? schoolPresentation(occupant.role.school, occupant.role.schoolLabel)
    : null;
  return (
    <article
      className={`rounded-md px-2.5 py-2 text-left text-[#3d2a00] shadow-[0_1px_2px_rgba(63,42,18,0.28)] ${style.ornate ? "shadow-[inset_0_0_0_2px_#BF9000,0_1px_2px_rgba(63,42,18,0.28)]" : ""}`}
      style={{ background: style.background, border: `2px solid ${style.border}` }}
    >
      <h3 className="text-sm font-semibold leading-tight">{occupant.name}</h3>
      <p className="text-xs mt-0.5">{occupantRoleLabel(occupant)}</p>
      {school !== null && (
        <p className="text-xs mt-0.5">
          <span aria-hidden="true">{school.glyph} </span>
          <span>{school.name}</span>
        </p>
      )}
      {occupant.role.kind === "alchemist" && (
        <p className="text-xs mt-0.5">{occupant.role.recipeLabel}</p>
      )}
      {occupant.role.kind === "campaign_academic" && (
        <p className="text-xs mt-0.5">{occupant.role.academicKindName}</p>
      )}
      {children}
    </article>
  );
}

export default function SorcererTowerBoard({
  presentation,
  layout,
  actionError,
  pending,
  onRecruitStudent,
  onTutorStudent,
}: {
  readonly presentation: SorcererBoardReference;
  readonly layout: "full" | "narrow";
  readonly actionError: string | null;
  readonly pending: boolean;
  readonly onRecruitStudent: (name: string, description: string) => Promise<void>;
  readonly onTutorStudent: (
    denizenId: DenizenId,
    destination: SorcererStudentTutorDestination,
    nextAcademicOrder: readonly DenizenId[],
  ) => Promise<void>;
}) {
  const bands = visualTowerBands(presentation.towerOccupants);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [recruitName, setRecruitName] = useState("");
  const [recruitDescription, setRecruitDescription] = useState("");
  const [tutoringId, setTutoringId] = useState<DenizenId | null>(null);
  const [tutorKind, setTutorKind] = useState<"researcher" | "professor" | "librarian" | "alchemist" | "campaign_academic">("researcher");
  const [tutorPositionId, setTutorPositionId] = useState("");
  const [tutorSchoolId, setTutorSchoolId] = useState<string>(presentation.campaignSchools[0]?.schoolId ?? "enchantment");
  const [tutorSchoolKind, setTutorSchoolKind] = useState<"source" | "campaign">("source");
  const [tutorRecipeId, setTutorRecipeId] = useState<string>(presentation.campaignRecipes[0]?.recipeId ?? "first");
  const [tutorRecipeKind, setTutorRecipeKind] = useState<"builtin" | "campaign">("builtin");
  const [tutorAcademicKindId, setTutorAcademicKindId] = useState<string>(
    presentation.campaignAcademicKinds[0]?.academicKindId ?? "",
  );
  const [tutorOrder, setTutorOrder] = useState<readonly DenizenId[]>([]);

  const vacantPositions = presentation.researchPositions.filter((position) => position.occupant === null);
  const sourceSchools = [
    "enchantment",
    "metamorphosis",
    "oneirism",
    "divination",
    "apotropaism",
    "thaumaturgy",
    "invocation",
    "artifice",
  ] as const;
  const builtinRecipes = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"] as const;

  function currentTutorDestination(): SorcererStudentTutorDestination | null {
    if (tutorKind === "researcher") {
      if (tutorPositionId.length === 0) return null;
      return { kind: "researcher", positionId: tutorPositionId as never };
    }
    if (tutorKind === "professor") return { kind: "professor" };
    if (tutorKind === "librarian") {
      return {
        kind: "librarian",
        school: tutorSchoolKind === "source"
          ? { kind: "source", schoolId: tutorSchoolId as never }
          : { kind: "campaign", schoolId: tutorSchoolId as never },
      };
    }
    if (tutorKind === "alchemist") {
      return {
        kind: "alchemist",
        recipe: tutorRecipeKind === "builtin"
          ? { kind: "builtin", recipeId: tutorRecipeId as never }
          : { kind: "campaign", recipeId: tutorRecipeId as never },
      };
    }
    if (tutorAcademicKindId.length === 0) return null;
    return { kind: "campaign_academic", academicKindId: tutorAcademicKindId as never };
  }

  function openTutor(denizenId: DenizenId) {
    const firstVacant = vacantPositions[0];
    const destination: SorcererStudentTutorDestination = firstVacant === undefined
      ? { kind: "professor" }
      : { kind: "researcher", positionId: firstVacant.positionId };
    setTutoringId(denizenId);
    setTutorKind(destination.kind === "researcher" ? "researcher" : "professor");
    setTutorPositionId(firstVacant?.positionId ?? "");
    setTutorOrder(tutorAcademicOrderAfterDestination(presentation.towerOccupants, denizenId, destination));
  }

  function applyTutorKind(nextKind: typeof tutorKind) {
    if (tutoringId === null) return;
    setTutorKind(nextKind);
    const destination: SorcererStudentTutorDestination = nextKind === "researcher"
      ? { kind: "researcher", positionId: (tutorPositionId || vacantPositions[0]?.positionId) as never }
      : nextKind === "professor"
        ? { kind: "professor" }
        : nextKind === "librarian"
          ? { kind: "librarian", school: { kind: "source", schoolId: "enchantment" } }
          : nextKind === "alchemist"
            ? { kind: "alchemist", recipe: { kind: "builtin", recipeId: "first" } }
            : { kind: "campaign_academic", academicKindId: tutorAcademicKindId as never };
    if (destination.kind === "researcher" && (destination.positionId === undefined || String(destination.positionId) === "undefined")) {
      return;
    }
    if (destination.kind === "campaign_academic" && tutorAcademicKindId.length === 0) {
      return;
    }
    setTutorOrder(tutorAcademicOrderAfterDestination(presentation.towerOccupants, tutoringId, destination));
  }

  const treatAsNonStudent = tutoringId !== null && tutorKind !== "researcher" ? [tutoringId] : [];
  const visualTutorOrder = [...tutorOrder].reverse();

  return (
    <section
      aria-labelledby="working-tower-heading"
      data-region="working-tower"
      className="relative flex flex-col items-center"
    >
      <h2 id="working-tower-heading" className="sr-only">Working Tower</h2>
      <div
        className={`relative w-full overflow-hidden ${layout === "full" ? "max-w-[26rem] min-h-[42rem]" : "max-w-full min-h-[22rem]"}`}
        style={{
          clipPath: layout === "full"
            ? "polygon(14% 0%, 86% 0%, 100% 100%, 0% 100%)"
            : "polygon(6% 0%, 94% 0%, 100% 100%, 0% 100%)",
          background: "linear-gradient(180deg, #FFD966 0%, #F1C232 48%, #E69138 100%)",
          filter: "drop-shadow(0 0 0.5px #3f2a12)",
          boxShadow: "inset 0 0 0 2px #3f2a12",
        }}
      >
        <div className={`relative z-10 flex flex-col min-h-inherit ${layout === "full" ? "min-h-[42rem] px-10 pt-8 pb-6" : "min-h-[22rem] px-5 py-4"}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5c4300]/80 text-center mb-2">
            TOP
            <span className="block normal-case tracking-normal text-[11px] mt-0.5">Quiet-phase Arcanists</span>
          </p>
          <ol className="flex flex-col gap-2 flex-1" aria-label="Tower occupants from top to bottom">
            {bands.arcanists.map((occupant) => (
              <li key={occupant.denizenId}>
                <OccupantCard occupant={occupant} />
              </li>
            ))}
            <li className="flex-1 min-h-6 list-none" aria-hidden="true" />
            {bands.academics.map((occupant) => (
              <li key={occupant.denizenId}>
                <OccupantCard occupant={occupant} />
              </li>
            ))}
            {bands.students.map((occupant) => (
              <li key={occupant.denizenId}>
                <OccupantCard occupant={occupant}>
                  <button
                    type="button"
                    className={`${ghostBtn} mt-2`}
                    onClick={() => openTutor(occupant.denizenId)}
                    disabled={pending}
                  >
                    Tutor / Promote
                  </button>
                </OccupantCard>
              </li>
            ))}
          </ol>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5c4300]/80 text-center mt-3">
            BOTTOM
            <span className="block normal-case tracking-normal text-[11px] mt-0.5">acts first in Visions</span>
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-1 w-full max-w-md rounded-lg border-2 border-[#BF9000] bg-[#FFF8E7] p-3">
        <h3 className="text-sm font-semibold text-[#3d2a00]">Recruit Student</h3>
        {!recruitOpen ? (
          <button type="button" className={`${btnClass} mt-2`} onClick={() => setRecruitOpen(true)} disabled={pending}>
            Recruit Student
          </button>
        ) : (
          <form
            className="mt-2 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (recruitName.trim().length === 0) return;
              try {
                await onRecruitStudent(recruitName, recruitDescription);
                setRecruitName("");
                setRecruitDescription("");
                setRecruitOpen(false);
              } catch {
                // Parent keeps the inline error; leave the draft open.
              }
            }}
          >
            <label className="block text-xs text-[#3d2a00]">
              Name
              <input
                className={fieldClass}
                value={recruitName}
                onChange={(event) => setRecruitName(event.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-[#3d2a00]">
              Description
              <textarea
                className={fieldClass}
                value={recruitDescription}
                onChange={(event) => setRecruitDescription(event.target.value)}
                rows={2}
              />
            </label>
            {actionError !== null && <p className="text-xs text-[#990000]" role="alert">{actionError}</p>}
            <div className="flex gap-2">
              <button type="submit" className={btnClass} disabled={pending || recruitName.trim().length === 0}>
                Confirm recruit
              </button>
              <button type="button" className={ghostBtn} onClick={() => setRecruitOpen(false)} disabled={pending}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {tutoringId !== null && (
        <div className="relative z-10 mt-3 w-full max-w-md rounded-lg border-2 border-[#7F6000] bg-[#FFFDF5] p-3 space-y-3">
          <h3 className="text-sm font-semibold text-[#3d2a00]">
            Tutor / Promote {presentation.towerOccupants.find((occupant) => occupant.denizenId === tutoringId)?.name}
          </h3>
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium">Destination</legend>
            {([
              { value: "researcher", label: "Researcher" },
              { value: "professor", label: "Professor" },
              { value: "librarian", label: "Librarian" },
              { value: "alchemist", label: "Alchemist" },
            ] as const).map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="tutor-destination"
                  checked={tutorKind === option.value}
                  onChange={() => applyTutorKind(option.value)}
                />
                {option.label}
              </label>
            ))}
            {presentation.campaignAcademicKinds.map((kind) => (
              <label key={kind.academicKindId} className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="tutor-destination"
                  checked={tutorKind === "campaign_academic" && tutorAcademicKindId === kind.academicKindId}
                  onChange={() => {
                    setTutorAcademicKindId(kind.academicKindId);
                    applyTutorKind("campaign_academic");
                  }}
                />
                {kind.name}
              </label>
            ))}
          </fieldset>
          {tutorKind === "researcher" && (
            <label className="block text-xs">
              Vacant Research Position
              <select
                className={fieldClass}
                value={tutorPositionId}
                onChange={(event) => {
                  setTutorPositionId(event.target.value);
                  if (tutoringId !== null) {
                    setTutorOrder(tutorAcademicOrderAfterDestination(
                      presentation.towerOccupants,
                      tutoringId,
                      { kind: "researcher", positionId: event.target.value as never },
                    ));
                  }
                }}
              >
                {vacantPositions.map((position) => (
                  <option key={position.positionId} value={position.positionId}>
                    {position.targetLabel}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tutorKind === "librarian" && (
            <label className="block text-xs">
              School
              <select
                className={fieldClass}
                value={`${tutorSchoolKind}:${tutorSchoolId}`}
                onChange={(event) => {
                  const [kind, id] = event.target.value.split(":");
                  setTutorSchoolKind(kind as "source" | "campaign");
                  setTutorSchoolId(id ?? "enchantment");
                }}
              >
                {sourceSchools.map((schoolId) => (
                  <option key={schoolId} value={`source:${schoolId}`}>{schoolPresentation({ kind: "source", schoolId }, schoolId).name}</option>
                ))}
                {presentation.campaignSchools.map((school) => (
                  <option key={school.schoolId} value={`campaign:${school.schoolId}`}>{school.name}</option>
                ))}
              </select>
            </label>
          )}
          {tutorKind === "alchemist" && (
            <label className="block text-xs">
              Recipe
              <select
                className={fieldClass}
                value={`${tutorRecipeKind}:${tutorRecipeId}`}
                onChange={(event) => {
                  const [kind, id] = event.target.value.split(":");
                  setTutorRecipeKind(kind as "builtin" | "campaign");
                  setTutorRecipeId(id ?? "first");
                }}
              >
                {builtinRecipes.map((recipeId) => (
                  <option key={recipeId} value={`builtin:${recipeId}`}>
                    {recipeId[0]!.toUpperCase() + recipeId.slice(1)} Alchemical Recipe
                  </option>
                ))}
                {presentation.campaignRecipes.map((recipe) => (
                  <option key={recipe.recipeId} value={`campaign:${recipe.recipeId}`}>{recipe.name}</option>
                ))}
              </select>
            </label>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-semibold">Academic order after tutoring</h4>
            <p className="text-[11px] text-[#5c4300]">Reliable Arcanists stay fixed at the top.</p>
            <ul className="space-y-1" aria-label="Fixed Reliable Arcanists">
              {visualTowerOccupants(presentation.towerOccupants.filter(isReliableArcanistOccupant)).map((occupant) => (
                <li key={occupant.denizenId} className="text-xs text-[#5c4300]">
                  {occupant.name} · fixed
                </li>
              ))}
            </ul>
            <ol className="space-y-1" aria-label="Academics that may be reordered">
              {visualTutorOrder.map((denizenId) => {
                const persistedIndex = tutorOrder.indexOf(denizenId);
                const occupant = academicOccupants(presentation.towerOccupants).find((entry) => entry.denizenId === denizenId)
                  ?? presentation.towerOccupants.find((entry) => entry.denizenId === denizenId);
                const name = occupant?.name ?? denizenId;
                const up = canMoveAcademic(presentation.towerOccupants, tutorOrder, persistedIndex, "up", treatAsNonStudent);
                const down = canMoveAcademic(presentation.towerOccupants, tutorOrder, persistedIndex, "down", treatAsNonStudent);
                return (
                  <li key={denizenId} className="flex items-center justify-between gap-2 rounded border border-[#BF9000]/40 bg-white/70 px-2 py-1">
                    <span className="text-xs">{name}</span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className={ghostBtn}
                        disabled={!up || pending}
                        aria-label={`Move ${name} up`}
                        title={up ? `Move ${name} up` : "Students must remain below every non-Student Academic"}
                        onClick={() => setTutorOrder(moveAcademic(
                          presentation.towerOccupants,
                          tutorOrder,
                          persistedIndex,
                          "up",
                          treatAsNonStudent,
                        ))}
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        className={ghostBtn}
                        disabled={!down || pending}
                        aria-label={`Move ${name} down`}
                        title={down ? `Move ${name} down` : "Students must remain below every non-Student Academic"}
                        onClick={() => setTutorOrder(moveAcademic(
                          presentation.towerOccupants,
                          tutorOrder,
                          persistedIndex,
                          "down",
                          treatAsNonStudent,
                        ))}
                      >
                        Move Down
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          {actionError !== null && <p className="text-xs text-[#990000]" role="alert">{actionError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className={btnClass}
              disabled={pending || currentTutorDestination() === null}
              onClick={async () => {
                const destination = currentTutorDestination();
                if (tutoringId === null || destination === null) return;
                try {
                  await onTutorStudent(tutoringId, destination, tutorOrder);
                  setTutoringId(null);
                } catch {
                  // Parent keeps the inline error; leave the draft open.
                }
              }}
            >
              Save tutoring
            </button>
            <button type="button" className={ghostBtn} onClick={() => setTutoringId(null)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
