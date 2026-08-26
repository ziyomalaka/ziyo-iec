import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

const sizes = {
  xs: { className: "h-8 w-8", pixels: 32 },
  sm: { className: "h-12 w-12", pixels: 48 },
  md: { className: "h-20 w-20", pixels: 80 },
  lg: { className: "h-28 w-28", pixels: 112 },
} as const;

export default function BrandLogo({ size = "md", className, priority }: BrandLogoProps) {
  const { className: sizeClass, pixels } = sizes[size];

  return (
    <Image
      src="/logo.png"
      alt="Ziyo Xalqaro Ta'lim Markazi"
      width={pixels}
      height={pixels}
      priority={priority}
      sizes={`${pixels}px`}
      quality={75}
      className={cn("shrink-0 rounded-full object-contain", sizeClass, className)}
    />
  );
}
