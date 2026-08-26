import { cn } from "@/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
};

export default function Card({
  children,
  className,
  hover = false,
  padding = true,
}: CardProps) {
  return (
    <div className={cn(hover ? "card-hover" : "card", padding && "card-padding", className)}>
      {children}
    </div>
  );
}
