import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

afterEach(() => {
  cleanup();
});

function stubDialog() {
  window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

function noop() {}

describe("ConfirmDialog", () => {
  it("confirms and cancels through buttons", async () => {
    stubDialog();
    const user = userEvent.setup();
    const onConfirm = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    render(
      <ConfirmDialog
        open
        title="Delete project?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    const dialog = document.querySelector("dialog");
    expect(dialog).toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("reports closing on Esc and focuses the safe action on open", async () => {
    stubDialog();
    const onClose = vi.fn<() => void>();
    render(
      <ConfirmDialog open title="Delete project?" onConfirm={() => {}} onClose={onClose} />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    const dialog = document.querySelector("dialog");
    if (!dialog) throw new Error("dialog missing");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("gives each dialog unique title and description ids", () => {
    stubDialog();
    render(
      <>
        <ConfirmDialog
          open
          title="First"
          description="First description"
          onConfirm={noop}
          onClose={noop}
        />
        <ConfirmDialog
          open
          title="Second"
          description="Second description"
          onConfirm={noop}
          onClose={noop}
        />
      </>,
    );
    const dialogs = document.querySelectorAll("dialog");
    expect(dialogs).toHaveLength(2);
    const first = dialogs[0]?.getAttribute("aria-labelledby");
    const second = dialogs[1]?.getAttribute("aria-labelledby");
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
    expect(first ? document.getElementById(first)?.textContent : null).toBe("First");
    expect(second ? document.getElementById(second)?.textContent : null).toBe("Second");
  });
});
