import { graphql } from "../../gql/gql.ts";

export const ProjectsDocument = graphql(/* GraphQL */ `
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
`);

export const ProjectDocument = graphql(/* GraphQL */ `
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
`);

export const CreateProjectDocument = graphql(/* GraphQL */ `
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
`);

export const UpdateProjectDocument = graphql(/* GraphQL */ `
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
`);

export const DeleteProjectDocument = graphql(/* GraphQL */ `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`);
