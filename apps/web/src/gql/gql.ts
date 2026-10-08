/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n": typeof types.MeDocument,
    "\n  mutation SignUp($input: CredentialsInput!) {\n    signUp(input: $input) {\n      id\n      email\n    }\n  }\n": typeof types.SignUpDocument,
    "\n  mutation SignIn($input: CredentialsInput!) {\n    signIn(input: $input) {\n      id\n      email\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignOut {\n    signOut\n  }\n": typeof types.SignOutDocument,
    "\n  query Projects($first: Int = 20, $after: String, $search: String) {\n    projects(first: $first, after: $after, search: $search) {\n      items {\n        id\n        name\n        description\n        createdAt\n        updatedAt\n        taskCounts {\n          total\n          completed\n        }\n      }\n      nextCursor\n    }\n  }\n": typeof types.ProjectsDocument,
    "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n": typeof types.ProjectDocument,
    "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n": typeof types.CreateProjectDocument,
    "\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n": typeof types.UpdateProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n": typeof types.DeleteProjectDocument,
    "\n  query ProjectTasks(\n    $id: ID!\n    $first: Int = 20\n    $after: String\n    $completed: Boolean\n  ) {\n    project(id: $id) {\n      id\n      tasks(first: $first, after: $after, completed: $completed) {\n        items {\n          id\n          title\n          completed\n          createdAt\n          updatedAt\n          project {\n            id\n          }\n        }\n        nextCursor\n      }\n    }\n  }\n": typeof types.ProjectTasksDocument,
    "\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n": typeof types.CreateTaskDocument,
    "\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n": typeof types.UpdateTaskDocument,
    "\n  mutation SetTaskCompleted($id: ID!, $completed: Boolean!) {\n    setTaskCompleted(id: $id, completed: $completed) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n": typeof types.SetTaskCompletedDocument,
    "\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id)\n  }\n": typeof types.DeleteTaskDocument,
};
const documents: Documents = {
    "\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n": types.MeDocument,
    "\n  mutation SignUp($input: CredentialsInput!) {\n    signUp(input: $input) {\n      id\n      email\n    }\n  }\n": types.SignUpDocument,
    "\n  mutation SignIn($input: CredentialsInput!) {\n    signIn(input: $input) {\n      id\n      email\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignOut {\n    signOut\n  }\n": types.SignOutDocument,
    "\n  query Projects($first: Int = 20, $after: String, $search: String) {\n    projects(first: $first, after: $after, search: $search) {\n      items {\n        id\n        name\n        description\n        createdAt\n        updatedAt\n        taskCounts {\n          total\n          completed\n        }\n      }\n      nextCursor\n    }\n  }\n": types.ProjectsDocument,
    "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n": types.ProjectDocument,
    "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n": types.CreateProjectDocument,
    "\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n": types.UpdateProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n": types.DeleteProjectDocument,
    "\n  query ProjectTasks(\n    $id: ID!\n    $first: Int = 20\n    $after: String\n    $completed: Boolean\n  ) {\n    project(id: $id) {\n      id\n      tasks(first: $first, after: $after, completed: $completed) {\n        items {\n          id\n          title\n          completed\n          createdAt\n          updatedAt\n          project {\n            id\n          }\n        }\n        nextCursor\n      }\n    }\n  }\n": types.ProjectTasksDocument,
    "\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n": types.CreateTaskDocument,
    "\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n": types.UpdateTaskDocument,
    "\n  mutation SetTaskCompleted($id: ID!, $completed: Boolean!) {\n    setTaskCompleted(id: $id, completed: $completed) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n": types.SetTaskCompletedDocument,
    "\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id)\n  }\n": types.DeleteTaskDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      email\n    }\n  }\n"): typeof import('./graphql').MeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignUp($input: CredentialsInput!) {\n    signUp(input: $input) {\n      id\n      email\n    }\n  }\n"): typeof import('./graphql').SignUpDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignIn($input: CredentialsInput!) {\n    signIn(input: $input) {\n      id\n      email\n    }\n  }\n"): typeof import('./graphql').SignInDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignOut {\n    signOut\n  }\n"): typeof import('./graphql').SignOutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Projects($first: Int = 20, $after: String, $search: String) {\n    projects(first: $first, after: $after, search: $search) {\n      items {\n        id\n        name\n        description\n        createdAt\n        updatedAt\n        taskCounts {\n          total\n          completed\n        }\n      }\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').ProjectsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n"): typeof import('./graphql').ProjectDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n"): typeof import('./graphql').CreateProjectDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      taskCounts {\n        total\n        completed\n      }\n    }\n  }\n"): typeof import('./graphql').UpdateProjectDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n"): typeof import('./graphql').DeleteProjectDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectTasks(\n    $id: ID!\n    $first: Int = 20\n    $after: String\n    $completed: Boolean\n  ) {\n    project(id: $id) {\n      id\n      tasks(first: $first, after: $after, completed: $completed) {\n        items {\n          id\n          title\n          completed\n          createdAt\n          updatedAt\n          project {\n            id\n          }\n        }\n        nextCursor\n      }\n    }\n  }\n"): typeof import('./graphql').ProjectTasksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n"): typeof import('./graphql').CreateTaskDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n"): typeof import('./graphql').UpdateTaskDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetTaskCompleted($id: ID!, $completed: Boolean!) {\n    setTaskCompleted(id: $id, completed: $completed) {\n      id\n      title\n      completed\n      createdAt\n      updatedAt\n      project {\n        id\n      }\n    }\n  }\n"): typeof import('./graphql').SetTaskCompletedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id)\n  }\n"): typeof import('./graphql').DeleteTaskDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
