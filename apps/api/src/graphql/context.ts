import { generateCookie } from "hono/cookie";
import type { Logger } from "../infrastructure/logging/logger.ts";
import type { AuthService, AuthUser } from "../modules/auth/auth.service.ts";
import type { SessionCookie } from "../modules/auth/session-cookie.ts";
import type { createProjectService } from "../modules/projects/project.service.ts";
import type { createTaskService } from "../modules/tasks/task.service.ts";
import type { Loaders } from "./loaders.ts";

export type ProjectService = ReturnType<typeof createProjectService>;
export type TaskService = ReturnType<typeof createTaskService>;

export type GraphQLContext = {
  viewer: AuthUser | null;
  services: { auth: AuthService; projects: ProjectService; tasks: TaskService };
  cookies: CookieCollector;
  clientIp: string;
  logger: Logger;
  requestId: string;
  loaders: Loaders;
};

export type CookieCollector = {
  sessionToken: string | undefined;
  set: (token: string, expiresAt: Date) => void;
  clear: () => void;
};

/**
 * Collects Set-Cookie values for the Hono handler to append after Yoga
 * responds. `generateCookie` is Hono's public `serialize` wrapper
 * (`serialize` itself is not exported from `hono/cookie`).
 */
export function createCookieCollector(
  sessionToken: string | undefined,
  cookie: SessionCookie,
  emit: (setCookieValue: string) => void,
): CookieCollector {
  return {
    sessionToken,
    set: (token, expiresAt) => {
      emit(generateCookie(cookie.name, token, { ...cookie.options, expires: expiresAt }));
    },
    clear: () => {
      emit(generateCookie(cookie.name, "", { ...cookie.options, expires: new Date(0), maxAge: 0 }));
    },
  };
}

export type RequestContextInput = {
  viewer: AuthUser | null;
  sessionToken: string | undefined;
  clientIp: string;
  requestId: string;
  cookie: SessionCookie;
  emitSetCookie: (value: string) => void;
  loaders: Loaders;
};

export function createGraphQLContext(
  services: { auth: AuthService; projects: ProjectService; tasks: TaskService },
  logger: Logger,
  input: RequestContextInput,
): GraphQLContext {
  return {
    viewer: input.viewer,
    services,
    cookies: createCookieCollector(input.sessionToken, input.cookie, input.emitSetCookie),
    clientIp: input.clientIp,
    logger,
    requestId: input.requestId,
    loaders: input.loaders,
  };
}
