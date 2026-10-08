import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { AuthUser } from '../../modules/auth/auth.service.ts';
import type { Project as ProjectModel } from '../../modules/projects/project.types.ts';
import type { Task as TaskModel } from '../../modules/tasks/task.types.ts';
import type { GraphQLContext } from '../context.ts';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO-8601 date-time string, e.g. 2026-10-08T12:00:00.000Z */
  DateTime: { input: Date; output: Date; }
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateTaskInput = {
  projectId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type CredentialsInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createProject: Project;
  createTask: Task;
  /** Deletes the project and, by cascade, its tasks. Returns the deleted id. */
  deleteProject: Scalars['ID']['output'];
  deleteTask: Scalars['ID']['output'];
  setTaskCompleted: Task;
  signIn: User;
  signOut: Scalars['Boolean']['output'];
  signUp: User;
  updateProject: Project;
  updateTask: Task;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetTaskCompletedArgs = {
  completed: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationSignInArgs = {
  input: CredentialsInput;
};


export type MutationSignUpArgs = {
  input: CredentialsInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateTaskArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTaskInput;
};

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  taskCounts: TaskCounts;
  tasks: TaskPage;
  updatedAt: Scalars['DateTime']['output'];
};


export type ProjectTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  completed?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type ProjectPage = {
  __typename?: 'ProjectPage';
  items: Array<Project>;
  /** Pass as `after` to fetch the next page. Null when there are no more items. */
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** The signed-in user, or null when there is no valid session. */
  me?: Maybe<User>;
  /** Null when the project does not exist or belongs to another user. */
  project?: Maybe<Project>;
  projects: ProjectPage;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Task = {
  __typename?: 'Task';
  completed: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  project: Project;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TaskCounts = {
  __typename?: 'TaskCounts';
  completed: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type TaskPage = {
  __typename?: 'TaskPage';
  items: Array<Task>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTaskInput = {
  title?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateProjectInput: CreateProjectInput;
  CreateTaskInput: CreateTaskInput;
  CredentialsInput: CredentialsInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Project: ResolverTypeWrapper<ProjectModel>;
  ProjectPage: ResolverTypeWrapper<Omit<ProjectPage, 'items'> & { items: Array<ResolversTypes['Project']> }>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Task: ResolverTypeWrapper<TaskModel>;
  TaskCounts: ResolverTypeWrapper<TaskCounts>;
  TaskPage: ResolverTypeWrapper<Omit<TaskPage, 'items'> & { items: Array<ResolversTypes['Task']> }>;
  UpdateProjectInput: UpdateProjectInput;
  UpdateTaskInput: UpdateTaskInput;
  User: ResolverTypeWrapper<AuthUser>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  CreateProjectInput: CreateProjectInput;
  CreateTaskInput: CreateTaskInput;
  CredentialsInput: CredentialsInput;
  DateTime: Scalars['DateTime']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  Project: ProjectModel;
  ProjectPage: Omit<ProjectPage, 'items'> & { items: Array<ResolversParentTypes['Project']> };
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  Task: TaskModel;
  TaskCounts: TaskCounts;
  TaskPage: Omit<TaskPage, 'items'> & { items: Array<ResolversParentTypes['Task']> };
  UpdateProjectInput: UpdateProjectInput;
  UpdateTaskInput: UpdateTaskInput;
  User: AuthUser;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input'>>;
  createTask?: Resolver<ResolversTypes['Task'], ParentType, ContextType, RequireFields<MutationCreateTaskArgs, 'input'>>;
  deleteProject?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteProjectArgs, 'id'>>;
  deleteTask?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteTaskArgs, 'id'>>;
  setTaskCompleted?: Resolver<ResolversTypes['Task'], ParentType, ContextType, RequireFields<MutationSetTaskCompletedArgs, 'completed' | 'id'>>;
  signIn?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  signUp?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'input'>>;
  updateProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>>;
  updateTask?: Resolver<ResolversTypes['Task'], ParentType, ContextType, RequireFields<MutationUpdateTaskArgs, 'id' | 'input'>>;
};

export type ProjectResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  taskCounts?: Resolver<ResolversTypes['TaskCounts'], ParentType, ContextType>;
  tasks?: Resolver<ResolversTypes['TaskPage'], ParentType, ContextType, RequireFields<ProjectTasksArgs, 'first'>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type ProjectPageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProjectPage'] = ResolversParentTypes['ProjectPage']> = {
  items?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryProjectArgs, 'id'>>;
  projects?: Resolver<ResolversTypes['ProjectPage'], ParentType, ContextType, RequireFields<QueryProjectsArgs, 'first'>>;
};

export type TaskResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Task'] = ResolversParentTypes['Task']> = {
  completed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<ResolversTypes['Project'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type TaskCountsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TaskCounts'] = ResolversParentTypes['TaskCounts']> = {
  completed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type TaskPageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TaskPage'] = ResolversParentTypes['TaskPage']> = {
  items?: Resolver<Array<ResolversTypes['Task']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  DateTime?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectPage?: ProjectPageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  TaskCounts?: TaskCountsResolvers<ContextType>;
  TaskPage?: TaskPageResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

