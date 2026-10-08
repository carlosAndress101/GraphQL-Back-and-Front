import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs.tsx";

afterEach(() => {
  cleanup();
});

const ITEMS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

function Harness({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState("all");
  return (
    <Tabs
      tabs={ITEMS}
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
      label="Task view"
    />
  );
}

describe("Tabs", () => {
  it("moves selection and focus with arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(id: string) => void>();
    render(<Harness onChange={onChange} />);
    const all = screen.getByRole("tab", { name: "All" });
    expect(all).toHaveAttribute("aria-selected", "true");
    await user.click(all);
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("open");
    expect(screen.getByRole("tab", { name: "Open" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Open" })).toHaveAttribute("aria-selected", "true");
  });

  it("wraps around and supports Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "All" }));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Done" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "All" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Done" })).toHaveFocus();
  });
});
