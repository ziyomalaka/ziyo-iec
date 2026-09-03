import { libraryCategoryIcon } from "@/lib/library/icons";

type LibraryCoverFallbackProps = {
  category?: string | null;
  className?: string;
};

export default function LibraryCoverFallback({ category, className }: LibraryCoverFallbackProps) {
  const Icon = libraryCategoryIcon(category);
  return (
    <div
      className={
        className ??
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4F8CFF] via-[#0756F5] to-[#062454]"
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-[0_8px_24px_rgba(6,36,84,0.25)] ring-1 ring-white/30">
        <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
      </div>
    </div>
  );
}
