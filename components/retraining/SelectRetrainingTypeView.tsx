"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath, isStaffRole } from "@/lib/auth/roles";
import {
  MALAKA_HOME_PATH,
  needsRetrainingTypeSelect,
  normalizeProgramType,
  programHomePath,
  refreshCurrentUser,
  saveRetrainingType,
  SELECT_PROGRAM_PATH,
} from "@/lib/auth/program";
import { normalizeRetrainingType } from "@/lib/retraining/kind";
import { signOut } from "@/lib/auth/sign-out";
import type { RetrainingType } from "@/lib/validations/register";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import RetrainingTypeField from "@/components/royxatdan-otish/RetrainingTypeField";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function SelectRetrainingTypeView() {
  const t = useTranslations("auth.selectRetrainingType");
  const tRegister = useTranslations("register.form");
  const tv = useTranslations("validation.register");
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [value, setValue] = useState<RetrainingType | "">("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const token = getAuthToken();
    if (!token) {
      router.replace("/kirish");
      return;
    }

    const role = getAuthUser()?.role;
    if (isStaffRole(role)) {
      router.replace(getPostLoginPath(role));
      return;
    }

    refreshCurrentUser()
      .then((user) => {
        if (!active) return;
        const program = normalizeProgramType(user.program_type);
        if (program === "MALAKA_OSHIRISH") {
          router.replace(MALAKA_HOME_PATH);
          return;
        }
        if (!program) {
          router.replace(SELECT_PROGRAM_PATH);
          return;
        }
        if (needsRetrainingTypeSelect(program, user.retraining_type)) {
          setChecking(false);
          return;
        }
        router.replace(programHomePath(program, user.retraining_type));
      })
      .catch(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async () => {
    if (!value) {
      setError(tv("retrainingTypeRequired"));
      return;
    }

    setSaving(true);
    try {
      await saveRetrainingType(value);
      const user = await refreshCurrentUser();
      const saved = normalizeRetrainingType(user.retraining_type);
      if (!saved) {
        throw new ApiError(400, "Qayta tayyorlash turi saqlanmadi.");
      }
      toast.success(t.has("toast.successTitle") ? t("toast.successTitle") : t("title"), {
        description: t.has("toast.successDescription")
          ? t("toast.successDescription")
          : t("subtitle"),
      });
      router.replace(programHomePath("QAYTA_TAYYORLASH", user.retraining_type));
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : t.has("toast.errorDescription")
            ? t("toast.errorDescription")
            : "Qayta tayyorlash turi saqlanmadi.";
      setError(message);
      toast.error(t.has("toast.errorTitle") ? t("toast.errorTitle") : t("title"), {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/kirish");
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F9FC] p-6">
        <div className="w-full max-w-3xl">
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-y-auto bg-gradient-to-br from-slate-50 via-surface-blue/30 to-surface-blue/50 px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <AuthPageTopBar />

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="lg" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-primary">{t("eyebrow")}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="mt-2 text-body-sm">{t("subtitle")}</p>
          </div>

          <div className="mt-8 space-y-5">
            <RetrainingTypeField
              value={value}
              onChange={(next) => {
                setValue(next);
                setError(undefined);
              }}
              label={t.has("label") ? t("label") : tRegister("labels.retrainingType")}
              optionLabel={(option) => tRegister(`retrainingTypes.${option}`)}
              error={error}
            />

            <Button type="button" onClick={handleSubmit} disabled={saving || !value} className="w-full">
              {saving ? (t.has("submitting") ? t("submitting") : t("continue")) : t("continue")}
            </Button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-center text-xs font-medium text-muted transition-colors hover:text-primary"
            >
              {t.has("signOut") ? t("signOut") : "Boshqa akkaunt bilan kirish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
