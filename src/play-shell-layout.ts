export type ShellWidthMode = "normal" | "wide";

export function playShellWidthMode(
  showTools: boolean,
  showSecondary: boolean,
): ShellWidthMode {
  if (showTools) return "normal";
  return showSecondary ? "wide" : "normal";
}
