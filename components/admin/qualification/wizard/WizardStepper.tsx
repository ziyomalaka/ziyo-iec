"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { WIZARD_STEPS } from "@/lib/qualification/constants";

export default function WizardStepper({ step }: { step: number }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-[#64748B] md:hidden">
        Bosqich {step} / {WIZARD_STEPS.length} — {WIZARD_STEPS[step - 1]?.label}
      </p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#E8EDF5] md:hidden">
        <div
          className="h-full rounded-full bg-[#0756F5] transition-all"
          style={{ width: `${(step / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="hidden gap-2 md:flex md:flex-wrap">
        {WIZARD_STEPS.map((item) => {
          const done = item.id < step;
          const active = item.id === step;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
                active && "bg-[#EEF4FF] font-semibold text-[#0756F5]",
                done && "text-emerald-700",
                !active && !done && "text-[#94A3B8]"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  active && "bg-[#0756F5] text-white",
                  done && "bg-emerald-600 text-white",
                  !active && !done && "bg-[#E8EDF5] text-[#64748B]"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : item.id}
              </span>
              {item.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
