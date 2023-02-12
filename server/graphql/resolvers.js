import Project from "../models/Project.js";
export const resolvers = {
    Query:{
        hello: () => "Hello world!",
        project: async () => {
            return await Project.find()
        }
    },


    /**Mutates in graphql*/
    Mutation:{
        createProject: async (_, {name, description}) =>{
            const Project = new Project({
                name,
                description
            });
            const saveProject = await Project.save();
            return saveProject;
        }
    }
};