import { describe, it, expect } from "vitest";
import {
  PLAY_SHELL_NORMAL_MAX_CLASS,
  PLAY_SHELL_WIDE_MAX_CLASS,
  playShellWidthClass,
  playShellWidthMode,
} from "../src/play-shell-layout";

describe("playShellWidthMode", () => {
  it("returns 'wide' when dual-pane play is visible", () => {
    expect(playShellWidthMode(false, true)).toBe("wide");
  });

  it("returns 'wide' for primary-only play instead of the old narrow normal canvas", () => {
    expect(playShellWidthMode(false, false)).toBe("wide");
  });

  it("returns 'normal' when Campaign Tools is visible even if secondary state is enabled", () => {
    expect(playShellWidthMode(true, true)).toBe("normal");
  });

  it("returns 'normal' when Campaign Tools is visible and secondary is hidden", () => {
    expect(playShellWidthMode(true, false)).toBe("normal");
  });

  it("maps wide play to the ~1800px desktop workspace", () => {
    expect(PLAY_SHELL_WIDE_MAX_CLASS).toBe("max-w-[1800px]");
    expect(playShellWidthClass("wide")).toBe(PLAY_SHELL_WIDE_MAX_CLASS);
    expect(playShellWidthClass("normal")).toBe(PLAY_SHELL_NORMAL_MAX_CLASS);
  });
});
