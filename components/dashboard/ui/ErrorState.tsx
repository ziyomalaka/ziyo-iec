import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";

type ErrorStateProps = {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export default function ErrorState({ error, message, onRetry, className }: ErrorStateProps) {
  const text = message || studentApiErrorMessage(error, "generic");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#B91C1C]">
        <AlertCircle className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-[#991B1B]">{text}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
        >
          Qayta urinish
        </button>
      ) : null}
    </div>
  );
}
