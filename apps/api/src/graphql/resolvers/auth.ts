import type { MutationResolvers, QueryResolvers } from "../__generated__/resolvers-types.ts";
import type { GraphQLContext } from "../context.ts";

export const authQueryResolvers: QueryResolvers<GraphQLContext> = {
  me: (_parent, _args, context) => context.viewer,
};

export const authMutationResolvers: MutationResolvers<GraphQLContext> = {
  signUp: async (_parent, { input }, context) => {
    const session = await context.services.auth.signUp(input, { clientIp: context.clientIp });
    context.cookies.set(session.sessionToken, session.expiresAt);
    return session.user;
  },
  signIn: async (_parent, { input }, context) => {
    const session = await context.services.auth.signIn(input, {
      clientIp: context.clientIp,
      currentToken: context.cookies.sessionToken,
    });
    context.cookies.set(session.sessionToken, session.expiresAt);
    return session.user;
  },
  signOut: async (_parent, _args, context) => {
    await context.services.auth.signOut(context.cookies.sessionToken);
    context.cookies.clear();
    return true;
  },
};
