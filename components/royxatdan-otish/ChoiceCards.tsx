"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "@/lib/icons";
import { cn } from "@/lib/cn";

type ChoiceCardsProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | "";
  onChange: (value: T) => void;
  optionLabel: (value: T) => string;
  optionIcon: Record<T, LucideIcon>;
  error?: string;
  columns?: "2" | "3";
};

export default function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
  optionLabel,
  optionIcon,
  error,
  columns = "2",
}: ChoiceCardsProps<T>) {
  const selectedIndex = options.indexOf(value as T);

  const move = (delta: number) => {
    if (selectedIndex < 0) {
      onChange(delta >= 0 ? options[0] : options[options.length - 1]);
      return;
    }
    const next = (selectedIndex + delta + options.length) % options.length;
    onChange(options[next]);
  };

  return (
    <fieldset className="min-w-0">
      <legend className="label-field">
        {label} <span className="text-red-500">*</span>
      </legend>
      <div
        role="radiogroup"
        aria-required="true"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        className={cn(
          "mt-3 grid min-w-0 gap-3",
          columns === "3"
            ? "grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3"
            : "grid-cols-1 min-[400px]:grid-cols-2"
        )}
      >
        {options.map((option, index) => {
          const selected = value === option;
          const Icon = optionIcon[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (value === "" && index === 0) ? 0 : -1}
              onClick={() => onChange(option)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  move(1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  move(-1);
                } else {
                  return;
                }
                const group = event.currentTarget.parentElement;
                window.requestAnimationFrame(() => {
                  group?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
                });
              }}
              className={cn(
                "relative flex min-h-[5.75rem] min-w-0 cursor-pointer flex-col items-start justify-center gap-2.5 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                selected
                  ? "border-2 border-primary bg-primary/5 text-primary-dark shadow-sm"
                  : "border-2 border-border bg-white text-slate-800 hover:border-primary/45 hover:shadow-sm"
              )}
            >
              {selected ? (
                <span
                  className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                  aria-hidden
                >
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </span>
              ) : null}
              <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-primary" : "text-slate-500")} />
              <span
                className={cn(
                  "pr-7 text-xs font-semibold uppercase leading-snug tracking-wide sm:text-sm",
                  selected ? "text-primary-dark" : "text-slate-800"
                )}
              >
                {optionLabel(option)}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </fieldset>
  );
}
