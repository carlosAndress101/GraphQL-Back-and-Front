import type { MutationResolvers, TaskResolvers } from "../__generated__/resolvers-types.ts";
import type { GraphQLContext } from "../context.ts";
import { notFound } from "../../lib/errors.ts";

export const taskMutationResolvers: MutationResolvers<GraphQLContext> = {
  createTask: (_parent, { input }, context) => context.services.tasks.create(context.viewer, input),
  updateTask: (_parent, { id, input }, context) =>
    context.services.tasks.update(context.viewer, id, input),
  setTaskCompleted: (_parent, { id, completed }, context) =>
    context.services.tasks.setCompleted(context.viewer, id, completed),
  deleteTask: (_parent, { id }, context) => context.services.tasks.delete(context.viewer, id),
};

export const taskFieldResolvers: TaskResolvers<GraphQLContext> = {
  project: async (task, _args, context) => {
    const project = await context.loaders.projectById.load(task.projectId);
    if (!project) throw notFound("Project");
    return project;
  },
};
