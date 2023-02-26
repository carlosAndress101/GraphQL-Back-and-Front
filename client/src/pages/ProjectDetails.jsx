import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { GET_PROJECT } from "../graphql/projects";
import { TasksList } from '../components/tasks/TasksList';
import { TaskForm } from '../components/tasks/TaskForm';

export function ProjectDetails() {
  const params = useParams();
  const { loading, error, data } = useQuery(GET_PROJECT, {
    variables: {
      id: params.id,
    },
    skip: !params.id,
  });

  console.log(data);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error</p>;
  return <div>
      
      <h1>{data.project.name}</h1>
      <p>{data.project.description}</p>
      <button>Delete</button>
      <TaskForm/>
      <TasksList tasks={data.project.tasks}/>
    </div>
  
}
