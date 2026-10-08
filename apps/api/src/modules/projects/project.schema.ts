import { z } from "zod";

export const ProjectIdSchema = z.uuid();

const ProjectDescriptionSchema = z
  .string()
  .trim()
  .max(2000)
  .transform((description) => (description === "" ? null : description))
  .nullable();

export const ProjectListArgsSchema = z
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
    search: z.preprocess(
      (search) => (search === null ? undefined : search),
      z
        .string()
        .trim()
        .max(100)
        .transform((search) => (search === "" ? undefined : search))
        .optional(),
    ),
  })
  .default(() => ({ first: 20 }));

export const CreateProjectInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: ProjectDescriptionSchema.nullish().transform((description) => description ?? null),
});

export const UpdateProjectInputSchema = z
  .strictObject({
    name: z.preprocess(
      (name) => (name === null ? undefined : name),
      z.string().trim().min(1).max(120).optional(),
    ),
    description: ProjectDescriptionSchema.optional(),
  })
  .refine((input) => input.name !== undefined || input.description !== undefined, {
    message: "Provide at least one field to update",
  });

export type CreateProjectInput = z.output<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.output<typeof UpdateProjectInputSchema>;
export type ProjectListArgs = z.output<typeof ProjectListArgsSchema>;
