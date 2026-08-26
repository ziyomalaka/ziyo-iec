import { cn } from "@/lib/cn";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "primary" | "warning" | "danger";
  className?: string;
};

const variants = {
  success: "badge-success",
  primary: "badge-primary",
  warning: "bg-orange-100 text-orange-700 badge",
  danger: "bg-red-100 text-red-700 badge",
};

export default function Badge({ children, variant = "primary", className }: BadgeProps) {
  return <span className={cn(variants[variant], className)}>{children}</span>;
}
