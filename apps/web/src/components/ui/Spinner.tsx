const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

export type SpinnerProps = {
  size?: keyof typeof sizes;
  label?: string;
  className?: string;
};

export function Spinner({ size = "md", label = "Loading", className = "" }: SpinnerProps) {
  return (
    <output className={`inline-flex items-center justify-center ${className}`}>
      <svg
        className={`${sizes[size]} motion-safe:animate-spin`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity={0.25} strokeWidth={4} />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </output>
  );
}
