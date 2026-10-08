import { eq } from "drizzle-orm";
import { users } from "../../infrastructure/database/schema.ts";
import type { Database } from "../../infrastructure/database/client.ts";
import type { User } from "./user.types.ts";

export function createUserRepository(db: Database) {
  return {
    async create(input: Pick<User, "email" | "passwordHash">): Promise<User> {
      const [user] = await db.insert(users).values(input).returning();
      if (!user) {
        throw new Error("User insert did not return a row");
      }
      return user;
    },

    async findByEmail(email: string): Promise<User | null> {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return user ?? null;
    },

    async findById(id: string): Promise<User | null> {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user ?? null;
    },
  };
}
