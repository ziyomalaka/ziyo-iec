export default function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.4,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
}) {
  return (
    <div
      className={className}
      style={{
        animation: `fade-in-up ${duration}s ease-out both`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
