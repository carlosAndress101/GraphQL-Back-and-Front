import React from 'react'

export const TaskCard = ({ task }) => {
  return <div>
    <h1>{task.title}</h1>
    <button>Delete</button>
  </div>
  
}
