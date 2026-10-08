import { and, asc, eq, gt, ilike, inArray, or, type SQL } from "drizzle-orm";
import { projects } from "../../infrastructure/database/schema.ts";
import type { Database } from "../../infrastructure/database/client.ts";
import { decodeCursor, encodeCursor } from "../../lib/cursor.ts";
import type { Project } from "./project.types.ts";

type ProjectUpdate = Partial<Pick<Project, "name" | "description">>;

export type ProjectPageOptions = {
  first: number;
  after?: string | undefined;
  search?: string | undefined;
};

export function createProjectRepository(db: Database) {
  async function findById(ownerId: string, id: string): Promise<Project | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .limit(1);
    return project ?? null;
  }

  return {
    async create(ownerId: string, input: Pick<Project, "name" | "description">): Promise<Project> {
      const [project] = await db
        .insert(projects)
        .values({ ...input, ownerId })
        .returning();
      if (!project) {
        throw new Error("Project insert did not return a row");
      }
      return project;
    },

    findById,

    async findManyByIds(ownerId: string, ids: string[]): Promise<Project[]> {
      if (ids.length === 0) {
        return [];
      }

      return db
        .select()
        .from(projects)
        .where(and(eq(projects.ownerId, ownerId), inArray(projects.id, ids)));
    },

    async list(
      ownerId: string,
      options: ProjectPageOptions,
    ): Promise<{ items: Project[]; nextCursor: string | null }> {
      const conditions: SQL[] = [eq(projects.ownerId, ownerId)];

      if (options.search !== undefined) {
        const pattern = `%${escapeLikePattern(options.search)}%`;
        const searchCondition = or(
          ilike(projects.name, pattern),
          ilike(projects.description, pattern),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      if (options.after !== undefined) {
        const cursor = decodeCursor(options.after);
        const cursorCondition = or(
          gt(projects.createdAt, cursor.createdAt),
          and(eq(projects.createdAt, cursor.createdAt), gt(projects.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const rows = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(asc(projects.createdAt), asc(projects.id))
        .limit(options.first + 1);
      const hasNextPage = rows.length > options.first;
      const items = hasNextPage ? rows.slice(0, options.first) : rows;
      const last = items.at(-1);

      return {
        items,
        nextCursor:
          hasNextPage && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
      };
    },

    async update(ownerId: string, id: string, changes: ProjectUpdate): Promise<Project | null> {
      if (Object.keys(changes).length === 0) {
        return findById(ownerId, id);
      }

      const [project] = await db
        .update(projects)
        .set(changes)
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
        .returning();
      return project ?? null;
    },

    async delete(ownerId: string, id: string): Promise<string | null> {
      const deleted = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
        .returning({ id: projects.id });
      return deleted[0]?.id ?? null;
    },
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
