import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineEditable } from "./InlineEditable.tsx";

afterEach(() => {
  cleanup();
});

function Harness({ onSave }: { onSave: (value: string) => void }) {
  const [value, setValue] = useState("Old title");
  return (
    <InlineEditable
      value={value}
      label="Project title"
      onSave={(next) => {
        setValue(next);
        onSave(next);
      }}
    />
  );
}

describe("InlineEditable", () => {
  it("saves on Enter", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(value: string) => void>();
    render(<Harness onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Edit Project title" }));
    const input = screen.getByLabelText("Project title");
    await user.clear(input);
    await user.type(input, "New title{Enter}");
    expect(onSave).toHaveBeenCalledWith("New title");
    expect(screen.getByRole("button", { name: "Edit Project title" })).toHaveTextContent(
      "New title",
    );
  });

  it("cancels on Escape without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(value: string) => void>();
    render(<InlineEditable value="Old title" onSave={onSave} label="Project title" />);
    await user.click(screen.getByRole("button", { name: "Edit Project title" }));
    const input = screen.getByLabelText("Project title");
    await user.clear(input);
    await user.type(input, "Discarded");
    await user.keyboard("{Escape}");
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit Project title" })).toHaveTextContent(
      "Old title",
    );
  });

  it("saves on blur", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(value: string) => void>();
    render(<Harness onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Edit Project title" }));
    const input = screen.getByLabelText("Project title");
    await user.clear(input);
    await user.type(input, "Blurred title");
    await user.tab();
    expect(onSave).toHaveBeenCalledWith("Blurred title");
  });

  it("shows pending while onSave resolves", async () => {
    const user = userEvent.setup();
    let resolveSave!: (value: void) => void;
    const onSave = vi.fn<(value: string) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<InlineEditable value="Old title" onSave={onSave} label="Project title" />);
    await user.click(screen.getByRole("button", { name: "Edit Project title" }));
    const input = screen.getByLabelText("Project title");
    await user.clear(input);
    await user.type(input, "Slow title{Enter}");
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => {
      resolveSave();
    });
    expect(onSave).toHaveBeenCalledWith("Slow title");
  });

  it("stays editing with the draft intact when saving fails", async () => {
    const user = userEvent.setup();
    const failingSave = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    function FailingHarness() {
      const [value, setValue] = useState("Old title");
      return (
        <InlineEditable
          value={value}
          label="Project title"
          onSave={async (next) => {
            await failingSave(next);
            setValue(next);
          }}
        />
      );
    }
    const onSave = failingSave;
    render(<FailingHarness />);
    await user.click(screen.getByRole("button", { name: "Edit Project title" }));
    const input = screen.getByLabelText("Project title");
    await user.clear(input);
    await user.type(input, "Unsaved work{Enter}");
    expect(onSave).toHaveBeenCalledTimes(1);
    // Still editing: draft intact, trigger gone, focus kept in the field.
    expect(screen.getByLabelText("Project title")).toHaveValue("Unsaved work");
    expect(screen.getByLabelText("Project title")).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Edit Project title" })).not.toBeInTheDocument();
    // Retry succeeds and exits edit mode.
    await user.clear(screen.getByLabelText("Project title"));
    await user.type(screen.getByLabelText("Project title"), "Saved work{Enter}");
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole("button", { name: "Edit Project title" }),
    ).toHaveTextContent("Saved work");
  });

  it("supports multiline editing where Enter adds a line", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(value: string) => void>();
    render(
      <InlineEditable value="Line one" onSave={onSave} label="Description" multiline />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Description" }));
    const area = screen.getByLabelText("Description");
    expect(area.tagName).toBe("TEXTAREA");
    await user.type(area, "{Enter}Line two");
    expect(onSave).not.toHaveBeenCalled();
    await user.tab();
    expect(onSave).toHaveBeenCalledWith("Line one\nLine two");
  });

  it("shows the placeholder when empty", () => {
    render(
      <InlineEditable value="" onSave={() => {}} label="Description" placeholder="Add text…" />,
    );
    expect(screen.getByRole("button", { name: "Edit Description" })).toHaveTextContent(
      "Add text…",
    );
  });
});
