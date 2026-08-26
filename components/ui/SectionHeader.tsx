import { Link } from "@/i18n/navigation";
import { ArrowRight } from "@/lib/icons";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  title: string;
  link?: { href: string; label: string };
  centered?: boolean;
  className?: string;
};

export default function SectionHeader({
  title,
  link,
  centered,
  className,
}: SectionHeaderProps) {
  if (centered) {
    return (
      <div className={cn("mb-12 text-center", className)}>
        <h2 className="heading-section">{title}</h2>
        <div className="section-title-line" />
      </div>
    );
  }

  return (
    <div className={cn("mb-10 flex items-end justify-between gap-4 sm:mb-12", className)}>
      <div>
        <h2 className="heading-section">{title}</h2>
        <div className="mt-3 h-1 w-10 rounded-full bg-primary/80" />
      </div>
      {link && (
        <Link href={link.href} prefetch className="link-arrow shrink-0 pb-1">
          {link.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
