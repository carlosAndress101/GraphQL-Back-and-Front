import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast.tsx";

afterEach(() => {
  cleanup();
});

function Probe() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success("Project created")}>
        Succeed
      </button>
      <button type="button" onClick={() => toast.error("Something failed")}>
        Fail
      </button>
    </>
  );
}

function renderToasts() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces success and error messages in a live region", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "Succeed" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    expect(screen.getByText("Project created")).toBeInTheDocument();
    expect(screen.getByText("Something failed")).toBeInTheDocument();
    expect(screen.getByRole("log", { name: "Notifications" })).toBeInTheDocument();
  });

  it("dismisses manually", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    expect(screen.getByText("Something failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Something failed")).not.toBeInTheDocument();
  });

  it("auto-dismisses after a timeout", () => {
    vi.useFakeTimers();
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "Succeed" }));
    expect(screen.getByText("Project created")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Project created")).not.toBeInTheDocument();
  });
});
