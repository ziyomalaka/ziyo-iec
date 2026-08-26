type DotPatternProps = {
  className?: string;
};

export default function DotPattern({ className = "" }: DotPatternProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 dot-pattern opacity-40 ${className}`}
    />
  );
}
