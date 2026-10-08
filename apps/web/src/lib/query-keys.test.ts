import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys.ts";

describe("query keys", () => {
  it("separates the current user, project searches, and project details", () => {
    expect(queryKeys.me()).toEqual(["me"]);
    expect(queryKeys.projects.list("roadmap")).toEqual(["projects", "list", "roadmap"]);
    expect(queryKeys.projects.list("roadmap")).not.toEqual(queryKeys.projects.list("billing"));
    expect(queryKeys.projects.detail("project-1")).toEqual(["projects", "detail", "project-1"]);
  });

  it("separates project tasks by completion filter and supports a project-wide prefix", () => {
    expect(queryKeys.tasks.project("project-1")).toEqual(["tasks", "project", "project-1"]);
    expect(queryKeys.tasks.list("project-1")).toEqual([
      "tasks",
      "project",
      "project-1",
      "list",
      { completed: null },
    ]);
    expect(queryKeys.tasks.list("project-1", false)).not.toEqual(
      queryKeys.tasks.list("project-1", true),
    );
    expect(queryKeys.tasks.list("project-1", false)).not.toEqual(
      queryKeys.tasks.list("project-2", false),
    );
  });
});
