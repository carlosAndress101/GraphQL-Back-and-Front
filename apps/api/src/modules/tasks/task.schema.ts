import { z } from "zod";

export const TaskIdSchema = z.uuid();

export const TaskListArgsSchema = z
  .strictObject({
    first: z
      .number()
      .int()
      .min(1)
      .max(100)
      .nullish()
      .transform((first) => first ?? 20)
      .default(20),
    after: z.preprocess((after) => (after === null ? undefined : after), z.string().optional()),
    completed: z.preprocess(
      (completed) => (completed === null ? undefined : completed),
      z.boolean().optional(),
    ),
  })
  .default(() => ({ first: 20 }));

export const CreateTaskInputSchema = z.strictObject({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
});

export const UpdateTaskInputSchema = z
  .strictObject({
    title: z.preprocess(
      (title) => (title === null ? undefined : title),
      z.string().trim().min(1).max(200).optional(),
    ),
  })
  .refine((input) => input.title !== undefined, {
    message: "Provide at least one field to update",
  });

export const SetTaskCompletedInputSchema = z.strictObject({
  id: TaskIdSchema,
  completed: z.boolean(),
});

export type CreateTaskInput = z.output<typeof CreateTaskInputSchema>;
export type UpdateTaskInput = z.output<typeof UpdateTaskInputSchema>;
export type TaskListArgs = z.output<typeof TaskListArgsSchema>;
