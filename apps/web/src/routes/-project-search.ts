export type TaskFilter = "all" | "open" | "done";
export type ProjectSearch = { filter?: TaskFilter; edit?: "title" };

const filters: TaskFilter[] = ["all", "open", "done"];

export function validateProjectSearch(search: Record<string, unknown>): ProjectSearch {
  const filter = filters.includes(search.filter as TaskFilter) ? (search.filter as TaskFilter) : undefined;
  const edit = search.edit === "title" ? "title" : undefined;
  return { ...(filter ? { filter } : {}), ...(edit ? { edit } : {}) };
}

export function completedFromFilter(filter: TaskFilter | undefined): boolean | null {
  if (filter === "open") return false;
  if (filter === "done") return true;
  return null;
}
