export type ProgressBarProps = {
  value: number;
  max?: number;
  label: string;
  className?: string;
};

export function ProgressBar({ value, max = 100, label, className = "" }: ProgressBarProps) {
  const safeMax = Math.max(max, 1);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  return (
    <progress
      aria-label={label}
      value={clamped}
      max={safeMax}
      className={`h-1.5 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-accent ${className}`}
    />
  );
}
