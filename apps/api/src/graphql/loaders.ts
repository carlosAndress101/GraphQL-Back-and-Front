import type { AuthService, AuthUser } from "../modules/auth/auth.service.ts";
import type { ProjectService, TaskService } from "./context.ts";

/**
 * Per-request DataLoaders. Empty until DEVELOPER 1 (round 3B) adds
 * projectById and taskCountsByProjectId, created from services + viewer.
 */
export type Loaders = Record<string, never>;

export function createLoaders(
  _services: { auth: AuthService; projects: ProjectService; tasks: TaskService },
  _viewer: AuthUser | null,
): Loaders {
  return {};
}
