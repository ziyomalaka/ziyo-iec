"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from "@/lib/icons";
import { register as registerUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { saveAuthSession } from "@/lib/auth/session";
import { getPostLoginPath } from "@/lib/auth/roles";
import { GMAIL_ONLY_MESSAGE, isGmailAddress } from "@/lib/auth/gmail";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import type { RegisterFormValues } from "@/lib/validations/register";
import { cn } from "@/lib/cn";
import {
  formatUzLocalMask,
  isCompleteUzPhone,
  toUzApiPhone,
  UZ_PHONE_PREFIX,
} from "@/lib/phone/uz";

const nameField = (tv: (key: string) => string) =>
  z.string().min(2, tv("nameMin")).max(100, tv("nameMax"));

export default function RegisterFormCard() {
  const t = useTranslations("register.form");
  const tv = useTranslations("validation.register");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerSchema = useMemo(
    () =>
      z
        .object({
          first_name: nameField(tv),
          last_name: nameField(tv),
          father_name: nameField(tv),
          email: z.string().min(1, GMAIL_ONLY_MESSAGE).refine(isGmailAddress, GMAIL_ONLY_MESSAGE),
          phone: z.string().refine(isCompleteUzPhone, tv("phoneMin")),
          password: z.string().min(6, tv("passwordMin")),
          confirmPassword: z.string().min(1, tv("confirmRequired")),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tv("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [tv]
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      father_name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const response = await registerUser({
        first_name: data.first_name,
        last_name: data.last_name,
        father_name: data.father_name,
        email: data.email.trim().toLowerCase(),
        phone_number: toUzApiPhone(data.phone),
        password: data.password,
        password_confirm: data.confirmPassword,
      });

      saveAuthSession(response.token, response.user, true);

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
        <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-4 shadow-xl shadow-primary/5 sm:p-5">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="lg" />
            <h2 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">
              {tCommon("buttons.register")}
            </h2>
            <p className="mt-1 text-xs text-muted sm:text-sm">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <FormField label={t("labels.lastName")} error={errors.last_name?.message}>
                <input
                  {...register("last_name")}
                  type="text"
                  autoComplete="family-name"
                  placeholder={t("placeholders.lastName")}
                  className={cn("input-field py-2 text-sm", errors.last_name && "border-red-400")}
                />
              </FormField>

              <FormField label={t("labels.firstName")} error={errors.first_name?.message}>
                <input
                  {...register("first_name")}
                  type="text"
                  autoComplete="given-name"
                  placeholder={t("placeholders.firstName")}
                  className={cn("input-field py-2 text-sm", errors.first_name && "border-red-400")}
                />
              </FormField>

              <FormField label={t("labels.fatherName")} error={errors.father_name?.message}>
                <input
                  {...register("father_name")}
                  type="text"
                  autoComplete="additional-name"
                  placeholder={t("placeholders.fatherName")}
                  className={cn("input-field py-2 text-sm", errors.father_name && "border-red-400")}
                />
              </FormField>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <FormField label={t("labels.email")} error={errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="user@gmail.com"
                    className={cn("input-field py-2 pl-10 text-sm", errors.email && "border-red-400")}
                  />
                </div>
              </FormField>

              <FormField label={t("labels.phone")} error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <div
                    className={cn(
                      "input-field flex items-center gap-1 py-2 pl-10 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
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
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
                        />
                      )}
                    />
                  </div>
                </div>
              </FormField>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <FormField label={t("labels.password")} error={errors.password?.message}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("placeholders.password")}
                    className={cn(
                      "input-field py-2 pl-10 pr-10 text-sm",
                      errors.password && "border-red-400"
                    )}
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

              <FormField
                label={t("labels.confirmPassword")}
                error={errors.confirmPassword?.message}
              >
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("placeholders.confirmPassword")}
                    className={cn(
                      "input-field py-2 pl-10 pr-10 text-sm",
                      errors.confirmPassword && "border-red-400"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-slate-700"
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
              className="w-full py-2.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("submitting") : tCommon("buttons.register")}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted sm:text-sm">
            {t("hasAccount")}{" "}
            <Link href="/kirish" className="font-semibold text-primary hover:text-primary-dark">
              {tCommon("buttons.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
