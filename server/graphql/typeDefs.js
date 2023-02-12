import { gql } from 'graphql-tag';

export const typeDefs = gql `
    type Query {
        hello: String
        project: [Project]
    }

    type Mutation {
        createProject(name: String, description: String): Project
    }

    type Project {
        _id: ID
        name: String
        description: String
        createAt: String
        updatedAt: String
    }
`;