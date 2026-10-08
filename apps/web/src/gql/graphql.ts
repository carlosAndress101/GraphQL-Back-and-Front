/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type CreateProjectInput = {
  description?: string | null | undefined;
  name: string;
};

export type CreateTaskInput = {
  projectId: string | number;
  title: string;
};

export type CredentialsInput = {
  email: string;
  password: string;
};

export type UpdateProjectInput = {
  description?: string | null | undefined;
  name?: string | null | undefined;
};

export type UpdateTaskInput = {
  title?: string | null | undefined;
};

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, email: string } | null };

export type SignUpMutationVariables = Exact<{
  input: CredentialsInput;
}>;


export type SignUpMutation = { signUp: { id: string, email: string } };

export type SignInMutationVariables = Exact<{
  input: CredentialsInput;
}>;


export type SignInMutation = { signIn: { id: string, email: string } };

export type SignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type SignOutMutation = { signOut: boolean };

export type ProjectsQueryVariables = Exact<{
  first?: number | null | undefined;
  after?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type ProjectsQuery = { projects: { nextCursor: string | null, items: Array<{ id: string, name: string, description: string | null, createdAt: string, updatedAt: string, taskCounts: { total: number, completed: number } }> } };

export type ProjectQueryVariables = Exact<{
  id: string | number;
}>;


export type ProjectQuery = { project: { id: string, name: string, description: string | null, createdAt: string, updatedAt: string, taskCounts: { total: number, completed: number } } | null };

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;


export type CreateProjectMutation = { createProject: { id: string, name: string, description: string | null, createdAt: string, updatedAt: string, taskCounts: { total: number, completed: number } } };

export type UpdateProjectMutationVariables = Exact<{
  id: string | number;
  input: UpdateProjectInput;
}>;


export type UpdateProjectMutation = { updateProject: { id: string, name: string, description: string | null, createdAt: string, updatedAt: string, taskCounts: { total: number, completed: number } } };

export type DeleteProjectMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteProjectMutation = { deleteProject: string };

export type ProjectTasksQueryVariables = Exact<{
  id: string | number;
  first?: number | null | undefined;
  after?: string | null | undefined;
  completed?: boolean | null | undefined;
}>;


export type ProjectTasksQuery = { project: { id: string, tasks: { nextCursor: string | null, items: Array<{ id: string, title: string, completed: boolean, createdAt: string, updatedAt: string, project: { id: string } }> } } | null };

export type CreateTaskMutationVariables = Exact<{
  input: CreateTaskInput;
}>;


export type CreateTaskMutation = { createTask: { id: string, title: string, completed: boolean, createdAt: string, updatedAt: string, project: { id: string } } };

export type UpdateTaskMutationVariables = Exact<{
  id: string | number;
  input: UpdateTaskInput;
}>;


export type UpdateTaskMutation = { updateTask: { id: string, title: string, completed: boolean, createdAt: string, updatedAt: string, project: { id: string } } };

export type SetTaskCompletedMutationVariables = Exact<{
  id: string | number;
  completed: boolean;
}>;


export type SetTaskCompletedMutation = { setTaskCompleted: { id: string, title: string, completed: boolean, createdAt: string, updatedAt: string, project: { id: string } } };

export type DeleteTaskMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteTaskMutation = { deleteTask: string };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const MeDocument = new TypedDocumentString(`
    query Me {
  me {
    id
    email
  }
}
    `, {"hash":"sha256:b3e8b1589134c285a85c83f8b4f7986f97c1f1a6288eda202de906005c81bdad"}) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;
export const SignUpDocument = new TypedDocumentString(`
    mutation SignUp($input: CredentialsInput!) {
  signUp(input: $input) {
    id
    email
  }
}
    `, {"hash":"sha256:72df496d7febc86e04c8315485245d81cad540d4602efc9290505cbfa1360d4c"}) as unknown as TypedDocumentString<SignUpMutation, SignUpMutationVariables>;
export const SignInDocument = new TypedDocumentString(`
    mutation SignIn($input: CredentialsInput!) {
  signIn(input: $input) {
    id
    email
  }
}
    `, {"hash":"sha256:c944a852733727a0f21d76d95002681b728a531d080f318714c81dfb2bc0606b"}) as unknown as TypedDocumentString<SignInMutation, SignInMutationVariables>;
export const SignOutDocument = new TypedDocumentString(`
    mutation SignOut {
  signOut
}
    `, {"hash":"sha256:39300be1f6ff47633a8c264de2a924d5b71367b646d3bf86d82d7c51c6543956"}) as unknown as TypedDocumentString<SignOutMutation, SignOutMutationVariables>;
export const ProjectsDocument = new TypedDocumentString(`
    query Projects($first: Int = 20, $after: String, $search: String) {
  projects(first: $first, after: $after, search: $search) {
    items {
      id
      name
      description
      createdAt
      updatedAt
      taskCounts {
        total
        completed
      }
    }
    nextCursor
  }
}
    `, {"hash":"sha256:0bcc94567475d179fdb89979d09bec9013ef3fcacedb00a1ab27ca183d4b7acf"}) as unknown as TypedDocumentString<ProjectsQuery, ProjectsQueryVariables>;
export const ProjectDocument = new TypedDocumentString(`
    query Project($id: ID!) {
  project(id: $id) {
    id
    name
    description
    createdAt
    updatedAt
    taskCounts {
      total
      completed
    }
  }
}
    `, {"hash":"sha256:b119854409400445cebdffdbf1390439c355f1179cf357d8a849cb1fce85b816"}) as unknown as TypedDocumentString<ProjectQuery, ProjectQueryVariables>;
export const CreateProjectDocument = new TypedDocumentString(`
    mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
    name
    description
    createdAt
    updatedAt
    taskCounts {
      total
      completed
    }
  }
}
    `, {"hash":"sha256:9c182f7311aa7ac619935d8ca8a4ec0db56a9f0f2ab1441b8068f06e8cbe2934"}) as unknown as TypedDocumentString<CreateProjectMutation, CreateProjectMutationVariables>;
export const UpdateProjectDocument = new TypedDocumentString(`
    mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
  updateProject(id: $id, input: $input) {
    id
    name
    description
    createdAt
    updatedAt
    taskCounts {
      total
      completed
    }
  }
}
    `, {"hash":"sha256:538276ed7f4c9c256a3ae336681fd336016a678ddbd23e57e49d8d6daa7c9400"}) as unknown as TypedDocumentString<UpdateProjectMutation, UpdateProjectMutationVariables>;
export const DeleteProjectDocument = new TypedDocumentString(`
    mutation DeleteProject($id: ID!) {
  deleteProject(id: $id)
}
    `, {"hash":"sha256:2192fbb8d9514480de11b93adeb4569a7360fd8335fda87bf36782f5400cb985"}) as unknown as TypedDocumentString<DeleteProjectMutation, DeleteProjectMutationVariables>;
export const ProjectTasksDocument = new TypedDocumentString(`
    query ProjectTasks($id: ID!, $first: Int = 20, $after: String, $completed: Boolean) {
  project(id: $id) {
    id
    tasks(first: $first, after: $after, completed: $completed) {
      items {
        id
        title
        completed
        createdAt
        updatedAt
        project {
          id
        }
      }
      nextCursor
    }
  }
}
    `, {"hash":"sha256:c3c2dab152baf1204eecc98cc539dbdf35c03d1fd00828717ecc0b1190ed6dee"}) as unknown as TypedDocumentString<ProjectTasksQuery, ProjectTasksQueryVariables>;
export const CreateTaskDocument = new TypedDocumentString(`
    mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    id
    title
    completed
    createdAt
    updatedAt
    project {
      id
    }
  }
}
    `, {"hash":"sha256:13ed3416f2b0515b5c48102b98c0e0de38d5307ac3dc8b2cf6ee49fe5d510e53"}) as unknown as TypedDocumentString<CreateTaskMutation, CreateTaskMutationVariables>;
export const UpdateTaskDocument = new TypedDocumentString(`
    mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
  updateTask(id: $id, input: $input) {
    id
    title
    completed
    createdAt
    updatedAt
    project {
      id
    }
  }
}
    `, {"hash":"sha256:395292d6cc4563ce756d1ea139b89dcc338f19beb4f6b2c939f7b4fb84a360bb"}) as unknown as TypedDocumentString<UpdateTaskMutation, UpdateTaskMutationVariables>;
export const SetTaskCompletedDocument = new TypedDocumentString(`
    mutation SetTaskCompleted($id: ID!, $completed: Boolean!) {
  setTaskCompleted(id: $id, completed: $completed) {
    id
    title
    completed
    createdAt
    updatedAt
    project {
      id
    }
  }
}
    `, {"hash":"sha256:98da1adb4eb7143b7f757496f97c33282b7c35430e66c859e27878aa44419534"}) as unknown as TypedDocumentString<SetTaskCompletedMutation, SetTaskCompletedMutationVariables>;
export const DeleteTaskDocument = new TypedDocumentString(`
    mutation DeleteTask($id: ID!) {
  deleteTask(id: $id)
}
    `, {"hash":"sha256:d1c432918cf290ea700614b89464aeca41389a1cb98255c24f3220163d0e89c4"}) as unknown as TypedDocumentString<DeleteTaskMutation, DeleteTaskMutationVariables>;