export type SkeletonProps = {
  lines?: number;
  className?: string;
};

export function Skeleton({ lines = 3, className = "" }: SkeletonProps) {
  return (
    <output aria-label="Loading" className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={`skeleton-line-${index}`}
          aria-hidden="true"
          className="h-4 rounded bg-border motion-safe:animate-pulse"
        />
      ))}
      <span className="sr-only">Loading…</span>
    </output>
  );
}
