export const queryKeys = {
  me: () => ["me"] as const,
  projects: {
    all: () => ["projects"] as const,
    lists: () => [...queryKeys.projects.all(), "list"] as const,
    list: (search: string) => [...queryKeys.projects.lists(), search] as const,
    detail: (projectId: string) => [...queryKeys.projects.all(), "detail", projectId] as const,
  },
  tasks: {
    all: () => ["tasks"] as const,
    project: (projectId: string) => [...queryKeys.tasks.all(), "project", projectId] as const,
    list: (projectId: string, completed: boolean | null = null) =>
      [...queryKeys.tasks.project(projectId), "list", { completed }] as const,
  },
} as const;
