import { describe, it, expect } from "vitest";
import { playShellWidthMode } from "../src/play-shell-layout";

describe("playShellWidthMode", () => {
  it("returns 'wide' when dual-pane play is visible", () => {
    expect(playShellWidthMode(false, true)).toBe("wide");
  });

  it("returns 'normal' when secondary is hidden", () => {
    expect(playShellWidthMode(false, false)).toBe("normal");
  });

  it("returns 'normal' when Campaign Tools is visible even if secondary state is enabled", () => {
    expect(playShellWidthMode(true, true)).toBe("normal");
  });

  it("returns 'normal' when Campaign Tools is visible and secondary is hidden", () => {
    expect(playShellWidthMode(true, false)).toBe("normal");
  });
});
