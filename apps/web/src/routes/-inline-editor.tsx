import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type InlineEditorProps = {
  value: string;
  label: string;
  onSave: (value: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
};

export function InlineEditor({
  value,
  label,
  onSave,
  className = "",
  multiline = false,
  placeholder,
}: InlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ source: value, value });
  const cancelOnBlur = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftValue = draft.source === value ? draft.value : value;

  useEffect(() => {
    if (!editing) return;
    if (multiline) textareaRef.current?.focus();
    else inputRef.current?.focus();
  }, [editing, multiline]);

  function saveOnBlur() {
    if (cancelOnBlur.current) {
      cancelOnBlur.current = false;
      return;
    }
    if (!editing) return;
    setEditing(false);
    onSave(multiline ? draftValue : draftValue.trim());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelOnBlur.current = true;
      setDraft({ source: value, value });
      setEditing(false);
      return;
    }

    if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  if (editing) {
    const classNames = `w-full rounded-md border border-border bg-surface px-2 py-1 text-text focus-visible:outline-2 focus-visible:outline-accent ${className}`;
    return multiline ? (
      <textarea
        aria-label={label}
        className={classNames}
        onBlur={saveOnBlur}
        onChange={(event) => setDraft({ source: value, value: event.currentTarget.value })}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={3}
        value={draftValue}
      />
    ) : (
      <input
        aria-label={label}
        className={classNames}
        onBlur={saveOnBlur}
        onChange={(event) => setDraft({ source: value, value: event.currentTarget.value })}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        type="text"
        value={draftValue}
      />
    );
  }

  return (
    <div className="group flex min-w-0 items-start gap-2">
      <span className={`min-w-0 whitespace-pre-wrap ${className}`}>
        {value || <span className="italic text-muted">{placeholder}</span>}
      </span>
      <button
        aria-label={`Edit ${label.toLowerCase()}`}
        className="shrink-0 rounded px-2 py-1 text-xs text-muted underline opacity-70 hover:bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent group-hover:opacity-100"
        onClick={() => {
          cancelOnBlur.current = false;
          setDraft({ source: value, value });
          setEditing(true);
        }}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}
