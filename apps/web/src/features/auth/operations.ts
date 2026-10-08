import { graphql } from "../../gql/gql.ts";

export const MeDocument = graphql(/* GraphQL */ `
  query Me {
    me {
      id
      email
    }
  }
`);

export const SignUpDocument = graphql(/* GraphQL */ `
  mutation SignUp($input: CredentialsInput!) {
    signUp(input: $input) {
      id
      email
    }
  }
`);

export const SignInDocument = graphql(/* GraphQL */ `
  mutation SignIn($input: CredentialsInput!) {
    signIn(input: $input) {
      id
      email
    }
  }
`);

export const SignOutDocument = graphql(/* GraphQL */ `
  mutation SignOut {
    signOut
  }
`);
