import { cn } from "@/lib/cn";

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  className?: string;
  alt?: boolean;
  muted?: boolean;
  hero?: boolean;
  padding?: "default" | "sm" | "none";
};

export default function Section({
  children,
  id,
  className,
  alt,
  muted,
  hero,
  padding = "default",
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "flex w-full flex-col",
        hero && "bg-hero",
        alt && "bg-section-alt",
        muted && "bg-section-muted",
        padding === "default" && "section-padding",
        padding === "sm" && "section-padding-sm",
        className
      )}
    >
      {children}
    </section>
  );
}
