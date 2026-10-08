import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox.tsx";

afterEach(() => {
  cleanup();
});

function Controlled({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return <Checkbox label={label} checked={checked} onChange={(event) => setChecked(event.target.checked)} />;
}

describe("Checkbox", () => {
  it("toggles by clicking its label", async () => {
    const user = userEvent.setup();
    render(<Controlled label="Remember me" />);
    const box = screen.getByRole("checkbox", { name: "Remember me" });
    expect(box).not.toBeChecked();
    await user.click(screen.getByText("Remember me"));
    expect(box).toBeChecked();
  });

  it("toggles with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Controlled label="Remember me" />);
    const box = screen.getByRole("checkbox", { name: "Remember me" });
    box.focus();
    await user.keyboard(" ");
    expect(box).toBeChecked();
    await user.keyboard(" ");
    expect(box).not.toBeChecked();
  });

  it("supports an aria-label without visible text", () => {
    render(<Checkbox aria-label="Mark as done: Write tests" />);
    expect(screen.getByRole("checkbox", { name: "Mark as done: Write tests" })).toBeInTheDocument();
  });
});
