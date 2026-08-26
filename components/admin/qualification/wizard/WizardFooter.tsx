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
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EDF5] pt-4">
      <div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm font-medium text-[#0C2340] disabled:opacity-50"
          >
            ← Orqaga
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {secondary}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || nextLoading}
            aria-busy={nextLoading}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {nextLoading ? nextLoadingLabel : nextLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
