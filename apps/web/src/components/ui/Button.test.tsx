import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button.tsx";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it("shows a spinner, disables itself and reports busy while loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders variants without a busy state by default", () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toBeDisabled();
  });
});
