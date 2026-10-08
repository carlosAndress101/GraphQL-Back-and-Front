import type { Resolvers } from "../__generated__/resolvers-types.ts";
import { scalarResolvers } from "../scalars.ts";
import { authMutationResolvers, authQueryResolvers } from "./auth.ts";
import {
  projectFieldResolvers,
  projectMutationResolvers,
  projectQueryResolvers,
} from "./projects.ts";
import { taskFieldResolvers, taskMutationResolvers } from "./tasks.ts";

export const resolvers: Resolvers = {
  ...scalarResolvers,
  Query: { ...authQueryResolvers, ...projectQueryResolvers },
  Mutation: { ...authMutationResolvers, ...projectMutationResolvers, ...taskMutationResolvers },
  Project: projectFieldResolvers,
  Task: taskFieldResolvers,
};
