import React from "react";

export const TaskForm = () => {

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(e.target.title.value)
  };
  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="title" placeholder="Write title" autoComplete="off" />
      <button>Add</button>
    </form>
  );
};
