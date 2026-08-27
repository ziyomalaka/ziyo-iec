"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Mail, ArrowRight } from "@/lib/icons";
import { forgotPassword } from "@/lib/api/auth";
import { GMAIL_ONLY_MESSAGE, isGmailAddress } from "@/lib/auth/gmail";
import { ApiError } from "@/lib/api/errors";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import type { ForgotPasswordFormValues } from "@/lib/validations/password-reset";
import { cn } from "@/lib/cn";

export default function ForgotPasswordFormCard() {
  const t = useTranslations("auth.forgotPassword");
  const router = useRouter();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, GMAIL_ONLY_MESSAGE).refine(isGmailAddress, GMAIL_ONLY_MESSAGE),
      }),
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      const email = data.email.trim().toLowerCase();
      const response = await forgotPassword({ email });

      toast.success(t("toast.successTitle"), {
        description: response.message || t("toast.successDescription"),
      });

      router.push(`/parolni-qayta-ornatish?email=${encodeURIComponent(email)}`);
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
