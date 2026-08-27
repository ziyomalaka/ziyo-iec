import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export default function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight break-words text-[#0C2340] sm:text-2xl lg:text-[1.75rem]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{description}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
