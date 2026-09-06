import { describe, it, expect } from "vitest";
import { wizardCreationDefaults } from "../src/setup-view-model";

describe("wizardCreationDefaults", () => {
  it("status null + player selected => default Present", () => {
    const d = wizardCreationDefaults({
      currentStatus: null,
      currentWatcherPlayerId: null,
      portrayedByPlayerId: "plr_1",
    });
    expect(d.applyStatusDefault).toBe(true);
    expect(d.defaultStatus).toBe("present");
  });

  it("status 'silent' + player selected => do not change status", () => {
    const d = wizardCreationDefaults({
      currentStatus: "silent",
      currentWatcherPlayerId: null,
      portrayedByPlayerId: "plr_1",
    });
    expect(d.applyStatusDefault).toBe(false);
  });

  it("status 'absent' + player selected => do not change status", () => {
    const d = wizardCreationDefaults({
      currentStatus: "absent",
      currentWatcherPlayerId: null,
      portrayedByPlayerId: "plr_1",
    });
    expect(d.applyStatusDefault).toBe(false);
  });

  it("existing explicit Watcher + player selected => do not overwrite Watcher", () => {
    const d = wizardCreationDefaults({
      currentStatus: null,
      currentWatcherPlayerId: "plr_existing",
      portrayedByPlayerId: "plr_1",
    });
    expect(d.applyWatcherDefault).toBe(false);
  });

  it("no Watcher + player selected => default Watcher to portraying Player", () => {
    const d = wizardCreationDefaults({
      currentStatus: null,
      currentWatcherPlayerId: null,
      portrayedByPlayerId: "plr_1",
    });
    expect(d.applyWatcherDefault).toBe(true);
    expect(d.defaultWatcherPlayerId).toBe("plr_1");
  });

  it("no portraying Player => no Present default and no Watcher default", () => {
    const d = wizardCreationDefaults({
      currentStatus: null,
      currentWatcherPlayerId: null,
      portrayedByPlayerId: null,
    });
    expect(d.applyStatusDefault).toBe(false);
    expect(d.applyWatcherDefault).toBe(false);
  });

  it("no portraying Player with existing status and watcher => no defaults", () => {
    const d = wizardCreationDefaults({
      currentStatus: "silent",
      currentWatcherPlayerId: "plr_existing",
      portrayedByPlayerId: null,
    });
    expect(d.applyStatusDefault).toBe(false);
    expect(d.applyWatcherDefault).toBe(false);
  });
});
