/**
 * The generated client preset imports this type, but the approved web
 * dependencies intentionally do not include its package as a direct dep.
 * The generated string document only relies on this type-level decoration.
 */
declare module "@graphql-typed-document-node/core" {
  export interface DocumentTypeDecoration<TResult, TVariables> {
    __apiType?: (variables: TVariables) => TResult;
  }
}
