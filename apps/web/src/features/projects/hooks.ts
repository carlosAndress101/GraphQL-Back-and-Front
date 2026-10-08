import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type {
  CreateProjectMutationVariables,
  DeleteProjectMutationVariables,
  ProjectQuery,
  ProjectsQuery,
  UpdateProjectMutationVariables,
} from "../../gql/graphql.ts";
import { request } from "../../lib/graphql.ts";
import { queryKeys } from "../../lib/query-keys.ts";
import {
  CreateProjectDocument,
  DeleteProjectDocument,
  ProjectDocument,
  ProjectsDocument,
  UpdateProjectDocument,
} from "./operations.ts";

type ProjectRecord = ProjectsQuery["projects"]["items"][number];
type ProjectPages = InfiniteData<ProjectsQuery, string | null>;
type ProjectPatch = UpdateProjectMutationVariables["input"];
const INITIAL_CURSOR: string | null = null;

function patchProject(project: ProjectRecord, patch: ProjectPatch): ProjectRecord {
  return {
    ...project,
    ...(patch.name === undefined || patch.name === null ? {} : { name: patch.name }),
    ...(patch.description === undefined ? {} : { description: patch.description }),
  };
}

function patchProjectDetail(
  data: ProjectQuery | undefined,
  projectId: string,
  patch: ProjectPatch,
): ProjectQuery | undefined {
  if (!data?.project || data.project.id !== projectId) return data;
  return { ...data, project: patchProject(data.project, patch) };
}

function patchProjectPages(
  data: ProjectPages | undefined,
  projectId: string,
  patch: ProjectPatch,
): ProjectPages | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      projects: {
        ...page.projects,
        items: page.projects.items.map((project) =>
          project.id === projectId ? patchProject(project, patch) : project,
        ),
      },
    })),
  };
}

export function useProjects(search = "") {
  return useInfiniteQuery(projectsQueryOptions(search));
}

export function projectsQueryOptions(search = "") {
  const normalizedSearch = search.trim();

  return infiniteQueryOptions({
    queryKey: queryKeys.projects.list(normalizedSearch),
    initialPageParam: INITIAL_CURSOR,
    queryFn: ({ pageParam }) =>
      request(ProjectsDocument, {
        first: 20,
        after: pageParam,
        search: normalizedSearch || undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.projects.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useProject(projectId: string) {
  return useQuery({ ...projectQueryOptions(projectId), enabled: projectId.length > 0 });
}

export function projectQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => request(ProjectDocument, { id: projectId }),
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: CreateProjectMutationVariables) =>
      request(CreateProjectDocument, variables),
    onSuccess: async (data) => {
      queryClient.setQueryData<ProjectQuery>(queryKeys.projects.detail(data.createProject.id), {
        project: data.createProject,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: UpdateProjectMutationVariables) =>
      request(UpdateProjectDocument, variables),
    onMutate: async (variables) => {
      const detailKey = queryKeys.projects.detail(String(variables.id));
      const listsKey = queryKeys.projects.lists();
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: listsKey }),
      ]);

      const previousDetail = queryClient.getQueryData<ProjectQuery>(detailKey);
      const previousLists = queryClient.getQueriesData<ProjectPages>({ queryKey: listsKey });
      queryClient.setQueryData<ProjectQuery>(detailKey, (current) =>
        patchProjectDetail(current, String(variables.id), variables.input),
      );
      for (const [key] of previousLists) {
        queryClient.setQueryData<ProjectPages>(key, (current) =>
          patchProjectPages(current, String(variables.id), variables.input),
        );
      }

      return { previousDetail, previousLists };
    },
    onError: (_error, variables, snapshot) => {
      if (!snapshot) return;

      queryClient.setQueryData(
        queryKeys.projects.detail(String(variables.id)),
        snapshot.previousDetail,
      );
      for (const [key, data] of snapshot.previousLists) {
        queryClient.setQueryData<ProjectPages>(key, data);
      }
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(String(variables.id)),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() }),
      ]);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: DeleteProjectMutationVariables) =>
      request(DeleteProjectDocument, variables),
    onSuccess: async (_data, variables) => {
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(String(variables.id)),
        exact: true,
      });
      queryClient.removeQueries({ queryKey: queryKeys.tasks.project(String(variables.id)) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}
