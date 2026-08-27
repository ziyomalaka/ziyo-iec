"use client";

type WizardFooterProps = {
  onBack?: () => void;
  backDisabled?: boolean;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLoadingLabel?: string;
  secondary?: React.ReactNode;
};

export default function WizardFooter({
  onBack,
  backDisabled,
  onNext,
  nextLabel = "Keyingisi",
  nextDisabled,
  nextLoading,
  nextLoadingLabel = "Yaratilmoqda...",
  secondary,
}: WizardFooterProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E8EDF5] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="w-full sm:w-auto">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            className="min-h-11 w-full rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm font-medium text-[#0C2340] disabled:opacity-50 sm:w-auto"
          >
            ← Orqaga
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        {secondary}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || nextLoading}
            aria-busy={nextLoading}
            className="min-h-11 w-full rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
          >
            {nextLoading ? nextLoadingLabel : nextLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
