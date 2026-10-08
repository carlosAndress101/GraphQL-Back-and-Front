import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Spinner } from "./Spinner.tsx";

export type InlineEditableProps = {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
};

/**
 * Notion-style editable text. Renders as text; click, Enter or focus switches
 * to an input (textarea when multiline). Enter saves single-line, Esc cancels,
 * blur saves, Ctrl/Cmd+Enter saves multiline. Async onSave shows pending.
 */
export function InlineEditable({
  value,
  onSave,
  label,
  placeholder = "Empty",
  multiline = false,
  className = "",
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = () => {
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    triggerRef.current?.focus();
  };

  const save = async (next: string) => {
    if (next === value) {
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      await onSave(next);
    } finally {
      if (mountedRef.current) {
        setPending(false);
        setEditing(false);
      }
    }
  };

  if (!editing) {
    return (
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Edit ${label}`}
        onClick={start}
        className={`rounded px-1 py-0.5 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent ${value ? "" : "text-subtle"} ${className}`}
      >
        {value || placeholder}
      </button>
    );
  }

  const shared = {
    "aria-label": label,
    autoFocus: true,
    disabled: pending,
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(event.target.value);
    },
    onBlur: () => {
      if (!pending) void save(draft);
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void save(draft);
      }
    },
    className:
      "w-full rounded border border-accent bg-surface px-1 py-0.5 text-text focus-visible:outline-2 focus-visible:outline-accent",
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {multiline ? (
        <textarea rows={3} {...shared} />
      ) : (
        <input type="text" {...shared} />
      )}
      {pending && <Spinner size="sm" />}
    </span>
  );
}
