import { Link } from "@/i18n/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors", {
  variants: {
    variant: {
      primary: "btn-primary",
      "primary-sm": "btn-primary-sm",
      outline: "btn-outline",
      "outline-sm": "btn-outline-sm",
      white: "btn-white",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

type ButtonProps = VariantProps<typeof buttonVariants> & {
  children: React.ReactNode;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export default function Button({
  children,
  href,
  variant,
  className,
  type = "button",
  onClick,
  disabled,
}: ButtonProps) {
  const classes = cn(
    buttonVariants({ variant }),
    disabled && "opacity-60 pointer-events-none",
    className
  );

  if (href) {
    return (
      <Link href={href} prefetch className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

export { buttonVariants };
