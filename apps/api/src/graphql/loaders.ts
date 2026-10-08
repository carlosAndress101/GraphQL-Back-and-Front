import DataLoader from "dataloader";
import type { Project } from "../modules/projects/project.types.ts";
import type { createProjectService } from "../modules/projects/project.service.ts";

type ProjectService = ReturnType<typeof createProjectService>;
type Viewer = Parameters<ProjectService["getMany"]>[0];
type TaskCounts = { total: number; completed: number };

export function createLoaders({ projects }: { projects: ProjectService }, viewer: Viewer) {
  const projectById = new DataLoader<string, Project | null>((projectIds) =>
    projects.getMany(viewer, [...projectIds]),
  );

  const taskCountsByProjectId = new DataLoader<string, TaskCounts>(async (projectIds) => {
    const counts = await projects.taskCounts(viewer, [...projectIds]);
    return projectIds.map((projectId) => counts.get(projectId) ?? { total: 0, completed: 0 });
  });

  return { projectById, taskCountsByProjectId };
}

export type Loaders = ReturnType<typeof createLoaders>;
