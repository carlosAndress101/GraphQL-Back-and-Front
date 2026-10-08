import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "./AppShell.tsx";

afterEach(() => {
  cleanup();
});

function shell() {
  return render(
    <AppShell
      sidebar={<nav aria-label="Test nav">Nav content</nav>}
      topbar={<div>Topbar content</div>}
    >
      <p>Main content</p>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("toggles the drawer and reports it on the menu button", async () => {
    const user = userEvent.setup();
    const { container } = shell();
    const menu = screen.getByRole("button", { name: "Toggle navigation" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    const aside = screen.getByRole("complementary");
    expect(aside.className).toContain("-translate-x-full");

    await user.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(aside.className).toContain("translate-x-0");
    expect(container.textContent).toContain("Nav content");
    expect(screen.getByText("Topbar content")).toBeInTheDocument();
    expect(screen.getByText("Main content")).toBeInTheDocument();
  });

  it("closes on overlay click and on Escape", async () => {
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole("button", { name: "Toggle navigation" }));
    await user.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.getByRole("button", { name: "Toggle navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await user.click(screen.getByRole("button", { name: "Toggle navigation" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Toggle navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
