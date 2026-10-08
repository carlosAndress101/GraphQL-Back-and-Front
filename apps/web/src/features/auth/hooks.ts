import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SignInMutationVariables, SignUpMutationVariables } from "../../gql/graphql.ts";
import { request } from "../../lib/graphql.ts";
import { queryKeys } from "../../lib/query-keys.ts";
import { MeDocument, SignInDocument, SignOutDocument, SignUpDocument } from "./operations.ts";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => request(MeDocument, {}),
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SignUpMutationVariables) => request(SignUpDocument, variables),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.me(), { me: data.signUp });
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SignInMutationVariables) => request(SignInDocument, variables),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.me(), { me: data.signIn });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => request(SignOutDocument, {}),
    onSuccess: () => queryClient.clear(),
  });
}
