"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, KeyRound, Eye, EyeOff, ArrowRight } from "@/lib/icons";
import { resetPassword } from "@/lib/api/auth";
import { GMAIL_ONLY_MESSAGE, isGmailAddress } from "@/lib/auth/gmail";
import { ApiError } from "@/lib/api/errors";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import type { ResetPasswordFormValues } from "@/lib/validations/password-reset";
import { cn } from "@/lib/cn";

export default function ResetPasswordFormCard() {
  const t = useTranslations("auth.resetPassword");
  const tv = useTranslations("validation.passwordReset");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const emailFromQuery = searchParams.get("email") ?? "";

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, GMAIL_ONLY_MESSAGE).refine(isGmailAddress, GMAIL_ONLY_MESSAGE),
        code: z
          .string()
          .min(4, tv("codeMin"))
          .max(4, tv("codeMax"))
          .regex(/^\d{4}$/, tv("codeFormat")),
        newPassword: z.string().min(6, tv("passwordMin")),
      }),
    [tv]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailFromQuery,
      code: "",
      newPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      const response = await resetPassword({
        email: data.email.trim().toLowerCase(),
        code: data.code,
        new_password: data.newPassword,
      });

      toast.success(t("toast.successTitle"), {
        description: response.message || t("toast.successDescription"),
      });

      router.push("/kirish");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("toast.errorDescription");

      toast.error(t("toast.errorTitle"), { description: message });
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-y-auto bg-gradient-to-br from-slate-50 via-surface-blue/30 to-surface-blue/50 px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <AuthPageTopBar />

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="lg" />
            <h2 className="mt-5 text-2xl font-bold text-slate-900">{t("title")}</h2>
            <p className="mt-2 text-body-sm">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <FormField label={t("labels.email")} error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="user@gmail.com"
                  className={cn("input-field pl-10", errors.email && "border-red-400")}
                />
              </div>
            </FormField>

            <FormField label={t("labels.code")} error={errors.code?.message}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  {...register("code")}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  placeholder={t("placeholders.code")}
                  className={cn("input-field pl-10 tracking-widest", errors.code && "border-red-400")}
                />
              </div>
            </FormField>

            <FormField label={t("labels.newPassword")} error={errors.newPassword?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  {...register("newPassword")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={t("placeholders.newPassword")}
                  className={cn("input-field pl-10 pr-10", errors.newPassword && "border-red-400")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-slate-700"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <Button type="submit" variant="primary" className="w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/kirish" className="font-semibold text-primary hover:text-primary-dark">
              {t("backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
