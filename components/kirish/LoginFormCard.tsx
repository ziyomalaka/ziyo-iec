"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "@/lib/icons";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { saveAuthSession } from "@/lib/auth/session";
import { getPostLoginPath } from "@/lib/auth/roles";
import { GMAIL_ONLY_MESSAGE, isGmailAddress, isStaffNickname } from "@/lib/auth/gmail";
import type { LoginRequest } from "@/lib/api/types/auth";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import type { LoginFormValues } from "@/lib/validations/login";
import { cn } from "@/lib/cn";

export default function LoginFormCard() {
  const t = useTranslations("login.form");
  const tv = useTranslations("validation.login");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, GMAIL_ONLY_MESSAGE)
          .refine((value) => isGmailAddress(value) || isStaffNickname(value), GMAIL_ONLY_MESSAGE),
        password: z.string().min(6, tv("passwordMin")),
        remember: z.boolean(),
      }),
    [tv]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const identifier = data.email.trim();
      const payload: LoginRequest = isGmailAddress(identifier)
        ? { email: identifier.toLowerCase(), password: data.password }
        : { nickname: identifier, password: data.password };

      const response = await login(payload);
      if (!response?.token || !response.user) return;

      saveAuthSession(response.token, response.user, data.remember);
      toast.success(t("toast.successTitle"), {
        description: t("toast.successDescription"),
      });
      router.push(getPostLoginPath(response.user.role));
      router.refresh();
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
            <h2 className="mt-5 text-2xl font-bold text-slate-900">{tCommon("buttons.login")}</h2>
            <p className="mt-2 text-body-sm">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <FormField label={t("labels.email")} error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  {...register("email")}
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="user@gmail.com"
                  className={cn("input-field pl-10", errors.email && "border-red-400")}
                />
              </div>
            </FormField>

            <FormField label={t("labels.password")} error={errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("placeholders.password")}
                  className={cn("input-field pl-10 pr-10", errors.password && "border-red-400")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted hover:text-slate-700"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  {...register("remember")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                {t("rememberMe")}
              </label>
              <Link href="/parolni-unutish" className="text-sm font-medium text-primary hover:text-primary-dark">
                {t("forgotPassword")}
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : tCommon("buttons.login")}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t("noAccount")}{" "}
            <Link href="/royxatdan-otish" className="font-semibold text-primary hover:text-primary-dark">
              {tCommon("buttons.register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
