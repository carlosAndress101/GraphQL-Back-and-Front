import { projects, sessions, tasks, users } from "../src/infrastructure/database/schema.ts";
import type { Project } from "../src/modules/projects/project.types.ts";
import type { Session } from "../src/modules/auth/session.types.ts";
import type { Task } from "../src/modules/tasks/task.types.ts";
import type { User } from "../src/modules/users/user.types.ts";

type Assert<T extends true> = T;
type IsAssignable<Source, Target> = Source extends Target ? true : false;

export type UserRowFitsDomain = Assert<IsAssignable<typeof users.$inferSelect, User>>;
export type ProjectRowFitsDomain = Assert<IsAssignable<typeof projects.$inferSelect, Project>>;
export type TaskRowFitsDomain = Assert<IsAssignable<typeof tasks.$inferSelect, Task>>;
export type SessionRowFitsDomain = Assert<IsAssignable<typeof sessions.$inferSelect, Session>>;
