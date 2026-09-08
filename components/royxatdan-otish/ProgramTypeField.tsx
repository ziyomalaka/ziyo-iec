"use client";

import { BookOpen, GraduationCap } from "@/lib/icons";
import { PROGRAM_TYPES, type ProgramType } from "@/lib/validations/register";
import ChoiceCards from "@/components/royxatdan-otish/ChoiceCards";

const ICONS = {
  MALAKA_OSHIRISH: GraduationCap,
  QAYTA_TAYYORLASH: BookOpen,
} as const;

type ProgramTypeFieldProps = {
  value: ProgramType | "";
  onChange: (value: ProgramType) => void;
  label: string;
  optionLabel: (value: ProgramType) => string;
  error?: string;
};

export default function ProgramTypeField({
  value,
  onChange,
  label,
  optionLabel,
  error,
}: ProgramTypeFieldProps) {
  return (
    <ChoiceCards
      label={label}
      options={PROGRAM_TYPES}
      value={value}
      onChange={onChange}
      optionLabel={optionLabel}
      optionIcon={ICONS}
      error={error}
      columns="2"
    />
  );
}
