import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  CreateTaskMutationVariables,
  DeleteTaskMutationVariables,
  ProjectTasksQuery,
  SetTaskCompletedMutationVariables,
  UpdateTaskMutationVariables,
} from "../../gql/graphql.ts";
import { request } from "../../lib/graphql.ts";
import { queryKeys } from "../../lib/query-keys.ts";
import {
  CreateTaskDocument,
  DeleteTaskDocument,
  ProjectTasksDocument,
  SetTaskCompletedDocument,
  UpdateTaskDocument,
} from "./operations.ts";

type TaskRecord = NonNullable<ProjectTasksQuery["project"]>["tasks"]["items"][number];
type TaskPages = InfiniteData<ProjectTasksQuery, string | null>;
type TaskListKey = ReturnType<typeof queryKeys.tasks.list>;
type TaskCacheSnapshot = {
  queryKey: TaskListKey;
  completed: boolean | null;
  data: TaskPages | undefined;
};
type UpdateTaskVariables = Omit<UpdateTaskMutationVariables, "id"> & {
  id: TaskRecord["id"];
  projectId: string;
};
type SetTaskCompletedVariables = Omit<SetTaskCompletedMutationVariables, "id"> & {
  id: TaskRecord["id"];
  projectId: string;
};
type DeleteTaskVariables = Omit<DeleteTaskMutationVariables, "id"> & {
  id: TaskRecord["id"];
  projectId: string;
};

const completionFilters = [null, false, true] as const;
const INITIAL_CURSOR: string | null = null;

function taskListKeys(projectId: string) {
  return completionFilters.map((completed) => ({
    queryKey: queryKeys.tasks.list(projectId, completed),
    completed,
  }));
}

function updateTaskPages(
  data: TaskPages | undefined,
  taskId: TaskRecord["id"],
  update: (task: TaskRecord) => TaskRecord | null,
): TaskPages | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => {
      if (!page.project) return page;
      return {
        ...page,
        project: {
          ...page.project,
          tasks: {
            ...page.project.tasks,
            items: page.project.tasks.items.flatMap((task) => {
              if (task.id !== taskId) return [task];
              const updatedTask = update(task);
              return updatedTask ? [updatedTask] : [];
            }),
          },
        },
      };
    }),
  };
}

function snapshotTaskCaches(queryClient: QueryClient, projectId: string): TaskCacheSnapshot[] {
  return taskListKeys(projectId).map(({ queryKey, completed }) => ({
    queryKey,
    completed,
    data: queryClient.getQueryData<TaskPages>(queryKey),
  }));
}

function restoreTaskCaches(queryClient: QueryClient, snapshots: TaskCacheSnapshot[]): void {
  for (const snapshot of snapshots) {
    queryClient.setQueryData<TaskPages>(snapshot.queryKey, snapshot.data);
  }
}

async function cancelProjectTaskQueries(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks.project(projectId) });
}

async function invalidateProjectTaskData(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() }),
  ]);
}

export function useProjectTasks(projectId: string, completed: boolean | null = null) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.list(projectId, completed),
    initialPageParam: INITIAL_CURSOR,
    queryFn: ({ pageParam }) =>
      request(ProjectTasksDocument, {
        id: projectId,
        first: 20,
        after: pageParam,
        completed: completed ?? undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.project?.tasks.nextCursor ?? undefined,
    enabled: projectId.length > 0,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: CreateTaskMutationVariables) => request(CreateTaskDocument, variables),
    onSuccess: async (_data, variables) => {
      await invalidateProjectTaskData(queryClient, String(variables.input.projectId));
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: UpdateTaskVariables) =>
      request(UpdateTaskDocument, { id: variables.id, input: variables.input }),
    onMutate: async (variables) => {
      await cancelProjectTaskQueries(queryClient, variables.projectId);
      const previousTasks = snapshotTaskCaches(queryClient, variables.projectId);
      for (const cache of previousTasks) {
        queryClient.setQueryData<TaskPages>(cache.queryKey, (current) =>
          updateTaskPages(current, variables.id, (task) => ({
            ...task,
            ...(variables.input.title === undefined || variables.input.title === null
              ? {}
              : { title: variables.input.title }),
          })),
        );
      }
      return { previousTasks };
    },
    onError: (_error, _variables, snapshot) => {
      if (snapshot) restoreTaskCaches(queryClient, snapshot.previousTasks);
    },
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(variables.projectId) }),
  });
}

export function useSetTaskCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SetTaskCompletedVariables) =>
      request(SetTaskCompletedDocument, {
        id: variables.id,
        completed: variables.completed,
      }),
    onMutate: async (variables) => {
      await cancelProjectTaskQueries(queryClient, variables.projectId);
      const previousTasks = snapshotTaskCaches(queryClient, variables.projectId);
      for (const cache of previousTasks) {
        queryClient.setQueryData<TaskPages>(cache.queryKey, (current) =>
          updateTaskPages(current, variables.id, (task) => {
            if (cache.completed !== null && cache.completed !== variables.completed) return null;
            return { ...task, completed: variables.completed };
          }),
        );
      }
      return { previousTasks };
    },
    onError: (_error, _variables, snapshot) => {
      if (snapshot) restoreTaskCaches(queryClient, snapshot.previousTasks);
    },
    onSettled: (_data, _error, variables) =>
      invalidateProjectTaskData(queryClient, variables.projectId),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: DeleteTaskVariables) =>
      request(DeleteTaskDocument, { id: variables.id }),
    onSuccess: async (_data, variables) => {
      await invalidateProjectTaskData(queryClient, variables.projectId);
    },
  });
}
