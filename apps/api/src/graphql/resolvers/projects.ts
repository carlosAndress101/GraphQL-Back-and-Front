import type {
  MutationResolvers,
  ProjectResolvers,
  QueryResolvers,
} from "../__generated__/resolvers-types.ts";
import type { GraphQLContext } from "../context.ts";

export const projectQueryResolvers: QueryResolvers<GraphQLContext> = {
  projects: (_parent, args, context) => context.services.projects.list(context.viewer, args),
  project: (_parent, { id }, context) => context.services.projects.get(context.viewer, id),
};

export const projectMutationResolvers: MutationResolvers<GraphQLContext> = {
  createProject: (_parent, { input }, context) =>
    context.services.projects.create(context.viewer, input),
  updateProject: (_parent, { id, input }, context) =>
    context.services.projects.update(context.viewer, id, input),
  deleteProject: (_parent, { id }, context) => context.services.projects.delete(context.viewer, id),
};

export const projectFieldResolvers: ProjectResolvers<GraphQLContext> = {
  taskCounts: (project, _args, context) => context.loaders.taskCountsByProjectId.load(project.id),
  tasks: (project, args, context) =>
    context.services.tasks.listByProject(context.viewer, project.id, args),
};
