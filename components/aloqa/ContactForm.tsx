"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Send, ChevronDown } from "@/lib/icons";
import { WORK_HOURS } from "@/lib/contact";
import type { ContactFormValues } from "@/lib/validations/contact";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { cn } from "@/lib/cn";

export default function ContactForm() {
  const t = useTranslations("contact.form");
  const tv = useTranslations("validation.contact");
  const tCommon = useTranslations("common");

  const subjects = t.raw("subjects") as string[];

  const contactFormSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(2, tv("nameMin"))
          .max(100, tv("nameMax")),
        phone: z
          .string()
          .min(9, tv("phoneMin"))
          .regex(/^\+?[0-9\s\-()]+$/, tv("phoneFormat")),
        email: z.string().email(tv("email")),
        subject: z.string().min(1, tv("subject")),
        message: z
          .string()
          .min(10, tv("messageMin"))
          .max(2000, tv("messageMax")),
      }),
    [tv]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success(t("toast.successTitle"), {
      description: t("toast.successDescription", { name: data.name }),
    });
    reset();
  };

  return (
    <Card className="rounded-2xl">
      <h2 className="text-xl font-bold text-slate-900">{t("title")}</h2>
      <p className="mt-1 text-body-sm">
        {t("description", { hours: WORK_HOURS })}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("labels.name")} error={errors.name?.message}>
            <input
              {...register("name")}
              type="text"
              placeholder={t("placeholders.name")}
              className={cn("input-field", errors.name && "border-red-400")}
            />
          </FormField>
          <FormField label={t("labels.phone")} error={errors.phone?.message}>
            <input
              {...register("phone")}
              type="tel"
              placeholder={t("placeholders.phone")}
              className={cn("input-field", errors.phone && "border-red-400")}
            />
          </FormField>
        </div>

        <FormField label={t("labels.email")} error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder={t("placeholders.email")}
            className={cn("input-field", errors.email && "border-red-400")}
          />
        </FormField>

        <FormField label={t("labels.subject")} error={errors.subject?.message}>
          <div className="relative">
            <select
              {...register("subject")}
              className={cn(
                "input-field appearance-none",
                errors.subject && "border-red-400"
              )}
            >
              <option value="">{t("placeholders.subject")}</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        <FormField label={t("labels.message")} error={errors.message?.message}>
          <textarea
            {...register("message")}
            rows={5}
            placeholder={t("placeholders.message")}
            className={cn(
              "input-field resize-none",
              errors.message && "border-red-400"
            )}
          />
        </FormField>

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          <Send className="h-4 w-4" />
          {isSubmitting ? tCommon("buttons.sending") : tCommon("buttons.sendMessage")}
        </Button>
      </form>
    </Card>
  );
}
