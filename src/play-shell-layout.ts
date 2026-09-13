export type ShellWidthMode = "normal" | "wide";

export const PLAY_SHELL_WIDE_MAX_CLASS = "max-w-[1800px]";
export const PLAY_SHELL_NORMAL_MAX_CLASS = "max-w-5xl";

export function playShellWidthMode(
  showTools: boolean,
  _showSecondary: boolean,
): ShellWidthMode {
  if (showTools) return "normal";
  return "wide";
}

export function playShellWidthClass(mode: ShellWidthMode): string {
  return mode === "wide" ? PLAY_SHELL_WIDE_MAX_CLASS : PLAY_SHELL_NORMAL_MAX_CLASS;
}
