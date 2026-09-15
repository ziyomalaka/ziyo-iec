export const PROGRAM_TYPES = ["MALAKA_OSHIRISH", "QAYTA_TAYYORLASH"] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const RETRAINING_TYPES = ["UMUMIY", "KASBIY", "PEDAGOGIK"] as const;

export type RetrainingType = (typeof RETRAINING_TYPES)[number];

export type RegisterFormValues = {
  program_type: ProgramType | "";
  retraining_type?: RetrainingType | "";
  first_name: string;
  last_name: string;
  father_name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

