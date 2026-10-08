import { and, eq, gt, lte } from "drizzle-orm";
import { sessions, users } from "../../infrastructure/database/schema.ts";
import type { Database } from "../../infrastructure/database/client.ts";
import type { Session } from "./session.types.ts";
import type { User } from "../users/user.types.ts";

export function createSessionRepository(db: Database) {
  return {
    async create(input: Pick<Session, "idHash" | "userId" | "expiresAt">): Promise<Session> {
      const [session] = await db.insert(sessions).values(input).returning();
      if (!session) {
        throw new Error("Session insert did not return a row");
      }
      return session;
    },

    async findValid(idHash: string, now: Date): Promise<{ session: Session; user: User } | null> {
      const [result] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, now)))
        .limit(1);

      return result ?? null;
    },

    async extend(idHash: string, expiresAt: Date): Promise<Session | null> {
      const [session] = await db
        .update(sessions)
        .set({ expiresAt })
        .where(eq(sessions.idHash, idHash))
        .returning();

      return session ?? null;
    },

    async delete(idHash: string): Promise<boolean> {
      const deleted = await db
        .delete(sessions)
        .where(eq(sessions.idHash, idHash))
        .returning({ idHash: sessions.idHash });

      return deleted.length > 0;
    },

    async deleteExpired(now: Date): Promise<number> {
      const deleted = await db
        .delete(sessions)
        .where(lte(sessions.expiresAt, now))
        .returning({ idHash: sessions.idHash });

      return deleted.length;
    },
  };
}
