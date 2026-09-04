import { describe, it, expect } from "vitest";
import { getPhaseWorkspaceModel } from "../src/phase-workspace-model";

describe("getPhaseWorkspaceModel", () => {
  it("maps new_moon with display name, workspace kind, next phase, and action label", () => {
    const m = getPhaseWorkspaceModel("new_moon");
    expect(m.displayName).toBe("New Moon");
    expect(m.workspaceKind).toBe("new_moon");
    expect(m.nextPhase).toBe("visions");
    expect(m.actionLabel).toBe("Advance to Visions");
  });

  it("maps visions with display name, workspace kind, next phase, and action label", () => {
    const m = getPhaseWorkspaceModel("visions");
    expect(m.displayName).toBe("Visions");
    expect(m.workspaceKind).toBe("visions");
    expect(m.nextPhase).toBe("planning");
    expect(m.actionLabel).toBe("Advance to Planning");
  });

  it("does not expose an ordinary advance for meeting", () => {
    const m = getPhaseWorkspaceModel("meeting");
    expect(m.nextPhase).toBeNull();
    expect(m.actionLabel).toBeNull();
  });

  it("does not expose an ordinary advance for quiet", () => {
    const m = getPhaseWorkspaceModel("quiet");
    expect(m.nextPhase).toBeNull();
    expect(m.actionLabel).toBeNull();
  });
});
