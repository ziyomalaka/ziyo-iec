import { cn } from "@/lib/cn";
import {
  applicationStatusTone,
  resolveApplicationKind,
  type ApplicationKindSource,
  type ApplicationKindTone,
} from "@/lib/admin/application-kind";

export default function ApplicationKindBadge({
  item,
  kind,
  className,
}: {
  item?: ApplicationKindSource;
  kind?: ApplicationKindTone;
  className?: string;
}) {
  const tone = kind ?? (item ? resolveApplicationKind(item) : null);
  if (!tone) return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-[11.5rem] items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-semibold leading-snug",
        tone.wrap,
        className
      )}
    >
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
      <span className="min-w-0 break-words">{tone.label}</span>
    </span>
  );
}

export function ApplicationStatusBadge({
  status,
  label,
  className,
}: {
  status?: string;
  label?: string;
  className?: string;
}) {
  const tone = applicationStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone.wrap,
        className
      )}
    >
      {label || tone.label}
    </span>
  );
}

export function ApplicationSourceBadge({ label }: { label?: string | null }) {
  if (!label) return <span className="text-sm text-[#94A3B8]">—</span>;
  return (
    <span className="inline-flex rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#475569]">
      {label}
    </span>
  );
}
