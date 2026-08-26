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
        "inline-flex h-[31px] items-center justify-center gap-1.5 rounded-[5px] border border-[#AAC7FB] bg-white px-4 text-[11px] font-semibold text-[#0756F5] disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}
