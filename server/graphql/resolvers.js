import Project from "../models/Project.js";
import Task from "../models/Task.js"
export const resolvers = {
    Query:{
        hello: () => "Hello world!",
        //Todos los proyectos
        projects: async () => {
            return await Project.find()
        },
        //Buscar proyecto en especifico
        project: async (_, {_id}) => await Project.findById(_id),
        //Todas las tareas
        tasks: async () =>{
            return await Task.find()
        },
        //Buscar tareas en especifico
        task: async (_, {_id}) => await Task.findById(_id)
    },


    /**Mutates in graphql*/
    Mutation:{
        //Crear proyecto
        createProject: async (_, {name, description}) =>{
            const project = new Project({
                name,
                description
            });
            const saveProject = await project.save();
            return saveProject;
        },
        //crear tarea
        createTask: async (_, {title, projectId}) =>{
            const projectFound = await Project.findById(projectId);
            if(!projectFound) throw new Error("Project not found");
            const task = new Task({
                title,
                projectId
            });
            const saveTask = await task.save();
            return saveTask;
        },
        //eliminar proyecto
        deleteProject: async (_, {_id}) => {
            const deletedProject = await Project.findByIdAndDelete(_id)
            if(!deletedProject) throw new Error('Project not found for deletion');
            return deletedProject
        },
        //eliminar tarea
        deleteTask: async (_,{_id}) =>{
            const deletedTask = await Task.findByIdAndDelete(_id);
            if(!deletedTask) throw new Error('Task not found for deletion');
            return deletedTask
        }
    }
};