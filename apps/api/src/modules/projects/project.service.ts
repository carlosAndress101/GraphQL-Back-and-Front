import type { createProjectRepository } from "./project.repository.ts";
import {
  CreateProjectInputSchema,
  ProjectIdSchema,
  ProjectListArgsSchema,
  UpdateProjectInputSchema,
} from "./project.schema.ts";
import type { createTaskRepository } from "../tasks/task.repository.ts";
import { AppError, notFound, parseInput, unauthenticated } from "../../lib/errors.ts";
import { InvalidCursorError } from "../../lib/cursor.ts";
import type { Project } from "./project.types.ts";

type ProjectRepository = ReturnType<typeof createProjectRepository>;
type TaskRepository = ReturnType<typeof createTaskRepository>;
type Viewer = { id: string } | null;

export function createProjectService({
  projects,
  tasks,
}: {
  projects: ProjectRepository;
  tasks: TaskRepository;
}) {
  return {
    async list(viewer: Viewer, args: unknown) {
      if (!viewer) throw unauthenticated();
      const options = parseInput(ProjectListArgsSchema, args);

      try {
        return await projects.list(viewer.id, options);
      } catch (error) {
        if (error instanceof InvalidCursorError) {
          throw new AppError("BAD_USER_INPUT", "Invalid input", { after: [error.message] });
        }
        throw error;
      }
    },

    async get(viewer: Viewer, id: unknown): Promise<Project | null> {
      if (!viewer) throw unauthenticated();
      const projectId = parseInput(ProjectIdSchema, id);
      return projects.findById(viewer.id, projectId);
    },

    async create(viewer: Viewer, input: unknown): Promise<Project> {
      if (!viewer) throw unauthenticated();
      const project = parseInput(CreateProjectInputSchema, input);
      return projects.create(viewer.id, project);
    },

    async update(viewer: Viewer, id: unknown, input: unknown): Promise<Project> {
      if (!viewer) throw unauthenticated();
      const projectId = parseInput(ProjectIdSchema, id);
      const changes = parseInput(UpdateProjectInputSchema, input);
      const project = await projects.update(viewer.id, projectId, changes);
      if (!project) throw notFound("Project");
      return project;
    },

    async delete(viewer: Viewer, id: unknown): Promise<string> {
      if (!viewer) throw unauthenticated();
      const projectId = parseInput(ProjectIdSchema, id);
      const deletedId = await projects.delete(viewer.id, projectId);
      if (!deletedId) throw notFound("Project");
      return deletedId;
    },

    async taskCounts(
      viewer: Viewer,
      projectIds: unknown,
    ): Promise<Map<string, { total: number; completed: number }>> {
      if (!viewer) throw unauthenticated();
      const ids = parseInput(ProjectIdSchema.array(), projectIds);
      const counts = new Map(ids.map((id) => [id, { total: 0, completed: 0 }]));
      const rows = await tasks.countsByProjectIds(viewer.id, ids);
      for (const row of rows) {
        counts.set(row.projectId, { total: row.total, completed: row.completed });
      }
      return counts;
    },

    async getMany(viewer: Viewer, ids: unknown): Promise<Array<Project | null>> {
      if (!viewer) throw unauthenticated();
      const projectIds = parseInput(ProjectIdSchema.array(), ids);
      const rows = await projects.findManyByIds(viewer.id, projectIds);
      const byId = new Map(rows.map((project) => [project.id, project]));
      return projectIds.map((projectId) => byId.get(projectId) ?? null);
    },
  };
}
