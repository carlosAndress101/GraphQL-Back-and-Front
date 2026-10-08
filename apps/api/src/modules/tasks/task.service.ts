import type { createTaskRepository } from "./task.repository.ts";
import {
  CreateTaskInputSchema,
  SetTaskCompletedInputSchema,
  TaskIdSchema,
  TaskListArgsSchema,
  UpdateTaskInputSchema,
} from "./task.schema.ts";
import { AppError, notFound, parseInput, unauthenticated } from "../../lib/errors.ts";
import { InvalidCursorError } from "../../lib/cursor.ts";
import type { Task } from "./task.types.ts";

type TaskRepository = ReturnType<typeof createTaskRepository>;
type Viewer = { id: string } | null;

export function createTaskService({ tasks }: { tasks: TaskRepository }) {
  return {
    async listByProject(viewer: Viewer, projectId: unknown, args: unknown) {
      if (!viewer) throw unauthenticated();
      const id = parseInput(TaskIdSchema, projectId);
      const options = parseInput(TaskListArgsSchema, args);

      try {
        return await tasks.listByProject(viewer.id, id, options);
      } catch (error) {
        if (error instanceof InvalidCursorError) {
          throw new AppError("BAD_USER_INPUT", "Invalid input", { after: [error.message] });
        }
        throw error;
      }
    },

    async create(viewer: Viewer, input: unknown): Promise<Task> {
      if (!viewer) throw unauthenticated();
      const taskInput = parseInput(CreateTaskInputSchema, input);
      const task = await tasks.create(viewer.id, taskInput);
      if (!task) throw notFound("Project");
      return task;
    },

    async update(viewer: Viewer, id: unknown, input: unknown): Promise<Task> {
      if (!viewer) throw unauthenticated();
      const taskId = parseInput(TaskIdSchema, id);
      const changes = parseInput(UpdateTaskInputSchema, input);
      const task = await tasks.update(viewer.id, taskId, changes);
      if (!task) throw notFound("Task");
      return task;
    },

    async setCompleted(viewer: Viewer, id: unknown, completed: unknown): Promise<Task> {
      if (!viewer) throw unauthenticated();
      const input = parseInput(SetTaskCompletedInputSchema, { id, completed });
      const task = await tasks.setCompleted(viewer.id, input.id, input.completed);
      if (!task) throw notFound("Task");
      return task;
    },

    async delete(viewer: Viewer, id: unknown): Promise<string> {
      if (!viewer) throw unauthenticated();
      const taskId = parseInput(TaskIdSchema, id);
      const deleted = await tasks.delete(viewer.id, taskId);
      if (!deleted) throw notFound("Task");
      return taskId;
    },
  };
}
