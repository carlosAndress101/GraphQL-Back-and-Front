import { and, asc, count, eq, gt, inArray, or, sql, type SQL } from "drizzle-orm";
import { projects, tasks } from "../../infrastructure/database/schema.ts";
import type { Database } from "../../infrastructure/database/client.ts";
import { decodeCursor, encodeCursor } from "../../lib/cursor.ts";
import type { Task } from "./task.types.ts";

type TaskChanges = Partial<Pick<Task, "title">>;

export type TaskPageOptions = {
  first: number;
  after?: string | undefined;
  completed?: boolean | undefined;
};

export function createTaskRepository(db: Database) {
  async function findById(ownerId: string, id: string): Promise<Task | null> {
    const [result] = await db
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.id, id), eq(projects.ownerId, ownerId)))
      .limit(1);
    return result?.task ?? null;
  }

  async function update(ownerId: string, id: string, changes: TaskChanges): Promise<Task | null> {
    if (Object.keys(changes).length === 0) {
      return findById(ownerId, id);
    }

    const ownedProjectIds = db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, ownerId));
    const [task] = await db
      .update(tasks)
      .set(changes)
      .where(and(eq(tasks.id, id), inArray(tasks.projectId, ownedProjectIds)))
      .returning();
    return task ?? null;
  }

  return {
    async create(ownerId: string, input: Pick<Task, "projectId" | "title">): Promise<Task | null> {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ownerId)))
        .limit(1);
      if (!project) {
        return null;
      }

      const [task] = await db
        .insert(tasks)
        .values({ projectId: input.projectId, title: input.title })
        .returning();
      if (!task) {
        throw new Error("Task insert did not return a row");
      }
      return task;
    },

    findById,

    async findManyByIds(ownerId: string, ids: string[]): Promise<Task[]> {
      if (ids.length === 0) {
        return [];
      }

      const results = await db
        .select({ task: tasks })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(inArray(tasks.id, ids), eq(projects.ownerId, ownerId)));
      return results.map(({ task }) => task);
    },

    async listByProject(
      ownerId: string,
      projectId: string,
      options: TaskPageOptions,
    ): Promise<{ items: Task[]; nextCursor: string | null }> {
      const conditions: SQL[] = [eq(tasks.projectId, projectId), eq(projects.ownerId, ownerId)];

      if (options.completed !== undefined) {
        conditions.push(eq(tasks.completed, options.completed));
      }

      if (options.after !== undefined) {
        const cursor = decodeCursor(options.after);
        const cursorCondition = or(
          gt(tasks.createdAt, cursor.createdAt),
          and(eq(tasks.createdAt, cursor.createdAt), gt(tasks.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const rows = await db
        .select({ task: tasks })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(asc(tasks.createdAt), asc(tasks.id))
        .limit(options.first + 1);
      const hasNextPage = rows.length > options.first;
      const items = (hasNextPage ? rows.slice(0, options.first) : rows).map(({ task }) => task);
      const last = items.at(-1);

      return {
        items,
        nextCursor:
          hasNextPage && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
      };
    },

    update,

    async setCompleted(ownerId: string, id: string, completed: boolean): Promise<Task | null> {
      const ownedProjectIds = db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.ownerId, ownerId));
      const [task] = await db
        .update(tasks)
        .set({ completed })
        .where(and(eq(tasks.id, id), inArray(tasks.projectId, ownedProjectIds)))
        .returning();
      return task ?? null;
    },

    async delete(ownerId: string, id: string): Promise<boolean> {
      const ownedProjectIds = db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.ownerId, ownerId));
      const deleted = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), inArray(tasks.projectId, ownedProjectIds)))
        .returning({ id: tasks.id });
      return deleted.length > 0;
    },

    async countsByProjectIds(
      ownerId: string,
      projectIds: string[],
    ): Promise<Array<{ projectId: string; total: number; completed: number }>> {
      if (projectIds.length === 0) {
        return [];
      }

      return db
        .select({
          projectId: tasks.projectId,
          total: count(),
          completed: sql<number>`count(*) filter (where ${tasks.completed})`.mapWith(Number),
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(inArray(projects.id, projectIds), eq(projects.ownerId, ownerId)))
        .groupBy(tasks.projectId);
    },
  };
}
