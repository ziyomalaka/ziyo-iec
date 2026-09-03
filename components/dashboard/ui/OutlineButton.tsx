import { cn } from "@/lib/cn";

type OutlineButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

export default function OutlineButton({
  children,
  onClick,
  className,
  type = "button",
  disabled,
}: OutlineButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#AAC7FB] bg-white px-4 text-sm font-semibold text-[#0756F5] disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}
