export type AppEnvironmentBadge = "local-dev" | "preview";

export interface AppEnvironment {
  readonly badge: AppEnvironmentBadge | null;
  readonly demoToolsEnabled: boolean;
  readonly isPreview: boolean;
}

export function resolveAppEnvironment(input: {
  readonly dev: boolean;
  readonly isPreview: boolean;
}): AppEnvironment {
  if (input.dev) {
    return {
      badge: "local-dev",
      demoToolsEnabled: true,
      isPreview: input.isPreview,
    };
  }
  if (input.isPreview) {
    return {
      badge: "preview",
      demoToolsEnabled: true,
      isPreview: true,
    };
  }
  return {
    badge: null,
    demoToolsEnabled: false,
    isPreview: false,
  };
}
