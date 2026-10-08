import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar, type SidebarProject, type SidebarProps } from "./Sidebar.tsx";

afterEach(() => {
  cleanup();
});

const PROJECTS: SidebarProject[] = [
  { id: "1", name: "Alpha", openCount: 3, active: true },
  { id: "2", name: "Beta", openCount: 0, active: false },
];

function setup(overrides?: Partial<SidebarProps>) {
  const props: SidebarProps = {
    workspaceName: "Acme",
    onSearch: vi.fn<() => void>(),
    projects: PROJECTS,
    renderLink: (item: SidebarProject, content: ReactNode) => (
      <a href={`/projects/${item.id}`}>{content}</a>
    ),
    onNewProject: vi.fn<() => void>(),
    userEmail: "ana@example.com",
    onSignOut: vi.fn<() => void>(),
    ...overrides,
  };
  render(<Sidebar {...props} />);
  return props;
}

describe("Sidebar", () => {
  it("renders projects through renderLink", () => {
    setup();
    const alpha = screen.getByRole("link", { name: /Alpha/ });
    expect(alpha).toHaveAttribute("href", "/projects/1");
    expect(screen.getByRole("link", { name: /Beta/ })).toHaveAttribute("href", "/projects/2");
  });

  it("shows no load-more button by default", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("loads more projects on click", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn<() => void>();
    setup({ hasMore: true, onLoadMore });
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows the loading state while fetching", () => {
    setup({ hasMore: true, onLoadMore: vi.fn<() => void>(), loadingMore: true });
    const button = screen.getByRole("button", { name: "Load more" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
