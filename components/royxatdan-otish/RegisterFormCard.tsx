"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "@/lib/icons";
import { register as registerUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { saveAuthSession } from "@/lib/auth/session";
import { resolvePostLoginPath } from "@/lib/auth/program";
import { GMAIL_ONLY_MESSAGE, isGmailAddress } from "@/lib/auth/gmail";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import ProgramTypeField from "@/components/royxatdan-otish/ProgramTypeField";
import RetrainingTypeField from "@/components/royxatdan-otish/RetrainingTypeField";
import {
  PROGRAM_TYPES,
  RETRAINING_TYPES,
  type ProgramType,
  type RegisterFormValues,
  type RetrainingType,
} from "@/lib/validations/register";
import { cn } from "@/lib/cn";
import {
  formatUzLocalMask,
  isCompleteUzPhone,
  toUzApiPhone,
  UZ_PHONE_PREFIX,
} from "@/lib/phone/uz";

function translateOr(
  t: { (key: string): string; has: (key: string) => boolean },
  key: string,
  fallback: string
) {
  try {
    if (typeof t.has === "function" && !t.has(key)) return fallback;
    return t(key);
  } catch {
    return fallback;
  }
}

const RETRAINING_LABEL = {
  uz: "Qayta tayyorlash turini tanlang",
  ru: "Выберите вид переподготовки",
} as const;

const RETRAINING_TYPE_LABELS: Record<RetrainingType, { uz: string; ru: string }> = {
  UMUMIY: { uz: "Umumiy qayta tayyorlash", ru: "Общая переподготовка" },
  KASBIY: { uz: "Kasbiy qayta tayyorlash", ru: "Профессиональная переподготовка" },
  PEDAGOGIK: { uz: "Pedagogik qayta tayyorlash", ru: "Педагогическая переподготовка" },
};

const RETRAINING_TYPE_ERROR = {
  uz: "Qayta tayyorlash turini tanlang.",
  ru: "Выберите вид переподготовки.",
} as const;

const nameField = (tv: (key: string) => string) =>
  z.string().min(2, tv("nameMin")).max(100, tv("nameMax"));

const inputClass = (invalid?: boolean) =>
  cn("input-field min-h-12", invalid && "border-red-400");

export default function RegisterFormCard() {
  const t = useTranslations("register.form");
  const tv = useTranslations("validation.register");
  const tCommon = useTranslations("common");
  const locale = useLocale() === "ru" ? "ru" : "uz";
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerSchema = useMemo(
    () =>
      z
        .object({
          program_type: z
            .string()
            .refine((value): value is ProgramType => PROGRAM_TYPES.includes(value as ProgramType), tv("programTypeRequired")),
          retraining_type: z.string(),
          first_name: nameField(tv),
          last_name: nameField(tv),
          father_name: nameField(tv),
          email: z.string().min(1, GMAIL_ONLY_MESSAGE).refine(isGmailAddress, GMAIL_ONLY_MESSAGE),
          phone: z.string().refine(isCompleteUzPhone, tv("phoneMin")),
          password: z.string().min(6, tv("passwordMin")),
          confirmPassword: z.string().min(1, tv("confirmRequired")),
        })
        .superRefine((data, ctx) => {
          if (data.program_type === "QAYTA_TAYYORLASH") {
            if (!RETRAINING_TYPES.includes(data.retraining_type as RetrainingType)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["retraining_type"],
                message: translateOr(tv, "retrainingTypeRequired", RETRAINING_TYPE_ERROR[locale]),
              });
            }
          }
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tv("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [locale, tv]
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      program_type: "",
      retraining_type: "",
      first_name: "",
      last_name: "",
      father_name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const programType = watch("program_type");
  const retrainingType = watch("retraining_type");
  const showRetraining = programType === "QAYTA_TAYYORLASH";

  const onSubmit = async (data: RegisterFormValues) => {
    if (data.program_type !== "MALAKA_OSHIRISH" && data.program_type !== "QAYTA_TAYYORLASH") {
      return;
    }

    try {
      const response = await registerUser({
        first_name: data.first_name,
        last_name: data.last_name,
        father_name: data.father_name,
        email: data.email.trim().toLowerCase(),
        phone_number: toUzApiPhone(data.phone),
        password: data.password,
        password_confirm: data.confirmPassword,
        program_type: data.program_type,
        ...(data.program_type === "QAYTA_TAYYORLASH" && data.retraining_type
          ? { retraining_type: data.retraining_type }
          : {}),
      });

      saveAuthSession(
        response.token,
        {
          ...response.user,
          program_type: response.user.program_type || data.program_type,
        },
        true
      );

      toast.success(t("toast.successTitle"), {
        description: t("toast.successDescription"),
      });

      router.push(
        await resolvePostLoginPath({
          ...response.user,
          program_type: response.user.program_type || data.program_type,
        })
      );
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("toast.errorDescription");

      toast.error(t("toast.errorTitle"), { description: message });
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip overflow-y-auto bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
      <AuthPageTopBar />

      <div className="flex min-h-0 flex-1 items-start justify-center py-4 sm:items-center sm:py-6">
        <div className="w-full max-w-[45rem] rounded-2xl border border-border bg-white p-4 shadow-md shadow-primary-dark/5 sm:p-7 lg:p-8">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="md" priority className="h-[4.5rem] w-[4.5rem]" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-dark sm:mt-5 sm:text-[1.875rem]">
              {tCommon("buttons.register")}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              {t("subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5 sm:mt-7 sm:space-y-6" noValidate>
            <ProgramTypeField
              value={programType}
              onChange={(next) => {
                setValue("program_type", next, { shouldValidate: true, shouldDirty: true });
                setValue("retraining_type", "", { shouldValidate: false, shouldDirty: true });
              }}
              label={t("labels.programType")}
              optionLabel={(option) => t(`programTypes.${option}`)}
              error={errors.program_type?.message}
            />
            <input type="hidden" {...register("program_type")} />
            <input type="hidden" {...register("retraining_type")} />

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                showRetraining ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
              aria-hidden={!showRetraining}
            >
              <div className="min-h-0 overflow-hidden" {...(!showRetraining ? { inert: true } : {})}>
                <RetrainingTypeField
                  value={retrainingType}
                  onChange={(next) =>
                    setValue("retraining_type", next, { shouldValidate: true, shouldDirty: true })
                  }
                  label={translateOr(t, "labels.retrainingType", RETRAINING_LABEL[locale])}
                  optionLabel={(option) =>
                    translateOr(t, `retrainingTypes.${option}`, RETRAINING_TYPE_LABELS[option][locale])
                  }
                  error={showRetraining ? errors.retraining_type?.message : undefined}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField required label={t("labels.lastName")} error={errors.last_name?.message}>
                <input
                  {...register("last_name")}
                  type="text"
                  autoComplete="family-name"
                  placeholder={t("placeholders.lastName")}
                  className={inputClass(Boolean(errors.last_name))}
                />
              </FormField>

              <FormField required label={t("labels.firstName")} error={errors.first_name?.message}>
                <input
                  {...register("first_name")}
                  type="text"
                  autoComplete="given-name"
                  placeholder={t("placeholders.firstName")}
                  className={inputClass(Boolean(errors.first_name))}
                />
              </FormField>

              <FormField required label={t("labels.fatherName")} error={errors.father_name?.message}>
                <input
                  {...register("father_name")}
                  type="text"
                  autoComplete="additional-name"
                  placeholder={t("placeholders.fatherName")}
                  className={inputClass(Boolean(errors.father_name))}
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField required label={t("labels.email")} error={errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="user@gmail.com"
                    className={cn(inputClass(Boolean(errors.email)), "pl-10")}
                  />
                </div>
              </FormField>

              <FormField required label={t("labels.phone")} error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <div
                    className={cn(
                      "input-field flex min-h-12 items-center gap-1 py-2.5 pl-10 text-base focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:text-sm",
                      errors.phone && "border-red-400"
                    )}
                  >
                    <span className="shrink-0 select-none font-medium text-slate-900">{UZ_PHONE_PREFIX}</span>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <input
                          ref={field.ref}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="(__) ___-__-__"
                          value={formatUzLocalMask(field.value)}
                          onBlur={field.onBlur}
                          onChange={(event) => field.onChange(toUzApiPhone(event.target.value))}
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none sm:text-sm"
                        />
                      )}
                    />
                  </div>
                </div>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField required label={t("labels.password")} error={errors.password?.message}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("placeholders.password")}
                    className={cn(inputClass(Boolean(errors.password)), "pl-10 pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-slate-700"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              <FormField
                required
                label={t("labels.confirmPassword")}
                error={errors.confirmPassword?.message}
              >
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("placeholders.confirmPassword")}
                    className={cn(inputClass(Boolean(errors.confirmPassword)), "pl-10 pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-slate-700"
                    aria-label={
                      showConfirmPassword ? t("hidePassword") : t("showPassword")
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormField>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="mt-1 h-[3.25rem] w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("submitting")}
                </>
              ) : (
                <>
                  {tCommon("buttons.register")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {t("hasAccount")}{" "}
            <Link
              href="/kirish"
              className="font-semibold text-primary hover:underline"
            >
              {tCommon("buttons.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
