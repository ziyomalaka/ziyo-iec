"use client";

import { Briefcase, GraduationCap, Users } from "@/lib/icons";
import { RETRAINING_TYPES, type RetrainingType } from "@/lib/validations/register";
import ChoiceCards from "@/components/royxatdan-otish/ChoiceCards";

const ICONS = {
  UMUMIY: Users,
  KASBIY: Briefcase,
  PEDAGOGIK: GraduationCap,
} as const;

type RetrainingTypeFieldProps = {
  value: RetrainingType | "";
  onChange: (value: RetrainingType) => void;
  label: string;
  optionLabel: (value: RetrainingType) => string;
  error?: string;
};

export default function RetrainingTypeField({
  value,
  onChange,
  label,
  optionLabel,
  error,
}: RetrainingTypeFieldProps) {
  return (
    <ChoiceCards
      label={label}
      options={RETRAINING_TYPES}
      value={value}
      onChange={onChange}
      optionLabel={optionLabel}
      optionIcon={ICONS}
      error={error}
      columns="3"
    />
  );
}
