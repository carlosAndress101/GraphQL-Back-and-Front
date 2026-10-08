import type { Resolvers } from "../__generated__/resolvers-types.ts";
import { scalarResolvers } from "../scalars.ts";
import { authMutationResolvers, authQueryResolvers } from "./auth.ts";

// DEVELOPER 1 (round 3B) adds projects.ts/tasks.ts maps here.
export const resolvers: Resolvers = {
  ...scalarResolvers,
  Query: { ...authQueryResolvers },
  Mutation: { ...authMutationResolvers },
};
