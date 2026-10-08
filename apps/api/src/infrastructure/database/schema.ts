import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored normalized (trimmed + lowercase) by the auth service.
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt,
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the session token; the raw token only lives in the cookie.
    idHash: text("id_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  // Serves the owner's keyset pagination: WHERE owner_id = ? ORDER BY created_at, id.
  (table) => [index("projects_owner_page_idx").on(table.ownerId, table.createdAt, table.id)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt,
    updatedAt,
  },
  // Serves per-project keyset pagination and the task-count aggregation.
  (table) => [index("tasks_project_page_idx").on(table.projectId, table.createdAt, table.id)],
);
