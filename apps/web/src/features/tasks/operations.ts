import { graphql } from "../../gql/gql.ts";

export const ProjectTasksDocument = graphql(/* GraphQL */ `
  query ProjectTasks(
    $id: ID!
    $first: Int = 20
    $after: String
    $completed: Boolean
  ) {
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
`);

export const CreateTaskDocument = graphql(/* GraphQL */ `
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
`);

export const UpdateTaskDocument = graphql(/* GraphQL */ `
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
`);

export const SetTaskCompletedDocument = graphql(/* GraphQL */ `
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
`);

export const DeleteTaskDocument = graphql(/* GraphQL */ `
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`);
